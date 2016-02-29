'use strict';

var Stripe = require('stripe'),
stripe;

module.exports = exports = function stripeCustomer (schema, options) {
  stripe = Stripe(options.apiKey);

  schema.add({
    stripe: {
      customerId: String,
      subscriptionId: String,
      last4: String,
      plan: {
        type: String,
        default: options.defaultPlan
      }
    }
  });

  schema.pre('save', function (next) {
    var user = this;
    if(!user.isNew || user.stripe.customerId) return next();
    user.createCustomer(function(err){
      if (err) return next(err);
      next();
    });
    console.log('in pre save', user);
    user.createStripeAccount(function(err) {
      if (err) return next(err);
      next();
    })
  });

  schema.statics.getPlans = function () {
    return options.planData;
  };

  schema.methods.createCustomer = function(cb) {
    var user = this;

    stripe.customers.create({
      email: user.email
    }, function(err, customer){
      if (err) return cb(err);

      user.stripe.customerId = customer.id;
      return cb();
    });
  };

  schema.methods.createStripeAccount = function(cb) {
    var user = this;
    // console.log(user.email);
    // console.log(user.country);
    console.log('in create stripe account', user);
    stripe.accounts.create(
      {
        managed: true,
        legal_entity: {
          first_name: user.first_name,
          last_name: user.last_name,
          type: user.legal_entity_type,
          dob: {
            day: user.dob.day,
            month: user.dob.month,
            year: user.dob.year
          }
        },        
        tos_acceptance: {
          "date": user.tos_acceptance.date,
          "ip": user.tos_acceptance.ip
        },
        country: user.country,        
        email: user.email
      }, function(err, account){
      if (err) return cb(err);
      console.log('account creation success')
      // console.log(user.stripe);
      return cb();
    });      

    // stripe.customers.create({
    //   email: user.email
    // }, function(err, customer){
    //   if (err) return cb(err);

    //   user.stripe.customerId = customer.id;
    //   return cb();
    // });
  };

  schema.methods.setCard = function(stripe_token, cb) {
    var user = this;

    var cardHandler = function(err, customer) {
      if (err) return cb(err);

      if(!user.stripe.customerId){
        user.stripe.customerId = customer.id;
      }

      var card = customer.cards ? customers.cards.data[0] : customer.sources.data[0];
      user.stripe.last4 = card.last4;
      user.save(function(err){
        if (err) return cb(err);
        return cb(null);
      });
    };

    if(user.stripe.customerId){
      stripe.customers.update(user.stripe.customerId, {card: stripe_token}, cardHandler);
    } else {
      stripe.customers.create({
        email: user.email,
        card: stripe_token
      }, cardHandler);
    }
  };

  schema.methods.createCharge = function(amount, currency) {
    stripe.charges.create({
      amount: amount,
      currency: "usd",
      source: "tok_177sxQBtUid5FqMrnq48uoom", // obtained with Stripe.js
      description: "Charge for test@example.com"
    }, function(err, charge) {
      // asynchronously called
    });    
  }
  schema.methods.setPlan = function(plan, cb) {
    var user = this;
    var _plan = plan;

    var subscriptionHandler = function(err, subscription) {
      // if(err) return cb(err);
      if(err)  {
        console.log(err);
      }
      if(subscription) {
        user.stripe.plan = _plan;
        user.stripe.subscriptionId = subscription.id;
        user.save(function(err, res){
          // console.log('saving');
          if(err) {
            console.log(err);
            return cb(err);
          } else {
            // console.log(res);
            return cb(null, res);
          }
          // if (err) return cb(err);
          // return cb(null);
        });
      }
    };

    var createSubscription = function(){
      stripe.customers.createSubscription(user.stripe.customerId, 
        {plan: _plan}, function (err, subscription) {
          subscriptionHandler(err, subscription)
        }
      );
    };

    if (user.stripe.subscriptionId){
      // update subscription
      stripe.customers.updateSubscription(
        user.stripe.customerId,
        user.stripe.subscriptionId,
        {plan: _plan}, function (err, subscription) {
          subscriptionHandler(err, subscription)
        }
      );
    } else {
      createSubscription();
    }

  };

  schema.methods.updateStripeEmail = function(cb){
    var user = this;

    if(!user.stripe.customerId) return cb();

    stripe.customers.update(user.stripe.customerId, {email: user.email}, function(err, customer) {
      cb(err);
    });
  };

  schema.methods.cancelStripe = function(cb){
    var user = this;

    if(user.stripe.customerId){
      stripe.customers.del(
        user.stripe.customerId
      ).then(function(confirmation) {
        cb();
      }, function(err) {
        return cb(err);
      });
    } else {
      cb();
    }
  };
};
