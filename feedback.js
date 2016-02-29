"use strict";

var apn = require ("apn");
var path = require("path");

var options = {
    "cert": path.join(__dirname, "/certs/cert.pem"),
    "key":  path.join(__dirname, "/certs/key.pem"),
    "passphrase": "***",
    "gateway": "gateway.sandbox.push.apple.com",
    "port": 2195,
    "enhanced": true,
    "cacheLength": 5,
};

function handleFeedback(feedbackData) {
	feedbackData.forEach(function(feedbackItem) {
		console.log("Device: " + feedbackItem.device.toString("hex") + " has been unreachable, since: " + feedbackItem.time);
	});
}

// Setup a connection to the feedback service using a custom interval (10 seconds)
var feedback = new apn.feedback({ production: false, interval: 10 });

feedback.on("feedback", handleFeedback);
feedback.on("feedbackError", console.error);