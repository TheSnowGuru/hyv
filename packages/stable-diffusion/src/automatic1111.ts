import type { ModelAdapter } from "@hyv/core";
import { urlJoin } from "@hyv/utils";
import axios from "axios";
import decamelizeKeys from "decamelize-keys";

import type { Automatic1111Options, FilesMessage, ImageMessage } from "./types.js";

const defaultOptions: Automatic1111Options = {
	steps: 20,
	cfgScale: 7,
	height: 256,
	width: 256,
};

/**
 * Adapter for the AUTOMATIC1111 model, providing a way to interact with the
 * model through the use of the `ModelAdapter` interface.
 * {@see https://github.com/AUTOMATIC1111/stable-diffusion-webui}
 *
 * @property #options - The configuration options for the AUTOMATIC1111 model.
 * @property rootUrl - The root URL for the AUTOMATIC1111 API endpoints.
 * @property endpointBase - The base path for the AUTOMATIC1111 API endpoints.
 */
export class Automatic1111ModelAdapter<Input extends ImageMessage = ImageMessage>
	implements ModelAdapter<Input, FilesMessage>
{
	#options: Automatic1111Options;
	private readonly rootUrl: string = "http://127.0.0.1:7861";
	private readonly endpointBase = "sdapi/v1";
	/**
	 * Creates an instance of the Automatic1111ModelAdapter class.
	 *
	 * @param options - The Automatic1111 model options.
	 * @param rootUrl - root url to the endpoints
	 */
	constructor(options: Automatic1111Options = defaultOptions, rootUrl?: string) {
		this.#options = { ...defaultOptions, ...options };
		if (rootUrl) {
			this.rootUrl = rootUrl;
		}
	}

	/**
	 * Assigns a task to the model and returns the results
	 * @param task - The task that is assigned to the model
	 */
	async assign(task: Input): Promise<FilesMessage> {
		try {
			const files = await Promise.all(
				task.images.map(async ({ alt: _, path: imagePath, ...image }) => {
					const { model: sdModelCheckpoint, ...options } = this.#options;
					await axios.post(urlJoin(this.rootUrl, this.endpointBase, "options"), {
						...decamelizeKeys({ sdModelCheckpoint }),
					});
					const response = await axios.post<{ images: string[] }>(
						urlJoin(this.rootUrl, this.endpointBase, "txt2img"),
						{
							...decamelizeKeys(options),
							...decamelizeKeys(image),
						}
					);
					const [content] = response.data.images;
					return { path: imagePath, content };
				})
			);

			return {
				files,
			};
		} catch (error) {
			throw new Error(`Error assigning task in Automatic1111ModelAdapter: ${error.message}`);
		}
	}
}
