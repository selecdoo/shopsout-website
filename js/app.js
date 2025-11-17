// Simple interactivity: mobile nav + filters panel + live price label
(function () {
  const navToggle = document.getElementById('navToggle');
  const primaryNavMenu = document.getElementById('primaryNavMenu');
  const langSwitch = document.getElementById('langSwitch');
  const footerLangSwitch = document.getElementById('footerLangSwitch');
  const filterToggle = document.getElementById('filterToggle');
  const filterClose = null; // close icon removed
  const filtersPanel = document.getElementById('filtersPanel');
  const priceMin = document.getElementById('priceMin');
  const priceMax = document.getElementById('priceMax');
  const filtersApply = document.getElementById('filtersApply');
  const filtersReset = document.getElementById('filtersReset');
  const categoryFilters = document.getElementById('categoryFilters');
  const noResults = document.getElementById('noResults');
  const cards = Array.from(document.querySelectorAll('.deal-card'));
  const heroProductEl = document.getElementById('heroProduct');
  const hpMedia = document.getElementById('hpMedia');
  const hpBrand = document.getElementById('hpBrand');
  const hpTitle = document.getElementById('hpTitle');
  const hpPriceNow = document.getElementById('hpPriceNow');
  const hpPriceOld = document.getElementById('hpPriceOld');
  const hpCta = document.getElementById('hpCta');
  const pagination = document.getElementById('pagination');
  const paginationList = document.getElementById('paginationList');

  // Expose translations globally for other scripts
  window.translations = {
    de: {
      'nav.home': 'Start',
      'nav.deals': 'Deals',
      'nav.vouchers': 'Gutscheine',
      'nav.shops': 'Shops',
      'nav.contact': 'Kontakt',
      'nav.magazine': 'Magazin',
      'search.placeholder': 'Suche',
      'filter.title': 'Filter',
      'prices.title': 'Preise',
      'prices.min': 'Min (€):',
      'prices.max': 'Max (€):',
      'categories.title': 'Kategorien',
      // Landing specific
      'landing.hero.title': 'Entdecke Top-<span class="highlight">Angebote & Deals</span> von vertrauenswürdigen Shops',
      'landing.hero.subtitle': 'Dein Marktplatz für hochwertige & geprüfte Angebote aus vielen Kategorien – geprüft von AI.',
      'landing.hero.ctaPrimary': 'Alle Deals',
      'hero.namePlaceholder': 'Name',
      'hero.emailPlaceholder': 'E-Mail',
      'hero.signupButton': 'Abonnieren',
      'hero.socialProof': 'Über 2.500 Nutzer sparen bereits mit uns!',
      'landing.featured.title': 'Empfohlene Produkte',
      'landing.featured.link': 'Alle Angebote ansehen',
      'landing.featured.cta': 'Jetzt kaufen',
      'landing.categories.title': 'Nach Kategorie shoppen',
      'landing.best.title': 'Finde die besten Angebote',
      'landing.best.viewAll': 'Alle ansehen',
      'landing.cta.title': 'Finde heute die besten Deals',
      'landing.cta.subtitle': 'Durchsuche tausende Angebote von vertrauenswürdigen Shops an einem Ort.',
      'landing.cta.button': 'Alle Deals durchsuchen',
      'actions.clear': 'Filter löschen',
      'actions.apply': 'Anwenden',
      'card.cta': 'Zum Deal',
      'button.dealDetails': 'Deal-Details',
      'product.goToStore': 'Zum Shop',
      'product.backToDeals': 'Zurück zu den Deals',
      'product.relatedProducts': 'Ähnliche Produkte',
      'product.affiliateBonus': '+10%',
      'product.extra': 'Extra',
      'product.priceFlow.original': 'Originalpreis',
      'product.priceFlow.storeDeal': 'Shop-Angebot',
      'product.priceFlow.yourPrice': 'Dein Preis mit ShopShout',
      'product.priceFlow.savings': 'Du sparst insgesamt',
      'store.badge': 'TOP-SHOP',
      'store.status': 'Status:',
      'store.visitStore': 'Shop besuchen',
      'store.viewAllDeals': 'Alle Deals ansehen',
      'store.aboutStore': 'Über den Shop',
      'store.features': 'Shop-Features:',
      'store.productsTitle': 'Produkte und Deals von diesem Shop',
      'store.statistics': 'Statistiken',
      'store.shipping': 'Versand',
      'store.totalDeals': 'Aktive Deals gesamt:',
      'store.averageDiscount': 'Durchschnittlicher Rabatt:',
      'store.lastDeal': 'Letzter Deal hinzugefügt:',
      'store.shippingCountry': 'Land:',
      'store.shippingPrice': 'Preis:',
      'store.shippingService': 'Service:',
      'store.handlingTime': 'Bearbeitungszeit:',
      'store.transitTime': 'Versandzeit:',
      'store.showAllProducts': 'Alle {count} Produkte anzeigen',
      'store.showLess': 'Weniger anzeigen',
      'empty': 'Keine Ergebnisse für die aktuellen Filter.',
      'footer.title': 'Deals & Coupons',
      'footer.subtitle': 'Entdecke die besten Deals auf Europas innovativster AI-Deal-Plattform.',
      'footer.country.at': 'Österreich',
      'footer.country.de': 'Deutschland',
      'footer.nav': 'Navigation',
      'footer.links.contact': 'Kontakt',
      'footer.links.privacy': 'Datenschutz',
      'footer.links.impressum': 'Impressum',
      'footer.disclaimer': 'Dieser Beitrag enthält Affiliate-Links. Wenn du über einen dieser Links etwas kaufst, erhalten wir eine Provision. Der Preis bleibt für dich unverändert.',
      'footer.copy': '© 2025 – ShopShout AI',
      'footer.made_by': 'Erstellt von Spectrum AI Labs',
      'contact.message': 'Du hast eine Frage? Sende diese einfach an hello@shopshout.ai',
      'contact.title': 'Kontakt',
      'contact.subtitle': 'Wir helfen dir dabei, die besten Deals zu finden und beantworten all deine Fragen.',
      'contact.email.title': 'E-Mail senden',
      'contact.support.title': 'Kundensupport',
      'contact.support.description': 'Hilfe bei Deals, Kontofragen oder technischem Support.',
      'contact.support.hours': 'Antwortzeit: Innerhalb von 24 Stunden',
      'contact.business.title': 'Geschäftsanfragen',
      'contact.business.description': 'Partnerschaftsmöglichkeiten, Shop-Listings und Geschäftskooperationen.',
      'contact.faq.title': 'Häufig gestellte Fragen',
      'contact.faq.subtitle': 'Schnelle Antworten auf häufige Fragen',
      'contact.faq.deals.question': 'Wie findet ihr diese Deals?',
      'contact.faq.deals.answer': 'Unser KI-gestütztes System durchsucht kontinuierlich tausende vertrauenswürdige Shops, um die besten verfügbaren Deals und Rabatte zu finden.',
      'contact.faq.trust.question': 'Sind alle Deals verifiziert?',
      'contact.faq.trust.answer': 'Ja, alle Deals sind verifiziert und stammen von vertrauenswürdigen Partner-Shops. Wir gewährleisten Qualität und Authentizität jedes Angebots.',
      'contact.faq.cost.question': 'Ist ShopShout kostenlos nutzbar?',
      'contact.faq.cost.answer': 'Ja, ShopShout ist für Nutzer völlig kostenlos. Wir erhalten Provisionen von Partner-Shops, wenn du einen Kauf tätigst.',
      // Pagination translations
      'pagination.next': 'Weiter',
      'pagination.previous': 'Zurück',
      // Results meta translations
      'results.count': 'Ergebnisse',
      'results.categories': 'Kategorien',
      'results.priceRange': 'Preis',
      // Infinite scroll translations
      'infiniteScroll.loading': 'Weitere Produkte werden geladen...',
      'infiniteScroll.allLoaded': 'Alle Produkte wurden geladen',
      'infiniteScroll.noResults': 'Keine Produkte gefunden. Versuchen Sie es mit anderen Filtern.',
      // Privacy page translations
      'privacy.title': 'Datenschutzerklärung',
      // Impressum page translations
      'impressum.title': 'Impressum',
      'privacy.lastUpdated': 'Zuletzt aktualisiert: September 2025',
      'privacy.de.overview': '1. Datenschutz auf einen Blick',
      'privacy.de.generalInfo': 'Allgemeine Hinweise',
      'privacy.de.overviewText': 'Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten passiert, wenn Sie diese Website besuchen. Personenbezogene Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können.',
      'privacy.de.dataCollection': 'Datenerfassung auf dieser Website',
      'privacy.de.whoResponsible': 'Wer ist verantwortlich für die Datenerfassung auf dieser Website?',
      'privacy.de.responsibleEntity': 'Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber. Kontakt: hello@shopshout.ai',
      'privacy.de.howCollectData': 'Wie erfassen wir Ihre Daten?',
      'privacy.de.dataCollectionMethod': 'Ihre Daten werden zum einen dadurch erhoben, dass Sie uns diese mitteilen. Andere Daten werden automatisch beim Besuch der Website durch unsere IT-Systeme erfasst.',
      'privacy.de.purposeData': 'Wofür nutzen wir Ihre Daten?',
      'privacy.de.dataPurpose': 'Ein Teil der Daten wird erhoben, um eine fehlerfreie Bereitstellung der Website zu gewährleisten. Andere Daten können zur Analyse Ihres Nutzerverhaltens verwendet werden.',
      'privacy.de.rightsData': 'Welche Rechte haben Sie bezüglich Ihrer Daten?',
      'privacy.de.userRights': 'Sie haben jederzeit das Recht, unentgeltlich Auskunft über Herkunft, Empfänger und Zweck Ihrer gespeicherten personenbezogenen Daten zu erhalten.',
      'privacy.de.hosting': '2. Hosting',
      'privacy.de.externalHosting': 'Externes Hosting',
      'privacy.de.hostingText': 'Diese Website wird extern gehostet. Die personenbezogenen Daten werden auf den Servern des Hosters gespeichert.',
      'privacy.de.generalHints': '3. Allgemeine Hinweise und Pflichtinformationen',
      'privacy.de.dataProtection': 'Datenschutz',
      'privacy.de.protectionText': 'Die Betreiber dieser Seiten nehmen den Schutz Ihrer persönlichen Daten sehr ernst.',
      'privacy.de.responsibleParty': 'Hinweis zur verantwortlichen Stelle',
      'privacy.de.dataCollection4': '4. Datenerfassung auf dieser Website',
      'privacy.de.serverLogs': 'Server-Log-Dateien',
      'privacy.de.serverLogsText': 'Der Provider der Seiten erhebt und speichert automatisch Informationen in Server-Log-Dateien.',
      'privacy.de.contactForm': 'Kontaktformular',
      'privacy.de.contactFormText': 'Wenn Sie uns per Kontaktformular Anfragen zukommen lassen, werden Ihre Angaben gespeichert.',
      'privacy.de.contact': 'Kontakt',
      'privacy.de.contactInfo': 'Bei Fragen zum Datenschutz kontaktieren Sie uns unter: hello@shopshout.ai',
      'shops.title': 'Shops',
      'shops.subtitle': 'Entdecke vertrauenswürdige Shops mit den besten Deals und Angeboten.',
      'cats.auto': 'Auto',
      'cats.motorcycle': 'Motorrad',
      'cats.tire': 'Reifen',
      'cats.beauty': 'Beauty',
      'cats.cosmetics': 'Kosmetik',
      'cats.perfume': 'Parfum',
      'cats.electronics': 'Elektronik',
      'cats.printer': 'Drucker',
      'cats.tv': 'Fernseher',
      'cats.notebook': 'Notebook',
      'cats.smartphone': 'Smartphone',
      'cats.tablet': 'Tablet',
      'cats.food': 'Essen & Trinken',
      'cats.grocery': 'Lebensmittel',
      'cats.delivery': 'Lieferservice',
      'cats.fashion': 'Fashion',
      'cats.swimwear': 'Bademode',
      'cats.women': 'Damenmode',
      'cats.men': 'Herrenmode',
      'cats.shoes': 'Schuhe',
      'cats.leisure': 'Freizeit',
      'cats.outdoor': 'Outdoor',
      'cats.sport': 'Sport',
      'cats.gaming': 'Gaming',
      'cats.home': 'Haus & Garten',
      'cats.diy': 'Baumarkt',
      'cats.household': 'Haushalt',
      'cats.furniture': 'Möbel',
      'cats.children': 'Kinder',
      'cats.toys': 'Spielzeug',
      'cats.travel': 'Reise',
      'cats.hotel': 'Hotel',
      'cats.wellness': 'Wellness',
      'newsletter.title': 'Newsletter',
      'newsletter.description': 'Erhalte exklusive Deals direkt in dein Postfach!',
      'newsletter.namePlaceholder': 'Dein Name',
      'newsletter.emailPlaceholder': 'Deine E-Mail',
      'newsletter.button': 'Abonnieren',
      'newsletter.success': '🎉 Vielen Dank! Du wirst bald von uns hören!'
    },
    en: {
      'nav.home': 'Home',
      'nav.deals': 'Deals',
      'nav.vouchers': 'Vouchers',
      'nav.shops': 'Shops',
      'nav.contact': 'Contact',
      'nav.magazine': 'Magazine',
      'search.placeholder': 'Search',
      'filter.title': 'Filter',
      'prices.title': 'Prices',
      'prices.min': 'Min (€):',
      'prices.max': 'Max (€):',
      'categories.title': 'Categories',
      'actions.clear': 'Clear filters',
      'actions.apply': 'Apply',
      'card.cta': 'View deal',
      'button.dealDetails': 'Deal Details',
      'product.goToStore': 'Go to store',
      'product.backToDeals': 'Back to deals',
      'product.relatedProducts': 'Related products',
      'product.affiliateBonus': '+10%',
      'product.extra': 'Extra',
      'product.priceFlow.original': 'Original Price',
      'product.priceFlow.storeDeal': 'Store Deal',
      'product.priceFlow.yourPrice': 'Your Price with ShopShout',
      'product.priceFlow.savings': 'Total Savings',
      'store.badge': 'TOP SHOP',
      'store.status': 'Status:',
      'store.visitStore': 'Visit Store',
      'store.viewAllDeals': 'View All Deals',
      'store.aboutStore': 'About the Store',
      'store.features': 'Store Features:',
      'store.productsTitle': 'Products and deals from this store',
      'store.statistics': 'Statistics',
      'store.shipping': 'Shipping',
      'store.totalDeals': 'Total Active Deals:',
      'store.averageDiscount': 'Average Discount:',
      'store.lastDeal': 'Last Deal Added:',
      'store.shippingCountry': 'Country:',
      'store.shippingPrice': 'Price:',
      'store.shippingService': 'Service:',
      'store.handlingTime': 'Handling Time:',
      'store.transitTime': 'Transit Time:',
      'store.showAllProducts': 'Show all {count} products',
      'store.showLess': 'Show less',
      'empty': 'No results for the current filters.',
      'footer.title': 'Deals & Coupons',
      'footer.subtitle': 'Discover the best deals on Europe\'s most innovative AI deal platform.',
      'footer.country.at': 'Austria',
      'footer.country.de': 'Germany',
      'footer.nav': 'Navigation',
      'footer.links.contact': 'Contact',
      'footer.links.privacy': 'Privacy',
      'footer.links.impressum': 'Imprint',
      'footer.disclaimer': 'This post contains affiliate links. If you buy something through one of these links, we earn a commission. The price does not change for you.',
      'footer.copy': '© 2025 – ShopShout AI',
      'footer.made_by': 'Made by Spectrum AI Labs',
      'contact.message': 'Have a question? Simply send it to hello@shopshout.ai',
      'contact.title': 'Contact Us',
      'contact.subtitle': 'We\'re here to help you find the best deals and answer any questions you might have.',
      'contact.email.title': 'Email Us',
      'contact.support.title': 'Customer Support',
      'contact.support.description': 'Get help with deals, account questions, or technical support.',
      'contact.support.hours': 'Response time: Within 24 hours',
      'contact.business.title': 'Business Inquiries',
      'contact.business.description': 'Partnership opportunities, store listings, and business collaborations.',
      'contact.faq.title': 'Frequently Asked Questions',
      'contact.faq.subtitle': 'Quick answers to common questions',
      'contact.faq.deals.question': 'How do you find these deals?',
      'contact.faq.deals.answer': 'Our AI-powered system continuously scans thousands of trusted stores to find the best deals and discounts available.',
      'contact.faq.trust.question': 'Are all deals verified?',
      'contact.faq.trust.answer': 'Yes, all deals are verified and come from trusted partner stores. We ensure quality and authenticity of every offer.',
      'contact.faq.cost.question': 'Is ShopShout free to use?',
      'contact.faq.cost.answer': 'Yes, ShopShout is completely free for users. We earn commission from partner stores when you make a purchase.',
      // Pagination translations
      'pagination.next': 'Next',
      'pagination.previous': 'Previous',
      // Results meta translations
      'results.count': 'Results',
      'results.categories': 'Categories',
      'results.priceRange': 'Price',
      // Infinite scroll translations
      'infiniteScroll.loading': 'Loading more products...',
      'infiniteScroll.allLoaded': 'All products loaded',
      'infiniteScroll.noResults': 'No products found. Try different filters.',
      // Privacy page translations
      'privacy.title': 'Privacy Policy',
      // Impressum page translations
      'impressum.title': 'Imprint',
      'privacy.lastUpdated': 'Last updated: September 2025',
      'privacy.en.dataController': 'Data Controller',
      'privacy.en.whatDataWeCollect': 'What Data We Collect',
      'privacy.en.contactInfo': 'Contact Information',
      'privacy.en.contactInfoDesc': 'When you contact us via forms, email, or phone',
      'privacy.en.technicalData': 'Technical Data',
      'privacy.en.technicalDataDesc': 'IP address, browser type, pages visited, access times',
      'privacy.en.cookies': 'Cookies',
      'privacy.en.cookiesDesc': 'For website functionality and analytics (with your consent)',
      'privacy.en.whyWeUseData': 'Why We Use Your Data',
      'privacy.en.respondInquiries': 'To respond to your inquiries',
      'privacy.en.improveWebsite': 'To improve our website',
      'privacy.en.complyLegal': 'To comply with legal obligations',
      'privacy.en.businessInterests': 'For legitimate business interests',
      'privacy.en.legalBasis': 'Legal Basis',
      'privacy.en.consent': 'Consent',
      'privacy.en.consentDesc': 'When you agree to data processing',
      'privacy.en.contract': 'Contract',
      'privacy.en.contractDesc': 'To fulfill agreements with you',
      'privacy.en.legitimateInterest': 'Legitimate Interest',
      'privacy.en.legitimateInterestDesc': 'For business operations and website improvement',
      'privacy.en.legalObligation': 'Legal Obligation',
      'privacy.en.legalObligationDesc': 'To comply with applicable laws',
      'privacy.en.dataSharing': 'Data Sharing',
      'privacy.en.noSellData': 'We do not sell your data. We may share data with:',
      'privacy.en.serviceProviders': 'Service providers (hosting, analytics)',
      'privacy.en.legalAuthorities': 'Legal authorities when required by law',
      'privacy.en.yourRights': 'Your Rights',
      'privacy.en.rightsIntro': 'You have the right to:',
      'privacy.en.accessData': 'Access your personal data',
      'privacy.en.correctData': 'Correct inaccurate data',
      'privacy.en.deleteData': 'Delete your data',
      'privacy.en.restrictProcessing': 'Restrict processing',
      'privacy.en.dataPortability': 'Data portability',
      'privacy.en.objectProcessing': 'Object to processing',
      'privacy.en.withdrawConsent': 'Withdraw consent',
      'privacy.en.dataRetention': 'Data Retention',
      'privacy.en.retentionPolicy': 'We keep your data only as long as necessary for the stated purposes or as required by law.',
      'privacy.en.contactSection': 'Contact',
      'privacy.en.privacyContact': 'For privacy questions, contact us at:',
      'privacy.en.updates': 'Updates',
      'privacy.en.updatesPolicy': 'This policy may be updated periodically. Check this page for changes.',
      'shops.title': 'Shops',
      'shops.subtitle': 'Discover trusted stores with the best deals and offers.',
      'cats.auto': 'Car',
      'cats.motorcycle': 'Motorcycle',
      'cats.tire': 'Tire',
      'cats.beauty': 'Beauty',
      'cats.cosmetics': 'Cosmetics',
      'cats.perfume': 'Perfume',
      'cats.electronics': 'Electronics',
      'cats.printer': 'Printer',
      'cats.tv': 'Television set',
      'cats.notebook': 'Notebook',
      'cats.smartphone': 'Smartphone',
      'cats.tablet': 'Tablet',
      'cats.food': 'Food & Drink',
      'cats.grocery': 'Groceries',
      'cats.delivery': 'Delivery service',
      'cats.fashion': 'Fashion',
      'cats.swimwear': 'Swimwear',
      'cats.women': "Women's fashion",
      'cats.men': "Men's fashion",
      'cats.shoes': 'Shoes',
      'cats.leisure': 'Leisure',
      'cats.outdoor': 'Outdoor',
      'cats.sport': 'Sport',
      'cats.gaming': 'Gaming',
      'cats.home': 'Home & Garden',
      'cats.diy': 'DIY / Hardware',
      'cats.household': 'Household',
      'cats.furniture': 'Furniture',
      'cats.children': 'Children',
      'cats.toys': 'Toys',
      'cats.travel': 'Travel',
      'cats.hotel': 'Hotel',
      'cats.wellness': 'Wellness',
      'newsletter.title': 'Newsletter',
      'newsletter.description': 'Get exclusive deals straight to your inbox!',
      'newsletter.namePlaceholder': 'Your Name',
      'newsletter.emailPlaceholder': 'Your Email',
      'newsletter.button': 'Subscribe',
      'newsletter.success': '🎉 Thank you! You\'ll hear from us soon!',
      'landing.hero.title': 'Discover top <span class="highlight">deals & savings</span> from trusted stores',
      'landing.hero.subtitle': 'A curated marketplace for quality offers across categories you love backed by AI.',
      'landing.hero.ctaPrimary': 'See all Deals',
      'hero.namePlaceholder': 'Name',
      'hero.emailPlaceholder': 'Email',
      'hero.signupButton': 'Subscribe',
      'hero.socialProof': 'Join 2,500+ users already saving with us!',
      'landing.metrics.publishers': 'Publishers onboard',
      'landing.metrics.salesPerDay': 'Sales per day',
      'landing.metrics.uplift': 'Average uplift',
      'landing.metrics.setup': 'Setup fee',
      'landing.cta.title': 'Find the best deals today',
      'landing.cta.subtitle': 'Browse thousands of offers from trusted stores in one place.',
      'landing.cta.button': 'Browse all deals',
      'landing.featured.title': 'Featured products',
      'landing.featured.link': 'View all deals',
      'landing.featured.cta': 'Shop now',
      'landing.categories.title': 'Shop by category',
      'landing.best.title': 'Find the best deals',
      'landing.best.viewAll': 'View all'
    }
  };

  function toggleAttributeBool(el, attr) {
    const current = el.getAttribute(attr) === 'true';
    el.setAttribute(attr, String(!current));
  }

  if (navToggle && primaryNavMenu) {
    navToggle.addEventListener('click', () => {
      primaryNavMenu.classList.toggle('open');
      toggleAttributeBool(navToggle, 'aria-expanded');
    });
  }

  if (filterToggle && filtersPanel) {
    filterToggle.addEventListener('click', () => {
      filtersPanel.classList.add('open');
      filterToggle.setAttribute('aria-expanded', 'true');
    });
  }

  if (filterClose && filtersPanel) {
    filterClose.addEventListener('click', () => {
      filtersPanel.classList.remove('open');
      filterToggle.setAttribute('aria-expanded', 'false');
    });
  }

  // Close filters on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      filtersPanel?.classList.remove('open');
      filterToggle?.setAttribute('aria-expanded', 'false');
    }
  });

  // Live price display
  // keep min <= max and within bounds
  function clampPriceInputs() {
    if (!priceMin || !priceMax) return;
    let min = Math.max(0, Number(priceMin.value) || 0);
    let max = Math.min(3000, Number(priceMax.value) || 3000);
    if (min > max) { const t = min; min = max; max = t; }
    priceMin.value = String(min);
    priceMax.value = String(max);
  }
  priceMin?.addEventListener('change', clampPriceInputs);
  priceMax?.addEventListener('change', clampPriceInputs);

  // Demo buttons
  if (filtersApply) {
    filtersApply.addEventListener('click', () => {
      applyFilters();
      filtersPanel?.classList.remove('open');
      filterToggle?.setAttribute('aria-expanded', 'false');
    });
  }
  if (filtersReset) {
    filtersReset.addEventListener('click', () => {
      if (priceMin) priceMin.value = '0';
      if (priceMax) priceMax.value = '3000';
      document.querySelectorAll('.checkbox-list input[type="checkbox"]').forEach((c) => { c.checked = false; });
      applyFilters();
    });
  }

  // Also filter live when toggling categories
  if (categoryFilters) {
    categoryFilters.addEventListener('change', () => applyFilters());
  }

  // Language switching with localStorage persistence
  // Wire both header and footer switches and keep them in sync
  function wireLangSwitch(container) {
    if (!container) return [];
    const buttons = Array.from(container.querySelectorAll('button[data-lang]'));
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const lang = btn.getAttribute('data-lang');
        // Save language preference to localStorage for persistence across pages
        try {
          localStorage.setItem('selectedLanguage', lang);
        } catch (e) {
          // Handle case where localStorage might not be available (private browsing, etc.)
          console.warn('[Language] Unable to save language preference:', e);
        }
        setLanguage(lang);
        // reflect state in all switches
        syncLangSwitches(lang);
      });
    });
    return buttons;
  }

  const headerBtns = wireLangSwitch(langSwitch);
  const footerBtns = wireLangSwitch(footerLangSwitch);

  function syncLangSwitches(lang) {
    [...headerBtns, ...footerBtns].forEach(b => {
      const isActive = b.getAttribute('data-lang') === lang;
      b.classList.toggle('active', isActive);
      b.setAttribute('aria-selected', String(isActive));
    });
  }

  // Initialize language from localStorage or default to EN
  function initializeLanguage() {
    let selectedLang = 'en'; // Default fallback
    
    try {
      // Try to get saved language preference from localStorage
      const savedLang = localStorage.getItem('selectedLanguage');
      if (savedLang && (savedLang === 'en' || savedLang === 'de')) {
        selectedLang = savedLang;
      }
    } catch (e) {
      // Handle case where localStorage might not be available (private browsing, etc.)
      console.warn('[Language] Unable to read language preference:', e);
    }
    
    setLanguage(selectedLang);
    syncLangSwitches(selectedLang);
  }
  
  // Initialize language on page load
  initializeLanguage();

  function setLanguage(lang) {
    const dict = translations[lang] || translations.en;
    // text content
    document.querySelectorAll('[data-i18n]').forEach(node => {
      const key = node.getAttribute('data-i18n');
      if (dict[key]) node.textContent = dict[key];
    });
    // placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(node => {
      const key = node.getAttribute('data-i18n-placeholder');
      if (dict[key]) node.setAttribute('placeholder', dict[key]);
    });
    // update any plain footer category tags or labels that might not have data-i18n (fallback)
    document.querySelectorAll('.footer-tags a').forEach(a => {
      const k = a.getAttribute('data-i18n');
      if (k && dict[k]) a.textContent = dict[k];
    });
    // update filter category labels (spans with data-i18n in the filters list)
    document.querySelectorAll('#categoryFilters [data-i18n]').forEach(span => {
      const k = span.getAttribute('data-i18n');
      if (dict[k]) span.textContent = ` ${dict[k]}`;
    });
    // i18n for HTML content (hero headline on landing)
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const k = el.getAttribute('data-i18n-html');
      if (dict[k]) el.innerHTML = dict[k];
    });
    
    // Update pagination if it exists (for deals page)
    if (window.refreshPagination) {
      window.refreshPagination();
    }
  }

  // Helper function to apply current language to specific elements (for dynamically created content)
  function applyLanguageToElement(element) {
    const selectedLang = localStorage.getItem('selectedLanguage') || 'en';
    const dict = translations[selectedLang] || translations.en;
    
    element.querySelectorAll('[data-i18n]').forEach(node => {
      const key = node.getAttribute('data-i18n');
      if (dict[key]) node.textContent = dict[key];
    });
    
    // Also check if the element itself has data-i18n
    if (element.hasAttribute('data-i18n')) {
      const key = element.getAttribute('data-i18n');
      if (dict[key]) element.textContent = dict[key];
    }
  }

  // Make the helper function globally available
  window.applyLanguageToElement = applyLanguageToElement;

  function applyFilters() {
    clampPriceInputs();
    const minPrice = priceMin ? Number(priceMin.value) : 0;
    const maxPrice = priceMax ? Number(priceMax.value) : Infinity;
    const activeCategories = Array.from(document.querySelectorAll('#categoryFilters input:checked')).map(i => i.value);

    let visibleCount = 0;
    cards.forEach(card => {
      const price = Number(card.getAttribute('data-price')) || 0;
      const category = card.getAttribute('data-category') || '';

      const priceOk = price >= minPrice && price <= maxPrice;
      const categoryOk = activeCategories.length === 0 || activeCategories.includes(category);

      const show = priceOk && categoryOk;
      card.style.display = show ? '' : 'none';
      if (show) visibleCount += 1;
    });

    // Keep hidden by default; server-side renderer will set message when applicable
    if (noResults) noResults.style.display = 'none';

    // pagination rule: show only when more than a page of results
    const pageSize = 9; // 3 columns * 3 rows as a baseline
    buildPagination(visibleCount, pageSize);
  }

  // Initial filtering
  applyFilters();

  // Hero product rotator (live data)
  function formatCurrency(value, currency) {
    if (value == null) return '';
    try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'EUR' }).format(Number(value)); }
    catch(_) { return `${Number(value).toFixed(2)} ${currency || '€'}`; }
  }

  let heroProducts = [];
  async function loadHeroProducts() {
    if (!window.supabaseClient) return [];
    const { data, error } = await window.supabaseClient
      .from('cleaned_products')
      .select('hash_id, title, price, sale_price, image, brand, currency, store_id')
      .eq('status', 'published')
      .eq('is_slider', true)
      .not('image', 'is', null)
      .not('store_id', 'is', null)
      .order('updated_at', { ascending: false, nullsFirst: false })
      .limit(5);
    if (error || !data) return [];
    
    // Get store names for all products
    const storeIds = [...new Set(data.map(p => p.store_id).filter(Boolean))];
    const storeMap = {};
    
    if (storeIds.length > 0) {
      const { data: stores } = await window.supabaseClient
        .from('cleaned_stores')
        .select('id, cleaned_name')
        .in('id', storeIds);
      
      if (stores) {
        stores.forEach(store => {
          storeMap[store.id] = store.cleaned_name;
        });
      }
    }
    
    return data.map(p => ({
      id: p.hash_id,
      brand: storeMap[p.store_id] || p.brand || '',
      title: p.title || '', // Keep title for SEO URL generation
      now: p.sale_price ? formatCurrency(p.sale_price, p.currency) : formatCurrency(p.price, p.currency),
      old: p.sale_price && p.price && Number(p.price) > Number(p.sale_price) ? formatCurrency(p.price, p.currency) : '',
      image: p.image
    }));
  }

  function setHeroProduct(idx) {
    if (!heroProducts.length) return;
    const p = heroProducts[idx % heroProducts.length];
    if (!p || !hpBrand || !hpTitle) return;
    hpBrand.textContent = p.brand;
    hpTitle.textContent = p.title;
    hpPriceNow.textContent = p.now || '';
    if (p.old) { hpPriceOld.textContent = p.old; hpPriceOld.style.display = ''; } else { hpPriceOld.style.display = 'none'; }
    if (hpMedia) {
      hpMedia.style.background = p.image ? `center/cover no-repeat url(${CSS.escape ? CSS.escape(p.image) : p.image})` : 'linear-gradient(120deg,#e9eef5,#f3f5f8)';
    }
    if (hpCta && p.id) {
      // Use SEO-friendly URL if available, otherwise fallback to old format
      hpCta.href = window.seoUtils ? window.seoUtils.createSeoFriendlyProductUrl(p.id, p.title) : `product.html?id=${encodeURIComponent(p.id)}`;
    }
  }

  let heroIndex = 0;
  let heroTimer = null;
  function startHeroLoop() {
    if (!heroProductEl || heroProducts.length === 0) return;
    stopHeroLoop();
    heroTimer = setInterval(() => {
      heroIndex = (heroIndex + 1) % heroProducts.length;
      setHeroProduct(heroIndex);
    }, 3200);
  }
  function stopHeroLoop() { if (heroTimer) clearInterval(heroTimer); }

  (async function initHero(){
    if (!heroProductEl) return;
    
    // Show skeleton initially
    const heroSkeleton = document.getElementById('heroSkeleton');
    
    try {
      // Add a small delay to show the skeleton loading effect
      await new Promise(resolve => setTimeout(resolve, 300));
      
      heroProducts = await loadHeroProducts();
      
      if (heroProducts.length === 0) {
        // Hide both skeleton and hero if no products available
        if (heroSkeleton) heroSkeleton.style.display = 'none';
        heroProductEl.style.display = 'none';
        return;
      }
      
      // Hide skeleton and show hero product with animation
      if (heroSkeleton) {
        heroSkeleton.style.display = 'none';
      }
      
      heroProductEl.style.display = '';
      heroProductEl.classList.add('content-loaded');
      
      setHeroProduct(heroIndex);
      startHeroLoop();
      heroProductEl.addEventListener('mouseenter', stopHeroLoop);
      heroProductEl.addEventListener('mouseleave', startHeroLoop);
      heroProductEl.addEventListener('focusin', stopHeroLoop);
      heroProductEl.addEventListener('focusout', startHeroLoop);
      
    } catch (error) {
      // console.error('[Hero] Loading error:', error);
      // Show empty hero on error (hide skeleton, show hero element)
      if (heroSkeleton) heroSkeleton.style.display = 'none';
      heroProductEl.style.display = '';
    }
  })();

  function buildPagination(total, pageSize) {
    if (!pagination || !paginationList) return;
    if (total <= pageSize) {
      pagination.style.display = 'none';
      paginationList.innerHTML = '';
      return;
    }
    const totalPages = Math.ceil(total / pageSize);
    const items = [];
    for (let i = 1; i <= Math.min(totalPages, 6); i += 1) {
      items.push(`<li><a ${i === 1 ? 'class="current"' : ''} href="#">${i}</a></li>`);
    }
    if (totalPages > 6) items.push('<li aria-hidden="true">…</li>');
    items.push(`<li><a class="next" href="#">Weiter</a></li>`);
    paginationList.innerHTML = items.join('');
    pagination.style.display = '';
  }

  // Load featured stores for brand strip on landing page
  async function loadFeaturedStores() {
    // console.log('[Featured Stores] Starting to load...');
    const storesRow = document.getElementById('featuredStoresRow');
    
    if (!storesRow) {
      // console.error('[Featured Stores] Container not found!');
      return;
    }
    
    if (!window.supabaseClient) {
      // console.error('[Featured Stores] Supabase client not available!');
      storesRow.innerHTML = '<p class="muted">Database connection failed</p>';
      return;
    }
    
    // console.log('[Featured Stores] Querying database...');
    
    try {
      const { data, error } = await window.supabaseClient
        .from('cleaned_stores')
        .select('id, name, cleaned_name, logo_url, url')
        .eq('status', 'active')
        .eq('is_featured', true)
        .not('cleaned_name', 'is', null)
        .order('name', { ascending: true })
        .limit(6);
      
      // console.log('[Featured Stores] Query completed. Data:', data, 'Error:', error);
      
      if (error) {
        // console.error('[Featured Stores] Database error:', error);
        storesRow.innerHTML = `<p class="muted">Error: ${error.message}</p>`;
        return;
      }
      
      if (data && data.length > 0) {
        // Clear loading and add featured stores
        storesRow.innerHTML = '';
        const fragment = document.createDocumentFragment();
        
        data.forEach(store => {
          const storeElement = document.createElement('div');
          storeElement.className = 'brand-logo';
          
          const displayName = store.cleaned_name;
          
          if (store.logo_url) {
            // Create store element with logo only
            storeElement.innerHTML = `
              <img src="${store.logo_url}" alt="${displayName} logo" width="24" height="24" loading="lazy" decoding="async" />
            `;
          } else {
            // Fallback: show first letter of store name
            storeElement.innerHTML = `<div class="store-logo-fallback">${displayName.charAt(0).toUpperCase()}</div>`;
          }
          
          fragment.appendChild(storeElement);
        });
        
        storesRow.appendChild(fragment);
      } else {
        // No featured stores found
        storesRow.innerHTML = '<p class="muted">No featured stores available</p>';
      }
    } catch (error) {
      // console.error('[Featured Stores] Error loading featured stores:', error);
      storesRow.innerHTML = '<p class="muted">Error loading featured stores</p>';
    }
  }
  
  // Initialize featured stores on landing page
  if (document.getElementById('featuredStoresRow')) {
    loadFeaturedStores();
  }

  // Global live search with dropdown suggestions
  function setupGlobalSearch() {
    const searchForm = document.querySelector('.search');
    const searchInput = document.querySelector('.search input[type="search"]');
    
    if (!searchForm || !searchInput) return;

    // Create dropdown container
    let dropdown = document.querySelector('.search-dropdown');
    if (!dropdown) {
      dropdown = document.createElement('div');
      dropdown.className = 'search-dropdown';
      searchForm.style.position = 'relative';
      searchForm.appendChild(dropdown);
    }

    let searchTimeout;
    let currentRequest = null;

    // Live search as user types - FAST!
    searchInput.addEventListener('input', async (e) => {
      const searchTerm = e.target.value.trim();
      
      clearTimeout(searchTimeout);

      if (searchTerm.length === 0) {
        dropdown.style.display = 'none';
        dropdown.innerHTML = '';
        return;
      }

      // Instant search with minimal delay
      searchTimeout = setTimeout(async () => {
        try {
          // Cancel previous request if still pending
          if (currentRequest) {
            currentRequest.abort?.();
          }

          // Search database
          currentRequest = window.supabaseClient
            .from('cleaned_products')
            .select('hash_id, title, image, sale_price, price, currency, brand')
            .eq('status', 'published')
            .not('image', 'is', null)
            .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,brand.ilike.%${searchTerm}%`)
            .order('updated_at', { ascending: false })
            .limit(3);

          const { data, error } = await currentRequest;
          currentRequest = null;

          if (error) throw error;

          if (data && data.length > 0) {
            dropdown.innerHTML = data.map(product => {
              // Use SEO-friendly URL if available, otherwise fallback to old format
              const productUrl = window.seoUtils 
                ? window.seoUtils.createSeoFriendlyProductUrl(product.hash_id, product.title) 
                : `product.html?id=${product.hash_id}`;
              
              return `
                <a href="${productUrl}" class="search-result-item">
                  <img src="${product.image}" alt="${product.title}" class="search-result-image" loading="lazy">
                  <div class="search-result-info">
                    <div class="search-result-title">${product.title}</div>
                    <div class="search-result-brand">${product.brand || ''}</div>
                    <div class="search-result-price">${product.sale_price || product.price} ${product.currency || '€'}</div>
                  </div>
                </a>
              `;
            }).join('');
            dropdown.style.display = 'block';
          } else {
            const currentLang = localStorage.getItem('selectedLanguage') || 'en';
            const noResultsMsg = currentLang === 'de' ? 'Keine Produkte gefunden' : 'No products found';
            dropdown.innerHTML = `<div class="search-no-results">${noResultsMsg}</div>`;
            dropdown.style.display = 'block';
          }
        } catch (error) {
          if (error.name !== 'AbortError') {
            console.error('Search error:', error);
          }
          dropdown.style.display = 'none';
        }
      }, 100); // Super fast - 100ms delay
    });

    // Handle form submission (Enter key) - go to deals page
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const searchTerm = searchInput.value.trim();
      if (searchTerm) {
        window.location.href = `index.html?search=${encodeURIComponent(searchTerm)}`;
      }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!searchForm.contains(e.target)) {
        dropdown.style.display = 'none';
      }
    });
  }

  // Setup search on all pages
  setupGlobalSearch();

  // Confetti animation function
  function createConfetti() {
    const confettiCount = 50;
    const colors = ['#667eea', '#764ba2', '#f59e0b', '#10b981', '#ec4899', '#3b82f6'];
    
    for (let i = 0; i < confettiCount; i++) {
      const confetti = document.createElement('div');
      confetti.style.position = 'fixed';
      confetti.style.width = '10px';
      confetti.style.height = '10px';
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.left = Math.random() * 100 + '%';
      confetti.style.top = '-10px';
      confetti.style.opacity = '1';
      confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
      confetti.style.pointerEvents = 'none';
      confetti.style.zIndex = '9999';
      confetti.style.transform = 'rotate(' + (Math.random() * 360) + 'deg)';
      
      document.body.appendChild(confetti);
      
      const duration = Math.random() * 3 + 2;
      const xMovement = (Math.random() - 0.5) * 100;
      
      confetti.animate([
        { 
          transform: 'translateY(0) translateX(0) rotate(0deg)',
          opacity: 1 
        },
        { 
          transform: `translateY(${window.innerHeight + 20}px) translateX(${xMovement}px) rotate(${Math.random() * 720}deg)`,
          opacity: 0 
        }
      ], {
        duration: duration * 1000,
        easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      });
      
      setTimeout(() => {
        confetti.remove();
      }, duration * 1000);
    }
  }

  // Newsletter form handler (footer forms with name + email)
  function setupNewsletterForms() {
    const forms = document.querySelectorAll('.newsletter-form');
    
    forms.forEach(form => {
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const nameInput = form.querySelector('input[type="text"]');
        const emailInput = form.querySelector('input[type="email"]');
        const button = form.querySelector('.newsletter-btn');
        
        if (!nameInput.value.trim() || !emailInput.value.trim()) {
          return;
        }
        
        // Get current language
        const currentLang = localStorage.getItem('selectedLanguage') || 'en';
        
        // Trigger confetti
        createConfetti();
        
        // Update button to show success
        const originalButtonText = button.textContent;
        button.textContent = '✓ ' + (currentLang === 'de' ? 'Erfolgreich!' : 'Success!');
        button.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
        button.disabled = true;
        
        // Reset form
        form.reset();
        
        // Reset button after 3 seconds
        setTimeout(() => {
          button.textContent = originalButtonText;
          button.style.background = '';
          button.disabled = false;
        }, 3000);
        
        // TODO: Add actual newsletter API integration here
        console.log('Newsletter subscription:', {
          name: nameInput.value,
          email: emailInput.value
        });
      });
    });
  }

  // Hero signup form handler (name + email)
  function setupHeroSignupForm() {
    const form = document.querySelector('.hero-signup-form');
    if (!form) return;
    
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const inputs = form.querySelectorAll('.hero-signup-input');
      const nameInput = inputs[0];
      const emailInput = inputs[1];
      const button = form.querySelector('.hero-signup-btn');
      
      if (!nameInput.value.trim() || !emailInput.value.trim()) {
        return;
      }
      
      // Get current language
      const currentLang = localStorage.getItem('selectedLanguage') || 'en';
      
      // Trigger confetti
      createConfetti();
      
      // Update button to show success
      const originalButtonText = button.textContent;
      button.textContent = '✓ ' + (currentLang === 'de' ? 'Erfolgreich!' : 'Success!');
      button.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
      button.disabled = true;
      
      // Reset form
      form.reset();
      
      // Reset button after 3 seconds
      setTimeout(() => {
        button.textContent = originalButtonText;
        button.style.background = '';
        button.disabled = false;
      }, 3000);
      
      // TODO: Add actual newsletter API integration here
      console.log('Hero signup:', {
        name: nameInput.value,
        email: emailInput.value
      });
    });
  }

  // Initialize forms
  setupNewsletterForms();
  setupHeroSignupForm();
})();


