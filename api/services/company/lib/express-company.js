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
  // Including companyController after options setting is done
  var companyController = require('../controllers/company-controller');

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
    company: '/v1/company',
    onecompany: '/v1/company/:id'
  };  

  if (options.urlStrings) {
    extend(urlStrings, options.urlStrings);
  }

  app.use(cors(corsOptions));
  app.use(bodyParser.json());
  app.use(expressValidator());

  var auth = companyController.authorize;
  var createCompany = companyController.createCompany;
  var readOneCompany = companyController.getCompany;
  var readAllCompanies = companyController.getAllCompanies;
  var updateCompany = companyController.editCompany;
  var deleteCompany = companyController.deleteCompany;

  // Company routes
  app.post(urlStrings.company,   auth, createCompany);
  app.get(urlStrings.onecompany, auth, readOneCompany);
  app.get(urlStrings.company,    auth, readAllCompanies);
  app.put(urlStrings.company,    auth, updateCompany);
  app.delete(urlStrings.company, auth, deleteCompany);
  app.post(urlStrings.company,   auth, function (req, res) {res.send('');});

  return auth;
};
