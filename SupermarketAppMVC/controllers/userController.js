const userModel = require('../models/userModel');
const crypto = require('crypto');

module.exports = {
    // Get all users
    getAllUsers: (req, res) => {
        userModel.getAllUsers((err, results) => {
            if (err) {
                return res.status(500).send(err);
            }
            res.render('users/index', { users: results }); // Assuming you have a view named users/index.ejs
        });
    },

    // Get user by ID
    getUserById: (req, res) => {
        const usersId = req.params.id;
        userModel.getUserById(usersId, (err, result) => {
            if (err) {
                return res.status(500).send(err);
            }
            res.render('users/detail', { user: result[0] }); // Assuming you have a view named users/detail.ejs
        });
    },

    // Add new user
    addUser: (req, res) => {
        const { name, dob, contact, image } = req.body;
        // If multer uploaded a file, prefer req.file.filename
        const img = req.file ? req.file.filename : image;
        userModel.addUser(name, dob, contact, img, (err) => {
            if (err) {
                return res.status(500).send(err);
            }
            res.redirect('/users');
        });
    },

    // Update user
    updateUser: (req, res) => {
        const usersId = req.params.id;
        const { name, dob, contact, image } = req.body;
        const img = req.file ? req.file.filename : image;
        userModel.updateUser(usersId, name, dob, contact, img, (err) => {
            if (err) {
                return res.status(500).send(err);
            }
            res.redirect('/users');
        });
    },

    // Delete user
    deleteUser: (req, res) => {
        const usersId = req.params.id;
        userModel.deleteUser(usersId, (err) => {
            if (err) {
                return res.status(500).send(err);
            }
            res.redirect('/users');
        });
    },

    // New: login handler used by app.js
    login: (req, res, next) => {
        const { email, password } = req.body;
        if (!email || !password) {
            req.flash('error', 'All fields are required.');
            return res.redirect('/login');
        }

        // Use the helper below to fetch/authenticate the user
        module.exports.getUserByEmailAndPassword(email, password)
            .then(user => {
                if (user) {
                    req.session.user = user;
                    req.flash('success', 'Login successful!');
                    return user.role === 'user' ? res.redirect('/shopping') : res.redirect('/inventory');
                } else {
                    req.flash('error', 'Invalid email or password.');
                    return res.redirect('/login');
                }
            })
            .catch(err => next(err));
    },

    // New: helper that adapts to callback- or promise-style model implementations.
    // Returns a Promise and also supports an optional callback: (email, password, cb)
    getUserByEmailAndPassword: (email, password, cb) => {
        return new Promise((resolve, reject) => {
            // Prefer model.getUserByEmailAndPassword if present
            if (typeof userModel.getUserByEmailAndPassword === 'function') {
                try {
                    const maybe = userModel.getUserByEmailAndPassword(email, password, (err, results) => {
                        if (err) {
                            if (cb) cb(err);
                            return reject(err);
                        }
                        const user = Array.isArray(results) ? results[0] : results;
                        if (cb) cb(null, user);
                        return resolve(user);
                    });

                    // If model returned a promise instead of using the callback
                    if (maybe && typeof maybe.then === 'function') {
                        maybe
                            .then(results => {
                                const user = Array.isArray(results) ? results[0] : results;
                                if (cb) cb(null, user);
                                resolve(user);
                            })
                            .catch(err => {
                                if (cb) cb(err);
                                reject(err);
                            });
                    }
                    return;
                } catch (err) {
                    if (cb) cb(err);
                    return reject(err);
                }
            }

            // Fallback: model may expose other authentication helpers (optional)
            if (typeof userModel.authenticateUser === 'function') {
                try {
                    const maybe = userModel.authenticateUser(email, password, (err, user) => {
                        if (err) {
                            if (cb) cb(err);
                            return reject(err);
                        }
                        if (cb) cb(null, user);
                        return resolve(user);
                    });

                    if (maybe && typeof maybe.then === 'function') {
                        maybe
                            .then(user => {
                                if (cb) cb(null, user);
                                resolve(user);
                            })
                            .catch(err => {
                                if (cb) cb(err);
                                reject(err);
                            });
                    }
                    return;
                } catch (err) {
                    if (cb) cb(err);
                    return reject(err);
                }
            }

            // New fallback: if model exposes getAllUsers (or similar), search for matching email/password
            const tryFindFromAll = () => {
                // compute SHA1 of provided password (DB may store SHA1)
                const sha1 = crypto.createHash('sha1').update(password || '').digest('hex');

                // prefer getAllUsers, otherwise try getUsers or listUsers
                const listFn = userModel.getAllUsers || userModel.getUsers || userModel.listUsers;
                if (typeof listFn !== 'function') {
                    const err = new Error('Authentication method not implemented on userModel');
                    if (cb) return cb(null, null);
                    return reject(err);
                }

                // call list function (callback or promise)
                try {
                    const maybe = listFn((err, results) => {
                        if (err) {
                            if (cb) cb(err);
                            return reject(err);
                        }
                        const users = Array.isArray(results) ? results : [];
                        const user = users.find(u =>
                            (u.email === email) && (u.password === sha1 || u.password === password)
                        );
                        if (cb) cb(null, user || null);
                        return resolve(user || null);
                    });

                    if (maybe && typeof maybe.then === 'function') {
                        maybe
                            .then(results => {
                                const users = Array.isArray(results) ? results : [];
                                const user = users.find(u =>
                                    (u.email === email) && (u.password === sha1 || u.password === password)
                                );
                                if (cb) cb(null, user || null);
                                resolve(user || null);
                            })
                            .catch(err => {
                                if (cb) cb(err);
                                reject(err);
                            });
                    }
                } catch (err) {
                    if (cb) cb(err);
                    reject(err);
                }
            };

            tryFindFromAll();
        });
    }
};