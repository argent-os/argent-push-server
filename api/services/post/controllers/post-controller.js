var Post        = require('../models/post');
var postHelper  = require('../lib/posthelper');
var utils       = require('../lib/utils');
var mailer      = require('../lib/mailer');
var jwt         = require('jwt-simple');
var _           = require('lodash');
var fs          = require('fs');
var nconf       = require('nconf');
var moment      = require('moment');
var logger      = require('../lib/logger')();

var tokenSecret = process.env.JWT_SECRET;

function PostController (req, res, next) {}

PostController.prototype.createPost = function (req, res, next) {
  var errors = req.validationErrors();
  if (errors) {
    res.status(400).json(errors);
    return false;
  }
  var data = req.body;
  postHelper.checkIfPostExists(null, data, function (result) {
    if (result === 'post_uniq') {
      var post = Post({
        title: data.title,
        description: data.description
      });
      post.save(function(err) {
        if (err) {

          logger.error('Error saving post on register. Post: ' + JSON.stringify(post));
          return next(err);
        }
        res.json({token: generateToken(post)});
      });
    }
    else {
      res.status(409).json(result);
    }
  });
};

PostController.prototype.deletePost = function (req, res, next) {
  var data = req.body;
  Post.findOneAndRemove({_id:req.query._id}, function(err, post) {
    if (err)
      res.send(err);
      res.json({ message: 'Post removed from the list!' });
  });
};



PostController.prototype.editPost = function (req, res, next) {
  var data = req.body;
  var errors = req.validationErrors();
  if (errors) {
    res.status(400).json(errors);
    return false;
  }
  postHelper.checkIfPostExists(req.body, data, function (result) {
      Post.findOneAndUpdate({_id: req.body._id}, data, function (err, post) {
        if (!post) {
          logger.info('Post not found for account update. Post id : ' + req.body._id);
          return;
        }
        else {
          var updated = [];
          if (post.title !== data.title) {
            updated.push('title');
            post.title = data.title;
          }
          if (post.description !== data.description) {
            updated.push('description');
            post.description = data.description;
          }
          if (updated.length > 0) {
            post.date_modified = Date.now();
            var out = {
              title: post.username,
              description: post.description
            };
          }
          else {
            res.json({msg: 'Data not modified'});
            return;
          }

          post.update(function(err) {
            if (err) {
              logger.error('Error updating post account. Post id: ' + req.body._id + ' Err: ' + err);
              res.status(401).json({msg: 'update_error'});
            } 
            else {
              res.json({token: generateToken(post)});
            }
          });
        }
      });
  });
};

PostController.prototype.getAllPosts = function (req, res, next) {
  var data = req;
  var errors = req.validationErrors();
  if (errors) {
    res.status(400).json(errors);
    return false;
  }

  Post.find(function (err, post) {
      if (!post) {
        logger.info('Posts not found: ' + post);
        return;
      }
      else {
          // return posts
          res.json(post);
          return;
      }
    });
};

PostController.prototype.getOnePost = function (req, res, next) {
  var paramsID = req.params.id;
  var errors = req.validationErrors();
  if (errors) {
    res.status(400).json(errors);
    return false;
  }

  Post.findOne({_id : paramsID}, function (err, post) {
      if (!post) {
        logger.info('Posts not found for ID: ' + paramsID);
        return;
      }
      else {
          // return posts
          res.json(post);
          return;
      }
    });
};

PostController.prototype.authorize = function (req, res, next) {
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
        req.post = decoded.post;
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

function generateToken(post) {
  // Remove password property from post object
  // _.omit doesn't work for mongoose object
  post = _.pick(post, '_id', 'title' ,'description');
  var payload = {
    post: post,
    iat: new Date().getTime(),
    exp: moment().add(7, 'days').valueOf()
  };
  return jwt.encode(payload, tokenSecret);
}

module.exports = new PostController();
