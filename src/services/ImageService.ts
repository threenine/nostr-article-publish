import {App, requestUrl, RequestUrlParam} from "obsidian";
import * as http from "node:http";


export default class ImageService {

	private readonly UPLOAD_ENDPOINT = "https://media.geekiam.systems/";
	private app: App;

	constructor(app: App) {
		this.app = app;
	}

	async upload(file: File): Promise<string> {

		let formData = new FormData();
		formData.append('file', file);

		try {
			const header = {
				'Content-Type': 'multipart/form-data',
				'Accept-Encoding': 'gzip, deflate, br',
				'Accept': '*/*',
				'Connection': 'keep-alive',
			};

			let response = await fetch(this.UPLOAD_ENDPOINT,{
				method: 'POST',
				body: formData,
			});

			console.log("The Response", response)
			if (201 != response.status) {
				console.log(response)
			}
			if (201 === response.status) {
				return (response.json as any).data.filename;
			}


		} catch (e) {
			console.log("Upload Error", e)
		}

		return file.name;


	}


	/*private async performUpload(file: File): Promise<string> {
	/!*	const inputData = new FormData();
		inputData.append('file', new Blob([fileBuffer]));*!/
		let headers: Record<string, string> = {
			'Content-Type': 'multipart/form-data',
		};
		const response = await axios.post("https://nostr.build/api/v2/upload/files", fileBuffer,{headers});
		const { data } = response;

		if (Array.isArray(data.data) && data.data.length > 0) {
			return data.data[0].url;
		} else {
			throw new Error("Invalid response format");
		}
	}*/

}
