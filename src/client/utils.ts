import { getProviderUrl, getTokenType } from "../globals/functionHelpers";
import {
	constructOAuthData,
	getSignatureWithoutCrypto,
	parseToken,
	toUrlParams,
} from "../globals/oauth_1a_functions";
import {
	configType,
	currentFetchDataType,
	initializedParamsType,
	logFunctionType,
	objectType,
	previousFetchDataType,
	providerStateType,
	responseDataType,
	supportedProviderType,
} from "./types";
import { getConfig } from "../globals/configFunctions";
import {
	cleanObject,
	convertToUrlParams,
	createFormWithParams,
	decodeAllURIComponents,
	decodeFromBase64,
	encodeBody,
	encodeToBase64,
	getLogger,
	initGlobalParams,
	initParams,
	parseRequest,
	storeValuesToReturn,
	throwError,
	waitAndRetryRequest,
} from "../globals/utils";

/**
 * @function redirectUser
 *
 * Creates a form and adds the required parameters with the provided method and url and submits the form to redirect the user to the url.
 *
 * @param {string} provider - The provider invoked for auth
 * @param {supportedProviderType} configProvider - The details of the provider
 * @param {HTMLElement} redirectElement - The element to attach the form to for redirecting
 * @param {objectType} extraAuthParams - The params passed if the oauth flow being dealt is 1.0
 */
export function redirectUser(
	provider: string,
	configProvider: supportedProviderType,
	redirectElement: HTMLElement,
	extraAuthParams: objectType
) {
	let params: objectType;

	const authUrl =
		configProvider.authUrl ??
		getProviderUrl(provider, "auth", configProvider);

	if (configProvider.flowType === "1.0") {
		params = extraAuthParams;
	} else {
		const clientId = configProvider.clientId;
		const redirectUri = configProvider.redirectUri;
		const scope = configProvider.scope;

		let state: providerStateType = { auth: provider };
		if (configProvider.state) {
			state.userState = configProvider.state;
		}

		params = cleanObject({
			client_id: clientId,
			redirect_uri: redirectUri,
			response_type:
				configProvider.responseType ?? getTokenType(provider),
			...(scope ? { scope: scope } : {}),
			state: encodeURIComponent(JSON.stringify(state)),
			...(configProvider.extraUrlParams ?? {}),
			...extraAuthParams,
		});
	}

	const form = createFormWithParams(params, authUrl, "GET");

	redirectElement.appendChild(form);
	form.submit();
}

/**
 * @async
 * @function handleRedirect
 *
 * @param {string} provider - The provider invoked for auth
 * @param {string} serverUrl - The server to send the request and get user info (last step of mostly all auths)
 * @param {objectType} extraParams - Any extra parameters to be added in the request body along with the provider's name
 * @returns {Promise<responseDataType>} The response from the server
 */
export async function handleRedirect(
	provider: string,
	serverUrl: string,
	extraParams: objectType
): Promise<responseDataType> {
	if (Object.entries(extraParams).length > 0) {
		try {
			const response = await fetch(serverUrl, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ provider, ...extraParams }),
			}).then((data) => data.json());
			return { status: "success", data: response };
		} catch (error) {
			console.error("Error response from server:", error);
			return {
				status: "error",
				data: { error: "Error response from server:", data: error },
			};
		}
	} else {
		console.error("Access token not found");
		return {
			status: "error",
			data: { error: "Access token not found", data: null },
		};
	}
}

/**
 * @async
 * @function afterRedirect
 *
 * used for both 1.0 and 2.0 oauth flows, it detects the flow type first and then accordingly either sends the server a request or returns and error object
 *
 * @param {string | undefined} code - The code received from the provider
 * @param {string} provider - The provider invoked for auth
 * @param {objectType} configObject - The main config object
 * @param {string | null} oauth_token - The oauth token received from the provider
 * @param {string | null} oauth_verifier - The oauth verifier received from the provider
 * @returns {Promise<responseDataType>} The response of the server
 */
export async function afterRedirect(
	code: string | undefined,
	provider: string,
	configObject: objectType,
	oauth_token?: string | null,
	oauth_verifier?: string | null
): Promise<responseDataType> {
	if (!code && !(oauth_token || oauth_verifier)) {
		console.error(
			"Error, " + code
				? "oauth_token or oauth_verifier"
				: "code" + " not found: ",
			window.location.href.split("?")[1] ??
				window.location.href.split("#")[1]
		);
		return {
			status: "error",
			data: {
				error: code
					? "oauth_token or oauth_verifier"
					: "Code" + " not found",
				data:
					window.location.href.split("?")[1] ??
					window.location.href.split("#")[1],
			},
		};
	}
	const response = await handleRedirect(
		provider,
		configObject.serverUrl +
			configObject.providers[provider].serverEndPoint,
		code ? { code } : { oauth_token, oauth_verifier }
	);
	return response;
}

