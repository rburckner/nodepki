/**
 * Validator for API inputs
 * Utilizes AJV
 */

const log = require('fancy-log');

const Ajv = require('ajv').default;
const ajv = new Ajv({allErrors: true});


const validator = {};

validator.checkAPI = function (schema, data) {
  const valid = ajv.validate(schema, data);

  if (valid) {
    return {success: true};
  } else {
    const errors = [];

    ajv.errors.forEach(function (error) {
      const message = '';

      switch (error.keyword) {
        case 'required':
          // requirement not fulfilled.
          message = 'Property \'' + error.params.missingProperty + '\' is missing.';
          break;
        case 'type': message = 'Wrong type: ' + error.dataPath + ' ' + error.message;
          break;
        default: message = 'Unknown input error. :(';
      }

      const pusherror = {
        message: message
      }

      errors.push(pusherror);
    });

    return {success: false, errors: errors};
  }
};


module.exports = validator;
