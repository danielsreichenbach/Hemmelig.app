// Matches the better-auth username() plugin default validator, so the forms
// reject a username before the server does. The server enforces the same rule.
export const USERNAME_PATTERN = /^[a-zA-Z0-9_.]+$/;
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;

/** True when the username has a character the server rejects. */
export function hasInvalidUsernameCharacters(username: string): boolean {
    return !USERNAME_PATTERN.test(username);
}
