const db = require('../db');

module.exports = {
    getAllUsers: (callback) => {
        const sql = 'SELECT * FROM users';
        db.query(sql, callback);
    },

    getUserById: (usersId, callback) => {
        const sql = 'SELECT * FROM users WHERE usersId = ?';
        db.query(sql, [usersId], callback);
    },

    addUser: (name, dob, contact, image, callback) => {
        const sql = 'INSERT INTO users (name, dob, contact, image) VALUES (?, ?, ?, ?)';
        db.query(sql, [name, dob, contact, image], callback);
    },

    updateUser: (usersId, name, dob, contact, image, callback) => {
        const sql = 'UPDATE users SET name = ?, dob = ?, contact = ?, image = ? WHERE usersId = ?';
        db.query(sql, [name, dob, contact, image, usersId], callback);
    },

    deleteUser: (usersId, callback) => {
        const sql = 'DELETE FROM users WHERE usersId = ?';
        db.query(sql, [usersId], callback);
    }
};