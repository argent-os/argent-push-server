var crypto   = require('crypto');
var bcrypt   = require('bcryptjs');
var mongoose = require('mongoose');
var timestamps = require('mongoose-timestamp');
var stripeCustomer = require('./plugins/stripe-customer');
var secrets = require('../config/secrets');
var stripeOptions = secrets.stripeOptions;
var Schema   = mongoose.Schema;

var pictureDef = { 
  id: { type: String },
  secureUrl: { type: String }
};

var stripeDef = {  
   access_token: { type: String },
   livemode: { type: Boolean },
   refresh_token: { type: String },
   token_type: { type: String },
   stripe_publishable_key: { type: String },
   stripe_user_id: { type: String },
   scope: { type: String }
};

var tosDef = {
    "date": { type: String },
    "ip": { type: String }
}
var dobDef = {
    "day": { type: Number },
    "month": { type: Number },
    "year": { type: Number }
}

var UserSchema = new mongoose.Schema({
  first_name: { type: String },
  last_name: { type: String },
  username: { type: String, lowercase: true, trim: true, unique : true, required : true, dropDups: true },
  full_name: { type: String, trim: true },
  phone_number: { type: String, trim: true },
  country: { type: String },
  tos_acceptance: tosDef,
  dob: dobDef,
  legal_entity_type: { type: String },
  role: { type: Array },
  orgId: { type: String },
  apiKey: { type: String },
  picture: pictureDef,
  notificationsEnabled: { type: Boolean },  
  email: { type: String, lowercase: true, trim: true, unique : true, required : true, dropDups: true },
  display_name: { type: String },
  device_token_ios: { type: String },
  device_token_android: { type: String },
  password: { type: String },
  resetToken: { type: String, dropDups: true },
  verifyToken: { type: String },
  verified: { type: Boolean },
  theme: { type: String },
  stripeToken: { type: String },
  stripeEnabled: { type: Boolean },
  stripeData: stripeDef,
  env: { type: String },
  firebaseUrl: { type: String },
  apiUrl: { type: String },
  token_client_id: { type: String, dropDups: true },
  token_client_secret: { type: String, dropDups: true },
  token_access_token: { type: String, dropDups: true },
  token_type: { type: String },
  token_scope: { type: String },
  token_livemode: { type: Boolean },
  token_expires: { type: Date },
  redirectUri: { type: String }    
});

UserSchema.plugin(timestamps);
UserSchema.plugin(stripeCustomer, stripeOptions);

UserSchema.pre('save', function (next) {
  var user = this;
  if (!user.isModified('password')) return next();
  bcrypt.genSalt(10, function (err, salt) {
    if (err) return next(err);
    bcrypt.hash(user.password, salt, function (err, hash) {
      if (err) return next(err);
      user.password = hash;
      next();
    });
  });
});

UserSchema.methods.comparePassword = function (candidatePassword, cb) {
  bcrypt.compare(candidatePassword, this.password, function (err, isMatch) {
    if (err) return cb(err);
    cb(null, isMatch);
  });
};

module.exports = mongoose.model('User', UserSchema);