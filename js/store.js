// ============================================================
// EGODACT CHAT — LOCAL STORE
// ============================================================
// Small localStorage wrapper plus the per-user "last read"
// markers used for unread dots. Everything is namespaced so it
// can never collide with the host extension or other addons.

(function () {
    'use strict';

    const PREFIX = 'egodact_chat_';

    function key(name) {
        return PREFIX + name;
    }

    function get(name, fallback) {
        try {
            const raw = localStorage.getItem(key(name));
            return raw === null ? fallback : JSON.parse(raw);
        } catch (err) {
            return fallback;
        }
    }

    function set(name, value) {
        try {
            localStorage.setItem(key(name), JSON.stringify(value));
            return true;
        } catch (err) {
            return false;
        }
    }

    function remove(name) {
        try { localStorage.removeItem(key(name)); } catch (err) {}
    }

    function clearChatData() {
        try {
            const doomed = [];
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k.indexOf(PREFIX) === 0) doomed.push(k);
            }
            doomed.forEach(function (k) { localStorage.removeItem(k); });
        } catch (err) {}
    }

    function randomId(prefix) {
        const bytes = new Uint8Array(9);
        try { crypto.getRandomValues(bytes); } catch (err) {
            for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
        }
        return (prefix || '') + Array.prototype.map.call(bytes, function (b) {
            return b.toString(16).padStart(2, '0');
        }).join('');
    }

    function localId() {
        let id = get('local_id', null);
        if (!id) {
            id = randomId('local_');
            set('local_id', id);
        }
        return id;
    }

    function readMap(appId) {
        const all = get('read', {});
        return (all && all[appId]) || {};
    }

    function markRead(appId, roomId, at) {
        if (!appId || !roomId) return;
        const all = get('read', {});
        const mine = (all && all[appId]) || {};
        mine[roomId] = Number(at) || Date.now();
        all[appId] = mine;
        // Keep the store from growing forever.
        const ids = Object.keys(mine);
        if (ids.length > 500) {
            ids.sort(function (a, b) { return mine[a] - mine[b]; });
            ids.slice(0, ids.length - 500).forEach(function (id) { delete mine[id]; });
        }
        set('read', all);
    }

    function displayNameOverride() {
        return get('display_name', '') || '';
    }

    window.EGCStore = {
        get: get,
        set: set,
        remove: remove,
        clearChatData: clearChatData,
        randomId: randomId,
        localId: localId,
        readMap: readMap,
        markRead: markRead,
        displayNameOverride: displayNameOverride
    };
})();
