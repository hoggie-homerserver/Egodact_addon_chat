// ============================================================
// EGODACT CHAT — IDENTITY
// ============================================================
// Finds out who is using the addon:
//   1. Decode the Auth0 id_token from Egodact's localStorage cache.
//   2. Fall back to any cached user object on the page.
//   3. Fall back to a stable local id (with a name the user can set).
//
// The id_token's `sub` is an Auth0 id, while the Egodact API uses
// its own user ids. Once the API directory is loaded we reconcile
// the two by matching on id, photo or name (see resolveFromDirectory).

(function () {
    'use strict';

    const C = window.EgodactChatConfig || {};

    function base64UrlDecode(input) {
        let str = String(input || '').replace(/-/g, '+').replace(/_/g, '/');
        while (str.length % 4) str += '=';
        const binary = atob(str);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        try {
            return new TextDecoder('utf-8').decode(bytes);
        } catch (err) {
            let out = '';
            for (let i = 0; i < binary.length; i++) out += String.fromCharCode(binary.charCodeAt(i));
            try { return decodeURIComponent(escape(out)); } catch (e) { return out; }
        }
    }

    function decodeJwt(token) {
        if (!token || typeof token !== 'string') return null;
        const parts = token.split('.');
        if (parts.length < 2) return null;
        try {
            return JSON.parse(base64UrlDecode(parts[1]));
        } catch (err) {
            return null;
        }
    }

    function looksLikeJwt(value) {
        return typeof value === 'string' && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value);
    }

    function scanAuthCache() {
        const found = { idToken: null, accessToken: null, cache: null, key: null };
        const preferredKey = C.accessTokenKey;

        // Egodact stores the access token as a RAW string under this key
        // (see challenges.js in the host extension: localStorage.getItem(key)
        // is used directly as a Bearer token). Handle that case first.
        if (preferredKey) {
            try {
                const raw = localStorage.getItem(preferredKey);
                if (raw) {
                    if (looksLikeJwt(raw)) {
                        // Could be either; treat as access token (host does).
                        if (!found.accessToken) found.accessToken = raw;
                    } else if (raw.charAt(0) !== '{' && raw.charAt(0) !== '[') {
                        if (!found.accessToken) found.accessToken = raw;
                    } else {
                        try {
                            const parsed = JSON.parse(raw);
                            const tokens = [parsed, parsed && parsed.body, parsed && parsed.user, parsed && parsed.profile];
                            for (const obj of tokens) {
                                if (!obj || typeof obj !== 'object') continue;
                                if (!found.idToken && looksLikeJwt(obj.id_token)) found.idToken = obj.id_token;
                                if (!found.idToken && looksLikeJwt(obj.idToken)) found.idToken = obj.idToken;
                                if (!found.accessToken && typeof obj.access_token === 'string') found.accessToken = obj.access_token;
                                if (!found.accessToken && typeof obj.accessToken === 'string') found.accessToken = obj.accessToken;
                                if (!found.cache && (obj.name || obj.email || obj.given_name)) found.cache = obj;
                            }
                        } catch (err) {}
                    }
                    found.key = preferredKey;
                }
            } catch (err) {}
        }

        const candidates = [];
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (!k || k === preferredKey) continue;
                if (/cache|auth|token|user|profile/i.test(k)) candidates.push(k);
            }
        } catch (err) {}

        // If nothing matched the heuristic, scan everything as a last resort.
        if (candidates.length === 0) {
            try {
                for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i);
                    if (k && k !== preferredKey) candidates.push(k);
                }
            } catch (err) {}
        }

        const seen = new Set();
        for (const k of candidates) {
            if (seen.has(k)) continue;
            seen.add(k);

            let raw = null;
            try { raw = localStorage.getItem(k); } catch (err) { continue; }
            if (!raw) continue;

            if (looksLikeJwt(raw)) {
                if (!found.idToken) found.idToken = raw;
                continue;
            }

            if (raw.charAt(0) !== '{' && raw.charAt(0) !== '[') continue;
            let parsed = null;
            try { parsed = JSON.parse(raw); } catch (err) { continue; }

            const tokens = [parsed, parsed && parsed.body, parsed && parsed.user, parsed && parsed.profile];
            for (const obj of tokens) {
                if (!obj || typeof obj !== 'object') continue;
                if (!found.idToken && looksLikeJwt(obj.id_token)) found.idToken = obj.id_token;
                if (!found.idToken && looksLikeJwt(obj.idToken)) found.idToken = obj.idToken;
                if (!found.accessToken && typeof obj.access_token === 'string') found.accessToken = obj.access_token;
                if (!found.accessToken && typeof obj.accessToken === 'string') found.accessToken = obj.accessToken;
                if (!found.cache && (obj.name || obj.email || obj.given_name)) found.cache = obj;
                if (!found.key && (obj.id_token || obj.access_token)) found.key = k;
            }
        }

        return found;
    }

    function nameFromClaims(claims) {
        if (!claims) return '';
        if (claims.name) return String(claims.name);
        if (claims.given_name || claims.family_name) {
            return [claims.given_name, claims.family_name].filter(Boolean).join(' ');
        }
        if (claims.nickname) return String(claims.nickname);
        if (claims.preferred_username) return String(claims.preferred_username);
        if (claims.email) return String(claims.email).split('@')[0];
        return '';
    }

    function detect() {
        const auth = scanAuthCache();
        const claims = auth.idToken ? decodeJwt(auth.idToken) : null;
        const accessClaims = auth.accessToken ? decodeJwt(auth.accessToken) : null;
        const cache = auth.cache || {};

        const merged = Object.assign({}, accessClaims || {}, claims || {}, cache || {});
        const apiAuth = {
            token: auth.accessToken || auth.idToken || '',
            school: (function () {
                try { return localStorage.getItem(C.schoolKey) || ''; } catch (err) { return ''; }
            })(),
            idToken: auth.idToken || '',
            claims: merged
        };

        const email = merged.email || '';
        const name = nameFromClaims(merged) || email.split('@')[0] || '';
        const sub = merged.sub || merged.user_id || merged.id || '';
        const photo = merged.picture || merged.avatar || '';
        const firstName = merged.given_name || (name ? name.split(/\s+/)[0] : '');

        // Remember a previously resolved Egodact user id by Auth0 sub.
        let resolved = null;
        if (sub) resolved = window.EGCStore.get('self_' + sub, null);

        return {
            id: (resolved && resolved.id) || sub || window.EGCStore.localId(),
            authSub: sub || '',
            name: (resolved && resolved.name) || name || 'Student',
            firstName: (resolved && resolved.firstName) || firstName || 'Student',
            email: email,
            photo: (resolved && resolved.photo) || photo || '',
            source: (resolved && 'egodact') || (sub ? 'single-sign-on' : 'local'),
            apiAuth: apiAuth
        };
    }

    function applyDisplayName(identity) {
        const override = window.EGCStore.displayNameOverride();
        if (override) {
            identity.name = override;
            identity.firstName = override.split(/\s+/)[0];
            identity.hasNameOverride = true;
        }
        return identity;
    }

    function norm(value) {
        return String(value || '').trim().toLowerCase();
    }

    function samePhoto(a, b) {
        const x = String(a || '').split('?')[0];
        const y = String(b || '').split('?')[0];
        return !!x && x === y;
    }

    // Match the Auth0 identity against the Egodact user directory so
    // DMs and groups use ids that other users see in their directory.
    function resolveFromDirectory(identity, users) {
        if (!identity || !Array.isArray(users) || !users.length) {
            return identity;
        }

        const sub = identity.authSub || '';
        const emailLocal = norm(String(identity.email || '').split('@')[0]);
        let matches = users.filter(function (u) { return u && u.id; });

        // 1. Exact id match (some deployments use the same id).
        if (sub) {
            const exact = matches.filter(function (u) { return String(u.id) === String(sub); });
            if (exact.length === 1) return adopt(identity, exact[0]);
        }

        // 2. Photo match is the strongest signal when names collide.
        const photo = identity.photo;
        if (photo) {
            const byPhoto = matches.filter(function (u) { return samePhoto(u.picture, photo); });
            if (byPhoto.length === 1) return adopt(identity, byPhoto[0]);
        }

        // 3. Full name match.
        const fullName = norm(identity.name);
        let byName = fullName ? matches.filter(function (u) { return norm(u.name) === fullName; }) : [];
        if (byName.length === 1) return adopt(identity, byName[0]);

        // 4. Email local part vs. name / first name.
        if (emailLocal) {
            const byEmail = matches.filter(function (u) {
                return norm(u.name).replace(/[^a-z0-9]/g, '') === emailLocal.replace(/[^a-z0-9]/g, '');
            });
            if (byEmail.length === 1) return adopt(identity, byEmail[0]);
        }

        // 5. Unique first-name match, but only if it is the only one.
        const first = norm(identity.firstName);
        if (first) {
            const byFirst = matches.filter(function (u) {
                return norm(u.firstName || String(u.name || '').split(/\s+/)[0]) === first;
            });
            if (byFirst.length === 1) return adopt(identity, byFirst[0]);
        }

        return identity;
    }

    function adopt(identity, user) {
        identity.id = user.id;
        identity.name = user.name || identity.name;
        identity.firstName = user.firstName || String(identity.name || '').split(/\s+/)[0];
        identity.photo = user.picture || identity.photo;
        if (user.email) identity.email = user.email;
        identity.source = 'egodact';
        if (identity.authSub) {
            window.EGCStore.set('self_' + identity.authSub, {
                id: identity.id,
                name: identity.name,
                firstName: identity.firstName,
                photo: identity.photo
            });
        }
        return identity;
    }

    function getApiAuth() {
        return detect().apiAuth;
    }

    window.EGCIdentity = {
        detect: detect,
        resolveFromDirectory: resolveFromDirectory,
        applyDisplayName: applyDisplayName,
        getApiAuth: getApiAuth
    };
})();
