import { nip19 } from "nostr-tools";

export const DEFAULT_EXPLICIT_RELAY_URLS = [
	'wss://relay.geekiam.services',
	'wss://relay.damus.io',
	'wss://relay.primal.net',
	'wss://relay.nostr.band',
	'wss://nos.lol'
];
export const NOSTR_TITLE_TAG: string = "title";
export const NOSTR_SUMMARY_TAG: string = "summary";
export const NOSTR_D_TAG: string = "d";
export const NOSTR_PUBLISHED_AT_TAG: string = "published_at";
export const NOSTR_TAGS_TAG: string = "t";
export const NOSTR_IMAGE_TAG: string = "image";

export function validatePrivateKey(key: string): boolean {
	return (
		 key.length === 63 && key.startsWith("nsec")
	);
}

export function toHex(value: string): string {

	if (value && value.startsWith("nsec")) {
		let decodedPrivateKey = nip19.decode(value);
		return decodedPrivateKey.data as string;
	}

  return value;
}


export function toUint8Array(hex: string): Uint8Array {
	if (hex.length % 2 !== 0) {
		throw new Error("Invalid hex string");
	}

	const array = new Uint8Array(hex.length / 2);
	for (let i = 0; i < hex.length; i += 2) {
		array[i / 2] = parseInt(hex.substring(i, i + 2), 16);
	}

	return array;
}

export function validateURL(url: string): boolean {
	try {
		new URL(url);
		return true;
	} catch (error) {
		console.log(error);
		return false;
	}
}



export function setAttributes(element: any, attributes: any) {
	for (let key in attributes) {
		element.setAttribute(key, attributes[key]);
	}
}


