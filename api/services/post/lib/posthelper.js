var Post = require('../models/post');
var async = require('async');

exports.checkIfPostExists = function (post, data, callback) {
  var postQuery;
  // Post found - edit post
  if (post) {
    var postId = post._id;
    postQuery = Post.findOne({title: data.title, _id: {$ne: postId}});
  }
  else {
    postQuery = Post.findOne({title: data.title});
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
    return 'post_uniq';
  }
}
