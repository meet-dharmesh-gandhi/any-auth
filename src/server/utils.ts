import {
	bodyAccessCodeType,
	configType,
	objectType,
	previousFetchDataType,
	responseDataType,
	supportedProviderType,
} from "../client/types";
import { getProviderUrl } from "../globals/functionHelpers";
import {
	constructOAuthData,
	getSignature,
	parseToken,
	toUrlParams,
} from "../globals/oauth_1a_functions";
import { getConfig } from "../globals/configFunctions";
import {
	throwError,
	initGlobalParams,
	initParams,
	convertToUrlParams,
	encodeBody,
	waitAndRetryRequest,
	parseRequest,
	storeValuesToReturn,
} from "../globals/utils";

/**
 * @function chooseBodyEncoding
 *
 * Gives the appropriate the encoding format for any of the supported providers.
 *
 * @param provider - The provider invoked for auth
 * @returns {"form" | "json"} the encoding format of the body of the request
 */
export function chooseBodyEncoding(provider: string): "form" | "json" {
	const trueProviders = [
		"microsoft",
		"linkedin",
		"salesforce",
		"discord",
		"spotify",
		"amazon",
		"slack",
		"facebook",
	];
	if (trueProviders.includes(provider)) return "form";
	return "json";
}

/**
 * @function chooseAuthHeaderRequired
 *
 * This function checks if the headers are required for the supported providers.
 *
 * @param provider - The provider invoked for auth
 * @returns {boolean} returns if the headers are required
 */
export function chooseAuthHeaderRequired(provider: string): boolean {
	const trueProviders = ["discord", "spotify", "amazon", "slack"];
	if (trueProviders.includes(provider)) {
		return true;
	}
	return false;
}

/**
 * @async
 * @function getBodyAccessCode
 *
 * This function gets the access token from the provider for auth 2.0 flows
 *
 * @param {configType} config - The main config object
 * @param provider - The provider invoked for auth
 * @param params - The params to be passed in the request body. it contains:
 * - client_id
 * - client__secret
 * - response_code
 * - redirect_uri
 * - grant_type
 * @param {"form" | "json"} [method = "json"] - The method of encoding the body of the request
 * @param {boolean} [authorizationHeader = false] - The flag specifying if the headers for the request are required
 * @returns {Promise<responseDataType>} the response of the provider
 */
export async function getBodyAccessCode(
	config: configType,
	provider: string,
	params: bodyAccessCodeType,
	method: "form" | "json" = "json",
	authorizationHeader: boolean = false
): Promise<responseDataType> {
	if (!config.providers || !config.providers[provider]) {
		throwError(
			`Provider ${provider} not found in config`,
			config.globalErrorHandler
		);
		return {
			status: "error",
			data: `Provider ${provider} not found in config`,
		};
	}
	try {
		const response = await fetch(
			config.providers[provider].tokenUrl ??
				getProviderUrl(provider, "token"),
			{
				method: "POST",
				headers: {
					"Content-Type":
						method === "json"
							? "application/json"
							: "application/x-www-form-urlencoded",
					Accept: "application/json",
					...(authorizationHeader
						? {
								Authorization:
									"Basic " +
									Buffer.from(
										params.client_id +
											":" +
											params.client_secret
									).toString("base64"),
						  }
						: {}),
				},
				body:
					method === "json"
						? JSON.stringify(params)
						: new URLSearchParams(params).toString(),
			}
		).then((data) => data.json());
		return { status: "success", data: response };
	} catch (error) {
		console.error("Error response from provider server:", error);
		return {
			status: "error",
			data: {
				error: "Error response from provider server:",
				data: error,
			},
		};
	}
}

/**
 * @function getPropertyString
 *
 * This function adds any specified property in the profile url from the token response of the provider
 *
 * @param {objectType | null} tokenResponse - The response of the provider containing the token url
 * @param {supportedProviderType} configProvider - The object containing the provider's details
 * @returns {string} the list of all properties separated by "&"
 */
export function getPropertyString(
	tokenResponse: objectType | null,
	configProvider: supportedProviderType
): string {
	if (
		tokenResponse &&
		configProvider.extraUrlParams &&
		configProvider.extraUrlParams.profileUrl
	) {
		const extraParams: objectType =
			configProvider.extraUrlParams.profileUrl;
		let extra = "?";
		Object.entries(extraParams).forEach(
			([key, value]: [string, string[] | string]) => {
				let property: any;
				if (value instanceof Array) {
					property = tokenResponse;
					value.forEach((val) => {
						if (property && Object.hasOwn(property, val)) {
							property = property[val];
						} else {
							throwError(
								"invalid property " +
									val +
									" specified for " +
									JSON.stringify(tokenResponse),
								getConfig().globalErrorHandler
							);
						}
					});
				} else property = value;
				extra += `${key}=${property}&`;
			}
		);
		return extra.slice(0, -1);
	}
	return "";
}

