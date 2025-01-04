import {
	baseString,
	baseUrl,
	constructOAuthData,
	decodeQueryParams,
	mergeObjects,
	parameterString,
	parseToken,
	signingKey,
	sortObject,
} from "../globals/oauth_1a_functions";

import { getConfig } from "../globals/configFunctions";

import { decodeAndGetParams } from "../client/utils";

import {
	configType,
	currentFetchDataType,
	objectType,
	observingFuncsType,
	onRetryType,
	errorHandlerType,
	functionType,
	paramsListType,
	previousFetchDataType,
	redirectUrlsObjectType,
	requestParamsType,
	requestParseType,
	responseParseType,
	retryContextType,
	retryOnType,
	customObjectType,
	customProviderType,
	initializedParamsType,
	logFunctionType,
} from "../client/types";

import {
	getNonce,
	getSignature,
	getSignatureWithoutCrypto,
	getTimeStamp,
	pE,
} from "../globals/oauth_1a_functions";

import { globalInitializedParamsType } from "../client/types";

/**
 * @function checkValidProvider
 *
 * Validates the configuration object to ensure at least one provider is specified.
 *
 * This function checks whether the `config` object contains either `providers` or `customProviders`.
 * If neither is found, it throws an error using the provided global error handler (if available).
 *
 * @param {configType} config - The main config object.
 * @throws {Error} Throws an error if no provider is specified.
 */
export function checkValidProvider(config: configType) {
	if (!config.providers && !config.customProviders)
		throwError(
			"No Provider Specified Yet!",
			config.globalErrorHandler,
			"You need to specify a provider either as the providers object or as the customProviders object"
		);
}

/**
 * @function initGlobalParams
 *
 * Initializes the global parameters for the urls.
 *
 * @param {configType} config - The main config object.
 * @param {customProviderType} configProvider - The details of the provider in use.
 * @param {errorHandlerType} globalErrorHandler - An error handler function.
 * @param {"beforeRedirect" | "afterRedirect"} [eventName="beforeRedirect"] - The flag which tells if the event is before or after redirect.
 * @returns {globalInitializedParamsType} An object containing initialized global parameters.
 */
export function initGlobalParams(
	config: configType,
	configProvider: customProviderType,
	globalErrorHandler: errorHandlerType,
	eventName: "beforeRedirect" | "afterRedirect" = "beforeRedirect"
): globalInitializedParamsType {
	const storeFetchesAs = "fetch data before redirect: ";
	const storeToReturnAs = "values to return: ";
	const serverUrl = config.serverUrl;
	const globalTimeout = config.globalTimeout ?? 5000;
	const givenParams = configProvider.paramsList; // things like client id and client secret
	const serverEndPoint = configProvider.serverEndPoint; // server endpoint to hit to get any token before redirecting
	const stepLogging = configProvider.stepLogging ?? false; // do they want info at every step
	const mode = configProvider.mode ?? "url"; // to read the params from the url or the local storage (alternative to state cause some providers don't return the state parameter on redirect)
	const log = getLogger(stepLogging);
	const observingFuncs: observingFuncsType = {
		onError: globalErrorHandler,
		...configProvider.observability,
	};
	const urls = configProvider.urls; // getting the url object
	const reqUrls = urls[eventName]; // we need only the ones before the redirect for now
	let previousFetchData: previousFetchDataType = {};
	let toReturnObject: objectType = {};

	return {
		storeFetchesAs,
		storeToReturnAs,
		serverUrl,
		globalTimeout,
		givenParams,
		serverEndPoint,
		stepLogging,
		mode,
		log,
		observingFuncs,
		urls,
		reqUrls,
		previousFetchData,
		toReturnObject,
	};
}

/**
 * @function throwError
 *
 * This function creates an error object and passes it to the provided error handler function. If no handler is specified, it throws the error by default.
 *
 * @param {string} errorMessage - The primary error message.
 * @param {errorHandlerType} [globalErrorHandler] - An optional error handler function.
 * @param {string} [customErrorMessage] - An optional custom error message to provide additional context.
 * @param {boolean} [useThrow=true] - Indicates if the error needs to be thrown.
 * @throws {Error} Throws an error if:
 * - `useThrow` is `true`
 * - no error handler is provided.
 */
