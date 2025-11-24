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

  // addProduct(name, quantity, price, image, description, category, cb)
  addProduct: (name, quantity, price, image, description, category, cb) => {
    // Normalize numeric inputs to avoid NULLs in DB
    let q = (quantity === undefined || quantity === null) ? 0 : quantity;
    let p = (price === undefined || price === null) ? 0 : price;

    q = parseInt(q, 10);
    if (Number.isNaN(q)) q = 0;

    p = parseFloat(p);
    if (Number.isNaN(p)) p = 0.0;

    const sql = 'INSERT INTO products (productName, quantity, price, image, description, category) VALUES (?, ?, ?, ?, ?, ?)';
    const params = [name, q, p, image || null, description || '', category || ''];
    return runQuery(sql, params, cb);
  },

  // updateProduct(id, name, quantity, price, image, description, category, cb)
  updateProduct: (id, name, quantity, price, image, description, category, cb) => {
    // Normalize numeric inputs to avoid NULLs in DB
    let q = (quantity === undefined || quantity === null) ? 0 : quantity;
    let p = (price === undefined || price === null) ? 0 : price;

    q = parseInt(q, 10);
    if (Number.isNaN(q)) q = 0;

    p = parseFloat(p);
    if (Number.isNaN(p)) p = 0.0;

    // Use NULLIF to treat empty string as NULL, and COALESCE to keep existing image when NULL provided.
    const sql = `UPDATE products SET 
      productName = ?, quantity = ?, price = ?, 
      image = COALESCE(NULLIF(?, ''), image),
      description = ?, category = ?
      WHERE id = ?`;
    const params = [name, q, p, image || null, description || '', category || '', id];
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
  },

  // --- NEW: search products by name or id (safe parameterized LIKE)
  searchProducts: (searchTerm, cb) => {
    if (!searchTerm || String(searchTerm).trim() === '') {
      // fallback to returning all products
      const sqlAll = 'SELECT * FROM products';
      return runQuery(sqlAll, [], cb);
    }
    const term = `%${String(searchTerm).trim()}%`;
    const sql = 'SELECT * FROM products WHERE productName LIKE ? OR CAST(id AS CHAR) LIKE ?';
    return runQuery(sql, [term, term], cb);
  },

  // NEW: searchProductsWithFilters - supports search term, category filter, and price sorting
  // params: { searchTerm, category, sort, minPrice, maxPrice }
  searchProductsWithFilters: (filters, cb) => {
    const { searchTerm, category, sort, minPrice, maxPrice } = filters || {};
    let sql = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    // Apply search term (name or id)
    if (searchTerm && String(searchTerm).trim() !== '') {
      const term = `%${String(searchTerm).trim()}%`;
      sql += ' AND (productName LIKE ? OR CAST(id AS CHAR) LIKE ?)';
      params.push(term, term);
    }

    // Apply category filter
    if (category && String(category).trim() !== '' && String(category).trim().toLowerCase() !== 'all') {
      sql += ' AND category = ?';
      params.push(String(category).trim());
    }

    // Apply price range filters
    if (minPrice !== undefined && minPrice !== null && minPrice !== '') {
      const min = parseFloat(minPrice);
      if (!Number.isNaN(min)) {
        sql += ' AND price >= ?';
        params.push(min);
      }
    }
    if (maxPrice !== undefined && maxPrice !== null && maxPrice !== '') {
      const max = parseFloat(maxPrice);
      if (!Number.isNaN(max)) {
        sql += ' AND price <= ?';
        params.push(max);
      }
    }

    // Apply sorting by price
    if (sort === 'price_asc') {
      sql += ' ORDER BY price ASC';
    } else if (sort === 'price_desc') {
      sql += ' ORDER BY price DESC';
    } else {
      // default: order by id
      sql += ' ORDER BY id ASC';
    }

    return runQuery(sql, params, cb);
  }
};
