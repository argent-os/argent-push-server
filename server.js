// Init
var express        = require('express');
var path           = require('path');
var favicon        = require('serve-favicon');
var logger         = require('morgan');
var cookieParser   = require('cookie-parser');
var bodyParser     = require('body-parser');
var expressSession = require('express-session');
var port           = process.env.PORT || 5001;

// Mongo
var uriUtil        = require('mongodb-uri');
var mongoose       = require('mongoose');
var mongodbUri     = process.env.MONGOLAB_URI;
var mongooseUri    = uriUtil.formatMongoose(mongodbUri) + '/praxicorp';
var localMongo     = 'mongodb://localhost:27017/praxicorp';    
// *****************************************************************************
// ***  HOWTO: Create local mongo instance to play with API locally  *****
// ***  sudo mkdir -p data/db  *****
// ***  sudo chmod -R 0777 data/db  *****
// ***  sudo mongod --dbpath data/db  *****
// ***  mongo-express -u user -p password -d database ******
// ***  to kill mongo db process use: ps -ef | grep mongod ***
// ***  then: sudo kill -9 <pid> // for example sudo kill -9 12912 ****
// *****************************************************************************

//Compression
var h5bp           = require('h5bp');
var compress       = require('compression');    

// *****************************************************************************
// ***  Server startup in api/services/auth/lib/express-jwt-auth  *****
// *****************************************************************************

var app = express();


// Key Stripe and Firebase Handlers for DEV vs PROD
process.env.ENVIRONMENT == 'DEV' ? mongooseUri = 'mongodb://localhost:27017/praxicorp' : '';
process.env.ENVIRONMENT == 'PROD' ? mongooseUri =process.env.MONGOLAB_URI : '';


console.log('Running in ' + process.env.ENVIRONMENT + ' mode');
console.log('Database ' + mongooseUri);

process.env.ENVIRONMENT == 'DEV' || process.env.ENVIRONMENT == undefined ? stripeApiKey = process.env.STRIPE_TEST_KEY : '';
process.env.ENVIRONMENT == 'DEV' || process.env.ENVIRONMENT == undefined ? stripePublishableKey = process.env.STRIPE_TEST_PUB_KEY : '';
process.env.ENVIRONMENT == 'PROD' ? stripeApiKey = process.env.STRIPE_KEY : '';
process.env.ENVIRONMENT == 'PROD' ? stripePublishableKey = process.env.STRIPE_PUB_KEY : '';

console.log('Utilizing Stripe Key in ' + process.env.ENVIRONMENT + ' mode');

var firebaseUrl;
var firebaseSecret;
process.env.ENVIRONMENT == 'DEV' || process.env.ENVIRONMENT == undefined ? firebaseUrl = process.env.FIREBASE_DEV_URL : '';
process.env.ENVIRONMENT == 'PROD' ? firebaseUrl = process.env.FIREBASE_URL : '';
process.env.ENVIRONMENT == 'DEV' || process.env.ENVIRONMENT == undefined ? firebaseSecret = process.env.FIREBASE_DEV_SECRET : '';
process.env.ENVIRONMENT == 'PROD' ? firebaseSecret = process.env.FIREBASE_SECRET : '';

console.log('Firebase URL ' + firebaseUrl + ' with proper secrets in ' + process.env.ENVIRONMENT + ' mode');

var apiUrl;
process.env.ENVIRONMENT == 'DEV' || process.env.ENVIRONMENT == undefined ? apiUrl = process.env.API_DEV_URL : '';
process.env.ENVIRONMENT == 'PROD' ? apiUrl = process.env.API_URL : apiUrl = process.env.API_DEV_URL;

console.log('API URL ' + apiUrl + ' in ' + process.env.ENVIRONMENT + ' mode');

var options = {
  //mongoconnection: localMongo || mongooseUri,
  mongoconnection: mongooseUri,
  logFile: path.join(__dirname, 'authlogger.log'),
  corsDomains: ['*', 'http://localhost:5000', 'http://paykloud.herokuapp.com', 'https://paykloud.herokuapp.com', 'https://www.paykloud.com'],
  // Nodemailer settings, used for resetting password
  mailer: {
    mailerFrom    : process.env.SUPPORT_EMAIL,
    passwordResetTitle   : 'Password Reset',
    verifyEmailTitle   : 'Verify Account for PayKloud',
    verifyEmailLinkText   : 'Welcome to PayKloud!  Please verify your email using the following link: ',
    quoteEmailTitle: 'Quote created',  
    quoteEmailTextLink: 'Please use the following link to accept or reject proposal ',
    mailerInfo    : 'Hello! ',
    resetPasswordText    : 'Hello from PayKloud! Please use the following link to reset your password: ',
    transporter   : {
      service: 'Gmail',
      auth: {
        user: process.env.PAYKLOUD_GMAIL,
        pass: process.env.PAYKLOUD_GMAIL_PW
      }
    }
  }
};

// Setup API routes
var home         = require('./api/routes/home');
var timeauth     = require('./api/services/auth')(app, options);
var timepost     = require('./api/services/post')(app, options);
var timeorg      = require('./api/services/organization')(app, options);
var timecompany  = require('./api/services/company')(app, options);
var timesheet    = require('./api/services/timesheet')(app, options);
var quote        = require('./api/services/quote')(app, options);

app.use(express.static(path.join(__dirname, 'api/web')));
app.use(express.static('src'));
app.use('/bower_components',  express.static('bower_components'));
app.use('/', home);

app.use(h5bp({ root: __dirname + '/src' }));
app.use(compress());

// view engine setup
app.set('views', path.join(__dirname, 'api/web/views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
app.use(favicon(__dirname + '/public/favicon.ico'));
// app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.all('*', function(req, res, next) {  
    // Send the index.html for other files to support HTML5Mode
    res.sendFile('src/index.html', { root: __dirname });
    // req.session.timestamp = Date.now();    
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With, Accept, Origin, Referer, User-Agent, Content-Type, Authorization', req.headers['access-control-request-headers']);
    if ('OPTIONS' == req.method) return res.send(204);
    next();    
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// https handler
// app.use(function(req, res, next) {
//     if((!req.secure) && (req.get('X-Forwarded-Proto') !== 'https')) {
//         res.redirect('https://' + req.get('Host') + req.url);
//     }
//     else
//         next();
// });

// error handlers, development error handler, will print stacktrace
if (process.env.ENVIRONMENT === 'DEV' || process.env.ENVIRONMENT == undefined) {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler, no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.statusCode=500;
    // res.render('error', {
    //     message: err.message,
    //     error: {}
    // });
});

// Sessions
var expressSession = require('express-session')
  , cookieParser = require('cookie-parser')
  , http = require('http');

//
// Create an HTTP server.
//
var server = http.createServer(app).listen(port);

server.on("close", function() {
    process.exit();
});

module.exports = app;


