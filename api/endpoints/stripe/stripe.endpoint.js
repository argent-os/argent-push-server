// Set your secret key: remember to change this to your live secret key in production
// See your keys here https://dashboard.stripe.com/account/apikeys
var secrets = require('../auth/config/secrets');
var options = secrets.stripeOptions;
var stripe = require("stripe")(options.apiKey);
var log4js = require('log4js');
var logger = log4js.getLogger();

module.exports = function (app, options) {
  app.all('/v1/create-charge', function(req, res) {
    // (Assuming you're using express - expressjs.com)
    // Get the credit card details submitted by the form
    var stripeToken = req.body.stripeToken;
    var charge = stripe.charges.create({
      amount: 1000, // amount in cents, again
      currency: "usd",
      source: stripeToken,
      description: "Example charge"
    }, function(err, charge) {
      if (err && err.type === 'StripeCardError') {
        // The card has been declined
        res.json({msg: err});
      } else {
        res.json({msg: 'customer charged'});
      }
    });
  });

  //   EXAMPLE REQUEST
  //   curl -X POST \
  //   -H "Content-Type: application/json" \
  //   -u sk_test_jqQvmd0K1WbTSgP25zIgIWyp: \
  //   -d '{"customer":"cus_80JM7yd0HXslf6", "amount": 54322, "currency": "usd"}' \
  //      http://localhost:5001/v1/charge
  app.all('/v1/charge', function(req,res) {
    var stripeToken = req.body.stripeToken;
    logger.debug(req.body);
    logger.debug("Request is", req.is('json'))
    stripe.charges.create({
        amount: req.body.amount, // amount in cents, again
        currency: req.body.currency,
        customer: req.body.customer
      }).then(function(charge) {
        logger.info("charge success");
        res.json({msg: "success"})
    }, function(err) {
        logger.error(err);
        res.json({msg: err})
    });
  })

  // app.all('/v1/charge-new-customer', function(req,res) {
  //   var stripeToken = req.body.stripeToken;
  //   stripe.customers.create({
  //     source: stripeToken,
  //     description: 'payinguser@example.com'
  //   }).then(function(customer) {
  //     return stripe.charges.create({
  //       amount: 1000, // amount in cents, again
  //       currency: "usd",
  //       customer: customer.id
  //     });
  //   }).then(function(charge) {
  //     logger.info(charge);
  //     // YOUR CODE: Save the customer ID and other info in a database for later!
  //   });
  // })
}