var User        = require('../models/user');
var Organization= require('../../organization/models/organization');
var userHelper  = require('../lib/userhelper');
var utils       = require('../lib/utils');
var mailer      = require('../lib/mailer');
var jwt         = require('jwt-simple');
var _           = require('lodash');
var fs          = require('fs');
var nconf       = require('nconf');
var moment      = require('moment');
var logger      = require('../lib/logger')();
var request     = require('request');

var tokenSecret = process.env.JWT_SECRET;
var facebookSecret   = process.env.FACEBOOK_SECRET;
var oAuthSecret = 'B21F3EFCE39FDC5BDE7EEE987D7C8';

var log4js = require('log4js');
var logger = log4js.getLogger();

var apiUrl;
process.env.ENVIRONMENT == 'DEV' || process.env.ENVIRONMENT == undefined ? apiUrl = process.env.API_DEV_URL : '';
process.env.ENVIRONMENT == 'PROD' ? apiUrl = process.env.API_URL : apiUrl = process.env.API_DEV_URL;

function UserController (req, res, next) {}

UserController.prototype.register = function (req, res, next) {
  var data = req.body;
  var link;   
  logger.trace('registering');
  logger.info('user email is', req.body.email)
  logger.info('username is', req.body.username)
  User.findOne({ email: req.body.email }, function(err, existingUser) {
        if (existingUser) {
          logger.error('email is taken')
          return res.status(409).send({ message: 'Email is already taken', type: "email_exists" });
        } else {
          User.findOne({ username: req.body.username }, function(err, existingUser) {
            if(existingUser) {
              logger.error('username is taken')
              return res.status(409).send({ message: 'Username is already taken', type: "email_exists" });
            }    
            var verifyToken = utils.randomString(16);  
            var clientId = 'tok_'+utils.randomString(64);
            var clientSecret = 'tok_'+utils.randomString(64);
            var accessToken = 'tok_'+utils.randomString(64);    
            var scope = 'read_write';    
            var tokenType = 'bearer';    
            var livemode = 'true';    
            var _date = req.body.tos_acceptance.data.date;
            if( _date.indexOf('.') != -1 ) {
                var parsedDate = _date.substring(0, _date.indexOf('.'));
                logger.info("parsing date, " + parsedDate);
            }
            if(req.body.dob !== undefined) {
              var dateOfBirth = {
                "day": req.body.dob.day,
                "month": req.body.dob.month,
                "year": req.body.dob.year
              }
            } else {}

            if(req.body.legal_entity !== undefined) {
              var type = legal_entity.type
            } else {
              var type = req.body.legal_entity_type
            }

            var user = new User({
              first_name: req.body.first_name,
              last_name: req.body.last_name,
              username: req.body.username,
              email: req.body.email,
              phone_number: req.body.phone_number,
              password: req.body.password,
              country: req.body.country,
              legal_entity: {
                "first_name": req.body.first_name,
                "last_name": req.body.last_name,
                "type": type,
                "dob": dateOfBirth,
              },
              tos_acceptance: {
                "ip":req.body.tos_acceptance.data.ip,
                "date":parsedDate
              },
              env: process.env.ENVIRONMENT,
              theme: "1",
              verifyToken: verifyToken,
              token_client_id: clientId,
              token_client_secret: clientSecret,
              token_access: accessToken,
              token_scope: scope,
              token_livemode: livemode,
              token_type: tokenType
            }); 
            logger.trace('about to save');
            user.save().then(function(user, err) {
              if(err) {
                  logger.error(err);
                  res.send({ message: err });                                
              }
              logger.trace('inside save');
              // change to req.body.country      
              process.env.ENVIRONMENT == 'DEV' || process.env.ENVIRONMENT == undefined ? link = 'http://localhost:5000/verify' + '?token=' + verifyToken : '';
              process.env.ENVIRONMENT == 'PROD' ? link = 'https://api.argent.cloud/verify' + '?token=' + verifyToken : '';                  
              mailer.verifyEmail(user, link, function (err, info) {
                if (err) {
                  logger.error('Error occured : ' + err);
                  // res.sendStatus(504);
                  res.send({ message: "Error occured" });                                
                }
                else {
                  res.send({ token: createJWT(user, user.username),  user: user, message: "Welcome to Argent" });                                
                }
              });      
            });                
         });
        }
    });
};

