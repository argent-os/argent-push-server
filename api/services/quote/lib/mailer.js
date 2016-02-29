var nodemailer = require('nodemailer');
var nconf = require('nconf');
var config;

if (nconf.get('mailerSettings')) {
  config = nconf.get('mailerSettings');
}

exports.sendMessage = function(user, link, callback) {
  if (!config && process.env.ENV !== 'testing') {
    callback('Transporter not configured');
    return;
  }
  if (process.env.ENV === 'testing') {
    callback(null, user, null);
  }
  else {
    var transporter = nodemailer.createTransport(config.transporter);
    var mailOptions = {
      from: config.mailerFrom,
      to: user.email,
      subject: config.mailerTitle,
      html: config.mailerInfo + '<a href="' + link + '">' + link + '</a>'
    };
    transporter.sendMail(mailOptions, function (error,info) {
      callback(error, info);
    });
  }
};

exports.sendQuote = function(customer, acceptLink, rejectLink, callback) {
  if (!config && process.env.ENV !== 'testing') {
    callback('Transporter not configured');
    return;
  }
  if (process.env.ENV === 'testing') {
    callback(null, customer, null);
  }
  else {
    var transporter = nodemailer.createTransport(config.transporter);
    var mailOptions = {
      from: config.mailerFrom,
      to: customer,
      subject: config.quoteEmailTitle,
      html: config.quoteEmailTextLink + acceptLink + ' Reject: ' + rejectLink
    };
    transporter.sendMail(mailOptions, function (error,info) {
      callback(error, info);
    });
  }
};