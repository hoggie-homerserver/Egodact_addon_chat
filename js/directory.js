// ============================================================
// EGODACT CHAT — USER DIRECTORY
// ============================================================
// Egodact does not expose a public user list, but the challenge
// portfolio contains every user you share a challenge with:
//
//   challenges: { id: { users: [{ id, name, firstName, picture }] } }
//
// That is exactly the group of people you may want to chat with.
// The result is cached in localStorage for a few minutes.

(function () {
    'use strict';

    const C = window.EgodactChatConfig || {};
    const Store = window.EGCStore;

    function normalizeUser(raw) {
        if (!raw || typeof raw !== 'object') return null;
        const id = raw.id || raw.userId || raw.uuid;
        if (!id) return null;
        const name = raw.name || raw.fullName ||
            [raw.firstName, raw.lastName].filter(Boolean).join(' ') ||
            raw.firstName || '';
        return {
            id: String(id),
            name: String(name || 'Onbekend'),
            firstName: String(raw.firstName || name || '').split(/\s+/)[0] || 'Onbekend',
            picture: raw.picture || raw.avatar || raw.photo || raw.image || '',
            email: String(raw.email || '')
        };
    }

    function collectUsers(payload) {
        const byId = new Map();

        function add(raw) {
            const user = normalizeUser(raw);
            if (!user) return;
            const existing = byId.get(user.id);
            if (!existing) {
                byId.set(user.id, user);
                return;
            }
            if (!existing.name || existing.name === 'Onbekend') existing.name = user.name;
            if (!existing.picture) existing.picture = user.picture;
            if (!existing.firstName) existing.firstName = user.firstName;
        }

        const challenges = (payload && payload.challenges) || {};
        if (Array.isArray(challenges)) {
            challenges.forEach(function (c) {
                (c && c.users || []).forEach(add);
            });
        } else {
            Object.keys(challenges).forEach(function (id) {
                const c = challenges[id];
                (c && c.users || []).forEach(add);
            });
        }

        // Be liberal in case the API later adds a top-level user list.
        const top = payload && payload.users;
        if (Array.isArray(top)) top.forEach(add);
        else if (top && typeof top === 'object') Object.keys(top).forEach(function (k) { add(top[k]); });

        return Array.from(byId.values()).sort(function (a, b) {
            return String(a.name).localeCompare(String(b.name), 'nl', { sensitivity: 'base' });
        });
    }

    function sendMessage(message) {
        return new Promise(function (resolve, reject) {
            try {
                if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) {
                    reject(new Error('Geen extensie-omgeving.'));
                    return;
                }
                chrome.runtime.sendMessage(message, function (response) {
                    const err = chrome.runtime.lastError;
                    if (err) reject(new Error(err.message));
                    else resolve(response);
                });
            } catch (err) {
                reject(err);
            }
        });
    }

    function withTimeout(promise, ms) {
        return Promise.race([
            promise,
            new Promise(function (resolve, reject) {
                setTimeout(function () { reject(new Error('Egodact API reageert niet (time-out).')); }, ms);
            })
        ]);
    }

    async function fetchPortfolio(auth) {
        if (!auth || !auth.token) {
            throw new Error('Geen Egodact access token gevonden. Log opnieuw in bij Egodact.');
        }

        const path = C.challengePath || '/challenge-portfolio';

        // Preferred route: the service worker, which is not limited by CORS.
        try {
            const response = await withTimeout(sendMessage({
                type: 'egc:api',
                path: path,
                token: auth.token,
                school: auth.school || ''
            }), 12000);
            if (response && response.ok) return response.data;
            if (response && response.status === 401) {
                throw new Error('Je Egodact-sessie is verlopen. Herlaad de pagina en log opnieuw in.');
            }
            if (response && response.data) {
                throw new Error('Egodact API-fout ' + response.status + '.');
            }
            if (response && response.error) throw new Error(response.error);
        } catch (err) {
            // If the background page is unavailable, try a direct fetch.
            if (/Geen extensie-omgeving|Could not establish connection|Receiving end does not exist/i.test(String(err && err.message))) {
                return fetchDirect(path, auth);
            }
            throw err;
        }

        return fetchDirect(path, auth);
    }

    async function fetchDirect(path, auth) {
        const headers = {
            'Authorization': 'Bearer ' + auth.token,
            'Accept': 'application/json'
        };
        if (auth.school) headers['School'] = auth.school;

        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timer = controller ? setTimeout(function () { controller.abort(); }, 15000) : null;

        const base = (C.apiBase === undefined || C.apiBase === null)
            ? 'https://api.egodact.com'
            : C.apiBase;

        let response;
        try {
            response = await fetch(base + path, {
                method: 'GET',
                headers: headers,
                credentials: 'omit',
                signal: controller ? controller.signal : undefined
            });
        } finally {
            if (timer) clearTimeout(timer);
        }

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                throw new Error('Je Egodact-sessie is verlopen. Herlaad de pagina en log opnieuw in.');
            }
            throw new Error('Egodact API-fout ' + response.status + '.');
        }

        return response.json();
    }

    function cacheKey(authSub) {
        return 'directory_' + (authSub || 'anon');
    }

    async function load(options) {
        options = options || {};
        const auth = options.auth || window.EGCIdentity.getApiAuth();
        const storeKey = cacheKey(options.authSub || (auth && auth.claims && auth.claims.sub));

        if (!options.force) {
            const cached = Store.get(storeKey, null);
            if (cached && cached.users && cached.at &&
                (Date.now() - cached.at) < (C.directoryCacheMs || 600000)) {
                return {
                    users: cached.users,
                    fetchedAt: cached.at,
                    cached: true,
                    error: null
                };
            }
        }

        try {
            const payload = await fetchPortfolio(auth);
            const users = collectUsers(payload);
            const at = Date.now();
            Store.set(storeKey, { at: at, users: users });
            return { users: users, fetchedAt: at, cached: false, error: null };
        } catch (err) {
            // Stale cache is better than an empty picker.
            const cached = Store.get(storeKey, null);
            if (cached && cached.users && cached.users.length) {
                return {
                    users: cached.users,
                    fetchedAt: cached.at,
                    cached: true,
                    error: String(err && err.message || err)
                };
            }
            return {
                users: [],
                fetchedAt: 0,
                cached: false,
                error: String(err && err.message || err)
            };
        }
    }

    window.EGCDirectory = {
        load: load,
        collectUsers: collectUsers,
        normalizeUser: normalizeUser
    };
})();
