import {App, Notice, PluginSettingTab, Setting, TextComponent} from "obsidian";
import NostrArticlePublishPlugin from "../../main";
import {validatePrivateKey, validateURL} from "../utilities";

export class NostrPublishConfigurationTab extends PluginSettingTab {
	plugin: NostrArticlePublishPlugin;
	private displayRefresh: () => void;
	private relayUrlInput: TextComponent;

	constructor(app: App, plugin: NostrArticlePublishPlugin) {
		super(app, plugin);
		this.plugin = plugin;
		this.displayRefresh = () => this.display();
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		let privateKeyField: HTMLInputElement;
		let privateKeyInput: any;

		// Private Key
		new Setting(containerEl)
			.setName('Nostr Private key')
			.setDesc("Your publishing nostr private key")
			.addText((text) => {
				privateKeyInput = text;
				text.setPlaceholder('nsec1..............')
				.setValue(this.plugin.configuration.privateKey)
				.onChange(async (value) => {
					if (validatePrivateKey(value)) {
						this.plugin.configuration.privateKey = value;
						await this.plugin.saveConfiguration();
						this.plugin.startService();
						new Notice("Private key saved!");
					}else {
						new Notice("The private key is not valid");
					}
				});
				privateKeyField = text.inputEl;
				privateKeyField.type = "password";
				privateKeyField.style.width = "400px";
				})
			.addButton((button) =>
				button
					.setTooltip("Copy private key")
					.setIcon("copy")
					.onClick(() => {
						if (privateKeyField) {
							navigator.clipboard.writeText(
								privateKeyField.value
							);
							new Notice("🔐 Private Key Copied to clipboard");
						}
					})
			)
		// end private key

		// Configure relays
		new Setting(containerEl)
			.setName("Relay Configuration")
			.setDesc("Edit relay configuration to refresh connection to relays")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.configuration.relayConfigEnabled)
					.onChange(async (value) => {
						this.plugin.configuration.relayConfigEnabled = value;
						await this.plugin.saveConfiguration();
						this.displayRefresh();
					})
			);
		// end configure relays
		// Manage Relays
		new Setting(containerEl)
			.setName("Reconnect to relays ")
			.setDesc(
				"Refresh connection to relays - check status bar for details."
			)
			.addButton((btn) => {
				btn.setIcon("reset");
				btn.setCta();
				btn.setTooltip("Reconnect to relays");
				btn.onClick(async () => {
					new Notice(`Reconnecting to your defined relays`);
					this.plugin.nostrService.connectToRelays();
					this.displayRefresh();

				});
			});

		if (this.plugin.configuration.relayConfigEnabled) {
			containerEl.createEl("h5", { text: "Relay Configuration" });

			new Setting(this.containerEl)
				.setDesc("Add a relay URL to settings")
				.setName("Add Relay")
				.addText((relayUrlInput) => {
					relayUrlInput.setPlaceholder("wss://relay.domain.com");
					relayUrlInput.onChange(() => {
						this.relayUrlInput = relayUrlInput;
					});
				})
				.addButton((btn) => {
					btn.setIcon("plus");
					btn.setCta();
					btn.setTooltip("Add this relay");
					btn.onClick(async () => {
						try {
							let addedRelayUrl = this.relayUrlInput.getValue();
							if (validateURL(addedRelayUrl)) {
								this.plugin.configuration.relayURLs.push(
									addedRelayUrl
								);
								await this.plugin.saveConfiguration();
								new Notice(
									`Added ${addedRelayUrl} to relay configuration.`
								);
								new Notice(`Re-connecting to Nostr...`);
								this.displayRefresh();
								 this.plugin.nostrService.connectToRelays();
								this.relayUrlInput.setValue("");
							} else {
								new Notice("Invalid URL added");
							}
						} catch {
							new Notice("No URL added");
						}
					});
				});

			for (const [i, url] of this.plugin.configuration.relayURLs.entries()) {
				new Setting(this.containerEl)
					.setDesc(
						`${url} is ${this.plugin.nostrService.getRelayInfo(url)
							? "connected"
							: "disconnected"
						}`
					)
					.setName(
						`${this.plugin.nostrService.getRelayInfo(url)
							? "🟢"
							: "💀"
						} - Relay ${i + 1} `
					)
					.addButton((btn) => {
						btn.setIcon("trash");
						btn.setTooltip("Remove this relay");
						btn.onClick(async () => {
							if (
								confirm(
									"Are you sure you want to delete this relay? This cannot be undone."
								)
							) {
								this.plugin.configuration.relayURLs.splice(i, 1);
								await this.plugin.saveConfiguration();
								this.displayRefresh();
								new Notice("Relay successfully deleted.");
								new Notice(`Re-connecting to Nostr...`);
								await this.plugin.nostrService.connectToRelays();
							}
						});
					});
			}
		}
	}
}
