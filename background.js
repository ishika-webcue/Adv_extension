chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'RESOLVE_URL' && typeof message.url === 'string') {
    (async () => {
      try {
        let finalUrl = message.url;

        try {
          // Use a free CORS proxy
          const proxyUrl = 'https://api.allorigins.win/get?url=' + encodeURIComponent(message.url);
          const resp = await fetch(proxyUrl);
          if (resp.ok) {
            const data = await resp.json();
            // Extract final URL from the content if possible
            // For redirects, some servers include the canonical <link> or <meta>
            // Otherwise, fallback to original URL
            const docText = data.contents || '';
            const urlMatch = docText.match(/<link rel="canonical" href="([^"]+)"/i);
            if (urlMatch && urlMatch[1]) {
              finalUrl = urlMatch[1];
            } else {
              finalUrl = message.url;
            }
          }
        } catch (err) {
          // If proxy fails, fallback
          finalUrl = message.url;
        }

        sendResponse({ ok: true, url: finalUrl });
      } catch (err) {
        sendResponse({ ok: false, url: message.url, error: String(err) });
      }
    })();
    return true; // keep channel open for async
  }
});
