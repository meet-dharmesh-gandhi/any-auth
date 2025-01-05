// util types:

export type functionType<A extends Array<any>, B> = (...params: A) => B;

export type onlyReturnFunctionType<B> = () => B;

export type customObjectType<A extends string | number | symbol, B> = Record<
	A,
	B
>;

// usable types:

export type configType = {
	serverUrl: string;
	globalErrorHandler?: errorHandlerType;
	globalTimeout?: number;
	providers?: supportedProvidersType;
	customProviders?: customProvidersType;
};

export type providerStateType = { userState?: string; auth: string };

export type objectType = customObjectType<string, any>;

export type responseDataType = {
	status: "error" | "success";
	data: any | { error: string; data: any };
};

export type bodyAccessCodeType = {
	client_id: string;
	client_secret: string;
	response_code?: string;
	redirect_uri: string;
	grant_type?: string;
};

export type logFunctionType = (
	message: string[],
	obj?: customObjectType<string, string>
) => void;

export type initializedParamsType = {
	details: UrlType;
	currentFetchData: currentFetchDataType;
	name: string;
	proxy?: string;
	beforeRedirect: beforeRedirectType;
	request: requestType;
	method: string;
	percentEncode: boolean;
	onError: errorHandlerType;
	bodyEncodingFormat: requestParseType;
	timeout: number;
	retriesObject: retriesType;
	maxRetries: number;
	backOffStrategy: backOffStrategyType;
	retryOn: retryOnType;
	onRetry: onRetryType;
	urlParams: customObjectType<string, string>;
	headers: customObjectType<string, string>;
	bodyParams: customObjectType<string, string> | string;
	response: responseType;
	responseParseType: responseParseType;
	validateResponse: validateResponseType;
	returnAfterResponse: toReturnType;
	onErrorInResponse: errorHandlerType;
};

export type globalInitializedParamsType = {
	storeFetchesAs: string;
	storeToReturnAs: string;
	serverUrl: string;
	globalTimeout: number;
	givenParams: paramsListType | undefined;
	serverEndPoint: string;
	stepLogging: boolean;
	mode: "url" | "ls";
	log: logFunctionType;
	observingFuncs: observingFuncsType;
	urls: UrlsType;
	reqUrls: redirectUrlsObjectType;
	previousFetchData: previousFetchDataType;
	toReturnObject: objectType;
};

export type serverBodyType = {
	provider: string;
	code?: string;
	oauth_token?: string;
	oauth_verifier?: string;
	allUrlParams?: objectType;
	previousFetchData?: previousFetchDataType;
};

// helper types

export type errorHandlerType = (error: unknown, details: unknown) => void;

export type supportedProvidersType = customObjectType<
	string,
	supportedProviderType
>;

export type supportedProviderType = {
	clientId: string;
	clientSecret: string;
	redirectUri: string;
	serverEndPoint: string;
	scope?: string;
	tenant?: string;
	responseType?: "token" | "code";
	requestTokenEndPoint?: string;
	signatureEndPoint?: string;
	state?: string;
	flowType?: "1.0" | "2.0";
	requestTokenUrl?: string;
	signatureMethod?: string;
	version?: string;
	authUrl?: string;
	tokenUrl?: string;
	profileUrl?: string;
	extraUrlParams?: extraParamsType<string[] | string>;
	extraHeaderParams?: extraParamsType<string>;
	hashingFunction?: (key: string, baseString: string) => string;
};

export type extraParamsType<B> = {
	requestTokenUrl?: extraParamsContentType<B>;
	authUrl?: extraParamsContentType<B>;
	tokenUrl?: extraParamsContentType<B>;
	profileUrl?: extraParamsContentType<B>;
};

export type extraParamsContentType<B> = customObjectType<string, B>;

export type customProvidersType = customObjectType<string, customProviderType>;

export type customProviderType = {
	paramsList?: paramsListType;
	serverEndPoint: string;
	stepLogging: boolean;
	observability?: observingFuncsType;
	mode?: "url" | "ls";
	urls: UrlsType;
};

export type observingFuncsType = {
	onRequestStart?: (currentFetchData: currentFetchDataType) => void;
	onRequestEnd?: (currentFetchData: currentFetchDataType) => void;
	onError: errorHandlerType;
	onRetry?: onRetryType;
};

export type paramsListType = customObjectType<string, string | (() => unknown)>;

export type UrlsType = {
	beforeRedirect: redirectUrlsObjectType;
	afterRedirect: redirectUrlsObjectType;
};

export type redirectUrlsObjectType = customObjectType<string, UrlType>;

export type UrlType = {
	name?: string;
	test?: boolean;
	proxy?: string;
	beforeRedirect?: beforeRedirectType;
	request: requestType;
	response: responseType;
};

export type beforeRedirectType = (
	prevFetchData?: previousFetchDataType,
	currentFetchData?: currentFetchDataType
) => void;

export type requestType = {
	method: string;
	percentEncode?: boolean;
	urlParams?: requestParamsType;
	headers?: requestParamsType;
	body?: requestParamsType | string;
	bodyEncodingFormat?: requestParseType;
	timeout?: number;
	onError?: errorHandlerType;
	retries?: retriesType;
};

export type requestParseType = "json" | "url" | "text";

export type responseType = {
	parseType: responseParseType;
	validate?: validateResponseType;
	toReturn?: toReturnType;
	onError?: errorHandlerType;
};

export type toReturnType = customObjectType<string, string[] | "all">;

export type validateResponseType = ((
	previousFetchData: previousFetchDataType,
	currentFetchData: currentFetchDataType
) => boolean)[];

export type responseParseType = "json" | "text";

export type requestParamsType = customObjectType<
	string,
	string | string[] | generateFunctionType | generatePropertyObject
>;

export type generateFunctionType = functionType<
	[
		paramsList: paramsListType,
		requestParamsTillNow: customObjectType<string, string>,
		prevFetchData: previousFetchDataType,
		currentFetchData: currentFetchDataType
	],
	unknown
>;

export type generatorFunctionType = functionType<
	unknown[],
	Exclude<unknown, void>
>;

export type generatePropertyObject = {
	this: Array<string>;
	generate: (
		paramsList: paramsListType,
		functions: customObjectType<string, generatorFunctionType>,
		requestParamsTillNow: customObjectType<string, string>,
		previousFetchData: previousFetchDataType,
		currentFetchData: currentFetchDataType
	) => Exclude<unknown, void>;
};

export type previousFetchDataType = customObjectType<
	string,
	currentFetchDataType
>;

export type currentFetchDataType = {
	request: currentRequestDataType;
	response: objectType | string;
};

export type currentRequestDataType = {
	method: string;
	url: string;
	urlParams: objectType;
	headers: objectType;
	body: requestParamsType | string;
};

export type retriesType = {
	maxRetries?: number;
	backOffStrategy?: backOffStrategyType;
	onRetry?: onRetryType;
	retryOn?: retryOnType;
};

export type backOffStrategyType = (
	attempt: number,
	retryContext: retryContextType
) => number;

export type onRetryType = (retryContext: retryContextType) => unknown;

export type retryOnType = (error: unknown, statusCode: number) => boolean;

export type retryContextType = {
	attemptNumber: number;
	error: Error;
	totalElapsedTime: number;
	lastAttemptTimeStamp: number;
	retryDelay: number;
	maxRetries: number;
	previousFetchData: previousFetchDataType;
};