export function throwError(
	errorMessage: string,
	globalErrorHandler?: errorHandlerType,
	customErrorMessage?: string,
	useThrow: boolean = true
) {
	const error = new Error(errorMessage);
	globalErrorHandler
		? globalErrorHandler(error, customErrorMessage ?? error.message)
		: (() => {
				throw new Error(errorMessage, {
					cause: customErrorMessage,
				});
		  })();
	if (useThrow) throw error;
}

/**
 * @function encodeAllURIComponents
 *
 * This function takes an object and applies `encodeURIComponent` to all its values, ensuring they are properly encoded for use in a URL.
 *
 * @param {objectType} obj - The object containing key-value pairs to be encoded.
 * @returns {objectType} The same object with all values URL-encoded.
 */
export function encodeAllURIComponents(obj: objectType): objectType {
	Object.entries(obj).forEach(([key, value]) => {
		obj[key] = encodeURIComponent(value);
	});
	return obj;
}

/**
 * @function encodeToBase64
 *
 * This function takes a plain text string and returns its Base64-encoded version.
 *
 * @param {string} text - The text to be encoded into Base64 format.
 * @returns {string} The Base64-encoded string.
 */
export function encodeToBase64(text: string): string {
	return btoa(text);
}

/**
 * @function decodeFromBase64
 *
 * This function takes a Base64-encoded string and returns its plain text version.
 *
 * @param {string} text - The Base64-encoded string.
 * @returns {string} The plain text form of the provided Base64-encoded string.
 */
export function decodeFromBase64(text: string): string {
	return atob(text);
}

/**
 * @function encodeBody
 *
 * Encodes the given request body based on the specified encoding format.
 *
 * @param {objectType | string} body - The body data to be encoded.
 * @param {requestParseType} bodyEncodingFormat - The format to encode the body: "json", "url", or "text".
 * @param {errorHandlerType} onError - The error handler function to be called if an invalid encoding format is provided.
 * @returns {string} The encoded body as a string.
 * @throws {Error} Throws an error if the encoding format is invalid.
 */
export const encodeBody = (
	body: objectType | string,
	bodyEncodingFormat: requestParseType,
	onError: errorHandlerType
): string => {
	if (bodyEncodingFormat === "json") {
		return JSON.stringify(body);
	} else if (bodyEncodingFormat === "url") {
		return new URLSearchParams(body).toString();
	} else if (bodyEncodingFormat === "text" && typeof body === "string") {
		return body;
	} else {
		throwError(
			"Invalid body encoding format specified",
			onError,
			"The bodyEncodingFormat field have either one from 'json', 'url' or 'text' as its value"
		);
		return "";
	}
};

/**
 * @async
 * @function parseRequest
 *
 * This function parses the received response from the provider based on the specified format.
 *
 * @param {Response} response - The HTTP response object to be parsed.
 * @param {responseParseType} responseParseType - The expected response format: "json" or "text".
 * @param {errorHandlerType} onErrorInResponse - The error handler function to be called if an invalid format is provided.
 * @returns {Promise<objectType | string>} The parsed version of the response.
 * @throws {Error} Throws an error if the specified response type is invalid.
 */
export const parseRequest = async (
	response: Response,
	responseParseType: responseParseType,
	onErrorInResponse: errorHandlerType
): Promise<objectType | string> => {
	if (responseParseType === "json") {
		return await response.json();
	} else if (responseParseType === "text") {
		return await response.text();
	} else {
		throwError(
			"Invalid response parse type specified",
			onErrorInResponse,
			"The responseParseType field have either one from 'json' or 'text' as its value"
		);
		return "Invalid response parse type specified";
	}
};

/**
 * @async
 * @function initParams
 *
 * This functions initializes all the parameter which happen to be local to the url object of the provider.
 *
 * @param {boolean} isServer - Indicates whether the request is being made from a server environment.
 * @param {redirectUrlsObjectType} reqUrls - Object containing all redirect-related request urls.
 * @param {string} url - The url to send the request to.
 * @param {observingFuncsType} observingFuncs - Functions for observability in the whole process.
 * @param {number} globalTimeout - Timeout value for this request.
 * @param {paramsListType} givenParams - Parameters specified in the `givenParams` object.
 * @param {previousFetchDataType} previousFetchData - Data fetched from previous requests, includes the requests and responses stored as an object with the name as the key.
 * @param {logFunctionType} log - Logging function used for logging in the console for debugging purposes.
 * @param {objectType} [specificParser] - Object to get the params of instead of the standard `fromPreviousFetches` object.
 *
 * @returns {Promise<initializedParamsType>} A promise resolving to an object containing all initialized request parameters.
 */
