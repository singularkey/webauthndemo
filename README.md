# Singular Key WebAuthn Demo

This project demonstrates WebAuthn functionality and uses Singular Key's FIDO Cloud Service API for registering and authenticating FIDO Credentials. The project contains a NodeJS `Relying Party (RP) Server API` Implementation and Javascript/Jquery `RP Web App` Implementation. This demonstration requires a Singular Key `Developer API Key`.

------------

### Install
```sh
git clone https://github.com/singularkey/webauthndemo/
```

### Configure
Edit `webauthndemo/server/config.json`
```Js
"singularkeyApiKey":"SINGULAR_KEY_API_KEY_HERE"
```
Please contact Support (`support@singularkey.com`) for an API Key or sign up at http://singularkey.com/singular-key-web-authn-fido-developer-program-api/

### Run
```js
cd webauthndemo
yarn install or npm install
node app
```
Browse to `http://localhost:3001` on a supported browser.

![Alt Text](https://singularkey.s3-us-west-2.amazonaws.com/webauthndemo.gif)

**Note:** You'll need to use a supported browser (Chrome,Firefox,Opera etc) on either a supported platform (Android 7+/Windows 10 - windows Hello) or use a security token (FIDO2, U2F etc). Safari Technology Preview supports FIDO2 tokens. Chrome Canary version supports MacOS's built in fingerprint sensor.

### Architecture
`RP Web App` --> `RP Server` API --> `Singular Key's FIDO Cloud Service`
To see a working demo of WebAuthn and for Registration/Authentication sequence diagrams, please visit https://webauthn.singularkey.com

### Key Files
* `app.js` - Listener for server + static route
* `server/index.js` - RP Server API Routes. This file implements the 4 routes that the RP Web App communicates with. The 4 routes act as a proxy for the RP Web App to communicate with Singular Key's FIDO Cloud Service API.
* `webapp/index.html` - Minimalistic RP Web App implementation that demonstrations the WebAuthn functionality. The Web App communicates with the 4 RP Server API's and invokes the browser's WebAuthn API (`navigator.credentials.create` and `navigator.credentials.get`)

### WebAuthn Registration Steps:

The following are the high level steps to register a Fido2 credential. For this example, lets assume you're on an Android 7+ device on a chrome browser.

- The Relying Party (RP) Web App will typically initiate the request to the Relying Party (RP) server for registering a new Fido2 credential

- The RP server will make an API call to create a user in the Singular key Cloud Platform. This needs to be done only once per user. You can then store the Singular Key `userId` in your database for future use.

	`POST https://devapi.singularkey.com/v1/users`

- Next, the RP server will make an API call to initiate the Fido2 registration process

	`POST https://devapi.singularkey.com/v1/users/<userId>/credentials/fido2/register/initiate`

- The RP Server will forward the response from the above API call to the RP Web App.

- The RP Web App will then invoke the browser's WebAuthn Registration API - `navigator.credentials.create` to create a Fido2 credential

- The browser communicates with the FIDO2 Authenticator (Android authenticator in this case)

- User walks through the Android’s WebAuthn/Biometrics Wizard which verifies the user, and creates a public/private key pair and an attestation response

- The RP Web App then sends the WebAuthn Register API response to the RP Server, which in-turn forwards it to Singular Key's 'WebAuthn Register Complete' API:

	`POST https://devapi.singularkey.com/v1/users/<userId>/credentials/fido2/register/complete`

- Singular Key Cloud Platform validates the attestation response and the newly created credential is successfully registered

#### Client Side Registration Code Snippet
```js
            //'Register Initiate' Relying Party (RP) Server API call which is proxied to Singular Key FIDO Service
            let initiateResponse = await apiCAll('/register/initiate',{name})

            //Re-format the above response to decode certain base64UrlEncoded fields
            let publicKey = preformatMakeCredReq(initiateResponse.initiateRegistrationResponse);

            //WebAuthn API Call to create a credential (Attestation)
            let makeCredResponse = await navigator.credentials.create({ publicKey })

            //Re-format the above response to base64Url encode certain fields for transmission
            let makeCredResponseFormatted = publicKeyCredentialToJSON(makeCredResponse);

            //'Register Complete' RP Server API call which is proxied to Singular Key FIDO Service
            let completeResponse = await apiCAll('/register/complete',makeCredResponseFormatted)
```

#### Server Side Registration Code Snippet
```js
/*
Relying Party Route to register user and proxy WebAuthn register/initiate request to Singular Key FIDO Service
 */
router.post('/register/initiate', async (req, res) => {
  let name = req.body.name;

  //Create RP Session for User
  req.session.isLoggedIn = false;
  req.session.name = name;

  //Create RP User
  if (!db[name]) {
    db[name] = {name}
  }

  //Create Shadow User in Singular Key
  let options;
  if (!db[name].skUserId) {
    try {
      const response = await singularKeyAPICall('/users',{username:name})
      const parsedResponse = JSON.parse(response)
      db[name].skUserId = parsedResponse.userId;
    }
    catch(err) {
      return res.status(400).json(err)
    }
  }

  //Singular Key FIDO2 Register Initiate API call
  try {
    const response = await singularKeyAPICall(`/users/${db[name].skUserId}/credentials/fido2/register/initiate`)
    const parsedResponse = JSON.parse(response)
    res.status(200).json(parsedResponse);
  }
  catch(err) {
    res.status(400).json(err)
  }
})


/*
Relying Party Route proxy WebAuthn register/complete request to Singular Key FIDO Service
 */
router.post('/register/complete', async (req, res) => {
  console.log("*** Incoming Request ***")
  console.log(req.route.path)
  let name = req.session.name;

  if (!db[name]) {
    return res.status(400).json({message:"User not found",statusCode:400})
  }

  //Singular Key FIDO2 Register Complete API call
  try {
    const response = await singularKeyAPICall(`/users/${db[name].skUserId}/credentials/fido2/register/complete`,req.body)
    const parsedResponse = JSON.parse(response)
    res.status(200).json(parsedResponse);
  }
  catch(err) {
    res.status(400).json(err)
  }
})
```

------------

### WebAuthn Authentication Steps:

- As part of the login process, the RP server will make a Singular Key API call to initiate Fido2 authentication

	`POST https://devapi.singularkey.com/v1/users/<userId>/credentials/fido2/auth/initiate`

	**Note: use the Singular Key `userId` stored in your database record for that user.**

- The RP Server will forward the response from the above API call to the RP Web App.

- The RP Web App will then invoke the browser's WebAuthn Authentication API `navigator.credentials.get`

- The browser communicates with the FIDO2 Authenticator (Android authenticator in this case)

- User walks through the Android’s WebAuthn/Biometrics Wizard which verifies the user, and creates and signs an assertion response with the user's private key

- The RP Web App then sends the WebAuthn Register API response to the RP Server, which in-turn forwards it to Singular Key's 'WebAuthn Authentication Complete' API:

	`POST https://devapi.singularkey.com/v1/users/blake1/credentials/fido2/auth/complete`

- Singular Key Cloud Platform verifies the signature of the assertion response, thus authenticating the user

- If verification is successful, the RP server will create a user session logging the user into the app

#### Client Side Authentication Code Snippet
```js
          //'Authentication Initiate' RP Server API call which is proxied to Singular Key FIDO Service
          let initiateResponse = await apiCAll('/auth/initiate',{name})

          //Re-format the above response to decode certain base64UrlEncoded fields
          let publicKey = preformatGetAssertReq(initiateResponse);

          //WebAuthn API Call to create an assertion
          let getCredResponse = await navigator.credentials.get({ publicKey })

          //Re-format the above response to base64Url encode certain fields for transmission
          let getCredResponseFormatted = publicKeyCredentialToJSON(getCredResponse);

          //'Authentication Complete' RP Server API call which is proxied to Singular Key FIDO Service
          let completeResponse = await apiCAll('/auth/complete',getCredResponseFormatted)

          if(completeResponse.success){
            //Now that login is successful, load the dashboard
            loadScreen('dashboard')
          }
```
#### Server Side Authentication Code Snippet
```js

/*
Relying Party Route proxy WebAuthn auth/initiate request to Singular Key FIDO Service
 */
router.post('/auth/initiate', async (req, res) => {
  let name = req.body.name;

  if (!db[name]) {
    return res.status(400).json({message:"User not found. Please register a user first.",statusCode:400})
  }

  //Create RP Session for User
  req.session.isLoggedIn = false;
  req.session.name = name;

  //Singular Key FIDO2 Authentication Initiate API call
  try {
    const response = await singularKeyAPICall(`/users/${db[name].skUserId}/credentials/fido2/auth/initiate`)
    const parsedResponse = JSON.parse(response)
    res.status(200).json(parsedResponse);
  }
  catch(err) {
    res.status(400).json(err)
  }
})

/*
Relying Party Route proxy WebAuthn auth/complete request to Singular Key FIDO Service
 */
router.post('/auth/complete', async (req, res) => {
  let name = req.session.name;

  if (!db[name]) {
    return res.status(400).json({message:"User not found. Please register a user first.",statusCode:400})
  }

  //Singular Key FIDO2 Authentication Complete API call
  try {
    const response = await singularKeyAPICall(`/users/${db[name].skUserId}/credentials/fido2/auth/complete`,req.body)
    const parsedResponse = JSON.parse(response)
    if (parsedResponse.success) {
      req.session.isLoggedIn = true
    }
    res.status(200).json(parsedResponse);
  }
  catch(err) {
    res.status(400).json(err)
  }
})
```
------------
# Support
Have questions? Please contact Support (`support@singularkey.com`) or sign up at http://singularkey.com/singular-key-web-authn-fido-developer-program-api/

# License
MIT