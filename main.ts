import {Notice, Plugin} from 'obsidian';
import {NostrPublishConfigurationTab} from './src/tabs/NostrPublishConfigurationTab';
import {NostrPublishConfiguration} from './src/types';
import NostrService from "./src/services/NostrService";
import {DEFAULT_EXPLICIT_RELAY_URLS} from "./src/utilities";
import PublishModal from "./src/modals/PublishModal";

export default class NostrArticlePublishPlugin extends Plugin {
	configuration: NostrPublishConfiguration
	nostrService: NostrService;
	statusBar: any;

	async onload() {
		await this.loadConfiguration();
		this.startService();
		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new NostrPublishConfigurationTab(this.app, this));

		this.addRibbonIcon('newspaper', 'Publish to Nostr', async (evt: MouseEvent) => {
			console.log(`Publish to Nostr ${evt.doc.title}`);
			if (!this.configuration.privateKey) {
				new Notice('No private key set for Nostr Article Publish');
			}

			const file = this.app.workspace.getActiveFile()
			if (file) {
				if (this.nostrService.Connected()) {
					new PublishModal(this.app, this.nostrService, file, this).open()
				}
			}
		});
	}

	onunload() {

	}

	startService() {
		this.nostrService = new NostrService(this, this.app, this.configuration);
	}

	async loadConfiguration() {
		this.configuration = Object.assign({}, {
			privateKey: "",
			relayConfigurationEnabled: false,
			relayURLs: DEFAULT_EXPLICIT_RELAY_URLS,
			statusBarEnabled: true
		}, await this.loadData());
	}

	async saveConfiguration() {
		await this.saveData(this.configuration);
	}
}


