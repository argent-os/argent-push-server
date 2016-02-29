var Company  = require('../models/company');
var async = require('async');

exports.checkIfCompanyExists = function (company, data, callback) {
  var companyQuery;
  // Company found - edit company
  if (company) {
    var companyId = company._id;
    companyQuery = Company.findOne({title: data.title, _id: {$ne: companyId}});
  }
  else {
    companyQuery = Company.findOne({title: data.title});
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
    return 'company_uniq';
  }
}
