/*
 * NodePKI
 * ... a NodeJS-based OpenSSL PKI management server.
 * Originally developed by Thomas Leister for ADITO GmbH.
 * NodePKI is published under MIT License.
 *
 * NodePKI startup file
 * Loads config, prepares CertDB database, starts OCSP server, initializes and starts HTTP server and API.
 */

const exec = require("child_process").exec;
const util = require("util");
const fs = require("fs-extra");
const yaml = require("js-yaml");
const log = require("fancy-log");
const express = require("express");
const figlet = require("figlet");
const commandExists = require("command-exists").sync;
const http = require("http");
const bodyparser = require("body-parser");
const path = require("path");

const api = require("./api");
const publicDl = require("./publicDl.js");
const certdb = require("./certdb.js");
const ocsp = require("./ocsp-server.js");
const crl = require("./crl.js");
const fingerprint = require("./cert_fingerprint.js");
const genpki = require("./genpki");

const app = express();

/***************
 * Start server *
 ***************/

log.info("NodePKI is starting up ...");

console.log(figlet.textSync("NodePKI", {}));
console.log("  By ADITO Software GmbH\n\n");

// Base Base path of the application
const DATA_DIR =
  typeof process.env.DATA_DIR !== "undefined"
    ? path.resolve(__dirname, "..", process.env.DATA_DIR)
    : path.join(__dirname, "..", "data");
global.paths = {
  basepath: path.join(__dirname, ".."),
  tempdir: path.join(__dirname, "..", "tmp"),
};
global.paths.datapath = DATA_DIR;
global.paths.pkipath = path.join(global.paths.datapath, "pki");

new Promise(function (resolve, reject) {
  // Checks environment
  /*
   * Make sure there is a config file config.yml
   */
  if (fs.existsSync(path.join(global.paths.datapath, "config/config.yml"))) {
    log.info("Reading config file data/config/config.yml ...");
    global.config = yaml.load(
      fs.readFileSync(
        path.join(global.paths.datapath, "config/config.yml"),
        "utf8"
      )
    );

    /*
     * Check if the openssl command is available
     */

    if (commandExists("openssl") === false) {
      log("openssl command is not available. Please install openssl.");
      reject();
    } else {
      /*
       * Check if there is a PKI directory with all the OpenSSL content.
       */

      fs.ensureDir(global.paths.pkipath);
      if (fs.existsSync(path.join(global.paths.pkipath, "created")) === false) {
        log("There is no PKI available. Creating PKI ...");

        genpki
          .create()
          .then(function () {
            log(">>>>>> CA has successfully been created! :-) <<<<<<");
            resolve();
          })
          .catch(function (err) {
            reject(err);
          });
      } else {
        resolve();
      }
    }
  } else {
    // There is no config file yet. Create one from config.yml.default and quit server.
    log("No custom config file 'data/config/config.yml' found.");
    fs.ensureDirSync(path.join(global.paths.datapath, "config"));
    fs.copySync(
      path.join(global.paths.basepath, "src/config.default.yml"),
      path.join(global.paths.datapath, "config/config.yml")
    );
    log("Default config file was copied to data/config/config.yml.");
    console.log(
      "\
        **********************************************************************\n\
        ***   Please customize data/config/config.yml according to your    ***\n\
        ***                 environment and restart script.                ***\n\
        **********************************************************************"
    );

    log("Server will now quit.");
    reject();
  }
})
  .then(function () {
    // Ensure tmp dir
    fs.ensureDir(global.paths.tempdir);

    // Make sure DB file exists ...
    fs.ensureFileSync(path.join(global.paths.basepath, "user.db"));

    // Re-index cert database
    certdb
      .reindex()
      .then(function () {
        /*
         * Start HTTP server
         */ app.use("/api", bodyparser.json()); // JSON body parser for /api/ paths

        const server = app.listen(
          global.config.server.http.port,
          global.config.server.ip,
          function () {
            const host = server.address().address;
            const port = server.address().port;

            log.info(
              ">>>>>> HTTP server is listening on " +
                host +
                ":" +
                port +
                " <<<<<<"
            );
          }
        );

        log.info("Registering API endpoints");
        api.initAPI(app);
        publicDl.initPublicDl(app);
      })
      .catch(function (error) {
        log.error("Could not initialize CertDB index: " + error);
      });

    // Start OCSP server
    ocsp
      .startServer()
      .then(function () {
        log.info("OCSP-Server is running");
      })
      .catch(function (error) {
        log.error("Could not start OCSP server: " + error);
      });

    // Show Root Cert fingerprint
    fingerprint
      .getFingerprint(path.join(global.paths.pkipath, "root/root.cert.pem"))
      .then(function (fingerprint_out) {
        log(">>>>>> Root CA Fingerprint: " + fingerprint_out);
      })
      .catch(function (err) {
        log.error("Could not get Root CA fingerprint!");
      });

    /*
     * CRL renewal cronjob
     */
    const crlrenewint = 1000 * 60 * 60 * 24; // 24h
    setInterval(crl.createCRL, crlrenewint);

    log("Server started.");
  })
  .catch(function (err) {
    log("Server not started.");
    if (err != undefined) {
      log("Error: " + err);
    }
    process.exit();
  });

/*********************************
 * Server stop routine and events *
 *********************************/

const stopServer = function () {
  log("Received termination signal.");
  log("Stopping OCSP server ...");
  ocsp.stopServer();

  log("Bye!");
  process.exit();
};

process.on("SIGINT", stopServer);
process.on("SIGHUP", stopServer);
process.on("SIGQUIT", stopServer);
