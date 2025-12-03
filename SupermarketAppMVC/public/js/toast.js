/**
 * Toast Notification System
 * Creates animated flying card notifications that appear below page header
 */

(function() {
  'use strict';

  // Create toast container if it doesn't exist
  function getToastContainer() {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      
      // Find page header and insert immediately after it
      const pageHeader = document.querySelector('.page-header');
      
      if (pageHeader) {
        // Insert right after the page header
        pageHeader.insertAdjacentElement('afterend', container);
      } else {
        // Fallback: insert at start of main container
        const mainContainer = document.querySelector('.container');
        if (mainContainer && mainContainer.firstChild) {
          mainContainer.insertBefore(container, mainContainer.firstChild);
        } else if (mainContainer) {
          mainContainer.appendChild(container);
        } else {
          document.body.appendChild(container);
        }
      }
    }
    return container;
  }

  // Create and show a toast notification
  function showToast(message, type = 'info', duration = 5000) {
    const container = getToastContainer();
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Determine icon based on type
    let icon = 'ℹ️';
    let title = 'Info';
    if (type === 'success') {
      icon = '✅';
      title = 'Success';
    } else if (type === 'error') {
      icon = '❌';
      title = 'Error';
    } else if (type === 'warning') {
      icon = '⚠️';
      title = 'Warning';
    }
    
    // Build toast HTML
    toast.innerHTML = `
      <div class="toast-icon">${icon}</div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${escapeHtml(message)}</div>
      </div>
      <button class="toast-close" aria-label="Close">&times;</button>
    `;
    
    // Add to container
    container.appendChild(toast);
    
    // Close button handler
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
      removeToast(toast);
    });
    
    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        removeToast(toast);
      }, duration);
    }
    
    return toast;
  }

  // Remove toast with animation
  function removeToast(toast) {
    toast.classList.add('removing');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
        
        // Remove container if no more toasts
        const container = document.querySelector('.toast-container');
        if (container && container.children.length === 0) {
          container.remove();
        }
      }
    }, 300);
  }

  // Escape HTML to prevent XSS
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Expose toast functions globally
  window.toast = {
    show: showToast,
    success: (message, duration) => showToast(message, 'success', duration),
    error: (message, duration) => showToast(message, 'error', duration),
    info: (message, duration) => showToast(message, 'info', duration),
    warning: (message, duration) => showToast(message, 'warning', duration)
  };

  // Auto-convert flash messages to toasts on page load
  document.addEventListener('DOMContentLoaded', function() {
    // Look for hidden flash message data
    const flashData = document.getElementById('flash-messages');
    if (flashData) {
      try {
        const messages = JSON.parse(flashData.textContent);
        
        // Show success messages
        if (messages.success && messages.success.length) {
          messages.success.forEach(msg => toast.success(msg));
        }
        
        // Show error messages
        if (messages.errors && messages.errors.length) {
          messages.errors.forEach(msg => toast.error(msg));
        }
        
        // Show info messages
        if (messages.info && messages.info.length) {
          messages.info.forEach(msg => toast.info(msg));
        }
      } catch (e) {
        console.error('Error parsing flash messages:', e);
      }
    }
  });
})();
