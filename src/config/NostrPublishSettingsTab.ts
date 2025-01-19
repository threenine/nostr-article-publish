import {App, PluginSettingTab, Setting} from "obsidian";
import NostrArticlePublishPlugin from "../../main";

export class NostrPublishSettingsTab extends PluginSettingTab {
	plugin: NostrArticlePublishPlugin;

	constructor(app: App, plugin: NostrArticlePublishPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();
s
		new Setting(containerEl)
			.setName('Nostr Private key')
			.setDesc("")
			.addText(text => text
				.setPlaceholder('nsec1..............')
				.setValue(this.plugin.configuration.privateKey)
				.onChange(async (value) => {
					this.plugin.configuration.privateKey = value;
					await this.plugin.saveSettings();
					this.plugin.
				}));
	}
}
