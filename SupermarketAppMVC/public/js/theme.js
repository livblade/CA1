/**
 * Dark Mode Theme Manager with Enhanced Transitions
 * Handles theme switching and persistence using localStorage
 */

(function() {
  'use strict';

  // Get saved theme from localStorage or default to 'light'
  const savedTheme = localStorage.getItem('theme') || 'light';
  
  // Apply theme immediately to prevent flash
  document.documentElement.setAttribute('data-theme', savedTheme);

  // Wait for DOM to be ready
  document.addEventListener('DOMContentLoaded', function() {
    initThemeToggle();
    addTransitionClass();
  });

  /**
   * Add transition class to body after initial load
   * Prevents transitions from running on page load
   */
  function addTransitionClass() {
    setTimeout(() => {
      document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
    }, 100);
  }

  /**
   * Initialize theme toggle functionality with smooth transitions
   */
  function initThemeToggle() {
    const toggleBtn = document.getElementById('theme-toggle');
    if (!toggleBtn) return;

    // Set initial button text
    updateToggleButton(savedTheme);

    // Add click handler with animation
    toggleBtn.addEventListener('click', function() {
      // Add loading state
      toggleBtn.classList.add('loading');
      
      setTimeout(() => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        // Apply new theme with transition
        document.documentElement.style.transition = 'all 0.3s ease';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        // Update button
        updateToggleButton(newTheme);
        
        // Remove loading state
        toggleBtn.classList.remove('loading');
        
        // Add success animation
        toggleBtn.style.transform = 'scale(1.1)';
        setTimeout(() => {
          toggleBtn.style.transform = '';
        }, 200);
      }, 150);
    });
  }

  /**
   * Update toggle button text and icon based on current theme
   * @param {string} theme - Current theme ('light' or 'dark')
   */
  function updateToggleButton(theme) {
    const toggleBtn = document.getElementById('theme-toggle');
    if (!toggleBtn) return;

    if (theme === 'dark') {
      toggleBtn.innerHTML = '☀️ Light Mode';
      toggleBtn.setAttribute('aria-label', 'Switch to light mode');
    } else {
      toggleBtn.innerHTML = '🌙 Dark Mode';
      toggleBtn.setAttribute('aria-label', 'Switch to dark mode');
    }
  }
})();
