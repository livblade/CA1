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
  },

  // --- Orders support (simple implementation) ---
  // addOrder(userId, total, cb) -> inserts an order and returns the inserted id via callback results.insertId
  addOrder: (userId, total, cb) => {
    const sql = 'INSERT INTO orders (userId, total, createdAt) VALUES (?, ?, NOW())';
    return runQuery(sql, [userId, total], cb);
  },

  // addOrderItems(orderId, items, cb) -> items: [{ productId, productName, price, quantity }]
  addOrderItems: (orderId, items, cb) => {
    if (!Array.isArray(items) || items.length === 0) {
      if (typeof cb === 'function') return cb(null, []);
      return Promise.resolve([]);
    }
    // Build bulk insert
    const values = [];
    const placeholders = items.map(it => {
      values.push(orderId, it.productId, it.productName, it.price, it.quantity);
      return '(?, ?, ?, ?, ?)';
    }).join(', ');
    const sql = `INSERT INTO order_items (orderId, productId, productName, price, quantity) VALUES ${placeholders}`;
    return runQuery(sql, values, cb);
  },

  // getOrdersByUser(userId, cb) -> returns flat rows; controller should group them
  getOrdersByUser: (userId, cb) => {
    const sql = `
      SELECT o.id as orderId, o.userId, o.total, o.createdAt,
             oi.productId, oi.productName, oi.price, oi.quantity
      FROM orders o
      LEFT JOIN order_items oi ON oi.orderId = o.id
      WHERE o.userId = ?
      ORDER BY o.createdAt DESC, o.id DESC
    `;
    return runQuery(sql, [userId], cb);
  },

  // getOrderById(orderId, cb) -> returns order header + items
  getOrderById: (orderId, cb) => {
    const sql = `
      SELECT o.id as orderId, o.userId, o.total, o.createdAt,
             oi.productId, oi.productName, oi.price, oi.quantity
      FROM orders o
      LEFT JOIN order_items oi ON oi.orderId = o.id
      WHERE o.id = ?
    `;
    return runQuery(sql, [orderId], cb);
  }
};