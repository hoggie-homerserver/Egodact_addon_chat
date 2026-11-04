// ============================================================
// EGODACT CHAT — BACKGROUND API PROXY
// ============================================================
// Content scripts run with the page's origin, so calls to
// api.egodact.com can be blocked by CORS or page policies. The
// service worker has host permissions and can fetch directly.
// The access token is passed in from the content script and is
// never stored here.

'use strict';

const API_BASE = 'https://api.egodact.com';

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (!message || message.type !== 'egc:api') return;

    const path = String(message.path || '');
    if (path.charAt(0) !== '/') {
        sendResponse({ ok: false, status: 0, error: 'Ongeldig API-pad.' });
        return;
    }

    if (!message.token) {
        sendResponse({ ok: false, status: 401, error: 'Geen access token.' });
        return;
    }

    const headers = {
        'Authorization': 'Bearer ' + message.token,
        'Accept': 'application/json'
    };

    if (message.school) headers['School'] = message.school;

    fetch(API_BASE + path, {
        method: 'GET',
        headers: headers,
        credentials: 'omit'
    }).then(async function (response) {
        const text = await response.text();
        let data = null;
        try { data = text ? JSON.parse(text) : null; } catch (err) { data = text; }
        sendResponse({
            ok: response.ok,
            status: response.status,
            data: data
        });
    }).catch(function (err) {
        sendResponse({ ok: false, status: 0, error: String(err && err.message || err) });
    });

    // Keep the message channel open for the async response.
    return true;
});
