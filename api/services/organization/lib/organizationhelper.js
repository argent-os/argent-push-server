var Organization  = require('../models/organization');
var async = require('async');

exports.checkIfOrganizationExists = function (organization, data, callback) {
  var organizationQuery;
  // Organization found - edit organization
  if (organization) {
    var organizationId = organization._id;
    organizationQuery = Organization.findOne({title: data.title, _id: {$ne: organizationId}});
  }
  else {
    organizationQuery = Organization.findOne({title: data.title});
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
    return 'organization_uniq';
  }
}
