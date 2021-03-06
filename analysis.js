/**
 * server.js
 *
 * Node server configuration and express framework
 * 
 * DEPENDENCIES:
 *   express
 *   jade
 *   express-validator
 *   validator
 *   mongodb
 *   request
 *   natural
 *   google
 *   readability
 *   WNdb
 *   pos
 * 
 */

/*
 * EXPRESS SERVER CONFIGURATION
 */
var express = require('express'),
    fs = require('fs'),
    interfacePort = 4000,
    analysisPort = 4001,
    
    app = module.exports = express(),
    expressValidator = require("express-validator"),
    validator = require("validator"),
    natural = require("natural"),
    WNdb = require("WNdb"),
    pos = require("pos"),
    sanitize = validator.sanitize,
    security = {},
    dao,
    controllers,
    lda,
    topicModeler,
    PatternStuff,
    Pattern,
    PatternContainer,
    tools,
    
    // Status holds all the constants to be used throughout the application
    status = {
      // Site development variables
      siteRoot: __dirname + '/src/main/public',
      interfacePort: interfacePort,
      analysisPort: analysisPort,
      
      // This server instance's job
      ROLE: "analysis"
    },
    
    // Layout config
    layoutConfig = {},
    
    // Admin stuff
    adminAccounts = [
      "admin"
    ];
    
app.configure(function () {
  app.set('views', __dirname + '/src/main/views');
  app.set('view engine', 'jade');
  app.set('view options', {
    layout: false
  });
  app.use(express.bodyParser({limit: '50mb'}));
  app.use(expressValidator());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(express.session({
    secret: process.env.FMD_SSL_SECRET,
    cookie: {
      maxAge: 5 * 24 * 60 * 60 * 1000 // Cookies expire in 5 days
    }
  }));
  app.use(app.router);
  app.use(express.compress());
  app.use(express['static'](status.siteRoot));
});

app.configure('development', function () {
  app.use(express.errorHandler({
    dumpExceptions: true,
    showStack: true
  }));
});

app.configure('production', function () {
  app.use(express.errorHandler());
});


/*
 * UTILITY CONFIG
 */

expressValidator.Validator.prototype.sanitary = function () {
  if (!(sanitize(this.str).xss() === this.str) && !/<(?:.|\n)*?>/.test(this.str) && this.str.length < 5000) {
    this.error("Illegal characters or text found in input.");
  }
  
  return this;
};

layoutConfig = require('./src/main/conf/layout-config.js')(layoutConfig).layoutConfig;
dao          = require('./src/main/conf/db-config.js')().dao;
security     = require('./src/main/conf/security-config.js')(layoutConfig, status).security;
lda          = require('./src/main/conf/lda-config.js')().lda;
topicModeler = require('./src/main/conf/topic-modeler-config.js')(lda).$TM;
PatternStuff = require('./src/main/conf/pattern-config.js')(natural, WNdb, pos, status);
Pattern      = PatternStuff.Pattern;
PatternCont  = PatternStuff.PatternContainer;


/*
 * CONTROLLERS
 */

// Tools are custom and node modules used by the controllers to route effectively
tools = {
  // Custom modules first...
  app: app,
  security: security,
  dao: dao,
  layoutConfig: layoutConfig,
  status: status,
  Pattern: Pattern,
  PatternContainer: PatternCont,
  $TM: topicModeler,
  
  // Followed by node modules that have already been loaded...
  fs: fs,
  expressValidator: expressValidator,
  validator: validator,
  natural: natural,
  WNdb: WNdb,
  pos: pos,
  
  // Followed by node modules that haven't yet been loaded!
  mongodb: require("mongodb"),
  GridFSStream: require("gridfs-stream"),
  request: require("request")
},

controllers = [
  './src/main/controllers/analysis-controller.js'
];

for (var c in controllers) {
  require(controllers[c])(tools);
}

/*
 * MIDDLEWEAR
 */

/*
// Error catcher
app.use(function(req, res){ 
  if (security.accessCheck(req, "all", res, "render")) {
    res.render('interface/404', layoutConfig.layoutOptions(req));
  }
});
*/

/*
 * SERVER START
 */
app.listen((status.ROLE === "interface") ? interfacePort : analysisPort);
console.log('[!] ' + new Date().toDateString() + ': Express server listening on port in %s mode', app.settings.env);