/**
 * @async
 * @function getUserInfo
 *
 * This function gets the user information from the provider's server
 *
 * @param {objectType} config - The main config object
 * @param {string} provider - The provider invoked for auth
 * @param {string} access_token - The access token obtained from the previous responses
 * @param {objectType | null} tokenResponse - The token response from the provider
 * @returns {Promise<responseDataType>} The response of the provider's server after getting the user information.
 */
export async function getUserInfo(
	config: objectType,
	provider: string,
	access_token: string,
	tokenResponse: objectType | null
): Promise<responseDataType> {
	try {
		const profileUrl =
			(config.providers[provider].profileUrl ??
				getProviderUrl(provider, "profile")) +
			getPropertyString(tokenResponse, config.providers[provider]);
		const response = await fetch(profileUrl, {
			method: "GET",
			headers: {
				Authorization: `Bearer ${access_token}`,
				...(config.providers[provider].extraUrlHeaders &&
				config.providers[provider].extraUrlHeaders.profileUrl
					? config.providers[provider].extraUrlHeaders.profileUrl
					: {}),
			},
		}).then((data) => data.json());
		return { status: "success", data: response };
	} catch (error) {
		console.error("Error response from provider server:", error);
		return {
			status: "error",
			data: {
				error: "Error response from provider server:",
				data: error,
			},
		};
	}
}

/**
 * @async
 * @function getOAuth1User
 *
 * This function gets the access token and user information from the provider step by step for auth 1.a flows
 *
 * @param provider - The invoked provider for auth
 * @param oauth_token - The oauth_token obtained from the previous responses
 * @param oauth_verifier - The oauth_token obtained from the previous responses
 * @param configProvider - The object containing the provider's details
 * @returns {Promise<responseDataType>} The response of the provider's server after getting the user information.
 */
export async function getOAuth1User(
	provider: string,
	oauth_token: string,
	oauth_verifier: string,
	configProvider: supportedProviderType
): Promise<responseDataType> {
	const accessTokenString = await getAuth1Data(
		configProvider,
		provider,
		"tokenUrl",
		"token",
		{ oauth_token, oauth_verifier },
		"POST",
		"",
		"text"
	);
	const [access_token, access_token_secret] = [
		parseToken(accessTokenString as string, "oauth_token"),
		parseToken(accessTokenString as string, "oauth_token_secret"),
	];
	if (!access_token || !access_token_secret) {
		return {
			status: "error",
			data: { error: "Access token or secret is missing" },
		};
	}
	const userData = await getAuth1Data(
		configProvider,
		provider,
		"profileUrl",
		"profile",
		{ include_email: true, oauth_token: access_token },
		"GET",
		access_token_secret,
		"json"
	);
	if (userData instanceof Object && Object.hasOwn(userData, "error")) {
		return { status: "error", data: { error: userData.error } };
	} else if (!(userData instanceof Object)) {
		return {
			status: "error",
			data: { error: "Unexpected response from provider server" },
		};
	}
	return { status: "success", data: userData };
}

/**
 * @async
 * @function getAuth1Data
 *
 * This function fetches the required data from the provider's server for auth 1.a flows
 *
 * @param {supportedProviderType} configProvider - The object containing the provider's details
 * @param {string} provider - The provider invoked for auth
 * @param {"requestTokenUrl" | "authUrl" | "tokenUrl" | "profileUrl"} url - The url to fetch the data from
 * @param {string} urlType - The type of the url to fetch the data from, it can have these values:
 * - "requestTokenUrl"
 * - "authUrl"
 * - "tokenUrl"
 * - "profileUrl"
 * @param {objectType} extraOAuthDataParams - Contains parameters like oauth_token, oauth_verifier, etc.
 * @param {string} method - method of the request
 * @param {string} oauth_token_secret - The token secret obtained from the previous responses
 * @param {"text" | "json"} parsingType - The type of the response to help with parsing
 * @returns {Promise<objectType | string>} The response of the provider's server after getting the user information.
 */
export async function getAuth1Data(
	configProvider: supportedProviderType,
	provider: string,
	url: "requestTokenUrl" | "authUrl" | "tokenUrl" | "profileUrl",
	urlType: "auth" | "token" | "profile" | "requestToken",
	extraOAuthDataParams: objectType,
	method: string,
	oauth_token_secret: string,
	parsingType: "text" | "json"
): Promise<objectType | string> {
	const reqUrl = configProvider[url] ?? getProviderUrl(provider, urlType);
	const oauth_consumer_secret = configProvider.clientSecret;
	const oauth_data = constructOAuthData(
		provider,
		configProvider,
		extraOAuthDataParams
	);
	const signature = getSignature(
		reqUrl,
		method,
		oauth_data,
		oauth_token_secret,
		oauth_consumer_secret,
		configProvider.hashingFunction
	);
	const urlParams = toUrlParams(oauth_data, signature);
	const response = await fetch(reqUrl + urlParams).then((data) =>
		parsingType === "json" ? data.json() : data.text()
	);
	return response;
}

