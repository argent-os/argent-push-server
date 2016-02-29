var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var addressdef = { 
  street: String,
  city: String,
  state: String,
  zip: String,
  country: String
};

var CompanySchema = new mongoose.Schema({
  id: { type: String, unique: true, trim: true },
  orgId: { type: String },
  name: { type: String }
});

CompanySchema.pre('remove', function(company,next) {
    // 'this' is the client being removed. Provide callbacks here if you want
    // to be notified of the calls' result.
    Company.remove({_id: company._id}).exec();
    // console.log('%s has been removed', company._id);
    next();
});

module.exports = mongoose.model('Company', CompanySchema);
