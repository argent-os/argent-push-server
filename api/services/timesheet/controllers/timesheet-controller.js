var Timesheet        = require('../models/timesheet');
var timesheetHelper  = require('../lib/timesheethelper');
var utils       = require('../lib/utils');
var mailer      = require('../lib/mailer');
var jwt         = require('jwt-simple');
var _           = require('lodash');
var fs          = require('fs');
var nconf       = require('nconf');
var moment      = require('moment');
var logger      = require('../lib/logger')();

var tokenSecret = process.env.JWT_SECRET;

function TimesheetController (req, res, next) {}

TimesheetController.prototype.createTimesheet = function (req, res, next) {
  var errors = req.validationErrors();
  if (errors) {
    res.status(400).json(errors);
    return false;
  }
  var data = req.body;
  timesheetHelper.checkIfTimesheetExists(null, data, function (result) {
    if (result === 'timesheet_uniq') {
      var timesheet = new Timesheet({
          projectId: data.projectId, 
          dateStart: data.dateStart, 
          secondsElapsed: data.secondsElapsed, 
          projectNotes: data.projectNotes,
          projectBillRate: data.projectBillRate,
          orgId: data.orgId
      });
      timesheet.save(function(err) {
        if (err) {

          logger.error('Error saving timesheet on register. Timesheet: ' + JSON.stringify(timesheet));
          return next(err);
        }
        res.json({token: generateToken(timesheet), timesheet: timesheet});
      });
    }
    else {
      res.status(409).json(result);
    }
  });
};

TimesheetController.prototype.deleteTimesheet = function (req, res, next) {
  var data = req.body;
  Timesheet.findOneAndRemove({_id:req.query._id}, function(err, timesheet) {
    if (err)
      res.send(err);
      res.json({ message: 'Timesheet removed from the list!' });
  });
};



TimesheetController.prototype.editTimesheet = function (req, res, next) {
  var data = req.body;
  var errors = req.validationErrors();
  if (errors) {
    res.status(400).json(errors);
    return false;
  }
  timesheetHelper.checkIfTimesheetExists(req.body, data, function (result) {
      Timesheet.findOneAndUpdate({_id: req.body._id}, data, function (err, timesheet) {
        if (!timesheet) {
          logger.info('Timesheet not found for account update. Timesheet id : ' + req.body._id);
          return;
        }
        else {
          var updated = [];
          if (timesheet.title !== data.title) {
            updated.push('title');
            timesheet.title = data.title;
          }
          if (timesheet.description !== data.description) {
            updated.push('description');
            timesheet.description = data.description;
          }
          if (updated.length > 0) {
            timesheet.date_modified = Date.now();
            var out = {
              title: timesheet.username,
              description: timesheet.description
            };
          }
          else {
            res.json({msg: 'Data not modified'});
            return;
          }

          timesheet.update(function(err) {
            if (err) {
              logger.error('Error updating timesheet account. Timesheet id: ' + req.body._id + ' Err: ' + err);
              res.status(401).json({msg: 'update_error'});
            } 
            else {
              res.json({token: generateToken(timesheet)});
            }
          });
        }
      });
  });
};

TimesheetController.prototype.getAllTimesheets = function (req, res, next) {
  var data = req;
  var errors = req.validationErrors();
  if (errors) {
    res.status(400).json(errors);
    return false;
  }

  Timesheet.find(function (err, timesheet) {
      if (!timesheet) {
        logger.info('Timesheets not found: ' + timesheet);
        return;
      }
      else {
          // return timesheets
          res.json(timesheet);
          return;
      }
    });
};

TimesheetController.prototype.getOneTimesheet = function (req, res, next) {
  var paramsID = req.params.id;
  var errors = req.validationErrors();
  if (errors) {
    res.status(400).json(errors);
    return false;
  }

  Timesheet.findOne({_id : paramsID}, function (err, timesheet) {
      if (!timesheet) {
        logger.info('Timesheets not found for ID: ' + paramsID);
        return;
      }
      else {
          // return timesheets
          res.json(timesheet);
          return;
      }
    });
};

TimesheetController.prototype.authorize = function (req, res, next) {
  var token = getToken(req);
  if (token) {
    try {
      var decoded = jwt.decode(token, tokenSecret);
      // Difference in seconds
      var diff = parseInt((Date.now() - decoded.iat) / 1000, 10);
      if (nconf.get('tokenExpire') < diff) {
        res.send(401, 'Access token has expired');
      }
      else {
        req.timesheet = decoded.timesheet;
        return next();
      }
    }
    catch (err) {
      return res.status(500).send('Error parsing token');
    }
  }
  else {
    return res.send(401);
  }
};

function getToken(req) {
  if (req.headers.authorization) {
    return req.headers.authorization.split(' ')[1];
  }
  else {
    return false;
  }
}

function generateToken(timesheet) {
  // Remove password property from timesheet object
  // _.omit doesn't work for mongoose object
  timesheet = _.pick(timesheet, '_id', 'title' ,'description');
  var payload = {
    timesheet: timesheet,
    iat: new Date().getTime(),
    exp: moment().add(7, 'days').valueOf()
  };
  return jwt.encode(payload, tokenSecret);
}

module.exports = new TimesheetController();
