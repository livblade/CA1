const userModel = require('../models/userModel');
const crypto = require('crypto');

module.exports = {
    // Get all users (admin view)
    getAllUsers: (req, res) => {
        // optional search query from querystring
        const q = (req.query && req.query.q) ? String(req.query.q).trim() : '';

        const cb = (err, results) => {
            if (err) {
                return res.status(500).send(err);
            }
            // render users listing (ensure a view exists at users/index.ejs)
            res.render('users/index', { users: results, user: req.session ? req.session.user : null, searchQuery: q });
        };

        if (q) {
            return userModel.searchUsers(q, cb);
        } else {
            return userModel.getAllUsers(cb);
        }
    },

    // Get user by ID
    getUserById: (req, res) => {
        const userId = req.params.id;
        userModel.getUserById(userId, (err, result) => {
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

        console.log('=== REGISTRATION ATTEMPT ===');
        console.log('Username:', username);
        console.log('Email:', email);
        console.log('Address:', address);
        console.log('Contact:', contact);
        console.log('Role:', role);
        console.log('Image:', image);

        // Validate (basic) - additional validation is performed earlier by middleware
        if (!username || !email || !password) {
            console.log('VALIDATION FAILED: Missing required fields');
            req.flash('error', 'Missing required fields');
            req.flash('formData', req.body);
            return res.redirect('/register');
        }

        // Hash password with SHA1 to match legacy DB scheme
        const passwordHash = crypto.createHash('sha1').update(password).digest('hex');
        console.log('Password hashed successfully');

        userModel.addUser(username, email, passwordHash, address || '', contact || '', role || 'user', image, (err, results) => {
            if (err) {
                // In case of duplicate email, inform the user
                console.error('=== REGISTRATION ERROR ===');
                console.error('Error details:', err);
                console.error('Error code:', err.code);
                console.error('Error message:', err.message);
                
                if (err.code === 'ER_DUP_ENTRY') {
                    req.flash('error', 'Email already registered. Please use a different email or login.');
                } else {
                    req.flash('error', `Unable to register user: ${err.message}`);
                }
                req.flash('formData', req.body);
                return res.redirect('/register');
            }
            
            // On success, redirect to login with success message
            console.log('=== REGISTRATION SUCCESS ===');
            console.log('Results:', results);
            console.log('Inserted user ID:', results.insertId);
            
            req.flash('success', 'Registration successful! Please log in with your new account.');
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
        const userId = req.params.id;
        userModel.deleteUser(userId, (err) => {
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

        console.log('Login attempt for email:', email);

        // Use model helper to fetch/authenticate the user
        userModel.getUserByEmailAndPassword(email, password, (err, user) => {
            if (err) {
                console.error('Login error:', err);
                req.flash('error', 'An error occurred during login.');
                return res.redirect('/login');
            }
            if (!user) {
                console.log('No user found or password mismatch');
                req.flash('error', 'Invalid email or password.');
                return res.redirect('/login');
            }
            
            console.log('User found:', user);
            
            // Store user object in session (omit password for security)
            const sessionUser = {
                userId: user.id,  // Changed from usersId to id
                username: user.username,
                email: user.email,
                role: user.role,
                address: user.address,
                contact: user.contact
            };
            
            req.session.user = sessionUser;
            console.log('Session user set:', sessionUser);
            
            req.flash('success', 'Login successful!');
            
            // Redirect based on role
            if (sessionUser.role === 'admin') {
                return res.redirect('/dashboard');
            } else {
                return res.redirect('/shopping');
            }
        });
    },

    // Fallback helper (kept for compatibility with app code that may call it)
    getUserByEmailAndPassword: (email, password, cb) => {
        return userModel.getUserByEmailAndPassword(email, password, cb);
    },

    // NEW: Promote user to admin
    promoteToAdmin: (req, res, next) => {
        const userId = req.params.id;
        
        // Prevent promoting yourself (optional safeguard)
        const currentUserId = req.session.user && (req.session.user.userId || req.session.user.id);
        
        userModel.getUserById(userId, (err, result) => {
            if (err) return next(err);
            
            const targetUser = Array.isArray(result) ? result[0] : result;
            if (!targetUser) {
                req.flash('error', 'User not found');
                return res.redirect('/users');
            }
            
            if (targetUser.role === 'admin') {
                req.flash('info', 'User is already an admin');
                return res.redirect('/users');
            }
            
            // Update role to admin using existing updateUser method
            userModel.updateUser(
                userId,
                targetUser.username,
                targetUser.email,
                null, // don't change password
                targetUser.address,
                targetUser.contact,
                'admin', // change role to admin
                null, // don't change image
                (err2) => {
                    if (err2) {
                        req.flash('error', 'Unable to promote user');
                        return next(err2);
                    }
                    req.flash('success', `${targetUser.username} has been promoted to admin`);
                    return res.redirect('/users');
                }
            );
        });
    },

    // NEW: Demote admin to user
    demoteToUser: (req, res, next) => {
        const userId = req.params.id;
        const currentUserId = req.session.user && (req.session.user.userId || req.session.user.id);
        
        // Prevent demoting yourself
        if (parseInt(userId) === parseInt(currentUserId)) {
            req.flash('error', 'You cannot demote yourself');
            return res.redirect('/users');
        }
        
        userModel.getUserById(userId, (err, result) => {
            if (err) return next(err);
            
            const targetUser = Array.isArray(result) ? result[0] : result;
            if (!targetUser) {
                req.flash('error', 'User not found');
                return res.redirect('/users');
            }
            
            if (targetUser.role === 'user') {
                req.flash('info', 'User is already a regular user');
                return res.redirect('/users');
            }
            
            // Update role to user
            userModel.updateUser(
                userId,
                targetUser.username,
                targetUser.email,
                null,
                targetUser.address,
                targetUser.contact,
                'user', // change role to user
                null,
                (err2) => {
                    if (err2) {
                        req.flash('error', 'Unable to demote admin');
                        return next(err2);
                    }
                    req.flash('success', `${targetUser.username} has been demoted to user`);
                    return res.redirect('/users');
                }
            );
        });
    }
};