export async function initParams(
	isServer: boolean,
	reqUrls: redirectUrlsObjectType,
	url: string,
	observingFuncs: observingFuncsType,
	globalTimeout: number,
	givenParams: paramsListType,
	previousFetchData: previousFetchDataType,
	log: logFunctionType,
	specificParser?: objectType
): Promise<initializedParamsType> {
	const details = reqUrls[url];
	let currentFetchData: currentFetchDataType = {
		request: {
			method: "",
			url: "",
			urlParams: {},
			headers: {},
			body: {},
		},
		response: {},
	};
	// getting url properties
	const name = details.name ?? url;
	const beforeRedirect = details.beforeRedirect ?? (() => {}); // function to run before redirecting the user for pre-processing freedom
	const proxy = details.proxy;
	const request = details.request; // getting the request object
	const method: string = request.method; // method of request
	const percentEncode = request.percentEncode ?? false;
	const onError = request.onError ?? observingFuncs.onError;
	const bodyEncodingFormat = request.bodyEncodingFormat ?? "json";
	const timeout = request.timeout ?? globalTimeout;
	const retriesObject = request.retries ?? {};
	const maxRetries =
		retriesObject && retriesObject.maxRetries
			? retriesObject.maxRetries
			: 2;
	const backOffStrategy =
		retriesObject && retriesObject.backOffStrategy
			? retriesObject.backOffStrategy
			: () => timeout;
	const retryOn =
		retriesObject && retriesObject.retryOn
			? retriesObject.retryOn
			: (error: unknown, statusCode: number) =>
					[429, 503].includes(statusCode);
	const onRetry =
		retriesObject && retriesObject.onRetry
			? retriesObject.onRetry
			: observingFuncs.onRetry ?? (() => {});
	log(["getting the urlParams, headers and body:"]);
	const urlParams = await getAllParams(
		isServer,
		"urlParams",
		givenParams,
		request.urlParams ?? {},
		previousFetchData,
		currentFetchData,
		log,
		onError,
		specificParser
	); // parameters to attach with the url
	const headers = await getAllParams(
		isServer,
		"headers",
		givenParams,
		request.headers ?? {},
		previousFetchData,
		currentFetchData,
		log,
		onError,
		specificParser
	); // headers to attach with the url
	const bodyParams =
		typeof request.body === "string"
			? request.body
			: await getAllParams(
					isServer,
					"body",
					givenParams,
					request.body ?? {},
					previousFetchData,
					currentFetchData,
					log,
					onError,
					specificParser
			  ); // body to attach with the url
	log(["Got the urlParams, headers and body!"]);
	const response = details.response;
	const responseParseType = response.parseType ?? "json";
	const validateResponse = response.validate ?? [];
	const returnAfterResponse = response.toReturn ?? {};
	const onErrorInResponse = response.onError ?? onError;
	log(["got all the parameters:"], {
		name,
		proxy: proxy ?? "none...",
		beforeRedirect: beforeRedirect?.toString(),
		method,
		percentEncode: percentEncode.toString(),
		urlParams: JSON.stringify(urlParams),
		headers: JSON.stringify(headers),
		bodyParams: JSON.stringify(bodyParams),
		bodyEncodingFormat,
		timeout: timeout.toString(),
		onError: onError.toString(),
		maxRetries: maxRetries.toString(),
		backOffStrategy: backOffStrategy.toString(),
		retryOn: retryOn.toString(),
		...(onRetry ? { onRetry: onRetry.toString() } : {}),
		validateResponse: JSON.stringify(validateResponse),
		returnAfterResponse:
			typeof returnAfterResponse === "object"
				? JSON.stringify(returnAfterResponse)
				: returnAfterResponse,
		onErrorInResponse: onErrorInResponse.toString(),
	});
	const initializedParams: initializedParamsType = {
		details,
		currentFetchData,
		name,
		proxy,
		beforeRedirect,
		request,
		method,
		percentEncode,
		onError,
		bodyEncodingFormat,
		timeout,
		retriesObject,
		maxRetries,
		backOffStrategy,
		retryOn,
		onRetry,
		urlParams,
		headers,
		bodyParams,
		response,
		responseParseType,
		validateResponse,
		returnAfterResponse,
		onErrorInResponse,
	};
	return initializedParams;
}

