var Organization        = require('../models/organization');
var organizationHelper  = require('../lib/organizationhelper');
var utils       = require('../lib/utils');
var mailer      = require('../lib/mailer');
var jwt         = require('jwt-simple');
var _           = require('lodash');
var fs          = require('fs');
var nconf       = require('nconf');
var moment      = require('moment');
var logger      = require('../lib/logger')();

var tokenSecret = process.env.JWT_SECRET;

function OrganizationController (req, res, next) {}

OrganizationController.prototype.createOrganization = function (req, res, next) {
  Organization.findOne({ name: req.body.name }, function(err, existingOrg) {
    if (existingOrg) {
      return res.status(409).send({ message: 'Name is already taken' });
    }
    var date    = '';
    var name    = '';
    var contact = '';
    var email   = '';
    var phone   = '';
    var website = '';    
    var address = {
      street: '',
      city: '',
      zip: '',
      city: '',
      country: ''
    };


    req.body.date ? date = req.body.date : date = '';
    req.body.name ? name = req.body.name : name = '';
    req.body.contact ? contact = req.body.contact : contact = '';
    req.body.email ? email = req.body.email : email = '';
    req.body.phone ? phone = req.body.phone : phone = '';
    req.body.website ? website = req.body.website : website = '';
    req.body.address ? address = req.body.address : address = '';

    var organization = new Organization({
        date: date,
        name: name,
        contact: contact,
        email: email,
        phone: phone,
        address: {
          street: address.street,
          city: address.city,
          state: address.state,
          zip: address.zip,
          country: address.country
        },
        website: website
    });
    organization.save(function (err, response) {
      if(err) {
        // console.log(err);
      }
      // console.log(response);
      res.send({ token: generateToken(organization), organization: organization });
    });
  });
};

OrganizationController.prototype.deleteOrganization = function (req, res, next) {
  var data = req.body;
  Organization.findOneAndRemove({_id:req.query._id}, function(err, organization) {
    if (err) {
      res.send(err);
      // console.log(err);
    }
    // console.log('removed org', organization);
      res.json({ message: 'Organization removed from the list!' });
  });
};



OrganizationController.prototype.editOrganization = function (req, res, next) {
  var data = req.body;
  var errors = req.validationErrors();
  if (errors) {
    res.status(400).json(errors);
    return false;
  }
  organizationHelper.checkIfOrganizationExists(req.body, data, function (result) {
    if(result == 'organization_uniq') {
      Organization.findOne({_id: req.body._id}, function (err, organization) {
        // console.log(organization);
        if (!organization) {
          //logger.info('Organization not found for account update. Organization id : ' + req.body._id);
          res.status(400).json({msg:'Organization not found, could not update'})
          return;
        }
        else {
          var updated = [];
          if (organization.name !== data.name && data.name !== undefined && data.name !== "" && data.name !== null) {
            updated.push('name');
            organization.name = data.name;
          }
          if (organization.contact !== data.contact && data.contact !== undefined) {
            updated.push('contact');
            organization.contact = data.contact;
          }
          if (organization.email !== data.email && data.email !== undefined) {
            updated.push('email');
            organization.email = data.email;
          }
          if (organization.phone !== data.phone && data.phone !== undefined) {
            updated.push('phone');
            organization.phone = data.phone;
          }
          if (organization.website !== data.website && data.website !== undefined) {
            updated.push('website');
            organization.website = data.website;
          }       
          if (organization.biography !== data.biography && data.biography !== undefined) {
            updated.push('biography');
            organization.biography = data.biography;
          }           
          if(data.address) {
            if (organization.address.street !== data.address.street && data.address.street !== undefined) {
              updated.push('street');
              organization.address.street = data.address.street;
            }
            if (organization.address.city !== data.address.city && data.address.city !== undefined) {
              updated.push('city');
              organization.address.city = data.address.city;
            }
            if (organization.address.state !== data.address.state && data.address.state !== undefined) {
              updated.push('state');
              organization.address.state = data.address.state;
            }
            if (organization.address.zip !== data.address.zip && data.address.zip !== undefined) {
              updated.push('zip');
              organization.address.zip = data.address.zip;
            }
            if (organization.address.country !== data.address.country && data.address.country !== undefined) {
              updated.push('country');
              organization.address.country = data.address.country;
            }  
          }                                                                    
          if (updated.length > 0) {
            organization.date_modified = Date.now();
            var out = {
              name: organization.name,
              contact: organization.contact,
              email: organization.email,
              phone: organization.phone,
              website: organization.website,
              website: organization.biography,
              street: organization.address.street,
              city: organization.address.city,
              state: organization.address.state,
              zip: organization.address.zip,
              country: organization.address.country                          
            };
          }
          else {
            res.json({msg: 'Data not modified'});
            return;
          }

          organization.save(function(err) {
            // console.log(err);
            if (err) {
              // console.log(err);
              //logger.error('Error updating organization account. Organization id: ' + req.body._id + ' Err: ' + err);
              res.status(401).json({msg: 'update_error'});
            } 
            else {
              res.json({token: generateToken(organization), organization: organization});
            }
          });
        }
      });
    }
  });
};

OrganizationController.prototype.getOrganization = function (req, res, next) {
  var errors = req.validationErrors();
  if (errors) {
    res.status(400).json(errors);
    return false;
  }
  Organization.findById(req.params.id, function (err, organization) {
      if (!organization || organization == null) {
        res.status(400).json({msg: 'Organization not found', state: 'not_found'});        
        return;
      }
      else if (err) {
        // console.log(err);
      }
      else {
        res.json(organization);
        return;
      }
    });
};

OrganizationController.prototype.getAllOrganizations = function (req, res, next) {
  var data = req;
  var errors = req.validationErrors();
  if (errors) {
    res.status(400).json(errors);
    return false;
  }

  Organization.find(function (err, organization) {
      if (!organization) {
        //logger.info('Organization not found: ' + organization);
        return;
      }
      else {
          // return organizations
          res.json(organization);
          return;
      }
    });
};

OrganizationController.prototype.authorize = function (req, res, next) {
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
        req.organization = decoded.organization;
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

function generateToken(organization) {
  // Remove password property from organization object
  // _.omit doesn't work for mongoose object
  organization = _.pick(organization, '_id', 'name');
  var payload = {
    organization: organization,
    iat: new Date().getTime(),
    exp: moment().add(7, 'days').valueOf()
  };
  return jwt.encode(payload, tokenSecret);
}

module.exports = new OrganizationController();