UserController.prototype.ping = function (req, res, next) {
  var self = this;
  // ping with either username or email
  logger.trace('ping req received');
  User.findOne({ $or: [ { email: req.body.email }, { username: req.body.username } ] }, function(err, user) {
      if (!user) {
          logger.error("user not found");
          return res.status(404).send({ message: 'user not found' });
      }      
      logger.info("done");
      res.status(200).send({ msg: 'pong', user: user.username });
  });
};

UserController.prototype.login = function (req, res, next) {
  var self = this;
  // Login with either username or email
  logger.trace('login req received');
  User.findOne({ $or: [ { email: req.body.email }, { username: req.body.username } ] }, function(err, user) {
    if (!user) {
      return res.status(401).send({ message: 'Wrong username/email and/or password' });
    }
    if(err) {
      logger.error(err);
    }
    logger.info('found user, comparing password');
    user.comparePassword(req.body.password, function(err, isMatch) {
      if (!isMatch) {
        logger.error("password mismatch");        
        return res.status(401).send({ message: 'Wrong username/email and/or password' });
      } else if(err) {
        logger.error(err);
        return res.status(401).send({ message: 'Error logging in' });        
      }
      logger.info('password match for user', user.username);      
      logger.debug("login data is");
      // logger.debug(user);

      res.send({ token: createJWT(user), user: user });             
    });
  });
};

UserController.prototype.loginOAuth = function(req, res, next) {
    var accessTokenUrl = 'http://localhost:5000/v1/oauth/access_token';
    var cloudApiUrl = 'http://localhost:5000/v1/me';
    var params = {
      code: req.body.code,
      client_id: req.body.clientId,
      client_secret: oAuthSecret,
      redirect_uri: req.body.redirectUri
    };

    // Step 1. Exchange authorization code for access token.
    request.get({ url: accessTokenUrl, qs: params, json: true }, function(err, response, accessToken) {
      if (response.statusCode !== 200) {
        return res.status(500).send({ message: accessToken.error.message });
      }

      // Step 2. Retrieve profile information about the current user.
      request.get({ url: cloudApiUrl, qs: accessToken, json: true }, function(err, response, profile) {
        if (response.statusCode !== 200) {
          return res.status(500).send({ message: profile.error.message });
        }
        if (req.headers.authorization) {
          User.findOne({ proton: profile.id }, function(err, existingUser) {
            if (existingUser) {
              return res.status(409).send({ message: 'There is already a Proton account that belongs to you' });
            }
            var token = req.headers.authorization.split(' ')[1];
            var payload = jwt.decode(token, tokenSecret);
            User.findById(payload.user, function(err, user) {
              if (!user) {
                return res.status(400).send({ message: 'User not found' });
              }
              user.proton = profile.id;
              user.picture = user.picture || 'http://localhost:5000/v1/' + profile.id + '/picture?type=large';
              user.displayName = user.displayName || profile.name;
              user.save(function() {
                var token = createJWT(user);
                res.send({ token: token, user: user });
              });
            });
          });
        } else {
          // Step 3b. Create a new user account or return an existing one.
          User.findOne({ proton: profile.id }, function(err, existingUser) {
            if (existingUser) {
              var token = createJWT(existingUser);
              return res.send({ token: token, user: existingUser });
            }
            var user = new User();
            user.proton = profile.id;
            user.picture = 'http://localhost:5000/' + profile.id + '/picture?type=large';
            user.displayName = profile.name;
            user.save(function() {
              var token = createJWT(user);
              res.send({ token: token, user:user });
            });
          });
        }
      });
    });  
}