/**
 * @async
 * @function getAllParams
 *
 * This function converts any dynamic value to a static string value making it available to be processed in the requests to the provider.
 *
 * @param {boolean} isServer - Decides if the functions to run are able to run on the client side or not.
 * @param {string} paramName - The name of the parameter being processed (for logging). It can be either of `body`, `urlParams`, or `headers`.
 * @param {paramsListType} givenParams - The `givenParams` object.
 * @param {requestParamsType} params - The parameters to be processed, which may be:
 *   - Static string values
 *   - Array which point to some property in the previous fetches
 *   - Functions that generate values dynamically
 *   - Objects which contain functions to generate values dynamically using library functions
 * @param {previousFetchDataType} previousFetchData - Data from previous fetch operations.
 * @param {currentFetchDataType} currentFetchData - The current fetch data processed until now (has either nothing or just a request object since this object is modified only if the request or response is successful).
 * @param {logFunctionType} log - A function for logging debug messages.
 * @param {errorHandlerType} errorHandler - An error handler function provided in the config object.
 * @param {objectType} [specificParser] - Object to get the params of instead of the standard `fromPreviousFetches` object.
 * @returns {Promise<customObjectType<string, string>>} A promise resolving to the final parsed parameters.
 *
 * @throws {Error} If an invalid key is found in previous fetch data or the specific parser.
 */
export async function getAllParams(
	isServer: boolean,
	paramName: string,
	givenParams: paramsListType,
	params: requestParamsType,
	previousFetchData: previousFetchDataType,
	currentFetchData: currentFetchDataType,
	log: logFunctionType,
	errorHandler: errorHandlerType,
	specificParser?: objectType
): Promise<customObjectType<string, string>> {
	log(["getting the", paramName, "..."]);
	let finalUrlParams = {};
	let index = 0;
	for (let key in params) {
		const value = params[key];
		if (typeof value === "string") {
			// for normal (static) parameter
			log([
				"got the param number:",
				(index + 1).toString(),
				", [key, value] =",
				key,
				value,
			]);
			Object.assign(finalUrlParams, { [key]: value });
			log([
				"added the param to the final params:",
				JSON.stringify(value),
			]);
		} else if (Array.isArray(value)) {
			log([
				"inside the:",
				JSON.stringify(value),
				"got these [property, value] = [",
				key,
				", ",
				value.toString() + "]",
			]);
			// properties the dev wants from the previous responses and requests
			if (value.length < 2 && !specificParser)
				throwError(
					"Too less parameters given to access the previous request or response. minimum 2 are required",
					errorHandler,
					"The first parameter should always be the name of the fetch operation (url by default) and the second parameter should be either 'response' or 'request'"
				);
			let reqProperty = specificParser
				? specificParser
				: value[1] === "request" || value[1] === "response"
				? previousFetchData[value[0]][value[1]]
				: null; // pick the first key in the desired fetch (request or response)
			if (!reqProperty)
				throwError(
					"The second Parameter of the array in the fromPreviousFetches should always be either 'request' or 'response'",
					errorHandler
				);
			log(["passed all the checks!"]);
			for (const v of value) {
				try {
					log(["going in the tree:"], {
						currentProperty: JSON.stringify(reqProperty),
					});
					// @ts-ignore
					reqProperty = reqProperty[v];
				} catch (error) {
					throwError(
						"Parameter " +
							v +
							" not found in previous fetches: " +
							JSON.stringify(reqProperty) +
							", error: " +
							error,
						errorHandler
					);
				}
			}
			log(["got the final key,"], {
				[key]:
					reqProperty && typeof reqProperty === "object"
						? JSON.stringify(reqProperty)
						: reqProperty === null
						? ""
						: "Invalid key Found!",
			});
			if (reqProperty) {
				Object.assign(finalUrlParams, { [key]: reqProperty });
			} else {
				throwError(
					"Invalid key Found",
					errorHandler,
					"Unknown Error occurred please check the array once again to ensure that " +
						value.slice(-1) +
						" exists in " +
						previousFetchData[value[0]][
							value[1] as "request" | "response"
						]
				);
			}
		} else if (typeof value === "function") {
			const currentState = { ...finalUrlParams };
			log(["Current state:"], currentState);
			log([
				"inside the:",
				value.toString(),
				"got these [functionName, function] = [",
				key,
				",",
				value.toString(),
				"]",
			]);
			const val = await value(
				givenParams,
				finalUrlParams,
				previousFetchData,
				currentFetchData
			);
			if (!val) throwError("Function returned nothing", errorHandler);
			log(["Found the property:", val as string]);
			Object.assign(finalUrlParams, { [key]: val });
			log(["New and updates params:"], { ...finalUrlParams });
		} else if (typeof value === "object") {
			const currentState = { ...finalUrlParams };
			log(["Current state:"], currentState);
			log([
				"inside the:",
				JSON.stringify(value),
				"got these [this, generate] = [",
				value.this.toString(),
				",",
				value.generate.toString(),
				"]",
			]);
			const functionsToUse = getRequiredFunctions(
				value.this,
				isServer ? "server" : "client"
			); // getting the functions the dev wants to use
			const functionToRun = value.generate;
			const val = await functionToRun(
				givenParams,
				functionsToUse,
				finalUrlParams,
				previousFetchData,
				currentFetchData
			);
			if (!val) throwError("Function returned nothing", errorHandler);
			log(["Got the final value:", val as string]);
			Object.assign(finalUrlParams, { [key]: val });
			log(["New and updates params:"], { ...finalUrlParams });
		} else {
			log([
				"Got some invalid property and value: [",
				key,
				",",
				JSON.stringify(value),
				"]",
			]);
		}
		index++;
	}
	const finalToReturnUrlParams = removeNestedObjects(finalUrlParams);
	log(["Final parsed params for", paramName], finalUrlParams);
	return finalToReturnUrlParams;
}

