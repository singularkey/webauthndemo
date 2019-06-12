const express  = require('express');
const router   = express.Router();
const request = require('request-promise');
const config = require('./config');

//Database
let db = {};

/*
Relying Party Route to register user and proxy WebAuthn register/initiate request to Singular Key FIDO Service
 */
router.post('/register/initiate', async (req, res) => {
  console.log("*** Incoming Request ***")
  console.log(req.route.path)

  let name = req.body.name;
  if(!name || name === "") {
    return res.status(400).json({message:"Name field cannot be empty",statusCode:400})
  }

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
      const response = await singularKeyAPICall('/users',{name})
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

/*
Relying Party Route proxy WebAuthn auth/initiate request to Singular Key FIDO Service
 */
router.post('/auth/initiate', async (req, res) => {
  console.log("*** Incoming Request ***")
  console.log(req.route.path)

  let name = req.body.name;

  if (!db[name]) {
    return res.status(400).json({message:"User not found. Please register a user first.",statusCode:400})
  }

  //Create RP Session for User
  req.session.isLoggedIn = false;
  req.session.name = name;

  //Singular Key FIDO2 Authentication Initiate API call
  try {
    const response = await singularKeyAPICall(`/users/${db[name].skUserId}/credentials/fido2/auth/initiate`,{name})
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
  console.log("*** Incoming Request ***")
  console.log(req.route.path)

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

router.get('/logout', (req, res) => {
  console.log("*** Incoming Request ***")
  console.log(req.route.path)

  req.session.loggedIn = false;
  req.session.name = undefined;
  res.status(200).json({success:true});

})

/*
Singular Key API Call Helper Function
 */
const singularKeyAPICall = (uri,body) => {
  let options = {
    method: 'POST',
    uri:`${config.singularKeyUrl}${uri}`,
    headers: {
      'Content-type': "application/json",
      'X-SK-API-KEY': `${config.singularkeyApiKey}`
    }
  }
  if(body) {
    options.body = JSON.stringify(body)
  }
  return request(options)
}

module.exports = router;
