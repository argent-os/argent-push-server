"use strict";

var express = require('express');
var bodyParser = require('body-parser');
var log4js = require('log4js');
var logger = log4js.getLogger();
var app = express();
var port = process.env.PORT || 5004;

// Mongo
var uriUtil        = require('mongodb-uri');
var mongoose       = require('mongoose');
var mongodbUri     = process.env.MONGOLAB_URI;
var mongooseUri    = uriUtil.formatMongoose(mongodbUri) + '/praxicorp';

// Key Stripe and Firebase Handlers for DEV vs PROD
process.env.ENVIRONMENT == 'DEV' ? mongooseUri = process.env.MONGOLAB_URI_DEV : '';
process.env.ENVIRONMENT == 'PROD' ? mongooseUri = process.env.MONGOLAB_URI : '';

mongoose.connect(mongooseUri);
mongoose.connection.on('error', function () {
	logger.error('Cannot connect to MongoDB');
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Stripe webhook push notifications
var secrets = require(__dirname + '/api/endpoints/auth/config/secrets');
var options = secrets.stripeOptions;

// First we load the Stripe library - https://github.com/abh/node-stripe
// and pass in our secret key, which will uniquely identify us with the Stripe platform.
var stripe = require('stripe')(options.apiKey);
// The middleware is where we handle the webhook endpoint calls and push notifications
var StripeWebhook = require('./stripe-webhook-middleware');

var stripe_webhook = new StripeWebhook({
   stripeApiKey: options.apiKey
}, app);

var notify = require('./push-notification');
notify.sendPushNotification("push server started", "1ca2298d29efb474858e7996c143590ac3deddf370b7fa30919b7c7cec52e27d");

// Listen for webhook events
app.post('/webhook/stripe', stripe_webhook.middleware);

console.log("listening on port " + port);
app.listen(port);


