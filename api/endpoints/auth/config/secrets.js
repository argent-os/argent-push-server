var stripeApiKey;
var stripePublishableKey;

// Production/Dev Stripe Handlers
process.env.ENVIRONMENT == 'DEV' || process.env.ENVIRONMENT == undefined ? stripeApiKey = process.env.STRIPE_TEST_KEY : '';
process.env.ENVIRONMENT == 'DEV' || process.env.ENVIRONMENT == undefined ? stripePublishableKey = process.env.STRIPE_TEST_PUB_KEY : '';
process.env.ENVIRONMENT == 'PROD' ? stripeApiKey = process.env.STRIPE_KEY : '';
process.env.ENVIRONMENT == 'PROD' ? stripePublishableKey = process.env.STRIPE_PUB_KEY : '';

process.env.ENVIRONMENT == 'DEV' || process.env.ENVIRONMENT == undefined ? mongooseUri = 'mongodb://localhost:27017/praxicorp' : '';
process.env.ENVIRONMENT == 'PROD' ? mongooseUri = process.env.MONGOLAB_URI : '';

module.exports = {

  // db: process.env.MONGODB || process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || 'mongodb://localhost:27017/stripe-membership',
  db: mongooseUri,

  sessionSecret: process.env.SESSION_SECRET || 'change this',

  mailgun: {
    user: process.env.MAILGUN_USER || 'sulkuatam@gmail.com',
    password: process.env.MAILGUN_PASSWORD || ''
  },

  stripeOptions: {
    apiKey: stripeApiKey,
    stripePubKey: stripePublishableKey,
    defaultPlan: 'free',
    plans: ['free', 'pro', 'team'],
    planData: {
      'free': {
        name: 'Free',
        price: 0
      },
      'pro': {
        name: 'Pro',
        price: 9
      },
      'team': {
        name: 'Team',
        price: 19
      }
    }
  },

  googleAnalytics: process.env.GOOGLE_ANALYTICS || ''
};
