var Quote = require('../models/quote');
var async = require('async');

exports.checkIfQuoteExists = function (quote, data, callback) {
  var quoteQuery;
  // Quote found - edit quote
  if (quote) {
    var quoteId = quote._id;
    quoteQuery = Quote.findOne({title: data.title, _id: {$ne: quoteId}});
  }
  else {
    quoteQuery = Quote.findOne({title: data.title});
  }

  async.series(
    [],
    function(err, msgArray) {
      var check = handleErrors(msgArray);
      callback(check);
    }
  );
};

function handleErrors(result) {
  var errors = [];
  if (errors.length > 0) {
    return errors;
  }
  else {
    return 'quote_uniq';
  }
}
