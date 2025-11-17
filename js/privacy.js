(function() {
  'use strict';

  // Privacy page specific language switching
  function handlePrivacyLanguage() {
    const langContents = document.querySelectorAll('[data-lang-content]');
    
    function showLanguageContent(lang) {
      langContents.forEach(content => {
        const contentLang = content.getAttribute('data-lang-content');
        if (contentLang === lang) {
          content.style.display = 'block';
        } else {
          content.style.display = 'none';
        }
      });
    }

    // Get initial language from localStorage or default to 'en'
    const savedLang = localStorage.getItem('selectedLanguage') || 'en';
    showLanguageContent(savedLang);

    // Listen for language changes
    document.addEventListener('click', function(e) {
      if (e.target.closest('[data-lang]')) {
        const langButton = e.target.closest('[data-lang]');
        const selectedLang = langButton.getAttribute('data-lang');
        showLanguageContent(selectedLang);
      }
    });

    // Also listen for custom language change events
    document.addEventListener('languageChanged', function(e) {
      showLanguageContent(e.detail.language);
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', handlePrivacyLanguage);
  } else {
    handlePrivacyLanguage();
  }
})();
