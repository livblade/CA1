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
    getUserById: (id, callback) => {
        const sql = 'SELECT * FROM users WHERE id = ?';
        return runQuery(sql, [id], callback);
    },

    // Add a user. Password expected to be already hashed (SHA1).
    addUser: (username, email, passwordHash, address, contact, role, image, callback) => {
        const sql = 'INSERT INTO users (username, email, password, address, contact, role) VALUES (?, ?, ?, ?, ?, ?)';
        const params = [username, email, passwordHash, address, contact, role];
        
        console.log('=== DATABASE INSERT ATTEMPT ===');
        console.log('SQL:', sql);
        console.log('Params:', params);
        
        return runQuery(sql, params, (err, results) => {
            if (err) {
                console.error('Database insert error:', err);
            } else {
                console.log('Database insert successful:', results);
            }
            if (typeof callback === 'function') callback(err, results);
        });
    },

    // Update user (password not updated here unless caller passes a different hash)
    updateUser: (id, username, email, passwordHash, address, contact, role, image, callback) => {
        const sql = `UPDATE users SET 
            username = ?, email = ?, password = COALESCE(NULLIF(?, ''), password),
            address = ?, contact = ?, role = ?
            WHERE id = ?`;
        return runQuery(sql, [username, email, passwordHash || null, address, contact, role, id], callback);
    },

    deleteUser: (id, callback) => {
        const sql = 'DELETE FROM users WHERE id = ?';
        return runQuery(sql, [id], callback);
    },

    // Authenticate by email + password (accepts raw password or already-hashed SHA1).
    // If password looks like 40-hex chars, treat as hashed; otherwise hash with SHA1.
    getUserByEmailAndPassword: (email, password, callback) => {
        try {
            let pwdHash = password || '';
            // Hash the password if it's not already a 40-character hex string
            if (!/^[a-f0-9]{40}$/i.test(pwdHash)) {
                pwdHash = crypto.createHash('sha1').update(password || '').digest('hex');
            }
            
            console.log('Searching for user with email:', email);
            console.log('Password hash:', pwdHash);
            
            const sql = 'SELECT * FROM users WHERE email = ? AND password = ? LIMIT 1';
            return runQuery(sql, [email, pwdHash], (err, results) => {
                if (err) {
                    console.error('Database error during login:', err);
                    if (typeof callback === 'function') return callback(err);
                    throw err;
                }
                
                console.log('Query results:', results);
                
                // Return the first user found, or null if none
                const user = Array.isArray(results) && results.length > 0 ? results[0] : null;
                
                if (typeof callback === 'function') return callback(null, user);
                return user;
            });
        } catch (err) {
            console.error('Error in getUserByEmailAndPassword:', err);
            if (typeof callback === 'function') return callback(err);
            return Promise.reject(err);
        }
    },

    // NEW: searchUsers - search by username, email or id (as string)
    searchUsers: (searchTerm, callback) => {
      if (!searchTerm || String(searchTerm).trim() === '') {
        const sqlAll = 'SELECT * FROM users';
        return runQuery(sqlAll, [], callback);
      }
      const term = `%${String(searchTerm).trim()}%`;
      const sql = 'SELECT * FROM users WHERE username LIKE ? OR email LIKE ? OR CAST(id AS CHAR) LIKE ?';
      return runQuery(sql, [term, term, term], callback);
    }
};