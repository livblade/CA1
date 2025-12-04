const mysql = require('mysql2');

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
  // Add product to wishlist
  addToWishlist: (userId, productId, notes, cb) => {
    const sql = 'INSERT INTO wishlist (userId, productId, notes) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE notes = VALUES(notes)';
    return runQuery(sql, [userId, productId, notes || null], cb);
  },

  // Remove product from wishlist
  removeFromWishlist: (userId, productId, cb) => {
    const sql = 'DELETE FROM wishlist WHERE userId = ? AND productId = ?';
    return runQuery(sql, [userId, productId], cb);
  },

  // Get user's wishlist with product details
  getUserWishlist: (userId, cb) => {
    const sql = `
      SELECT w.id as wishlistId, w.productId, w.addedAt, w.notes,
             p.productName, p.price, p.quantity, p.image, p.category, p.description,
             COALESCE(p.visible, 1) as visible
      FROM wishlist w
      INNER JOIN products p ON w.productId = p.id
      WHERE w.userId = ?
      ORDER BY w.addedAt DESC
    `;
    return runQuery(sql, [userId], cb);
  },

  // Check if product is in user's wishlist
  isInWishlist: (userId, productId, cb) => {
    const sql = 'SELECT id FROM wishlist WHERE userId = ? AND productId = ? LIMIT 1';
    return runQuery(sql, [userId, productId], cb);
  },

  // Get wishlist count for user
  getWishlistCount: (userId, cb) => {
    const sql = 'SELECT COUNT(*) as count FROM wishlist WHERE userId = ?';
    return runQuery(sql, [userId], cb);
  },

  // Clear entire wishlist
  clearWishlist: (userId, cb) => {
    const sql = 'DELETE FROM wishlist WHERE userId = ?';
    return runQuery(sql, [userId], cb);
  },

  // Update wishlist item notes
  updateWishlistNotes: (userId, productId, notes, cb) => {
    const sql = 'UPDATE wishlist SET notes = ? WHERE userId = ? AND productId = ?';
    return runQuery(sql, [notes, userId, productId], cb);
  }
};
