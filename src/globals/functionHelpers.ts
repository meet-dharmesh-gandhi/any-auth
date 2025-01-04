import { customProviderType, supportedProviderType } from "../client/types";
import { getConfig } from "./configFunctions";
import { throwError } from "./utils";

/**
 * @async
 * @function getProviderUrl
 *
 * This function gets the provider url for the specified provider.
 *
 * @param {string} provider - The invoked provider for auth
 * @param {string} [urlType="auth"] - The type of url requested
 * @param {supportedProviderType} [configProvider] - The object containing the details of the current provider in use
 * @returns {string} the request url
 * @throws {Error} An error is thrown in these cases:
 * - the provider is not specified
 * - the url type specified is unavailable in the urls object
 * - configProvider is not provided for Microsoft
 * - the provider is not implemented
 */
export function getProviderUrl(
	provider: string,
	urlType: "auth" | "token" | "profile" | "requestToken" = "auth",
	configProvider?: supportedProviderType
): string {
	const globalErrorHandler = getConfig().globalErrorHandler;
	if (!provider) {
		throwError(
			"Provider not found!",
			globalErrorHandler,
			"Specify a provider name existing in the config file!"
		);
	}
	if (!configProvider && provider === "microsoft") {
		throwError(
			"Tenant not found!",
			globalErrorHandler,
			"A tenant name is required for microsoft oauth!"
		);
		return "Error";
	}
	const urls = {
		auth: {
			google: "https://accounts.google.com/o/oauth2/v2/auth",
			github: "https://github.com/login/oauth/authorize",
			microsoft: `https://login.microsoftonline.com/${
				configProvider!.tenant ?? "common"
			}/oauth2/authorize`,
			linkedin: "https://www.linkedin.com/oauth/v2/authorization",
			salesforce:
				"https://login.salesforce.com/services/oauth2/authorize",
			discord: "https://discord.com/oauth2/authorize",
			spotify: "https://accounts.spotify.com/authorize",
			amazon: "https://www.amazon.com/ap/oa",
			slack: "https://slack.com/oauth/v2/authorize",
			twitch: "https://id.twitch.tv/oauth2/authorize",
			facebook: "https://www.facebook.com/v16.0/dialog/oauth",
			x: "https://api.twitter.com/oauth/authenticate",
			twitter: "https://api.twitter.com/oauth/authenticate",
		},
		token: {
			github: "https://github.com/login/oauth/access_token",
			microsoft:
				"https://login.microsoftonline.com/organizations/oauth2/v2.0/token",
			linkedin: "https://www.linkedin.com/oauth/v2/accessToken",
			salesforce: "https://login.salesforce.com/services/oauth2/token",
			discord: "https://discord.com/api/oauth2/token",
			spotify: "https://accounts.spotify.com/api/token",
			amazon: "https://api.amazon.co.uk/auth/o2/token",
			slack: "https://slack.com/api/oauth.v2.access",
			twitch: "https://id.twitch.tv/oauth2/token",
			facebook: "https://graph.facebook.com/v16.0/oauth/access_token",
			x: "https://api.twitter.com/oauth/access_token",
			twitter: "https://api.twitter.com/oauth/access_token",
		},
		profile: {
			google: "https://www.googleapis.com/oauth2/v3/userinfo",
			github: "https://api.github.com/user/emails",
			microsoft: "https://graph.microsoft.com/v1.0/me",
			linkedin: "https://api.linkedin.com/v2/userinfo",
			salesforce: "https://login.salesforce.com/services/oauth2/userinfo",
			discord: "https://discord.com/api/users/@me",
			spotify: "https://api.spotify.com/v1/me",
			amazon: "https://api.amazon.com/user/profile",
			slack: "https://slack.com/api/users.info",
			twitch: "https://api.twitch.tv/helix/users",
			facebook: "https://graph.facebook.com/v16.0/me",
			x: "https://api.twitter.com/1.1/account/verify_credentials.json",
			twitter:
				"https://api.twitter.com/1.1/account/verify_credentials.json",
		},
		requestToken: {
			x: "https://api.twitter.com/oauth/request_token",
			twitter: "https://api.twitter.com/oauth/request_token",
		},
	};
	if (!urls[urlType]) {
		throwError(
			"Invalid url type!",
			globalErrorHandler,
			"The url type specified is invalid!"
		);
	}
	if (!(urls[urlType] as any)[provider]) {
		throwError(
			"Provider not implemented!",
			globalErrorHandler,
			"The provider specified is not implemented!"
		);
	}
	return (urls[urlType] as any)[provider];
}

/**
 * @async
 * @function getTokenType
 *
 * This function returns the token type for the provider.
 *
 * @param provider - The provider for which the token type is to be fetched
 * @returns {"token" | "code"} The token type
 */
export function getTokenType(provider: string): "token" | "code" {
	if (provider === "google") {
		return "token";
	} else {
		return "code";
	}
}