/**
 * @async
 * @function waitAndRetryRequest
 *
 * Sends an HTTP request with retry logic based on validation, error handling, and backoff strategy.
 *
 * @param {string} requestUrl - The URL to send the request to.
 * @param {string} requestMethod - The HTTP method (e.g., "GET", "POST").
 * @param {objectType} requestHeaders - The headers to include in the request.
 * @param {string} requestBody - The request body as a string.
 * @param {(response: Response, responseParseType: responseParseType, onErrorInResponse: errorHandlerType) => Promise<objectType | string>} parseRequest - A function to parse the response.
 * @param {number} timeout - The timeout for the request in milliseconds.
 * @param {logFunctionType} log - A logging function for debug purposes.
 * @param {errorHandlerType} onErrorInResponse - A function to handle errors in the response.
 * @param {((prevFetchData: previousFetchDataType) => boolean)[]} validateResponse - An array of validation functions.
 * @param {previousFetchDataType} previousFetchData - Data from previous fetches, includes the request and the response details.
 * @param {number} maxRetries - The maximum number of retry attempts.
 * @param {(attempt: number, retryContext: retryContextType) => number} backOffStrategy - A function deciding the delay for the the next retry.
 * @param {onRetryType | null} onRetry - A function called before retrying.
 * @param {retryOnType} retryOn - A function determining if the request should be retried based on the error and status code.
 * @param {observingFuncsType} observability - Observability functions for tracking requests.
 * @param {currentFetchDataType} currentFetchData - The current fetch data processed until now (has either nothing or just a request object since this object is modified only if the request or response is successful).
 * @param {responseParseType} responseParseType - The type of response parsing to use. Can be either "json" or "text".
 * @param {string} [proxy] - An optional proxy URL for routing the request in case the provider only wants server to server communication for certain requests, works only in the `beforeRedirect` object.
 * @returns {Promise<objectType | string>} The parsed response object or an error message.
 *
 * @throws {Error} Throws an error if:
 * - the request times out
 * - the response is not OK
 * - proxy returns an invalid response, i.e., not an object with a status of "success"
 * - the response is marked as invalid by the validator functions.
 */
