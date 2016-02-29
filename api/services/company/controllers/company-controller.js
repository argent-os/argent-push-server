var Company        = require('../models/company');
var companyHelper  = require('../lib/companyhelper');
var utils       = require('../lib/utils');
var mailer      = require('../lib/mailer');
var jwt         = require('jwt-simple');
var _           = require('lodash');
var fs          = require('fs');
var nconf       = require('nconf');
var moment      = require('moment');
var logger      = require('../lib/logger')();

var tokenSecret = process.env.JWT_SECRET;

function CompanyController (req, res, next) {}

CompanyController.prototype.createCompany = function (req, res, next) {
  var errors = req.validationErrors();
  if (errors) {
    res.status(400).json(errors);
    return false;
  }
  var data = req.body;
  companyHelper.checkIfCompanyExists(null, data, function (result) {
    if (result === 'company_uniq') {
      var company = Company({
        orgId: data.orgId,
        name: data.name,
      });
      company.save(function(err) {
        if (err) {

          //logger.error('Error saving company. Company: ' + JSON.stringify(company));
          return next(err);
        }
        res.json({token: generateToken(company)});
      });
    }
    else {
      res.status(409).json(result);
    }
  });
};

CompanyController.prototype.deleteCompany = function (req, res, next) {
  var data = req.body;
  Company.findOneAndRemove({_id:req.query._id}, function(err, company) {
    if (err)
      res.send(err);
      res.json({ message: 'Company removed from the list!' });
  });
};



CompanyController.prototype.editCompany = function (req, res, next) {
  var data = req.body;
  var errors = req.validationErrors();
  if (errors) {
    res.status(400).json(errors);
    return false;
  }
  companyHelper.checkIfCompanyExists(req.body, data, function (result) {
      Company.findOneAndUpdate({_id: req.body._id}, data, function (err, company) {
        if (!company) {
          //logger.info('Company not found for account update. Company id : ' + req.body._id);
          return;
        }
        else {
          var updated = [];
          if (company.name !== data.name) {
            updated.push('name');
            company.name = data.name;
          }
          if (updated.length > 0) {
            company.date_modified = Date.now();
            var out = {
              name: company.username
            };
          }
          else {
            res.json({msg: 'Data not modified'});
            return;
          }

          company.update(function(err) {
            if (err) {
              //logger.error('Error updating company account. Company id: ' + req.body._id + ' Err: ' + err);
              res.status(401).json({msg: 'update_error'});
            } 
            else {
              res.json({token: generateToken(company)});
            }
          });
        }
      });
  });
};

CompanyController.prototype.getCompany = function (req, res, next) {
  var paramsID = req.params.id;
  var errors = req.validationErrors();
  if (errors) {
    res.status(400).json(errors);
    return false;
  }

  Company.findOne({_id : paramsID}, function (err, company) {
      if (!company) {
        //logger.info('Company not found for ID: ' + paramsID);
        return;
      }
      else {
          // return company
          res.json(company);
          return;
      }
    });
};

CompanyController.prototype.getAllCompanies = function (req, res, next) {
  var data = req;
  var errors = req.validationErrors();
  if (errors) {
    res.status(400).json(errors);
    return false;
  }

  Company.find(function (err, company) {
      if (!company) {
        //logger.info('Company not found: ' + company);
        return;
      }
      else {
          // return companies
          res.json(company);
          return;
      }
    });
};

CompanyController.prototype.authorize = function (req, res, next) {
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
        req.company = decoded.company;
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

function generateToken(company) {
  // Remove password property from company object
  // _.omit doesn't work for mongoose object
  company = _.pick(company, '_id', 'name');
  var payload = {
    company: company,
    iat: new Date().getTime(),
    exp: moment().add(7, 'days').valueOf()
  };
  return jwt.encode(payload, tokenSecret);
}

module.exports = new CompanyController();
