import { configType } from "./src/client/types";
import crypto from "crypto";

const config: configType = {
	serverUrl: "http://localhost:9000",
	globalErrorHandler: (error, details) => {
		console.error(error, details);
	},
	globalTimeout: 1000,
	providers: {
		google: {
			clientId: process.env.VITE_OAUTH_GOOGLE_CLIENT_ID as string,
			clientSecret: process.env.VITE_OAUTH_GOOGLE_CLIENT_SECRET as string,
			redirectUri: process.env.VITE_OAUTH_GOOGLE_REDIRECT_URL as string,
			scope: "email profile openid",
			serverEndPoint: "/auth",
			state: JSON.stringify({ customKey: "customValue" }),
			authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
			profileUrl: "https://www.googleapis.com/oauth2/v3/userinfo",
		},
		github: {
			clientId: process.env.VITE_OAUTH_GITHUB_CLIENT_ID as string,
			clientSecret: process.env.VITE_OAUTH_GITHUB_CLIENT_SECRET as string,
			redirectUri: process.env.VITE_OAUTH_GITHUB_REDIRECT_URL as string,
			scope: "user:email",
			serverEndPoint: "/auth",
			state: JSON.stringify({ customKey: "customValue" }),
			authUrl: "https://github.com/login/oauth/authorize",
			tokenUrl: "https://github.com/login/oauth/access_token",
			profileUrl: "https://api.github.com/user/emails",
		},
		microsoft: {
			clientId: process.env.VITE_OAUTH_MICROSOFT_CLIENT_ID as string,
			clientSecret: process.env
				.VITE_OAUTH_MICROSOFT_CLIENT_SECRET as string,
			redirectUri: process.env
				.VITE_OAUTH_MICROSOFT_REDIRECT_URL as string,
			tenant: "organizations",
			scope: "user:email",
			serverEndPoint: "/auth",
			state: JSON.stringify({ customKey: "customValue" }),
			authUrl:
				"https://login.microsoftonline.com/organizations/oauth2/authorize",
			tokenUrl:
				"https://login.microsoftonline.com/organizations/oauth2/v2.0/token",
			profileUrl: "https://graph.microsoft.com/v1.0/me",
		},
		linkedin: {
			clientId: process.env.VITE_OAUTH_LINKEDIN_CLIENT_ID as string,
			clientSecret: process.env
				.VITE_OAUTH_LINKEDIN_CLIENT_SECRET as string,
			redirectUri: process.env.VITE_OAUTH_LINKEDIN_REDIRECT_URL as string,
			scope: "openid email profile",
			serverEndPoint: "/auth",
			state: JSON.stringify({ customKey: "customValue" }),
			authUrl: "https://www.linkedin.com/oauth/v2/authorization",
			tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
			profileUrl: "https://api.linkedin.com/v2/userinfo",
		},
		salesforce: {
			clientId: process.env.VITE_OAUTH_SALESFORCE_CLIENT_ID as string,
			clientSecret: process.env
				.VITE_OAUTH_SALESFORCE_CLIENT_SECRET as string,
			redirectUri: process.env
				.VITE_OAUTH_SALESFORCE_REDIRECT_URL as string,
			serverEndPoint: "/auth",
			state: JSON.stringify({ customKey: "customValue" }),
			authUrl: "https://login.salesforce.com/services/oauth2/authorize",
			tokenUrl: "https://login.salesforce.com/services/oauth2/token",
			profileUrl: "https://login.salesforce.com/services/oauth2/userinfo",
		},
		discord: {
			clientId: process.env.VITE_OAUTH_DISCORD_CLIENT_ID as string,
			clientSecret: process.env
				.VITE_OAUTH_DISCORD_CLIENT_SECRET as string,
			redirectUri: process.env.VITE_OAUTH_DISCORD_REDIRECT_URL as string,
			scope: "identify email",
			serverEndPoint: "/auth",
			state: JSON.stringify({ customKey: "customValue" }),
			authUrl: "https://discord.com/oauth2/authorize",
			tokenUrl: "https://discord.com/api/oauth2/token",
			profileUrl: "https://discord.com/api/users/@me",
		},
		spotify: {
			clientId: process.env.VITE_OAUTH_SPOTIFY_CLIENT_ID as string,
			clientSecret: process.env
				.VITE_OAUTH_SPOTIFY_CLIENT_SECRET as string,
			redirectUri: process.env.VITE_OAUTH_SPOTIFY_REDIRECT_URL as string,
			scope: "user-read-private user-read-email",
			serverEndPoint: "/auth",
			state: JSON.stringify({ customKey: "customValue" }),
			authUrl: "https://accounts.spotify.com/authorize",
			tokenUrl: "https://accounts.spotify.com/api/token",
			profileUrl: "https://api.spotify.com/v1/me",
		},
		amazon: {
			clientId: process.env.VITE_OAUTH_AMAZON_CLIENT_ID as string,
			clientSecret: process.env.VITE_OAUTH_AMAZON_CLIENT_SECRET as string,
			redirectUri: process.env.VITE_OAUTH_AMAZON_REDIRECT_URL as string,
			scope: "profile",
			serverEndPoint: "/auth",
			state: JSON.stringify({ customKey: "customValue" }),
			authUrl: "https://www.amazon.com/ap/oa",
			tokenUrl: "https://api.amazon.co.uk/auth/o2/token",
			profileUrl: "https://api.amazon.com/user/profile",
		},
		slack: {
			clientId: process.env.VITE_OAUTH_SLACK_CLIENT_ID as string,
			clientSecret: process.env.VITE_OAUTH_SLACK_CLIENT_SECRET as string,
			redirectUri: process.env.VITE_OAUTH_SLACK_REDIRECT_URL as string,
			scope: "users:read users:read.email",
			serverEndPoint: "/auth",
			state: JSON.stringify({ customKey: "customValue" }),
			authUrl: "https://slack.com/oauth/v2/authorize",
			tokenUrl: "https://slack.com/api/oauth.v2.access",
			profileUrl: "https://slack.com/api/users.info",
			extraUrlParams: {
				profileUrl: {
					user: ["authed_user", "id"],
				},
			},
		},
		twitch: {
			clientId: process.env.VITE_OAUTH_TWITCH_CLIENT_ID as string,
			clientSecret: process.env.VITE_OAUTH_TWITCH_CLIENT_SECRET as string,
			redirectUri: process.env.VITE_OAUTH_TWITCH_REDIRECT_URL as string,
			scope: "user:read:email",
			serverEndPoint: "/auth",
			state: JSON.stringify({ customKey: "customValue" }),
			authUrl: "https://id.twitch.tv/oauth2/authorize",
			tokenUrl: "https://id.twitch.tv/oauth2/token",
			profileUrl: "https://api.twitch.tv/helix/users",
			extraHeaderParams: {
				profileUrl: {
					"Client-Id": process.env
						.VITE_OAUTH_TWITCH_CLIENT_ID as string,
				},
			},
		},
		facebook: {
			clientId: process.env.VITE_OAUTH_FACEBOOK_CLIENT_ID as string,
			clientSecret: process.env
				.VITE_OAUTH_FACEBOOK_CLIENT_SECRET as string,
			redirectUri: process.env.VITE_OAUTH_FACEBOOK_REDIRECT_URL as string,
			scope: "email",
			serverEndPoint: "/auth",
			state: JSON.stringify({ customKey: "customValue" }),
			authUrl: "https://www.facebook.com/v16.0/dialog/oauth",
			tokenUrl: "https://graph.facebook.com/v16.0/oauth/access_token",
			profileUrl: "https://graph.facebook.com/v16.0/me",
			extraUrlParams: {
				profileUrl: {
					fields: "id,name,email",
					access_token: ["access_token"],
				},
			},
		},
		x: {
			clientId: process.env.VITE_OAUTH_X_CLIENT_ID as string,
			clientSecret: process.env.VITE_OAUTH_X_CLIENT_SECRET as string,
			redirectUri: process.env.VITE_OAUTH_X_REDIRECT_URL as string,
			scope: "email",
			serverEndPoint: "/auth",
			requestTokenEndPoint: "/token",
			state: JSON.stringify({ customKey: "customValue" }),
			flowType: "1.0",
			requestTokenUrl: "https://api.twitter.com/oauth/request_token",
			authUrl: "https://api.twitter.com/oauth/authenticate",
			tokenUrl: "https://api.twitter.com/oauth/access_token",
			profileUrl:
				"https://api.twitter.com/1.1/account/verify_credentials.json",
			hashingFunction: (key, baseString) => {
				return crypto
					.createHmac("sha1", key)
					.update(baseString)
					.digest("base64");
			},
		},
	},
	customProviders: {
		provider1: {
			paramsList: {
				clientId: process.env.VITE_OAUTH_PROVIDER1_CLIENT_ID as string,
				clientSecret: process.env
					.VITE_OAUTH_PROVIDER1_CLIENT_SECRET as string,
				redirectUri: process.env
					.VITE_OAUTH_PROVIDER1_REDIRECT_URL as string,
				scope: "email",
				state: JSON.stringify({
					customProviderKey: "customProviderValue",
				}),
				timestamp: async () =>
					await new Promise((resolve) => setTimeout(resolve, 1000)),
			},
			serverEndPoint: "/auth",
			stepLogging: true,
			observability: {
				onRequestStart: (currentFetchData) => {},
				onRequestEnd: (currentFetchData) => {},
				onError: (error) => {},
				onRetry: (attempt) => {},
			},
			urls: {
				beforeRedirect: {
					url1: {
						name: "first request",
						beforeRedirect: (prevFetchData, currentFetchData) => {},
						request: {
							method: "GET",
							urlParams: {
								param1: "value1",
								param2: ["prop1", "prop2"],
								nextTimestamp: (
									paramsList,
									prevFetchData,
									currentFetchData
								) => {},
								timestamp: () => {},
								signature: {
									this: [
										// write all the required methods here in array form
										"signature",
									],
									generate: (
										functions,
										existingParamsList,
										prevFetchData,
										currentFetchData
									) => {
										console.log(functions); // use the functions in an object form and return the property
									},
								},
							},
							headers: {
								"Content-Type": "application/json",
							},
							body: {
								someKey: "someValue",
							},
							bodyEncodingFormat: "json",
							timeout: 5000,
							onError: (error, details) => {
								console.log(error, details);
							},
							retries: {
								maxRetries: 3,
								backOffStrategy: (attempt, retryContext) =>
									Math.pow(2, attempt) * 1000,
								retryOn: (error, statusCode) =>
									[500, 401].includes(statusCode),
								onRetry: (context) => {
									console.log(
										`Retrying... Attempt: ${context.attemptNumber}, Delay: ${context.retryDelay}ms`
									);
								},
							},
						},
						response: {
							parseType: "json",
							validate: [
								(response) => {
									return true;
								},
								(response) => {
									return true;
								},
							],
							toReturn: {
								key: ["key1", "key2"],
								"some-key-key": ["some-key"],
								"some-other-key": "all",
							},
							onError: (error, details) => {
								console.log(error, details);
							},
						},
					},
					url2: {
						// ...similar as above
					},
				},
				afterRedirect: {
					// ...similar as above
				},
			},
		},
		provider2: {
			// ...similar as above
		},
	},
};
