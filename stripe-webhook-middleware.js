'use strict';

var util = require('util'),
  notify = require('./push-notification'),
  User = require('./api/services/auth/models/user'),
  EventEmitter = require('events').EventEmitter;

function StripeWebhook (options) {
  EventEmitter.call(this);

  var self = this,
  options = options || {},
  error;

  if (!options.stripeApiKey){
    this.emit('err', new Error('API Key Not Found'));
  }

  this.stripe = require('stripe')(options.stripeApiKey);

  this.middleware = function(req, res, next) {
    if(!req.body || req.body.object !== 'event' || !req.body.id) {
      error = new Error('Event data not included');
      error.status = 400;
      self.emit('err', error);
      next(error);
    }
    // handle web hook testing from stripe
    // used for testing
    if (req.body.id === 'evt_00000000000000'){
      self.emit('testWebhook', req.body);
      notify.sendPushNotification("test.event");
      return res.status(200).end();
    }

    self.stripe.events.retrieve(req.body.id, function(err, event){

      if(err) {
        if(err.type === 'StripeAuthenticationError') {
          err.status = 401;
        } else {
          err.status = 500;
        }
        self.emit('err', err);
        next(err);
      }

      if(!event){
        error = new Error('Stripe event not found');
        error.status = 400;
        self.emit('err', error);
        next(error);
      }

      self.emit('event', event);

      if(options.events && options.events[event.type]){
        options.events[event.type](event, res);
        User.findOne({'stripe.customerId': req.body.data.object.customer}, function(err, user) {
          if (!user) {
           // logger.error('User not found resetToken: ' + token);
            res.status(400).send('User not found');
          } else {
            logger.info(user);
            logger.info('Push notification sent! ' + user._id);
            // Debug on specific device
            notify.sendPushNotification(options.events[event.type], "1db1f83835ceb0458e78df6c88be98e4cb4c757ab6c960cf29b47101f2d92fce");
            notify.sendPushNotification(options.events[event.type], user.device_token_ios);
            res.json({msg: 'push_notfication_sent'});
            next();
          }
        });        
      } else if (options.respond) {
        req.stripeEvent = event;
        User.findOne({'stripe.customerId': req.body.data.object.customer}, function(err, user) {
          if (!user) {
           // logger.error('User not found resetToken: ' + token);
            res.status(400).send('User not found');
          } else {
            logger.info(user);
            logger.info('Push notification sent! ' + user._id);
            // Debug on specific device
            notify.sendPushNotification(event, "1db1f83835ceb0458e78df6c88be98e4cb4c757ab6c960cf29b47101f2d92fce");
            notify.sendPushNotification(event, user.device_token_ios);            
            res.json({msg: 'push_notfication_sent'});
            next();
          }
        });
      } else {
        res.status(200).end();
      }
    });
  };
}

util.inherits(StripeWebhook, EventEmitter);

module.exports = StripeWebhook;