UserController.prototype.removeAccount = function (req, res, next) {
  var email = req.body.email;
  var password = req.body.password; 

  // logger.info(req);
  // logger.info(req.body.user.orgId);
  //remove organization at same time
  if(req.body.user.orgId) {
    Organization.remove({_id: req.body.user.orgId}, function(err) {
      if (!err) {
        // logger.info(req.body.email);
        // logger.info(req.body.password);       
        // logger.info('org removed');
        // res.status(200).send({msg: 'organization_removed'});
      }
      else {
        //logger.error('Error removing user account. User id : ' + req.user._id);
      }
    });
  }

  User.remove({_id: req.user._id}, function(err) {
    if (!err) {
      // logger.info(req.body.email);
      // logger.info(req.body.password);       
      res.status(200).send({msg: 'account_removed'});
    }
    else {
      //logger.error('Error removing user account. User id : ' + req.user._id);
    }
  });
};

UserController.prototype.editProfile = function (req, res, next) {
  var data = req.body;
  logger.trace("update profile req received");
  var user_id = req.params.uid;
  userHelper.checkIfUserExists(req.user, data, function (result) {
    if (result === 'user_uniq') {
      User.findOne({ $or: [ { _id: user_id }, { email: req.user.email } ] }, function (err, user) {
          if (!user) {
            logger.info('User not found for account update. User id : ' + req.user._id);
            res.status(404).json({msg: 'User not found, could not update'})
            return;
          }
          else {
            var updated = [];
            logger.trace("user found in update")
            logger.debug('requesting user is', req.user.email);
            // check that user is sent through request and not the body
            if(req.user !== undefined) {
              // check if user data is sent as body
              if (user.email !== data.email && data.email !== null && data.email !== '' && data.email !== undefined) {
                updated.push('email');
                user.email = data.email;
              }
              if (user.username !== data.username && data.username !== null && data.username !== undefined && data.username !== "") {
                updated.push('username');
                user.username = data.username;
              }   
              if (user.role !== data.role && req.user.email !=null && data.role !== '' && data.role !== undefined) {
                updated.push('role');
                user.role = data.role;
              }      
              if (user.notificationsEnabled !== data.notificationsEnabled && data.notificationsEnabled !== null && data.notificationsEnabled !== undefined && data.notificationsEnabled !== "") {
                updated.push('notificationsEnabled');
                user.notificationsEnabled = data.notificationsEnabled;
              }  
              if (user.first_name !== data.first_name && data.first_name !== null && data.first_name !== undefined && data.first_name !== "") {
                updated.push('first_name');
                user.first_name = data.first_name;
              }     
              if (user.last_name !== data.last_name && data.last_name !== null && data.last_name !== undefined && data.last_name !== "") {
                updated.push('last_name');
                user.last_name = data.last_name;
              }   
              if (user.orgId !== data.orgId && data.orgId !=null && data.orgId !== '' && data.orgId !== undefined) {
                updated.push('orgId');
                user.orgId = data.orgId;
              }        
              if (user.picture !== data.picture && data.picture !== null && data.picture !== undefined && data.picture !== "") {
                updated.push('picture');
                user.picture = data.picture;
              }                                                                                
              if (user.stripe !== data.stripe && data.stripe !== null && data.stripe !== undefined && data.stripe !== "") {
                updated.push('stripe');
                user.stripe = data.stripe;
              }    
              if (user.plaid !== data.plaid && data.plaid !== undefined && data.plaid !== null && data.plaid != '') {
                updated.push('plaid');
                user.plaid = data.plaid;
              }    
              if (user.ios !== data.ios && data.ios !== undefined && data.ios !== null && data.ios != '') {
                updated.push('ios');
                user.ios = data.ios;
              }                                                                
              if (user.verified !== data.verified && data.verified !== undefined && data.verified !== null && data.verified !== '') {
                updated.push('verified');
                user.verified = data.verified;
              }    
              if (user.theme !== data.theme && data.theme !== undefined && data.theme !== null && data.theme !== '') {
                updated.push('theme');
                user.theme = data.theme;
              }                     
              if (user.verifyToken !== data.verifyToken) {
                updated.push('verifyToken');
                user.verifyToken = data.verifyToken;
              }                                       
              if (data.password !== '' && data.password !== null && data.password !== undefined && data.password !== '') {
                updated.push('password');
                user.password = data.password;
              }
              if (updated.length > 0) {
                user.date_modified = Date.now();
                var out = {
                  email: user.email,
                  password: user.password,
                  fullname: user.fullname,
                  first_name: user.first_name,
                  last_name: user.last_name,
                  username: user.username,
                  stripe: user.stripe,
                  plaid: user.plaid,                
                  ios: user.ios,                
                  verifyToken: user.verifyToken,
                  verified: user.verified,
                  theme: user.theme,
                  orgId: user.orgId,
                  notificationsEnabled: user.notificationsEnabled,
                  picture: user.picture,
                  role: [user.role]
                };
              }
              else {
                res.status(200).json({msg: 'Data not modified'});
                return;
              }

              user.save(function(err) {
                if (err) {
                  logger.error(err);
                  logger.error('Error updating user account. User id: ' + req.user._id + ' Err: ' + err);
                  res.status(401).json({msg: 'update_error', err: err});
                }
                else {
                  logger.info("saving user update")
                  var newToken = createJWT(user);
                  res.json({token: newToken, user: user});
                }
              });
            } else {
              logger.error("user data not in request")
            }
          } 
        });
    }
    else {
      res.status(409).json(result);
    }
  });
};

