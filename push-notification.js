"use strict";

var apn  = require ('apn');
var path = require('path');
var fs = require('fs');

var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var port = process.env.PORT || 5004;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

var options = {
    "cert": fs.readFileSync(path.join(__dirname, "/cert.pem")),
    "key":  fs.readFileSync(path.join(__dirname, "/key.pem")),
    "passphrase": "***",
    "gateway": "gateway.sandbox.push.apple.com",
    "port": 2195,
    "enhanced": true,
    "cacheLength": 5,
};

var tokens = ["4d7019531068d155b7e4ec3c97d20e0afd9132e315e4690e69d286085d2c8881"];

if(tokens[0] === "<insert token here>") {
    console.log("Please set token to a valid device token for the push notification service");
    process.exit();
}

// Create a connection to the service using mostly default parameters.

var service = new apn.connection({ options: options, production: false });

service.on("connected", function() {
    console.log("Connected");
});

service.on("transmitted", function(notification, device) {
    console.log("Notification transmitted to:" + device.token.toString("hex"));
});

service.on("transmissionError", function(errCode, notification, device) {
    console.error("Notification caused error: " + errCode + " for device ", device, notification);
    if (errCode === 8) {
        console.log("A error code of 8 indicates that the device token is invalid. This could be for a number of reasons - are you using the correct environment? i.e. Production vs. Sandbox");
    }
});

service.on("timeout", function () {
    console.log("Connection Timeout");
});

service.on("disconnected", function() {
    console.log("Disconnected from APNS");
});

service.on("socketError", console.error);


// If you plan on sending identical paylods to many devices you can do something like this.
function pushNotificationToMany() {
    console.log("Sending the same notification each of the devices with one call to pushNotification.");
    var note = new apn.notification();
    note.setAlertText("Hello, welcome to PayKloud!");
    note.badge = 1;
    note.sound = "chime2.caf";
    note.alert = "\uD83D\uDCE7 \u2709 You have a new message";
    note.payload = {'messageFrom': 'Sinan'};
    service.pushNotification(note, tokens);
}

// pushNotificationToMany();


// If you have a list of devices for which you want to send a customised notification you can create one and send it to and individual device.
function pushStartNotificationsSingleDevice() {
    console.log("Sending a tailored notification to %d devices", tokens.length);
    tokens.forEach(function(token, i) {
        var note = new apn.notification();
        note.setAlertText("Hello, from PayKloud! You are number: " + i);
        note.badge = 1;
        note.sound = "chime2.caf";
        note.alert = "Push notifications now running";
        note.payload = {'messageFrom': 'PayKloud'};
        service.pushNotification(note, token);
    });
}

pushStartNotificationsSingleDevice();

// Stripe webhook push notifications

var secrets = require(__dirname + '/api/services/auth/config/secrets');
var options = secrets.stripeOptions;

// First we load the Stripe library - https://github.com/abh/node-stripe
// and pass in our secret key, which will uniquely identify us with the Stripe platform.
// var stripe = require('stripe')(options.apiKey);
var StripeWebhook = require('stripe-webhook-middleware');

var stripeWebhook = new StripeWebhook({
   stripeApiKey: options.apiKey
});

app.post('/stripe', stripeWebhook.middleware, function(req, res, next) {
    console.log(res);
});

app.post('/webhook/stripe', stripeWebhook.middleware,

    // we assume express.bodyParser() was used,
    //  and express.csrf() is off for this endpoint
    function(req, res, next) {

      // first, make sure the posted data looks like we expect
      if(req.body.object!=='event') {
        return res.send(400); // respond with HTTP bad request
      }

      // we only care about the event id - we use it to query the Stripe API    
      stripe.events.retrieve(req.body.id, function(err, event){

        // the request to Stripe was signed - so if the event id is invalid
        //  (eg it doesnt belong to our account), the API will respond with an error,
        //  & if there was a problem on Stripe's side, we might get no data.
        if(err || !event) {
          return res.send(401); // respond with HTTP forbidden
        }

        // store the validated, confirmed from Stripe event for use by our next middleware
        req.modeled.stripeEvent = event;

        next();
      });
    }

  // now we can trust the event really came from Stripe!
  , function(req, res) {
      var o, event = req.modeled.stripeEvent;

      console.log('inside verified webhook event');
      // in this example we only care about one type of event
      if(event.type==='charge.succeeded') {
        o = event.data.object;

        console.log('received type charge.succeeded');
        tokens.forEach(function(token, i) {
            var note = new apn.notification();
            note.badge = 1;
            note.sound = "chime2.caf";
            note.alert = "Charge Succeeded!";
            note.payload = {'messageFrom': 'PayKloud'};
            service.pushNotification(note, token);
        });
        // // let's find which one of our users was charged
        // pk.model.User.findByStripeCustomerId( o.customer, function(err, user) { 
        //     if(user) { // here user is a mongoose model
        //         // we store the charge id on our user's _plan subdoc
        //         user._plan.stripe.charges.push(o.id);
        //         user._plan.save();
        //         console.log('found user');
        //         // and send our customer an email confirmation, 
        //         //  more custom than https://stripe.com/blog/email-receipts
        //         pk.mailer.sendPaymentConfirmation(user, o);

        //         // send a push notification
        //         // tokens.forEach(function(token, i) {
        //         //     var note = new apn.notification();
        //         //     // note.setAlertText("Hello, from PayKloud! You are number: " + i);
        //         //     note.badge = 1;
        //         //     note.sound = "chime2.caf";
        //         //     note.alert = "Charge Succeeded";
        //         //     note.payload = {'messageFrom': 'PayKloud'};
        //         //     service.pushNotification(note, token);
        //         // });
        //     }
        //   }
        // );
      }
      else {
        console.log("unhandled stripe event", event.type);
      }

      // it's important to let the Stripe platform know that the event 
      //  was received and properly processed. if the webhook endpoint does not
      //  respond with a 2xx status, Stripe will try making it's request again later.
      res.send(200); // respond with HTTP ok
    }
);

console.log("listening on port " + port);
app.listen(port);


