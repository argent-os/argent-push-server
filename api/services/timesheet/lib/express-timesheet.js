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
  // Including timesheetController after options setting is done
  var timesheetController = require('../controllers/timesheet-controller');

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
    timesheet:    '/v1/timesheet',
    onetimesheet: '/v1/timesheet/:id',    
  };

  if (options.urlStrings) {
    extend(urlStrings, options.urlStrings);
  }

  app.use(cors(corsOptions));
  app.use(bodyParser.json());
  app.use(expressValidator());

  var auth = timesheetController.authorize;
  var createTimesheet = timesheetController.createTimesheet;
  var getOneTimesheet = timesheetController.getOneTimesheet;
  var getAllTimesheets = timesheetController.getAllTimesheets;
  var editTimesheet = timesheetController.editTimesheet;
  var deleteTimesheet = timesheetController.deleteTimesheet;

  // Timesheet routes
  app.post(urlStrings.timesheet,   auth, createTimesheet);
  app.get(urlStrings.onetimesheet, auth, getOneTimesheet);
  app.get(urlStrings.timesheet,    auth, getAllTimesheets);
  app.put(urlStrings.timesheet,    auth, editTimesheet);
  app.delete(urlStrings.timesheet, auth, deleteTimesheet);
  app.post(urlStrings.timesheet,   auth, function (req, res) {res.send('');});

  return auth;
};
