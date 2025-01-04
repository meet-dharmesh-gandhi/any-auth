import { configType } from "../client/types.js";
import { throwError } from "./utils.js";

let config: configType | null = null;

/**
 * @function getConfig
 *
 * This function checks if the config object is valid and exists and returns it.
 *
 * @returns {configType} The main config object
 * @throws {Error} This function throws an error if the config object is not set
 */
export function getConfig(): configType {
	checkConfig();
	return config!;
}

/**
 * @function working
 *
 * This function is just to check if the library is working or not.
 */
export function working() {
	console.log("working");
}

/**
 * @function checkConfig
 *
 * This function checks if the config object is valid and exists.
 * @throws {Error} This function throws an error if the config object is not set
 */
export function checkConfig() {
	if (config === null) {
		throw new Error("config not set");
	}
}

let crypto: any;

/**
 * @function getCrypto
 *
 * This function returns the provided crypto module.
 *
 * @returns {any} The crypto module
 * @throws {Error} This function throws an error if the crypto module is not provided
 */
export function getCrypto(): any {
	if (crypto) return crypto;
	throwError("crypto module not provided", getConfig().globalErrorHandler);
}

/**
 * @function setConfig
 *
 * This function is the first to be called in both the backend and the frontend as it sets the config object and the crypto module.
 *
 * @param configData - The main config object
 * @param cryptoModule - The crypto module
 */
export function setConfig(configData: configType, cryptoModule: any) {
	config = configData;
	crypto = cryptoModule;
}
