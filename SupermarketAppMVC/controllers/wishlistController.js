const wishlistModel = require('../models/wishlistModel');
const productModel = require('../models/productModel');

module.exports = {
  // Get user's wishlist page
  getWishlist: (req, res, next) => {
    const userId = req.session.user && (req.session.user.userId || req.session.user.id);
    if (!userId) return res.redirect('/login');

    wishlistModel.getUserWishlist(userId, (err, items) => {
      if (err) return next(err);
      res.render('wishlist', { 
        wishlist: items, 
        user: req.session.user 
      });
    });
  },

  // Add product to wishlist
  addToWishlist: (req, res, next) => {
    const userId = req.session.user && (req.session.user.userId || req.session.user.id);
    if (!userId) {
      req.flash('error', 'Please log in to add items to wishlist');
      return res.redirect('/login');
    }

    const productId = parseInt(req.params.id, 10);
    const notes = req.body.notes || '';

    // Verify product exists
    productModel.getProductById(productId, (err, results) => {
      if (err) return next(err);
      if (!results || results.length === 0) {
        req.flash('error', 'Product not found');
        return res.redirect('/shopping');
      }

      wishlistModel.addToWishlist(userId, productId, notes, (err2) => {
        if (err2) {
          req.flash('error', 'Unable to add to wishlist');
          return next(err2);
        }
        req.flash('success', 'Added to your shopping list!');
        const back = req.get('Referer') || '/shopping';
        return res.redirect(back);
      });
    });
  },

  // Remove product from wishlist
  removeFromWishlist: (req, res, next) => {
    const userId = req.session.user && (req.session.user.userId || req.session.user.id);
    if (!userId) return res.redirect('/login');

    const productId = parseInt(req.params.id, 10);

    wishlistModel.removeFromWishlist(userId, productId, (err) => {
      if (err) return next(err);
      req.flash('success', 'Removed from shopping list');
      return res.redirect('/wishlist');
    });
  },

  // Clear entire wishlist
  clearWishlist: (req, res, next) => {
    const userId = req.session.user && (req.session.user.userId || req.session.user.id);
    if (!userId) return res.redirect('/login');

    wishlistModel.clearWishlist(userId, (err) => {
      if (err) return next(err);
      req.flash('success', 'Shopping list cleared');
      return res.redirect('/wishlist');
    });
  },

  // Update wishlist item notes
  updateWishlistNotes: (req, res, next) => {
    const userId = req.session.user && (req.session.user.userId || req.session.user.id);
    if (!userId) return res.redirect('/login');

    const productId = parseInt(req.body.productId, 10);
    const notes = req.body.notes || '';

    wishlistModel.updateWishlistNotes(userId, productId, notes, (err) => {
      if (err) return next(err);
      req.flash('success', 'Notes updated');
      return res.redirect('/wishlist');
    });
  },

  // Move all wishlist items to cart
  moveAllToCart: (req, res, next) => {
    const userId = req.session.user && (req.session.user.userId || req.session.user.id);
    if (!userId) return res.redirect('/login');

    wishlistModel.getUserWishlist(userId, (err, items) => {
      if (err) return next(err);
      
      if (!items || items.length === 0) {
        req.flash('info', 'Your shopping list is empty');
        return res.redirect('/wishlist');
      }

      // Initialize cart if not exists
      if (!req.session.cart) req.session.cart = [];

      let addedCount = 0;
      items.forEach(item => {
        // Check if product is in stock
        const stock = parseInt(item.quantity, 10) || 0;
        if (stock <= 0) return; // Skip out of stock items

        // Check if already in cart
        const existing = req.session.cart.find(c => c.productId === item.productId);
        if (existing) {
          // Just update quantity (add 1)
          if (existing.quantity < stock) {
            existing.quantity += 1;
            addedCount++;
          }
        } else {
          // Add new item to cart
          req.session.cart.push({
            productId: item.productId,
            productName: item.productName,
            price: parseFloat(item.price) || 0,
            quantity: 1,
            image: item.image
          });
          addedCount++;
        }
      });

      if (addedCount > 0) {
        req.flash('success', `Added ${addedCount} item(s) from shopping list to cart`);
      } else {
        req.flash('info', 'No items were added (out of stock or already in cart)');
      }
      
      return res.redirect('/cart');
    });
  }
};
