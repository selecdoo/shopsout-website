(async function(){
  if (!window.supabaseClient) return;

  // Global store names cache for filter display
  let storeNames = {};

  // Initialize store name from URL parameter if present
  async function initializeStoreNameFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const storeParam = urlParams.get('store');
    
    if (!storeParam) return;
    
    // Check if it's a UUID (legacy format) or a cleaned_name
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(storeParam);
    
    if (isUUID) {
      // Legacy: fetch store name by ID
      if (!storeNames[storeParam]) {
        await fetchStoreNames([storeParam]);
      }
    } else {
      // New: storeParam is already the cleaned_name, just cache it (case-insensitive)
      const { data: storeData } = await window.supabaseClient
        .from('cleaned_stores')
        .select('id, cleaned_name')
        .ilike('cleaned_name', storeParam)
        .single();
      
      if (storeData) {
        storeNames[storeData.id] = storeData.cleaned_name;
      }
    }
  }

  async function fetchTopProducts(limit = 9) {
    // Fetch active products with images and a sale price first
    const { data, error } = await window.supabaseClient
      .from('cleaned_products')
      .select('hash_id, title, price, sale_price, image, brand, link, affiliate_link, currency, store_id')
      .eq('status', 'published')
      .not('image', 'is', null)
      .not('store_id', 'is', null)
      .order('updated_at', { ascending: false, nullsFirst: false })
      .limit(limit);
    if (error) {
      // console.error('[Supabase] fetch error', error);
      return [];
    }
    
    const products = data || [];
    if (products.length === 0) return [];
    
    // Get store names for all products
    const storeIds = [...new Set(products.map(p => p.store_id).filter(Boolean))];
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
    
    // Add store names to products
    return products.map(p => ({
      ...p,
      store_name: storeMap[p.store_id] || p.brand
    }));
  }

  // Fetch and cache store names for filter display
  async function fetchStoreNames(storeIds) {
    if (!storeIds || storeIds.length === 0) return;
    
    // Only fetch stores we don't already have cached
    const uncachedIds = storeIds.filter(id => !storeNames[id]);
    if (uncachedIds.length === 0) return;
    
    const { data: stores } = await window.supabaseClient
      .from('cleaned_stores')
      .select('id, cleaned_name')
      .in('id', uncachedIds);
    
    if (stores) {
      stores.forEach(store => {
        storeNames[store.id] = store.cleaned_name;
      });
    }
  }

  function formatCurrency(value, currency = '€') {
    if (value == null) return '';
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'EUR' }).format(Number(value));
    } catch(_) {
      return `${Number(value).toFixed(2)} ${currency || '€'}`;
    }
  }

  function createProductCard(p) {
    const card = document.createElement('article');
    card.className = 'product-card';
    const media = document.createElement('div');
    media.className = 'product-media';
    media.style.position = 'relative'; // Make media a positioning context
    
    // Add lazy loading for background images
    if (p.image) {
      // Create a temporary image for lazy loading
      const img = new Image();
      img.onload = () => {
        media.style.background = `center/cover no-repeat url(${CSS.escape ? CSS.escape(p.image) : p.image})`;
        media.style.opacity = '1';
      };
      img.src = p.image;
      media.style.opacity = '0.7'; // Show a loading state
      media.style.transition = 'opacity 0.3s ease';
    }
    
    const body = document.createElement('div');
    body.className = 'product-body';
    const brand = document.createElement('span');
    brand.className = 'brand-tag';
    brand.textContent = p.store_name || 'Deal';
    const title = document.createElement('h3');
    title.className = 'product-title';
    title.textContent = p.title || 'Product';
    const prices = document.createElement('div');
    prices.className = 'deal-prices';
    
    // Check if there's a discount
    const hasDiscount = p.sale_price && p.price && Number(p.price) > Number(p.sale_price);
    
    if (hasDiscount) {
      prices.classList.add('has-discount');
      // FIXED: Add discount badge to MEDIA (image area) so it never overlaps with text
      const discountPercent = Math.round(((Number(p.price) - Number(p.sale_price)) / Number(p.price)) * 100);
      const discountBadge = document.createElement('span');
      discountBadge.className = 'discount-badge';
      discountBadge.textContent = `-${discountPercent}%`;
      media.appendChild(discountBadge); // FIXED: Attach to media instead of card
    }
    
    const now = document.createElement('span'); now.className = 'price-now';
    now.textContent = p.sale_price ? formatCurrency(p.sale_price, p.currency) : formatCurrency(p.price, p.currency);
    prices.appendChild(now);
    
    if (hasDiscount) {
      const old = document.createElement('span'); old.className = 'price-old';
      old.textContent = formatCurrency(p.price, p.currency); 
      prices.appendChild(old);
    }
    const cta = document.createElement('a'); cta.className = 'btn btn-primary';
    // Use affiliate_link for the button, fallback to regular link if not available
    if (p.affiliate_link && p.affiliate_link.trim() !== '') {
      cta.href = p.affiliate_link;
      cta.target = '_blank';
      cta.rel = 'noopener noreferrer';
    } else if (p.link && p.link.trim() !== '') {
      cta.href = p.link;
      cta.target = '_blank';
      cta.rel = 'noopener noreferrer';
    } else {
      // No link available - disable button
      cta.href = 'javascript:void(0)';
      cta.classList.add('disabled');
      cta.style.pointerEvents = 'none';
      cta.style.cursor = 'not-allowed';
      cta.title = 'Link not available';
    }
    cta.setAttribute('data-i18n', 'landing.featured.cta');
    cta.textContent = 'Shop now'; // fallback
    // Apply current language translation
    if (window.applyLanguageToElement) {
      window.applyLanguageToElement(cta);
    }
    body.append(brand, title, prices, cta); card.append(media, body);
    return card;
  }

  // Helper function to hide skeleton and show content with animation
  function showContentWithAnimation(skeletonId, contentId, content) {
    const skeleton = document.getElementById(skeletonId);
    const contentEl = document.getElementById(contentId);
    
    if (skeleton && contentEl) {
      // Hide skeleton
      skeleton.style.display = 'none';
      
      // Show content with fade-in animation
      contentEl.style.display = '';
      contentEl.classList.add('content-loaded');
      
      if (content) {
        contentEl.innerHTML = '';
        contentEl.append(content);
      }
    }
  }

  function renderIntoDealsGrid(products, appendMode = false) {
    const grid = document.querySelector('.deals-grid');
    const skeleton = document.getElementById('dealsGridSkeleton');
    
    if (!grid || !Array.isArray(products)) return;
    
    // Hide skeleton and show grid with animation
    if (skeleton) {
      skeleton.style.display = 'none';
    }
    grid.style.display = '';
    grid.classList.add('content-loaded');
    
    // Clear grid only if not in append mode (for infinite scroll)
    if (!appendMode) {
      grid.innerHTML = '';
    }
    const frag = document.createDocumentFragment();

    products.forEach((p, index) => {
      const card = document.createElement('article');
      card.className = 'deal-card-v2';
      
      // Add fade-in animation for appended items (infinite scroll)
      if (appendMode) {
        card.classList.add('fade-in');
        // Stagger animation slightly for each card
        card.style.animationDelay = `${index * 0.05}s`;
      }

      // --- Left Column ---
      const leftCol = document.createElement('div');
      leftCol.className = 'deal-v2-left';

      const media = document.createElement('div');
      media.className = 'deal-v2-media';
      media.style.position = 'relative'; // Make media a positioning context for discount badge
      if (p.image) {
        const img = document.createElement('img');
        img.className = 'product-image-lazy';
        img.alt = p.title;
        img.loading = 'lazy';
        
        // Enhanced lazy loading with placeholder
        img.onload = () => {
          img.classList.add('loaded');
        };
        
        img.onerror = () => {
          // Show placeholder on error
          media.innerHTML = '<div class="product-image-placeholder">Image not available</div>';
        };
        
        img.src = p.image;
        media.appendChild(img);
      } else {
        // Show placeholder when no image
        media.innerHTML = '<div class="product-image-placeholder">No image</div>';
      }
      
      const ctaContainer = document.createElement('div');
      ctaContainer.className = 'deal-v2-cta-container';
      const dealBtn = document.createElement('a');
      // Use affiliate_link for the button, fallback to regular link if not available
      if (p.affiliate_link && p.affiliate_link.trim() !== '') {
        dealBtn.href = p.affiliate_link;
        dealBtn.target = '_blank';
        dealBtn.rel = 'noopener noreferrer';
      } else if (p.link && p.link.trim() !== '') {
        dealBtn.href = p.link;
        dealBtn.target = '_blank';
        dealBtn.rel = 'noopener noreferrer';
      } else {
        // No link available - disable button
        dealBtn.href = 'javascript:void(0)';
        dealBtn.classList.add('disabled');
        dealBtn.style.pointerEvents = 'none';
        dealBtn.style.cursor = 'not-allowed';
        dealBtn.title = 'Link not available';
      }
      dealBtn.className = 'btn btn-deal';
      dealBtn.setAttribute('data-i18n', 'card.cta');
      dealBtn.textContent = 'zum Deal'; // fallback
      const detailsBtn = document.createElement('a');
      // Use SEO-friendly URL if available, otherwise fallback to old format
      detailsBtn.href = window.seoUtils ? window.seoUtils.createSeoFriendlyProductUrl(p.hash_id, p.title) : `product.html?id=${encodeURIComponent(p.hash_id)}`;
      detailsBtn.className = 'btn btn-details';
      detailsBtn.setAttribute('data-i18n', 'button.dealDetails');
      detailsBtn.textContent = 'Deal-Details'; // fallback
      if (window.applyLanguageToElement) {
        window.applyLanguageToElement(detailsBtn);
      }
      ctaContainer.append(dealBtn, detailsBtn);
      leftCol.append(media, ctaContainer);

      // Apply current language to the buttons
      if (window.applyLanguageToElement) {
        window.applyLanguageToElement(dealBtn);
        window.applyLanguageToElement(detailsBtn);
      }

      // --- Right Column ---
      const rightCol = document.createElement('div');
      rightCol.className = 'deal-v2-right';

      const header = document.createElement('div');
      header.className = 'deal-v2-header';
      const title = document.createElement('h3');
      title.className = 'deal-v2-title';
      title.textContent = p.title || 'Product';
      header.appendChild(title);
      
      // Note: expiry functionality removed as valid_to column doesn't exist in cleaned_products table
      // Future enhancement: add expiry logic when schema supports it

      const shopLink = document.createElement('a');
      // Use affiliate_link for the shop link, fallback to regular link if not available
      if (p.affiliate_link && p.affiliate_link.trim() !== '') {
        shopLink.href = p.affiliate_link;
      } else if (p.link && p.link.trim() !== '') {
        shopLink.href = p.link;
      } else {
        shopLink.href = '#';
      }
      shopLink.className = 'deal-v2-shoplink';
      shopLink.textContent = `Shop: ${p.store_name || 'Unknown'}`;
      shopLink.target = '_blank';
      shopLink.rel = 'noopener noreferrer';
      
      const detailsGrid = document.createElement('div');
      detailsGrid.className = 'deal-v2-details-grid';
      detailsGrid.style.position = 'relative'; // Add positioning context

      const discount = document.createElement('div');
      if (p.sale_price && p.price) {
        const percentage = Math.round(((p.price - p.sale_price) / p.price) * 100);
        if (percentage > 0) {
          discount.className = 'discount-badge';
          discount.textContent = `-${percentage}%`;
          // FIXED: Attach discount badge to MEDIA (image area) so it never overlaps with text
          media.appendChild(discount);
        }
      }

      const validity = document.createElement('div');
      validity.className = 'deal-v2-validity';
      // Note: validity date display removed as valid_from/valid_to columns don't exist in cleaned_products table
      // Future enhancement: add validity dates when schema supports it

      const prices = document.createElement('div');
      prices.className = 'deal-v2-prices';
      // Get current language for price labels
      const currentLang = localStorage.getItem('selectedLanguage') || 'en';
      const priceLabels = currentLang === 'de' 
        ? { before: 'Vorher:', now: 'Jetzt nur:' }
        : { before: 'Before:', now: 'Now only:' };
      
      if (p.price && p.sale_price && Number(p.price) > Number(p.sale_price)) {
        prices.innerHTML += `<span class="price-old-v2">${priceLabels.before} ${formatCurrency(p.price, p.currency)}</span>`;
      }
      prices.innerHTML += `<span class="price-now-v2">${priceLabels.now} ${formatCurrency(p.sale_price || p.price, p.currency)}</span>`;

      const description = document.createElement('div');
      description.className = 'deal-v2-description';
      
      // Use existing currentLang variable from line 289 for description
      let descText = null;
      
      if (currentLang === 'de') {
        // German: use description (which contains German content)
        descText = p.description || null;
      } else {
        // English: try description_english first, then fallback to description
        descText = p.description_english || p.description || null;
      }
      
      if (descText) {
        // Check if description contains HTML tags (formatted version)
        const hasHTMLTags = /<[^>]*>/g.test(descText);
        
        if (hasHTMLTags) {
          // For HTML content: strip tags for preview, keep first 150 chars of text content
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = descText;
          const textOnly = tempDiv.textContent || tempDiv.innerText || '';
          const preview = textOnly.length > 150 ? textOnly.substring(0, 150) + '…' : textOnly;
          description.textContent = preview;
        } else {
          // For plain text: just truncate
          description.textContent = descText.length > 150 ? descText.substring(0, 150) + '…' : descText;
        }
      } else {
        description.textContent = '';
      }

      detailsGrid.append(validity, prices, description);

      rightCol.append(header, shopLink, detailsGrid);
      
      // TODO: Add tags/categories if data is available
      // const tagsContainer = document.createElement('div'); ...

      card.append(leftCol, rightCol);
      frag.appendChild(card);
    });
    grid.append(frag);
  }

  // Auto-run on deals page with infinite scroll
  if (document.querySelector('.deals-grid')) {
    const grid = document.querySelector('.deals-grid');
    const PAGE_SIZE = 10;
    const resultsMeta = document.getElementById('resultsMeta');
    let totalCount = 0;
    let totalPages = 1;
    let currentPage = 1;
    let isLoading = false;
    let hasMorePages = true;
    // Simple filter state management
    let selectedCategories = [];
      
      // DOM elements
      let priceMinEl = document.getElementById('priceMin');
      let priceMaxEl = document.getElementById('priceMax');
      let categoriesListEl = document.getElementById('categoryFilters');

    async function loadCategories() {
      if (!categoriesListEl) return;
      
      // Use the same categories as the landing page for consistency
      const predefinedCategories = [
        'Electronics',
        'Home & Garden', 
        'Beauty',
        'Fashion',
        'Sport',
        'Children',
        'Groceries',
        'Shoes',
        'Smartphone',
        'Tablet', 
        'Notebook',
        'Television set',
        'Gaming',
        'Travel',
        'Hotel',
        'Wellness'
      ];
      
      // Get current language for translations
      const currentLang = localStorage.getItem('selectedLanguage') || 'en';
      
      // Create proper mapping between category names and translation keys
      const categoryTranslationMap = {
        'Electronics': 'cats.electronics',
        'Home & Garden': 'cats.home',
        'Beauty': 'cats.beauty', 
        'Fashion': 'cats.fashion',
        'Sport': 'cats.sport',
        'Children': 'cats.children',
        'Groceries': 'cats.grocery',
        'Shoes': 'cats.shoes',
        'Smartphone': 'cats.smartphone',
        'Tablet': 'cats.tablet',
        'Notebook': 'cats.notebook',
        'Television set': 'cats.tv',
        'Gaming': 'cats.gaming',
        'Travel': 'cats.travel',
        'Hotel': 'cats.hotel',
        'Wellness': 'cats.wellness'
      };
      
      // Render categories as checkboxes with proper translations
      categoriesListEl.innerHTML = predefinedCategories.map(category => {
        const translationKey = categoryTranslationMap[category] || 'cats.electronics'; // fallback
        
        // Get translated name
        let displayName = category; // fallback
        if (window.translations && window.translations[currentLang] && window.translations[currentLang][translationKey]) {
          displayName = window.translations[currentLang][translationKey];
        }
        
        return `<li><label><input type="checkbox" value="${category}"><span data-i18n="${translationKey}"> ${displayName}</span></label></li>`;
      }).join('');
      
      // Apply language to all category labels
      if (window.applyLanguageToElement) {
        categoriesListEl.querySelectorAll('[data-i18n]').forEach(el => {
          window.applyLanguageToElement(el);
        });
      }
    }
    
    // Add language change listener to update categories
    function setupCategoryLanguageListener() {
      // Listen for language changes
      document.addEventListener('click', function(e) {
        if (e.target.closest('[data-lang]')) {
          // Small delay to ensure language has been updated
          setTimeout(() => {
            loadCategories();
          }, 100);
        }
      });
      
      // Listen for storage changes (cross-tab language changes)
      window.addEventListener('storage', function(e) {
        if (e.key === 'selectedLanguage') {
          loadCategories();
        }
      });
    }

    async function fetchProductsPage(page, pageSize) {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      let query = window.supabaseClient
        .from('cleaned_products')
        .select('hash_id, title, price, sale_price, image, brand, link, affiliate_link, currency, description, store_id, ai_category', { count: 'exact' })
        .eq('status', 'published')
        .not('image', 'is', null)
        .not('store_id', 'is', null)
        .order('updated_at', { ascending: false, nullsFirst: false })
        .range(from, to);
      
      // Category filter
      if (Array.isArray(selectedCategories) && selectedCategories.length > 0) {
        query = query.in('ai_category', selectedCategories);
      }
      
      // URL parameters for category and store filters
      const urlParams = new URLSearchParams(window.location.search);
      const categoryParam = urlParams.get('category');
      const storeParam = urlParams.get('store');
      
      // Auto-select category from URL parameter
      if (categoryParam && !selectedCategories.includes(categoryParam)) {
        query = query.eq('ai_category', categoryParam);
      }
      
      // Handle store filter - support both cleaned_name and UUID
      if (storeParam) {
        // Check if it looks like a UUID (legacy format)
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(storeParam);
        
        if (isUUID) {
          // Legacy: filter by store_id directly
          query = query.eq('store_id', storeParam);
        } else {
          // New: need to look up store ID from cleaned_name first (case-insensitive)
          const { data: storeData } = await window.supabaseClient
            .from('cleaned_stores')
            .select('id')
            .ilike('cleaned_name', storeParam)
            .single();
          
          if (storeData) {
            query = query.eq('store_id', storeData.id);
          }
        }
      }
      
      // Text search
      if (typeof searchTerm === 'string' && searchTerm.trim().length > 0) {
        const escaped = searchTerm.replace(/,/g, ' ');
        query = query.or(`title.ilike.%${escaped}%,description.ilike.%${escaped}%,ai_category.ilike.%${escaped}%`);
      }
      
      // Price filter using OR to cover price vs sale_price
      const min = Number(priceMinEl?.value || 0) || 0;
      const max = Number(priceMaxEl?.value || 3000) || 3000;
      if (!Number.isNaN(min) || !Number.isNaN(max)) {
        const parts = [];
        if (!Number.isNaN(min)) parts.push(`and(sale_price.gte.${min}),and(price.gte.${min})`);
        if (!Number.isNaN(max)) parts.push(`and(sale_price.lte.${max}),and(price.lte.${max})`);
        if (parts.length === 2) {
          // (sale between) OR (price between)
          query = query.or(`and(sale_price.gte.${min},sale_price.lte.${max}),and(price.gte.${min},price.lte.${max})`);
        } else if (parts.length === 1) {
          // single-sided filter
          if (!Number.isNaN(min)) query = query.or(`sale_price.gte.${min},price.gte.${min}`);
          if (!Number.isNaN(max)) query = query.or(`sale_price.lte.${max},price.lte.${max}`);
        }
      }
      
      const { data, error, count } = await query;
      if (error) { /* console.error('[Supabase] fetch page error', error); */ return { data: [], count: 0 }; }
      
      const products = data || [];
      
      if (products.length === 0) return { data: [], count: count || 0 };
      
      // Get store names for all products
      const storeIds = [...new Set(products.map(p => p.store_id).filter(Boolean))];
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
      
      // Add store names to products
      const productsWithStores = products.map(p => ({
        ...p,
        store_name: storeMap[p.store_id] || p.brand
      }));
      
      // Fetch store names for filter display
      const currentStoreIds = [...new Set(data.map(p => p.store_id).filter(Boolean))];
      await fetchStoreNames(currentStoreIds);
      
      return { data: productsWithStores, count: count || 0 };
    }

    function updateResultsMeta(total) {
      if (!resultsMeta) return;
      
      // Get current language for translations
      const currentLang = localStorage.getItem('selectedLanguage') || 'en';
      const dict = window.translations?.[currentLang] || window.translations?.en || {};
      const resultsText = dict['results.count'] || 'Results';
      const categoriesText = dict['results.categories'] || 'Categories';
      
      const filters = [];
      
      if (Array.isArray(selectedCategories) && selectedCategories.length > 0) {
        filters.push(`${categoriesText}: ${selectedCategories.slice(0, 3).join(', ')}${selectedCategories.length > 3 ? ` (+${selectedCategories.length - 3})` : ''}`);
      }
      
      const urlParams = new URLSearchParams(window.location.search);
      const storeParam = urlParams.get('store');
      
      if (storeParam) {
        // Check if it's a UUID (legacy) or cleaned_name
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(storeParam);
        
        if (isUUID && storeNames[storeParam]) {
          // Legacy UUID: show the cached name
          filters.push(`Store: ${storeNames[storeParam]}`);
        } else if (isUUID) {
          // Legacy UUID but no cached name
          filters.push(`Store: ${storeParam}`);
        } else {
          // New format: storeParam is already the cleaned_name
          filters.push(`Store: ${storeParam}`);
        }
      }
      
      const filterText = filters.length > 0 ? ` • ${filters.join(' • ')}` : '';
      resultsMeta.textContent = `${total} ${resultsText}${filterText}`;
    }

    async function goTo(page, appendMode = false) {
      currentPage = Math.max(1, Math.min(page, totalPages));
      
      // Show skeleton during initial loading only
      const skeleton = document.getElementById('dealsGridSkeleton');
      const grid = document.querySelector('.deals-grid');
      
      if (page === 1 && !appendMode && skeleton && grid) {
        skeleton.style.display = '';
        grid.style.display = 'none';
      }
      
      // Fetch page; also get count the first time
      const { data, count } = await fetchProductsPage(currentPage, PAGE_SIZE);
      if (count != null) {
        totalCount = count;
        totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
        hasMorePages = currentPage < totalPages;
      }
      
      // Show no results message if needed  
      const noResults = document.getElementById('noResults');
      
      if (data.length === 0 && !appendMode) {
        // Hide both grid and skeleton when no results
        if (skeleton) skeleton.style.display = 'none';
        if (grid) grid.style.display = 'none';
        if (noResults) {
          noResults.style.display = 'block';
          // Get current language for error message
          const currentLang = localStorage.getItem('selectedLanguage') || 'en';
          const dict = window.translations?.[currentLang] || window.translations?.en || {};
          const errorMsg = dict['infiniteScroll.noResults'] || 'No products found. Try different filters.';
          noResults.textContent = errorMsg;
        }
      } else if (data.length > 0) {
        if (grid) grid.style.display = '';
        if (noResults) noResults.style.display = 'none';
        renderIntoDealsGrid(data, appendMode);
      }
      
      updateResultsMeta(totalCount);
    }

    // Create and manage loading indicator for infinite scroll
    function createLoadingIndicator() {
      let loadingIndicator = document.getElementById('infiniteScrollLoader');
      if (!loadingIndicator) {
        loadingIndicator = document.createElement('div');
        loadingIndicator.id = 'infiniteScrollLoader';
        loadingIndicator.className = 'infinite-scroll-loader';
        loadingIndicator.style.cssText = 'display:none; text-align:center; padding:24px; color:#666;';
        loadingIndicator.innerHTML = '<p>Loading more products...</p>';
        
        // Insert after deals grid
        const grid = document.querySelector('.deals-grid');
        if (grid && grid.parentElement) {
          grid.parentElement.insertBefore(loadingIndicator, grid.nextSibling);
        }
      }
      return loadingIndicator;
    }
    
    function showLoadingIndicator() {
      const loader = createLoadingIndicator();
      loader.style.display = 'flex'; // Changed to flex for proper layout
      
      // Get current language for loading text
      const currentLang = localStorage.getItem('selectedLanguage') || 'en';
      const dict = window.translations?.[currentLang] || window.translations?.en || {};
      const loadingText = dict['infiniteScroll.loading'] || 'Loading more products...';
      loader.innerHTML = `
        <div class="loader-spinner"></div>
        <p>${loadingText}</p>
      `;
    }
    
    function hideLoadingIndicator() {
      const loader = document.getElementById('infiniteScrollLoader');
      if (loader) loader.style.display = 'none';
    }
    
    function showEndMessage() {
      const loader = createLoadingIndicator();
      const currentLang = localStorage.getItem('selectedLanguage') || 'en';
      const dict = window.translations?.[currentLang] || window.translations?.en || {};
      const endText = dict['infiniteScroll.allLoaded'] || 'All products loaded';
      loader.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="color:#999;">
          <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <p style="color:#999;">${endText}</p>
      `;
      loader.style.display = 'flex';
    }

    // Load next page for infinite scroll
    async function loadNextPage() {
      if (isLoading || !hasMorePages) return;
      
      isLoading = true;
      showLoadingIndicator();
      
      const nextPage = currentPage + 1;
      await goTo(nextPage, true); // true = append mode
      
      hideLoadingIndicator();
      isLoading = false;
      
      // Show end message if no more pages
      if (!hasMorePages) {
        showEndMessage();
      }
    }

    // Infinite scroll detection
    function handleScroll() {
      if (isLoading || !hasMorePages) return;
      
      const scrollPosition = window.innerHeight + window.scrollY;
      const pageHeight = document.documentElement.scrollHeight;
      
      // Trigger load when within 300px of bottom
      if (scrollPosition >= pageHeight - 300) {
        loadNextPage();
      }
    }
    
    // Add scroll listener with throttling for performance
    let scrollTimeout;
    window.addEventListener('scroll', () => {
      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(handleScroll, 100);
    });

    // Expose function to refresh results meta translations (called from app.js on language change)
    window.refreshPagination = function() {
      if (totalCount > 0) {
        updateResultsMeta(totalCount);
      }
    };

    // Wire interactions
    // Header search box integration: server-side search on title/description
    const searchInput = document.querySelector('.search input[type="search"]');
    
    // Initialize search from URL parameter
    let searchTerm = new URLSearchParams(window.location.search).get('search') || '';
    if (searchInput && searchTerm) {
      searchInput.value = searchTerm;
    }
    
    // Reset infinite scroll state (for when filters change)
    function resetInfiniteScroll() {
      currentPage = 1;
      hasMorePages = true;
      isLoading = false;
      hideLoadingIndicator();
      // Clear the grid to start fresh
      const grid = document.querySelector('.deals-grid');
      if (grid) grid.innerHTML = '';
    }

    // Debounce search to avoid too many database calls
    let searchTimeout;
    searchInput?.addEventListener('input', (e) => {
      searchTerm = String(e.target.value || '').trim();
      
      // Clear previous timeout
      clearTimeout(searchTimeout);
      
      // Wait 300ms after user stops typing before searching
      searchTimeout = setTimeout(() => {
        resetInfiniteScroll();
        goTo(1);
      }, 300);
    });

    // Filter event listeners
    categoriesListEl?.addEventListener('change', () => {
      selectedCategories = Array.from(categoriesListEl.querySelectorAll('input[type="checkbox"]:checked')).map(i => i.value);
      resetInfiniteScroll();
      goTo(1);
    });
    
    priceMinEl?.addEventListener('change', () => {
      resetInfiniteScroll();
      goTo(1);
    });
    
    priceMaxEl?.addEventListener('change', () => {
      resetInfiniteScroll();
      goTo(1);
    });
    
    // Reset filters functionality
    document.getElementById('filtersReset')?.addEventListener('click', () => {
      // Reset all filter states
      selectedCategories = [];
      
      // Reset UI elements
      document.querySelectorAll('#filtersPanel input[type="checkbox"]').forEach(cb => cb.checked = false);
      if (priceMinEl) priceMinEl.value = 0;
      if (priceMaxEl) priceMaxEl.value = 3000;
      
      // Reset infinite scroll and reload results
      resetInfiniteScroll();
      goTo(1);
    });

    // Initial load
    await loadCategories();
    
    // Setup language change listener for categories
    setupCategoryLanguageListener();
    
    // Initialize store name from URL if present
    await initializeStoreNameFromURL();
    
    // Auto-select category from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const categoryParam = urlParams.get('category');
    if (categoryParam && categoriesListEl) {
      // Wait a bit for categories to load, then auto-select
      setTimeout(() => {
        const categoryCheckbox = categoriesListEl.querySelector(`input[value="${categoryParam}"]`);
        if (categoryCheckbox) {
          categoryCheckbox.checked = true;
          selectedCategories = [categoryParam];
        }
      }, 100);
    }
    
    await goTo(1);
    // Hide the old static empty message; we will set our own meta text
    const noResults = document.getElementById('noResults');
    if (noResults) noResults.style.display = 'none';
  }

  // New function to fetch featured products specifically
  async function fetchFeaturedProducts(limit = 4) {
    const { data, error } = await window.supabaseClient
      .from('cleaned_products')
      .select('hash_id, title, price, sale_price, image, brand, link, affiliate_link, currency, store_id')
      .eq('status', 'published')
      .eq('is_featured', true)
      .not('image', 'is', null)
      .not('store_id', 'is', null)
      .order('updated_at', { ascending: false, nullsFirst: false })
      .limit(limit);
      
    if (error) {
      // console.error('[Supabase] fetch featured error', error);
      return [];
    }
    
    const products = data || [];
    if (products.length === 0) return [];
    
    // Get store names for all products
    const storeIds = [...new Set(products.map(p => p.store_id).filter(Boolean))];
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
    
    // Add store names to products
    return products.map(p => ({
      ...p,
      store_name: storeMap[p.store_id] || p.brand
    }));
  }

  // Landing page: featured and best sections with skeleton loading
  if (document.getElementById('featuredGrid')) {
    try {
      // Add a small delay to show the skeleton loading effect
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const list = await fetchFeaturedProducts(4);
      const grid = document.getElementById('featuredGrid');
      
      if (grid) {
        const frag = document.createDocumentFragment();
        if (list.length > 0) {
          list.forEach(p => frag.append(createProductCard(p)));
        }
        
        // Show content with animation and hide skeleton (even if empty)
        showContentWithAnimation('featuredSkeleton', 'featuredGrid', frag);
      }
    } catch (error) {
      // console.error('[Products] Featured loading error:', error);
      // Show empty grid on error
      const skeleton = document.getElementById('featuredSkeleton');
      const grid = document.getElementById('featuredGrid');
      if (skeleton) skeleton.style.display = 'none';
      if (grid) grid.style.display = '';
    }
  }
  
  if (document.getElementById('bestGrid')) {
    try {
      // Add a small delay to show the skeleton loading effect
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const list = await fetchTopProducts(9);
      const grid = document.getElementById('bestGrid');
      
      if (grid) {
        const frag = document.createDocumentFragment();
        if (list.length > 0) {
          list.forEach(p => frag.append(createProductCard(p)));
        }
        
        // Show content with animation and hide skeleton (even if empty)
        showContentWithAnimation('bestSkeleton', 'bestGrid', frag);
      }
    } catch (error) {
      // console.error('[Products] Best deals loading error:', error);
      // Show empty grid on error
      const skeleton = document.getElementById('bestSkeleton');
      const grid = document.getElementById('bestGrid');
      if (skeleton) skeleton.style.display = 'none';
      if (grid) grid.style.display = '';
    }
  }
})();
