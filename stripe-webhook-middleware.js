'use strict';

var util = require('util'),
  notify = require('./push-notification'),
  User = require('./api/endpoints/auth/models/user'),
  Notification = require('./api/endpoints/notification/models/notification'),
  log4js = require('log4js'),
  logger = log4js.getLogger(),
  request = require('superagent'),
  events = require('./stripe-events'),
  EventEmitter = require('events').EventEmitter;

function StripeWebhook (options, app) {
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
    // Handle test web hook testing from stripe
    // POST to
    // http://localhost:5004/webhook/stripe
    // Using body as json
    // {
    //   "object": "event",
    //   "id": "evt_00000000000000"
    // }
    if (req.body.id === 'evt_00000000000000'){
      self.emit('testWebhook', req.body);
      logger.trace('in test event')
      // Change this token for testing purposes
      User.findOne({"_id": "571a6865d94bd6ba0a734a9c"}, function(err, user) {
        if(!user) {
          logger.info('no user')
        } else {    
          logger.info("user username is ", user.username)
          logger.info('sending push notification to api')
          request
            .post('http://192.168.1.232:5001/v1/notification')
            .send({ user_id: "testuser",
                date: Date.now(),
                text: req.body.id })
            .set('Accept', 'application/json')
            .end(function(err, res){
              if(err) {
                logger.error(err)
              }
              // logger.info(res)
              // Calling the end function will send the request
          });           
        }
      });
      notify.sendPushNotification("test.event", "deb30372ae73fdd21e21ab2f2a9c6431badc22bb124e908ba82b0ec1dd267dc3");
      return res.status(200).end();
    }

    logger.trace("tracing")

    self.stripe.events.retrieve(req.body.id, function(err, event){

      logger.trace("retrived event id")
      logger.trace(event)
      logger.info("showing options")

      if(err) {
        // logger.error(err);
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
        // logger.info("request body", req.body)
        logger.info("req user id:", req.body.user_id)
        var id = req.body.user_id
        User.findOne({'stripe.accountId': id}, function(err, user) {
          if(err) {
            logger.error(err)
          }
          if (!user) {
           // logger.error('User not found resetToken: ' + token);
            logger.error('user not found');
            notify.sendPushNotification("user not found", "deb30372ae73fdd21e21ab2f2a9c6431badc22bb124e908ba82b0ec1dd267dc3");
            next();
            // res.status(404).end();
          } else {
            logger.trace("user found");

            var obj = JSON.parse(JSON.stringify(user));
            // logger.debug("user is", user)
            // logger.debug("parsed obj is", obj)

            if(user["ios"]) {
              logger.debug("1 ios info is ", user["ios"])
            }    
            if(user.ios) {
              logger.debug("2 ios info is ", user.ios)
            }      
            if(user["username"]) {
              logger.debug("3 username info is ", user["username"])
            }    
            if(user.username) {
              logger.debug("4 username info is ", user.username)
            }      
            if(obj["ios"]) {
              logger.debug("5 ios info is ", obj["ios"])
            }    
            if(obj.ios) {
              logger.debug("6 ios info is ", obj.ios)
            }      
            if(obj["username"]) {
              logger.debug("7 username info is ", obj["username"])
            }    
            if(obj.username) {
              logger.debug("8 username info is ", obj.username)
            }                              
            if(obj.ios) {
              logger.debug("user device token is", obj["ios"]["device_token"])
              var evt = req.body.type;
              notify.sendPushNotification(evt, obj["ios"]["device_token"]);            
            } else {
              notify.sendPushNotification("Could not find user!");
            }

            // Change endpoint to dynamic url based on environment
            request
              .post('http://proton-api-dev.us-east-1.elasticbeanstalk.com/v1/notification')
              .send({ user_id: user._id,
                  date: Date.now(),
                  text: req.body.type })
              .set('Accept', 'application/json')
              .end(function(err, res){
                if(err) {
                  logger.error(err)
                }
                logger.info("success");          
                next();            
                // Calling the end function will send the request
            });       

            // Debug on specific device
            var evt = req.body.type;
            notify.sendPushNotification("New event! " + evt + " for user " + user["username"], "deb30372ae73fdd21e21ab2f2a9c6431badc22bb124e908ba82b0ec1dd267dc3");
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