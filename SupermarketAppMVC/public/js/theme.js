/**
 * Dark Mode Theme Manager
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
  });

  /**
   * Initialize theme toggle functionality
   */
  function initThemeToggle() {
    const toggleBtn = document.getElementById('theme-toggle');
    if (!toggleBtn) return;

    // Set initial button text
    updateToggleButton(savedTheme);

    // Add click handler
    toggleBtn.addEventListener('click', function() {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      
      // Apply new theme
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      
      // Update button
      updateToggleButton(newTheme);
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
      toggleBtn.innerHTML = 'Light Mode';
    } else {
      toggleBtn.innerHTML = 'Dark Mode';
    }
  }
})();
