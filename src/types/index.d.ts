

export interface NostrPublishConfiguration {
	privateKey: string;
	relayConfigurationEnabled: boolean;
	relayURLs: string[];
}

export interface RelayConnectionResult {
	success: boolean;
	count: number;
}

