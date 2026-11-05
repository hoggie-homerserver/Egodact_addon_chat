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
//
// Additionally, Egodact provides an autocomplete endpoint scoped
// to a challenge:
//   GET /challenge-portfolio/challenges/{id}/users/autocomplete?query=...
// This is used to find ANY user on the school, not just challenge
// participants.

(function () {
    'use strict';

    const C = window.EgodactChatConfig || {};
    const Store = window.EGCStore;

    let challengeIds = [];

    function normalizeUser(raw) {
        if (!raw || typeof raw !== 'object') return null;
        const id = raw.id || raw.userId || raw.uuid || raw._id || raw.user_id || raw.uid || raw.key || raw.accountId || raw.studentId;
        if (!id) {
            const fallback = raw.name || raw.fullName || raw.email || raw.mail;
            if (!fallback) return null;
            return {
                id: 'u_' + String(fallback).trim().toLowerCase().replace(/[^a-z0-9]/g, ''),
                name: String(fallback || 'Onbekend'),
                firstName: String(raw.firstName || raw.givenName || fallback || '').split(/\s+/)[0] || 'Onbekend',
                picture: raw.picture || raw.avatar || raw.photo || raw.image || raw.photoUrl || '',
                email: raw.email || raw.mail || raw.userEmail || raw.schoolEmail || raw.contactEmail || ''
            };
        }
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
            rawUserCount: 0,
            challengeIds: []
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

        let challenges = [];
        if (payload && Array.isArray(payload)) {
            challenges = payload;
        } else if (payload && payload.challenges) {
            if (Array.isArray(payload.challenges)) challenges = payload.challenges;
            else if (typeof payload.challenges === 'object') challenges = Object.values(payload.challenges);
        } else if (payload && payload.data && payload.data.challenges) {
            const c = payload.data.challenges;
            challenges = Array.isArray(c) ? c : Object.values(c);
        }

        debug.challengeCount = challenges.length;

        // Store challenge IDs for autocomplete
        const ids = [];
        challenges.forEach(function (c) {
            if (c && c.id) ids.push(String(c.id));
        });
        debug.challengeIds = ids;
        challengeIds = ids;

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
            if (!found && c.users && typeof c.users === 'object' && !Array.isArray(c.users)) {
                Object.keys(c.users).forEach(function (k) { add(c.users[k]); });
                if (debug.userFieldNames.indexOf('users(object)') === -1) debug.userFieldNames.push('users(object)');
            }
        });

        const topCandidates = [payload && payload.users, payload && payload.participants, payload && payload.members, payload && payload.students];
        topCandidates.forEach(function (top) {
            if (Array.isArray(top)) top.forEach(add);
            else if (top && typeof top === 'object') Object.keys(top).forEach(function (k) { add(top[k]); });
        });

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

        if (challenges.length) {
            debug.sampleChallengeKeys = Object.keys(challenges[0]);
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

    // School-wide user search using the autocomplete endpoint.
    // GET /challenge-portfolio/challenges/{challengeId}/users/autocomplete?query=...
    async function autocomplete(query) {
        query = String(query || '').trim();
        if (!query) return { users: [], error: null };

        // Need a challenge ID to scope the autocomplete.
        if (!challengeIds.length) {
            // Try to load the portfolio first.
            try {
                const auth = window.EGCIdentity.getApiAuth();
                await fetchPortfolio(auth);
            } catch (err) {
                return { users: [], error: String(err && err.message || err) };
            }
        }
        if (!challengeIds.length) {
            return { users: [], error: 'Geen challenges beschikbaar voor zoeken.' };
        }

        const auth = window.EGCIdentity.getApiAuth();
        const token = auth.token || (function () { try { return localStorage.getItem(C.accessTokenKey) || ''; } catch (e) { return ''; } })();
        if (!token) {
            return { users: [], error: 'Geen Egodact access token gevonden.' };
        }

        const challengeId = challengeIds[0];
        const path = (C.challengePath || '/challenge-portfolio') + '/challenges/' + encodeURIComponent(challengeId) + '/users/autocomplete?query=' + encodeURIComponent(query);
        const school = auth.school || (function () { try { return localStorage.getItem(C.schoolKey) || ''; } catch (e) { return ''; } })();

        // Try service worker first.
        try {
            const response = await withTimeout(sendMessage({
                type: 'egc:api',
                path: path,
                token: token,
                school: school
            }), 12000);
            if (response && response.ok) {
                const data = response.data;
                const users = extractAutocompleteUsers(data);
                return { users: users, error: null };
            }
            if (response && response.status === 401) {
                return { users: [], error: 'Je Egodact-sessie is verlopen. Herlaad de pagina en log opnieuw in.' };
            }
            if (response && response.error) {
                // Fall through to direct fetch.
            }
        } catch (err) {
            if (!/Geen extensie-omgeving|Could not establish connection|Receiving end does not exist/i.test(String(err && err.message))) {
                // Try direct fetch anyway.
            }
        }

        // Direct fetch fallback.
        try {
            const headers = { 'Authorization': 'Bearer ' + token, 'Accept': 'application/json' };
            if (school) headers['School'] = school;
            const base = (C.apiBase === undefined || C.apiBase === null) ? 'https://api.egodact.com' : C.apiBase;
            const response = await fetch(base + path, { method: 'GET', headers: headers, credentials: 'omit', cache: 'no-store' });
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    return { users: [], error: 'Je Egodact-sessie is verlopen. Herlaad de pagina en log opnieuw in.' };
                }
                return { users: [], error: 'Egodact API-fout ' + response.status + '.' };
            }
            const data = await response.json();
            const users = extractAutocompleteUsers(data);
            return { users: users, error: null };
        } catch (err) {
            return { users: [], error: String(err && err.message || err) };
        }
    }

    function extractAutocompleteUsers(data) {
        // The autocomplete response may be an array of users, or an object
        // with a 'users'/'results'/'items'/'data' field.
        let arr = null;
        if (Array.isArray(data)) arr = data;
        else if (data && Array.isArray(data.users)) arr = data.users;
        else if (data && Array.isArray(data.results)) arr = data.results;
        else if (data && Array.isArray(data.items)) arr = data.items;
        else if (data && Array.isArray(data.data)) arr = data.data;
        else if (data && data.users && typeof data.users === 'object') arr = Object.values(data.users);
        if (!arr) return [];
        return arr.map(normalizeUser).filter(Boolean);
    }

    // Try to fetch the current user's own profile from the API.
    // Egodact stores only the user id in the access token, not the
    // name/e-mail, so we look it up separately.
    async function fetchSelfProfile(userId) {
        if (!userId) return null;
        const auth = window.EGCIdentity.getApiAuth();
        const token = auth.token || (function () { try { return localStorage.getItem(C.accessTokenKey) || ''; } catch (e) { return ''; } })();
        if (!token) return null;
        const school = auth.school || (function () { try { return localStorage.getItem(C.schoolKey) || ''; } catch (e) { return ''; } })();

        const candidates = [
            '/auth/me'
        ];

        for (const path of candidates) {
            try {
                const headers = { 'Authorization': 'Bearer ' + token, 'Accept': 'application/json' };
                if (school) headers['School'] = school;
                const base = (C.apiBase === undefined || C.apiBase === null) ? 'https://api.egodact.com' : C.apiBase;
                const response = await fetch(base + path, { method: 'GET', headers: headers, credentials: 'omit', cache: 'no-store' });
                if (!response.ok) continue;
                const data = await response.json();
                // The response might be a user object directly, or wrapped.
                const obj = (data && data.user) || (data && data.data) || data;
                if (obj && (obj.id || obj.userId || obj.name || obj.email)) {
                    return normalizeUser(obj);
                }
            } catch (err) {
                // Try next candidate.
            }
        }
        return null;
    }

    async function load(options) {
        options = options || {};
        const auth = options.auth || window.EGCIdentity.getApiAuth();
        const storeKey = cacheKey(options.authSub || (auth && auth.claims && auth.claims.sub));

        // Try to fetch the user's own profile first.
        let selfProfile = null;
        try {
            const selfId = options.authSub || (auth && auth.claims && auth.claims.sub) || (window.EGCIdentity.detect().id);
            if (selfId) selfProfile = await fetchSelfProfile(selfId);
        } catch (err) {}

        if (!options.force) {
            const cached = Store.get(storeKey, null);
            if (cached && cached.users && cached.users.length && cached.at &&
                (Date.now() - cached.at) < (C.directoryCacheMs || 600000)) {
                return {
                    users: cached.users,
                    fetchedAt: cached.at,
                    cached: true,
                    error: null,
                    debug: cached.debug || null,
                    selfProfile: cached.selfProfile || selfProfile || null
                };
            }
        }

        try {
            const payload = await fetchPortfolio(auth);
            const collected = collectUsers(payload);
            const users = collected.users || collected;
            const debug = collected.debug || null;
            // If we found the user's own profile, ensure it's in the list.
            if (selfProfile && !users.some(function (u) { return String(u.id) === String(selfProfile.id); })) {
                users.unshift(selfProfile);
            }
            const at = Date.now();
            Store.set(storeKey, { at: at, users: users, debug: debug, selfProfile: selfProfile });
            return { users: users, fetchedAt: at, cached: false, error: null, debug: debug, selfProfile: selfProfile };
        } catch (err) {
            const cached = Store.get(storeKey, null);
            if (cached && cached.users && cached.users.length) {
                return {
                    users: cached.users,
                    fetchedAt: cached.at,
                    cached: true,
                    error: String(err && err.message || err),
                    debug: cached.debug || null,
                    selfProfile: cached.selfProfile || selfProfile || null
                };
            }
            return {
                users: [],
                fetchedAt: 0,
                cached: false,
                error: String(err && err.message || err),
                debug: null,
                selfProfile: selfProfile
            };
        }
    }

    window.EGCDirectory = {
        load: load,
        collectUsers: collectUsers,
        normalizeUser: normalizeUser,
        autocomplete: autocomplete
    };
})();