export async function waitAndRetryRequest(
	requestUrl: string,
	requestMethod: string,
	requestHeaders: objectType,
	requestBody: string,
	parseRequest: (
		response: Response,
		responseParseType: responseParseType,
		onErrorInResponse: errorHandlerType
	) => Promise<objectType | string>,
	timeout: number,
	log: logFunctionType,
	onErrorInResponse: errorHandlerType,
	validateResponse: ((prevFetchData: previousFetchDataType) => boolean)[],
	previousFetchData: previousFetchDataType,
	maxRetries: number,
	backOffStrategy: (
		attempt: number,
		retryContext: retryContextType
	) => number,
	onRetry: onRetryType | null,
	retryOn: retryOnType,
	observability: observingFuncsType,
	currentFetchData: currentFetchDataType,
	responseParseType: responseParseType,
	proxy?: string
): Promise<objectType | string> {
	let retries = 0;
	const timeAtFirstRequest = Date.now();
	let lastRetryDelay: number = 0;
	let lastAttemptTimeStamp = timeAtFirstRequest;
	let lastRequestStatusCode: number = 0;
	while (retries < maxRetries) {
		log([
			"setting up abort controllers with a timeout of",
			timeout.toString(),
			"...",
		]);
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), timeout);
		if (observability.onRequestStart) {
			log(["calling the observability onRequestStart function..."]);
			observability.onRequestStart(currentFetchData);
		}
		log(["Sending the request..."]);
		if (proxy) log(["Using the proxy:", proxy]);
		try {
			log(["request body:", requestBody], {
				requestUrl,
				requestMethod,
				requestHeaders: JSON.stringify(requestHeaders),
				requestBody,
			});
			const providerResponse: Response = proxy
				? await fetch(proxy, {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							url: requestUrl,
							method: requestMethod,
							headers: requestHeaders,
							...(requestBody === "{}"
								? { body: null }
								: { body: requestBody }),
							parseResponseType: responseParseType,
						}),
						signal: controller.signal,
				  })
				: await fetch(requestUrl, {
						method: requestMethod,
						headers: requestHeaders,
						...(requestBody === "{}"
							? { body: null }
							: { body: requestBody }),
						signal: controller.signal,
				  });
			lastRequestStatusCode = providerResponse.status;
			log(["Checking if received response is ok..."]);
			if (!providerResponse.ok) {
				log([
					"Response has some error:",
					providerResponse.statusText,
					providerResponse.status.toString(),
				]);
				throwError(
					"Response has some error:" +
						(typeof providerResponse === "object"
							? JSON.stringify(providerResponse)
							: typeof providerResponse === "string"
							? providerResponse
							: "unknown error in displaying response!"),
					onErrorInResponse
				);
			}
			log(["Response is ok."]);
			let parsedProviderResponse = await parseRequest(
				providerResponse,
				proxy ? "json" : responseParseType,
				onErrorInResponse
			);
			if (proxy && typeof parsedProviderResponse === "object") {
				if (
					Object.hasOwn(parsedProviderResponse, "status") &&
					parsedProviderResponse.status === "success"
				) {
					parsedProviderResponse = parsedProviderResponse.data;
				} else {
					throwError(
						"Proxy returned an object with status 'success' but no data. Please check the proxy response.",
						onErrorInResponse
					);
				}
			}
			log(["Parsed response received."]);
			if (validateResponse.length > 0)
				log(["Validating the response using provided functions..."]);
			let index = 0;
			for (const value of validateResponse) {
				log(["Reached the", (index + 1).toString(), "function..."]);
				const validResponse = await value(previousFetchData);
				log([
					validResponse
						? "Response passed validation"
						: "Response failed validation, stopping now...",
				]);
				if (!validResponse)
					throwError(
						"Response failed user validation.",
						onErrorInResponse
					);
				index++;
			}
			return parsedProviderResponse;
		} catch (error: any) {
			retries++;
			if (error.name === "AbortError") {
				log([
					"Provider took more than",
					timeout.toString(),
					"seconds to respond. request aborted",
				]);
			} else {
				log([
					"Unknown Error occurred while getting response from provider: " +
						error,
				]);
			}
			const retryContext: retryContextType = {
				attemptNumber: retries,
				error: error,
				totalElapsedTime: Date.now() - timeAtFirstRequest,
				lastAttemptTimeStamp,
				retryDelay: lastRetryDelay,
				maxRetries,
				previousFetchData,
			};
			const currentTimeDelay = backOffStrategy(retries, retryContext);
			log(["checking if retry is needed..."]);
			const retryNeeded = retryOn(error, lastRequestStatusCode);
			if (!retryNeeded) throwError(error, onErrorInResponse);
			log(["calling your function before retrying..."]);
			if (onRetry) onRetry(retryContext);
			log([
				"Retrying in",
				currentTimeDelay.toString(),
				"milliseconds...",
			]);
			const currentTimeStamp = Date.now();
			await new Promise((resolve) =>
				setTimeout(resolve, currentTimeDelay)
			);
			lastRetryDelay = currentTimeDelay;
			lastAttemptTimeStamp = currentTimeStamp;
		} finally {
			clearTimeout(timer);
		}
	}
	return {
		error: "Max Retries Reached",
	};
}

