/**
 * Script generates OpenSSL PKI based on the configuration in config.yml
 */

var log = require("fancy-log");
var fs = require("fs-extra");
var yaml = require("js-yaml");
var exec = require("child_process").exec;
const path = require("path");

// Absolute pki base dir
let pkidir = path.join(__dirname, "data", "pki");

var PKIExists = function () {
  fs.ensureDir(pkidir);

  if (fs.existsSync(path.join(pkidir, "created"))) {
    return true;
  } else {
    return false;
  }
};

var createFileStructure = function () {
  log(">>> Creating CA file structure");

  return new Promise(function (resolve, reject) {
    fs.ensureDirSync(pkidir);

    /*
     * Prepare root/ dir
     */

    fs.ensureDirSync(path.join(pkidir, "root"));

    fs.ensureDirSync(path.join(pkidir, "root/certs"));
    fs.ensureDirSync(path.join(pkidir, "root/crl"));

    fs.writeFileSync(path.join(pkidir, "root/index.txt"), "", "utf8");
    fs.writeFileSync(path.join(pkidir, "root/serial"), "1000", "utf8");

    // Customize openssl.cnf and copy to root/

    openssl_root = fs.readFileSync(
      path.join(__dirname, "/pkitemplate/openssl_root.cnf.tpl"),
      "utf8"
    );
    openssl_root = openssl_root.replace(
      /{basedir}/g,
      path.join(pkidir, "root")
    );
    openssl_root = openssl_root.replace(/{days}/g, global.config.ca.root.days);
    openssl_root = openssl_root.replace(
      /{country}/g,
      global.config.ca.root.country
    );
    openssl_root = openssl_root.replace(
      /{state}/g,
      global.config.ca.root.state
    );
    openssl_root = openssl_root.replace(
      /{locality}/g,
      global.config.ca.root.locality
    );
    openssl_root = openssl_root.replace(
      /{organization}/g,
      global.config.ca.root.organization
    );
    openssl_root = openssl_root.replace(
      /{commonname}/g,
      global.config.ca.root.commonname
    );

    fs.writeFileSync(path.join(pkidir, "root/openssl.cnf"), openssl_root);

    /*
     * Prepare intermediate/ dir
     */

    fs.ensureDirSync(path.join(pkidir, "intermediate"));

    fs.ensureDirSync(path.join(pkidir, "intermediate/certs"));
    fs.ensureDirSync(path.join(pkidir, "intermediate/crl"));

    fs.writeFileSync(path.join(pkidir, "intermediate/index.txt"), "", "utf8");
    fs.writeFileSync(path.join(pkidir, "intermediate/serial"), "1000", "utf8");
    fs.writeFileSync(
      path.join(pkidir, "intermediate/crlnumber"),
      "1000",
      "utf8"
    );

    // Customize openssl.cnf and copy to root/

    openssl_intermediate = fs.readFileSync(
      path.join(__dirname, "/pkitemplate/openssl_intermediate.cnf.tpl"),
      "utf8"
    );
    openssl_intermediate = openssl_intermediate.replace(
      /{basedir}/g,
      path.join(pkidir, "intermediate")
    );
    openssl_intermediate = openssl_intermediate.replace(
      /{days}/g,
      global.config.ca.intermediate.days
    );
    openssl_intermediate = openssl_intermediate.replace(
      /{country}/g,
      global.config.ca.intermediate.country
    );
    openssl_intermediate = openssl_intermediate.replace(
      /{state}/g,
      global.config.ca.intermediate.state
    );
    openssl_intermediate = openssl_intermediate.replace(
      /{locality}/g,
      global.config.ca.intermediate.locality
    );
    openssl_intermediate = openssl_intermediate.replace(
      /{organization}/g,
      global.config.ca.intermediate.organization
    );
    openssl_intermediate = openssl_intermediate.replace(
      /{commonname}/g,
      global.config.ca.intermediate.commonname
    );
    openssl_intermediate = openssl_intermediate.replace(
      /{ocspurl}/g,
      global.config.ca.intermediate.ocsp.url
    );
    openssl_intermediate = openssl_intermediate.replace(
      /{crlurl}/g,
      global.config.ca.intermediate.crl.url
    );
    fs.writeFileSync(
      path.join(pkidir, "intermediate/openssl.cnf"),
      openssl_intermediate
    );

    /*
     * Prepare intermediate/ocsp dir
     */
    fs.ensureDirSync(path.join(pkidir, "intermediate/ocsp"));
    openssl_intermediate_ocsp = fs.readFileSync(
      path.join(__dirname, "/pkitemplate/openssl_ocsp.cnf.tpl"),
      "utf8"
    );
    openssl_intermediate_ocsp = openssl_intermediate_ocsp.replace(
      /{state}/g,
      global.config.ca.intermediate.state
    );
    openssl_intermediate_ocsp = openssl_intermediate_ocsp.replace(
      /{country}/g,
      global.config.ca.intermediate.country
    );
    openssl_intermediate_ocsp = openssl_intermediate_ocsp.replace(
      /{locality}/g,
      global.config.ca.intermediate.locality
    );
    openssl_intermediate_ocsp = openssl_intermediate_ocsp.replace(
      /{organization}/g,
      global.config.ca.intermediate.organization
    );
    openssl_intermediate_ocsp = openssl_intermediate_ocsp.replace(
      /{commonname}/g,
      global.config.server.ocsp.domain
    );
    fs.writeFileSync(
      path.join(pkidir, "intermediate/ocsp/openssl.cnf"),
      openssl_intermediate_ocsp
    );

    /*
     * Prepare apicert configuration
     */
    fs.ensureDirSync(path.join(pkidir, "apicert"));
    openssl_apicert = fs.readFileSync(
      path.join(__dirname, "/pkitemplate/openssl_apicert.cnf.tpl"),
      "utf8"
    );
    openssl_apicert = openssl_apicert.replace(
      /{state}/g,
      global.config.ca.root.state
    );
    openssl_apicert = openssl_apicert.replace(
      /{country}/g,
      global.config.ca.root.country
    );
    openssl_apicert = openssl_apicert.replace(
      /{locality}/g,
      global.config.ca.root.locality
    );
    openssl_apicert = openssl_apicert.replace(
      /{organization}/g,
      global.config.ca.root.organization
    );
    openssl_apicert = openssl_apicert.replace(
      /{commonname}/g,
      global.config.server.http.domain
    );
    fs.writeFileSync(path.join(pkidir, "apicert/openssl.cnf"), openssl_apicert);

    resolve();
  });
};

