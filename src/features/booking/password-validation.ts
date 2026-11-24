export type PasswordProblem = "too_short" | "too_long" | "mismatch";

// ClassKit reset and change both count code points for the minimum and UTF-8 bytes for bcrypt's maximum.
export function passwordProblem(password: string, confirmation: string): PasswordProblem | null {
	if (Array.from(password).length < 8) return "too_short";
	if (new TextEncoder().encode(password).length > 72) return "too_long";
	return password === confirmation ? null : "mismatch";
}