/**
 * @function removeNestedObjects
 *
 * Removes nested objects from the given object, keeping only primitive values.
 *
 * @param {objectType} obj - The input object.
 * @returns {objectType} A new object with only non-object properties.
 */
export function removeNestedObjects(obj: objectType): objectType {
	let finalObj = {};
	Object.entries(obj).forEach(([key, value]) => {
		if (typeof value !== "object") {
			finalObj = { ...finalObj, [key]: value };
		}
	});
	return finalObj;
}

/**
 * @function getRequiredFunctions
 *
 * Retrieves the required functions based on the given function names.
 *
 * @param {string[]} requiredFunctions - An array of function names to retrieve.
 * @param {"server" | "client"} [type="client"] - Specifies whether to retrieve server-side or client-side functions.
 * @returns {customObjectType<string, (...args: any[]) => unknown>} An object containing the requested functions.
 * @throws {Error} If a requested function is not found.
 */
export function getRequiredFunctions(
	requiredFunctions: string[],
	type: "server" | "client" = "client"
): customObjectType<string, (...args: any[]) => unknown> {
	let functionsToReturn: customObjectType<
		string,
		(...args: any[]) => unknown
	> = {};
	const log = getLogger(true);
	const functions: customObjectType<string, functionType<any, any>> = {
		getSignature:
			type === "client" ? getSignatureWithoutCrypto : getSignature,
		getNonce,
		getTimeStamp,
		parseToken,
		constructOAuthData,
		baseString,
		baseUrl,
		mergeObjects,
		parameterString,
		decodeQueryParams,
		sortObject,
		signingKey,
		pE,
		convertToUrlParams,
		convertStringsToObject,
		cleanObject,
		createFormWithParams,
		decodeAndGetParams,
		decodeAllURIComponents,
		getConfig,
	};

	requiredFunctions.forEach((functionName) => {
		log(["got this function: ", functionName]);
		if (functions[functionName]) {
			Object.assign(functionsToReturn, {
				[functionName]: functions[functionName],
			});
		} else {
			throwError("Function not found", getConfig().globalErrorHandler);
		}
	});

	return functionsToReturn;
}

/**
 * @function convertToUrlParams
 *
 * Converts an object of key-value pairs into a URL query string.
 *
 * @param {customObjectType<string, string>} urlParams - The object containing key-value pairs to be converted into URL parameters.
 * @param {boolean} [pe=false] - If true, uses `pE` function for percent encoding; otherwise, `encodeURIComponent` is used.
 * @returns {string} A formatted URL query string starting with "?".
 */
export function convertToUrlParams(
	urlParams: customObjectType<string, string>,
	pe: boolean = false
): string {
	let finalUrl = "?";
	Object.entries(urlParams).forEach(([key, value]) => {
		finalUrl += `${key}=${pe ? pE(value) : encodeURIComponent(value)}&`;
	});
	return finalUrl.slice(0, -1);
}

/**
 * @function storeValuesToReturn
 *
 * Extracts the values from the responses and stores it in an toReturnObject object.
 *
 * @param {logFunctionType} log - The logging function to track execution steps.
 * @param {customObjectType<string, string[] | "all">} returnAfterResponse - The `toReturn` object in the config object. It contains either a string array or the string "all" as the value
 * @param {objectType | string | void | Response} providerResponse - The response from which values will be extracted.
 * @param {errorHandlerType} onErrorInResponse - A function to handle errors encountered during property access.
 * @returns {objectType} The object containing the required return values from the previous fetches.
 */
