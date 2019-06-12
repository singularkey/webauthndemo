const express = require('express'),
  bodyParser = require('body-parser'),
  cookieSession = require('cookie-session'),
  cookieParser = require('cookie-parser'),
  path = require('path'),
  crypto = require('crypto'),
  config = require('./server/config.json'),
  routes = require('./server/index');

const app = express();

app.use(bodyParser.json());
app.use(cookieSession({name: 'session', keys: [crypto.randomBytes(32).toString('hex')]}))
app.use(cookieParser())

//Relying Party (RP) Web App
app.use(express.static(path.join(__dirname, 'webapp')));

//Relying Party (RP) Server API
app.use('/', routes)

const port = config.port || 3001;
app.listen(port);
console.log(`Service listening on port ${port}`);

module.exports = app;