UserController.prototype.getProfile = function (req, res, next) {
  // logger.trace("getting profile");
  // logger.debug(req.user);
  var errors = req.validationErrors();
  if (errors) {
    res.status(400).json(errors);
    return false;
  }
  User.findById(req.user._id, function (err, user) {
      if (!user) {
        logger.info('User not found for account retrieval. User id : ' + req.user._id);
        res.json({err: "could not get profile"});
        return;
      }
      else {
        res.json(user);
        return;
      }
    });
};

UserController.prototype.getUser = function (userId, cb) {
  return User.findById(userId, function (err, user) {
      if (!user) {
        logger.info('User not found for account | User id : ' + userId);
        return;
      }
      else {
        return user;
      }
    });
};

UserController.prototype.getDelegatedUserByUsername = function (username, cb) {
  return User.findOne({ username: username }, function (err, user) {
      if (!user) {
        logger.info('User not found for account | username : ' + username);
        return;
      }
      else {
        return user;
      }
    });
};

UserController.prototype.editUserPicture = function (userId, picture) {
  return User.findById(userId, function (err, user) {
      if (!user) {
        logger.info('User not found for account | User id : ' + userId);
        return;
      }
      else {
        logger.debug('got user, updating picture ' + JSON.stringify(picture))
        user.picture = picture;
        user.save(function(err) {
            if (err) {
              logger.error('Error updating user picture. User: ' + userId);
            }
            else {
              logger.info("saved user picture")
            }
        });
      }
    });
};

UserController.prototype.generateApiKey = function (req, res, next) {
  var errors = req.validationErrors();
  if (errors) {
    res.status(400).json(errors);
    return false;
  }
  User.findById(req.user._id, function (err, user) {
      if (!user) {
        //logger.info('User not found for account update. User id : ' + req.user._id);
        return;
      }
      else {
        res.send({ token: createApiKey(user) });        
        return;
      }
    });
};

