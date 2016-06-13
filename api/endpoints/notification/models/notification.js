var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var NotificationSchema = new mongoose.Schema({
  user_id: { type: String },
  date: { type: String },
  text: { type: String }
});

NotificationSchema.pre('remove', function(notification,next) {
    // 'this' is the client being removed. Provide callbacks here if you want
    // to be notified of the calls' result.
    NotificationSchema.remove({_id: notification._id}).exec();
    // console.log('%s has been removed', notification._id);
    next();
});

module.exports = mongoose.model('Notification', NotificationSchema);
