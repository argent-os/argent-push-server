'use strict';

var util = require('util'),
  notify = require('./push-notification'),
  User = require('./api/services/auth/models/user'),
  log4js = require('log4js'),
  logger = log4js.getLogger(),
  events = require('./stripe-events'),
  EventEmitter = require('events').EventEmitter;

function StripeWebhook (options) {
  EventEmitter.call(this);

  logger.trace("in webhook")

  var self = this,
  options = options || {},
  error;

  if (!options.stripeApiKey){
    this.emit('err', new Error('API Key Not Found'));
    logger.error("API Key not found")
  }

  this.stripe = require('stripe')(options.stripeApiKey);

  this.middleware = function(req, res, next) {
    if(!req.body || req.body.object !== 'event' || !req.body.id) {
      error = new Error('Event data not included');
      error.status = 400;
      logger.error(error);
      self.emit('err', error);
      next(error);
    }
    // handle web hook testing from stripe
    // used for testing
    if (req.body.id === 'evt_00000000000000'){
      self.emit('testWebhook', req.body);
      logger.trace('in test event')
      // Change this token for testing purposes
      User.findOne({"_id": "56e9849a6d3a65187f8d72e0"}, function(err, user) {
        if(!user) {
          console.log('no user')
        } else {
          console.log("success");
          // var obj = JSON.parse(JSON.stringify(user));
          // var device_token = obj.device_token_ios;
          // console.log(device_token);
        }
      });
      notify.sendPushNotification("test.event", "66ce9f4562d88b3027cc63fcd3ced25188e649aea43b29f7d036f523abdb9ea7");
      return res.status(200).end();
    }

    logger.trace("tracing")

    self.stripe.events.retrieve(req.body.id, function(err, event){

      logger.trace("retrived event id")
      logger.trace(event)
      logger.info("showing options")

      if(err) {
        logger.error(err);
        next(err);
        // if(err.type === 'StripeAuthenticationError') {
        //   logger.error(err)
        //   err.status = 401;
        // } else {
        //   logger.error(err)
        //   err.status = 500;
        // }
        // self.emit('err', err);
        // logger.error(err);
        // next(err);
      }

      // if(!event){
      //   error = new Error('Stripe event not found');
      //   error.status = 400;
      //   logger.error(error)
      //   logger.error("event not found")
      //   self.emit('err', error);
      //   next(error);
      // }

        self.emit('event', event);

        logger.info("response ok, default push notify")
        logger.info("request body", req.body)
        logger.info("req user id:", req.body.user_id)
        User.findOne({'stripe.accountId': req.body.user_id}, function(err, user) {
          if (!user) {
           // logger.error('User not found resetToken: ' + token);
            logger.error('user not found');
            notify.sendPushNotification("user not found", "66ce9f4562d88b3027cc63fcd3ced25188e649aea43b29f7d036f523abdb9ea7");
            next();
            // res.status(404).end();
          } else {
            logger.trace("user found");
            console.log(JSON.stringify(user, null, 2));
            logger.info('push notification sent to user id:', user._id);

            var obj = JSON.parse(JSON.stringify(user));
            var device_token = obj.device_token_ios;
            console.log("device token is");
            console.log(device_token);

            // Debug on specific device
            var evt = req.body.type;
            notify.sendPushNotification("user activity " + evt + " for user " + user["_id"], "66ce9f4562d88b3027cc63fcd3ced25188e649aea43b29f7d036f523abdb9ea7");
            notify.sendPushNotification(evt, device_token);            
            // res.json({msg: 'push_notfication_sent'});
            next();
          }
        });
        return res.send(200).end();
    });
  };
}

util.inherits(StripeWebhook, EventEmitter);

module.exports = StripeWebhook;