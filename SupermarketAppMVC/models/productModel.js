const mysql = require('mysql2');

// Create a pool (adjust credentials if different in your environment)
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'Republic_C207', // keep in sync with your DB
  database: 'c372_supermarketdb',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Helper to run queries and support callback or promise usage
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
  getAllProducts: (cb) => {
    const sql = 'SELECT * FROM products';
    return runQuery(sql, [], cb);
  },

  getProductById: (id, cb) => {
    const sql = 'SELECT * FROM products WHERE id = ?';
    return runQuery(sql, [id], cb);
  },

  // addProduct(name, quantity, price, image, cb)
  addProduct: (name, quantity, price, image, cb) => {
    // Normalize numeric inputs to avoid NULLs in DB
    let q = (quantity === undefined || quantity === null) ? 0 : quantity;
    let p = (price === undefined || price === null) ? 0 : price;

    q = parseInt(q, 10);
    if (Number.isNaN(q)) q = 0;

    p = parseFloat(p);
    if (Number.isNaN(p)) p = 0.0;

    const sql = 'INSERT INTO products (productName, quantity, price, image) VALUES (?, ?, ?, ?)';
    const params = [name, q, p, image || null];
    return runQuery(sql, params, cb);
  },

  // updateProduct(id, name, quantity, price, image, cb)
  updateProduct: (id, name, quantity, price, image, cb) => {
    // Normalize numeric inputs to avoid NULLs in DB
    let q = (quantity === undefined || quantity === null) ? 0 : quantity;
    let p = (price === undefined || price === null) ? 0 : price;

    q = parseInt(q, 10);
    if (Number.isNaN(q)) q = 0;

    p = parseFloat(p);
    if (Number.isNaN(p)) p = 0.0;

    // Use NULLIF to treat empty string as NULL, and COALESCE to keep existing image when NULL provided.
    const sql = 'UPDATE products SET productName = ?, quantity = ?, price = ?, image = COALESCE(NULLIF(?, \'\'), image) WHERE id = ?';
    const params = [name, q, p, image || null, id];
    return runQuery(sql, params, cb);
  },

  deleteProduct: (id, cb) => {
    const sql = 'DELETE FROM products WHERE id = ?';
    return runQuery(sql, [id], cb);
  }
};