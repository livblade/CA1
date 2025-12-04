/**
 * AI Chatbot for Ethan's Grains Supermarket
 * Provides intelligent assistance for customers
 */

(function() {
  'use strict';

  // Chatbot state
  let isOpen = false;
  let conversationHistory = [];

  // Knowledge base for the chatbot
  const knowledgeBase = {
    greetings: ['hello', 'hi', 'hey', 'greetings', 'good morning', 'good afternoon', 'good evening'],
    productQueries: ['product', 'item', 'sell', 'have', 'stock', 'available', 'price', 'cost'],
    categoryQueries: ['fruit', 'vegetable', 'meat', 'dairy', 'bakery', 'category'],
    navigationHelp: ['how', 'where', 'find', 'navigate', 'go to', 'page'],
    cartHelp: ['cart', 'basket', 'checkout', 'buy', 'purchase', 'order'],
    accountHelp: ['account', 'login', 'register', 'sign up', 'password', 'profile']
  };

  // Predefined responses
  const responses = {
    greeting: [
      "Hello! Welcome to Ethan's Grains! 🏪 How can I assist you today?",
      "Hi there! I'm here to help you with your shopping. What can I do for you?",
      "Greetings! Need help finding products or navigating our store?"
    ],
    products: [
      "We have a wide variety of fresh products! You can browse our full catalog on the Shopping page. What type of product are you looking for?",
      "Our inventory includes fruits, vegetables, meat, dairy, and bakery items. Would you like me to help you find something specific?",
      "You can search for products using the search bar on the Shopping page. Is there a particular item you're interested in?"
    ],
    categories: [
      "We organize products into these categories: 🍎 Fruits, 🥦 Vegetables, 🥩 Meat, 🥛 Dairy, and 🍞 Bakery. Which category interests you?",
      "Our product categories help you find what you need quickly. You can filter by category on the Shopping page!"
    ],
    navigation: [
      "Here's how to navigate our store:\n• Shopping: Browse all products\n• Cart: View your selected items\n• Orders: Check your order history\n• Profile: Manage your account",
      "Need help getting around? The main menu at the top has links to Shopping, Cart, and Orders. What page are you looking for?"
    ],
    cart: [
      "To add items to your cart:\n1. Go to the Shopping page\n2. Select quantity\n3. Click 'Add to Cart'\n4. Proceed to Checkout when ready!",
      "Your cart shows all selected items. You can update quantities or remove items before checkout. Need help with checkout?"
    ],
    account: [
      "Account features:\n• Register: Create a new account\n• Login: Access your account\n• Profile: View/edit your information\n• Orders: Track your purchases",
      "If you're having trouble with your account, make sure you're using the correct email and password. Need to reset your password?"
    ],
    default: [
      "I'm not sure I understand. Could you please rephrase your question?",
      "Hmm, I didn't quite get that. Can you ask in a different way?",
      "I'm here to help! Try asking about products, navigation, cart, or your account."
    ],
    thanks: [
      "You're welcome! Happy shopping at Ethan's Grains! 🛒",
      "My pleasure! Let me know if you need anything else!",
      "Glad I could help! Enjoy your shopping experience! 🌟"
    ],
    bye: [
      "Goodbye! Thanks for shopping with Ethan's Grains! 👋",
      "See you later! Feel free to come back if you need more help!",
      "Have a great day! Happy shopping! 🛍️"
    ]
  };

  // Initialize chatbot when DOM is ready
  document.addEventListener('DOMContentLoaded', function() {
    initChatbot();
  });

  function initChatbot() {
    createChatbotElements();
    attachEventListeners();
    addWelcomeMessage();
  }

  function createChatbotElements() {
    // Create chatbot HTML structure
    const chatbotHTML = `
      <!-- Chatbot Toggle Button -->
      <button id="chatbot-toggle" class="chatbot-toggle" aria-label="Open chatbot">
        <span class="chatbot-icon">💬</span>
        <span class="chatbot-badge">AI</span>
      </button>

      <!-- Chatbot Window -->
      <div id="chatbot-window" class="chatbot-window">
        <!-- Header -->
        <div class="chatbot-header">
          <div class="chatbot-header-content">
            <div class="chatbot-avatar">🤖</div>
            <div class="chatbot-info">
              <h3 class="chatbot-title">PLUTO</h3>
              <p class="chatbot-status">
                <span class="status-dot"></span>
                Online
              </p>
            </div>
          </div>
          <button id="chatbot-close" class="chatbot-close-btn" aria-label="Close chatbot">
            ✕
          </button>
        </div>

        <!-- Messages Container -->
        <div id="chatbot-messages" class="chatbot-messages">
          <!-- Messages will be inserted here -->
        </div>

        <!-- Quick Actions -->
        <div id="chatbot-quick-actions" class="chatbot-quick-actions">
          <button class="quick-action-btn" data-message="Show me products">
            🛍️ Browse Products
          </button>
          <button class="quick-action-btn" data-message="Help with cart">
            🛒 Cart Help
          </button>
          <button class="quick-action-btn" data-message="My orders">
            📦 My Orders
          </button>
        </div>

        <!-- Input Area -->
        <div class="chatbot-input-area">
          <input 
            type="text" 
            id="chatbot-input" 
            class="chatbot-input" 
            placeholder="Type your message..."
            autocomplete="off"
          />
          <button id="chatbot-send" class="chatbot-send-btn" aria-label="Send message">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
            </svg>
          </button>
        </div>
      </div>
    `;

    // Append to body
    document.body.insertAdjacentHTML('beforeend', chatbotHTML);
  }

  function attachEventListeners() {
    const toggleBtn = document.getElementById('chatbot-toggle');
    const closeBtn = document.getElementById('chatbot-close');
    const sendBtn = document.getElementById('chatbot-send');
    const input = document.getElementById('chatbot-input');
    const quickActionBtns = document.querySelectorAll('.quick-action-btn');

    toggleBtn.addEventListener('click', toggleChatbot);
    closeBtn.addEventListener('click', closeChatbot);
    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        sendMessage();
      }
    });

    // Quick action buttons
    quickActionBtns.forEach(btn => {
      btn.addEventListener('click', function() {
        const message = this.getAttribute('data-message');
        sendMessage(message);
      });
    });
  }

  function toggleChatbot() {
    isOpen = !isOpen;
    const window = document.getElementById('chatbot-window');
    const toggle = document.getElementById('chatbot-toggle');
    
    if (isOpen) {
      window.classList.add('chatbot-open');
      toggle.classList.add('chatbot-toggle-hidden');
      document.getElementById('chatbot-input').focus();
    } else {
      window.classList.remove('chatbot-open');
      toggle.classList.remove('chatbot-toggle-hidden');
    }
  }

  function closeChatbot() {
    isOpen = false;
    document.getElementById('chatbot-window').classList.remove('chatbot-open');
    document.getElementById('chatbot-toggle').classList.remove('chatbot-toggle-hidden');
  }

  function addWelcomeMessage() {
    setTimeout(() => {
      addMessage(
        "Hello! 👋 I am Pluto, your AI shopping assistant at Ethan's Grains. I can help you find products, navigate the store, or answer questions. How can I assist you today?",
        'bot'
      );
    }, 500);
  }

  function sendMessage(messageText) {
    const input = document.getElementById('chatbot-input');
    const message = messageText || input.value.trim();
    
    if (!message) return;

    // Add user message
    addMessage(message, 'user');
    
    // Clear input
    if (!messageText) {
      input.value = '';
    }

    // Show typing indicator
    showTypingIndicator();

    // Generate response after delay
    setTimeout(() => {
      const response = generateResponse(message);
      hideTypingIndicator();
      addMessage(response, 'bot');
    }, 800);
  }

  function addMessage(text, sender) {
    const messagesContainer = document.getElementById('chatbot-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `chatbot-message ${sender}-message`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = sender === 'bot' ? '🤖' : '👤';
    
    const content = document.createElement('div');
    content.className = 'message-content';
    content.textContent = text;
    
    const time = document.createElement('div');
    time.className = 'message-time';
    time.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);
    messageDiv.appendChild(time);
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Add to history
    conversationHistory.push({ text, sender, timestamp: new Date() });
  }

  function showTypingIndicator() {
    const messagesContainer = document.getElementById('chatbot-messages');
    const typingDiv = document.createElement('div');
    typingDiv.id = 'typing-indicator';
    typingDiv.className = 'chatbot-message bot-message typing-indicator';
    typingDiv.innerHTML = `
      <div class="message-avatar">🤖</div>
      <div class="message-content">
        <div class="typing-dots">
          <span></span><span></span><span></span>
        </div>
      </div>
    `;
    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function hideTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
      indicator.remove();
    }
  }

  function generateResponse(message) {
    const lowerMessage = message.toLowerCase();
    
    // Check for greetings
    if (knowledgeBase.greetings.some(word => lowerMessage.includes(word))) {
      return getRandomResponse(responses.greeting);
    }
    
    // Check for thank you
    if (lowerMessage.includes('thank') || lowerMessage.includes('thanks')) {
      return getRandomResponse(responses.thanks);
    }
    
    // Check for goodbye
    if (lowerMessage.includes('bye') || lowerMessage.includes('goodbye') || lowerMessage.includes('see you')) {
      return getRandomResponse(responses.bye);
    }
    
    // Check for product queries
    if (knowledgeBase.productQueries.some(word => lowerMessage.includes(word))) {
      return getRandomResponse(responses.products);
    }
    
    // Check for category queries
    if (knowledgeBase.categoryQueries.some(word => lowerMessage.includes(word))) {
      return getRandomResponse(responses.categories);
    }
    
    // Check for navigation help
    if (knowledgeBase.navigationHelp.some(word => lowerMessage.includes(word))) {
      return getRandomResponse(responses.navigation);
    }
    
    // Check for cart help
    if (knowledgeBase.cartHelp.some(word => lowerMessage.includes(word))) {
      return getRandomResponse(responses.cart);
    }
    
    // Check for account help
    if (knowledgeBase.accountHelp.some(word => lowerMessage.includes(word))) {
      return getRandomResponse(responses.account);
    }
    
    // Default response
    return getRandomResponse(responses.default);
  }

  function getRandomResponse(responseArray) {
    return responseArray[Math.floor(Math.random() * responseArray.length)];
  }
})();