UserController.prototype.remindPassword = function(req, res) {

  var url;
  process.env.ENVIRONMENT == "DEV" ? url = "http://localhost:5000/reset" : "";
  // process.env.ENVIRONMENT == "PROD" ? url = "https://www.argentapp.com/reset" : "";
  process.env.ENVIRONMENT == "PROD" ? url = "https://api.argent.cloud/reset" : "";
  
  User.findOne({ $or: [ { email: req.body.email }, { username: req.body.username } ] }, function(err, user) {
    if (!user) {
      logger.info("user not found");
      //logger.info('User not found based on email for password reset. Email requested: ' + email);
      res.status(400).json([{msg: 'Email not found', param: 'email'}]);
    }
    else {
      logger.info('user found, about to generate reset token');
      // Generate random password
      var resetToken = utils.randomString(16);
      user.resetToken = resetToken;
      // Generate reset password link
      var link = url + '?token=' + resetToken;
      user.save(function(err) {
        if (err) {
          //logger.error('Error saving user new password');
          // logger.info('error saving new user password');
        }
        else {
          //logger.info('New password generated for user id: ' + user._id);
          mailer.sendMessage(user, link, function (err, info) {
            if (err) {
              // logger.info(err);
              //logger.error('Sending message error : ' + err);
              res.status(401).json({msg: 'error_sending_password', error: err});
            }
            else {
              if (process.env.ENV === 'testing') {
                // Write new password to a file
                fs.writeFileSync("./testpass.txt", link);
              }
              //logger.info('Remind password message sent to email : ' + user.email);
              var resp = {};
              resp.msg = 'new_password_sent';
              res.json({message: 'Password reset link sent'});
            }
          });
        }
      });
    }
  });
};

UserController.prototype.resetPassword = function (req, res, next) {
  var token = req.body.token;
  var password = req.body.password;

  if (token === '' || password === '') {
    res.status(400).send('Token or password not provided');
    return;
  }
  User.findOne({resetToken: token}, function(err, user) {
    if (!user) {
      logger.error('User not found resetToken: ' + token);
      res.status(400).send('User not found');
    }
    else {
      user.resetToken = '';
      user.password = password;
      user.save(function(err) {
        if (err) {
          logger.error('Error saving reset password');
        }
        else {
          logger.info('Reset password by user with id: ' + user._id);
          res.json({msg: 'new_password_success'});
        }
      });
    }
  });
};

UserController.prototype.authorize = function (req, res, next) {
  if (!req.headers.authorization) {
    return res.status(401).send({ message: 'Please make sure your request has an Authorization header' });
  }
  var token = req.headers.authorization.split(' ')[1];

  var payload = null;
  try {
    // logger.debug('decoding jwt, token is', token);
    payload = jwt.decode(token, tokenSecret);
  }
  catch (err) {
    return res.status(401).send({ message: err.message, err: err });
  }

  if (payload.exp <= moment().unix()) {
    return res.status(401).send({ message: 'Token has expired' });
  }
  // logger.debug('payload user is', payload.user);
  // logger.debug('payload is', payload);
  req.user = payload.user;
  next();
}

UserController.prototype.keepAlive = function (req, res, next) {
  var token = getToken(req);
  try {
    // @TODO code duplication
    var decoded = jwt.decode(token, tokenSecret);
    var diff = parseInt((Date.now() - decoded.iat) / 1000, 10);
    if (nconf.get('tokenExpire') < diff) {
        res.send(401, 'Access token has expired');
      }
    else {
      User.findOne({_id: decoded.user._id}, function (err, user) {
        if (err || !user) {
          logger.error('KeepAlive, issue generating token for user id : ' + decoded.user._id);
          res.status(400).json({error: 'Issue generating token'});
        }
        else {
          res.json({token: createJWT(user)});
        }
      });
    }
  }
  catch (e) {
    //logger.error('KeepAlive error: decoding token failed.');
    res.status(400).send('Unauthorized');
  }
}

// Adds or updates a users card.

