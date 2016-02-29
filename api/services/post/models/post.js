var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var mongoose = require('mongoose');

var PostSchema = new mongoose.Schema({
  id: { type: String, unique: true, trim: true },
  date: { type: String },
  title: { type: String },
  description: { type: String }
});

PostSchema.pre('remove', function(post,next) {
    // 'this' is the client being removed. Provide callbacks here if you want
    // to be notified of the calls' result.
    Post.remove({_id: post._id}).exec();
    // console.log('%s has been removed', post._id);
    next();
});

module.exports = mongoose.model('Post', PostSchema);
