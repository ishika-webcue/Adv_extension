(function () {
  const VERIFIED_KEYWORDS = [
    'verified publisher',
    'verified',
  ];

  function isElementAd(element) {
    // Heuristics to avoid hiding ads/promoted modules
    // Keep elements that contain common ad markers or iframe/ad slots
    const adIndicators = [
      'ad', 'ads', 'advertisement', 'sponsored', 'promo', 'promoted'
    ];

    const role = element.getAttribute && element.getAttribute('role');
    if (role && role.toLowerCase().includes('advert')) return true;

    const dataAttrs = Array.from(element.attributes || []).map(a => `${a.name}:${a.value}`);
    if (dataAttrs.some(a => /ad|sponsored|promo/i.test(a))) return true;

    // Look for common ad DOM patterns
    if (element.querySelector('iframe, [id*="ad" i], [class*="ad" i], [data-ad], [data-ad-slot], [data-ad-client]')) {
      return true;
    }

    // Text markers
    const text = element.textContent || '';
    if (adIndicators.some(ind => new RegExp(`\\b${ind}\\b`, 'i').test(text))) {
      return true;
    }

    return false;
  }

  function isVerifiedPublisher(element) {
    const text = (element.textContent || '').toLowerCase();
    return VERIFIED_KEYWORDS.some(k => text.includes(k));
  }

  function hideVerifiedPublisherCards(root = document) {
    // Target potential feed cards/tiles; selectors are broad to be resilient to minor DOM changes
    const candidates = root.querySelectorAll([
      'article',
      '[data-testid*="card" i]',
      '[class*="card" i]',
      '[class*="feed" i] > *',
      '[class*="post" i]',
      'section',
      'li',
      'div'
    ].join(', '));

    candidates.forEach((el) => {
      if (!(el instanceof HTMLElement)) return;

      // Skip if looks like an ad
      if (isElementAd(el)) return;

      // Check for verified label within the card
      const hasVerifiedBadge = isVerifiedPublisher(el) || el.querySelector('[aria-label*="verified" i], [class*="verified" i]');
      if (hasVerifiedBadge) {
        el.style.display = 'none';
      }
    });
  }

  function hideSpecificNewsBreakSelectors(root = document) {
    // Hide elements like <div class="border-b border-gray-200">
    const bars = root.querySelectorAll('div.border-b.border-gray-200');
    bars.forEach((bar) => {
      if (!(bar instanceof HTMLElement)) return;
      // Always hide the bar itself as requested
      bar.style.display = 'none';

      // Additionally, if this bar contains 'verified publisher', hide its enclosing post container
      const text = (bar.textContent || '').toLowerCase();
      if (text.includes('verified publisher')) {
        const container = bar.closest('article, li, section, [data-testid*="card" i], [class*="card" i], [class*="post" i]') || bar.parentElement;
        if (container instanceof HTMLElement && !isElementAd(container)) {
          container.style.display = 'none';
        }
      }
    });
  }

  function hideSectionsByClass(root = document) {
    const sections = root.querySelectorAll('section.flex.flex-row.items-start.my-1');
    sections.forEach((sec) => {
      if (!(sec instanceof HTMLElement)) return;
      sec.style.display = 'none';
    });
  }

  function onMutations(mutations) {
    for (const m of mutations) {
      if (m.type === 'childList') {
        m.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            hideVerifiedPublisherCards(node);
            hideSpecificNewsBreakSelectors(node);
            hideSectionsByClass(node);
            if (!document.getElementById('nb-export-ads-btn')) {
              try { injectExportButton(); } catch (_) {}
            }
          }
        });
      } else if (m.type === 'attributes') {
        const target = m.target;
        if (target && target.nodeType === Node.ELEMENT_NODE) {
          hideVerifiedPublisherCards(target);
          hideSpecificNewsBreakSelectors(target);
          hideSectionsByClass(target);
          if (!document.getElementById('nb-export-ads-btn')) {
            try { injectExportButton(); } catch (_) {}
          }
        }
      }
    }
  }

  function init() {
    hideVerifiedPublisherCards(document);
    hideSpecificNewsBreakSelectors(document);
    hideSectionsByClass(document);

    const observer = new MutationObserver(onMutations);
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class', 'aria-label', 'data-*']
    });

    // Inject Export CSV button
    try { injectExportButton(); } catch (_) {}

    // Ensure presence periodically in case SPA navigation removes it
    setInterval(() => {
      if (!document.getElementById('nb-export-ads-btn')) {
        try { injectExportButton(); } catch (_) {}
      }
    }, 1500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

// ======== Export Ads to CSV UI and Logic ========
(function () {
  function ensureButtonStyles() {
    if (document.getElementById('nb-export-ads-style')) return;
    const style = document.createElement('style');
    style.id = 'nb-export-ads-style';
    style.textContent = [
      '#nb-export-ads-btn {',
      '  position: fixed;',
      '  right: 16px;',
      '  bottom: 16px;',
      '  z-index: 2147483647;',
      '  background: #111827;',
      '  color: #ffffff;',
      '  border: none;',
      '  border-radius: 6px;',
      '  padding: 10px 14px;',
      '  font-size: 13px;',
      '  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji";',
      '  cursor: pointer;',
      '  box-shadow: 0 4px 12px rgba(0,0,0,0.15);',
      '}',
      '#nb-export-ads-btn:hover {',
      '  background: #1f2937;',
      '}'
    ].join('\n');
    document.documentElement.appendChild(style);
  }

  function injectExportButton() {
    ensureButtonStyles();
    const mount = document.body || document.documentElement;
    if (!mount) {
      setTimeout(injectExportButton, 100);
      return;
    }

    const existing = document.getElementById('nb-export-ads-btn');
    const btn = document.createElement('button');
    btn.id = 'nb-export-ads-btn';
    btn.type = 'button';
    btn.textContent = 'Export Ads CSV';
    btn.addEventListener('click', onExportAdsClick);

    if (existing) {
      existing.replaceWith(btn);
    } else {
      mount.appendChild(btn);
    }
  }

  function onExportAdsClick() {
    // Use the simple per-ad selector approach requested
    downloadAdsCSV();
  }

  // User-requested export function using direct selectors
  function downloadAdsCSV() {
    // Gather roots: main document + any accessible same-origin iframes
    const roots = [document];
    document.querySelectorAll('iframe').forEach((iframe) => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc && doc.location && typeof doc.location.href === 'string') {
          roots.push(doc);
        }
      } catch (_) {
        // Cross-origin iframe; ignore
      }
    });

    const rows = [];
    roots.forEach((root) => {
      const ads = root.querySelectorAll('.ad-card-container');
      ads.forEach((ad) => {
        const headline = ad.querySelector('.ad-headline')?.innerText || '';
        const link = ad.querySelector('a.mspai-click-through')?.href || '';
        const img = ad.querySelector('.ad-foreground')?.src || '';
        rows.push({ headline, link, img });
      });
    });

    const esc = (s) => String(s).replace(/\"/g, '\"\"').replace(/\r?\n|\r/g, ' ');

    const resolvePromises = rows.map((r) => new Promise((resolve) => {
      if (!r.link || !chrome?.runtime?.sendMessage) return resolve({ ...r, destination: r.link || '' });
      try {
        chrome.runtime.sendMessage({ type: 'RESOLVE_URL', url: r.link }, (resp) => {
          if (resp && resp.ok && resp.url) {
            resolve({ ...r, destination: resp.url });
          } else {
            resolve({ ...r, destination: r.link });
          }
        });
      } catch (_) {
        resolve({ ...r, destination: r.link });
      }
    }));

    Promise.all(resolvePromises).then((finalRows) => {
      let csv = 'Headline,Image,Destination\n';
      finalRows.forEach((r) => {
        csv += `\"${esc(r.headline)}\",\"${esc(r.img)}\",\"${esc(r.destination)}\"\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ad_data.csv';
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  function collectAdData() {
    const results = [];
    // Target the specific ad card structure described
    const adCards = document.querySelectorAll('.ad-card-container');
    adCards.forEach((container) => {
      if (!(container instanceof HTMLElement)) return;

      // Skip if hidden
      const style = getComputedStyle(container);
      if (container.offsetParent === null || style.display === 'none' || style.visibility === 'hidden') return;

      // Anchor around the ad
      const anchor = container.closest('a.mspai-click-through[href]') || container.querySelector('a.mspai-click-through[href]') || container.closest('a[href]') || container.querySelector('a[href]');
      const link = anchor ? (anchor.getAttribute('href') || '') : '';

      // Headline
      const headlineEl = container.querySelector('h3.ad-headline, .ad-headline');
      const headline = headlineEl ? (headlineEl.textContent || '').trim() : '';

      // Image
      const imgEl = container.querySelector('img.ad-foreground');
      const img = imgEl ? (imgEl.getAttribute('src') || '') : '';

      if (headline || link || img) {
        results.push({ headline, link, img });
      }
    });
    return dedupeResults(results);
  }

  function dedupeResults(rows) {
    const seen = new Set();
    const out = [];
    rows.forEach(r => {
      const key = [r.link, r.img, r.headline].join('|');
      if (!seen.has(key)) {
        seen.add(key);
        out.push(r);
      }
    });
    return out;
  }

  function csvEscape(value) {
    if (value == null) return '';
    const s = String(value).replace(/\r?\n|\r/g, ' ');
    if (/[",]/.test(s)) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  function toCSV(rows) {
    // Use the exact header/field naming requested
    const header = ['Headline', 'Link', 'Image'];
    const lines = [header.join(',')];
    rows.forEach((r) => {
      lines.push([
        csvEscape(r.headline),
        csvEscape(r.link),
        csvEscape(r.img)
      ].join(','));
    });
    return lines.join('\n');
  }

  function downloadCSV(csvText, filename) {
    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
  async function exportAdsCsv() {
    const roots = [document];
  
    // Include same-origin iframes (cross-origin will be skipped automatically)
    document.querySelectorAll('iframe').forEach((iframe) => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc && doc.location && typeof doc.location.href === 'string') roots.push(doc);
      } catch (_) {}
    });
  
    // Collect rows
    const rows = [];
    roots.forEach((root) => {
      root.querySelectorAll('.ad-card-container').forEach((ad) => {
        const headline = ad.querySelector('.ad-headline')?.innerText?.trim() || '';
        const link = (ad.querySelector('a.mspai-click-through')?.href
                   || ad.closest('a.mspai-click-through')?.href
                   || ad.querySelector('a[href]')?.href
                   || ad.closest('a[href]')?.href
                   || '') || '';
        const img = ad.querySelector('.ad-foreground')?.src
                 || ad.querySelector('.ad-image-container img')?.src
                 || '';
        if (headline || link || img) rows.push({ headline, link, img });
      });
    });
  
    // CSV
    const esc = (s) => String(s ?? '').replace(/"/g, '""').replace(/\r?\n|\r/g, ' ');
    const csv = ['Headline,Link,Image']
      .concat(rows.map(r => `"${esc(r.headline)}","${esc(r.link)}","${esc(r.img)}"`))
      .join('\n');
  
    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ad_data_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  // exportAdsCsv(); // Disabled auto-run; use the Export button to trigger manually

  // Expose for outer init call
  window.injectExportButton = injectExportButton;
})();


