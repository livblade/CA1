const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const multer = require('multer');
const app = express();

// Import controllers
const productController = require('./controllers/productController');
const userController = require('./controllers/userController');

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images'); // Directory to save uploaded files
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname); 
    }
});

const upload = multer({ storage: storage });

// Set up view engine
app.set('view engine', 'ejs');
//  enable static files
app.use(express.static('public'));
// enable form processing
app.use(express.urlencoded({
    extended: false
}));

//TO DO: Insert code for Session Middleware below 
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: true,
    // Session expires after 1 week of inactivity
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 } 
}));

app.use(flash());

// expose flash messages and current user to all views
app.use((req, res, next) => {
    res.locals.messages = {
        success: req.flash('success'),
        error: req.flash('error'),
        info: req.flash('info')
    };
    res.locals.user = req.session ? req.session.user : null;
    next();
});

// Middleware to check if user is logged in
const checkAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    } else {
        req.flash('error', 'Please log in to view this resource');
        res.redirect('/login');
    }
};

// Middleware to check if user is admin
const checkAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        return next();
    } else {
        req.flash('error', 'Access denied');
        res.redirect('/shopping');
    }
};

// Middleware for form validation
const validateRegistration = (req, res, next) => {
    const { username, email, password, address, contact, role } = req.body;

    if (!username || !email || !password || !address || !contact || !role) {
        return res.status(400).send('All fields are required.');
    }
    
    if (password.length < 6) {
        req.flash('error', 'Password should be at least 6 or more characters long');
        req.flash('formData', req.body);
        return res.redirect('/register');
    }
    next();
};

// Define routes
app.get('/',  (req, res) => {
    res.render('index', {user: req.session.user} );
});

// Products routes (use controller)
app.get('/products', (req, res, next) => {
    return productController.getAllProducts(req, res, next);
});

app.get('/products/:id', checkAuthenticated, (req, res, next) => {
    return productController.getProductById(req, res, next);
});

app.post('/products/add', checkAuthenticated, checkAdmin, upload.single('image'), (req, res, next) => {
    // controller should handle request.body and req.file
    return productController.addProduct(req, res, next);
});

app.post('/products/update/:id', checkAuthenticated, checkAdmin, upload.single('image'), (req, res, next) => {
    return productController.updateProduct(req, res, next);
});

app.get('/products/delete/:id', checkAuthenticated, checkAdmin, (req, res, next) => {
    return productController.deleteProduct(req, res, next);
});

// Admin inventory view - render via controller (reuse product listing)
app.get('/inventory', checkAuthenticated, checkAdmin, (req, res, next) => {
    return productController.getAllProducts(req, res, next);
});

// Render add product form (no DB access needed here)
app.get('/addProduct', checkAuthenticated, checkAdmin, (req, res) => {
    res.render('addProduct', {user: req.session.user } ); 
});

// Add: handle form POST from /addProduct (match form action)
app.post('/addProduct', checkAuthenticated, checkAdmin, upload.single('image'), (req, res, next) => {
    return productController.addProduct(req, res, next);
});

// Render update product form - delegate to controller (controller may render the specific view)
app.get('/products/update/:id', checkAuthenticated, checkAdmin, (req, res, next) => {
    return productController.getProductById(req, res, next);
});

// Users routes (use controller)
app.get('/users', checkAuthenticated, checkAdmin, (req, res, next) => {
    return userController.getAllUsers(req, res, next);
});

app.get('/users/:id', checkAuthenticated, (req, res, next) => {
    return userController.getUserById(req, res, next);
});

app.post('/users/add', upload.single('image'), validateRegistration, (req, res, next) => {
    return userController.addUser(req, res, next);
});

app.post('/users/update/:id', upload.single('image'), (req, res, next) => {
    return userController.updateUser(req, res, next);
});

app.get('/users/delete/:id', checkAuthenticated, checkAdmin, (req, res, next) => {
    return userController.deleteUser(req, res, next);
});

// Registration and login views/routes (delegate processing to userController)
app.get('/register', (req, res) => {
    res.render('register', { messages: req.flash('error'), formData: req.flash('formData')[0] });
});

// keep the register POST but route to controller
app.post('/register', validateRegistration, (req, res, next) => {
    // delegate actual user creation to controller
    return userController.addUser(req, res, next);
});