UserController.prototype.postBilling = function(req, res, next){
  var stripeToken = req.body.stripeToken;

  if(!stripeToken){
    // req.flash('errors', { msg: 'Please provide a valid card.' });
    // ////logger.info('no stripe token')
    return res.json(405);      
  }

  User.findById(req.user._id, function (err, user) {
    if (err) return next(err);

    user.setCard(stripeToken, function (err) {
      if (err) {
        if(err.code && err.code == 'card_declined'){
          // req.flash('errors', { msg: 'Your card was declined. Please provide a valid card.' });
          // ////logger.info('card declined');
          res.json(400);                
          return;
        }
        // req.flash('errors', { msg: 'An unexpected error occurred.' });
        // ////logger.info('error occured');
        res.json(403);      
        return;
      }
      // req.flash('success', { msg: 'Billing has been updated.' });
      // ////logger.info('card updated');
      res.json(200);      
      return;
    });
  });
};

UserController.prototype.postPlan = function(req, res, next){
  var _plan = req.body.plan;
  var stripeToken = null;

  if(_plan){
    _plan = _plan.toLowerCase();
  }
  if(req.body.user.stripe.plan == _plan){
    // req.flash('info', {msg: 'The selected plan is the same as the current plan.'});
    // return res.redirect(req.redirect.success);
    // ////logger.info('plan is the same as current');
    res.json({status:400, msg:'Same plan'});    
    return;
  }

  User.findById(req.body.user._id, function (err, user) {
    if (err) return next(err);
    user.setPlan(_plan, function (err, response) {
      var msg;
      if (err) {
        if(err.code && err.code == 'card_declined'){
          msg = 'Your card was declined. Please provide a valid card.';
        } else if(err && err.message) {
          msg = err.message;
        } else {
          msg = 'An unexpected error occurred.';
        }
        // ////logger.info('fail');
        res.json({status:400});    
        return;
      }
      // logger.info(response);
      // req.flash('success', { msg: 'Plan has been updated.' });
      // res.redirect(req.redirect.success);
      // ////logger.info('plan updated');
      res.json({status:200, msg:response});    
      return;
    });
  });
};

UserController.prototype.searchUser = function (req, res, next) {
  User.find({ $text: { $search: req.body.username } }, function(err, doc) {
    //Do your action here..
    if(err) {
      logger.error(err);
    }
    usersArr = [];
    for(var i = 0; i<doc.length; i++) {
          var user = {
            first_name: doc[i].first_name,
            last_name: doc[i].last_name,
            username: doc[i].username,
            country: doc[i].country,
            picture: doc[i].picture.secure_url
          }
          // logger.info(doc[i]);
          usersArr.push(user);
    }

    res.json({users: usersArr})
  });
}

UserController.prototype.listAllUsers = function (req, res, next) {
  User.find({}, function(err, users) {
    var userMap = {};
    var usersArr = [];
    users.forEach(function(user) {
      var user = {
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username,
        country: user.country,
        picture: user.picture.secure_url
      }
      usersArr.push(user);
    });
    // res.send(userMap);  
    res.send({users: usersArr});  
  });
}

function getToken(req) {
  if (req.headers.authorization) {
    return req.headers.authorization.split(' ')[1];
  }
  else {
    return false;
  }
}

var hat = require('hat');
function createApiKey(user) {
  user = _.pick(user, '_id' ,'email', 'username'); 
  var rack = hat.rack(); 
  var payload = {
    user: user,
    iat: new Date().getTime(),
    jti: rack(), // a unique id for this token (for revocation purposes)
  };
  return jwt.encode(payload, tokenSecret);
}

function createJWT(user, data) {
  user = _.pick(user, '_id', 'email', 'username');  
  var payload = {
    user: {
      _id: user["_id"],
      email: user["email"],
      username: user["username"]
    },
    iat: new Date().getTime(),
    exp: moment().add(7, 'days').valueOf()
  };
  return jwt.encode(payload, tokenSecret);
}

module.exports = new UserController();
