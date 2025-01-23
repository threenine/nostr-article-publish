import NostrArticlePublishPlugin from "../../main";
import {App, Notice} from "obsidian";
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
		this.relaysConnect().then(result => { console.log("Connected to relays")});
	}

	public Connected(): boolean {
		return this.connected;
	}
	 async relaysConnect(): Promise<void> {
		this.refreshRelayUrls();
		this.connectedRelays = [];

		let connectionPromises = this.relayURLs.map((url) => {
			return new Promise<Relay | null>(async (resolve) => {
				try {
					const relayAttempt = await Relay.connect(url);

					relayAttempt.onclose = () => {
						handleFailure();
					}

					const handleFailure = () => {
					    this.connectedRelays.remove(relayAttempt);
						resolve(null);
					};

					this.connectedRelays.push(relayAttempt);
					resolve(relayAttempt);
				} catch (error) {
					resolve(null);
				}
			});
		});

		Promise.all(connectionPromises).then(() => {
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

		if (!this.plugin.configuration.relayURLs || this.plugin.configuration.relayURLs.length === 0) {
			this.relayURLs = DEFAULT_EXPLICIT_RELAY_URLS;
		} else {
			for (let url of this.plugin.configuration.relayURLs) {
				if (validateURL(url)) {
					this.relayURLs.push(url);
				}
			}
		}
	}


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
