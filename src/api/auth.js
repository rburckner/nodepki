const log = require('fancy-log');
const validator = require('../validator.js');
const authMod = require('../auth.js');

const auth = {};


/*
 * Response helper function for nicer code :)
 */
function respond(res, resobj) {
  resobj.end(JSON.stringify(res))
}


function wrongAPISchema(apierrors, res) {
  const errors = []

  apierrors.forEach(function (apierror) {
    errors.push({code: 100, message: apierror.message});
  });

  const resobj = {
    success: false,
    errors: errors
  }

  res.end(JSON.stringify(resobj))
};


auth.check = function (req, res) { // Validate user input
  const schema = {
    "properties": {
      "auth": {
        "type": "object",
        "properties": {
          "username": {
            "type": "string"
          },
          "password": {
            "type": "string"
          }
        },
        "required": ["username", "password"]
      }
    },
    "required": ["auth"]
  }

  // Check API conformity
  const check = validator.checkAPI(schema, req.body)
  if (check.success === false) {
    wrongAPISchema(check.errors, res);
    return;
  }

  const auth = req.body.auth;

  // Check access
  if (authMod.checkUser(auth.username, auth.password) === false) {
    respond({
      success: true,
      data: {
        valid: false
      }
    }, res);
  } else {
    respond({
      success: true,
      data: {
        valid: true
      }
    }, res);
  }
}


module.exports = {
  auth: auth
}
