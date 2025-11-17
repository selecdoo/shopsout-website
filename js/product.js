(async function(){
  if (!window.supabaseClient) return;

  function getQueryParam(name) {
    const params = new URLSearchParams(location.search);
    return params.get(name);
  }

  function formatCurrency(value, currency = 'EUR') {
    if (value == null) return '';
    try { return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(value)); }
    catch(_) { return `${Number(value).toFixed(2)} ${currency || '€'}`; }
  }

  /**
   * Get product identifier from URL
   * Supports multiple URL formats:
   * - Old format: ?id=xxx or ?hash=xxx
   * - Query slug: ?slug=xxx
   * - Path-based SEO: /product/slug--id--productId (Vercel format with marker)
   * - Path-based SEO: /product/slug-productId (fallback without marker)
   * @returns {string|null} Product ID or hash
   */
  function getProductIdentifier() {
    // Priority 1: Check for old format query parameters (backward compatibility)
    const idParam = getQueryParam('id');
    const hashParam = getQueryParam('hash');
    
    if (idParam) return idParam;
    if (hashParam) return hashParam;

    // Priority 2: Check for ?slug= query parameter (legacy SEO format)
    if (window.seoUtils) {
      const slug = getQueryParam('slug');
      if (slug) {
        const shortId = window.seoUtils.parseProductIdFromSlug(slug);
        if (shortId) {
          return shortId;
        }
      }
    }

    // Priority 3: Parse path-based SEO URLs (Vercel deployment)
    // This handles both /product/slug--id--productId and /product/slug-productId formats
    const path = window.location.pathname;
    
    // Check if we're on a product path
    const pathMatch = path.match(/\/product\/(.+)/);
    if (pathMatch && pathMatch[1]) {
      const slugWithId = pathMatch[1];
      
      // First, check if seoUtils can extract the slug and parse it
      if (window.seoUtils && window.seoUtils.getProductSlugFromUrl) {
        const extractedSlug = window.seoUtils.getProductSlugFromUrl();
        if (extractedSlug) {
          // Try to parse using the --id-- marker format
          const productId = window.seoUtils.parseProductIdFromSlug(extractedSlug);
          if (productId) {
            return productId;
          }
        }
      }
      
      // Fallback: Extract the last segment after the final hyphen
      // This handles formats like: wireless-headphones-1e938cef
      const parts = slugWithId.split('-');
      const lastPart = parts[parts.length - 1];
      
      // Validate it looks like a short ID (8+ hex chars) or full UUID (32+ hex chars)
      if (/^[0-9a-f]{8,}$/i.test(lastPart)) {
        return lastPart;
      }
    }

    return null;
  }

  async function fetchProduct(idOrHash) {
    // console.log('[Product Debug] fetchProduct called with:', idOrHash);
    let query = window.supabaseClient
      .from('cleaned_products')
      .select('hash_id, product_id, title, description, description_english, price, sale_price, link, image, brand, currency, coupon_code, coupon_value, availability, store_id, affiliate_link')
      .eq('status', 'published')
      .not('store_id', 'is', null)
      .limit(1);
    if (!idOrHash) {
      // console.log('[Product Debug] No ID provided');
      return { data: null };
    }
    if (/^[0-9a-f-]{36}$/i.test(idOrHash)) {
      // console.log('[Product Debug] Using product_id field for UUID:', idOrHash);
      query = query.eq('product_id', idOrHash);
    } else if (/^[0-9a-f]{8}$/i.test(idOrHash)) {
      // console.log('[Product Debug] Using short ID (first 8 chars) for:', idOrHash);
      // Short ID from SEO URL - search for products starting with this prefix
      query = query.or(`hash_id.ilike.${idOrHash}%,product_id.ilike.${idOrHash}%`);
    } else {
      // console.log('[Product Debug] Using hash_id field for:', idOrHash);
      query = query.eq('hash_id', idOrHash);
    }
    const { data, error } = await query.single();
    // console.log('[Product Debug] Query result - data:', data, 'error:', error);
    if (error) { 
      // console.log('[Product Debug] Database error:', error); 
      return { data: null }; 
    }
    
    if (data && data.store_id) {
      // Get store name and logo
      const { data: store } = await window.supabaseClient
        .from('cleaned_stores')
        .select('cleaned_name, logo_url')
        .eq('id', data.store_id)
        .single();
      
      if (store) {
        data.store_name = store.cleaned_name;
        data.store_logo_url = store.logo_url;
      }
    }
    
    return { data };
  }

  function setText(el, text) { if (el) el.textContent = text || ''; }
  function setVisible(el, show) { if (el) el.style.display = show ? '' : 'none'; }

  // Store the current product data globally for language switching
  let currentProductData = null;

  // Update product description based on current language
  function updateProductDescription(product) {
    const descriptionEl = document.getElementById('pdDesc');
    if (!descriptionEl || !product) return;
    
    const currentLang = localStorage.getItem('selectedLanguage') || 'en';
    let productDescription = null;
    
    if (currentLang === 'de') {
      // German: use description (which contains German content)
      productDescription = product.description || null;
    } else {
      // English: try description_english first, then fallback to description
      productDescription = product.description_english || product.description || null;
    }
    
    if (productDescription && productDescription.trim()) {
      // Check if description contains HTML tags (formatted version)
      const hasHTMLTags = /<[^>]*>/g.test(productDescription);
      
      if (hasHTMLTags) {
        // Use innerHTML for formatted HTML descriptions
        descriptionEl.innerHTML = productDescription.trim();
      } else {
        // Use textContent for plain text descriptions (fallbacks)
        descriptionEl.textContent = productDescription.trim();
      }
    } else {
      // Show appropriate "no description" message based on language
      const noDescMsg = currentLang === 'de' 
        ? '<em>Keine Beschreibung für dieses Produkt verfügbar.</em>'
        : '<em>No description available for this product.</em>';
      descriptionEl.innerHTML = noDescMsg;
    }
  }

  // Update price flow card text based on current language
  function updatePriceFlowCardText(product) {
    if (!product) return;
    
    const currentLang = localStorage.getItem('selectedLanguage') || 'en';
    const dict = window.translations?.[currentLang] || window.translations?.en || {};
    
    // Update "Original Price" label
    const originalLabel = document.querySelector('.price-flow-item.original .price-flow-label');
    if (originalLabel) {
      originalLabel.textContent = dict['product.priceFlow.original'] || 'Original Price';
    }
    
    // Update "Store Deal" label
    const storeDealLabel = document.querySelector('.price-flow-item.store-deal .price-flow-label');
    if (storeDealLabel) {
      // Get the discount badge
      const discountBadge = storeDealLabel.querySelector('.price-flow-badge');
      const badgeText = discountBadge ? discountBadge.textContent : '';
      
      // Update label text
      storeDealLabel.textContent = dict['product.priceFlow.storeDeal'] || 'Store Deal';
      
      // Re-append the badge
      if (discountBadge && badgeText) {
        discountBadge.textContent = badgeText;
        storeDealLabel.appendChild(discountBadge);
      }
    }
    
    // Update "Your Price with ShopShout" label
    const finalLabel = document.querySelector('.price-flow-item.shopshout-final .price-flow-label');
    if (finalLabel) {
      // Get the affiliate badge
      const affiliateBadge = finalLabel.querySelector('.price-flow-badge');
      const badgeText = affiliateBadge ? affiliateBadge.textContent : '+10%';
      
      // Update label text
      finalLabel.textContent = dict['product.priceFlow.yourPrice'] || 'Your Price with ShopShout';
      
      // Re-append the badge
      if (affiliateBadge) {
        affiliateBadge.textContent = badgeText;
        finalLabel.appendChild(affiliateBadge);
      }
    }
    
    // Update "Total Savings" text
    const savingsSummary = document.querySelector('.price-savings-summary');
    if (savingsSummary) {
      const savingsAmount = savingsSummary.querySelector('.price-savings-amount');
      const amountText = savingsAmount ? savingsAmount.textContent : '';
      
      savingsSummary.innerHTML = `${dict['product.priceFlow.savings'] || 'Total Savings'}: <span class="price-savings-amount">${amountText}</span>`;
    }
    
    // Update affiliate badge in header
    const affiliateBadgeInCard = document.querySelector('.brand-affiliate');
    if (affiliateBadgeInCard) {
      affiliateBadgeInCard.textContent = dict['product.affiliateBonus'] || '+10%';
      affiliateBadgeInCard.setAttribute('data-text', dict['product.extra'] || 'Extra');
    }
  }

  // Helper function to show content with animation
  function showContentWithAnimation(skeletonId, contentId, content = null) {
    const skeleton = document.getElementById(skeletonId);
    const contentEl = document.getElementById(contentId);
    
    if (skeleton && contentEl) {
      // Update accessibility attributes for skeleton
      skeleton.setAttribute('aria-busy', 'false');
      skeleton.setAttribute('aria-hidden', 'true');
      
      // Hide skeleton
      skeleton.style.display = 'none';
      
      // Show content with fade-in animation
      contentEl.style.display = '';
      contentEl.classList.add('content-loaded');
      
      // If content is provided, append it
      if (content && contentEl) {
        contentEl.innerHTML = '';
        contentEl.appendChild(content);
      }
    }
  }

  async function render() {
    // Add a small delay to show the skeleton loading effect
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Get product ID from URL (supports both old and new formats)
    const id = getProductIdentifier();
    // console.log('[Product Debug] URL ID:', id);
    
    try {
      const { data: p } = await fetchProduct(id);
      // console.log('[Product Debug] Fetched product:', p);
      
      if (!p) {
        // console.log('[Product Debug] No product found, showing error state');
        // Hide skeleton and show error state
        const skeleton = document.getElementById('productDetailSkeleton');
        const content = document.getElementById('deal');
        if (skeleton) {
          skeleton.setAttribute('aria-busy', 'false');
          skeleton.setAttribute('aria-hidden', 'true');
          skeleton.style.display = 'none';
        }
        if (content) {
          content.style.display = '';
          content.innerHTML = '<div style="text-align: center; padding: 60px 20px;"><h2>Product Not Found</h2><p>The product you\'re looking for doesn\'t exist or has been removed.</p><a href="index.html" class="btn btn-primary">Back to Deals</a></div>';
        }
        return;
      }
      
      // Store product data globally for language switching
      currentProductData = p;
      
      // Update SEO meta tags with product information
      if (window.updateProductSEO) {
        window.updateProductSEO(p);
      }
      
      // Hide skeleton and show content with animation
      showContentWithAnimation('productDetailSkeleton', 'deal');
    const media = document.getElementById('pdMedia');
    const brand = document.getElementById('pdBrand');
    const title = document.getElementById('pdTitle');
    const now = document.getElementById('pdPriceNow');
    const old = document.getElementById('pdPriceOld');
    const cta = document.getElementById('pdCta');
    const desc = document.getElementById('pdDesc');
    // Coupon element removed

    if (p.image && media) media.style.background = `center/cover no-repeat url(${CSS.escape ? CSS.escape(p.image) : p.image})`;
    setText(brand, p.store_name || p.brand || '');
    setText(title, p.title || '');
    
    // Check for discount and add styling
    const hasDiscount = p.sale_price && p.price && Number(p.price) > Number(p.sale_price);
    const pricesContainer = document.querySelector('.deal-prices');
    
    if (hasDiscount && pricesContainer) {
      pricesContainer.classList.add('has-discount');
    }
    
    setText(now, p.sale_price ? formatCurrency(p.sale_price, p.currency || 'EUR') : formatCurrency(p.price, p.currency || 'EUR'));
    if (hasDiscount) {
      setText(old, formatCurrency(p.price, p.currency || 'EUR'));
      setVisible(old, true);
    }
    // Coupon display removed
    // Store affiliate link in data attribute (not href) to prevent direct navigation
    if (p.affiliate_link && p.affiliate_link.trim() !== '') { 
      // Store the link in data attribute instead of href
      cta.setAttribute('data-affiliate-link', p.affiliate_link);
      cta.href = 'javascript:void(0);'; // Completely prevent navigation
      cta.removeAttribute('target'); // Remove target="_blank" to prevent auto redirect
      cta.classList.remove('disabled');
      cta.style.pointerEvents = '';
      cta.title = '';
      cta.style.cursor = 'pointer';
    } else { 
      // COMPLETELY disable the button
      cta.removeAttribute('data-affiliate-link');
      cta.href = 'javascript:void(0);';
      cta.removeAttribute('target');
      cta.classList.add('disabled');
      cta.style.pointerEvents = 'none';
      cta.style.cursor = 'not-allowed';
      cta.title = 'Affiliate link not available';
    }
    // Update product description with language support
    updateProductDescription(p);
    
    // Hide the brand element AND title outside the card since they're now inside the price flow card
    const brandElement = document.getElementById('pdBrand');
    if (brandElement) {
      brandElement.style.display = 'none';
    }
    
    const titleElement = document.getElementById('pdTitle');
    if (titleElement) {
      titleElement.style.display = 'none';
    }
    
    // Remove any existing discount badges and wrappers outside the card
    const existingBadges = document.querySelectorAll('.discount-badge, .brand-discount, .brand-affiliate');
    existingBadges.forEach(badge => badge.remove());
    const existingWrappers = document.querySelectorAll('.brand-wrapper');
    existingWrappers.forEach(wrapper => {
      wrapper.remove();
    });
    
    // Create Progressive Discount Flow instead of simple price display
    if (p.sale_price || p.price) {
      // Remove any existing price flow containers
      const existingFlows = document.querySelectorAll('.price-flow-container');
      existingFlows.forEach(flow => flow.remove());
      
      const pricesContainer = document.querySelector('.deal-prices');
      if (pricesContainer) {
        // Hide the old price display
        pricesContainer.style.display = 'none';
        
        const currentLang = localStorage.getItem('selectedLanguage') || 'en';
        const dict = window.translations?.[currentLang] || window.translations?.en || {};
        
        // Create the price flow container
        const flowContainer = document.createElement('div');
        flowContainer.className = 'price-flow-container';
        
        // Add product title at the top of the card
        const cardTitle = document.createElement('h2');
        cardTitle.className = 'price-flow-title';
        cardTitle.textContent = p.title || '';
        cardTitle.style.cssText = 'margin: 0 0 16px 0; font-size: 1.5rem; font-weight: 700; color: var(--text); line-height: 1.3;';
        flowContainer.appendChild(cardTitle);
        
        // Add store name with discount badges on the SAME line
        const cardHeader = document.createElement('div');
        cardHeader.className = 'price-flow-header';
        cardHeader.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-bottom: 20px;';
        
        if (p.store_name || p.store_logo_url) {
          const storeBadge = document.createElement('div');
          storeBadge.className = 'store-badge';
          storeBadge.style.marginBottom = '0';
          
          // Add logo if available
          if (p.store_logo_url) {
            const logoImg = document.createElement('img');
            logoImg.className = 'store-logo';
            logoImg.src = p.store_logo_url;
            logoImg.alt = p.store_name || 'Store';
            logoImg.onerror = function() {
              // Fallback if logo fails to load
              this.style.display = 'none';
              const fallback = document.createElement('div');
              fallback.className = 'store-logo-fallback';
              fallback.textContent = p.store_name ? p.store_name.charAt(0).toUpperCase() : '?';
              storeBadge.appendChild(fallback);
            };
            storeBadge.appendChild(logoImg);
          } else if (p.store_name) {
            // Show fallback letter if no logo
            const fallback = document.createElement('div');
            fallback.className = 'store-logo-fallback';
            fallback.textContent = p.store_name.charAt(0).toUpperCase();
            storeBadge.appendChild(fallback);
          }
          
          cardHeader.appendChild(storeBadge);
        }
        
        // Add discount badges to card header (same line)
        if (hasDiscount) {
          const storeDiscountPercent = Math.round(((Number(p.price) - Number(p.sale_price)) / Number(p.price)) * 100);
          const discountBadgeInCard = document.createElement('span');
          discountBadgeInCard.className = 'brand-discount';
          discountBadgeInCard.textContent = `-${storeDiscountPercent}%`;
          cardHeader.appendChild(discountBadgeInCard);
        }
        
        // Add affiliate badge to card header (same line)
        const affiliateBadgeInCard = document.createElement('span');
        affiliateBadgeInCard.className = 'brand-affiliate';
        affiliateBadgeInCard.textContent = dict['product.affiliateBonus'] || '+10%';
        affiliateBadgeInCard.setAttribute('data-text', dict['product.extra'] || 'Extra');
        cardHeader.appendChild(affiliateBadgeInCard);
        
        flowContainer.appendChild(cardHeader);
        
        const originalPrice = Number(p.price);
        const storePrice = p.sale_price ? Number(p.sale_price) : originalPrice;
        const finalPrice = storePrice * 0.9; // 10% affiliate discount
        const totalSavings = originalPrice - finalPrice;
        const totalSavingsPercent = Math.round((totalSavings / originalPrice) * 100);
        
        // ALWAYS show original price
        const originalItem = document.createElement('div');
        originalItem.className = 'price-flow-item original';
        
        const originalLabel = document.createElement('div');
        originalLabel.className = 'price-flow-label';
        originalLabel.textContent = dict['product.priceFlow.original'] || 'Original Price';
        
        const originalPriceEl = document.createElement('div');
        originalPriceEl.className = 'price-flow-price';
        originalPriceEl.textContent = formatCurrency(originalPrice, p.currency || 'EUR');
        
        originalItem.appendChild(originalLabel);
        originalItem.appendChild(originalPriceEl);
        flowContainer.appendChild(originalItem);
        
        // Only show store deal item if there's a store discount
        if (hasDiscount) {
          const storeDealItem = document.createElement('div');
          storeDealItem.className = 'price-flow-item store-deal';
          
          const storeDealLabel = document.createElement('div');
          storeDealLabel.className = 'price-flow-label';
          storeDealLabel.textContent = dict['product.priceFlow.storeDeal'] || 'Store Deal';
          
          const discountBadge = document.createElement('span');
          discountBadge.className = 'price-flow-badge store-discount';
          const storeDiscountPercent = Math.round(((originalPrice - storePrice) / originalPrice) * 100);
          discountBadge.textContent = `-${storeDiscountPercent}%`;
          storeDealLabel.appendChild(discountBadge);
          
          const storePriceEl = document.createElement('div');
          storePriceEl.className = 'price-flow-price';
          storePriceEl.textContent = formatCurrency(storePrice, p.currency || 'EUR');
          
          storeDealItem.appendChild(storeDealLabel);
          storeDealItem.appendChild(storePriceEl);
          flowContainer.appendChild(storeDealItem);
        }
        
        // ShopShout final price (always shown - most prominent)
        const finalItem = document.createElement('div');
        finalItem.className = 'price-flow-item shopshout-final';
        
        const finalLabel = document.createElement('div');
        finalLabel.className = 'price-flow-label';
        finalLabel.textContent = dict['product.priceFlow.yourPrice'] || 'Your Price with ShopShout';
        
        // Removed +10% badge from price flow as per user request
        // const affiliateBadge = document.createElement('span');
        // affiliateBadge.className = 'price-flow-badge affiliate-bonus';
        // affiliateBadge.textContent = '+10%';
        // finalLabel.appendChild(affiliateBadge);
        
        const finalPriceEl = document.createElement('div');
        finalPriceEl.className = 'price-flow-price';
        finalPriceEl.textContent = formatCurrency(finalPrice, p.currency || 'EUR');
        
        finalItem.appendChild(finalLabel);
        finalItem.appendChild(finalPriceEl);
        flowContainer.appendChild(finalItem);
        
        // Add savings summary
        const savingsSummary = document.createElement('div');
        savingsSummary.className = 'price-savings-summary';
        savingsSummary.innerHTML = `${dict['product.priceFlow.savings'] || 'Total Savings'}: <span class="price-savings-amount">${formatCurrency(totalSavings, p.currency || 'EUR')} (${totalSavingsPercent}%)</span>`;
        flowContainer.appendChild(savingsSummary);
        
        // Add action buttons inside the card
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'price-flow-actions';
        
        // Clone the existing buttons and move them into the card
        const existingCta = document.getElementById('pdCta');
        const existingBackBtn = document.querySelector('.detail-buttons .btn-outline');
        
        if (existingCta) {
          const ctaClone = existingCta.cloneNode(true);
          ctaClone.id = 'pdCtaClone'; // Different ID to avoid conflicts
          
          // Copy all properties from original button and use data attribute
          if (p.affiliate_link && p.affiliate_link.trim() !== '') {
            ctaClone.setAttribute('data-affiliate-link', p.affiliate_link);
            ctaClone.href = 'javascript:void(0);'; // Completely prevent navigation
            ctaClone.removeAttribute('target'); // Remove target="_blank"
            ctaClone.classList.remove('disabled');
            ctaClone.style.pointerEvents = '';
            ctaClone.style.cursor = 'pointer';
          } else {
            ctaClone.removeAttribute('data-affiliate-link');
            ctaClone.href = 'javascript:void(0);';
            ctaClone.removeAttribute('target');
            ctaClone.classList.add('disabled');
            ctaClone.style.pointerEvents = 'none';
            ctaClone.style.cursor = 'not-allowed';
          }
          
          actionsContainer.appendChild(ctaClone);
        }
        
        if (existingBackBtn) {
          const backBtnClone = existingBackBtn.cloneNode(true);
          actionsContainer.appendChild(backBtnClone);
        }
        
        flowContainer.appendChild(actionsContainer);
        
        // Hide the original button container
        const detailButtons = document.querySelector('.detail-buttons');
        if (detailButtons) {
          detailButtons.style.display = 'none';
        }
        
        // Insert flow container after prices container
        pricesContainer.parentNode.insertBefore(flowContainer, pricesContainer.nextSibling);
      }
    }

    // Load related products with skeleton loading
    await loadRelatedProducts(p);
    
    } catch (error) {
      // console.error('[Product] Loading error:', error);
      // Show error state
      const skeleton = document.getElementById('productDetailSkeleton');
      const content = document.getElementById('deal');
      if (skeleton) {
        skeleton.setAttribute('aria-busy', 'false');
        skeleton.setAttribute('aria-hidden', 'true');
        skeleton.style.display = 'none';
      }
      if (content) {
        content.style.display = '';
        content.innerHTML = '<div style="text-align: center; padding: 60px 20px;"><h2>Error Loading Product</h2><p>There was an error loading this product. Please try again later.</p><a href="index.html" class="btn btn-primary">Back to Deals</a></div>';
      }
      return;
    }
  }

  async function loadRelatedProducts(product) {
    try {
      // Add delay for related products skeleton
      await new Promise(resolve => setTimeout(resolve, 400));
      
      const { data: sameBrand } = await window.supabaseClient
        .from('cleaned_products')
        .select('hash_id, product_id, title, price, sale_price, image, brand, currency, store_id')
        .eq('status', 'published')
        .not('image', 'is', null)
        .not('store_id', 'is', null)
        .eq('store_id', product.store_id)
        .neq('hash_id', product.hash_id)
        .order('updated_at', { ascending: false, nullsFirst: false })
        .limit(6);
      let items = sameBrand || [];
      if (items.length < 6) {
        const { data: fallback } = await window.supabaseClient
          .from('cleaned_products')
          .select('hash_id, product_id, title, price, sale_price, image, brand, currency, store_id')
          .eq('status', 'published')
          .not('image', 'is', null)
          .not('store_id', 'is', null)
          .neq('hash_id', product.hash_id)
          .order('updated_at', { ascending: false, nullsFirst: false })
          .limit(6 - items.length);
        items = items.concat(fallback || []);
      }
      
      // Get store names for related products
      if (items.length > 0) {
        const storeIds = [...new Set(items.map(item => item.store_id).filter(Boolean))];
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
        
        // Add store names to items
        items = items.map(item => ({
          ...item,
          store_name: storeMap[item.store_id] || item.brand
        }));
      }
      
      const frag = document.createDocumentFragment();
      items.slice(0, 6).forEach(r => {
        const card = document.createElement('article'); card.className = 'product-card';
        const media = document.createElement('div'); media.className = 'product-media';
        if (r.image) media.style.background = `center/cover no-repeat url(${CSS.escape ? CSS.escape(r.image) : r.image})`;
        const body = document.createElement('div'); body.className = 'product-body';
        const b = document.createElement('span'); b.className = 'brand-tag'; b.textContent = r.store_name || '';
        const t = document.createElement('h3'); t.className = 'product-title'; t.textContent = r.title || '';
        const prices = document.createElement('div'); prices.className = 'deal-prices';
        
        // Check if there's a discount
        const hasDiscount = r.sale_price && r.price && Number(r.price) > Number(r.sale_price);
        if (hasDiscount) {
          prices.classList.add('has-discount');
          // Add discount badge to product card (top right corner)
          const discountPercent = Math.round(((Number(r.price) - Number(r.sale_price)) / Number(r.price)) * 100);
          const discountBadge = document.createElement('span');
          discountBadge.className = 'discount-badge';
          discountBadge.textContent = `-${discountPercent}%`;
          media.appendChild(discountBadge); // Attach to media (image area)
        }
        
        const now = document.createElement('span'); now.className = 'price-now'; now.textContent = r.sale_price ? formatCurrency(r.sale_price, r.currency || 'EUR') : formatCurrency(r.price, r.currency || 'EUR');
        prices.appendChild(now);
        if (hasDiscount) { const old = document.createElement('span'); old.className = 'price-old'; old.textContent = formatCurrency(r.price, r.currency || 'EUR'); prices.appendChild(old); }
        const cta = document.createElement('a'); cta.className = 'btn btn-primary'; 
        // Use SEO-friendly URL if available, otherwise fallback to old format
        cta.href = window.seoUtils ? window.seoUtils.createSeoFriendlyProductUrl(r.hash_id, r.title) : `product.html?id=${encodeURIComponent(r.hash_id)}`;
        cta.setAttribute('data-i18n', 'card.cta'); cta.textContent = 'View deal'; // fallback
        body.append(b, t, prices, cta); card.append(media, body); 
        
        // Apply current language to the button
        if (window.applyLanguageToElement) {
          window.applyLanguageToElement(cta);
        }
        
        frag.append(card);
      });
      
      // Show related products with animation
      showContentWithAnimation('relatedSkeleton', 'relatedGrid', frag);
      
    } catch (error) {
      // console.error('[Product] Related products loading error:', error);
      // Show empty grid on error
      const skeleton = document.getElementById('relatedSkeleton');
      const grid = document.getElementById('relatedGrid');
      if (skeleton) skeleton.style.display = 'none';
      if (grid) grid.style.display = '';
    }
  }

  // Listen for language changes to update product description and price flow card
  function setupProductLanguageChangeListener() {
    // Listen for language changes (custom event or manual checking)
    document.addEventListener('languageChanged', function() {
      if (currentProductData) {
        updateProductDescription(currentProductData);
        updatePriceFlowCardText(currentProductData);
      }
    });
    
    // Also listen for storage changes (when language is changed from other tabs/pages)
    window.addEventListener('storage', function(e) {
      if (e.key === 'selectedLanguage' && currentProductData) {
        updateProductDescription(currentProductData);
        updatePriceFlowCardText(currentProductData);
      }
    });
    
    // Listen for clicks on language buttons (backup method)
    document.addEventListener('click', function(e) {
      if (e.target.closest('[data-lang]') && currentProductData) {
        // Small delay to ensure language has been updated
        setTimeout(() => {
          updateProductDescription(currentProductData);
          updatePriceFlowCardText(currentProductData);
        }, 100);
      }
    });
  }

  // Initialize language change listener
  setupProductLanguageChangeListener();

  /**
   * Create and show affiliate modal popup
   * Shows discount info and email capture before redirecting
   */
  function showAffiliateModal(affiliateLink, productData = null) {
    // Get current language for translations
    const currentLang = localStorage.getItem('selectedLanguage') || 'en';
    const dict = window.translations?.[currentLang] || window.translations?.en || {};
    
    // Calculate prices if product data available
    let priceHTML = '';
    if (productData && (productData.price || productData.sale_price)) {
      const originalPrice = Number(productData.price) || Number(productData.sale_price);
      const currentPrice = Number(productData.sale_price) || originalPrice;
      const shopshoutPrice = currentPrice * 0.9;
      const savings = originalPrice - shopshoutPrice;
      const currency = productData.currency || 'EUR';
      
      priceHTML = `
        <div class="affiliate-modal-price-comparison">
          <div class="price-row price-original">
            <span class="price-label">${currentLang === 'de' ? 'Originalpreis' : 'Original Price'}</span>
            <span class="price-value">${formatCurrency(originalPrice, currency)}</span>
          </div>
          <div class="price-row price-shopshout">
            <span class="price-label">${currentLang === 'de' ? 'Mit ShopShout' : 'With ShopShout'}</span>
            <span class="price-value price-highlight">${formatCurrency(shopshoutPrice, currency)}</span>
          </div>
          <div class="price-savings">
            ${currentLang === 'de' ? 'Du sparst' : 'You save'} <strong>${formatCurrency(savings, currency)}</strong>
          </div>
        </div>
      `;
    }
    
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'affiliate-modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'affiliate-modal-title');
    
    // Modal content
    overlay.innerHTML = `
      <div class="affiliate-modal">
        <button class="affiliate-modal-close" aria-label="Close modal">&times;</button>
        
        <div class="affiliate-modal-header">
          <div class="affiliate-modal-icon">🎉</div>
          <h2 id="affiliate-modal-title" class="affiliate-modal-title">
            ${currentLang === 'de' ? 'Exklusiver Bonus!' : 'Exclusive Bonus!'}
          </h2>
          ${priceHTML}
        </div>
        
        <div class="affiliate-modal-body">
          <div class="affiliate-modal-highlight">
            <div class="affiliate-modal-discount">+10%</div>
            <p class="affiliate-modal-discount-text">
              ${currentLang === 'de' 
                ? 'Extra Rabatt durch ShopShout' 
                : 'Extra discount through ShopShout'}
            </p>
          </div>
          
          <form class="affiliate-modal-form" id="affiliateModalForm">
            <div class="affiliate-modal-actions">
              <button type="button" class="affiliate-modal-btn affiliate-modal-btn-primary" id="continueToStoreBtn">
                ${currentLang === 'de' ? 'Weiter zum Shop' : 'Continue to Store'}
              </button>
            </div>
            
            <div class="affiliate-modal-email-section">
              <label class="affiliate-modal-label" for="affiliateEmail">
                ${currentLang === 'de' 
                  ? '💌 Erhalte die besten Deals per E-Mail (optional)' 
                  : '💌 Get the best deals via email (optional)'}
              </label>
              <div class="affiliate-modal-email-group">
                <input 
                  type="email" 
                  id="affiliateEmail" 
                  class="affiliate-modal-input" 
                  placeholder="${currentLang === 'de' ? 'deine@email.com' : 'your@email.com'}"
                />
                <button type="submit" class="affiliate-modal-btn-small">
                  ${currentLang === 'de' ? 'Senden' : 'Send'}
                </button>
              </div>
              <p class="affiliate-modal-note">
                ${currentLang === 'de' 
                  ? 'Keine Sorge - Kein Spam, nur die besten Angebote!' 
                  : 'Don\'t worry - No spam, only the best deals!'}
              </p>
            </div>
          </form>
        </div>
      </div>
    `;
    
    // Append to body
    document.body.appendChild(overlay);
    
    // Get form elements
    const form = overlay.querySelector('#affiliateModalForm');
    const emailInput = overlay.querySelector('#affiliateEmail');
    const closeBtn = overlay.querySelector('.affiliate-modal-close');
    const continueBtn = overlay.querySelector('#continueToStoreBtn');
    
    // Handle "Continue to Store" button click
    continueBtn.addEventListener('click', function() {
      closeModalAndSwitchToStore();
    });
    
    // Handle form submit - email capture
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const email = emailInput.value.trim();
      
      if (email) {
        // TODO: Add email capture functionality
        // Send email to Supabase or newsletter service
        // Example:
        // await window.supabaseClient
        //   .from('newsletter_subscribers')
        //   .insert([{ email: email, source: 'affiliate_modal' }]);
        
        // Email captured successfully
        
        // Show success feedback
        emailInput.value = '';
        emailInput.placeholder = currentLang === 'de' ? '✓ Danke!' : '✓ Thanks!';
        emailInput.disabled = true;
        setTimeout(() => {
          emailInput.disabled = false;
          emailInput.placeholder = currentLang === 'de' ? 'deine@email.com' : 'your@email.com';
        }, 2000);
      }
    });
    
    // Handle close button - just close modal, stay on page
    closeBtn.addEventListener('click', function() {
      closeModalOnly();
    });
    
    // Handle overlay click (close on backdrop click)
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) {
        closeModalOnly();
      }
    });
    
    // Handle Escape key
    function handleEscape(e) {
      if (e.key === 'Escape') {
        closeModalOnly();
      }
    }
    document.addEventListener('keydown', handleEscape);
    
    // Close modal only - user stays on product page
    function closeModalOnly() {
      // Remove event listener
      document.removeEventListener('keydown', handleEscape);
      
      // Fade out animation
      overlay.style.opacity = '0';
      
      // Remove modal after animation
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
      }, 300);
      
      // User stays on product page in new tab
    }
    
    // Close modal and switch to affiliate store tab
    function closeModalAndSwitchToStore() {
      // Remove event listener
      document.removeEventListener('keydown', handleEscape);
      
      // Fade out animation
      overlay.style.opacity = '0';
      
      // Remove modal after animation
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
      }, 300);
      
      // Open affiliate link (this will switch to that tab or open a new one)
      setTimeout(() => {
        window.open(affiliateLink, '_blank', 'noopener,noreferrer');
      }, 400);
    }
    
    // Focus on email input for accessibility
    setTimeout(() => {
      emailInput.focus();
    }, 400);
  }

  /**
   * Setup click handlers for affiliate buttons
   * Intercepts clicks to show modal and open in new tab
   */
  function setupAffiliateButtonHandlers() {
    // Handle main CTA button clicks
    document.addEventListener('click', function(e) {
      // Check if clicked element is a "Go to Store" button
      const ctaButton = e.target.closest('#pdCta, #pdCtaClone');
      
      if (ctaButton && !ctaButton.classList.contains('disabled')) {
        // Get affiliate link from data attribute
        const affiliateLink = ctaButton.getAttribute('data-affiliate-link');
        
        if (affiliateLink) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          
          // Open current product page in NEW TAB with modal (so user can continue browsing)
          // Add URL parameters to trigger the modal with product data
          const currentUrl = new URL(window.location.href);
          currentUrl.searchParams.set('showModal', 'true');
          currentUrl.searchParams.set('affiliateUrl', encodeURIComponent(affiliateLink));
          
          // Pass current product data if available
          if (currentProductData) {
            currentUrl.searchParams.set('productData', encodeURIComponent(JSON.stringify({
              price: currentProductData.price,
              sale_price: currentProductData.sale_price,
              currency: currentProductData.currency
            })));
          }
          
          window.open(currentUrl.toString(), '_blank', 'noopener,noreferrer');
          
          // IMMEDIATELY redirect current page to affiliate link (no modal here)
          setTimeout(() => {
            window.location.href = affiliateLink;
          }, 100);
          
          return false;
        }
      }
    }, true); // Use capture phase to ensure we catch it first
  }

  // Initialize affiliate button handlers
  setupAffiliateButtonHandlers();

  // Check if this page was opened in a new tab and should show the modal
  function checkAndShowModalFromNewTab() {
    // Check URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const shouldShowModal = urlParams.get('showModal');
    const affiliateUrl = urlParams.get('affiliateUrl');
    const productDataParam = urlParams.get('productData');
    
    if (shouldShowModal === 'true' && affiliateUrl) {
      const decodedAffiliateUrl = decodeURIComponent(affiliateUrl);
      let productData = null;
      
      if (productDataParam) {
        try {
          productData = JSON.parse(decodeURIComponent(productDataParam));
        } catch (e) {
          console.error('[Affiliate Modal] Failed to parse product data:', e);
        }
      }
      
      // Remove the URL parameters to clean up the URL
      urlParams.delete('showModal');
      urlParams.delete('affiliateUrl');
      urlParams.delete('productData');
      const cleanUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
      window.history.replaceState({}, '', cleanUrl);
      
      // Show modal immediately (as fast as possible)
      showAffiliateModal(decodedAffiliateUrl, productData);
    }
  }
  
  // Check after render completes
  await render();
  checkAndShowModalFromNewTab();
})();

