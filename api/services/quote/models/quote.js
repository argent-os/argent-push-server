var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var mongoose = require('mongoose');

var QuoteSchema = new mongoose.Schema({
    taxRate: { type: Number },
    name: { type: String },
    dateCreated: { type: Date },
    customerFirstName: { type: String },
    customerLastName: { type: String },
    customerEmail: { type: String },
    startDate: { type: String },
    endDate: { type: String },
    orgId: { type: String },
    userId: { type: String }, 
    calculatedGrandTotal: { type: Number },        
    projectId: { type: String },     
    projectStart: { type: String }, 
    projectEnd: { type: String },
    projectBillRate: { type: String },
    status: { type: Boolean }
});

QuoteSchema.pre('remove', function(quote,next) {
    // 'this' is the client being removed. Provide callbacks here if you want
    // to be notified of the calls' result.
    Quote.remove({_id: quote._id}).exec();
    // console.log('%s has been removed', quote._id);
    next();
});

module.exports = mongoose.model('Quote', QuoteSchema);
