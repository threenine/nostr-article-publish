
export function validatePrivateKey(key: string): boolean {
	return (
		typeof key === "string" && key.length === 63 && key.startsWith("nsec")
	);
}
