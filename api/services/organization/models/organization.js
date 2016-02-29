var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var addressdef = { 
  street: { type: String },
  city: { type: String },
  state: { type: String },
  zip: { type: String },
  country: { type: String },
};

var employeesdef = {
    employee: { type: String }
}
var OrganizationSchema = new mongoose.Schema({
  date: { type: String },
  name: { type: String, unique: true, trim: true },
  contact: { type: String },
  biography: { type: String },
  email: { type: String, trim: true },
  phone: { type: String, trim: true },
  address: addressdef,
  website: { type: String, trim: true }
});

OrganizationSchema.pre('remove', function(organization,next) {
    // 'this' is the client being removed. Provide callbacks here if you want
    // to be notified of the calls' result.
    Organization.remove({_id: organization._id}).exec();
    // console.log('%s has been removed', organization._id);
    next();
});

module.exports = mongoose.model('Organization', OrganizationSchema);