/**
 * @async
 * @function handleOAuth1ButtonClick
 *
 * Used for auth 1.0 flows only. This function sends a request to the provider for a request token and returns it on successful response
 *
 * @param {supportedProviderType} configProvider - The object containing all the details of the provider is use
 * @param {string} provider - The provider invoked for auth
 * @returns {Promise<{oauth_token: string}>} The oauth token obtained from the provider
 * @throws {Error} Error is thrown if the response turns out to be invalid, i.e., does not contain the token
 */
export async function handleOAuth1ButtonClick(
	configProvider: supportedProviderType,
	provider: string
): Promise<{ oauth_token: string }> {
	const log = getLogger(true);
	const requestTokenEndPoint = configProvider.requestTokenEndPoint;
	log(["requestTokenEndPoint", requestTokenEndPoint ?? "undefined"]);
	const requestTokenUrl =
		configProvider.requestTokenUrl ??
		getProviderUrl(provider, "requestToken", configProvider);
	log(["requestTokenUrl", requestTokenUrl]);
	const oauth_consumer_secret = configProvider.clientSecret;
	log(["oauth_consumer_secret", oauth_consumer_secret]);
	const oauth_data = constructOAuthData(provider, configProvider);
	// @ts-ignore
	log(["oauth_data"], oauth_data);
	const oauth_signature = await getSignatureWithoutCrypto(
		getConfig().serverUrl + configProvider.signatureEndPoint,
		requestTokenUrl,
		"POST",
		oauth_data,
		"",
		oauth_consumer_secret,
		configProvider.hashingFunction
	);
	log(["oauth_signature", oauth_signature]);

	const requestToken = await fetch(
		getConfig().serverUrl + requestTokenEndPoint,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				method: "POST",
				url: requestTokenUrl + toUrlParams(oauth_data, oauth_signature),
				parseResponseType: "text",
			}),
		}
	).then((data) => data.json());

	const oauth_token = parseToken(requestToken.data, "oauth_token");

	if (oauth_token === null)
		throwError(
			"Error while getting access token: " + requestToken,
			getConfig().globalErrorHandler
		);

	localStorage.setItem(
		"state",
		encodeToBase64(
			JSON.stringify({ auth: provider, userState: configProvider.state })
		)
	);

	return { oauth_token: oauth_token! };
}

/**
 * @function handleExistingProvidersLoginButtonClick
 *
 * This function handles the logic of when the login button is clicked and the provider is in the supported providers list in the main config object
 *
 * @param {supportedProviderType} configProvider - The object containing all the information about the provider in use
 * @param {string} provider - The provider invoked for auth
 * @param {HTMLElement} redirectElement - The element on which the form is added for redirect purposes
 */
export function handleExistingProvidersLoginButtonClick(
	configProvider: supportedProviderType,
	provider: string,
	redirectElement: HTMLElement
) {
	if (!configProvider) {
		throwError(
			"Provider " + provider + " not found",
			getConfig().globalErrorHandler
		);
	}
	if (!configProvider.clientId) {
		throwError(
			provider + " Client ID not found",
			getConfig().globalErrorHandler
		);
	}
	if (!configProvider.clientSecret) {
		throwError(
			provider + " Client Secret not found",
			getConfig().globalErrorHandler
		);
	}
	if (!configProvider.redirectUri) {
		throwError(
			provider + " Redirect URI not found",
			getConfig().globalErrorHandler
		);
	}
	if (!configProvider.scope && provider !== "salesforce") {
		throwError(
			provider + " Scope not found",
			getConfig().globalErrorHandler
		);
	}

	(async () => {
		let extraAuthParams = {};

		if (configProvider.flowType && configProvider.flowType === "1.0") {
			extraAuthParams = await handleOAuth1ButtonClick(
				configProvider,
				provider
			);
		}

		redirectUser(
			provider,
			configProvider,
			redirectElement,
			extraAuthParams
		);
	})();
}

/**
 * @function redirectOnCustomProviderButtonClick
 *
 * This function handles the redirect for custom auth flows. It redirects the user to the last url in the `beforeRedirect` object for that custom provider
 *
 * @param {logFunctionType} log - The log function to allow the dev to debug the problem in the library or their auth flow
 * @param {string} requestMethod - The method on which the request is sent to the provider
 * @param {initializedParamsType} params - The parameters specific to each url of the provider
 * @param {string} url - The url to redirect to
 * @param {previousFetchDataType} previousFetchData - The data recorded in the previous fetches
 * @param {string} storeFetchesAs - The string which contains the key by which the fetch object is stored in the local storage
 * @param {string} storeToReturnAs - The string which contains the key by which the return object is stored in the local storage
 * @param {objectType} toReturnObject - The current return object which contains params from every request and response which the dev wanted in a specified format
 * @param {HTMLElement} redirectElement - The element on which the form gets appended for redirecting
 * @param {boolean} storeState - The flag indicating whether to store the state in the local storage or not because some providers don't return the state back after redirect
 * @param {string | null} [state] - The state to store in local storage
 */
