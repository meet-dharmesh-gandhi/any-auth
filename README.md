# any-auth

Library for adding different auth providers with ease in a website

The any-auth.config.js or any-auth.config.ts is to be created at the root of the project. it has the following structure:

---

providers: {
serverUrl: "https://my-awesome-website.com/login",
provider1: {
clientId,
clientSecret,
redirectUri,
scope,
serverEndPoint,
additionalState,
authUrl,
tokenUrl,
profileUrl,
profileFields,
additionalParams: {
auth: {
some_param: param_value
},
token: {
some_param: param_value
},
profile: {
some_param: param_value
}
}
},
...
}

# Configuration Details

---

serverUrl (Required):
The URL of the server that handles the authentication requests.

clientId (Required):
The client ID provided by the authentication provider during app registration.

clientSecret (Required):
The client secret provided by the authentication provider. Keep this secure.

redirectUri (Required):
The URI where the authentication provider will redirect after a successful login. This should match the URI configured in the provider's settings.

scope (Required):
A string of valid scopes for the provider, separated by spaces. For example: "email profile openid".

serverEndPoint (Required):
The endpoint in the server that handles this provider

additionalState (Optional):
A custom string (or serialized object) that will be included in the authentication redirect URL. Useful for passing additional data.

authUrl (Required):
The URL of the authentication provider's authorization endpoint.

tokenUrl (Required):
The URL of the authentication provider's token endpoint.

profileUrl (Required):
The URL of the endpoint to fetch the user's profile information.

additionalParams (Optional):
A dictionary of additional parameters to be passed to the authentication provider. It can have three types of parameters.

-   `auth`: Parameters to be passed to the auth endpoint (during redirect to the account selector).
-   `token`: Parameters to be passed to the token endpoint.
-   `profile`: Parameters to be passed to the profile endpoint.

Provider Key (providerName):
Each provider configuration is a key in the providers object. This key is used to call the corresponding authentication function.

---

# Example Configuration File:

const config = {
serverUrl: "https://my-awesome-website.com/login",
providers: {
google: {
clientId: 'YOUR_GOOGLE_CLIENT_ID',
clientSecret: 'YOUR_GOOGLE_CLIENT_SECRET',
redirectUri: 'http://localhost:3000/auth/callback',
scope: 'email profile openid',
serverEndPoint: "/google",
additionalState: JSON.stringify({ customKey: 'customValue' }),
authUrl: 'https://accounts.google.com/o/oauth2/auth',
tokenUrl: 'https://oauth2.googleapis.com/token',
profileUrl: 'https://www.googleapis.com/oauth2/v1/userinfo',
profileFields: ['email', 'name', 'picture'],
},
},
};

export default config;