export function storeValuesToReturn(
	log: logFunctionType,
	returnAfterResponse: customObjectType<string, string[] | "all">,
	providerResponse: objectType | string | void | Response,
	onErrorInResponse: errorHandlerType
): objectType {
	let toReturnObject: objectType = {};
	Object.entries(returnAfterResponse).forEach(([key, value]) => {
		log(["Accessing", key, "..."]);
		let reqProperty: objectType | string | void = providerResponse;
		log(["starting key:", JSON.stringify(reqProperty)]);
		if (value !== "all") {
			value.forEach((val) => {
				log([
					"Current element in array:",
					val,
					"current property:",
					JSON.stringify(reqProperty),
				]);
				if (
					typeof reqProperty === "string" ||
					typeof reqProperty === "undefined"
				) {
					log(["Oops, Seems like a dead end!"]);
					throwError(
						"Error while trying to access the response property, " +
							val,
						onErrorInResponse
					);
					return;
				} else {
					try {
						reqProperty = reqProperty[val];
					} catch (error) {
						throwError(
							"Error while trying to access the response property, " +
								val,
							onErrorInResponse
						);
						return;
					}
				}
			});
		}
		Object.assign(toReturnObject, { [key]: reqProperty });
	});

	return toReturnObject;
}

/**
 * @function getLogger
 *
 * Creates a logging function that logs messages when step logging is enabled.
 *
 * @param {boolean} stepLogging - A flag to enable or disable logging.
 * @returns {logFunctionType} A function that logs messages if `stepLogging` is `true`, otherwise returns a no-op function.
 */
export function getLogger(stepLogging: boolean): logFunctionType {
	const log: logFunctionType = (
		message: string[],
		obj?: customObjectType<string, string>
	) => {
		if (stepLogging) {
			const finalMessage =
				message.join(" ") +
				"\n" +
				(obj
					? Object.entries(obj)
							.map(([key, value]) => key + ": " + value)
							.join("\n")
					: "");
			console.log(finalMessage);
		}
	};
	if (stepLogging) return log;
	return () => {};
}

/**
 * @function convertStringsToObject
 *
 * Converts string values in an object to JSON objects if they are valid JSON strings. If a string which is starts with { and ends with } but parsing it gives an error, that entry is simply skipped
 *
 * @param {customObjectType<string, string>} obj - An object with string values.
 * @returns {customObjectType<string, string | objectType>} A new object where string values that are valid JSON objects are parsed.
 */
export function convertStringsToObject(
	obj: customObjectType<string, string>
): customObjectType<string, string | objectType> {
	let convertedObject: customObjectType<string, string | objectType> = {};
	Object.entries(obj).forEach(([key, value]) => {
		if (value.startsWith("{") && value.endsWith("}")) {
			try {
				convertedObject[key] = JSON.parse(value);
			} catch (_) {}
		}
	});
	return convertedObject;
}

/**
 * @function decodeAllURIComponents
 *
 * Decodes all URI components in the provided object values.
 *
 * @param {customObjectType<string, string>} obj - An object where the values are URI-encoded strings.
 * @returns {customObjectType<string, string>} A new object with decoded URI component values.
 */
export function decodeAllURIComponents(
	obj: customObjectType<string, string>
): customObjectType<string, string> {
	let decodedObject: customObjectType<string, string> = {};
	Object.entries(obj).forEach(([key, value]) => {
		decodedObject[key] = decodeURIComponent(value);
	});
	return decodedObject;
}

/**
 * @function cleanObject
 *
 * Cleans an object by ensuring no values are null or undefined by skipping those values
 *
 * @param {customObjectType<string, string>} obj - An object where the values are strings (can also be empty strings or null or undefined).
 * @returns {customObjectType<string, string>} A new object with completely defined values.
 */
export function cleanObject(obj: objectType): objectType {
	const result: objectType = {};
	Object.entries(obj).forEach(([key, value]) => {
		if (value) result[key] = value;
	});
	return result;
}

/**
 * @function createFormWithParams
 *
 * @param {objectType} params - The parameters to put in the url string
 * @param {string} action - The url to redirect to
 * @param {string} method - The method of the request (mostly get)
 * @returns {HTMLFormElement} The form element with the parameters attached
 */
export function createFormWithParams(
	params: objectType,
	action: string,
	method: string
): HTMLFormElement {
	const form = document.createElement("form");
	form.setAttribute("method", method);
	form.setAttribute("action", action);
	Object.entries(params).forEach(([key, value]) => {
		const input = document.createElement("input");
		input.setAttribute("type", "hidden");
		input.setAttribute("name", key);
		input.setAttribute("value", value);
		form.appendChild(input);
	});
	return form;
}
