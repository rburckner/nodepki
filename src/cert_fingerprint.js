const log = require('fancy-log');
const exec = require('child_process').exec;
const fs = require('fs-extra');

const getFingerprint = function (certfile) {
  return new Promise(function (resolve, reject) {
    exec('openssl x509 -noout -in ' + certfile + ' -fingerprint -sha256', {
      cwd: global.paths.basepath
    }, function (error, stdout, stderr) {
      const filter = /=([A-F0-9\:]*)/;
      const matches = filter.exec(stdout)
      const fingerprint = matches[1];
      resolve(fingerprint);
    });
  });
};

module.exports = {
  getFingerprint: getFingerprint
}
