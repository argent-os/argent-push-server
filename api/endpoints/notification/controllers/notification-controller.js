var Notification        = require('../models/notification');
var utils       = require('../lib/utils');
var mailer      = require('../lib/mailer');
var jwt         = require('jwt-simple');
var _           = require('lodash');
var fs          = require('fs');
var nconf       = require('nconf');
var moment      = require('moment');
var logger      = require('../lib/logger')();

var tokenSecret = process.env.JWT_SECRET;

function NotificationController (req, res, next) {}

NotificationController.prototype.createNotification = function (req, res, next) {
    logger.info('inside create')
    logger.info(req.body)
    var notification = new Notification({
        user_id: req.body.user_id,
        date: req.body.date,
        text: req.body.text
    });
    notification.save(function (err, response) {
      if(err) {
        console.log(err);
      }
      console.log(response);
      res.send({ token: generateToken(notification), notification: notification });
    });
};

NotificationController.prototype.deleteNotification = function (req, res, next) {
  var data = req.body;
  Notification.findOneAndRemove({_id:req.query._id}, function(err, notification) {
    if (err) {
      res.send(err);
      // console.log(err);
    }
    // console.log('removed notification', notification);
      res.json({ message: 'Notification removed from the list!' });
  });
};

NotificationController.prototype.getNotification = function (req, res, next) {
  var errors = req.validationErrors();
  if (errors) {
    res.status(400).json(errors);
    return false;
  }
  Notification.findById(req.params.id, function (err, notification) {
      if (!notification || notification == null) {
        res.status(400).json({msg: 'Notification not found', state: 'not_found'});        
        return;
      }
      else if (err) {
        // console.log(err);
      }
      else {
        res.json(notification);
        return;
      }
    });
};

NotificationController.prototype.getAllNotifications = function (req, res, next) {
  var data = req;
  var errors = req.validationErrors();
  if (errors) {
    res.status(400).json(errors);
    return false;
  }

  Notification.find(function (err, notification) {
      if (!notification) {
        //logger.info('Notification not found: ' + notification);
        return;
      }
      else {
          // return notifications
          res.json(notification);
          return;
      }
    });
};

NotificationController.prototype.authorize = function (req, res, next) {
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
        req.notification = decoded.notification;
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

function generateToken(notification) {
  // Remove password property from notification object
  // _.omit doesn't work for mongoose object
  notification = _.pick(notification, '_id', 'name');
  var payload = {
    notification: notification,
    iat: new Date().getTime(),
    exp: moment().add(7, 'days').valueOf()
  };
  return jwt.encode(payload, tokenSecret);
}

module.exports = new NotificationController();
