import NostrArticlePublishPlugin from "../../main";
import {App} from "obsidian";
import {NostrPublishConfiguration} from "../types";
import {Relay, SimplePool} from "nostr-tools";
import {DEFAULT_EXPLICIT_RELAY_URLS, toHex, validateURL} from "../utilities";




export default class NostrService {
	private privateKey: string;
	private plugin: NostrArticlePublishPlugin;
	private app: App;
	private connected: boolean;
	private pool: SimplePool;
	private poolUrls: string[];
	private relayURLs: string[];
	connectedRelays: Relay[];

	constructor(plugin: NostrArticlePublishPlugin, app: App, configuration: NostrPublishConfiguration) {

		if(!configuration.privateKey) {
			console.log("No private key set for Nostr Publish");
			return;
		}
		this.plugin = plugin;
		this.app = app;
		this.privateKey = toHex(configuration.privateKey);

		this.relayURLs = [];
		if(!configuration.relayURLs || configuration.relayURLs.length === 0) {
			this.relayURLs = DEFAULT_EXPLICIT_RELAY_URLS;
		}
		else {
			for (let url of configuration.relayURLs) {
				if (validateURL(url)) {
					this.relayURLs.push(url);
				}
			}
		}
		this.connectToRelays().then(result => { console.log("Connected to relays")});
	}

	 async connectToRelays(): Promise<void> {
		this.refreshRelayUrls();
		this.connectedRelays = [];

		let connectionPromises = this.relayURLs.map((url) => {
			return new Promise<Relay | null>(async (resolve) => {
				console.log(`Initializing NostrService with relay: ${url}`);
				try {
					const relayAttempt = await Relay.connect(url);

					relayAttempt.onclose = () => {
						handleFailure();
					}

					const handleFailure = () => {
						console.log(`Disconnected from ${url}, updating status bar.`);
						this.connectedRelays.remove(relayAttempt);
						this.updateStatusBar();
						resolve(null);
					};

					console.log(`Connected to ${relayAttempt.url}`);
					this.connectedRelays.push(relayAttempt);
					resolve(relayAttempt);
				} catch (error) {
					console.error(`Failed to connect to ${url}: ${error}`);
					resolve(null);
				}
			});
		});

		Promise.all(connectionPromises).then(() => {
			console.log(
				`Connected to ${this.connectedRelays.length} / ${this.relayURLs.length} relays`
			);
			this.updateStatusBar();
			if (this.connectedRelays.length > 0) {
				this.setConnectionPool();
				this.connected = true;
			}
		});
	}
	setConnectionPool = () => {
		this.pool = new SimplePool()
		this.poolUrls = [];
		for (const relay of this.connectedRelays) {
			this.poolUrls.push(relay.url);
		}
	}
	refreshRelayUrls(): void {
		this.relayURLs = [];
		if (!this.plugin.configuration.relayURLs || this.plugin.configuration.relayURLs.length === 0) {
			console.error(
				"YourPlugin requires a list of relay urls to be set in the settings, defaulting to Damus."
			);
			this.relayURLs = DEFAULT_EXPLICIT_RELAY_URLS;
		} else {
			for (let url of this.plugin.configuration.relayURLs) {
				if (validateURL(url)) {
					this.relayURLs.push(url);
				}
			}
		}
	}
	protected updateStatusBar	 = () => {
		if (this.connectedRelays.length === 0) {
			this.plugin.statusBar?.setText("Nostr 🌚");
			this.connected = false;
		} else {
			this.plugin.statusBar?.setText(
				`Nostr 🟣 ${this.connectedRelays.length} / ${this.relayURLs.length} relays.`
			);
		}
	};

	getRelayInfo(relayUrl: string): boolean {
		let connected: boolean = false;
		for (let r of this.connectedRelays) {
			if (r.url == relayUrl + "/") {
				return r.connected;
			}
		}
		return connected;
	}
}
