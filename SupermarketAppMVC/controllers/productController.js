const productModel = require('../models/productModel');

module.exports = {
    // Get all products
    getAllProducts: (req, res) => {
        productModel.getAllProducts((err, results) => {
            if (err) {
                return res.status(500).send(err);
            }

            // Choose view: admin inventory or shopping for regular users
            const isAdminView = req.originalUrl && req.originalUrl.includes('/inventory') 
                || (req.session && req.session.user && req.session.user.role === 'admin');

            const viewName = isAdminView ? 'inventory' : 'shopping';
            return res.render(viewName, { products: results, user: req.session ? req.session.user : null });
        });
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

    // Add new product
    addProduct: (req, res) => {
        const { name } = req.body;
        // accept either 'stock' or 'quantity' from forms
        let quantity = req.body.stock ?? req.body.quantity ?? '0';
        let price = req.body.price ?? '0';

        quantity = parseInt(quantity, 10);
        if (Number.isNaN(quantity)) quantity = 0;

        price = parseFloat(price);
        if (Number.isNaN(price)) price = 0.0;

        const image = req.file ? req.file.filename : (req.body.image || null);

        productModel.addProduct(name, quantity, price, image, (err) => {
            if (err) {
                return res.status(500).send(err);
            }
            return res.redirect('/inventory');
        });
    },

    // Update product
    updateProduct: (req, res) => {
        const productId = req.params.id;
        const { name } = req.body;

        let quantity = req.body.stock ?? req.body.quantity ?? '0';
        let price = req.body.price ?? '0';

        quantity = parseInt(quantity, 10);
        if (Number.isNaN(quantity)) quantity = 0;

        price = parseFloat(price);
        if (Number.isNaN(price)) price = 0.0;

        const image = req.file ? req.file.filename : (req.body.image || null);

        productModel.updateProduct(productId, name, quantity, price, image, (err) => {
            if (err) {
                return res.status(500).send(err);
            }
            return res.redirect('/inventory');
        });
    },

    // Delete product
    deleteProduct: (req, res) => {
        const productId = req.params.id;
        productModel.deleteProduct(productId, (err) => {
            if (err) {
                return res.status(500).send(err);
            }
            return res.redirect('/inventory');
        });
    }
};