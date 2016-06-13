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

  var urlStrings = {
    oauth:          '/v1/oauth',
    register:       '/v1/register',
    login:          '/v1/login',
    remind:         '/v1/remindpassword',
    reset:          '/v1/resetpassword',
    authorize:      '/v1/authorize',
    keepalive:      '/v1/keepalive',
    profile:        '/v1/profile',
    apikey:         '/v1/apikey',
    remove:         '/v1/removeaccount',
    billing:        '/v1/billing',
    plan:           '/v1/plan',        
    search:         '/v1/user/search',
    list:           '/v1/user/list'   
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
   | Login with OAuth
   |--------------------------------------------------------------------------
   */
  app.post(urlStrings.oauth, userController.loginOAuth);

  // User routes
  app.post(urlStrings.register,         userController.register);
  app.post(urlStrings.login,            userController.login);
  app.post(urlStrings.remind,           userController.remindPassword);
  app.post(urlStrings.reset,            userController.resetPassword);
  app.post(urlStrings.authorize,        userController.authorize, function (req, res) {res.send('');});
  app.post(urlStrings.keepalive,        userController.keepAlive);
  app.get(urlStrings.apikey,            userController.authorize, userController.generateApiKey);
  app.post(urlStrings.remove,           userController.authorize, userController.removeAccount);
  // TODO: Endpoint duplication removal
  app.put(urlStrings.profile + "/:uid", userController.authorize, userController.editProfile);
  app.put(urlStrings.profile,           userController.authorize, userController.editProfile);
  app.get(urlStrings.profile + "/:uid", userController.authorize, userController.getProfile);
  app.get(urlStrings.profile,           userController.authorize, userController.getProfile);
  app.post(urlStrings.billing,          userController.authorize, userController.postBilling);
  app.post(urlStrings.plan,             userController.authorize, userController.postPlan);
  app.post(urlStrings.search,           userController.searchUser);
  app.get(urlStrings.list,              userController.listAllUsers);

  // See full code example here: https://gist.github.com/7109113

  return userController.authorize;
};
