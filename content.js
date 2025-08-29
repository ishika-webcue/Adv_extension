(function () {
  const VERIFIED_KEYWORDS = ["verified publisher", "verified"];

  function isElementAd(element) {
    const adIndicators = ["ad", "ads", "advertisement", "sponsored", "promo", "promoted"];
    const role = element.getAttribute && element.getAttribute("role");
    if (role && role.toLowerCase().includes("advert")) return true;
    const dataAttrs = Array.from(element.attributes || []).map((a) => `${a.name}:${a.value}`);
    if (dataAttrs.some((a) => /ad|sponsored|promo/i.test(a))) return true;
    if (
      element.querySelector(
        "iframe, [id*='ad' i], [class*='ad' i], [data-ad], [data-ad-slot], [data-ad-client]"
      )
    ) {
      return true;
    }
    const text = element.textContent || "";
    if (adIndicators.some((ind) => new RegExp(`\\b${ind}\\b`, "i").test(text))) {
      return true;
    }
    return false;
  }

  function isVerifiedPublisher(element) {
    const text = (element.textContent || "").toLowerCase();
    return VERIFIED_KEYWORDS.some((k) => text.includes(k));
  }

  function hideVerifiedPublisherCards(root = document) {
    const candidates = root.querySelectorAll(
      [
        "article",
        "[data-testid*='card' i]",
        "[class*='card' i]",
        "[class*='feed' i] > *",
        "[class*='post' i]",
        "section",
        "li",
        "div",
      ].join(", ")
    );

    candidates.forEach((el) => {
      if (!(el instanceof HTMLElement)) return;
      if (isElementAd(el)) return;
      const hasVerifiedBadge =
        isVerifiedPublisher(el) ||
        el.querySelector("[aria-label*='verified' i], [class*='verified' i]");
      if (hasVerifiedBadge) {
        el.style.display = "none";
      }
    });
  }

  function hideSpecificNewsBreakSelectors(root = document) {
    const bars = root.querySelectorAll("div.border-b.border-gray-200");
    bars.forEach((bar) => {
      if (!(bar instanceof HTMLElement)) return;
      bar.style.display = "none";
      const text = (bar.textContent || "").toLowerCase();
      if (text.includes("verified publisher")) {
        const container =
          bar.closest(
            "article, li, section, [data-testid*='card' i], [class*='card' i], [class*='post' i]"
          ) || bar.parentElement;
        if (container instanceof HTMLElement && !isElementAd(container)) {
          container.style.display = "none";
        }
      }
    });
  }

  function hideSectionsByClass(root = document) {
    const sections = root.querySelectorAll("section.flex.flex-row.items-start.my-1");
    sections.forEach((sec) => {
      if (!(sec instanceof HTMLElement)) return;
      sec.style.display = "none";
    });
  }

  function onMutations(mutations) {
    for (const m of mutations) {
      if (m.type === "childList") {
        m.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            hideVerifiedPublisherCards(node);
            hideSpecificNewsBreakSelectors(node);
            hideSectionsByClass(node);
            if (!document.getElementById("nb-export-ads-btn")) {
              try {
                injectExportButton();
              } catch (_) {}
            }
          }
        });
      } else if (m.type === "attributes") {
        const target = m.target;
        if (target && target.nodeType === Node.ELEMENT_NODE) {
          hideVerifiedPublisherCards(target);
          hideSpecificNewsBreakSelectors(target);
          hideSectionsByClass(target);
          if (!document.getElementById("nb-export-ads-btn")) {
            try {
              injectExportButton();
            } catch (_) {}
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
      attributeFilter: ["class", "aria-label", "data-*"]
    });
    try {
      injectExportButton();
    } catch (_) {}
    setInterval(() => {
      if (!document.getElementById("nb-export-ads-btn")) {
        try {
          injectExportButton();
        } catch (_) {}
      }
    }, 1500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

// ======== Export Ads to CSV UI and Logic ========
(function () {
  function ensureButtonStyles() {
    if (document.getElementById("nb-export-ads-style")) return;
    const style = document.createElement("style");
    style.id = "nb-export-ads-style";
    style.textContent = [
      "#nb-export-ads-btn {",
      "  position: fixed;",
      "  right: 16px;",
      "  bottom: 16px;",
      "  z-index: 2147483647;",
      "  background: #111827;",
      "  color: #ffffff;",
      "  border: none;",
      "  border-radius: 6px;",
      "  padding: 10px 14px;",
      "  font-size: 13px;",
      "  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, 'Apple Color Emoji', 'Segoe UI Emoji';",
      "  cursor: pointer;",
      "  box-shadow: 0 4px 12px rgba(0,0,0,0.15);",
      "}",
      "#nb-export-ads-btn:hover {",
      "  background: #1f2937;",
      "}"
    ].join("\n");
    document.documentElement.appendChild(style);
  }

  function injectExportButton() {
    ensureButtonStyles();
    const mount = document.body || document.documentElement;
    if (!mount) {
      setTimeout(injectExportButton, 100);
      return;
    }
    const existing = document.getElementById("nb-export-ads-btn");
    const btn = document.createElement("button");
    btn.id = "nb-export-ads-btn";
    btn.type = "button";
    btn.textContent = "Export Ads CSV";
    btn.addEventListener("click", onExportAdsClick);
    if (existing) {
      existing.replaceWith(btn);
    } else {
      mount.appendChild(btn);
    }
  }

  function onExportAdsClick() {
    downloadAdsCSV();
  }

  function csvEscape(value) {
    if (value == null) return "";
    const s = String(value).replace(/\r?\n|\r/g, " ");
    return '"' + s.replace(/"/g, '""') + '"';
  }

  function downloadAdsCSV() {
    const roots = [document];
    document.querySelectorAll("iframe").forEach((iframe) => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc) roots.push(doc);
      } catch (_) {}
    });

    const rows = [];
    roots.forEach((root) => {
      root.querySelectorAll(".ad-card-container").forEach((ad) => {
        const headline = ad.querySelector(".ad-headline")?.innerText?.trim() || "";
        const anchor = ad.closest("a.mspai-click-through") || ad.querySelector("a.mspai-click-through");
        const link = anchor?.href || "";
        const img = ad.querySelector(".ad-foreground")?.src || "";
        if (headline || link || img) {
          rows.push({ headline, link, img });
        }
      });
    });

    // Build CSV instantly (no waiting for network)
    const csv = ["Headline,Image,Destination"]
      .concat(rows.map((r) => `${csvEscape(r.headline)},${csvEscape(r.img)},${csvEscape(r.link)}`))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ad_data_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  window.injectExportButton = injectExportButton;
})(); 