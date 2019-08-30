const express = require('express'),
  bodyParser = require('body-parser'),
  cookieSession = require('cookie-session'),
  cookieParser = require('cookie-parser'),
  path = require('path'),
  fs = require('fs'),
  crypto = require('crypto'),
  config = require('./server/config.json'),
  routes = require('./server/index');

let server;
const app = express();

if (config.https.enabled) {
  var options = {
    key: fs.readFileSync(config.https.keyFilePath),
    cert: fs.readFileSync(config.https.certFilePath),
    requestCert: false,
    rejectUnauthorized: false
  };
  server = require('https').createServer(options, app);
} else {
  server = require('http').Server(app);
}


app.use(bodyParser.json());
app.use(cookieSession({name: 'session', keys: [crypto.randomBytes(32).toString('hex')],secure: false }))
app.use(cookieParser())

//Relying Party (RP) Web App
app.use(express.static(path.join(__dirname, 'webapp')));

//Relying Party (RP) Server API
app.use('/', routes)

const port = config.port || 3001;
server.listen(port);
console.log(`Service listening on port ${port}`);

module.exports = app;
