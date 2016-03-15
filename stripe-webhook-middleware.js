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
      // Change this token for testing purposes
      notify.sendPushNotification("test.event", "1db1f83835ceb0458e78df6c88be98e4cb4c757ab6c960cf29b47101f2d92fce");
      return res.status(200).end();
    }

    logger.trace("tracing")

    self.stripe.events.retrieve(req.body.id, function(err, event){

      logger.trace("retrived event id")
      logger.trace(event)
      logger.info("showing options")

      if(err) {
        if(err.type === 'StripeAuthenticationError') {
          logger.error(err)
          err.status = 401;
          res.send(err.status)
        } else {
          logger.error(err)
          err.status = 500;
          res.send(err.status)
        }
        self.emit('err', err);
        logger.error(err);
        res.send(400)
        next(err);
      }

      if(!event){
        error = new Error('Stripe event not found');
        error.status = 400;
        logger.error(error)
        logger.error("event not found")
        self.emit('err', error);
        res.send(error.status)
        next(error);
      }

      self.emit('event', event);

      if(options.events && options.events[event.type]){
        options.events[event.type](event, res);
        logger.info("event", options.events[event.type])
        logger.info("user data", req.body.data.object.customer)
        logger.info("sending default notification")
        notify.sendPushNotification(options.events[event.type], "1db1f83835ceb0458e78df6c88be98e4cb4c757ab6c960cf29b47101f2d92fce");
        notify.sendPushNotification("Default Notify", "1db1f83835ceb0458e78df6c88be98e4cb4c757ab6c960cf29b47101f2d92fce");
        User.findOne({'stripe.customerId': req.body.data.object.customer}, function(err, user) {
          if (!user) {
            logger.error('user not found');
            // res.json({msg: "user not found"});
            notify.sendPushNotification("user not found", "1db1f83835ceb0458e78df6c88be98e4cb4c757ab6c960cf29b47101f2d92fce"); 
            res.send(404).end();                       
            // res.status(404).end();
          } else {
            logger.info(user);
            logger.info('Push notification sent! ' + user._id);
            // Debug on specific device
            notify.sendPushNotification(options.events[event.type], "1db1f83835ceb0458e78df6c88be98e4cb4c757ab6c960cf29b47101f2d92fce");
            notify.sendPushNotification(options.events[event.type], user.device_token_ios);
            res.send(200)            
            // res.json({msg: 'push_notfication_sent'});
            next();
          }
        });        
      } else if (options.respond) {
        req.stripeEvent = event;
        logger.info("event", options.events[event.type])
        logger.info("user data", req.body.data.object)
        logger.info("sending default notification")
        notify.sendPushNotification(options.events[event.type], "1db1f83835ceb0458e78df6c88be98e4cb4c757ab6c960cf29b47101f2d92fce");
        notify.sendPushNotification("default notify", "1db1f83835ceb0458e78df6c88be98e4cb4c757ab6c960cf29b47101f2d92fce");
        User.findOne({'stripe.customerId': req.body.user_id}, function(err, user) {
          if (!user) {
            logger.error('user not found');
            // res.json({msg: "user not found"});
            notify.sendPushNotification("user not found", "1db1f83835ceb0458e78df6c88be98e4cb4c757ab6c960cf29b47101f2d92fce"); 
            res.send(404).end();                       
            // res.status(404).end();
          } else {
            logger.info(user);
            logger.info('Push notification sent! ' + user._id);
            // Debug on specific device
            notify.sendPushNotification(event, "1db1f83835ceb0458e78df6c88be98e4cb4c757ab6c960cf29b47101f2d92fce");
            notify.sendPushNotification(event, user.device_token_ios);  
            res.send(200)             
            // res.json({msg: 'push_notfication_sent'});
            next();
          }
        });
      } else {
        logger.info("response ok, default push notify")
        logger.info(req.body)
        notify.sendPushNotification(event.type, "1db1f83835ceb0458e78df6c88be98e4cb4c757ab6c960cf29b47101f2d92fce");   
        User.findOne({'stripe.accountId': req.body.user_id}, function(err, user) {
          if (!user) {
           // logger.error('User not found resetToken: ' + token);
            logger.error('user not found in database, could not send targeted push notification');
            // res.json({msg: "user not found"});
            notify.sendPushNotification("user not found in database, could not send targeted push notification", "1db1f83835ceb0458e78df6c88be98e4cb4c757ab6c960cf29b47101f2d92fce");
            res.send(404).end();
            next();
            // res.status(404).end();
          } else {
            logger.trace("user found");
            logger.info(user);
            logger.info('Push notification sent to user id:' + user._id);
            // Debug on specific device
            notify.sendPushNotification(event.type, "1db1f83835ceb0458e78df6c88be98e4cb4c757ab6c960cf29b47101f2d92fce");
            notify.sendPushNotification(event.type, user.device_token_ios);            
            // res.json({msg: 'push_notfication_sent'});
            res.send(200);
            next();
          }
        });
        res.sendStatus(200).end();
      }
    });
  };
}

util.inherits(StripeWebhook, EventEmitter);

module.exports = StripeWebhook;