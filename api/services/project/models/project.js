var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var ProjectSchema = new mongoose.Schema({
  name: { type: String }
});

module.exports = mongoose.model('Project', ProjectSchema);
