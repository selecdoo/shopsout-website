(async function(){
  if (!window.supabaseClient) return;
  
  // Store the current store data globally for language switching
  let currentStoreData = null;
  let currentStoreDeals = [];
  let currentStoreName = '';
  let allStoreProducts = []; // Store all products for expand/collapse
  let isShowingAllProducts = false; // Track expanded state
  let currentStoreId = null; // Track current store ID

  // Get store identifier from URL parameter (supports both 'store' and legacy 'id')
  function getStoreIdentifierFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    // Try 'store' parameter first (new format), then 'id' (legacy format)
    return {
      identifier: urlParams.get('store') || urlParams.get('id'),
      isLegacyId: !urlParams.get('store') && !!urlParams.get('id')
    };
  }

  // Helper function to get translation
  function getTranslation(key, lang) {
    if (window.translations && window.translations[lang] && window.translations[lang][key]) {
      return window.translations[lang][key];
    }
    // Fallback to key if translation not found
    return key;
  }

  // Fetch store details from cleaned_stores table
  // Supports lookup by cleaned_name (preferred) or id (legacy)
  async function fetchStoreDetails(identifier, isLegacyId = false) {
    let query = window.supabaseClient
      .from('cleaned_stores')
      .select('*');
    
    // If it's a legacy ID (UUID format) or explicitly marked as legacy, use id lookup
    if (isLegacyId) {
      query = query.eq('id', identifier);
    } else {
      // Try cleaned_name first (new format) - use case-insensitive match
      query = query.ilike('cleaned_name', identifier);
    }
    
    const { data, error } = await query.single();
    
    if (error) {
      // console.error('[Supabase] fetch store error', error);
      return null;
    }
    return data;
  }

  // Fetch store statistics (products count, avg discount, etc.)
  async function fetchStoreStats(storeId) {
    try {
      // Get total products count
      const { count: totalProducts } = await window.supabaseClient
        .from('cleaned_products')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', storeId)
        .eq('status', 'published');

      // Get products with prices for discount calculation
      const { data: products } = await window.supabaseClient
        .from('cleaned_products')
        .select('price, sale_price, updated_at')
        .eq('store_id', storeId)
        .eq('status', 'published')
        .not('price', 'is', null)
        .not('sale_price', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(100);

      // Calculate average discount
      let avgDiscount = 0;
      if (products && products.length > 0) {
        const discounts = products
          .filter(p => p.price > p.sale_price)
          .map(p => ((p.price - p.sale_price) / p.price) * 100);
        
        if (discounts.length > 0) {
          avgDiscount = Math.round(discounts.reduce((a, b) => a + b, 0) / discounts.length);
        }
      }

      // Get last deal added date
      const { data: lastDeal } = await window.supabaseClient
        .from('cleaned_products')
        .select('updated_at')
        .eq('store_id', storeId)
        .eq('status', 'published')
        .order('updated_at', { ascending: false })
        .limit(1);

      return {
        totalProducts: totalProducts || 0,
        avgDiscount,
        lastDealAdded: lastDeal && lastDeal[0] ? lastDeal[0].updated_at : null
      };
    } catch (error) {
      // console.error('[Supabase] fetch store stats error', error);
      return {
        totalProducts: 0,
        avgDiscount: 0,
        lastDealAdded: null
      };
    }
  }

  // Fetch all deals from this store
  async function fetchAllStoreDeals(storeId) {
    const { data, error } = await window.supabaseClient
      .from('cleaned_products')
      .select('hash_id, title, price, sale_price, image, brand, link, currency, description, updated_at')
      .eq('store_id', storeId)
      .eq('status', 'published')
      .not('image', 'is', null)
      .order('updated_at', { ascending: false });
    
    if (error) {
      // console.error('[Supabase] fetch store deals error', error);
      return [];
    }
    
    if (!data || data.length === 0) {
      return [];
    }
    
    // Sort products by discount percentage (highest first)
    const sortedData = data.sort((a, b) => {
      // Calculate discount percentage for product A
      const hasDiscountA = a.sale_price && a.price && Number(a.price) > Number(a.sale_price);
      const discountA = hasDiscountA 
        ? ((Number(a.price) - Number(a.sale_price)) / Number(a.price)) * 100 
        : 0;
      
      // Calculate discount percentage for product B
      const hasDiscountB = b.sale_price && b.price && Number(b.price) > Number(b.sale_price);
      const discountB = hasDiscountB 
        ? ((Number(b.price) - Number(b.sale_price)) / Number(b.price)) * 100 
        : 0;
      
      // Sort by discount (highest first)
      if (discountA !== discountB) {
        return discountB - discountA;
      }
      
      // If discounts are equal (including both zero), sort by date (most recent first)
      return new Date(b.updated_at) - new Date(a.updated_at);
    });
    
    return sortedData;
  }

  // Format currency helper
  function formatCurrency(value, currency = '€') {
    if (value == null) return '';
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'EUR' }).format(Number(value));
    } catch(_) {
      return `${Number(value).toFixed(2)} ${currency || '€'}`;
    }
  }

  // Create product card (same design as related products in product.html)
  function createProductCard(product, storeName = '') {
    const card = document.createElement('article');
    card.className = 'product-card';
    
    const media = document.createElement('div');
    media.className = 'product-media';
    media.style.position = 'relative'; // Make media a positioning context
    if (product.image) {
      media.style.background = `center/cover no-repeat url(${CSS.escape ? CSS.escape(product.image) : product.image})`;
    }
    
    const body = document.createElement('div');
    body.className = 'product-body';
    
    const brand = document.createElement('span');
    brand.className = 'brand-tag';
    brand.textContent = storeName || product.store_name || product.brand || '';
    
    const title = document.createElement('h3');
    title.className = 'product-title';
    title.textContent = product.title || 'Product';
    
    const prices = document.createElement('div');
    prices.className = 'deal-prices';
    
    // Check if there's a discount
    const hasDiscount = product.sale_price && product.price && Number(product.price) > Number(product.sale_price);
    if (hasDiscount) {
      prices.classList.add('has-discount');
      // Add discount badge to MEDIA (image area) so it never overlaps with text
      const discountPercent = Math.round(((Number(product.price) - Number(product.sale_price)) / Number(product.price)) * 100);
      const discountBadge = document.createElement('span');
      discountBadge.className = 'discount-badge';
      discountBadge.textContent = `-${discountPercent}%`;
      media.appendChild(discountBadge); // FIXED: Attach to media instead of card
    }
    
    const now = document.createElement('span');
    now.className = 'price-now';
    now.textContent = product.sale_price ? formatCurrency(product.sale_price, product.currency || 'EUR') : formatCurrency(product.price, product.currency || 'EUR');
    prices.appendChild(now);
    
    if (hasDiscount) {
      const old = document.createElement('span');
      old.className = 'price-old';
      old.textContent = formatCurrency(product.price, product.currency || 'EUR');
      prices.appendChild(old);
    }
    
    const cta = document.createElement('a');
    cta.className = 'btn btn-primary';
    // Use SEO-friendly URL if available, otherwise fallback to old format
    cta.href = window.seoUtils ? window.seoUtils.createSeoFriendlyProductUrl(product.hash_id, product.title) : `product.html?id=${encodeURIComponent(product.hash_id)}`;
    cta.setAttribute('data-i18n', 'card.cta');
    cta.textContent = 'View deal'; // fallback
    
    body.append(brand, title, prices, cta);
    card.append(media, body);
    
    // Apply current language to the button
    if (window.applyLanguageToElement) {
      window.applyLanguageToElement(cta);
    }
    
    return card;
  }

  // Update store description based on current language
  function updateStoreDescription(store) {
    const descriptionEl = document.getElementById('aboutStoreDescription');
    if (!descriptionEl || !store) return;
    
    const currentLang = localStorage.getItem('selectedLanguage') || 'en';
    let storeDescription = null;
    
    if (currentLang === 'de') {
      // German: try formatted description first, then fallbacks
      storeDescription = store.description_german_formatted || store.description_german || store.seo_text || store.description || null;
    } else {
      // English: try formatted description first, then fallbacks  
      storeDescription = store.description_english_formatted || store.description_english || store.seo_text || store.description || null;
    }
    
    if (storeDescription && storeDescription.trim()) {
      // Check if description contains HTML tags (formatted version)
      const hasHTMLTags = /<[^>]*>/g.test(storeDescription);
      
      if (hasHTMLTags) {
        // Use innerHTML for formatted HTML descriptions
        descriptionEl.innerHTML = storeDescription.trim();
      } else {
        // Use textContent for plain text descriptions (fallbacks)
        descriptionEl.textContent = storeDescription.trim();
      }
    } else {
      // Show appropriate "no description" message based on language
      const noDescMsg = currentLang === 'de' 
        ? '<em>Keine Beschreibung für diesen Shop verfügbar.</em>'
        : '<em>No description available for this store.</em>';
      descriptionEl.innerHTML = noDescMsg;
    }
  }

  // Update store badge and status based on current language
  function updateStoreBadgeAndStatus(store) {
    if (!store) return;
    
    const currentLang = localStorage.getItem('selectedLanguage') || 'en';
    
    // Update badge
    const badge = document.getElementById('storeBadge');
    if (badge) {
      if (store.is_published_to_deals) {
        badge.textContent = currentLang === 'de' ? 'TOP-SHOP' : 'TOP SHOP';
      } else {
        badge.textContent = currentLang === 'de' ? 'SHOP-HIGHLIGHT' : 'STORE HIGHLIGHT';
      }
    }
  }

  // Update store features based on current language
  function updateStoreFeatures(store) {
    const featuresList = document.getElementById('storeFeaturesList');
    if (!featuresList || !store) return;
    
    const currentLang = localStorage.getItem('selectedLanguage') || 'en';
    const features = [];
    
    if (store.ai_shipping_country) {
      const shipsToText = currentLang === 'de' ? 'Versand nach' : 'Ships to';
      features.push(`${shipsToText} ${store.ai_shipping_country}`);
    }
    if (store.platform) {
      const poweredText = currentLang === 'de' ? 'betriebener Shop' : 'powered store';
      const platformName = store.platform.charAt(0).toUpperCase() + store.platform.slice(1);
      features.push(`${platformName} ${poweredText}`);
    }
    if (store.ai_shipping_service) {
      const shippingText = currentLang === 'de' ? 'Versand' : 'shipping';
      features.push(`${store.ai_shipping_service} ${shippingText}`);
    }
    if (store.status === 'active') {
      const activeText = currentLang === 'de' ? 'Aktiver und verifizierter Shop' : 'Active and verified store';
      features.push(activeText);
    }
    
    if (features.length === 0) {
      const noFeaturesText = currentLang === 'de' ? 'Keine zusätzlichen Features verfügbar' : 'No additional features available';
      features.push(noFeaturesText);
    }
    
    featuresList.innerHTML = features.map(feature => `<li>${feature}</li>`).join('');
  }

  // Render store details
  function renderStoreDetails(store, stats) {
    // Store the data globally for language switching
    currentStoreData = store;
    
    const displayName = store.cleaned_name;
    
    // Hero Section
    document.getElementById('storeMainTitle').textContent = displayName;
    
    // Store badge
    const badge = document.getElementById('storeBadge');
    // Get current language for badge text
    const currentLang = localStorage.getItem('selectedLanguage') || 'en';
    if (store.is_published_to_deals) {
      badge.textContent = currentLang === 'de' ? 'Top-Shop' : 'Top Shop';
      badge.style.background = '#10b981';
    } else {
      badge.textContent = currentLang === 'de' ? 'Shop-Highlight' : 'Store Highlight';
    }
    
    // Main store image/logo
    const imageContainer = document.getElementById('storeMainImage');
    if (store.logo_url) {
      imageContainer.innerHTML = `<img src="${store.logo_url}" alt="${displayName}" />`;
    } else {
      imageContainer.innerHTML = `<div class="store-logo-fallback">${displayName.charAt(0).toUpperCase()}</div>`;
    }
    
    // Meta information (status display removed per client request)
    
    // Action buttons
    // Use affiliate_link_base if available, otherwise fall back to regular url
    const visitStoreUrl = store.affiliate_link_base && store.affiliate_link_base.trim() !== '' 
      ? store.affiliate_link_base 
      : store.url;
    document.getElementById('visitStoreMainBtn').href = visitStoreUrl;
    
    // Use cleaned_name for SEO-friendly URL, fallback to id if not available
    const storeParam = store.cleaned_name ? encodeURIComponent(store.cleaned_name) : store.id;
    document.getElementById('viewAllStoreDealsBtn').href = `index.html?store=${storeParam}`;
    
    // Statistics Card
    document.getElementById('totalActiveDeals').textContent = stats.totalProducts || '0';
    const naText = currentLang === 'de' ? 'Keine Angabe' : 'N/A';
    document.getElementById('averageDiscount').textContent = stats.avgDiscount > 0 ? `${stats.avgDiscount}%` : naText;
    
    if (stats.lastDealAdded) {
      const lastDealDate = new Date(stats.lastDealAdded);
      const daysAgo = Math.floor((new Date() - lastDealDate) / (1000 * 60 * 60 * 24));
      const todayText = currentLang === 'de' ? 'Heute' : 'Today';
      const daysAgoText = currentLang === 'de' ? `vor ${daysAgo} Tagen` : `${daysAgo} days ago`;
      document.getElementById('lastDealDate').textContent = daysAgo === 0 ? todayText : daysAgoText;
    } else {
      document.getElementById('lastDealDate').textContent = naText;
    }
    
    // Shipping Card
    const notSpecifiedText = currentLang === 'de' ? 'Nicht angegeben' : 'Not specified';
    document.getElementById('shippingCountryMain').textContent = store.ai_shipping_country || notSpecifiedText;
    document.getElementById('shippingPriceMain').textContent = store.ai_shipping_price || notSpecifiedText;
    document.getElementById('shippingServiceMain').textContent = store.ai_shipping_service || notSpecifiedText;
    
    const daysText = currentLang === 'de' ? 'Tage' : 'days';
    if (store.ai_shipping_min_handling_time && store.ai_shipping_max_handling_time) {
      document.getElementById('handlingTimeMain').textContent = `${store.ai_shipping_min_handling_time}-${store.ai_shipping_max_handling_time} ${daysText}`;
    } else {
      document.getElementById('handlingTimeMain').textContent = notSpecifiedText;
    }
    
    if (store.ai_shipping_min_transit_time && store.ai_shipping_max_transit_time) {
      document.getElementById('transitTimeMain').textContent = `${store.ai_shipping_min_transit_time}-${store.ai_shipping_max_transit_time} ${daysText}`;
    } else {
      document.getElementById('transitTimeMain').textContent = notSpecifiedText;
    }
    
    // About Store Section
    // Update store description (will be called again on language change)
    updateStoreDescription(store);
    
    // Update store features (will be called again on language change)
    updateStoreFeatures(store);
    
  }

  // Render store deals
  function renderStoreDeals(deals, storeName = '', isSearchResult = false) {
    const dealsGrid = document.getElementById('storeProductsGrid');
    const productsSection = document.querySelector('.store-products-section');
    
    // Remove existing expand/collapse link if present
    const existingLink = productsSection.querySelector('.expand-products-link');
    if (existingLink) {
      existingLink.remove();
    }
    
    dealsGrid.innerHTML = '';
    
    if (deals.length === 0) {
      const currentLang = localStorage.getItem('selectedLanguage') || 'en';
      let noDealsMsg;
      
      if (isSearchResult) {
        noDealsMsg = currentLang === 'de' 
          ? 'Keine Produkte gefunden. Versuchen Sie einen anderen Suchbegriff.'
          : 'No products found. Try a different search term.';
      } else {
        noDealsMsg = currentLang === 'de' 
          ? 'Derzeit sind keine Deals von diesem Shop verfügbar.'
          : 'No deals available from this store at the moment.';
      }
      
      dealsGrid.innerHTML = `<div class="no-deals-message">${noDealsMsg}</div>`;
      return;
    }
    
    // Determine how many products to show
    const displayLimit = isShowingAllProducts ? deals.length : 6;
    const dealsToShow = deals.slice(0, displayLimit);
    
    const fragment = document.createDocumentFragment();
    dealsToShow.forEach(deal => {
      fragment.appendChild(createProductCard(deal, storeName));
    });
    dealsGrid.appendChild(fragment);
    
    // Add expand/collapse link if there are more than 6 products
    if (deals.length > 6) {
      const currentLang = localStorage.getItem('selectedLanguage') || 'en';
      
      const expandLink = document.createElement('div');
      expandLink.className = 'expand-products-link';
      
      if (isShowingAllProducts) {
        // Show "Show less" option
        const showLessText = getTranslation('store.showLess', currentLang);
        expandLink.innerHTML = `<a href="#" class="show-less-link">${showLessText}</a>`;
      } else {
        // Show "Show all X products" option
        const showAllText = getTranslation('store.showAllProducts', currentLang).replace('{count}', deals.length);
        expandLink.innerHTML = `<a href="#" class="show-all-link">${showAllText}</a>`;
      }
      
      productsSection.appendChild(expandLink);
      
      // Add click handler
      const link = expandLink.querySelector('a');
      link.addEventListener('click', handleExpandCollapseClick);
    }
  }

  // Handle expand/collapse click
  function handleExpandCollapseClick(e) {
    e.preventDefault();
    
    // Toggle state
    isShowingAllProducts = !isShowingAllProducts;
    
    // Re-render with new state
    renderStoreDeals(allStoreProducts, currentStoreName);
    
    // Smooth scroll to top of products section if collapsing
    if (!isShowingAllProducts) {
      const productsSection = document.querySelector('.store-products-section');
      if (productsSection) {
        productsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  // Show loading state
  function showLoading() {
    document.getElementById('loadingState').style.display = 'block';
    document.getElementById('errorState').style.display = 'none';
    document.getElementById('storeContent').style.display = 'none';
  }

  // Show error state
  function showError() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('errorState').style.display = 'block';
    document.getElementById('storeContent').style.display = 'none';
  }

  // Show content
  function showContent() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('errorState').style.display = 'none';
    document.getElementById('storeContent').style.display = 'block';
  }

  // Initialize store page
  async function initStorePage() {
    const { identifier, isLegacyId } = getStoreIdentifierFromURL();
    
    if (!identifier) {
      showError();
      return;
    }
    
    showLoading();
    
    try {
      // Fetch store details first to get the actual store ID
      const store = await fetchStoreDetails(identifier, isLegacyId);
      
      if (!store) {
        showError();
        return;
      }
      
      // Store current store ID globally
      currentStoreId = store.id;
      
      // Fetch stats and ALL deals in parallel using the actual store ID
      const [stats, deals] = await Promise.all([
        fetchStoreStats(store.id),
        fetchAllStoreDeals(store.id)
      ]);
      
      // Update page title
      document.title = `${store.cleaned_name} – Store Details – ShopShout`;
      
      // Store all products and name globally
      allStoreProducts = deals;
      currentStoreDeals = deals;
      currentStoreName = store.cleaned_name;
      
      // Reset expanded state
      isShowingAllProducts = false;
      
      // Render everything
      renderStoreDetails(store, stats);
      renderStoreDeals(deals, store.cleaned_name);
      
      showContent();
      
    } catch (error) {
      // console.error('[Store] initialization error', error);
      showError();
    }
  }

  // Initialize toggle functionality for store details
  function initToggleFunctionality() {
    const toggleHeaders = document.querySelectorAll('.toggle-header');
    
    function toggleSection(header) {
      const toggleId = header.getAttribute('data-toggle');
      const content = document.getElementById(toggleId + 'Content');
      
      if (content) {
        // Toggle collapsed state
        const isCollapsed = header.classList.contains('collapsed');
        
        if (isCollapsed) {
          // Expand
          header.classList.remove('collapsed');
          content.classList.remove('collapsed');
          header.setAttribute('aria-expanded', 'true');
        } else {
          // Collapse
          header.classList.add('collapsed');
          content.classList.add('collapsed');
          header.setAttribute('aria-expanded', 'false');
        }
      }
    }
    
    toggleHeaders.forEach(header => {
      // Click event
      header.addEventListener('click', function() {
        toggleSection(this);
      });
      
      // Keyboard navigation (Enter and Space)
      header.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleSection(this);
        }
      });
    });
    
    // Initialize with sections collapsed by default (except "about" which has no toggle header)
    setTimeout(() => {
      toggleHeaders.forEach(header => {
        const toggleId = header.getAttribute('data-toggle');
        const content = document.getElementById(toggleId + 'Content');
        
        // Only collapse sections that have toggle headers (statistics, shipping)
        if (content && toggleId !== 'about') {
          header.classList.add('collapsed');
          content.classList.add('collapsed');
          header.setAttribute('aria-expanded', 'false');
        }
      });
    }, 100);
  }

  // Update "no deals" message if present
  function updateNoDealsMessage() {
    const noDealsEl = document.querySelector('.no-deals-message');
    if (noDealsEl) {
      const currentLang = localStorage.getItem('selectedLanguage') || 'en';
      const noDealsMsg = currentLang === 'de' 
        ? 'Derzeit sind keine Deals von diesem Shop verfügbar.'
        : 'No deals available from this store at the moment.';
      noDealsEl.textContent = noDealsMsg;
    }
  }

  // Update expand/collapse link text when language changes
  function updateExpandCollapseLink() {
    const expandLink = document.querySelector('.expand-products-link a');
    if (expandLink && allStoreProducts.length > 6) {
      const currentLang = localStorage.getItem('selectedLanguage') || 'en';
      
      if (isShowingAllProducts) {
        const showLessText = getTranslation('store.showLess', currentLang);
        expandLink.textContent = showLessText;
        expandLink.className = 'show-less-link';
      } else {
        const showAllText = getTranslation('store.showAllProducts', currentLang).replace('{count}', allStoreProducts.length);
        expandLink.textContent = showAllText;
        expandLink.className = 'show-all-link';
      }
    }
  }


  // Listen for language changes to update store description and features
  function setupLanguageChangeListener() {
    // Listen for language changes (custom event or manual checking)
    document.addEventListener('languageChanged', function() {
      if (currentStoreData) {
        updateStoreBadgeAndStatus(currentStoreData);
        updateStoreDescription(currentStoreData);
        updateStoreFeatures(currentStoreData);
        updateNoDealsMessage();
        updateExpandCollapseLink();
      }
    });
    
    // Also listen for storage changes (when language is changed from other tabs/pages)
    window.addEventListener('storage', function(e) {
      if (e.key === 'selectedLanguage' && currentStoreData) {
        updateStoreBadgeAndStatus(currentStoreData);
        updateStoreDescription(currentStoreData);
        updateStoreFeatures(currentStoreData);
        updateNoDealsMessage();
        updateExpandCollapseLink();
      }
    });
    
    // Listen for clicks on language buttons (backup method)
    document.addEventListener('click', function(e) {
      if (e.target.closest('[data-lang]') && currentStoreData) {
        // Small delay to ensure language has been updated
        setTimeout(() => {
          updateStoreBadgeAndStatus(currentStoreData);
          updateStoreDescription(currentStoreData);
          updateStoreFeatures(currentStoreData);
          updateNoDealsMessage();
          updateExpandCollapseLink();
        }, 100);
      }
    });
  }

  // Auto-run on store page
  if (document.querySelector('.store-content')) {
    await initStorePage();
    initToggleFunctionality();
    setupLanguageChangeListener();
  }
})();


