"use strict";

var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var port = process.env.PORT || 5004;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Stripe webhook push notifications
var secrets = require(__dirname + '/api/services/auth/config/secrets');
var options = secrets.stripeOptions;

// First we load the Stripe library - https://github.com/abh/node-stripe
// and pass in our secret key, which will uniquely identify us with the Stripe platform.
var stripe = require('stripe')(options.apiKey);
// The middleware is where we handle the webhook endpoint calls and push notifications
var StripeWebhook = require('./stripe-webhook-middleware');

var webhook = new StripeWebhook({
   stripeApiKey: options.apiKey
});

// Listen for webhook events
app.post('/webhook/stripe', webhook.middleware);

console.log("listening on port " + port);
app.listen(port);


