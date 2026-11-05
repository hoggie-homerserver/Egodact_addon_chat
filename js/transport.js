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
//   { id, text, senderId, senderName, senderPhoto, createdAt (ms),
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

    function dmRoomId(a, b) {
        const key = [String(a || ''), String(b || '')].sort().join('|');
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

        return {
            init: async function () {
                seed();
                setupChannel();
                return { kind: 'local' };
            },

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

            sendMessage: async function (roomId, text) {
                const message = {
                    id: Store.randomId('m_'),
                    text: text,
                    senderId: identity.id,
                    senderName: identity.name,
                    senderPhoto: identity.photo || '',
                    createdAt: Date.now()
                };
                writeMessage(roomId, message);

                try {
                    const rooms = Store.get(LOCAL_ROOM_KEY, {});
                    const room = rooms[roomId];
                    if (room) {
                        room.lastMessage = text.slice(0, 160);
                        room.lastMessageAt = message.createdAt;
                        room.lastMessageSender = identity.id;
                        room.lastMessageSenderName = identity.name;
                        room.memberProfiles = room.memberProfiles || {};
                        room.memberProfiles[identity.id] = profileOf(identity);
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
                const id = dmRoomId(identity.id, peer.id);
                const rooms = Store.get(LOCAL_ROOM_KEY, {});
                if (!rooms[id]) {
                    rooms[id] = {
                        id: id,
                        type: 'dm',
                        name: '',
                        members: [identity.id, String(peer.id)],
                        memberProfiles: {},
                        lastMessage: '',
                        lastMessageAt: Date.now(),
                        lastMessageSender: '',
                        createdAt: Date.now()
                    };
                    rooms[id].memberProfiles[identity.id] = profileOf(identity);
                    rooms[id].memberProfiles[String(peer.id)] = profileOf(peer);
                    Store.set(LOCAL_ROOM_KEY, rooms);
                }
                notifyRooms();
                broadcast({ type: 'rooms' });
                return id;
            },

            createGroup: async function (name, peers) {
                const members = [];
                const profiles = {};
                members.push(identity.id);
                profiles[identity.id] = profileOf(identity);
                peers.forEach(function (peer) {
                    if (members.indexOf(String(peer.id)) === -1) members.push(String(peer.id));
                    profiles[String(peer.id)] = profileOf(peer);
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
            }
        };
    }

    // ------------------------------------------------------------
    // Firebase implementation
    // ------------------------------------------------------------

    function createFirebase() {
        let db = null;
        let auth = null;
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
            // No settings() call: calling it after firebase.firestore() always
            // logs "You are overriding the original host" in the compat SDK.
            // Offline cache is dropped too, to keep the console clean; online
            // sync (the core feature) is unaffected.

            ready = true;
        }

        function roomsCollection() {
            return getDb().collection(C.roomsCollection || 'rooms');
        }

        return {
            init: async function () {
                await ensureInit();
                return { kind: 'firebase', projectId: C.firebase.projectId };
            },

            listRooms: function (cb) {
                let active = true;
                let unsubscribe = null;

                ensureInit().then(function () {
                    if (!active) return;
                    unsubscribe = roomsCollection()
                        .where('members', 'array-contains', String(identity.id))
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

            sendMessage: async function (roomId, text) {
                await ensureInit();
                const roomRef = roomsCollection().doc(roomId);
                const messageRef = roomRef.collection('messages').doc();
                const serverTime = firebase.firestore.FieldValue.serverTimestamp();

                await messageRef.set({
                    text: text,
                    senderId: String(identity.id),
                    senderName: identity.name,
                    senderPhoto: identity.photo || '',
                    createdAt: serverTime
                });

                try {
                    await roomRef.set({
                        lastMessage: text.slice(0, 160),
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
                const id = dmRoomId(identity.id, peer.id);
                const ref = roomsCollection().doc(id);
                const existing = await ref.get();
                if (existing.exists) return id;

                const profiles = {};
                profiles[String(identity.id)] = profileOf(identity);
                profiles[String(peer.id)] = profileOf(peer);

                await ref.set({
                    type: 'dm',
                    name: '',
                    members: [String(identity.id), String(peer.id)],
                    memberProfiles: profiles,
                    lastMessage: '',
                    lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastMessageSender: '',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });

                return id;
            },

            createGroup: async function (name, peers) {
                await ensureInit();
                const members = [String(identity.id)];
                const profiles = {};
                profiles[String(identity.id)] = profileOf(identity);

                peers.forEach(function (peer) {
                    const id = String(peer.id);
                    if (members.indexOf(id) === -1) members.push(id);
                    profiles[id] = profileOf(peer);
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

    function sendMessage(roomId, text) {
        if (!impl) return Promise.reject(new Error('Chat is niet gestart.'));
        return impl.sendMessage(roomId, text);
    }

    function ensureDm(peer) {
        if (!impl) return Promise.reject(new Error('Chat is niet gestart.'));
        return impl.ensureDm(peer);
    }

    function createGroup(name, peers) {
        if (!impl) return Promise.reject(new Error('Chat is niet gestart.'));
        return impl.createGroup(name, peers);
    }

    window.EGCTransport = {
        init: init,
        listRooms: listRooms,
        watchMessages: watchMessages,
        sendMessage: sendMessage,
        ensureDm: ensureDm,
        createGroup: createGroup,
        dmRoomId: dmRoomId,
        kind: function () { return kind; },
        projectId: function () { return C.firebase && C.firebase.projectId || ''; },
        sdkLoaded: function () { return typeof firebase !== 'undefined' && !!firebase.initializeApp; },
        lastError: function () { return lastError; },
        getRoom: function (id) { return roomsById.get(id) || null; },
        rooms: function () { return Array.from(roomsById.values()); }
    };
})();