export function redirectOnCustomProviderButtonClick(
	log: logFunctionType,
	requestMethod: string,
	params: initializedParamsType,
	url: string,
	previousFetchData: previousFetchDataType,
	storeFetchesAs: string,
	storeToReturnAs: string,
	toReturnObject: objectType,
	redirectElement: HTMLElement,
	storeState: boolean,
	state?: string | null
) {
	log(["Last url, preparing for redirect..."]);
	if (requestMethod === "POST") {
		log(["adding the body to the request"]);
		params.currentFetchData.request.body = params.bodyParams;
	}
	const redirectForm = createFormWithParams(
		{
			...params.urlParams,
			...(typeof params.currentFetchData.request.body === "string"
				? { body: params.currentFetchData.request.body }
				: params.currentFetchData.request.body),
		},
		url,
		params.currentFetchData.request.method
	);
	log([
		"Form is ready with the method" +
			(requestMethod === "POST" ? ", url and the body" : " and url"),
	]);
	log(["Form contains:"], {
		method: redirectForm.method,
		url: redirectForm.action,
		body: redirectForm.body,
	});
	log(["form:", redirectForm.outerHTML]);
	log(["Calling the provided beforeRedirect function..."]);
	params.beforeRedirect(previousFetchData, params.currentFetchData);
	log(["adding this fetch data to the previousFetchData object..."]);
	previousFetchData = {
		...previousFetchData,
		[params.name]: params.currentFetchData,
	};
	log(["Storing the data to be accessible after the redirect..."]);
	localStorage.setItem(
		storeFetchesAs,
		encodeToBase64(JSON.stringify(previousFetchData))
	);
	localStorage.setItem(
		storeToReturnAs,
		encodeToBase64(JSON.stringify(toReturnObject))
	);
	if (storeState && state) {
		log(["Storing the state..."]);
		localStorage.setItem("state", encodeToBase64(state));
	}
	log(["Redirecting..."]);
	redirectElement.appendChild(redirectForm);
	if (!params.details.test) redirectForm.submit();
	return;
}

/**
 * @async
 * @function handleCustomProvidersLoginButtonClick
 *
 * This function handles the logic of button click for a custom auth flow. It goes through every url of the `beforeRedirect` object and redirects the user to the last url
 *
 * @param {configType} config - The main config object
 * @param {string} provider - The provider invoked for auth
 * @param {HTMLElement} redirectElement - The element to attach the form element to for redirect
 */
export async function handleCustomProvidersLoginButtonClick(
	config: configType,
	provider: string,
	redirectElement: HTMLElement
) {
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
		globalErrorHandler
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
	}

	globals.log(["processing the fetches before redirecting to the provider"]);
	globals.log(["passed tests and acquired global variables"]);

	let index = 0;
	for (const url in globals.reqUrls) {
		const redirectThisTime =
			index === Object.entries(globals.reqUrls).length - 1;
		const params = await initParams(
			false,
			globals.reqUrls,
			url,
			globals.observingFuncs,
			globals.globalTimeout,
			globals.givenParams,
			globals.previousFetchData,
			globals.log
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
		if (redirectThisTime) {
			redirectOnCustomProviderButtonClick(
				globals.log,
				requestMethod,
				params,
				url,
				globals.previousFetchData,
				globals.storeFetchesAs,
				globals.storeToReturnAs,
				globals.toReturnObject,
				redirectElement,
				globals.mode === "ls",
				configProvider.paramsList && configProvider.paramsList.state
					? typeof configProvider.paramsList.state === "string"
						? configProvider.paramsList.state
						: (configProvider.paramsList.state() as string)
					: null
			);
			return;
		}
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
			params.responseParseType,
			params.proxy
		);
		globals.log(["Got the provider response, saving it now..."]);
		params.currentFetchData.response = providerResponse;
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
		index++;
	}
}

/**
 * @async
 * @function handleAfterRedirectForCustomProviders
 *
 * This function calls the server in order to proceed with the urls in the `afterRedirect` object and returns the response of the server.
 *
 * @param {configType} config - The main config object
 * @param {string} provider - The invoked provider for auth
 * @returns {Promise<{ status: string, data: objectType} | undefined>}
 * @throws {Error} An error is thrown if the previous fetch data or the return values are not found as this indicates that this is a fake version.
 * can happen due to
 * - reloading
 * - tampering with query params or hash params
 */