/**
 * @async
 * @function getCustomProviderUserInfo
 *
 * This function handles the data fetches for all the urls in the `afterRedirect` object of the custom provider
 *
 * @param config - The main config object
 * @param provider - The invoked provider for auth
 * @param allParams - The params coming from the frontend, it includes all the parameters in received after redirect to the frontend as the url parameters
 * @returns {Promise<{ previousFetchData: previousFetchDataType toReturnObject: objectType} | undefined>} The params to return all along the flow and the data of the previous fetches
 * @throws {Error} This function throws an error in these cases:
 * - the custom provider is not clearly specified in the config object
 * - the givenParams object is empty (since any auth provider does have the client id as the minimum requirement)
 * - the server end point is missing
 * - the `beforeRedirect` and `afterRedirect` object is empty
 */
export async function getCustomProviderUserInfo(
	config: configType,
	provider: string,
	allParams: objectType
): Promise<
	| {
			previousFetchData: previousFetchDataType;
			toReturnObject: objectType;
	  }
	| undefined
> {
	const globalErrorHandler = config.globalErrorHandler ?? (() => {});

	if (
		!config ||
		!config.customProviders ||
		!config.customProviders[provider]
	) {
		throwError(
			"Invalid Custom Provider!",
			globalErrorHandler,
			"Custom Provider Field empty or custom provider is not included in the list of custom providers"
		);
		return;
	}

	const configProvider = config.customProviders[provider];

	// collect the user given values

	const globals = initGlobalParams(
		config,
		configProvider,
		globalErrorHandler,
		"afterRedirect"
	);

	if (!globals.givenParams) {
		throwError(
			"Params list not found for custom provider: " + provider,
			globalErrorHandler
		);
		return;
	}
	if (!globals.serverEndPoint) {
		throwError(
			"Server End Point not found for custom provider: " + provider,
			globalErrorHandler
		);
		return;
	}
	if (
		!(
			globals.reqUrls instanceof Object &&
			Object.entries(globals.reqUrls).length > 0
		)
	) {
		// checking if there is no url to redirect to
		throwError(
			"URLs to fetch before redirecting not found for custom provider: " +
				provider,
			globalErrorHandler
		);
		return;
	}

	globals.log(["processing the fetches before redirecting to the provider"]);
	globals.log(["passed tests and acquired global variables"]);

	for (const url in globals.reqUrls) {
		const params = await initParams(
			true,
			globals.reqUrls,
			url,
			globals.observingFuncs,
			globals.globalTimeout,
			{
				...globals.givenParams,
				...(Object.keys(globals.reqUrls).indexOf(url) === 0
					? allParams
					: {}),
			},
			globals.previousFetchData,
			globals.log,
			allParams
		);

		const requestUrl =
			url + convertToUrlParams(params.urlParams, params.percentEncode);
		globals.log(["Final Request URL with all the url params:", requestUrl]);
		const requestMethod = params.method;
		globals.log(["Final Request method:", requestMethod]);
		const requestHeaders = params.headers;
		globals.log(["Final Request headers:"]);
		Object.entries(requestHeaders).forEach(([key, value]) => {
			globals.log(["-", key, ":", value]);
		});

		const requestBody = encodeBody(
			params.bodyParams,
			params.bodyEncodingFormat,
			params.onError
		);
		globals.log(["Final Request body (in the string form):", requestBody]);
		globals.log(["Saving the request..."]);
		params.currentFetchData.request = {
			method: requestMethod,
			url: requestUrl,
			urlParams: params.urlParams,
			headers: requestHeaders,
			body: params.bodyParams,
		};
		const providerResponse = await waitAndRetryRequest(
			requestUrl,
			requestMethod,
			requestHeaders,
			requestBody,
			parseRequest,
			params.timeout,
			globals.log,
			params.onErrorInResponse,
			params.validateResponse,
			globals.previousFetchData,
			params.maxRetries,
			params.backOffStrategy,
			params.onRetry,
			params.retryOn,
			globals.observingFuncs,
			params.currentFetchData,
			params.responseParseType
		);
		params.currentFetchData.response = providerResponse ?? "Error";
		if (globals.observingFuncs.onRequestEnd) {
			globals.log([
				"Response received, running provided onRequestEnd function now...",
			]);
			globals.observingFuncs.onRequestEnd(params.currentFetchData);
		}
		globals.log(["Response is user valid."]);
		globals.log(["storing the values to return..."]);
		globals.toReturnObject = {
			...globals.toReturnObject,
			...storeValuesToReturn(
				globals.log,
				params.returnAfterResponse,
				providerResponse,
				params.onErrorInResponse
			),
		};
		globals.log(["Calling provided beforeRedirect function..."]);
		params.beforeRedirect(
			globals.previousFetchData,
			params.currentFetchData
		);
		globals.log([
			"adding this fetch data to the previousFetchData object...",
		]);
		globals.previousFetchData = {
			...globals.previousFetchData,
			[params.name]: params.currentFetchData,
		};
	}

	globals.log(["All the requests are over, responding to the server!"]);

	globals.toReturnObject = {
		...globals.toReturnObject,
		name: provider,
	};

	return {
		previousFetchData: globals.previousFetchData,
		toReturnObject: globals.toReturnObject,
	};
}
