/*
 * API registry for all HTTP API actions such as
 * GET, PUT, DELETE
 */

// 3rd party modules
const fs = require('fs')
const express = require('express')
const bodyparser = require('body-parser')

// Custom modules
const certapi = require('./certificate.js')
const caapi = require('./ca.js')
const authapi = require('./auth.js')


const apipath = '/api/v1';

/**
 * Initializes API paths.
 */
const initAPI = function (app) {
  app.post(apipath + '/certificate/request/', function (req, res) {
    certapi.certificate.request(req, res);
  });

  app.post(apipath + '/certificate/revoke/', function (req, res) {
    certapi.certificate.revoke(req, res);
  });

  app.post(apipath + '/ca/cert/get/', function (req, res) {
    caapi.cert.get(req, res);
  });

  app.post(apipath + '/certificates/list/', function (req, res) {
    certapi.certificates.list(req, res);
  });

  app.post(apipath + '/certificate/get/', function (req, res) {
    certapi.certificate.get(req, res);
  });

  app.post(apipath + '/auth/check/', function (req, res) {
    authapi.auth.check(req, res);
  });
};


// Export initAPI() function (called by server.js)
module.exports = {
  initAPI: initAPI
}
