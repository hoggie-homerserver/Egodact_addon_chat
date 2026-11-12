// ============================================================
// EGODACT CHAT — TRANSPORT
// ============================================================
// One small API, two implementations:
//
//   firebase : real cross-device chat, using Firestore + anonymous
//              auth. Enabled as soon as config.js has a project.
//   local    : demo mode. Rooms and messages live in localStorage
//              and are shared between tabs of the same browser.
//
// Normalized room:
//   { id, type, name, members, memberProfiles, lastMessage,
//     lastMessageAt (ms), lastMessageSender, createdAt (ms) }
//
// Normalized message:
//   { id, text, senderId, senderUid, senderName, senderPhoto,
//     createdAt (ms), editedAt (ms), reactions ({emoji: [ids]}),
//     pending }

(function () {
    'use strict';

    const C = window.EgodactChatConfig || {};
    const Store = window.EGCStore;
    const LOCAL_ROOM_KEY = 'local_rooms';
    const LOCAL_MSG_PREFIX = 'local_msgs_';
    const LOCAL_SEEDED_KEY = 'local_seeded';

    let kind = 'none';
    let identity = null;
    let impl = null;
    let roomsById = new Map();
    let lastError = '';
    let firebaseTried = false;
    let initQueue = Promise.resolve();

    // ------------------------------------------------------------
    // Shared helpers
    // ------------------------------------------------------------

    function hash32(input) {
        let h = 2166136261;
        const str = String(input);
        for (let i = 0; i < str.length; i++) {
            h ^= str.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        return h >>> 0;
    }

    // A chat member can be identified by an Egodact user id and/or an
    // e-mail address. Different clients do not always expose the same
    // id for the same person (challenge participant ids differ from
    // the ids returned by /auth/me), but e-mail addresses are stable.
    // So: rooms store every key we know for a member, DM ids are built
    // from the canonical keys, and room lookups match on any key.
    function canonicalKey(user) {
        if (user == null) return '';
        if (typeof user === 'string' || typeof user === 'number') {
            const value = String(user).trim();
            return value ? 'i:' + value.toLowerCase() : '';
        }
        const id = String(user.id || '').trim();
        if (id) return 'i:' + id.toLowerCase();
        const email = String(user.email || '').trim().toLowerCase();
        return email ? 'e:' + email : '';
    }

    function memberKeys(user) {
        if (user == null) return [];
        if (typeof user === 'string' || typeof user === 'number') {
            const value = String(user).trim();
            return value ? [value] : [];
        }
        const out = [];
        function push(value) {
            const v = String(value == null ? '' : value).trim();
            if (v && out.indexOf(v) === -1) out.push(v);
        }
        push(user.id);
        if (Array.isArray(user.aliases)) user.aliases.forEach(push);
        push(String(user.email || '').trim().toLowerCase());
        return out;
    }

    function mergeMemberList() {
        const out = [];
        for (let i = 0; i < arguments.length; i++) {
            const list = arguments[i];
            if (!list) continue;
            const arr = Array.isArray(list) ? list : [list];
            arr.forEach(function (value) {
                const v = String(value == null ? '' : value).trim();
                if (v && out.indexOf(v) === -1) out.push(v);
            });
        }
        return out;
    }

    function mergeProfiles(base) {
        const out = Object.assign({}, base || {});
        for (let i = 1; i < arguments.length; i++) {
            const user = arguments[i];
            if (!user) continue;
            const profile = profileOf(user);
            memberKeys(user).forEach(function (key) { out[key] = profile; });
            const canonical = canonicalKey(user);
            if (canonical) out[canonical] = profile;
        }
        return out;
    }

    function dmRoomId(a, b) {
        const key = [canonicalKey(a), canonicalKey(b)].sort().join('|');
        return 'dm_' + hash32(key).toString(36) + hash32(key + '#egc').toString(36);
    }

    function tsToMs(value) {
        if (!value) return 0;
        if (typeof value === 'number') return value;
        if (typeof value.toMillis === 'function') return value.toMillis();
        if (value.seconds) return value.seconds * 1000;
        return 0;
    }

    function profileOf(user) {
        return {
            name: user.name || user.firstName || 'Onbekend',
            firstName: user.firstName || String(user.name || '').split(/\s+/)[0] || 'Onbekend',
            photo: user.photo || user.picture || ''
        };
    }

    function sortRooms(rooms) {
        return rooms.slice().sort(function (a, b) {
            return (b.lastMessageAt || b.createdAt || 0) - (a.lastMessageAt || a.createdAt || 0);
        });
    }

    function normalizeRoom(id, data) {
        data = data || {};
        const profiles = data.memberProfiles || {};
        return {
            id: id,
            type: data.type === 'dm' ? 'dm' : 'group',
            name: data.name || '',
            members: Array.isArray(data.members) ? data.members.map(String) : [],
            memberProfiles: profiles,
            lastMessage: data.lastMessage || '',
            lastMessageAt: tsToMs(data.lastMessageAt) || tsToMs(data.createdAt),
            lastMessageSender: data.lastMessageSender || '',
            lastMessageSenderName: data.lastMessageSenderName || '',
            createdAt: tsToMs(data.createdAt),
            raw: data
        };
    }

    function setRoomsCache(rooms) {
        roomsById = new Map();
        rooms.forEach(function (room) { roomsById.set(room.id, room); });
        return rooms;
    }

    function friendlyFirebaseError(err) {
        const code = String(err && (err.code || err.message) || err);
        if (/configuration-not-found/i.test(code)) {
            return 'Anonieme aanmelding staat nog niet aan. Zet in Firebase Authentication → Sign-in method → Anonymous aan.';
        }
        if (/operation-not-allowed/i.test(code)) {
            return 'Anonieme aanmelding staat uit in Firebase. Zet Authentication → Sign-in method → Anonymous aan.';
        }
        if (/invalid-api-key|api-key-not-valid/i.test(code)) {
            return 'De Firebase apiKey in config.js is ongeldig.';
        }
        if (/permission-denied|insufficient-permission/i.test(code)) {
            return 'Firestore-regels blokkeren het chatten. Publiceer de regels uit firestore.rules.';
        }
        if (/unavailable|network|offline/i.test(code)) {
            return 'Firebase is niet bereikbaar. Controleer je internetverbinding.';
        }
        if (/auth\/.*disabled/i.test(code)) {
            return 'Anonieme auth staat uit in Firebase.';
        }
        const detail = err && err.message ? err.message : code;
        return 'Firebase-fout: ' + detail;
    }

    // Message actions have their own failure mode: a denied write on a
    // message usually means the sender check in the rules rejected it
    // (old messages have no senderUid) or the latest rules are not
    // published yet.
    function friendlyMessageError(err) {
        const code = String(err && (err.code || err.message) || err);
        if (/permission-denied|insufficient-permission/i.test(code)) {
            return 'Alleen de afzender kan dit bericht aanpassen. Publiceer de nieuwste firestore.rules als dit je eigen bericht is.';
        }
        return friendlyFirebaseError(err);
    }

    function firebaseConfigured() {
        const fb = C.firebase || {};
        return !!(fb.apiKey && fb.projectId && fb.appId);
    }

    // Reject if a promise takes too long, so a blocked network request
    // can never leave the UI stuck on "Verbinden…".
    function withTimeout(promise, ms, label) {
        let timer = null;
        const timeout = new Promise(function (resolve, reject) {
            timer = setTimeout(function () {
                reject(new Error((label || 'Verbinding') + ' duurde te lang (time-out).'));
            }, ms);
        });
        // Swallow a late rejection from the original promise so a
        // timed-out request cannot surface as an unhandled rejection.
        promise.catch(function () {});
        return Promise.race([promise, timeout]).finally(function () {
            if (timer) clearTimeout(timer);
        });
    }

    // ------------------------------------------------------------
    // Attachment helpers
    // ------------------------------------------------------------
    // Attachments are one file per message. The message document only
    // carries metadata; the bytes live in Firebase Storage (real mode)
    // or IndexedDB (local demo mode).

    function attachmentConfig() {
        const cfg = C.attachments || {};
        const max = Number(cfg.maxBytes);
        return { maxBytes: max > 0 ? max : 25 * 1024 * 1024 };
    }

    function attachmentSizeLabel(bytes) {
        const n = Number(bytes) || 0;
        if (n < 1024) return Math.max(0, Math.round(n)) + ' B';
        if (n < 1024 * 1024) return (n / 1024).toFixed(n < 10 * 1024 ? 1 : 0) + ' kB';
        if (n < 1024 * 1024 * 1024) return (n / (1024 * 1024)).toFixed(n < 10 * 1024 * 1024 ? 1 : 0) + ' MB';
        return (n / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
    }

    // Storage keys may not contain slashes, so strip the characters
    // that browsers or Storage reject and cap the length.
    function attachmentFileName(file) {
        const raw = String((file && file.name) || 'bestand').trim() || 'bestand';
        return raw.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '_').slice(0, 120) || 'bestand';
    }

    function attachmentType(file) {
        const type = String((file && file.type) || '').toLowerCase();
        if (type.indexOf('image/') === 0) return 'image';
        if (type.indexOf('video/') === 0) return 'video';
        if (type.indexOf('audio/') === 0) return 'audio';
        return 'file';
    }

    function validateAttachmentFile(file) {
        if (!file) throw new Error('Geen bestand gekozen.');
        if (!file.size) throw new Error('Dit bestand is leeg.');
        const max = attachmentConfig().maxBytes;
        if (file.size > max) {
            throw new Error('Dit bestand is te groot (' + attachmentSizeLabel(file.size) +
                '). Maximaal ' + attachmentSizeLabel(max) + '.');
        }
        return file;
    }

    // The conversation list shows text, or a paperclip line when the
    // message is only an attachment.
    function messagePreview(text, attachment) {
        const clean = String(text || '').trim();
        if (clean) return clean.slice(0, 160);
        if (attachment && attachment.name) return '\ud83d\udcce ' + attachment.name;
        return '';
    }

    function friendlyStorageError(err) {
        const code = String((err && (err.code || err.name)) || '');
        if (code.indexOf('unauthorized') !== -1) {
            return 'Geen toegang tot de bestandsopslag. Controleer of Firebase Storage aan staat en storage.rules is gepubliceerd.';
        }
        if (code.indexOf('canceled') !== -1) return 'Upload geannuleerd.';
        if (code.indexOf('quota') !== -1) return 'De opslagruimte van het Firebase-project is vol.';
        if (code.indexOf('retry-limit') !== -1) return 'Upload mislukt door een netwerkfout. Probeer het opnieuw.';
        if (code.indexOf('storage/unknown') !== -1) return 'Bestandsopslag is niet bereikbaar. Controleer je internetverbinding.';
        return String((err && err.message) || 'Uploaden mislukt.');
    }

    // ------------------------------------------------------------
    // Local demo implementation
    // ------------------------------------------------------------

    function createLocal() {
        let channel = null;
        let channelReady = false;
        let roomListeners = [];
        let messageListeners = new Map();

        function setupChannel() {
            if (channelReady) return;
            channelReady = true;
            try { channel = new BroadcastChannel('egodact-chat-local'); } catch (err) { channel = null; }
            if (channel) {
                channel.addEventListener('message', function (event) {
                    const data = event.data || {};
                    if (data.type === 'rooms') notifyRooms();
                    if (data.type === 'message' && data.roomId) notifyMessages(data.roomId);
                });
            }
            window.addEventListener('storage', function (event) {
                if (!event || !event.key) return;
                if (event.key === 'egodact_chat_' + LOCAL_ROOM_KEY) notifyRooms();
                if (event.key.indexOf('egodact_chat_' + LOCAL_MSG_PREFIX) === 0) {
                    const roomId = event.key.slice(('egodact_chat_' + LOCAL_MSG_PREFIX).length);
                    notifyMessages(roomId);
                }
            });
        }

        function broadcast(payload) {
            try { if (channel) channel.postMessage(payload); } catch (err) {}
        }

        function notifyRooms() {
            const rooms = sortRooms(Object.values(Store.get(LOCAL_ROOM_KEY, {})));
            setRoomsCache(rooms);
            roomListeners.forEach(function (cb) { try { cb(rooms, {}); } catch (err) {} });
        }

        function notifyMessages(roomId) {
            const listeners = messageListeners.get(roomId) || [];
            if (!listeners.length) return;
            const messages = readMessages(roomId);
            listeners.forEach(function (cb) { try { cb(messages, {}); } catch (err) {} });
        }

        function readMessages(roomId) {
            const list = Store.get(LOCAL_MSG_PREFIX + roomId, []);
            return Array.isArray(list) ? list.slice().sort(function (a, b) {
                return (a.createdAt || 0) - (b.createdAt || 0);
            }) : [];
        }

        function writeMessage(roomId, message) {
            const list = Store.get(LOCAL_MSG_PREFIX + roomId, []);
            const next = Array.isArray(list) ? list : [];
            next.push(message);
            Store.set(LOCAL_MSG_PREFIX + roomId, next.slice(-500));
            return next;
        }

        // After an edit or a delete the room preview may point at text
        // that changed (or at a message that is gone), so rebuild it
        // from the newest message that is left.
        function refreshRoomPreview(roomId) {
            const rooms = Store.get(LOCAL_ROOM_KEY, {});
            const room = rooms[roomId];
            if (!room) return;
            const messages = readMessages(roomId);
            const last = messages.length ? messages[messages.length - 1] : null;
            room.lastMessage = last ? messagePreview(last.text, last.attachment) : '';
            room.lastMessageAt = last ? (last.createdAt || Date.now()) : Date.now();
            room.lastMessageSender = last ? String(last.senderId || '') : '';
            room.lastMessageSenderName = last ? String(last.senderName || '') : '';
            Store.set(LOCAL_ROOM_KEY, rooms);
            notifyRooms();
            broadcast({ type: 'rooms' });
        }

        function seed() {
            const rooms = Store.get(LOCAL_ROOM_KEY, null);
            if (!rooms || typeof rooms !== 'object' || !Object.keys(rooms).length) {
                const id = 'lokaal-testkanaal';
                const seededRooms = {};
                seededRooms[id] = {
                    id: id,
                    type: 'group',
                    name: 'Lokaal testkanaal',
                    members: ['local-demo'],
                    memberProfiles: {
                        'local-demo': { name: 'Demo', firstName: 'Demo', photo: '' }
                    },
                    lastMessage: '',
                    lastMessageAt: Date.now(),
                    lastMessageSender: '',
                    createdAt: Date.now()
                };
                Store.set(LOCAL_ROOM_KEY, seededRooms);
            }

            if (!Store.get(LOCAL_SEEDED_KEY, false)) {
                Store.set(LOCAL_SEEDED_KEY, true);
                const welcome = {
                    id: Store.randomId('m_'),
                    text: 'Dit is de lokale demo-modus. Open de addon in een tweede tab om met jezelf te chatten. Vul config.js met je Firebase-project om echte gesprekken te voeren.',
                    senderId: 'system',
                    senderName: 'Systeem',
                    senderPhoto: '',
                    createdAt: Date.now()
                };
                writeMessage('lokaal-testkanaal', welcome);

                const current = Store.get(LOCAL_ROOM_KEY, {});
                if (current['lokaal-testkanaal']) {
                    current['lokaal-testkanaal'].lastMessage = welcome.text.slice(0, 160);
                    current['lokaal-testkanaal'].lastMessageAt = welcome.createdAt;
                    current['lokaal-testkanaal'].lastMessageSender = 'system';
                    current['lokaal-testkanaal'].lastMessageSenderName = 'Systeem';
                    Store.set(LOCAL_ROOM_KEY, current);
                }
            }
        }

        // --------------------------------------------------------
        // Attachments (IndexedDB)
        // --------------------------------------------------------
        // localStorage is far too small for photos and videos, so the
        // local demo keeps the bytes in IndexedDB and only metadata in
        // the message. Object URLs are cached, and revoked when the
        // attachment is deleted.
        const attachmentUrls = new Map();

        async function uploadAttachment(roomId, file, onProgress) {
            validateAttachmentFile(file);
            if (!window.EGCBlobStore) throw new Error('Lokale bestandsopslag is niet geladen.');
            const id = Store.randomId('a_');
            await window.EGCBlobStore.put(id, file);
            if (typeof onProgress === 'function') {
                try { onProgress(1); } catch (err) {}
            }
            return {
                id: id,
                name: attachmentFileName(file),
                size: file.size,
                type: attachmentType(file),
                mime: String(file.type || ''),
                storage: 'local'
            };
        }

        async function attachmentUrl(attachment) {
            if (!attachment || !attachment.id || !window.EGCBlobStore) return '';
            if (attachmentUrls.has(attachment.id)) return attachmentUrls.get(attachment.id);
            const blob = await window.EGCBlobStore.get(attachment.id);
            if (!blob) return '';
            const url = URL.createObjectURL(blob);
            attachmentUrls.set(attachment.id, url);
            return url;
        }

        async function deleteAttachment(attachment) {
            if (!attachment || !attachment.id) return;
            const url = attachmentUrls.get(attachment.id);
            if (url) {
                try { URL.revokeObjectURL(url); } catch (err) {}
                attachmentUrls.delete(attachment.id);
            }
            if (!window.EGCBlobStore) return;
            try { await window.EGCBlobStore.remove(attachment.id); } catch (err) {}
        }

        return {
            init: async function () {
                seed();
                setupChannel();
                return { kind: 'local' };
            },

            myUid: function () {
                return String((identity && identity.id) || '');
            },

            uploadAttachment: uploadAttachment,
            attachmentUrl: attachmentUrl,
            deleteAttachment: deleteAttachment,

            listRooms: function (cb) {
                roomListeners.push(cb);
                const rooms = sortRooms(Object.values(Store.get(LOCAL_ROOM_KEY, {})));
                setRoomsCache(rooms);
                setTimeout(function () { try { cb(rooms, {}); } catch (err) {} }, 0);
                return function () {
                    roomListeners = roomListeners.filter(function (fn) { return fn !== cb; });
                };
            },

            watchMessages: function (roomId, cb) {
                if (!messageListeners.has(roomId)) messageListeners.set(roomId, []);
                messageListeners.get(roomId).push(cb);
                setTimeout(function () { try { cb(readMessages(roomId), {}); } catch (err) {} }, 0);
                return function () {
                    const list = (messageListeners.get(roomId) || []).filter(function (fn) { return fn !== cb; });
                    if (list.length) messageListeners.set(roomId, list);
                    else messageListeners.delete(roomId);
                };
            },

            sendMessage: async function (roomId, text, attachment) {
                const message = {
                    id: Store.randomId('m_'),
                    text: text,
                    senderId: identity.id,
                    senderUid: String(identity.id || ''),
                    senderName: identity.name,
                    senderPhoto: identity.photo || '',
                    createdAt: Date.now()
                };
                if (attachment) message.attachment = attachment;
                writeMessage(roomId, message);

                try {
                    const rooms = Store.get(LOCAL_ROOM_KEY, {});
                    const room = rooms[roomId];
                    if (room) {
                        room.lastMessage = messagePreview(text, attachment);
                        room.lastMessageAt = message.createdAt;
                        room.lastMessageSender = identity.id;
                        room.lastMessageSenderName = identity.name;
                        room.memberProfiles = mergeProfiles(room.memberProfiles, identity);
                        Store.set(LOCAL_ROOM_KEY, rooms);
                    }
                } catch (err) {}

                notifyMessages(roomId);
                notifyRooms();
                broadcast({ type: 'message', roomId: roomId });
                broadcast({ type: 'rooms' });
                return message;
            },

            ensureDm: async function (peer) {
                const peerKeys = memberKeys(peer);
                const rooms = Store.get(LOCAL_ROOM_KEY, {});
                let id = '';
                let bestAt = -1;
                Object.keys(rooms).forEach(function (key) {
                    const room = rooms[key];
                    if (!room || room.type !== 'dm') return;
                    const members = Array.isArray(room.members) ? room.members.map(String) : [];
                    const samePeer = peerKeys.some(function (pkey) {
                        return members.indexOf(pkey) !== -1;
                    });
                    if (!samePeer) return;
                    const at = room.lastMessageAt || room.createdAt || 0;
                    if (at > bestAt) {
                        bestAt = at;
                        id = room.id || key;
                    }
                });
                if (!id) id = dmRoomId(identity, peer);
                if (!rooms[id]) {
                    rooms[id] = {
                        id: id,
                        type: 'dm',
                        name: '',
                        members: mergeMemberList(memberKeys(identity), memberKeys(peer)),
                        memberProfiles: mergeProfiles({}, identity, peer),
                        lastMessage: '',
                        lastMessageAt: Date.now(),
                        lastMessageSender: '',
                        createdAt: Date.now()
                    };
                } else {
                    rooms[id].members = mergeMemberList(rooms[id].members, memberKeys(identity), memberKeys(peer));
                    rooms[id].memberProfiles = mergeProfiles(rooms[id].memberProfiles, identity, peer);
                }
                Store.set(LOCAL_ROOM_KEY, rooms);
                notifyRooms();
                broadcast({ type: 'rooms' });
                return id;
            },

            createGroup: async function (name, peers) {
                let members = memberKeys(identity);
                let profiles = mergeProfiles({}, identity);
                peers.forEach(function (peer) {
                    members = mergeMemberList(members, memberKeys(peer));
                    profiles = mergeProfiles(profiles, peer);
                });

                const id = 'g_' + Store.randomId('');
                const rooms = Store.get(LOCAL_ROOM_KEY, {});
                rooms[id] = {
                    id: id,
                    type: 'group',
                    name: name,
                    members: members,
                    memberProfiles: profiles,
                    lastMessage: '',
                    lastMessageAt: Date.now(),
                    lastMessageSender: '',
                    createdAt: Date.now()
                };
                Store.set(LOCAL_ROOM_KEY, rooms);
                notifyRooms();
                broadcast({ type: 'rooms' });
                return id;
            },

            // Add missing member keys (id/e-mail) to an existing room.
            addMemberKeys: async function (roomId, users) {
                const rooms = Store.get(LOCAL_ROOM_KEY, {});
                const room = rooms[roomId];
                if (!room) return;
                const before = mergeMemberList(room.members).length;
                let members = mergeMemberList(room.members);
                let profiles = mergeProfiles(room.memberProfiles);
                (users || []).forEach(function (user) {
                    members = mergeMemberList(members, memberKeys(user));
                    profiles = mergeProfiles(profiles, user);
                });
                if (members.length === before) return;
                room.members = members;
                room.memberProfiles = profiles;
                Store.set(LOCAL_ROOM_KEY, rooms);
                notifyRooms();
                broadcast({ type: 'rooms' });
            },

            editMessage: async function (roomId, messageId, text) {
                const list = Store.get(LOCAL_MSG_PREFIX + roomId, []);
                const next = Array.isArray(list) ? list : [];
                let found = false;
                next.forEach(function (message) {
                    if (message.id !== messageId) return;
                    message.text = text;
                    message.editedAt = Date.now();
                    found = true;
                });
                if (!found) throw new Error('Bericht niet gevonden.');
                Store.set(LOCAL_MSG_PREFIX + roomId, next);
                notifyMessages(roomId);
                broadcast({ type: 'message', roomId: roomId });
                refreshRoomPreview(roomId);
            },

            deleteMessage: async function (roomId, messageId, attachment) {
                const list = Store.get(LOCAL_MSG_PREFIX + roomId, []);
                const next = (Array.isArray(list) ? list : []).filter(function (message) {
                    return message.id !== messageId;
                });
                Store.set(LOCAL_MSG_PREFIX + roomId, next);
                notifyMessages(roomId);
                broadcast({ type: 'message', roomId: roomId });
                refreshRoomPreview(roomId);
                if (attachment) await deleteAttachment(attachment);
            },

            setReaction: async function (roomId, messageId, emoji, active) {
                const list = Store.get(LOCAL_MSG_PREFIX + roomId, []);
                const next = Array.isArray(list) ? list : [];
                const me = String(identity.id || '');
                let found = false;
                next.forEach(function (message) {
                    if (message.id !== messageId) return;
                    found = true;
                    const reactions = Object.assign({}, message.reactions || {});
                    const users = Array.isArray(reactions[emoji]) ? reactions[emoji].slice() : [];
                    const at = users.indexOf(me);
                    if (active && at === -1) users.push(me);
                    if (!active && at !== -1) users.splice(at, 1);
                    if (users.length) reactions[emoji] = users;
                    else delete reactions[emoji];
                    message.reactions = reactions;
                });
                if (!found) throw new Error('Bericht niet gevonden.');
                Store.set(LOCAL_MSG_PREFIX + roomId, next);
                notifyMessages(roomId);
                broadcast({ type: 'message', roomId: roomId });
            }
        };
    }

    // ------------------------------------------------------------
    // Firebase implementation
    // ------------------------------------------------------------

    function createFirebase() {
        let db = null;
        let auth = null;
        let storage = null;
        let storageWorks = true;
        let ready = false;

        function getDb() {
            return db;
        }

        async function ensureInit() {
            if (ready) return;
            if (typeof firebase === 'undefined' || !firebase.initializeApp) {
                throw new Error('Firebase SDK is niet geladen.');
            }
            if (!firebase.apps.length) firebase.initializeApp(C.firebase);
            auth = firebase.auth();

            // Persistence is a nice-to-have. If IndexedDB is blocked in
            // this context it must not prevent the chat from connecting.
            try {
                await withTimeout(auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL), 5000, 'Auth-opslag');
            } catch (err) {
                console.warn('Egodact Chat: auth-persistentie niet beschikbaar.', err);
            }

            if (!auth.currentUser) {
                await withTimeout(auth.signInAnonymously(), 15000, 'Anoniem aanmelden bij Firebase');
            }

            db = firebase.firestore();
            // Auto long polling lets Firestore fall back to HTTP polling on
            // school/corporate networks that block its streaming channel.
            // Without it those clients stay at "client is offline" even
            // though the page itself has internet access.
            try {
                db.settings({ experimentalAutoDetectLongPolling: true, merge: true });
            } catch (err) {
                console.warn('Egodact Chat: Firestore-instellingen niet toegepast.', err);
            }
            try { db.enableNetwork(); } catch (err) {}
            storage = typeof firebase.storage === 'function' ? firebase.storage() : null;

            ready = true;
        }

        function roomsCollection() {
            return getDb().collection(C.roomsCollection || 'rooms');
        }

        // Keep the conversation list preview in sync when the newest
        // message is edited or deleted. Failures are ignored: the
        // message action itself already succeeded.
        async function refreshRoomPreview(roomId) {
            try {
                const roomRef = roomsCollection().doc(roomId);
                const newest = await roomsCollection().doc(roomId)
                    .collection('messages')
                    .orderBy('createdAt', 'desc')
                    .limit(1)
                    .get();
                if (newest.empty) {
                    await roomRef.set({
                        lastMessage: '',
                        lastMessageSender: '',
                        lastMessageSenderName: ''
                    }, { merge: true });
                    return;
                }
                const data = newest.docs[0].data() || {};
                await roomRef.set({
                    lastMessage: messagePreview(data.text, data.attachment),
                    lastMessageAt: data.createdAt || firebase.firestore.FieldValue.serverTimestamp(),
                    lastMessageSender: data.senderId || '',
                    lastMessageSenderName: data.senderName || ''
                }, { merge: true });
            } catch (err) {
                console.warn('Egodact Chat: voorbeeld van gesprek bijwerken mislukt.', err);
            }
        }

        // --------------------------------------------------------
        // Attachments (Firebase Storage)
        // --------------------------------------------------------
        function storageRef(path) {
            if (!storage || typeof storage.ref !== 'function') {
                throw new Error('Firebase Storage SDK is niet geladen.');
            }
            return storage.ref(path);
        }

        function readFileAsDataUrl(file) {
            return new Promise(function (resolve, reject) {
                let reader;
                try { reader = new FileReader(); }
                catch (err) { reject(err); return; }
                reader.onload = function () { resolve(String(reader.result || '')); };
                reader.onerror = function () { reject(new Error('Bestand lezen mislukt.')); };
                try { reader.readAsDataURL(file); }
                catch (err) { reject(err); }
            });
        }

        async function uploadAttachment(roomId, file, onProgress) {
            validateAttachmentFile(file);
            await ensureInit();
            const name = attachmentFileName(file);
            const inlineMax = (C.attachments && Number(C.attachments.inlineMaxBytes)) > 0
                ? Number(C.attachments.inlineMaxBytes)
                : 500 * 1024;

            // 1. Try Firebase Storage (requires the Blaze plan). On a
            //    billing/permission failure we remember that Storage is
            //    unavailable and fall through to inline storage below.
            if (storageWorks) {
                try {
                    const uploadId = Store.randomId('u_');
                    const path = 'chat/' + roomId + '/' + uploadId + '/' + name;
                    const ref = storageRef(path);
                    const metadata = {
                        contentType: String(file.type || 'application/octet-stream'),
                        customMetadata: {
                            uid: String((auth.currentUser && auth.currentUser.uid) || ''),
                            uploader: String(identity.id || '')
                        }
                    };
                    let task;
                    try {
                        task = ref.put(file, metadata);
                    } catch (err) {
                        throw err;
                    }
                    if (typeof onProgress === 'function') {
                        task.on('state_changed', function (snapshot) {
                            const total = snapshot.totalBytes || file.size || 1;
                            try {
                                onProgress(Math.max(0, Math.min(1, snapshot.bytesTransferred / total)));
                            } catch (err) {}
                        });
                    }
                    await task;
                    const url = await ref.getDownloadURL();
                    return {
                        id: uploadId,
                        name: name,
                        size: file.size,
                        type: attachmentType(file),
                        mime: String(file.type || ''),
                        storage: 'firebase',
                        path: path,
                        url: url
                    };
                } catch (err) {
                    const code = String((err && (err.code || err.name)) || '');
                    const permissionish =
                        code.indexOf('unauthorized') !== -1 ||
                        code.indexOf('permission') !== -1 ||
                        code.indexOf('billing') !== -1 ||
                        code.indexOf('storage/unknown') !== -1 ||
                        code.indexOf('storage/unauthenticated') !== -1;
                    if (permissionish) {
                        storageWorks = false;
                    } else {
                        throw new Error(friendlyStorageError(err));
                    }
                }
            }

            // 2. Inline fallback (Spark plan): keep the bytes inside the
            //    message document as a base64 data URL. Only feasible for
            //    small files because Firestore documents are capped at 1 MB.
            if (file.size > inlineMax) {
                throw new Error('Dit bestand is te groot voor de gratis Firebase-tier (' +
                    attachmentSizeLabel(inlineMax) + '). Upgrade naar Blaze of kies een kleiner bestand.');
            }
            const dataUrl = await readFileAsDataUrl(file);
            if (typeof onProgress === 'function') {
                try { onProgress(1); } catch (err) {}
            }
            return {
                id: Store.randomId('i_'),
                name: name,
                size: file.size,
                type: attachmentType(file),
                mime: String(file.type || ''),
                storage: 'inline',
                data: dataUrl
            };
        }

        async function attachmentUrl(attachment) {
            if (!attachment) return '';
            if (attachment.storage === 'local') return '';
            if (attachment.storage === 'inline') return String(attachment.data || '');
            if (attachment.url) return attachment.url;
            if (!attachment.path) return '';
            await ensureInit();
            try {
                return await storageRef(attachment.path).getDownloadURL();
            } catch (err) {
                return '';
            }
        }

        async function deleteAttachment(attachment) {
            if (!attachment || attachment.storage === 'inline') return;
            if (attachment.storage !== 'firebase' || !attachment.path) return;
            try {
                await ensureInit();
                await storageRef(attachment.path).delete();
            } catch (err) {
                // The message is already gone; leave an orphaned object
                // rather than failing the delete in the UI.
            }
        }

        return {
            init: async function () {
                await ensureInit();
                return { kind: 'firebase', projectId: C.firebase.projectId };
            },

            myUid: function () {
                return String((auth && auth.currentUser && auth.currentUser.uid) || '');
            },

            uploadAttachment: uploadAttachment,
            attachmentUrl: attachmentUrl,
            deleteAttachment: deleteAttachment,

            listRooms: function (cb) {
                let active = true;
                let unsubscribe = null;

                ensureInit().then(function () {
                    if (!active) return;
                    const myKeys = memberKeys(identity).slice(0, 10);
                    if (!myKeys.length) {
                        cb([], {});
                        return;
                    }
                    unsubscribe = roomsCollection()
                        .where('members', 'array-contains-any', myKeys)
                        .onSnapshot(function (snapshot) {
                            if (!active) return;
                            const rooms = [];
                            snapshot.forEach(function (doc) {
                                rooms.push(normalizeRoom(doc.id, doc.data()));
                            });
                            setRoomsCache(sortRooms(rooms));
                            cb(sortRooms(rooms), { fromCache: snapshot.metadata.fromCache });
                        }, function (err) {
                            if (!active) return;
                            lastError = friendlyFirebaseError(err);
                            cb([], { error: lastError });
                        });
                }).catch(function (err) {
                    if (!active) return;
                    lastError = friendlyFirebaseError(err);
                    cb([], { error: lastError });
                });

                return function () {
                    active = false;
                    if (unsubscribe) { try { unsubscribe(); } catch (err) {} }
                };
            },

            watchMessages: function (roomId, cb) {
                let active = true;
                let unsubscribe = null;

                ensureInit().then(function () {
                    if (!active) return;
                    const messages = roomsCollection().doc(roomId).collection('messages');
                    unsubscribe = messages
                        .orderBy('createdAt', 'asc')
                        .limitToLast(C.messagePageSize || 300)
                        .onSnapshot(function (snapshot) {
                            if (!active) return;
                            const list = [];
                            snapshot.forEach(function (doc) {
                                const data = doc.data() || {};
                                const pending = !!(doc.metadata && doc.metadata.hasPendingWrites);
                                list.push({
                                    id: doc.id,
                                    text: data.text || '',
                                    senderId: data.senderId || '',
                                    senderName: data.senderName || 'Onbekend',
                                    senderPhoto: data.senderPhoto || '',
                                    senderUid: data.senderUid || '',
                                    editedAt: tsToMs(data.editedAt) || 0,
                                    reactions: data.reactions || {},
                                    attachment: data.attachment || null,
                                    createdAt: tsToMs(data.createdAt) || (pending ? Date.now() : 0),
                                    pending: pending
                                });
                            });
                            cb(list, { fromCache: snapshot.metadata.fromCache });
                        }, function (err) {
                            if (!active) return;
                            lastError = friendlyFirebaseError(err);
                            cb([], { error: lastError });
                        });
                }).catch(function (err) {
                    if (!active) return;
                    lastError = friendlyFirebaseError(err);
                    cb([], { error: lastError });
                });

                return function () {
                    active = false;
                    if (unsubscribe) { try { unsubscribe(); } catch (err) {} }
                };
            },

            // A server round-trip is the only reliable way to tell a real
            // connection from Firestore's cached/offline state.
            checkConnection: async function () {
                try {
                    await ensureInit();
                } catch (err) {
                    return { ok: false, error: friendlyFirebaseError(err) };
                }
                try {
                    await withTimeout(
                        roomsCollection().limit(1).get({ source: 'server' }),
                        9000,
                        'Netwerkcontrole'
                    );
                    return { ok: true, error: '' };
                } catch (err) {
                    lastError = friendlyFirebaseError(err);
                    try { db.enableNetwork(); } catch (e) {}
                    return { ok: false, error: lastError };
                }
            },

            editMessage: async function (roomId, messageId, text) {
                await ensureInit();
                const ref = roomsCollection().doc(roomId).collection('messages').doc(messageId);
                try {
                    await ref.update({
                        text: text,
                        editedAt: firebase.firestore.FieldValue.serverTimestamp(),
                        // Legacy messages carry no senderUid. Writing it
                        // here claims the message for this client, which
                        // the rules allow exactly once. For messages we
                        // already own the value is unchanged, so the
                        // rules see no extra field.
                        senderUid: String((auth.currentUser && auth.currentUser.uid) || '')
                    });
                } catch (err) {
                    lastError = friendlyMessageError(err);
                    throw new Error(lastError);
                }
                await refreshRoomPreview(roomId);
            },

            deleteMessage: async function (roomId, messageId, attachment) {
                await ensureInit();
                const ref = roomsCollection().doc(roomId).collection('messages').doc(messageId);
                try {
                    await ref.delete();
                } catch (err) {
                    lastError = friendlyMessageError(err);
                    throw new Error(lastError);
                }
                await refreshRoomPreview(roomId);
                if (attachment) await deleteAttachment(attachment);
            },

            // Reactions live in a `reactions` map on the message doc:
            // { emoji: [egodactUserId, ...] }. Using the Egodact id keeps
            // the highlighted state the same on every device.
            setReaction: async function (roomId, messageId, emoji, active) {
                await ensureInit();
                const ref = roomsCollection().doc(roomId).collection('messages').doc(messageId);
                try {
                    const snap = await ref.get();
                    if (!snap.exists) throw new Error('Bericht niet gevonden.');
                    const me = String(identity.id || '');
                    const current = (snap.data() || {}).reactions || {};
                    const reactions = {};
                    Object.keys(current).forEach(function (key) {
                        reactions[key] = Array.isArray(current[key]) ? current[key].slice() : [];
                    });
                    const users = Array.isArray(reactions[emoji]) ? reactions[emoji].slice() : [];
                    const at = users.indexOf(me);
                    if (active && at === -1) users.push(me);
                    if (!active && at !== -1) users.splice(at, 1);
                    if (users.length) reactions[emoji] = users;
                    else delete reactions[emoji];
                    await ref.set({ reactions: reactions }, { merge: true });
                } catch (err) {
                    lastError = friendlyMessageError(err);
                    throw new Error(lastError);
                }
            },

            sendMessage: async function (roomId, text, attachment) {
                await ensureInit();
                const roomRef = roomsCollection().doc(roomId);
                const messageRef = roomRef.collection('messages').doc();
                const serverTime = firebase.firestore.FieldValue.serverTimestamp();

                const data = {
                    text: text,
                    senderId: String(identity.id),
                    // Firebase auth uses anonymous uids, so the Egodact
                    // id cannot prove ownership. senderUid records the
                    // client that wrote the message; the rules use it
                    // to allow editing/deleting only that client.
                    senderUid: String((auth.currentUser && auth.currentUser.uid) || ''),
                    senderName: identity.name,
                    senderPhoto: identity.photo || '',
                    createdAt: serverTime
                };
                if (attachment) data.attachment = attachment;
                await messageRef.set(data);

                try {
                    await roomRef.set({
                        lastMessage: messagePreview(text, attachment),
                        lastMessageAt: serverTime,
                        lastMessageSender: String(identity.id),
                        lastMessageSenderName: identity.name
                    }, { merge: true });
                } catch (err) {
                    // The message itself was delivered; a failed preview
                    // update should not make the UI restore the text and
                    // send a duplicate.
                }
            },

            ensureDm: async function (peer) {
                await ensureInit();
                const myKeys = memberKeys(identity).slice(0, 10);
                const peerKeys = memberKeys(peer);
                if (!myKeys.length) throw new Error('Geen identiteit om een gesprek te starten.');

                // First look for a DM that already exists with this peer.
                // Two clients may each have created their own room for the
                // same conversation (same person, different id spelling),
                // and then neither would see the other's messages. Reusing
                // the first room we find puts both on the same thread.
                let id = '';
                try {
                    const snap = await roomsCollection()
                        .where('members', 'array-contains-any', myKeys)
                        .get();
                    let best = null;
                    snap.forEach(function (doc) {
                        const data = doc.data() || {};
                        if (data.type !== 'dm') return;
                        const members = Array.isArray(data.members) ? data.members.map(String) : [];
                        const samePeer = peerKeys.some(function (key) {
                            return members.indexOf(key) !== -1;
                        });
                        if (!samePeer) return;
                        // Pick the most recently used room, with the doc id as
                        // a deterministic tie-breaker, so two clients that see
                        // several legacy rooms still converge on the same one.
                        const at = tsToMs(data.lastMessageAt) || tsToMs(data.createdAt) || 0;
                        if (!best || at > best.at || (at === best.at && doc.id < best.id)) {
                            best = { id: doc.id, at: at };
                        }
                    });
                    if (best) id = best.id;
                } catch (err) {
                    // A failed lookup must not block starting the chat.
                    console.warn('Egodact Chat: bestaand gesprek zoeken mislukt.', err);
                }

                if (!id) id = dmRoomId(identity, peer);

                const ref = roomsCollection().doc(id);
                const existing = await ref.get();
                const data = existing.exists ? (existing.data() || {}) : {};
                const members = mergeMemberList(
                    existing.exists ? data.members : [],
                    myKeys,
                    peerKeys
                );
                const profiles = mergeProfiles(
                    existing.exists ? data.memberProfiles : {},
                    identity,
                    peer
                );

                if (!existing.exists) {
                    await ref.set({
                        type: 'dm',
                        name: '',
                        members: members,
                        memberProfiles: profiles,
                        lastMessage: '',
                        lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
                        lastMessageSender: '',
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                } else {
                    // Backfill our own keys (and the peer's) so listRooms
                    // finds this room on both sides from now on.
                    await ref.set({
                        members: members,
                        memberProfiles: profiles
                    }, { merge: true });
                }

                return id;
            },

            createGroup: async function (name, peers) {
                await ensureInit();
                let members = memberKeys(identity);
                let profiles = mergeProfiles({}, identity);

                peers.forEach(function (peer) {
                    members = mergeMemberList(members, memberKeys(peer));
                    profiles = mergeProfiles(profiles, peer);
                });

                const ref = await roomsCollection().add({
                    type: 'group',
                    name: name,
                    members: members,
                    memberProfiles: profiles,
                    lastMessage: '',
                    lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastMessageSender: '',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                return ref.id;
            },

            // Heal rooms created by older addon versions: add the e-mail
            // keys of known members so the other side's listRooms query
            // (array-contains-any id + e-mail) finds the same room.
            addMemberKeys: async function (roomId, users) {
                await ensureInit();
                if (!roomId) return;
                const ref = roomsCollection().doc(roomId);
                const existing = await ref.get();
                if (!existing.exists) return;
                const data = existing.data() || {};
                const before = mergeMemberList(data.members).length;
                let members = mergeMemberList(data.members);
                let profiles = mergeProfiles(data.memberProfiles);
                (users || []).forEach(function (user) {
                    members = mergeMemberList(members, memberKeys(user));
                    profiles = mergeProfiles(profiles, user);
                });
                if (members.length === before) return;
                await ref.set({
                    members: members,
                    memberProfiles: profiles
                }, { merge: true });
            }
        };
    }

    // ------------------------------------------------------------
    // Public API
    // ------------------------------------------------------------

    async function doInit(nextIdentity, options) {
        options = options || {};
        identity = nextIdentity;

        if (!identity || !identity.id) {
            // The local demo still works with a stable placeholder id, but
            // real chat needs a real Egodact id.
            let fallbackId = '';
            try { fallbackId = Store.get('local_id', '') || ''; } catch (err) {}
            if (!fallbackId) {
                fallbackId = 'local-' + Math.random().toString(36).slice(2, 10);
                try { Store.set('local_id', fallbackId); } catch (err) {}
            }
            identity = Object.assign({}, identity || {}, {
                id: fallbackId,
                name: (identity && identity.name) || 'Student',
                firstName: (identity && identity.firstName) || 'Student',
                photo: (identity && identity.photo) || ''
            });
            lastError = 'Geen Egodact-identiteit gevonden; lokale modus gebruikt.';
            console.warn('Egodact Chat: geen Egodact-identiteit gevonden.');
        } else {
            lastError = '';
        }

        const shouldTryFirebase = firebaseConfigured() && (!firebaseTried || options.force);

        if (shouldTryFirebase) {
            firebaseTried = true;
            try {
                if (!impl || kind !== 'firebase') {
                    impl = null;
                    impl = createFirebase();
                }
                await withTimeout(impl.init(), 22000, 'Verbinden met Firebase');
                kind = 'firebase';
                lastError = '';
                console.info('Egodact Chat: verbonden met Firebase-project ' +
                    ((C.firebase && C.firebase.projectId) || '?') + '.');
                return { kind: kind, error: '' };
            } catch (err) {
                lastError = friendlyFirebaseError(err);
                console.error('Egodact Chat: Firebase-verbinding mislukt.', err);
                impl = null;
                kind = 'none';
                // Fall through to local mode so the addon still works.
            }
        } else if (firebaseConfigured() && kind === 'firebase') {
            // Already connected: keep the current implementation.
            return { kind: 'firebase', error: '' };
        }

        if (!impl || kind !== 'local') impl = createLocal();
        await impl.init();
        kind = 'local';
        return { kind: kind, error: lastError };
    }

    function init(nextIdentity, options) {
        // Serialize init calls: open() starts the transport while the
        // directory is still loading, and both may hand over a new identity.
        initQueue = initQueue.then(function () {
            return doInit(nextIdentity, options);
        }).catch(function (err) {
            lastError = friendlyFirebaseError(err);
            console.error('Egodact Chat: transport-initialisatie mislukt.', err);
            try {
                if (!impl || kind !== 'local') impl = createLocal();
                kind = 'local';
                return impl.init().then(function () {
                    return { kind: 'local', error: lastError };
                });
            } catch (e) {
                return { kind: kind, error: lastError };
            }
        });
        return initQueue;
    }

    function listRooms(cb) {
        if (!impl) return function () {};
        return impl.listRooms(function (rooms, meta) {
            if (meta && meta.error) lastError = meta.error;
            cb(rooms, meta || {});
        });
    }

    function watchMessages(roomId, cb) {
        if (!impl) return function () {};
        return impl.watchMessages(roomId, cb);
    }

    function checkConnection() {
        if (!impl || typeof impl.checkConnection !== 'function') {
            return Promise.resolve({ ok: kind === 'firebase', error: lastError });
        }
        return impl.checkConnection();
    }

    function keysOf(user) {
        return memberKeys(user);
    }

    function sendMessage(roomId, text, attachment) {
        if (!impl) return Promise.reject(new Error('Chat is niet gestart.'));
        return impl.sendMessage(roomId, text, attachment);
    }

    function uploadAttachment(roomId, file, onProgress) {
        if (!impl || typeof impl.uploadAttachment !== 'function') {
            return Promise.reject(new Error('Bijlagen worden niet ondersteund.'));
        }
        return impl.uploadAttachment(roomId, file, onProgress);
    }

    function attachmentUrl(attachment) {
        // Inline attachments keep their bytes in the document itself, so
        // they never depend on the transport or on Firebase Storage.
        if (attachment && attachment.storage === 'inline') {
            return Promise.resolve(String(attachment.data || ''));
        }
        if (!impl || typeof impl.attachmentUrl !== 'function') return Promise.resolve('');
        return impl.attachmentUrl(attachment);
    }

    function deleteAttachment(attachment) {
        if (!impl || typeof impl.deleteAttachment !== 'function') return Promise.resolve();
        return impl.deleteAttachment(attachment);
    }

    function ensureDm(peer) {
        if (!impl) return Promise.reject(new Error('Chat is niet gestart.'));
        return impl.ensureDm(peer);
    }

    function createGroup(name, peers) {
        if (!impl) return Promise.reject(new Error('Chat is niet gestart.'));
        return impl.createGroup(name, peers);
    }

    function addMemberKeys(roomId, users) {
        if (!impl || typeof impl.addMemberKeys !== 'function') return Promise.resolve();
        return impl.addMemberKeys(roomId, users);
    }

    function myUid() {
        if (!impl || typeof impl.myUid !== 'function') return '';
        return impl.myUid();
    }

    function editMessage(roomId, messageId, text) {
        if (!impl || typeof impl.editMessage !== 'function') {
            return Promise.reject(new Error('Bewerken wordt niet ondersteund.'));
        }
        return impl.editMessage(roomId, messageId, text);
    }

    function deleteMessage(roomId, messageId, attachment) {
        if (!impl || typeof impl.deleteMessage !== 'function') {
            return Promise.reject(new Error('Verwijderen wordt niet ondersteund.'));
        }
        return impl.deleteMessage(roomId, messageId, attachment);
    }

    function setReaction(roomId, messageId, emoji, active) {
        if (!impl || typeof impl.setReaction !== 'function') {
            return Promise.reject(new Error('Reageren wordt niet ondersteund.'));
        }
        return impl.setReaction(roomId, messageId, emoji, active);
    }

    window.EGCTransport = {
        init: init,
        listRooms: listRooms,
        watchMessages: watchMessages,
        sendMessage: sendMessage,
        uploadAttachment: uploadAttachment,
        attachmentUrl: attachmentUrl,
        deleteAttachment: deleteAttachment,
        validateAttachment: validateAttachmentFile,
        attachmentSizeLabel: attachmentSizeLabel,
        attachmentType: attachmentType,
        attachmentMaxBytes: function () { return attachmentConfig().maxBytes; },
        ensureDm: ensureDm,
        createGroup: createGroup,
        addMemberKeys: addMemberKeys,
        myUid: myUid,
        editMessage: editMessage,
        deleteMessage: deleteMessage,
        setReaction: setReaction,
        checkConnection: checkConnection,
        keysOf: keysOf,
        dmRoomId: dmRoomId,
        kind: function () { return kind; },
        projectId: function () { return C.firebase && C.firebase.projectId || ''; },
        sdkLoaded: function () { return typeof firebase !== 'undefined' && !!firebase.initializeApp; },
        lastError: function () { return lastError; },
        getRoom: function (id) { return roomsById.get(id) || null; },
        rooms: function () { return Array.from(roomsById.values()); }
    };
})();
