/*
 * Auth module
 */

const crypto = require('crypto');
const fs = require('fs-extra');


/*
 * Checks login credentials
 * Input: Username, password (plain)
 */
const checkUser = function (username, password) {
  const hash = crypto.createHash('sha256').update(password).digest('base64');

  // Check if there is an entry with username:hash
  // ...
  const expected = username + ':' + hash;

  // Read password file
  const passfile = fs.readFileSync('data/user.db', 'utf8');
  const lines = passfile.split('\n');

  const found = false;
  lines.forEach(function (line) {
    if (line === expected) 
      found = true;
    
  });

  return found;
};


/*
 * Add a new user to DB
 */
const addUser = function (username, password) { // Make sure DB file exists ...
  fs.ensureFileSync('data/user.db');

  // Calc passhash
  const passhash = crypto.createHash('sha256').update(password).digest('base64');

  // Read existing file
  const passfile = fs.readFileSync('data/user.db', 'utf8');

  // Check if user alreadys exists
  const lines = passfile.split('\n');
  const found = false;
  lines.forEach(function (line) {
    const line_username = line.split(':')[0];
    if (line_username === username) 
      found = true;
    
  });

  if (found === false) { // Update file
    passfile = passfile + username + ':' + passhash + '\n';
    fs.writeFileSync('data/user.db', passfile, 'utf8');

    return true;
  } else {
    return false;
  }
};


/*
 * Delete user from DB
 */
const delUser = function (username) {
  fs.ensureFileSync('data/user.db');

  const passfile = fs.readFileSync('data/user.db', 'utf8');
  const lines = passfile.split('\n');
  const changed = false;

  const passfile_out = '';

  // Re-write file without user

  lines.forEach(function (line) {
    if (line !== '') {
      const line_username = line.split(':')[0];

      if (line_username !== username) {
        passfile_out += line + '\n'
      } else {
        changed = true;
      }
    }
  });

  fs.writeFileSync('data/user.db', passfile_out);

  return changed;
};


module.exports = {
  addUser: addUser,
  checkUser: checkUser,
  delUser: delUser
}
