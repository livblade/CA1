const productModel = require('../models/productModel');

module.exports = {
    // Get all products (renders inventory for admins, shopping for users)
    // Supports search, category filter, and price sorting via query params
    getAllProducts: (req, res) => {
        // read optional query params: q (search), category, sort, minPrice, maxPrice
        const q = (req.query && req.query.q) ? String(req.query.q).trim() : '';
        const category = (req.query && req.query.category) ? String(req.query.category).trim() : '';
        const sort = (req.query && req.query.sort) ? String(req.query.sort).trim() : '';
        const minPrice = (req.query && req.query.minPrice) ? req.query.minPrice : '';
        const maxPrice = (req.query && req.query.maxPrice) ? req.query.maxPrice : '';

        // Determine if current user is admin
        const isAdmin = req.session && req.session.user && req.session.user.role === 'admin';

        const handleResults = (err, results) => {
            if (err) {
                return res.status(500).send(err);
            }

            // Choose view: admin inventory or shopping for regular users
            const isAdminView = req.originalUrl && req.originalUrl.includes('/inventory') || isAdmin;

            const viewName = isAdminView ? 'inventory' : 'shopping';
            // pass filter params back so views can keep filters populated
            return res.render(viewName, { 
                products: results, 
                user: req.session ? req.session.user : null, 
                searchQuery: q,
                selectedCategory: category,
                selectedSort: sort,
                minPrice: minPrice,
                maxPrice: maxPrice
            });
        };

        // if any filter/search is applied, use searchProductsWithFilters; otherwise fallback to getAllProducts
        if (q || category || sort || minPrice || maxPrice) {
            return productModel.searchProductsWithFilters({ 
                searchTerm: q, 
                category, 
                sort, 
                minPrice, 
                maxPrice, 
                isAdmin 
            }, handleResults);
        } else {
            // Use appropriate method based on user role
            if (isAdmin) {
                return productModel.getAllProducts(handleResults);
            } else {
                return productModel.getVisibleProducts(handleResults);
            }
        }
    },

    // Get product by ID
    getProductById: (req, res) => {
        const productId = req.params.id;
        productModel.getProductById(productId, (err, result) => {
            if (err) {
                return res.status(500).send(err);
            }
            const product = Array.isArray(result) ? result[0] : result;
            if (!product) {
                return res.status(404).send('Product not found');
            }

            // If the route is for updating, render updateProduct view, otherwise render product detail
            const isUpdateRoute = req.originalUrl && (req.originalUrl.includes('/update') || req.originalUrl.includes('/updateProduct'));
            const viewName = isUpdateRoute ? 'updateProduct' : 'product';

            return res.render(viewName, { product, user: req.session ? req.session.user : null });
        });
    },

    // Add new product (now includes description and category)
    addProduct: (req, res) => {
        const { name, description, category } = req.body;
        // accept either 'stock' or 'quantity' from forms
        let quantity = req.body.stock ?? req.body.quantity ?? '0';
        let price = req.body.price ?? '0';

        quantity = parseInt(quantity, 10);
        if (Number.isNaN(quantity)) quantity = 0;

        price = parseFloat(price);
        if (Number.isNaN(price)) price = 0.0;

        const image = req.file ? req.file.filename : (req.body.image || null);

        productModel.addProduct(name, quantity, price, image, description, category, (err) => {
            if (err) {
                req.flash('error', 'Unable to add product');
                return res.redirect('/inventory');
            }
            req.flash('success', 'Product added successfully');
            return res.redirect('/inventory');
        });
    },

    // Update product (now includes description and category)
    updateProduct: (req, res) => {
        const productId = req.params.id;
        const { name, description, category } = req.body;

        let quantity = req.body.stock ?? req.body.quantity ?? '0';
        let price = req.body.price ?? '0';

        quantity = parseInt(quantity, 10);
        if (Number.isNaN(quantity)) quantity = 0;

        price = parseFloat(price);
        if (Number.isNaN(price)) price = 0.0;

        const image = req.file ? req.file.filename : (req.body.image || null);

        productModel.updateProduct(productId, name, quantity, price, image, description, category, (err) => {
            if (err) {
                req.flash('error', 'Unable to update product');
                return res.redirect('/inventory');
            }
            req.flash('success', 'Product updated successfully');
            return res.redirect('/inventory');
        });
    },

    // Delete product
    deleteProduct: (req, res) => {
        const productId = req.params.id;
        productModel.deleteProduct(productId, (err) => {
            if (err) {
                req.flash('error', 'Unable to delete product');
                return res.redirect('/inventory');
            }
            req.flash('success', 'Product deleted successfully');
            return res.redirect('/inventory');
        });
    },

    // --- Cart helpers ---
    // Add product to session cart (POST /cart/add/:id or /add-to-cart/:id)
    addToCart: (req, res, next) => {
        const productId = parseInt(req.params.id, 10);
        // parse quantity; allow custom quantities from shopping page
        const rawQty = (req.body && req.body.quantity) ? req.body.quantity : '';
        let quantity = parseInt(rawQty, 10);
        if (Number.isNaN(quantity)) quantity = 0;

        // basic validation: must request at least 1
        if (quantity <= 0) {
            req.flash('error', 'Please enter a valid quantity (1 or more).');
            // prefer to return user to previous page
            const back = req.get('Referer') || '/shopping';
            return res.redirect(back);
        }

        // fetch product to get canonical price, name and stock
        productModel.getProductById(productId, (err, results) => {
            if (err) return next(err);
            if (!results || results.length === 0) {
                req.flash('error', 'Product not found');
                return res.redirect('/shopping');
            }
            const product = Array.isArray(results) ? results[0] : results;

            // ensure we have numeric stock value (product.quantity from DB)
            const stock = parseInt(product.quantity, 10) || 0;
            if (stock <= 0) {
                req.flash('error', 'Product is out of stock');
                return res.redirect('/shopping');
            }

            // check against current cart to avoid exceeding stock
            if (!req.session.cart) req.session.cart = [];
            const existing = req.session.cart.find(i => i.productId === productId);
            const existingQty = existing ? (parseInt(existing.quantity, 10) || 0) : 0;

            if (existingQty + quantity > stock) {
                req.flash('error', `Requested quantity exceeds stock. Only ${stock - existingQty} left available.`);
                const back = req.get('Referer') || '/shopping';
                return res.redirect(back);
            }

            // safe to add/merge into cart
            if (existing) {
                existing.quantity = existingQty + quantity;
            } else {
                req.session.cart.push({
                    productId: product.id,
                    productName: product.productName,
                    price: parseFloat(product.price) || 0,
                    quantity: quantity,
                    image: product.image
                });
            }
            req.flash('success', 'Item added to cart');
            return res.redirect('/cart');
        });
    },

    // Update a cart item's quantity (POST /cart/update)
    updateCartItem: (req, res) => {
        const productId = parseInt(req.body.productId, 10);
        let quantity = parseInt(req.body.quantity, 10);
        if (Number.isNaN(quantity) || quantity < 0) quantity = 0;
        const cart = req.session.cart || [];
        const item = cart.find(i => i.productId === productId);
        if (!item) {
            req.flash('error', 'Item not found in cart');
            return res.redirect('/cart');
        }
        if (quantity === 0) {
            // remove item
            req.session.cart = cart.filter(i => i.productId !== productId);
            req.flash('success', 'Item removed from cart');
        } else {
            item.quantity = quantity;
            req.flash('success', 'Cart updated successfully');
        }
        return res.redirect('/cart');
    },

    // Remove a cart item (POST /cart/remove/:id)
    removeFromCart: (req, res) => {
        const productId = parseInt(req.params.id, 10);
        req.session.cart = (req.session.cart || []).filter(i => i.productId !== productId);
        req.flash('success', 'Item removed from cart');
        return res.redirect('/cart');
    },

    // Clear the whole cart (POST /cart/clear)
    clearCart: (req, res) => {
        req.session.cart = [];
        req.flash('success', 'Cart cleared');
        return res.redirect('/cart');
    },

    // Checkout: persist order and items, then redirect to invoice
    checkout: (req, res, next) => {
        const cart = req.session.cart || [];
        if (!cart || cart.length === 0) {
            req.flash('error', 'Cart is empty');
            return res.redirect('/cart');
        }
        // compute totals robustly
        let total = 0;
        const items = cart.map(i => {
            const price = parseFloat(i.price) || 0;
            const qty = parseInt(i.quantity, 10) || 0;
            const lineTotal = price * qty;
            total += lineTotal;
            return {
                productId: i.productId,
                productName: i.productName,
                price: price,
                quantity: qty
            };
        });

        const userId = req.session.user && (req.session.user.usersId || req.session.user.id || req.session.user.userId);
        if (!userId) {
            req.flash('error', 'User not recognized');
            return res.redirect('/login');
        }

        // Persist order (insert into orders, then insert order_items)
        productModel.addOrder(userId, total, (err, result) => {
            if (err) {
                req.flash('error', 'Unable to place order');
                return next(err);
            }
            const insertId = result && result.insertId;
            if (!insertId) {
                req.flash('error', 'Failed to create order');
                return next(new Error('Failed to create order'));
            }
            productModel.addOrderItems(insertId, items, (err2) => {
                if (err2) {
                    req.flash('error', 'Unable to save order items');
                    return next(err2);
                }
                // clear cart and redirect to invoice
                req.session.cart = [];
                req.flash('success', 'Order placed successfully');
                return res.redirect(`/invoice/${insertId}`);
            });
        });
    },

    // Get orders for logged-in user (GET /orders)
    getOrders: (req, res, next) => {
        const userId = req.session.user && (req.session.user.usersId || req.session.user.id || req.session.user.userId);
        if (!userId) return res.redirect('/login');

        productModel.getOrdersByUser(userId, (err, rows) => {
            if (err) return next(err);
            // group rows by orderId
            const ordersMap = new Map();
            rows.forEach(r => {
                if (!ordersMap.has(r.orderId)) {
                    ordersMap.set(r.orderId, {
                        orderId: r.orderId,
                        total: r.total,
                        createdAt: r.createdAt,
                        items: []
                    });
                }
                if (r.productId) {
                    ordersMap.get(r.orderId).items.push({
                        productId: r.productId,
                        productName: r.productName,
                        price: r.price,
                        quantity: r.quantity
                    });
                }
            });
            const orders = Array.from(ordersMap.values());
            return res.render('orders', { orders, user: req.session.user });
        });
    },

    // Get invoice for a single order (GET /invoice/:orderId)
    getInvoice: (req, res, next) => {
        const orderId = req.params.orderId;
        productModel.getOrderById(orderId, (err, rows) => {
            if (err) return next(err);
            if (!rows || rows.length === 0) {
                return res.status(404).send('Order not found');
            }
            // group into header + items
            const header = {
                orderId: rows[0].orderId,
                total: rows[0].total,
                createdAt: rows[0].createdAt,
                items: []
            };
            rows.forEach(r => {
                if (r.productId) {
                    header.items.push({
                        productId: r.productId,
                        productName: r.productName,
                        price: r.price,
                        quantity: r.quantity
                    });
                }
            });
            // render invoice view with order header/items
            return res.render('invoice', { order: header, user: req.session.user });
        });
    },

    // --- NEW: Toggle product visibility (admin only) ---
    toggleVisibility: (req, res) => {
        const productId = req.params.id;
        const visible = req.body.visible === '1' || req.body.visible === 'true' || req.body.visible === true;
        
        productModel.toggleProductVisibility(productId, visible, (err) => {
            if (err) {
                req.flash('error', 'Unable to update product visibility');
                return res.redirect('/inventory');
            }
            req.flash('success', `Product ${visible ? 'shown' : 'hidden'} successfully`);
            return res.redirect('/inventory');
        });
    }
};