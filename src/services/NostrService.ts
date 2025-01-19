import NostrArticlePublishPlugin from "../../main";
import {App} from "obsidian";
import {NostrPublishConfigurationSettings} from "../types";

export default class NostrService {
	private privateKey: string;
	private plugin: NostrArticlePublishPlugin;
	private app: App;

	constructor(plugin: NostrArticlePublishPlugin, app: App, settings: NostrPublishConfigurationSettings) {

		if(!settings.privateKey) {
			console.log("No private key set for Nostr Publish");
			return;
		}
	}
}
