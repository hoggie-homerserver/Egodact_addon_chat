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
        const id = raw.id || raw.userId || raw.uuid || raw._id || raw.user_id;
        if (!id) return null;
        const name = raw.name || raw.fullName || raw.displayName || raw.username ||
            [raw.firstName, raw.lastName].filter(Boolean).join(' ') ||
            raw.firstName || '';
        return {
            id: String(id),
            name: String(name || 'Onbekend'),
            firstName: String(raw.firstName || raw.givenName || name || '').split(/\s+/)[0] || 'Onbekend',
            picture: raw.picture || raw.avatar || raw.photo || raw.image || raw.photoUrl || '',
            email: raw.email || raw.mail || raw.userEmail || raw.schoolEmail || raw.contactEmail || ''
        };
    }

    function collectUsers(payload) {
        const byId = new Map();
        const debug = {
            topKeys: payload && typeof payload === 'object' ? Object.keys(payload) : [],
            challengeCount: 0,
            userFieldNames: [],
            rawUserCount: 0
        };

        function add(raw) {
            const user = normalizeUser(raw);
            if (!user) return;
            debug.rawUserCount++;
            const existing = byId.get(user.id);
            if (!existing) {
                byId.set(user.id, user);
                return;
            }
            if (!existing.name || existing.name === 'Onbekend') existing.name = user.name;
            if (!existing.picture) existing.picture = user.picture;
            if (!existing.firstName) existing.firstName = user.firstName;
            if (!existing.email && user.email) existing.email = user.email;
        }

        // Collect challenges from various possible shapes.
        let challenges = [];
        if (payload && Array.isArray(payload)) {
            // Maybe the whole payload is a list of challenges.
            challenges = payload;
        } else if (payload && payload.challenges) {
            if (Array.isArray(payload.challenges)) challenges = payload.challenges;
            else if (typeof payload.challenges === 'object') challenges = Object.values(payload.challenges);
        } else if (payload && payload.data && payload.data.challenges) {
            const c = payload.data.challenges;
            challenges = Array.isArray(c) ? c : Object.values(c);
        }

        debug.challengeCount = challenges.length;

        const USER_FIELDS = ['users', 'participants', 'members', 'students', 'leerlingen', 'deelnemers', 'classmates', 'people'];

        challenges.forEach(function (c) {
            if (!c || typeof c !== 'object') return;
            let found = false;
            USER_FIELDS.forEach(function (field) {
                const arr = c[field];
                if (Array.isArray(arr)) {
                    if (debug.userFieldNames.indexOf(field) === -1) debug.userFieldNames.push(field);
                    arr.forEach(add);
                    found = true;
                }
            });
            // Some APIs nest users under a 'users' object keyed by id.
            if (!found && c.users && typeof c.users === 'object' && !Array.isArray(c.users)) {
                Object.keys(c.users).forEach(function (k) { add(c.users[k]); });
                if (debug.userFieldNames.indexOf('users(object)') === -1) debug.userFieldNames.push('users(object)');
            }
        });

        // Top-level user lists.
        const top = payload && (payload.users || payload.participants || payload.members || payload.students);
        if (Array.isArray(top)) top.forEach(add);
        else if (top && typeof top === 'object') Object.keys(top).forEach(function (k) { add(top[k]); });

        const users = Array.from(byId.values()).sort(function (a, b) {
            return String(a.name).localeCompare(String(b.name), 'nl', { sensitivity: 'base' });
        });

        return { users: users, debug: debug };
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
        auth = auth || {};
        if (!auth.token) {
            try { auth = Object.assign({}, auth, { token: localStorage.getItem(C.accessTokenKey) || '' }); } catch (err) {}
        }
        if (!auth.token) {
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
            if (cached && cached.users && cached.users.length && cached.at &&
                (Date.now() - cached.at) < (C.directoryCacheMs || 600000)) {
                return {
                    users: cached.users,
                    fetchedAt: cached.at,
                    cached: true,
                    error: null,
                    debug: cached.debug || null
                };
            }
        }

        try {
            const payload = await fetchPortfolio(auth);
            const collected = collectUsers(payload);
            const users = collected.users || collected;
            const debug = collected.debug || null;
            const at = Date.now();
            Store.set(storeKey, { at: at, users: users, debug: debug });
            return { users: users, fetchedAt: at, cached: false, error: null, debug: debug };
        } catch (err) {
            // Stale cache is better than an empty picker.
            const cached = Store.get(storeKey, null);
            if (cached && cached.users && cached.users.length) {
                return {
                    users: cached.users,
                    fetchedAt: cached.at,
                    cached: true,
                    error: String(err && err.message || err),
                    debug: cached.debug || null
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
