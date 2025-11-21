const userModel = require('../models/userModel');
const crypto = require('crypto');

module.exports = {
    // Get all users (admin view)
    getAllUsers: (req, res) => {
        userModel.getAllUsers((err, results) => {
            if (err) {
                return res.status(500).send(err);
            }
            // render users listing (ensure a view exists at users/index.ejs)
            res.render('users/index', { users: results, user: req.session ? req.session.user : null });
        });
    },

    // Get user by ID
    getUserById: (req, res) => {
        const usersId = req.params.id;
        userModel.getUserById(usersId, (err, result) => {
            if (err) {
                return res.status(500).send(err);
            }
            res.render('users/detail', { user: result && result[0], currentUser: req.session ? req.session.user : null });
        });
    },

    // Add new user (registration) - hashes password and stores role/address/contact
    addUser: (req, res) => {
        // Expect fields: username, email, password, address, contact, role
        const { username, email, password, address, contact, role } = req.body;
        // prefer uploaded image if present
        const image = req.file ? req.file.filename : (req.body.image || null);

        // Validate (basic) - additional validation is performed earlier by middleware
        if (!username || !email || !password) {
            req.flash('error', 'Missing fields');
            req.flash('formData', req.body);
            return res.redirect('/register');
        }

        // Hash password with SHA1 to match legacy DB scheme
        const passwordHash = crypto.createHash('sha1').update(password).digest('hex');

        userModel.addUser(username, email, passwordHash, address || '', contact || '', role || 'user', image, (err, results) => {
            if (err) {
                // In case of duplicate email, inform the user
                req.flash('error', 'Unable to register user');
                return res.redirect('/register');
            }
            // On success, redirect to login (or auto-login if desired)
            req.flash('success', 'Registration successful. Please log in.');
            return res.redirect('/login');
        });
    },

    // Update user
    updateUser: (req, res) => {
        const usersId = req.params.id;
        const { username, email, password, address, contact, role } = req.body;
        const image = req.file ? req.file.filename : (req.body.image || null);
        // hash password only if provided
        const passwordHash = password ? crypto.createHash('sha1').update(password).digest('hex') : null;
        userModel.updateUser(usersId, username, email, passwordHash, address, contact, role, image, (err) => {
            if (err) {
                req.flash('error', 'Unable to update user');
                return res.redirect('/users');
            }
            req.flash('success', 'User updated successfully');
            res.redirect('/users');
        });
    },

    // Delete user
    deleteUser: (req, res) => {
        const usersId = req.params.id;
        userModel.deleteUser(usersId, (err) => {
            if (err) {
                req.flash('error', 'Unable to delete user');
                return res.redirect('/users');
            }
            req.flash('success', 'User deleted successfully');
            res.redirect('/users');
        });
    },

    // Login handler used by app.js
    login: (req, res, next) => {
        const { email, password } = req.body;
        if (!email || !password) {
            req.flash('error', 'All fields are required.');
            return res.redirect('/login');
        }

        // Use model helper to fetch/authenticate the user
        userModel.getUserByEmailAndPassword(email, password, (err, user) => {
            if (err) return next(err);
            if (!user) {
                req.flash('error', 'Invalid email or password.');
                return res.redirect('/login');
            }
            // store user object in session (omit password)
            delete user.password;
            req.session.user = user;
            req.flash('success', 'Login successful!');
            return user.role === 'user' ? res.redirect('/shopping') : res.redirect('/inventory');
        });
    },

    // Fallback helper (kept for compatibility with app code that may call it)
    getUserByEmailAndPassword: (email, password, cb) => {
        return userModel.getUserByEmailAndPassword(email, password, cb);
    }
};