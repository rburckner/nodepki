/*
 * Creates CRL
 */

const spawn = require("child_process").spawn;
const log = require("fancy-log");
const fs = require("fs-extra");
const path = require("path");

/*
 * Creates / updates CRL and overwrites old version.
 */
const createCRL = function () {
  crl = spawn(
    "openssl",
    ["ca", "-config", "openssl.cnf", "-gencrl", "-out", "crl/crl.pem"],
    {
      cwd: path.join(global.paths.pkipath, "intermediate"),
      shell: true,
      detached: true,
    }
  );

  // Enter ocsp private key password
  crl.stdin.write(global.config.ca.intermediate.passphrase + "\n");

  crl.on("error", function (error) {
    log("Error during crl generation: " + error);
  });

  crl.on("exit", function (code, signal) {
    if (code === 0) {
      log("CRL successfully created");
    } else {
      log.error("Error during CRL creation");
    }
  });
};

module.exports = {
  createCRL: createCRL,
};
