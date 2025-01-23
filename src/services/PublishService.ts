import {App} from "obsidian";
import NostrService from "./NostrService";

export default class PublishService {
	private app: App;
	private service: NostrService;

	constructor(app: App, service: NostrService) {
		this.app = app;
		this.service = service;
	}

   async publish(content: string): Promise<void> {

	}

}
