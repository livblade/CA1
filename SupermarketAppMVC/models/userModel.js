const mysql = require('mysql2');
const crypto = require('crypto');

// create a local pool (mirrors productModel credentials)
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'Republic_C207',
  database: 'c372_supermarketdb',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

function runQuery(sql, params, cb) {
  if (typeof cb === 'function') {
    pool.query(sql, params, (err, results) => cb(err, results));
    return;
  }
  return new Promise((resolve, reject) => {
    pool.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
}

module.exports = {
    // Return all users
    getAllUsers: (callback) => {
        const sql = 'SELECT * FROM users';
        return runQuery(sql, [], callback);
    },

    // Return one user by id
    getUserById: (usersId, callback) => {
        const sql = 'SELECT * FROM users WHERE usersId = ?';
        return runQuery(sql, [usersId], callback);
    },

    // Add a user. Password expected to be already hashed (SHA1).
    addUser: (username, email, passwordHash, address, contact, role, image, callback) => {
        const sql = 'INSERT INTO users (username, email, password, address, contact, role, image) VALUES (?, ?, ?, ?, ?, ?, ?)';
        return runQuery(sql, [username, email, passwordHash, address, contact, role, image], callback);
    },

    // Update user (password not updated here unless caller passes a different hash)
    updateUser: (usersId, username, email, passwordHash, address, contact, role, image, callback) => {
        const sql = `UPDATE users SET 
            username = ?, email = ?, password = COALESCE(NULLIF(?, ''), password),
            address = ?, contact = ?, role = ?, image = ?
            WHERE usersId = ?`;
        return runQuery(sql, [username, email, passwordHash || null, address, contact, role, image, usersId], callback);
    },

    deleteUser: (usersId, callback) => {
        const sql = 'DELETE FROM users WHERE usersId = ?';
        return runQuery(sql, [usersId], callback);
    },

    // Authenticate by email + password (accepts raw password or already-hashed SHA1).
    // If password looks like 40-hex chars, treat as hashed; otherwise hash with SHA1.
    getUserByEmailAndPassword: (email, password, callback) => {
        try {
            let pwdHash = password || '';
            if (!/^[a-f0-9]{40}$/i.test(pwdHash)) {
                pwdHash = crypto.createHash('sha1').update(password || '').digest('hex');
            }
            const sql = 'SELECT * FROM users WHERE email = ? AND password = ? LIMIT 1';
            return runQuery(sql, [email, pwdHash], (err, results) => {
                if (err) {
                    if (typeof callback === 'function') return callback(err);
                    throw err;
                }
                const user = Array.isArray(results) ? results[0] : results;
                if (typeof callback === 'function') return callback(null, user);
                return user;
            });
        } catch (err) {
            if (typeof callback === 'function') return callback(err);
            return Promise.reject(err);
        }
    }
};