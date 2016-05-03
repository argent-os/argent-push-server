"use strict";

var apn  = require ('apn');
var path = require('path');
var fs = require('fs');

var options = {
    "cert": fs.readFileSync(path.join(__dirname, "/cert.pem")),
    "key":  fs.readFileSync(path.join(__dirname, "/key.pem")),
    "passphrase": "***",
    "gateway": "gateway.sandbox.push.apple.com",
    "port": 2195,
    "enhanced": true,
    "cacheLength": 5,
};

var tokens = ["deb30372ae73fdd21e21ab2f2a9c6431badc22bb124e908ba82b0ec1dd267dc3"];

if(tokens[0] === "") {
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

module.exports = {
    sendPushNotificationToMany: function () {
        // If you plan on sending identical paylods to many devices you can do something like this.
        console.log("Sending the same notification each of the devices with one call to pushNotification.");
        var note = new apn.notification();
        note.setAlertText("Hello, welcome to Argent!");
        note.badge = 0;
        note.sound = "chime.caf";
        note.alert = "Hello from Argent!  Thank you for joining our app.";
        note.payload = {'messageFrom': 'Sinan'};
        service.pushNotification(note, tokens);
    },
    sendPushNotificationsSingleDevice: function () {
        // If you have a list of devices for which you want to send a customised notification you can create one and send it to and individual device.
        console.log("Sending a tailored notification to %d devices", tokens.length);
        tokens.forEach(function(token, i) {
            var note = new apn.notification();
            note.setAlertText("Hello, from Argent! You are number: " + i);
            note.badge = 0;
            note.sound = "chime1.caf";
            note.alert = "Push notifications now running";
            note.payload = {'messageFrom': 'Argent'};
            service.pushNotification(note, token);
        });
    },
    sendPushNotification: function(data, userDeviceToken) {
        var note = new apn.notification();
        note.setAlertText("Hello, from Argent!");
        note.badge = 0;
        note.sound = "soft.caf";
        note.alert = data;
        note.payload = {'messageFrom': 'Argent'};
        service.pushNotification(note, userDeviceToken);
    }
}