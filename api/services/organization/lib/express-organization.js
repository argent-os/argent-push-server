var expressValidator = require('express-validator');
var mongoose    = require('mongoose');
var path        = require('path');
var cors        = require('cors');
var bodyParser  = require('body-parser');
var nconf       = require('nconf');
var extend      = require('util')._extend;

var configFile  = path.join(__dirname, '..', 'config.json');
var corsOptions = {};
var tokenSecret = process.env.JWT_SECRET;
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
  // Including organizationController after options setting is done
  var organizationController = require('../controllers/organization-controller');

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
    organization: '/v1/organization',
    oneorganization: '/v1/organization/:id',
  };

  if (options.urlStrings) {
    extend(urlStrings, options.urlStrings);
  }

  app.use(cors(corsOptions));
  app.use(bodyParser.json());
  app.use(expressValidator());

  var auth = organizationController.authorize;
  var createOrg = organizationController.createOrganization;
  var readOneOrg = organizationController.getOrganization;
  var readAllOrgs = organizationController.getAllOrganizations;
  var updateOrg = organizationController.editOrganization;
  var deleteOrg = organizationController.deleteOrganization;

  // Organization routes
  app.post(urlStrings.organization,   auth, createOrg);
  app.get(urlStrings.oneorganization, auth, readOneOrg);
  app.get(urlStrings.organization,    auth, readAllOrgs);
  app.put(urlStrings.organization,    auth, updateOrg);
  app.delete(urlStrings.organization, auth, deleteOrg);
  app.post(urlStrings.organization,   auth, function (req, res) {res.send('');});

  return auth;
};
