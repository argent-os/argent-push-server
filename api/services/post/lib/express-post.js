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
  // Including postController after options setting is done
  var postController = require('../controllers/post-controller');

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
    post:    '/v1/post',
    onepost: '/v1/post/:id',    
  };

  if (options.urlStrings) {
    extend(urlStrings, options.urlStrings);
  }

  app.use(cors(corsOptions));
  app.use(bodyParser.json());
  app.use(expressValidator());

  // Post routes
  app.post(urlStrings.post,   postController.authorize,    postController.createPost);
  app.get(urlStrings.post,    postController.authorize,    postController.getAllPosts);
  app.get(urlStrings.onepost, postController.authorize,    postController.getOnePost);
  app.put(urlStrings.post,    postController.authorize,    postController.editPost);
  app.delete(urlStrings.post, postController.authorize,    postController.deletePost);

  return postController.authorize;
};
