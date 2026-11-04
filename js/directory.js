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
        const id = raw.id || raw.userId || raw.uuid || raw._id || raw.user_id || raw.uid || raw.key || raw.accountId || raw.studentId;
        if (!id) {
            // Fall back to name/email so at least something shows up.
            const fallback = raw.name || raw.fullName || raw.email || raw.mail;
            if (!fallback) return null;
            // Use a stable-ish key derived from the available fields.
            return {
                id: 'u_' + String(fallback).trim().toLowerCase().replace(/[^a-z0-9]/g, ''),
                name: String(fallback || 'Onbekend'),
                firstName: String(raw.firstName || raw.givenName || fallback || '').split(/\s+/)[0] || 'Onbekend',
                picture: raw.picture || raw.avatar || raw.photo || raw.image || raw.photoUrl || '',
                email: raw.email || raw.mail || raw.userEmail || raw.schoolEmail || raw.contactEmail || ''
            };
        }
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
            // Known field names first.
            USER_FIELDS.forEach(function (field) {
                const arr = c[field];
                if (Array.isArray(arr)) {
                    if (debug.userFieldNames.indexOf(field) === -1) debug.userFieldNames.push(field);
                    arr.forEach(add);
                    found = true;
                }
            });
            // Generic fallback: any array field whose items look like users.
            if (!found) {
                Object.keys(c).forEach(function (field) {
                    const arr = c[field];
                    if (!Array.isArray(arr) || !arr.length || typeof arr[0] !== 'object' || arr[0] === null) return;
                    const sample = arr[0];
                    const looksLikeUser = !!(sample.id || sample.userId || sample.uuid || sample.name || sample.firstName || sample.email || sample.picture);
                    if (!looksLikeUser) return;
                    if (debug.userFieldNames.indexOf(field + '(auto)') === -1) debug.userFieldNames.push(field + '(auto)');
                    arr.forEach(add);
                    found = true;
                });
            }
            // users as object keyed by id.
            if (!found && c.users && typeof c.users === 'object' && !Array.isArray(c.users)) {
                Object.keys(c.users).forEach(function (k) { add(c.users[k]); });
                if (debug.userFieldNames.indexOf('users(object)') === -1) debug.userFieldNames.push('users(object)');
            }
        });

        // Top-level user lists (known + generic).
        const topCandidates = [payload && payload.users, payload && payload.participants, payload && payload.members, payload && payload.students];
        topCandidates.forEach(function (top) {
            if (Array.isArray(top)) top.forEach(add);
            else if (top && typeof top === 'object') Object.keys(top).forEach(function (k) { add(top[k]); });
        });

        // Generic top-level: any array of user-like objects.
        if (payload && typeof payload === 'object') {
            Object.keys(payload).forEach(function (key) {
                const val = payload[key];
                if (!Array.isArray(val) || !val.length || typeof val[0] !== 'object' || val[0] === null) return;
                if (key === 'challenges' || key === 'rows') return;
                const sample = val[0];
                const looksLikeUser = !!(sample.id || sample.userId || sample.uuid || sample.name || sample.firstName || sample.email);
                if (!looksLikeUser) return;
                if (debug.userFieldNames.indexOf(key + '(top,auto)') === -1) debug.userFieldNames.push(key + '(top,auto)');
                val.forEach(add);
            });
        }

        // Debug: sample challenge + user keys.
        if (challenges.length) {
            debug.sampleChallengeKeys = Object.keys(challenges[0]);
            // Find first challenge with a non-empty users array to sample user keys.
            for (let i = 0; i < challenges.length; i++) {
                const c = challenges[i];
                if (!c || typeof c !== 'object') continue;
                for (const k of Object.keys(c)) {
                    const v = c[k];
                    if (Array.isArray(v) && v.length && typeof v[0] === 'object' && v[0] !== null) {
                        debug.sampleUserKeys = Object.keys(v[0]);
                        debug.sampleUserField = k;
                        break;
                    }
                }
                if (debug.sampleUserKeys) break;
            }
        }
        if (!debug.sampleUserKeys) debug.sampleUserKeys = null;

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
