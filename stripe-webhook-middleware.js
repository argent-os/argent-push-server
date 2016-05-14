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
    // POST to http://localhost:5004/webhook/stripe
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
          });           
        }
      });
      notify.sendPushNotification("test.event", "1f99c0705eb53fcccf1412a27abf4dc70125a826727a19326b7e2f11d7012edd");
      return res.status(200).end();
    }

    logger.trace("tracing")

    self.stripe.events.retrieve(req.body.id, function(err, event){

        self.emit('event', event);

        var id = req.body.user_id
        User.findOne({'stripe.accountId': id}, function(err, user) {
          if(err) {
            logger.error(err)
          }
          if (!user) {
            logger.error('user not found');
            next();
          } else {
            var obj = JSON.parse(JSON.stringify(user));
                       
            if(obj.ios) {
              logger.debug("user device token is", obj["ios"]["device_token"])
              var evt = req.body.type; 
              var device_token = obj["ios"]["device_token"];             
              switch(evt) {
                case "invoice.created":
                   notify.sendPushNotification("Invoice created", device_token);            
                case "account.updated":
                   notify.sendPushNotification("Account updated", device_token);            
                case "account.application.deauthorized":
                   notify.sendPushNotification("Account application deauthorized", device_token); 
                case "account.external_account.created":
                   notify.sendPushNotification("External account created", device_token);            
                case "account.external_account.updated":
                   notify.sendPushNotification("External account updated", device_token);            
                case "account.external_account.deleted":
                   notify.sendPushNotification("External account deleted", device_token);            
                case "application_fee.created":
                   notify.sendPushNotification("Application fee created", device_token);            
                case "application_fee.refunded":
                   notify.sendPushNotification("Application fee refunded", device_token);            
                case "balance.available":
                   notify.sendPushNotification("Your balance is now available", device_token);            
                case "charge.succeeded":
                   notify.sendPushNotification("Charge succeeded", device_token);            
                case "charge.failed":
                   notify.sendPushNotification("Charge failed", device_token);            
                case "charge.refunded":
                   notify.sendPushNotification("Charge refunded", device_token);            
                case "charge.captured":
                   notify.sendPushNotification("Charge captured", device_token);            
                case "charge.updated":
                   notify.sendPushNotification("Charge updated", device_token);            
                case "charge.dispute.created":
                   notify.sendPushNotification("Charge dispute created", device_token);            
                case "charge.dispute.updated":
                   notify.sendPushNotification("Charge dispute updated", device_token);            
                case "charge.dispute.closed":
                   notify.sendPushNotification("Charge dispute closed", device_token);            
                case "customer.created":
                   notify.sendPushNotification("Customer created", device_token);            
                case "customer.updated":
                   notify.sendPushNotification("Customer updated", device_token);            
                case "customer.deleted":
                   notify.sendPushNotification("Customer deleted", device_token);            
                case "customer.card.created":
                   notify.sendPushNotification("Customer card created", device_token);            
                case "customer.card.updated":
                   notify.sendPushNotification("Customer card updated", device_token);            
                case "customer.card.deleted":
                   notify.sendPushNotification("Customer card deleted", device_token);            
                case "customer.subscription.created":
                   notify.sendPushNotification("Customer subscription created", device_token);            
                case "customer.subscription.updated":
                   notify.sendPushNotification("Customer subscription updated", device_token);            
                case "customer.subscription.deleted":
                   notify.sendPushNotification("Customer subscription deleted", device_token);            
                case "customer.subscription.trial_will_end":
                   notify.sendPushNotification("Customer subscription trial will end soon", device_token);            
                case "customer.discount.created":
                   notify.sendPushNotification("Customer discount created", device_token);            
                case "customer.discount.updated":
                   notify.sendPushNotification("Customer discount updated", device_token);            
                case "customer.discount.deleted":
                   notify.sendPushNotification("Customer discount deleted", device_token);            
                case "invoice.created":
                   notify.sendPushNotification("Invoice created", device_token);            
                case "invoice.updated":
                   notify.sendPushNotification("Invoice updated", device_token);            
                case "invoice.payment_succeeded":
                   notify.sendPushNotification("Invoice payment succeeded", device_token);            
                case "invoice.payment_failed ":
                   notify.sendPushNotification("Invoice payment failed", device_token);            
                case "invoiceitem.created":
                   notify.sendPushNotification("Invoice item created", device_token);            
                case "invoiceitem.updated":
                   notify.sendPushNotification("Invoice item updated", device_token);            
                case "invoiceitem.deleted":
                   notify.sendPushNotification("Invoice item deleted", device_token);            
                case "plan.created":
                   notify.sendPushNotification("Plan created", device_token);            
                case "plan.updated":
                   notify.sendPushNotification("Plan updated", device_token);            
                case" plan.deleted":
                   notify.sendPushNotification("Plan deleted", device_token);            
                case "coupon.created":
                   notify.sendPushNotification("Coupon created", device_token);            
                case "coupon.deleted":
                   notify.sendPushNotification("Coupon deleted", device_token);            
                case "recipient.created":
                   notify.sendPushNotification("Recipient created", device_token);            
                case "recipient.updated":
                   notify.sendPushNotification("Recipient updated", device_token);            
                case "recipient.deleted":
                   notify.sendPushNotification("Recipient deleted", device_token);            
                case "transfer.created":
                   notify.sendPushNotification("Transfer created", device_token);            
                case "transfer.updated":
                   notify.sendPushNotification("Transfer updated", device_token);            
                case "transfer.paid":
                   notify.sendPushNotification("Transfer paid", device_token);            
                case "transfer.failed":
                   notify.sendPushNotification("Transfer failed", device_token); 
                case "bitcoin.receiver.transaction.created":
                   notify.sendPushNotification("Bitcoin receiver transaction created", device_token); 
                case "bitcoin.receiver.created":
                   notify.sendPushNotification("Bitcoin receiver created", device_token); 
                case "bitcoin.receiver.filled":
                   notify.sendPushNotification("Bitcoin receiver filled", device_token); 
                default:
                   notify.sendPushNotification(evt, device_token);            
              }
            } else {
              //notify.sendPushNotification("Could not find user!");
              logger.error("Could not find user")
            }

            // Change push support/activity endpoint to dynamic url based on environment
            request
              .post('http://proton-api-dev.us-east-1.elasticbeanstalk.com/v1/system/notifications')
              .send({ user_id: user._id,
                  date: Date.now(),
                  text: req.body.type })
              .set('Accept', 'application/json')
              .end(function(err, res){
                if(err) {
                  logger.error(err)
                }
                next();            
                // Calling the end function will send the request
            });       

            // Debug on specific device
            var evt = req.body.type;
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