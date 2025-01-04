import { objectType, supportedProviderType } from "../client/types";
import { getCrypto } from "./configFunctions";

/**
 * @function parseToken
 *
 * helps in parsing the value of the desired parameter in a string
 *
 * @param {string} requestToken - The request token returned by the server
 * @param {string} [toSearch = "request_token"] - The key to search for in the request token
 * @returns {string | null} The value of the key in the request token
 */
export function parseToken(
	requestToken: string,
	toSearch: string = "request_token"
): string | null {
	const params = requestToken.split("&");
	for (const param of params) {
		const [key, value] = param.split("=");
		if (key === toSearch) {
			return value;
		}
	}
	return null;
}

/**
 * @function constructOAuthData
 *
 * constructs and gives the oauth data object which contains all the required parameters needed for oauth 1.0 flow.
 *
 * extra parameters can be specified, it includes the compulsory ones by default
 *
 * @param {supportedProviderType} configProvider - The main config provider object containing all the parameters for sending a request to the server of the provider
 * @param {objectType} [extraParams={}] - Extra parameters to be added to the OAuth data (can include things like `oauth_token` or `oauth_verifier`)
 * @returns {objectType} The OAuth data object to be sent to the server
 */
export function constructOAuthData(
	provider: string,
	configProvider: supportedProviderType,
	extraParams: objectType = {}
): objectType {
	const oauth_consumer_key = configProvider.clientId;
	const oauth_signature_method =
		configProvider.signatureMethod ?? "HMAC-SHA1";
	const oauth_timestamp = getTimeStamp();
	const oauth_nonce = getNonce();
	const oauth_version = configProvider.version ?? "1.0";
	const oauth_callback = configProvider.redirectUri;

	const oauth_data = {
		oauth_consumer_key,
		oauth_nonce,
		oauth_signature_method,
		oauth_timestamp,
		oauth_version,
		oauth_callback,
		...extraParams,
	};

	return oauth_data;
}

/**
 * @function toUrlParams
 *
 * converts the parameters of the url from the object form to the string form.
 *
 * @param {objectType} params - The params needed to be included in the url
 * @param {string} signature - The signature to be included in the url
 * @returns {string} The url params string
 */
export function toUrlParams(params: objectType, signature: string): string {
	let result = "?";
	Object.entries(params).forEach(([key, value]) => {
		result += `${key}=${pE(value as string)}&`;
	});
	return result + `oauth_signature=${signature}`;
}

/**
 * @function getNonce
 *
 * Generates a random string of 11 characters
 *
 * @returns {string} A random string of 11 characters
 */
export function getNonce(): string {
	const word_characters =
		"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
	let result = "";

	for (let i = 0; i < 11; i++) {
		result +=
			word_characters[
				parseInt(
					(Math.random() * word_characters.length).toString(),
					10
				)
			];
	}

	return result;
}

/**
 * @function getTimeStamp
 *
 * Generates a timestamp of the current time using the Date.now() function.
 *
 * @returns {Number} The current timestamp when the function is called
 */
export function getTimeStamp(): Number {
	return parseInt((new Date().getTime() / 1000).toString(), 10);
}

/**
 * @function getSignature
 *
 * Generates the oauth 1.0 signature.
 *
 * Uses the hashing function specified by the user, defaults to using the HMAC-SHA1 hashing algorithm.
 *
 * @param {string} url - The url of the provider
 * @param {string} method - The method of the request
 * @param {objectType} oauth_data - The parameters going along with the request (in the url mostly)
 * @param {string} token_secret - The token secret provided by the provider, if not available set it to an empty string
 * @param {string} oauth_consumer_secret - The consumer secret provided by the provider
 * @param {(signingKey: string, baseString: string) => string} [userHashingFunction] - The hashing function provided by the user. it is assumed to be async and hence it can handle waiting for responses from servers as well
 * @param {boolean} [percentEncode] - Whether to percent encode the signature or not, needed to be set false if designing a custom oauth flow with a flow type similar to 1.0
 * @returns {string} The generated signature
 */
export function getSignature(
	url: string,
	method: string,
	oauth_data: objectType,
	token_secret: string,
	oauth_consumer_secret: string,
	userHashingFunction?: (signingKey: string, baseString: string) => string,
	percentEncode?: boolean
): string {
	const crypto = getCrypto();
	const key = signingKey(token_secret, oauth_consumer_secret);
	const bString = baseString(method, url, sortObject(oauth_data));
	return (percentEncode === false ? (str: string) => str : pE)(
		userHashingFunction
			? userHashingFunction(key, bString)
			: hashingFunction(key, bString, crypto)
	);
}

/**
 * @async
 * @function getSignatureWithoutCrypto
 *
 * The function to generate the signature for flows similar to oauth 1.0 on the client side, uses the server to generate the signature and hence it is an async function.
 *
 * @param {string} serverUrl - The absolute server url to send the request to generate the signature
 * @param {string} url - The url of the provider
 * @param {string} method - The method of the request
 * @param {objectType} oauth_data - The parameters going along with the request (in the url mostly)
 * @param {string} token_secret - The token secret provided by the provider, if not available set it to an empty string
 * @param {string} oauth_consumer_secret - The consumer secret provided by the provider
 * @param {(signingKey: string, baseString: string) => string | Promise<string>} [userHashingFunction] - The hashing function provided by the user. it is assumed to be async and hence it can handle waiting for responses from servers as well
 * @param {boolean} [percentEncode] - Whether to percent encode the signature or not, needed to be set false if designing a custom oauth flow with a flow type similar to 1.0
 * @returns {Promise<string>} The generated signature
 */