var createRootCA = function () {
  log(">>> Creating Root CA");

  return new Promise(function (resolve, reject) {
    // Create root key
    exec(
      "openssl genrsa -aes256 -out root.key.pem -passout pass:" +
        global.config.ca.root.passphrase +
        " 4096",
      {
        cwd: path.join(pkidir, "root"),
      },
      function () {
        // Create Root certificate
        exec(
          "openssl req -config openssl.cnf -key root.key.pem -new -x509 -days " +
            global.config.ca.root.days +
            " -sha256 -extensions v3_ca -out root.cert.pem -passin pass:" +
            global.config.ca.root.passphrase,
          {
            cwd: path.join(pkidir, "root"),
          },
          function () {
            resolve();
          }
        );
      }
    );
  });
};

var createIntermediateCA = function () {
  log(">>> Creating Intermediate CA");

  return new Promise(function (resolve, reject) {
    // Create intermediate key
    exec(
      "openssl genrsa -aes256 -out intermediate.key.pem -passout pass:" +
        global.config.ca.intermediate.passphrase +
        " 4096",
      {
        cwd: path.join(pkidir, "intermediate"),
      },
      function () {
        // Create intermediate certificate request
        exec(
          "openssl req -config openssl.cnf -new -sha256 -key intermediate.key.pem -out intermediate.csr.pem -passin pass:" +
            global.config.ca.intermediate.passphrase,
          {
            cwd: path.join(pkidir, "intermediate"),
          },
          function () {
            // Create intermediate certificate
            exec(
              "openssl ca -config ../root/openssl.cnf -extensions v3_intermediate_ca -days " +
                global.config.ca.intermediate.days +
                " -notext -md sha256 -in intermediate.csr.pem -out intermediate.cert.pem -passin pass:" +
                global.config.ca.root.passphrase +
                " -batch",
              {
                cwd: path.join(pkidir, "intermediate"),
              },
              function () {
                // Remove intermediate.csr.pem file
                fs.removeSync(
                  path.join(pkidir, "intermediate/intermediate.csr.pem")
                );

                // Create CA chain file
                // Read intermediate
                intermediate = fs.readFileSync(
                  path.join(pkidir, "intermediate/intermediate.cert.pem"),
                  "utf8"
                );
                // Read root cert
                root = fs.readFileSync(
                  path.join(pkidir, "root/root.cert.pem"),
                  "utf8"
                );
                cachain = intermediate + "\n\n" + root;
                fs.writeFileSync(
                  path.join(pkidir, "intermediate/ca-chain.cert.pem"),
                  cachain
                );
                resolve();
              }
            );
          }
        );
      }
    );
  });
};

