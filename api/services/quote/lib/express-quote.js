var expressValidator = require('express-validator');
var mongoose         = require('mongoose');
var path             = require('path');
var cors             = require('cors');
var bodyParser       = require('body-parser');
var nconf            = require('nconf');
var extend           = require('util')._extend;

var configFile       = path.join(__dirname, '..', 'config.json');
var corsOptions      = {};
var tokenSecret      = process.env.JWT_SECRET;

nconf.file({ file: configFile});

module.exports = function (app, options) {
  // Initialize module with custom settings
  if (!options) {
    throw Error('You have to provide options object!');
  }
  if (options.logFile)  {
    nconf.set('logFile', options.logFile);
  }
  if (tokenSecret) {
    nconf.set('tokenSecret', tokenSecret);
  }
  if (options.tokenExpire) {
    nconf.set('tokenExpire', options.tokenExpire);
  }
  if (options.mailer) {
    nconf.set('mailerSettings', options.mailer);
  }
  if (options.serviceUrl) {
    nconf.set('serviceUrl', options.serviceUrl);
  }
  if (options.serviceUrlSeparator) {
    nconf.set('serviceUrlSeparator', options.serviceUrlSeparator);
  }
  if (options.removeCallback && typeof options.removeCallback === 'function') {
    nconf.set('removeCallback', options.removeCallback);
  }
  // Including quoteController after options setting is done
  var quoteController = require('../controllers/quote-controller');

  if (options.corsDomains) {
    var whitelist = options.corsDomains;
    corsOptions = {
      origin: function(origin, callback){
        var originIsWhitelisted = whitelist.indexOf(origin) !== -1;
        callback(null, originIsWhitelisted);
      }
    };
  }

  var urlStrings = {
    quote:    '/v1/quote/',
    onequote: '/v1/quote/:id',    
  };

  if (options.urlStrings) {
    extend(urlStrings, options.urlStrings);
  }

  app.use(cors(corsOptions));
  app.use(bodyParser.json());
  app.use(expressValidator());

  var auth = quoteController.authorize;
  var createQuote = quoteController.createQuote;
  var getOneQuote = quoteController.getOneQuote;
  var getAllQuotes = quoteController.getAllQuotes;
  var editQuote = quoteController.editQuote;
  var deleteQuote = quoteController.deleteQuote;

  // Quote routes
  app.post(urlStrings.quote,   auth, createQuote);
  app.get(urlStrings.onequote, auth, getOneQuote);
  app.get(urlStrings.quote,    auth, getAllQuotes);
  app.put(urlStrings.quote,    auth, editQuote);
  app.delete(urlStrings.quote, auth, deleteQuote);
  app.post(urlStrings.quote,   auth, function (req, res) {res.send('');});

  return auth;
};
