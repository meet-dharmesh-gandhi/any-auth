# any-auth

any-auth is a library for adding different auth providers with ease in a website. This library helps to integrate different authentication providers to your webiste making it easy for you to authenticate the user. The library currently supports 12 authentication providers natively, i.e., you don't need to write a lot of code inorder to use those providers. But any-auth can support any other provider from all these supported providers as well.

Currently supported providers:

-   Google
-   Github
-   Microsoft
-   Linkedin
-   Salesforce
-   Discord
-   Spotify
-   Amazon
-   Slack
-   Twitch
-   Facebook
-   X / Twitter

## Installation:

Install the package using

```bash
npm install any-auth
```

or

```bash
yarn add any-auth
```

## Usage:

There are 2 functions for the client side and 3 for the server side. There is also a [`Config Object`](#config) which will be discussed later. There is also one main function for setting up the any-auth library.

### Client Side Functions:

#### handleLoginButtonClick(provider, redirectElement)

The `handleLoginButtonClick` function should be called when the provider button is clicked. This function handles everything before the redirect.
The function takes in two parameters:

-   `provider` - The name of the provider you want to use (should be specified before hand in the config object)
-   `redirectElement` - Since any-auth redirects users using HTML Form Elements, you need to pass in an element to attach the form onto. This is an optional parameter and defaults to `window.body`.

#### handleOAuthRedirect()

The `handleOAuthRedirect` function should be called when the window is loaded (the first function to execute as soon as the window loads). This function handles everything after the redirect.

### Server Side Functions:

#### getUser(bodyParams)

The `getUser` function is the function which handles the auth requests in the server side. this function is responsible for sending requests and receiving responses from the urls of the authentication provider.
This function takes in just one parameter:

-   `bodyParams`: the body of the request recieved by the server endpoint.

#### helperFunction(bodyParams)

The `helperFunction` function is the function which allows you to run certain functions which are runnable only in node js environments like the crypto.createHmac function. This function allows you to use any library functions for getting a parameter in the `Config Object`. This is especially useful when implementing custom auth flows.

#### useProxy(bodyParams)

The `useProxy` function helps in using the server as a proxy for sending requests to the auth providers who require server requests even before redirecting. This is used in the supported flow for `x` and can also be used anywhere in the custom auth flows.

### any-auth setConfig function:

#### setConfig(configObject, cryptoModule)

This function helps setting up the any-auth library for authentication. This function should run first before any any-auth function (even before the `handleOAuthRedirect` function) as this takes in two very important parameters:

-   `configObject`: The `Config Object`.
-   `cryptoModule`: The crypto module. This is required in case you go for the x authentication flow (explained in ...).

### Other any-auth Functions Available To Use:

#### working()

This function is just to ensure that the library is connected to your code and the library is not throwing any startup errors.

#### checkConfig()

This function checks if you have already specified the `Config Object` and throws an error if you haven't

#### getConfig()

This function gets the `Config Object` after calling the [`checkConfig`](#checkConfig) function.

#### getCrypto()

This function returns the crypto module which was specified in the [`setConfig`](#setConfig) function

## Config Object

This is the main controller of your authentication. This file has the following structure:

```javascript
{
    serverUrl: "http://localhost:9000",
    globalTimeout: 5000,
    globalErrorHandler: (error, details) => {
        console.error("Error occured!", error, details);
    },
    providers: {
        someSupportedAuthProvider: {
            clientId: "my-client-Id",
            clientSecret: "my-client-secret",
            redirectUri: "http://localhost:3000/redirect-here",
            serverEndPoint: "/auth",
            scope: "i need email!",
            tenant: "just for microsoft oauth",
            responseType: "token" or "code",
            requestTokenEndPoint: "/proxy",
            signatureEndPoint: "/helper",
            state: JSON.stringify({myCustomState: "Its value"}),
            flowType: "1.0" or "2.0",
            authUrl: "url to the provider's account selector page",
            tokenUrl: "url to access the provider's token",
            profileUrl: "url to access the user's info",
            extraUrlParams: {
                urlName: {
                    param1: "value1",
                    param2: ["val1", "val2"]
                }
            },
            extraHeaderParams: {
                urlName: {
                    param1: "value1"
                }
            },
            requestTokenUrl: "just for 1.0 flows",
            signatureMethod: "just for 1.0 flows",
            version: "just for 1.0 flows",
            hashingFunction: "just for 1.0 flows"
        },
        // more such supported providers
    },
    customProviders: {
        myCustomProvider: {
            paramsList: {
                clientId: "my-client-Id",
                clientSecret: "my-client-secret",
                redirectUri: "http://localhost:3000/redirect-here",
                scope: "my-scope",
                state: JSON.stringify({myCustomState: "state value"})
            },
            serverEndPoint: "/auth",
            stepLogging: false,
            observability: {
                onRequestStart: (currentFetchData) => {
                    console.log(currentFetchData);
                },
                onRequestEnd: (currentFetchData) => {
                    console.log(currentFetchData);
                },
                onError: (error, details) => {
                    console.error("Error occured:", error, details);
                },
                onRetry: (retryContext) => {
                    const {
                        attemptNumber,
                        error,
                        totalElapsedTime,
                        lastAttemptTimeStamp,
                        retryDelay,
                        maxRetries,
                        previousFetchData
                    } = retryContext;
                }
            },
            mode: "url" or "ls",
            urls: {
                beforeRedirect: {
                    "first url of the auth provider": {
                        name: "first-url-provider",
                        test: false,
                        proxy: "http://localhost:9000",
                        beforeRedirect: (previousFetchData, currentFetchData) => {
                            console.log("processing before going ahead...")
                        },
                        request: {
                            method: "POST",
                            percentEncode: false,
                            urlParams: {
                                "param1": "static-string",
                                "param2": ["name", "request", "some-property"],
                                "param3": (
                                    paramsList,
                                    requestParamsTillNow,
                                    previousFetchData,
                                    currentFetchData
                                ) => {
                                    return "some-processed-value";
                                },
                                "param4": {
                                    this: ["function1", "function2"],
                                    generate: (
                                        paramsList,
                                        functions,
                                        requestParamsTillNow,
                                        previousFetchData,
                                        currentFetchData
                                    ) => {
                                        return "some-processed-value-using-library-functions";
                                    }
                                }
                            },
                            headers: {
                                // object similar to the urlParams object
                            },
                            body: "can be a string or an object similar to urlParams",
                            bodyEncodingFormat: "json" or "url" or "text",
                            timeout: 5000,
                            onError: (error, details) => {
                                console.error("Error occured:", error, details);
                            },
                            retries: {
                                maxRetries: 3,
                                backOffStrategy: (
                                    attempt,
                                    retryContext
                                ) => {
                                    return 2000;
                                },
                                onRetry: (
                                    retryContext
                                ) => {
                                    console.log("retrying...");
                                },
                                retryOn: (
                                    error,
                                    statusCode
                                ) => {
                                    returns [429, 503].includes(statusCode);
                                }
                            }
                        },
                        response: {
                            parseType: "json" or "text",
                            validate: [
                                (
                                    previousFetchData,
                                    currentFetchData
                                ) => {
                                    return true;
                                },
                                ...
                            ],
                            toReturn: {
                                "property-name": ["user-info"],
                                "auth-url": "all"
                            },
                            onError: (error, details) => {
                                console.error("Error occured:", error, details);
                            }
                        }
                    }
                },
                afterRedirect: {
                    // similar to the beforeRedirect Object
                }
            }
        },
        // more such custom providers...
    }
}
```

The `Config Object` has a lot of parameters in it especially in the `customProviders` object. This allows for better flexibility and easier flow visualization.

The details of the parameters are:

### serverUrl:

The url of your server

### globalTimeout:

The time period for a which a response from the server should be waited for. applies to all kinds of requests, be it client to server requests or server to server requests.

### globalErrorHandler:

This is the default error handler which will be used for any unhandled error that occurs.

### Providers:

The object of all the providers where the key is the name of the provider and the value is an object containing all the required parameters for the supported provider

These are the parameters of the provider object (required ones are highlighted):

-   **clientId**: The client id given by the provider.
-   **clientSecret**: The client secret given by the provider.
-   **redirectUri**: The redirectUri specified to the provider.
-   **serverEndPoint**: The end point in your server where you have used the getUser function.
-   scope: Scope specified to the provider.
-   tenant: The tenant used (explicitly for microsoft oauth).
-   responseType: It can be either "token" or "code" depending on the provider.
-   requestTokenEndPoint: The endpoint of your server where you have used the `useProxy` function. This is used specifically for providers with a 1.0 auth flow (like twitter).
-   signatureEndPoint: The endpoint of your server where you have used the `helperFunction` function. This is used specifically for providers with a 1.0 auth flow (like twitter).
-   state: any state you want to add to get back after redirecting
-   flowType: This can have a value of either "1.0" or "2.0". flows like twitter need to be explicitly marked as "1.0".
-   authUrl: The url to redirect the user to inorder to get the code or access token.
-   tokenUrl: The url to get the access token from the provider (not applicable in the case of google).
-   profileUrl: The url to get the user information from the provider
-   extraUrlParams: Any extra url parameters to be added in the url for providers like Slack.
-   extraHeaderParams: Any extra headers to be added in the request headers for providers like Twitch.
-   requestTokenUrl: The url to get the request token explicitly for providers using the auth flow of 1.0.
-   signatureMethod: The signature method to be used to hash the signature for auth 1.0 flows. defaults to "HMAC-SHA1" if not specified.
-   version: The version to be sent in the oauth data for generating signature. defaults to "1.0" if not specified.
-   hashingFunction: The hashing function to use to hash the signature. defaults to:
    ```javascript
    crypto.createHmac("sha1", signingKey).update(baseString).digest("base64");
    ```

### customProviders:

The object of all the providers where the key is the name of the provider and the value is an object containing all the required parameters for the custom provider

These are the parameters of the provider object (required ones are highlighted):

-   paramsList: The list of all the parameters you may require in later data fetches.
-   **serverEndPoint**: The end point in your server where you have used the getUser function.
-   **stepLogging**: Do you want to see the status at each step?
-   observability: This is an object containing 4 functions. These are onRequestStart (executes at the start of every request made), onRequestEnd (executes after response validation), onError (executes if any error occurs during the data fetch process) and onRetry (executes before the request is retried).
-   mode: can have a value of either "url" or "ls". "ls" implies that the provider does not return a state parameter and local storage is the only option. The "url" option is the default option.
-   **urls**: The urls object contains all the urls to be used for data fetching divided into two categories, `beforeRedirect` and `afterRedirect` and each of these categories is an object with the url and its details as key value pairs. The key and value pairs inside these categories is discussed in the next line in greater detail

#### url:

This is a string on which the request will be sent.

-   name: the name to be used for the url, defaults to the url itself.
-   test: Applicable only to the last url in the `beforeRedirect` object. If set to true, does not redirect the user to the provider but does everything else (for debugging purposes). defaults to false.
-   proxy: the url you want to use as a proxy for this specific request.
-   beforeRedirect: The function to execute before the next url is sent a request (for post processing purposes). It takes in two parameters:
    -   previousFetchData: The object containing all the requests and responses of the previous data fetches.
    -   currentFetchData: The object containing the request and response of the current data fetch.
-   **request**: The parameters to include in the request.
    -   **method**: Can be any valid method.
    -   percentEncode: Do you need the url params to be percent encoded or simply encoded using javascript's encodeUriComponent
    -   urlParams: The url parameters to include in the url. They can be specified in one of the ways:
        -   String: value of the parameter in string form.
        -   Array: the parameter that exists in the previous data fetches. **Note to the developer: the first element of the array should be the name of the one of the previous requests (could be the url if the name was not given) and the second element should always be either "request" or "response"**
        -   Function: This function provides these parameters and expects a string to be returned
            -   paramsList: The parameters specified earlier for reuseability.
            -   requestParamsTillNow: The request parameters until now, includes all the parameters parsed for specifically the `urlParams` object until this parameter. Useful when implementing auth 1.0 flows for a custom provider.
            -   previousFetchData: The data of all the previous fetches containing all the requests and responses until this request.
            -   currentFetchData: Empty for `beforeRedirect` object but contains the request details for `afterRedirect` object.
        -   Object: This object contains two entries.
            -   this: an array of strings which consists of all the library functions wanted by the user
            -   generate: functions which is expected to return a string given these parameters:
                -   paramsList: The parameters specified earlier for reuseability.
                -   functions: The functions asked for in the `this` array. This can have all the functions mentioned in the `Library Functions` section.
                -   requestParamsTillNow: The request parameters until now, includes all the parameters parsed for specifically the `urlParams` object until this parameter. Useful when implementing auth 1.0 flows for a custom provider.
                -   previousFetchData: The data of all the previous fetches containing all the requests and responses until this request.
                -   currentFetchData: Empty for `beforeRedirect` object but contains the request details for `afterRedirect` object.
    -   headers: The headers object. It has the same format as the urlParams object.
    -   body: The body can be either a string or an object. The body object has the same format as the urlParams object.
    -   bodyEncodingFormat: Encodes the body according to the specified format. Can be either of "json" (JSON.stringify), "url" ((new URLSeachParams).toString()) or "text" (assumes that the body is a string).
    -   timeout: Time in milliseconds to wait for the response before aborting and retrying. defaults to globalTimeout if not specified.
    -   onError: The function that executes when any error is encountered in the fetch operation.
    -   retries: The object which handles data for retrying on abort. It includes:
        -   maxRetries: The maximum retries you want to allow. Default is 3.
        -   backOffStrategy: Function which tells the amount of time to wait before retrying at every failture. Recieved parameters:
            -   attempt: The number of retry attempt.
            -   retryContext: Object containing these parameters:
                -   attemptNumber: The current attempt number
                -   error: The error occurred last time.
                -   totalElapsedTime: The amount of elapsed time since the first request was made.
                -   lastAttemptTimeStamp: The time stamp of the last request attempt.
                -   retryDelay: The delay obtained from the backOffStrategy Function for this retry.
                -   maxRetries: The maximum retries set in the `Config Object`.
                -   previousFetchData: The object containing the info about all the data fetches that were done prior to this.
        -   onRetry: The function that executes when a retry is done. It is given the `retryContext` object.
        -   retryOn: The function which returns a boolean value given the error and the status code from the previous response.
-   **response**: The object with the details for getting a response.
    -   **parseType**: The parse method or the parse type that should be used for this response. Can have its value as either "json" or "text". Defaults to "json" if not specified.
    -   validate: Array of functions which return a boolean value given the previous and current fetch data.
    -   toReturn: The object containing all the values to get after fetching from the provider's response. The key is a string and the value can either be the string "all" or an array which is the parameter of the response object. (["param1", "param2"] is equivalent to response.param1.param2)
    -   onError: The function that executes when any error is encountered in the fetch operation.

## Library Functions

The any-auth library provides some functions for processing certain things like headers, body or url parameters of a request for a custom provider. List of the provided functions. (**Case matters when trying to ask for these functions in `this` array**)

-   getSignature
-   getNonce
-   getTimeStamp
-   parseToken
-   constructOAuthData
-   baseString
-   baseUrl
-   mergeObjects
-   parameterString
-   decodeQueryParams
-   sortObject
-   signingKey
-   pE (short for percentEncode)
-   convertToUrlParams
-   convertStringsToObject
-   cleanObject
-   createFormWithParams
-   decodeAndGetParams
-   decodeAllURIComponents
-   getConfig

## Examples:

1. Sample code for frontend and backend:

-   frontend (using html and vanilla javascript):

    ```HTML
    <!DOCTYPE html>
    <html lang="en">

    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Any Auth HTML Test Project</title>
    </head>

    <style>
        body {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
        }
    </style>

    <body>
        <button class="provider-button" id="google">Google
            Provider</button>
        <button class="provider-button" id="github">GitHub
            Provider</button>
    </body>

    <script type="module">
        import * as anyAuth from './node_modules/any-auth/dist/client/index.mjs';

        window.addEventListener("load", async () => {
            const response = await anyAuth.handleOAuthRedirect();
            console.log(response);
        })

        const config = {...};

        anyAuth.setConfig(config, crypto);

        const providerButtons = document.querySelectorAll(".provider-button");

        providerButtons.forEach((providerButton) => {
            const providerId = providerButton.id;
            providerButton.addEventListener("click", () => {
                anyAuth.handleLoginButtonClick(providerId);
            });
        })
    </script>

    </html>
    ```

-   frontend (using React):

    ```javascript
    import { useEffect } from "react";
    import "./App.css";
    import * as anyAuth from "any-auth";

    function App() {
    	const myHTMLBodyElement: HTMLBodyElement =
    		document.querySelector("body") ?? new HTMLBodyElement();

    	const authProviders = [
    		"google",
    		"github",
    		"microsoft",
    		"linkedin",
    		"salesforce",
    		"discord",
    		"spotify",
    		"amazon",
    		"slack",
    		"twitch",
    		"facebook",
    		"x",
    	];

    	useEffect(() => {
    		(async () => {
    			const response = await anyAuth.handleOAuthRedirect();
    			console.log(response);
    		})();
    	}, []);

    	return (
    		<>
    			<button onClick={() => anyAuth.working()}>Click me</button>
    			{authProviders.map((authProvider) => {
    				return (
    					<button
    						key={authProvider}
    						onClick={() =>
    							anyAuth.handleLoginButtonClick(
    								authProvider,
    								myHTMLBodyElement
    							)
    						}
    					>
    						Google Login
    					</button>
    				);
    			})}
    		</>
    	);
    }

    export default App;
    ```

-   backend (nodeJS):

    ```javascript
    const express = require("express");
    const cors = require("cors");
    const anyAuth = require("any-auth");
    const crypto = require("crypto");

    const port = 9000;

    const app = express();

    app.use(express.json());
    app.use(cors({
        origin: ['http://localhost:3001', 'http://localhost:3000']
    }));

    const config = {...};

    app.post("/auth", async (req, res) => {
        console.log("Auth Request!");
        const userDataResponse = await anyAuth.getUser(req.body);
        return res.send(userDataResponse);
    })

    app.post("/helper", async (req, res) => {
        console.log("Helper Request!");
        res.send(await anyAuth.helperFunction(req.body));
    })

    app.post("/proxy", async (req, res) => {
        console.log("Proxy Request!");
        return res.send(await anyAuth.useProxy(req.body));
    });

    app.get('/', (req, res) => {
        anyAuth.working();
        res.send('Server Running on Port: ' + port);
    });

    app.all("*", (req, res) => {
        res.status(404).send({ 'error': 'Route not found' });
    });

    app.listen(port, () => {
        anyAuth.setConfig(config, crypto);
        console.log(`Server is running on port ${port}`);
    });
    ```

2. `Config Object` for Google oauth:

    ```bash
    const config = {
        serverUrl: "http://localhost:3000",
        providers: {
            google: {
                clientId: "my-client-id",
                clientSecret: "my-client-secret",
                redirectUri: "http://localhost:3000/",
                scope: "email profile openid",
                serverEndPoint: "/auth",
            },
        }
    }
    ```

3. `Config Object` for Github oauth:

    ```javascript
    const config = {
    	serverUrl: "http://localhost:9000",
    	providers: {
    		github: {
    			clientId: "Ov23lim2Ki6k49fue9EI",
    			clientSecret: "5aa1eb595ab48df4d46457ee4c8a66915cbc64c2",
    			redirectUri: "http://localhost:3000/frontend/index.html",
    			scope: "user:email",
    			serverEndPoint: "/auth",
    		},
    	},
    };
    ```

4. `Config Object` for Microsoft oauth (state parameter is optional but just for understanding, it will be used from here on):

    ```javascript
    const config = {
        serverUrl: "http://localhost:9000",
        providers: {
            microsoft: {
                clientId: "my-client-id",
                clientSecret: "my-client-secret",
                redirectUri: "http://localhost:3000",
                tenant: "organizations",
                scope: "user:email",
                serverEndPoint: "/auth",
                state: JSON.stringify({ customKey: "customValue" }),
            }
        };
    },
    ```

5. `Config Object` for Linkedin oauth:

    ```javascript
    const config = {
        serverUrl: "http://localhost:9000",
        providers: {
            linkedin: {
                clientId: "my-client-id",
                clientSecret: "my-client-secret",
                redirectUri: "http://localhost:3000",
                scope: "openid email profile",
                serverEndPoint: "/auth",
                state: JSON.stringify({ customKey: "customValue" }),
            }
        };
    },
    ```

6. `Config Object` for Salesforce oauth:

    ```javascript
    const config = {
        serverUrl: "http://localhost:9000",
        providers: {
            salesforce: {
                clientId: "my-client-id",
                clientSecret: "my-client-secret",
                redirectUri: "http://localhost:3000",
                serverEndPoint: "/auth",
                state: JSON.stringify({ customKey: "customValue" }),
            }
        };
    },
    ```

7. `Config Object` for Discord oauth:

    ```javascript
    const config = {
        serverUrl: "http://localhost:9000",
        providers: {
            discord: {
                clientId: "my-client-id",
                clientSecret: "my-client-secret",
                redirectUri: "http://localhost:3000",
                scope: "identify email",
                serverEndPoint: "/auth",
                state: JSON.stringify({ customKey: "customValue" }),
            }
        };
    },
    ```

8. `Config Object` for Spotify oauth:

    ```javascript
    const config = {
        serverUrl: "http://localhost:9000",
        providers: {
            spotify: {
                clientId: "my-client-id",
                clientSecret: "my-client-secret",
                redirectUri: "http://localhost:3000",
                scope: "user-read-private user-read-email",
                serverEndPoint: "/auth",
                state: JSON.stringify({ customKey: "customValue" }),
            }
        };
    },
    ```

9. `Config Object` for Amazon oauth:

    ```javascript
    const config = {
        serverUrl: "http://localhost:9000",
        providers: {
            amazon: {
                clientId: "my-client-id",
                clientSecret: "my-client-secret",
                redirectUri: "http://localhost:3000",
                scope: "profile",
                serverEndPoint: "/auth",
                state: JSON.stringify({ customKey: "customValue" }),
            }
        };
    },
    ```

10. `Config Object` for Slack oauth:

    ```javascript
    const config = {
        serverUrl: "http://localhost:9000",
        providers: {
            slack: {
                clientId: "my-client-id",
                clientSecret: "my-client-secret",
                redirectUri: "http://localhost:3000",
                scope: "users:read users:read.email",
                serverEndPoint: "/auth",
                state: JSON.stringify({ customKey: "customValue" }),
            },
            extraUrlParams: {
    			profileUrl: {
    				user: ["authed_user", "id"],
    			},
    		},
        };
    },
    ```

11. `Config Object` for Twitch oauth:

    ```javascript
    const config = {
        serverUrl: "http://localhost:9000",
        providers: {
            twitch: {
                clientId: "my-client-id",
                clientSecret: "my-client-secret",
                redirectUri: "http://localhost:3000",
                scope: "profile",
                serverEndPoint: "/auth",
                state: JSON.stringify({ customKey: "customValue" }),
            },
            extraHeaderParams: {
    			profileUrl: {
    				"Client-Id": import.meta.env.VITE_OAUTH_TWITCH_CLIENT_ID,
    			},
    		},
        };
    },
    ```

12. `Config Object` for Facebook oauth:

    ```javascript
    const config = {
        serverUrl: "http://localhost:9000",
        providers: {
            facebook: {
                clientId: "my-client-id",
                clientSecret: "my-client-secret",
                redirectUri: "http://localhost:3000",
                scope: "profile",
                serverEndPoint: "/auth",
                state: JSON.stringify({ customKey: "customValue" }),
            },
            extraUrlParams: {
    			profileUrl: {
    				fields: "id,name,email",
    				access_token: ["access_token"],
    			},
    		},
        };
    },
    ```

13. `Config Object` for X/Twitter oauth:

    ```javascript
    const config = {
        serverUrl: "http://localhost:9000",
        providers: {
            x: {
                clientId: "my-client-id",
                clientSecret: "my-client-secret",
                redirectUri: "http://localhost:3000",
                scope: "email",
                serverEndPoint: "/auth",
                requestTokenEndPoint: "/proxy",
                signatureEndPoint: "/helper",
                state: JSON.stringify({ customKey: "customValue" }),
                flowType: "1.0"
            },
        };
    },
    ```

14. `Config Object` for google using the `customProviders` object:
    ```javascript
    const config = {
    	serverUrl: "http://localhost:9000",
    	customProviders: {
    		google2: {
    			paramsList: {
    				clientId: "my-client-id",
    				clientSecret: "my-client-secret",
    				redirectUri: "http://localhost:3000",
    				scope: "email profile openid",
    				response_type: "token",
    				include_granted_scopes: "true",
    				state: JSON.stringify({
    					auth: "google2",
    					userState: { type: "custom" },
    				}),
    			},
    			serverEndPoint: "/auth",
    			stepLogging: false,
    			observability: {
    				onRequestStart: () => {
    					console.log("Request started!");
    				},
    				onError: (error, details) => {
    					console.log("Error occurred!", error, details);
    				},
    			},
    			urls: {
    				beforeRedirect: {
    					"https://accounts.google.com/o/oauth2/v2/auth": {
    						name: "redirect-url",
    						beforeRedirect: () => {
    							console.log("Redirecting... (by config file)");
    						},
    						test: false,
    						request: {
    							method: "GET",
    							urlParams: {
    								client_id: (paramsList) =>
    									paramsList.clientId,
    								redirect_uri: (paramsList) =>
    									paramsList.redirectUri,
    								response_type: (paramsList) =>
    									paramsList.response_type,
    								include_granted_scopes: (paramsList) =>
    									paramsList.include_granted_scopes,
    								scope: (paramsList) => paramsList.scope,
    								state: (paramsList) => paramsList.state,
    							},
    						},
    						response: {
    							parseType: "json",
    						},
    					},
    				},
    				afterRedirect: {
    					"https://www.googleapis.com/oauth2/v3/userinfo": {
    						request: {
    							method: "POST",
    							headers: {
    								Authorization: ["access_token"],
    							},
    						},
    						response: {
    							parseType: "json",
    							toReturn: {
    								all: "all",
    							},
    						},
    					},
    				},
    			},
    		},
    	},
    };
    ```
15. `Config Object` for microsoft using the `customProviders` object:

    ```javascript
    const config = {
        serverUrl: "http://localhost:9000",
        customProviders: {
            microsoft2: {
                paramsList: {
                    clientId: import.meta.env.VITE_OAUTH_MICROSOFT_CLIENT_ID,
                    clientSecret: import.meta.env
                        .VITE_OAUTH_MICROSOFT_CLIENT_SECRET,
                    redirectUri: import.meta.env.VITE_OAUTH_MICROSOFT_REDIRECT_URL,
                    tenant: "organizations",
                    scope: "user:email",
                    state: JSON.stringify({
                        auth: "microsoft2",
                        userState: { customKey: "customValue", type: "custom" },
                    }),
                },
                serverEndPoint: "/auth",
                stepLogging: false,
                observability: {
                    onRequestStart: () => {
                        console.log("Request started!");
                    },
                    onError: (error, details) => {
                        console.log("Error occurred!", error, details);
                    },
                    onRequestEnd: (currentFetchData) => {
                        console.log("Request ended!");
                        console.log(JSON.stringify(currentFetchData));
                    },
                    onRetry: (retryContext: retryContextType) => {
                        const {
                            attemptNumber,
                            error,
                            totalElapsedTime,
                            lastAttemptTimeStamp,
                            retryDelay,
                            maxRetries,
                            previousFetchData,
                        } = retryContext;
                        console.log("retried!");
                        console.log("attemptNumber: " + attemptNumber);
                        console.log("error: " + error);
                        console.log("totalElapsedTime: " + totalElapsedTime);
                        console.log(
                            "lastAttemptTimeStamp: " + lastAttemptTimeStamp
                        );
                        console.log("retryDelay: " + retryDelay);
                        console.log("maxRetries: " + maxRetries);
                        console.log(
                            "previousFetchData: " +
                                JSON.stringify(previousFetchData)
                        );
                    },
                },
                urls: {
                    beforeRedirect: {
                        "https://login.microsoftonline.com/organizations/oauth2/authorize":
                            {
                                name: "microsoft2-redirect-url",
                                request: {
                                    method: "GET",
                                    urlParams: {
                                        client_id: (paramsList) =>
                                            paramsList.clientId,
                                        redirect_uri: (paramsList) =>
                                            paramsList.redirectUri,
                                        response_type: "code",
                                        scope: (paramsList) => paramsList.scope,
                                        state: (paramsList) => paramsList.state,
                                    },
                                    timeout: 5000,
                                    onError: (error, details) => {
                                        console.log(
                                            "Error occurred in microsoft2-redirect-url!",
                                            error,
                                            details
                                        );
                                    },
                                },
                                response: {
                                    parseType: "json",
                                    toReturn: {
                                        "microsoft2-redirect-url": "all",
                                    },
                                    onError: (error, details) => {
                                        console.log(
                                            "Error occurred in microsoft2-redirect-url!",
                                            error,
                                            details
                                        );
                                    },
                                },
                            },
                    },
                    afterRedirect: {
                        "https://login.microsoftonline.com/organizations/oauth2/v2.0/token":
                            {
                                name: "microsoft2-access-token",
                                request: {
                                    method: "POST",
                                    headers: {
                                        "Content-Type":
                                            "application/x-www-form-urlencoded",
                                    },
                                    body: {
                                        client_id: (paramsList) =>
                                            paramsList.clientId,
                                        client_secret: (paramsList) =>
                                            paramsList.clientSecret,
                                        code: (paramsList) => paramsList.code,
                                        redirect_uri: (paramsList) =>
                                            paramsList.redirectUri,
                                        grant_type: "authorization_code",
                                    },
                                    bodyEncodingFormat: "url",
                                },
                                response: {
                                    parseType: "json",
                                    toReturn: {
                                        "microsoft2-access-token": "all",
                                    },
                                    onError: (error, details) => {
                                        console.log(
                                            "Error occurred in microsoft2-access-token!",
                                            error,
                                            details
                                        );
                                    },
                                },
                            },
                        "https://graph.microsoft.com/v1.0/me": {
                            name: "microsoft2-profile",
                            request: {
                                method: "GET",
                                headers: {
                                    Authorization: (
                                        paramsList,
                                        requestParamsTillNow,
                                        previousFetchData
                                    ) =>
                                        "Bearer " +
                                        (
                                            previousFetchData["microsoft2-token"][
                                                "response"
                                            ] as objectType
                                        ).access_token,
                                },
                                timeout: 5000,
                                onError: (error, details) => {
                                    console.log(
                                        "Error occurred in microsoft2-profile!",
                                        error,
                                        details
                                    );
                                },
                            },
                            response: {
                                parseType: "json",
                                toReturn: {
                                    "microsoft2-profile": "all",
                                },
                                onError: (error, details) => {
                                    console.log(
                                        "Error occurred in microsoft2-profile!",
                                        error,
                                        details
                                    );
                                },
                            },
                        },
                    },
                },
            },
        }
    }
    ```

16. `Config Object` for x using the `customProviders` object:

    ```javascript
    const config = {
        serverUrl: "http://localhost:9000",
        customProviders: {
            x2: {
                mode: "ls",
                paramsList: {
                    clientId: import.meta.env.VITE_OAUTH_X_CLIENT_ID,
                    clientSecret: import.meta.env.VITE_OAUTH_X_CLIENT_SECRET,
                    redirectUri: import.meta.env.VITE_OAUTH_X_REDIRECT_URL,
                    scope: "email",
                    signatureEndPoint: "/generate-signature",
                    state: JSON.stringify({
                        auth: "x2",
                        userState: { customKey: "customValue" },
                    }),
                },
                serverEndPoint: "/auth",
                stepLogging: false,
                observability: {
                    onRequestStart: () => {
                        console.log("Request started!");
                    },
                    onError: (error, details) => {
                        console.log("Error occurred!", error, details);
                    },
                    onRequestEnd: (currentFetchData) => {
                        console.log("Request ended!");
                        console.log(JSON.stringify(currentFetchData));
                    },
                    onRetry: (retryContext: retryContextType) => {
                        const {
                            attemptNumber,
                            error,
                            totalElapsedTime,
                            lastAttemptTimeStamp,
                            retryDelay,
                            maxRetries,
                            previousFetchData,
                        } = retryContext;
                        console.log("retried!");
                        console.log("attemptNumber: " + attemptNumber);
                        console.log("error: " + error);
                        console.log("totalElapsedTime: " + totalElapsedTime);
                        console.log(
                            "lastAttemptTimeStamp: " + lastAttemptTimeStamp
                        );
                        console.log("retryDelay: " + retryDelay);
                        console.log("maxRetries: " + maxRetries);
                        console.log(
                            "previousFetchData: " +
                                JSON.stringify(previousFetchData)
                        );
                    },
                },
                urls: {
                    beforeRedirect: {
                        "https://api.twitter.com/oauth/request_token": {
                            name: "x-request-token",
                            proxy: "http://localhost:9000/proxy",
                            request: {
                                method: "GET",
                                percentEncode: true,
                                urlParams: {
                                    oauth_consumer_key: (paramsList) =>
                                        paramsList.clientId,
                                    oauth_nonce: {
                                        this: ["getNonce"],
                                        generate: (paramsList, functions) => {
                                            console.log("functions", functions);
                                            const getNonce = functions.getNonce;
                                            return getNonce();
                                        },
                                    },
                                    oauth_signature_method: "HMAC-SHA1",
                                    oauth_timestamp: {
                                        this: ["getTimeStamp"],
                                        generate: (paramsList, functions) => {
                                            const getTimeStamp =
                                                functions.getTimeStamp;
                                            return getTimeStamp();
                                        },
                                    },
                                    oauth_version: "1.0",
                                    oauth_callback: (paramsList) =>
                                        paramsList.redirectUri,
                                    oauth_signature: {
                                        this: ["getSignature"],
                                        generate: async (
                                            paramsList,
                                            functions,
                                            requestParamsTillNow
                                        ) => {
                                            const getSignature =
                                                functions.getSignature;
                                            const signature = await getSignature(
                                                "http://localhost:9000/helper",
                                                "https://api.twitter.com/oauth/request_token",
                                                "GET",
                                                requestParamsTillNow,
                                                "",
                                                paramsList.clientSecret,
                                                undefined,
                                                false
                                            );
                                            console.log("signature: " + signature);
                                            return signature;
                                        },
                                    },
                                },
                                timeout: 5000,
                                onError: (error, details) => {
                                    console.log(
                                        "Error occurred in x2-redirect-url!",
                                        error,
                                        details
                                    );
                                },
                            },
                            response: {
                                parseType: "text",
                                toReturn: {
                                    "x-request-token": "all",
                                },
                                onError: (error, details) => {
                                    console.log(
                                        "Error occurred in x-request-token!",
                                        error,
                                        details
                                    );
                                },
                            },
                        },
                        "https://api.twitter.com/oauth/authenticate": {
                            name: "x-auth-url",
                            // test: true,
                            request: {
                                method: "GET",
                                urlParams: {
                                    oauth_token: (
                                        paramsList,
                                        requestParamsTillNow,
                                        previousFetchData
                                    ) => {
                                        console.log("getting the oauth_token!");
                                        console.log(
                                            JSON.stringify(previousFetchData)
                                        );
                                        const oauthToken = previousFetchData[
                                            "x-request-token"
                                        ]["response"]
                                            .split("&")[0]
                                            .split("=")[1];
                                        console.log("oauthToken", oauthToken);
                                        return oauthToken;
                                    },
                                },
                                timeout: 5000,
                                onError: (error, details) => {
                                    console.log(
                                        "Error occurred in x2-auth-url!",
                                        error,
                                        details
                                    );
                                },
                            },
                            response: {
                                parseType: "json",
                                toReturn: {
                                    "x2-auth-url": "all",
                                },
                                onError: (error, details) => {
                                    console.log(
                                        "Error occurred in x2-auth-url!",
                                        error,
                                        details
                                    );
                                },
                            },
                        },
                    },
                    afterRedirect: {
                        "https://api.twitter.com/oauth/access_token": {
                            name: "x2-access-token",
                            request: {
                                method: "POST",
                                percentEncode: true,
                                urlParams: {
                                    oauth_consumer_key: (paramsList) =>
                                        paramsList.clientId,
                                    oauth_nonce: {
                                        this: ["getNonce"],
                                        generate: (paramsList, functions) => {
                                            const getNonce = functions.getNonce;
                                            return getNonce();
                                        },
                                    },
                                    oauth_signature_method: "HMAC-SHA1",
                                    oauth_timestamp: {
                                        this: ["getTimestamp"],
                                        generate: (paramsList, functions) => {
                                            const getTimeStamp =
                                                functions.getTimestamp;
                                            return getTimeStamp();
                                        },
                                    },
                                    oauth_version: "1.0",
                                    oauth_callback: (paramsList) =>
                                        paramsList.redirectUri +
                                        "?state=" +
                                        paramsList.state,
                                    oauth_token: (paramsList) =>
                                        paramsList.oauth_token,
                                    oauth_verifier: (paramsList) =>
                                        paramsList.oauth_verifier,
                                    oauth_signature: {
                                        this: ["getSignature"],
                                        generate: async (
                                            paramsList,
                                            functions,
                                            requestParamsTillNow
                                        ) => {
                                            const getSignature =
                                                functions.getSignature;
                                            const signature = await getSignature(
                                                "http://localhost:9000/helper",
                                                "https://api.twitter.com/oauth/request_token",
                                                "GET",
                                                requestParamsTillNow,
                                                "",
                                                paramsList.clientSecret,
                                                undefined,
                                                false
                                            );
                                            console.log("signature: " + signature);
                                            return signature;
                                        },
                                    },
                                },
                                timeout: 5000,
                                onError: (error, details) => {
                                    console.log(
                                        "Error occurred in x2-access-token!",
                                        error,
                                        details
                                    );
                                },
                            },
                            response: {
                                parseType: "text",
                                toReturn: {
                                    "x2-access-token": "all",
                                },
                                onError: (error, details) => {
                                    console.log(
                                        "Error occurred in x2-access-token!",
                                        error,
                                        details
                                    );
                                },
                            },
                        },
                        "https://api.twitter.com/1.1/account/verify_credentials.json":
                            {
                                name: "x2-user-info",
                                request: {
                                    method: "GET",
                                    percentEncode: true,
                                    urlParams: {
                                        include_email: "true",
                                        oauth_consumer_key: (paramsList) =>
                                            paramsList.clientId,
                                        oauth_nonce: {
                                            this: ["getNonce"],
                                            generate: (paramsList, functions) => {
                                                console.log("functions", functions);
                                                const getNonce = functions.getNonce;
                                                return getNonce();
                                            },
                                        },
                                        oauth_signature_method: "HMAC-SHA1",
                                        oauth_timestamp: {
                                            this: ["getTimestamp"],
                                            generate: (paramsList, functions) => {
                                                const getTimeStamp =
                                                    functions.getTimestamp;
                                                return getTimeStamp();
                                            },
                                        },
                                        oauth_version: "1.0",
                                        oauth_callback: (paramsList) =>
                                            paramsList.redirectUri,
                                        oauth_token: (
                                            paramsList,
                                            requestParamsTillNow,
                                            previousFetchData
                                        ) =>
                                            previousFetchData["x2-access-token"][
                                                "response"
                                            ]
                                                .split("&")[0]
                                                .split("=")[1],
                                        oauth_signature: {
                                            this: ["getSignature"],
                                            generate: async (
                                                paramsList,
                                                functions,
                                                requestParamsTillNow
                                            ) => {
                                                const getSignature =
                                                    functions.getSignature;
                                                const signature =
                                                    await getSignature(
                                                        "http://localhost:9000/helper",
                                                        "https://api.twitter.com/oauth/request_token",
                                                        "GET",
                                                        requestParamsTillNow,
                                                        "",
                                                        paramsList.clientSecret,
                                                        undefined,
                                                        false
                                                    );
                                                console.log(
                                                    "signature: " + signature
                                                );
                                                return signature;
                                            },
                                        },
                                    },
                                    timeout: 5000,
                                    onError: (error, details) => {
                                        console.log(
                                            "Error occurred in x2-access-token!",
                                            error,
                                            details
                                        );
                                    },
                                },
                                response: {
                                    parseType: "json",
                                    toReturn: {
                                        "x2-user-info": "all",
                                    },
                                    onError: (error, details) => {
                                        console.log(
                                            "Error occurred in x2-user-info!",
                                            error,
                                            details
                                        );
                                    },
                                },
                            },
                        },
                    },
                },
            }
        }
    }
    ```