export async function getSignatureWithoutCrypto(
	serverUrl: string,
	url: string,
	method: string,
	oauth_data: objectType,
	token_secret: string,
	oauth_consumer_secret: string,
	userHashingFunction?: (
		signingKey: string,
		baseString: string
	) => string | Promise<string>,
	percentEncode?: boolean
): Promise<string> {
	const signature = await fetch(serverUrl, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			functionName: "getSignature",
			functionParams: [
				url,
				method,
				oauth_data,
				token_secret,
				oauth_consumer_secret,
				userHashingFunction,
				percentEncode,
			],
		}),
	})
		.then((data) => data.json())
		.then((data) => data.data);
	return signature;
}

/**
 * @async
 * @function hashingFunction
 *
 * The default function to hash the signature for oauth 1.0 flows or custom flows in some cases.
 *
 * @param {string} signingKey - The key to sign the base string with
 * @param {string} baseString - The base string which is to be signed
 * @param crypto - The crypto module
 * @returns {string} The hashed signature
 */
export function hashingFunction(
	signingKey: string,
	baseString: string,
	crypto: any
): string {
	return crypto
		.createHmac("sha1", signingKey)
		.update(baseString)
		.digest("base64");
}

/**
 * @async
 * @function baseString
 *
 * The base string generator function
 *
 * @param {string} method - The method of the request sent to the provider
 * @param {string} url - The url of the provider on which the request is sent
 * @param oauth_data - The parameters going along with the request (in the url mostly)
 * @returns {string} The base string
 */
export function baseString(
	method: string,
	url: string,
	oauth_data: Record<string, unknown>
): string {
	return `${method}&${baseUrl(url)}&${parameterString(oauth_data, url)}`;
}

/**
 * @async
 * @function baseUrl
 *
 * The function to get the base url of the provider, it removes the query parameters from the url and returns the absolute url.
 *
 * @param {string} url - The url of the provider on which the request is sent
 * @returns {string} The base url of the provider
 */
export function baseUrl(url: string): string {
	return pE(url.split("?")[0]);
}

/**
 * @function parameterString
 *
 * This function converts the parameters of the url from the object form to the string form.
 *
 * @param {objectType} oauth_data - The parameters going along with the request (in the url mostly)
 * @param {string} url - The provider's url to which the request is sent
 * @returns {string} The parameter string
 */
export function parameterString(oauth_data: objectType, url: string): string {
	let result = "";
	const params = sortObject(mergeObjects(oauth_data, decodeQueryParams(url)));
	Object.entries(params).forEach(([key, value]) => {
		result += `${key}=${pE(value as string)}&`;
	});
	return pE(result.slice(0, -1));
}

/**
 * @function decodeQueryParams
 *
 * The function to parse all the search parameters in a url
 *
 * @param url - The url to be decoded
 * @returns {objectType} The decoded query parameters
 */
export function decodeQueryParams(url: string): objectType {
	const query = url.split("?")[1] ?? "";

	if (!query) return {};

	const result: Record<string, unknown> = {};
	query.split("&").forEach((param) => {
		const [key, value] = param.split("=");
		if (result[key]) {
			if (result[key] instanceof Array)
				result[key].push(decodeURIComponent(value));
			else result[key] = [result[key], decodeURIComponent(value)];
		} else result[key] = decodeURIComponent(value);
	});

	return result;
}

/**
 * @function mergeObjects
 *
 * The function to merge two objects. If the objects have intersecting keys, obj2 overwrites the values in obj1
 *
 * @param obj1 - The first object, this gets overwritten if there are common keys with obj2
 * @param obj2 - The second object, this overwrites obj1 if there are common keys with obj1
 * @returns {objectType}
 */
export function mergeObjects(obj1: objectType, obj2: objectType): objectType {
	return Object.assign(obj1, obj2);
}

/**
 * @function sortObject
 *
 * Sorts a given object in lexicographic order (by keys)
 *
 * @param {objectType} obj - The object to be sorted
 * @returns {objectType} The sorted object
 */
export function sortObject(obj: objectType): objectType {
	return Object.keys(obj)
		.sort()
		.reduce((sorted: Record<string, unknown>, key) => {
			sorted[key] = obj[key];
			return sorted;
		}, {});
}

/**
 * @function signingKey
 *
 * Gives the signing key for signature generation using the client secret and the token secret
 *
 * @param {string} token_secret - The token secret obtained from the response of the provider
 * @param {string} oauth_consumer_secret - The secret obtained from the provider
 * @returns {string} The signing key
 */
export function signingKey(
	token_secret: string,
	oauth_consumer_secret: string
): string {
	token_secret = token_secret || "";
	return pE(oauth_consumer_secret) + "&" + pE(token_secret);
}

/**
 * @function pE
 *
 * percent encodes a given string as per the standard percent encoding format.
 *
 * @param {string} str - The string to percent encode
 * @returns {string} the percent encoded string
 */
export function pE(str: string): string {
	return encodeURIComponent(str)
		.replace(/\!/g, "%21")
		.replace(/\*/g, "%2A")
		.replace(/\'/g, "%27")
		.replace(/\(/g, "%28")
		.replace(/\)/g, "%29");
}