var createOCSPKeys = function () {
  log(">>> Creating OCSP Keys");

  return new Promise(function (resolve, reject) {
    // Create key
    exec(
      "openssl genrsa -aes256 -out ocsp.key.pem -passout pass:" +
        global.config.ca.intermediate.ocsp.passphrase +
        " 4096",
      {
        cwd: path.join(pkidir, "intermediate", "ocsp"),
      },
      function () {
        // Create request
        exec(
          "openssl req -config openssl.cnf -new -sha256 -key ocsp.key.pem -passin pass:" +
            global.config.ca.intermediate.ocsp.passphrase +
            " -out ocsp.csr.pem",
          {
            cwd: path.join(pkidir, "intermediate", "ocsp"),
          },
          function () {
            // Create certificate
            exec(
              "openssl ca -config ../openssl.cnf -extensions ocsp -days 3650 -notext -md sha256 -in ocsp.csr.pem -out ocsp.cert.pem -passin pass:" +
                global.config.ca.intermediate.passphrase +
                " -batch",
              {
                cwd: path.join(pkidir, "intermediate", "ocsp"),
              },
              function () {
                fs.removeSync(
                  path.join(pkidir, "intermediate/ocsp/ocsp.csr.pem")
                );
                resolve();
              }
            );
          }
        );
      }
    );
  });
};

/*
 * Creates server certificate pair for HTTP API
 * Directly form Root CA
 */
var createAPICert = function () {
  log(">>> Creating HTTPS API certificates");

  return new Promise(function (resolve, reject) {
    // Create key
    exec(
      "openssl genrsa -out key.pem 4096",
      {
        cwd: path.join(pkidir, "apicert"),
      },
      function () {
        // Create request
        exec(
          "openssl req -config openssl.cnf -new -sha256 -key key.pem -out csr.pem",
          {
            cwd: path.join(pkidir, "apicert"),
          },
          function () {
            // Create certificate
            exec(
              "openssl ca -config ../root/openssl.cnf -extensions server_cert -days 3650 -notext -md sha256 -in csr.pem -out cert.pem -passin pass:" +
                global.config.ca.root.passphrase +
                " -batch",
              {
                cwd: path.join(pkidir, "apicert"),
              },
              function () {
                fs.removeSync(path.join(pkidir, "apicert/csr.pem"));
                resolve();
              }
            );
          }
        );
      }
    );
  });
};

/*
 * Sets correct file permissions for CA files
 */
var setFilePerms = function () {
  log(">>> Setting file permissions");

  return new Promise(function (resolve, reject) {
    // Root CA
    fs.chmodSync(path.join(pkidir, "root/root.key.pem"), fs.constants.S_IRUSR);
    fs.chmodSync(
      path.join(pkidir, "root/root.cert.pem"),
      fs.constants.S_IRUSR | fs.constants.S_IRGRP | fs.constants.S_IROTH
    );
    fs.chmodSync(path.join(pkidir, "root/openssl.cnf"), fs.constants.S_IRUSR);

    // Intermediate CA
    fs.chmodSync(
      path.join(pkidir, "intermediate/intermediate.key.pem"),
      fs.constants.S_IRUSR
    );
    fs.chmodSync(
      path.join(pkidir, "intermediate/intermediate.cert.pem"),
      fs.constants.S_IRUSR | fs.constants.S_IRGRP | fs.constants.S_IROTH
    );
    fs.chmodSync(
      path.join(pkidir, "intermediate/openssl.cnf"),
      fs.constants.S_IRUSR
    );

    resolve();
  });
};

module.exports.create = function () {
  pkidir = global.paths.pkipath || pkidir;

  return new Promise(function (resolve, reject) {
    createFileStructure()
      .then(function () {
        createRootCA()
          .then(function () {
            createIntermediateCA()
              .then(function () {
                createOCSPKeys()
                  .then(function () {
                    createAPICert()
                      .then(function () {
                        setFilePerms()
                          .then(function () {
                            log("### Finished!");

                            // Tag mypki as ready.
                            fs.writeFileSync(
                              path.join(pkidir, "created"),
                              "",
                              "utf8"
                            );
                            resolve();
                          })
                          .catch(function (err) {
                            reject("Error: " + err);
                          });
                      })
                      .catch(function (err) {
                        reject("Error: " + err);
                      });
                  })
                  .catch(function (err) {
                    reject("Error: " + err);
                  });
              })
              .catch(function (err) {
                reject("Error: " + err);
              });
          })
          .catch(function (err) {
            reject("Error: " + err);
          });
      })
      .catch(function (err) {
        reject("Error: " + err);
      });
  });
};
