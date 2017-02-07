/*
 * nodepki is a certificate manager
 */

var exec = require('child_process').exec;
var util = require('util');
var fs = require('fs');
var yaml = require('js-yaml');
var log = require('fancy-log');

var express = require('express');
var app = express();

var api = require('./api.js');
var certdb = require('./certdb.js');
var ocsp = require('./ocsp-server.js');



/* * * * * * * * *
 * Server start  *
 * * * * * * * * */

log.info("NodePKI is starting up ...");

log.info("Reading config file ...");
global.config = yaml.safeLoad(fs.readFileSync('config.yml', 'utf8'));

// Base Base path of the application
global.paths = {
    basepath: __dirname + "/",
    pkipath: __dirname + "/mypki/",
    tempdir: __dirname + "/tmp/"
};


// Re-index cert database
certdb.reindex().then(function(){
    // Start HTTP server
    log.info("Starting HTTP server");
    var server = app.listen(global.config.server.port, global.config.server.ip, function() {
        var host = server.address().address;
        var port = server.address().port;

        log.info("Listening on " + host + ":" + port);
    });

    // Register API paths
    log.info("Registering API endpoints");
    api.initAPI(app);
}).catch(function(error){
    log.error("Could not initialize CertDB index: " + error);
});


// Start OCSP server
ocsp.startServer()
.then(function(){
    log.info("OCSP-Server started.");
})
.catch(function(error){
    log.error("Could not start OCSP server: " + error);
});


// STRG + C Event handler. (Shutdown Handler)
process.on('SIGINT', function(){
    log("Received SIGINT.");

    log("Stopping OCSP server ...");
    ocsp.stopServer();

    log("Bye!");
    process.exit();
})



// Export app var
module.exports = {
    app: app
};