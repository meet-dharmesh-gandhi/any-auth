import {
	getUserInfo,
	getBodyAccessCode,
	chooseBodyEncoding,
	getOAuth1User,
	getCustomProviderUserInfo,
} from "./utils.js";
import {
	objectType,
	responseDataType,
	serverBodyType,
} from "../client/types.js";
import { getConfig } from "../globals/configFunctions.js";
import {
	checkValidProvider,
	getLogger,
	getRequiredFunctions,
	throwError,
} from "../globals/utils.js";

/**
 * @async
 * @function getUser
 *
 * This function is called when the user is redirected back to the redirect uri after the auth flow is halfway complete.
 *
 * @param {serverBodyType} bodyParams - The params passed by the frontend. it includes:
 * - provider: the provider name
 * - code: the code received from the provider
 * - oauth_token: the oauth token received from the provider
 * - oauth_verifier: the oauth verifier received from the provider
 * - allUrlParams: all the url params received from the provider
 * - previousFetchData: the data received from the previous fetches
 * @returns {Promise<responseDataType>} The response of the providers server after getting the user information.
 * @throws {Error} This function throws an error or returns an error object in these cases:
 * - If the provider is not found
 * - If the provider does not exist in the `providers` object:
 *  	>- The flow is not 1.0 and the code is not specified (access token in the case of google)
 * 		>- The flow is 1.0 and the oauth_token or oauth_verifier is not specified
 * - If the provider does not exist in the `customProviders` object:
 *  	>- The custom provider object is not found
 *  	>- The `allParams` parameter is not specified
 *  	>- The `previousFetchData` parameter is not specified
 *  	>- The result obtained at the end is null, i.e., the provider sends some invalid or null response
 */
export async function getUser(
	bodyParams: serverBodyType
): Promise<responseDataType> {
	const {
		provider,
		code,
		oauth_token,
		oauth_verifier,
		allUrlParams,
		previousFetchData,
	} = bodyParams;

	const config = getConfig();

	checkValidProvider(config);

	if (!provider) {
		console.error("Provider not found");
		return {
			status: "error",
			data: {
				error: "Provider not found",
				data: "provider: " + provider,
			},
		};
	}

	if (config.providers && config.providers[provider]) {
		if (
			(!code && config.providers[provider].flowType !== "1.0") ||
			(config.providers[provider].flowType === "1.0" &&
				!(oauth_token && oauth_verifier))
		) {
			if (config.providers[provider].flowType === "1.0") {
				return {
					status: "error",
					data: {
						error: "OAuth Token or OAuth Verifier not found",
					},
				};
			}
			if (provider === "google") {
				console.error("Access token not found");
				return {
					status: "error",
					data: { error: "Access token not found" },
				};
			} else {
				console.error("Code not found");
				return { status: "error", data: { error: "Code not found" } };
			}
		}

		if (
			config.providers[provider].flowType === "1.0" &&
			oauth_token &&
			oauth_verifier
		) {
			const userInfo = await getOAuth1User(
				provider,
				oauth_token,
				oauth_verifier,
				config.providers[provider]
			);
			return { status: "success", data: userInfo };
		}

		let access_token: string = code!;
		let tokenResponse;

		if (provider !== "google") {
			const params = {
				client_id: config.providers[provider].clientId,
				client_secret: config.providers[provider].clientSecret,
				grant_type: "authorization_code",
				redirect_uri: config.providers[provider].redirectUri,
				code,
			};

			const response = await getBodyAccessCode(
				config,
				provider,
				params,
				chooseBodyEncoding(provider)
			);

			tokenResponse = response;

			if (response.status === "success") {
				access_token = response.data.access_token;
			} else {
				return {
					status: "error",
					data: {
						error: "Error from provider",
						data: response.data.error,
					},
				};
			}
		}

		return getUserInfo(config, provider, access_token, tokenResponse?.data);
	} else if (config.customProviders && config.customProviders[provider]) {
		const log = getLogger(config.customProviders[provider].stepLogging);
		log([
			JSON.stringify(config.customProviders[provider]),
			"\n",
			JSON.stringify(allUrlParams),
			"\n",
			JSON.stringify(previousFetchData),
		]);
		if (
			!config.customProviders[provider] ||
			!allUrlParams ||
			!previousFetchData
		) {
			console.error(
				"Invalid params passed by frontend. missing the url params and the data from previous fetches as well"
			);
			return {
				status: "error",
				data: {
					error: "Invalid Params passed",
					data: null,
				},
			};
		}

		const userInfo = await getCustomProviderUserInfo(
			config,
			provider,
			allUrlParams
		);

		if (!userInfo)
			return {
				status: "error",
				data: {
					error: "Unknown error occurred!",
					data: null,
				},
			};

		return {
			status: "success",
			data: userInfo,
		};
	} else {
		throwError("No Provider Specified", config.globalErrorHandler);
		return { status: "error", data: { error: "No Provider Specified" } };
	}
}

/**
 * @async
 * @function helperFunction
 *
 * This function executes a function for the frontend when the frontend is incapable of executing it.
 *
 * This function assumes that the function you want to call is existing in this codebase and is an async server function.
 *
 * @param body - Body of the request
 * @returns {Promise<{ data: unknown }>} The response of the function
 */
export async function helperFunction(
	body: objectType
): Promise<{ data: unknown }> {
	const { functionName, functionParams } = body;

	const reqFunction = getRequiredFunctions([functionName], "server")[
		functionName
	];

	getLogger(true)([
		"helper function received these params for the function",
		reqFunction,
		", params:",
		functionParams,
	]);

	const response = await reqFunction(...functionParams);

	return {
		data: response,
	};
}

/**
 * @async
 * @function useProxy
 *
 * This function allows the server to request resources from the provider on behalf of your frontend.
 *
 * @param body - The body of the request
 * @returns {Promise<responseDataType>} The response of the proxy request
 */
export async function useProxy(body: objectType): Promise<responseDataType> {
	const { url, method, headers, body: reqBody } = body;

	const parseResponseType = body.parseResponseType || "json";

	if (!url) {
		throwError("Invalid Parameters Given", getConfig().globalErrorHandler);
	}

	const fetchOptions: RequestInit = {
		method: method ?? "GET",
		headers: headers ?? {},
	};

	if (reqBody) {
		fetchOptions.body = reqBody;
	}

	const log = getLogger(true);
	log(["url: ", url]);
	// @ts-ignore
	log(["fetchOptions: "], fetchOptions);

	const response: responseDataType = (await fetch(url, fetchOptions)
		.then((data) =>
			parseResponseType === "json"
				? data.json()
				: parseResponseType === "text"
				? data.text()
				: data
		)
		.then((data) => ({ status: "success", data }))
		.catch((error) => {
			console.error("Error using Proxy: ", error);
			return { status: "error", data: error };
		})) as responseDataType;

	log(["response:"], response);

	return response;
}
