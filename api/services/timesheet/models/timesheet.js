var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var mongoose = require('mongoose');

var TimesheetSchema = new mongoose.Schema({
    projectId: { type: String }, 
    dateStart: { type: String }, 
    secondsElapsed: { type: String }, 
    projectNotes: { type: String },
    projectBillRate: { type: String },
    orgId: { type: String }
});

TimesheetSchema.pre('remove', function(timesheet,next) {
    // 'this' is the client being removed. Provide callbacks here if you want
    // to be notified of the calls' result.
    Timesheet.remove({_id: timesheet._id}).exec();
    // console.log('%s has been removed', timesheet._id);
    next();
});

module.exports = mongoose.model('Timesheet', TimesheetSchema);
