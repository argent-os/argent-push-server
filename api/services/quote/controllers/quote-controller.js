var Quote        = require('../models/quote');
var quoteHelper  = require('../lib/quotehelper');
var utils       = require('../lib/utils');
var mailer      = require('../lib/mailer');
var jwt         = require('jwt-simple');
var _           = require('lodash');
var fs          = require('fs');
var nconf       = require('nconf');
var moment      = require('moment');
var logger      = require('../lib/logger')();

var tokenSecret = process.env.JWT_SECRET;

function QuoteController (req, res, next) {}

QuoteController.prototype.createQuote = function (req, res, next) {
  var errors = req.validationErrors();
  if (errors) {
    res.status(400).json(errors);
    return false;
  }
  var link;
  var data = req.body;
  var recipient = data.quote.customer.email;  
  // console.log(data);
  //quotes will likely break on no org id, potential fix required
  quoteHelper.checkIfQuoteExists(null, data, function (result) {
    if (result === 'quote_uniq') {
      var quote = new Quote({
          dateCreated: data.date,
          name: data.quote.name,           
          calculatedGrandTotal: data.quote.projectGrandTotal,           
          customerFirstName: data.quote.customer.firstname, 
          customerLastName: data.quote.customer.lastname, 
          customerEmail: data.quote.customer.email,
          taxRate: data.quote.tax,
          startDate: data.range.startDate, 
          endDate: data.range.endDate, 
          orgId: data.user.orgId,
          userId: data.user._id,
          status: null
      });
      quote.save(function(err) {
        if (err) {

          logger.error('Error saving quote on register. Quote: ' + JSON.stringify(quote));
          return next(err);
        }
                  // process.env.ENVIRONMENT == 'DEV' || process.env.ENVIRONMENT == undefined ? link = 'http://localhost:5000/quote' + '?token=' + verifyToken : '';
                  // process.env.ENVIRONMENT == 'PROD' ? link = 'https://www.timekloud.com/quote' + '?token=' + verifyToken : ''; 
                  var acceptLink = "http://localhost:5000/acceptQuote";
                  var rejectLink = "http://localhost:5000/rejectQuote";           
                  mailer.sendQuote(recipient, acceptLink, rejectLink, function (err, info) {
                    if (err) {
                      // console.log(err);
                      //logger.error('Sending message error : ' + err);
                      res.send(504);
                    }
                    else {
                      // var resp = {};
                      // resp.msg = 'verify_link_sent';
                      // res.status(200).json(resp);
                      res.json({token: generateToken(quote), quote: quote});
                    }
                  });                  
      });
    }
    else {
      res.status(409).json(result);
    }
  });
};

QuoteController.prototype.deleteQuote = function (req, res, next) {
  var data = req.body;
  Quote.findOneAndRemove({_id:req.query._id}, function(err, quote) {
    if (err)
      res.send(err);
      res.json({ message: 'Quote removed from the list!' });
  });
};



QuoteController.prototype.editQuote = function (req, res, next) {
  var data = req.body;
  var errors = req.validationErrors();
  if (errors) {
    res.status(400).json(errors);
    return false;
  }
  quoteHelper.checkIfQuoteExists(req.body, data, function (result) {
      Quote.findOneAndUpdate({_id: req.body._id}, data, function (err, quote) {
        if (!quote) {
          logger.info('Quote not found for account update. Quote id : ' + req.body._id);
          return;
        }
        else {

          var updated = [];
          if (quote.title !== data.title) {
            updated.push('title');
            quote.title = data.title;
          }
          if (quote.description !== data.description) {
            updated.push('description');
            quote.description = data.description;
          }
          if (updated.length > 0) {
            quote.date_modified = Date.now();
            var out = {
                clientName: quote.clientName,
                clientEmail: quote.clientName,
                projectId: quote.clientName, 
                projectStart: quote.clientName, 
                projectEnd: quote.clientName,
                projectBillRate: quote.clientName,
                orgId: quote.clientName   
            };
          }
          else {
            res.json({msg: 'Data not modified'});
            return;
          }

          quote.update(function(err) {
            if (err) {
              logger.error('Error updating quote account. Quote id: ' + req.body._id + ' Err: ' + err);
              res.status(401).json({msg: 'update_error'});
            } 
            else {
              res.json({token: generateToken(quote)});
            }
          });
        }
      });
  });
};

QuoteController.prototype.getAllQuotes = function (req, res, next) {
  var data = req;
  var errors = req.validationErrors();
  if (errors) {
    res.status(400).json(errors);
    return false;
  }

  Quote.find(function (err, quote) {
      if (!quote) {
        // logger.info('Quotes not found: ' + quote);
        return;
      }
      else {
          // return quotes
          res.json(quote);
          return;
      }
    });
};

QuoteController.prototype.getOneQuote = function (req, res, next) {
  var paramsID = req.params.id;
  var errors = req.validationErrors();
  if (errors) {
    res.status(400).json(errors);
    return false;
  }

  Quote.findOne({_id : paramsID}, function (err, quote) {
      if (!quote) {
        logger.info('Quotes not found for ID: ' + paramsID);
        return;
      }
      else {
          // return quotes
          res.json(quote);
          return;
      }
    });
};

QuoteController.prototype.authorize = function (req, res, next) {
  var token = getToken(req);
  if (token) {
    try {
      var decoded = jwt.decode(token, tokenSecret);
      // Difference in seconds
      var diff = parseInt((Date.now() - decoded.iat) / 1000, 10);
      if (nconf.get('tokenExpire') < diff) {
        res.send(401, 'Access token has expired');
      }
      else {
        req.quote = decoded.quote;
        return next();
      }
    }
    catch (err) {
      return res.status(500).send('Error parsing token');
    }
  }
  else {
    return res.send(401);
  }
};

function getToken(req) {
  if (req.headers.authorization) {
    return req.headers.authorization.split(' ')[1];
  }
  else {
    return false;
  }
}

function generateToken(quote) {
  // Remove password property from quote object
  // _.omit doesn't work for mongoose object
  quote = _.pick(quote, '_id', 'title' ,'description');
  var payload = {
    quote: quote,
    iat: new Date().getTime(),
    exp: moment().add(7, 'days').valueOf()
  };
  return jwt.encode(payload, tokenSecret);
}

module.exports = new QuoteController();