export async function handleAfterRedirectForCustomProviders(
	config: configType,
	provider: string
): Promise<{ status: string; data: objectType } | undefined> {
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
		globalErrorHandler
	);

	const log = globals.log;

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
	}

	log(["processing the fetches before redirecting to the provider"]);
	log(["passed tests and acquired global variables"]);
	log(["loading the previous fetchData and previous return values..."]);
	try {
		const rawPreviousStoredFetchData = localStorage.getItem(
			globals.storeFetchesAs
		);
		if (!rawPreviousStoredFetchData) {
			throwError(
				"Previously stored fetch data is unavailable",
				globalErrorHandler
			);
			return;
		}
		const rawPreviousToReturnObject = localStorage.getItem(
			globals.storeToReturnAs
		);
		if (!rawPreviousToReturnObject) {
			throwError(
				"Previously stored fetch data is unavailable",
				globalErrorHandler
			);
			return;
		}
		const previousStoredFetchData = JSON.parse(
			decodeFromBase64(rawPreviousStoredFetchData)
		);
		const previousToReturnObject = JSON.parse(
			decodeFromBase64(rawPreviousToReturnObject)
		);
		globals.previousFetchData = {
			...globals.previousFetchData,
			...previousStoredFetchData,
		};
		globals.toReturnObject = {
			...globals.toReturnObject,
			...previousToReturnObject,
		};
		log([
			"Data of the previous fetches and the previous return values is recovered!",
		]);
	} catch (error) {
		throwError(
			"error loading previous fetchData or previous return values: " +
				error,
			globalErrorHandler
		);
	}
	localStorage.removeItem(globals.storeFetchesAs);
	localStorage.removeItem(globals.storeToReturnAs);

	log(["Parsing the url parameters given by the provider..."]);

	const UrlSearchParams = Object.fromEntries(
		new URLSearchParams(decodeAndGetParams(window.location.search.slice(1)))
	);
	const UrlHashParams = Object.fromEntries(
		new URLSearchParams(decodeAndGetParams(window.location.hash.slice(1)))
	);

	log(["Got the URLParams..."]);

	const allUrlParams = {
		...decodeAllURIComponents(UrlSearchParams),
		...decodeAllURIComponents(UrlHashParams),
	};

	log(["All the params have been parsed:", JSON.stringify(allUrlParams)]);

	log(["Sending the request to the server..."]);

	let currentFetchData: currentFetchDataType = {
		request: {
			url: "",
			method: "",
			headers: {},
			body: {},
			urlParams: {},
		},
		response: {},
	};

	const requestBody = JSON.stringify({
		provider,
		allUrlParams,
		previousFetchData: globals.previousFetchData,
	});

	const requestUrl = globals.serverUrl + globals.serverEndPoint;

	log(["request url", requestUrl, ", and body:", requestBody]);

	const partialResponse = (await waitAndRetryRequest(
		requestUrl,
		"POST",
		{
			"Content-Type": "application/json",
		},
		requestBody,
		parseRequest,
		globals.globalTimeout,
		globals.log,
		globalErrorHandler,
		[],
		globals.previousFetchData,
		3,
		(attempt, retryContext) => {
			return Math.pow(2, attempt) * 1000;
		},
		(retryContext) => {
			globals.log([
				"Request to the server failed, retry attempt",
				retryContext.attemptNumber.toString(),
				"starting...",
			]);
		},
		(error, statusCode) => [429, 503].includes(statusCode),
		globals.observingFuncs,
		currentFetchData,
		"json"
	)) ?? {
		status: "error",
		data: "Unknown error while fetching the data from server",
	};
	log(["Partial Response Received:", JSON.stringify(partialResponse ?? {})]);
	const response: responseDataType =
		typeof partialResponse === "object" &&
		Object.entries(partialResponse).every(
			([key, value]) => key === "status" || key === "data"
		)
			? (partialResponse as responseDataType)
			: {
					status: "error",
					data: "Invalid response type sent by the server",
			  };
	log(["Response parsed:", JSON.stringify(response)]);
	if (response.status === "success") {
		globals.previousFetchData = {
			...globals.previousFetchData,
			...response.data.previousFetchData,
		};
		globals.toReturnObject = {
			...globals.toReturnObject,
			...response.data.toReturnObject,
		};
	} else {
		throwError(
			"Error from the server, unable to get the user info!",
			globalErrorHandler,
			"Error: " + response.data
		);
	}

	return { status: "success", data: globals.toReturnObject };
}

/**
 * @function decodeAndGetParams
 *
 * This function decodes the url parameters (search params or hash params) containing html encoding or the standard percent encoding
 *
 * @param {string} stringToDecode - The string to decode
 * @returns {string} the decoded string
 */
export function decodeAndGetParams(stringToDecode: string): string {
	const textArea1 = document.createElement("textarea");
	textArea1.innerHTML = stringToDecode;
	return textArea1.value;
}
