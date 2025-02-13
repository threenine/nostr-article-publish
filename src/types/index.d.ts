

export interface NostrPublishConfiguration {
	privateKey: string;
	relayConfigurationEnabled: boolean;
	relayURLs: string[];
	enableStatusBar: boolean;
}

export interface RelayConnectionResult {
	success: boolean;
	count: number;
}