app.get('/login', (req, res) => {
    res.render('login', { messages: req.flash('success'), errors: req.flash('error') });
});

app.post('/login', (req, res, next) => {
    // delegate authentication to controller
    return userController.login(req, res, next);
});

// Shopping list - reuse product controller for listing available products
app.get('/shopping', checkAuthenticated, (req, res, next) => {
    return productController.getAllProducts(req, res, next);
});

// Cart and add-to-cart: cart is stored in session; product retrieval should be handled by controller.
// Here we delegate product fetching to controller via a helper route, then manage session cart in controller or via dedicated endpoints.
// For now we forward to controller that can handle adding to cart (controller should implement addToCart).
app.post('/add-to-cart/:id', checkAuthenticated, (req, res, next) => {
    // delegate to product controller; controller is expected to handle adding to session cart and redirecting
    if (typeof productController.addToCart === 'function') {
        return productController.addToCart(req, res, next);
    } else {
        // Fallback: fetch product details and add to cart with correct price
        const productId = parseInt(req.params.id);
        const quantity = parseInt(req.body.quantity) || 1;
        // Use your product model to fetch product details
        const productModel = require('./models/productModel');
        productModel.getProductById(productId, (err, results) => {
            if (err || !results || results.length === 0) {
                req.flash('error', 'Product not found');
                return res.redirect('/shopping');
            }
            const product = Array.isArray(results) ? results[0] : results;
            if (!req.session.cart) req.session.cart = [];
            const existingItem = req.session.cart.find(item => item.productId === productId);
            if (existingItem) {
                existingItem.quantity += quantity;
            } else {
                req.session.cart.push({
                    productId: product.id,
                    productName: product.productName,
                    price: parseFloat(product.price) || 0,
                    quantity: quantity,
                    image: product.image
                });
            }
            return res.redirect('/cart');
        });
    }
});

app.get('/cart', checkAuthenticated, (req, res) => {
    const cart = req.session.cart || [];
    // Calculate total and item totals safely
    cart.forEach(item => {
        item.price = parseFloat(item.price) || 0;
        item.quantity = parseInt(item.quantity) || 0;
        item.total = item.price * item.quantity;
    });
    const total = cart.reduce((sum, item) => sum + item.total, 0);
    res.render('cart', { cart, user: req.session.user, total });
});

// NEW: cart management endpoints
app.post('/cart/add/:id', checkAuthenticated, (req, res, next) => {
    // delegate adding to cart to controller
    return productController.addToCart(req, res, next);
});

app.post('/cart/update', checkAuthenticated, (req, res, next) => {
    // expects body: productId, quantity
    return productController.updateCartItem(req, res, next);
});

app.post('/cart/remove/:id', checkAuthenticated, (req, res, next) => {
    return productController.removeFromCart(req, res, next);
});

app.post('/cart/clear', checkAuthenticated, (req, res, next) => {
    return productController.clearCart(req, res, next);
});

// Checkout: persist order and redirect to invoice
app.post('/checkout', checkAuthenticated, (req, res, next) => {
    return productController.checkout(req, res, next);
});

// Orders & invoice
app.get('/orders', checkAuthenticated, (req, res, next) => {
    return productController.getOrders(req, res, next);
});

app.get('/invoice/:orderId', checkAuthenticated, (req, res, next) => {
    return productController.getInvoice(req, res, next);
});

app.get('/logout', (req, res) => {
    // remove user from session but keep session for flash messages
    if (req.session) {
        req.session.user = null;
        req.flash('success', 'Logged out successfully');
        // ensure session is saved so flash is persisted then redirect
        req.session.save(err => {
            return res.redirect('/');
        });
    } else {
        return res.redirect('/');
    }
});

// Product detail route alias to match previous naming (delegate to controller)
app.get('/product/:id', checkAuthenticated, (req, res, next) => {
    return productController.getProductById(req, res, next);
});

// Product update/delete legacy endpoints redirected to new routes
app.get('/updateProduct/:id', checkAuthenticated, checkAdmin, (req, res, next) => {
    return productController.getProductById(req, res, next);
});

app.post('/updateProduct/:id', checkAuthenticated, checkAdmin, upload.single('image'), (req, res, next) => {
    return productController.updateProduct(req, res, next);
});

app.get('/deleteProduct/:id', checkAuthenticated, checkAdmin, (req, res, next) => {
    return productController.deleteProduct(req, res, next);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
