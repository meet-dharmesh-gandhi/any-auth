import {
	checkValidProvider,
	decodeFromBase64,
	throwError,
} from "../globals/utils.js";
import { getConfig } from "../globals/configFunctions.js";
import { responseDataType } from "./types.js";
import {
	afterRedirect,
	decodeAndGetParams,
	handleAfterRedirectForCustomProviders,
	handleCustomProvidersLoginButtonClick,
	handleExistingProvidersLoginButtonClick,
} from "./utils.js";

/**
 * @function handleLoginButtonClick
 *
 * This function is called if a provider button is clicked.
 *
 * @param {string} [provider="google"] - The provider invoked for auth
 * @param {HTMLElement} [redirectElement = window.body] - The element on which the form element will be appended for redirecting
 */
export function handleLoginButtonClick(
	provider: string = "google",
	// @ts-ignore
	redirectElement: HTMLElement = window.body
) {
	provider = provider.toLowerCase();
	const config = getConfig();
	checkValidProvider(config);
	const configProvider = config.providers;
	const configCustomProvider = config.customProviders;

	if (configProvider && configProvider[provider]) {
		handleExistingProvidersLoginButtonClick(
			configProvider[provider],
			provider,
			redirectElement
		);
	} else if (configCustomProvider && configCustomProvider[provider]) {
		handleCustomProvidersLoginButtonClick(
			config,
			provider,
			redirectElement
		);
	}
}

/**
 * @async
 * @function handleOAuthRedirect
 *
 * This function is to be called only once when the window loads, it then handles the part of the auth flow where the provider has redirected the user back to the redirect uri
 *
 * @returns {Promise<responseDataType>} The response of the providers server after getting the user information along with your passed state for post processing
 */
export async function handleOAuthRedirect(): Promise<responseDataType> {
	const urlHash = new URLSearchParams(
		decodeAndGetParams(window.location.hash.slice(1))
	);
	const urlParams = new URLSearchParams(
		decodeAndGetParams(window.location.search.slice(1))
	);
	const access_token: string | null = urlHash.get("access_token"); // for auth2.0 flows
	const oauth_token = urlParams.get("oauth_token"); // for auth1.a flows
	const oauth_verifier = urlParams.get("oauth_verifier"); // for auth1.a flows
	const code: string | null = urlParams.get("code"); // for auth2.0 flows
	let state = null;
	if (!localStorage.getItem("state")) {
		let rawState =
			urlParams.get("state") === null
				? urlHash.get("state") === null
					? urlHash.get("#state")
					: urlHash.get("state")
				: urlParams.get("state"); // extract the state parameter from the query string to get the provider
		if (!rawState) {
			return {
				status: "error",
				data: { error: "State not found", data: rawState },
			};
		}
		let decodedState = null;
		decodedState = decodeURIComponent(rawState);
		if (decodedState) {
			try {
				state = JSON.parse(decodedState);
			} catch (error) {
				console.error("Error getting state:", error);
				return {
					status: "error",
					data: { error: "Error getting state", data: error },
				};
			}
		}
	} else {
		try {
			state = JSON.parse(
				decodeFromBase64(localStorage.getItem("state")!)
			);
		} catch (error) {
			console.error("Error getting state:", error);
			return {
				status: "error",
				data: { error: "Error getting state", data: error },
			};
		}
	}
	localStorage.removeItem("state");

	const config = getConfig();

	checkValidProvider(config);

	const provider = (state.auth as string).toLowerCase();
	let providerFound = false;
	if (!provider) {
		console.error("Invalid provider found");
		return {
			status: "error",
			data: { error: "Invalid provider found", data: provider },
		};
	}
	if (config.providers) {
		if (
			!config.providers[provider] &&
			!(config.customProviders && config.customProviders[provider])
		) {
			throwError("Provider not found", config.globalErrorHandler);
		}
		if (
			(config.providers[provider] &&
				!config.providers[provider].serverEndPoint) ||
			!config.serverUrl
		) {
			throwError("Server URL not found", config.globalErrorHandler);
		}
		providerFound = true;
	}
	if (!providerFound && config.customProviders) {
		const globalErrorHandler = config.globalErrorHandler ?? (() => {});
		if (!config.customProviders[provider])
			throwError(
				"Provider not found!",
				globalErrorHandler,
				"The provider was not found in the list of custom providers as well!"
			);
		if (
			!config.customProviders[provider].serverEndPoint ||
			!config.serverUrl
		)
			throwError("Server URL not specified!", globalErrorHandler);
		providerFound = true;
	}

	const userState = state.userState;

	const response =
		providerFound &&
		config.customProviders &&
		config.customProviders[provider]
			? await handleAfterRedirectForCustomProviders(config, provider)
			: await afterRedirect(
					provider === "google"
						? access_token ?? undefined
						: code ?? undefined,
					provider,
					config,
					oauth_token,
					oauth_verifier
			  );

	return { status: "success", data: { state: userState, response } };
}
