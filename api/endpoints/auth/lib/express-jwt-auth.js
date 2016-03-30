var expressValidator = require('express-validator');
var mongoose         = require('mongoose');
var cors             = require('cors');
var path             = require('path');
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
  // Including userController after options setting is done
  var userController = require('../controllers/user-controller');

  if (options.corsDomains) {
    var whitelist = options.corsDomains;
    corsOptions = {
      origin: function(origin, callback){
        var originIsWhitelisted = whitelist.indexOf(origin) !== -1;
        callback(null, originIsWhitelisted);
      }
    };
  }
  if (!options.mongoconnection) {
    throw Error('You must specify db connection details!');
  }

// *****************************************************************************
// ************************** SERVER STARTUP ***********************************
// *****************************************************************************

  mongoose.connect(options.mongoconnection);
  mongoose.connection.on('error', function () {
    console.log('Cannot connect to MongoDB');
  });

  var urlStrings = {
    oAuthTC:        '/auth/timekloud',
    register:       '/v1/register',
    login:          '/v1/login',
    remindpassword: '/v1/remindpassword',
    resetpassword:  '/v1/resetpassword',
    authorize:      '/v1/authorize',
    keepalive:      '/v1/keepalive',
    profile:        '/v1/profile',
    apikey:         '/v1/apikey',
    removeaccount:  '/v1/removeaccount',
    billing:        '/v1/billing',
    plan:           '/v1/plan',        
    customers:      '/v1/customers'      
  };

  if (options.urlStrings) {
    extend(urlStrings, options.urlStrings);
  }
  nconf.set('urlStrings', urlStrings);

  app.use(cors());
  app.use(bodyParser.json());
  app.use(expressValidator());

  /*
   |--------------------------------------------------------------------------
   | Login with TimeKloud
   |--------------------------------------------------------------------------
   */
  app.post(urlStrings.oAuthTC, userController.loginTimekloud);

  // User routes
  app.post(urlStrings.register,       userController.register);
  app.post(urlStrings.login,          userController.login);
  app.post(urlStrings.remindpassword, userController.remindPassword);
  app.post(urlStrings.resetpassword,  userController.resetPassword);
  app.post(urlStrings.authorize,      userController.authorize, function (req, res) {res.send('');});
  app.post(urlStrings.keepalive,      userController.keepAlive);
  app.get(urlStrings.apikey,          userController.authorize, userController.generateApiKey);
  app.put(urlStrings.profile,         userController.authorize, userController.editProfile);
  app.post(urlStrings.removeaccount,  userController.authorize, userController.removeAccount);
  app.get(urlStrings.profile,         userController.authorize, userController.getProfile);
  app.post(urlStrings.billing,        userController.authorize, userController.postBilling);
  app.post(urlStrings.plan,           userController.authorize, userController.postPlan);

  // See full code example here: https://gist.github.com/7109113

  /*
   |--------------------------------------------------------------------------
   | Stripe oAuth
   |--------------------------------------------------------------------------
   */  
  var TOKEN_URI = 'https://connect.stripe.com/oauth/token';
  var AUTHORIZE_URI = 'https://connect.stripe.com/oauth/authorize';
  // var CLIENT_ID = process.env.STRIPE_CLIENT_ID;
  // var API_KEY = process.env.STRIPE_KEY;
  var qs = require('querystring');
  var request = require('request');

  process.env.ENVIRONMENT == 'DEV' || process.env.ENVIRONMENT == undefined ? CLIENT_ID = process.env.STRIPE_TEST_CLIENT_ID : '';
  process.env.ENVIRONMENT == 'PROD' ? CLIENT_ID = process.env.STRIPE_CLIENT_ID : '';

  process.env.ENVIRONMENT == 'DEV' || process.env.ENVIRONMENT == undefined ? stripeApiKey = process.env.STRIPE_TEST_KEY : '';
  process.env.ENVIRONMENT == 'DEV' || process.env.ENVIRONMENT == undefined ? stripePublishableKey = process.env.STRIPE_TEST_PUB_KEY : '';
  process.env.ENVIRONMENT == 'PROD' ? stripeApiKey = process.env.STRIPE_KEY : '';
  process.env.ENVIRONMENT == 'PROD' ? stripePublishableKey = process.env.STRIPE_PUB_KEY : '';

  app.get('/oauth/callback', userController.authorize, function(req, res) {
    var code = req.query.code;
    // console.log('received code', code);
    // Make /oauth/token endpoint POST request
    request.post({
      url: TOKEN_URI,
      form: {
        grant_type: 'authorization_code',
        client_id: CLIENT_ID,
        code: code,
        client_secret: stripeApiKey
      }
    }, function(err, r, body) {
      
      var accessToken = JSON.parse(body).access_token;
      // console.log(body);
      // Do something with your accessToken

      res.send({ 'stripeToken': accessToken, 'stripeData':body });
      
    });
  });

  var plaid = require('plaid');
  var PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID;
  var PLAID_SECRET = process.env.PLAID_SECRET;
  // BE SURE TO CHANGE plaid.environments.tartan to PROD WHEN GOING LIVE
  var plaidClient = new plaid.Client(PLAID_CLIENT_ID, PLAID_SECRET, plaid.environments.tartan);

  // AJAX endpoint that first exchanges a public_token from the Plaid Link
  // module for a Plaid access token and then uses that access_token to
  // retrieve account data and balances for a user.
  //
  // Input: a public_token
  // Output: an error or an array of accounts
  app.get('/v1/plaid', function(req, res, next) {
    var public_token = req.query.public_token;
    var account_id = req.query.account_id;

    plaidClient.exchangeToken(public_token, function(err, tokenResponse) {
      if (err != null) {
        res.json({error: 'Unable to exchange public_token'});
      } else {
        // The exchange was successful - this access_token can now be used to
        // safely pull account and routing numbers or transaction data for the
        // user from the Plaid API using your private client_id and secret.
        var access_token = tokenResponse.access_token;

        plaidClient.getAuthUser(access_token, function(err, authResponse) {
          if (err != null) {
            res.json({error: 'Unable to pull accounts from the Plaid API'});
          } else {
            // Return a JSON body containing the user's accounts, which
            // includes names, balances, and account and routing numbers.
            res.json({accounts: authResponse.accounts});
          }
        });
      }
    });
  });

  return userController.authorize;
};
