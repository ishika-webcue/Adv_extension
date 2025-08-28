// Resolve the final destination of a URL by following redirects (CORS-permitted)
// Falls back to the original URL if network errors or cross-origin issues occur
self.addEventListener('message', () => {});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === 'RESOLVE_URL' && typeof message.url === 'string') {
    (async () => {
      try {
        // HEAD minimizes payload; some servers may block, so fallback to GET without reading body
        let finalUrl = message.url;
        try {
          const headResp = await fetch(message.url, { method: 'HEAD', redirect: 'follow', mode: 'no-cors' });
          // In no-cors, we can't read much, but the request still follows redirects; URL might not reflect final
          // Try a regular GET without consuming body to extract final URL; rely on the Response.url property
          const getResp = await fetch(message.url, { method: 'GET', redirect: 'follow' });
          finalUrl = getResp.url || finalUrl;
        } catch (_) {
          // Ignore and keep original
        }
        sendResponse({ ok: true, url: finalUrl });
      } catch (err) {
        sendResponse({ ok: false, url: message.url, error: String(err) });
      }
    })();
    return true; // Keep message channel open for async sendResponse
  }
});




