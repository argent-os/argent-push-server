var Timesheet = require('../models/timesheet');
var async = require('async');

exports.checkIfTimesheetExists = function (timesheet, data, callback) {
  var timesheetQuery;
  // Timesheet found - edit timesheet
  if (timesheet) {
    var timesheetId = timesheet._id;
    timesheetQuery = Timesheet.findOne({title: data.title, _id: {$ne: timesheetId}});
  }
  else {
    timesheetQuery = Timesheet.findOne({title: data.title});
  }

  async.series(
    [],
    function(err, msgArray) {
      var check = handleErrors(msgArray);
      callback(check);
    }
  );
};

function handleErrors(result) {
  var errors = [];
  if (errors.length > 0) {
    return errors;
  }
  else {
    return 'timesheet_uniq';
  }
}
