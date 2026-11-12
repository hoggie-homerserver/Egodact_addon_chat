// ============================================================
// EGODACT CHAT — BLOB STORE (IndexedDB)
// ============================================================
// Local demo mode keeps attachments in IndexedDB: localStorage is
// far too small for photos and videos. The Firebase transport uses
// Firebase Storage instead and never touches this store.
//
// API:
//   EGCBlobStore.put(id, blob) -> Promise<id>
//   EGCBlobStore.get(id)       -> Promise<Blob|null>
//   EGCBlobStore.remove(id)    -> Promise<void>

(function () {
    'use strict';

    const DB_NAME = 'egodact_chat_blobs';
    const STORE = 'blobs';

    let db = null;
    let opening = null;

    function open() {
        if (db) return Promise.resolve(db);
        if (opening) return opening;

        opening = new Promise(function (resolve, reject) {
            let request;
            try {
                request = indexedDB.open(DB_NAME, 1);
            } catch (err) {
                opening = null;
                reject(err);
                return;
            }

            request.onupgradeneeded = function () {
                const database = request.result;
                if (!database.objectStoreNames.contains(STORE)) {
                    database.createObjectStore(STORE);
                }
            };

            request.onsuccess = function () {
                db = request.result;
                opening = null;
                resolve(db);
            };

            request.onerror = function () {
                opening = null;
                reject(request.error || new Error('IndexedDB openen mislukt.'));
            };
        });

        return opening;
    }

    function put(id, blob) {
        return open().then(function (database) {
            return new Promise(function (resolve, reject) {
                let tx;
                try {
                    tx = database.transaction(STORE, 'readwrite');
                } catch (err) {
                    reject(err);
                    return;
                }
                tx.objectStore(STORE).put(blob, id);
                tx.oncomplete = function () { resolve(id); };
                tx.onerror = function () { reject(tx.error || new Error('IndexedDB-schrijven mislukt.')); };
                tx.onabort = function () { reject(tx.error || new Error('IndexedDB-schrijven afgebroken.')); };
            });
        });
    }

    function get(id) {
        return open().then(function (database) {
            return new Promise(function (resolve, reject) {
                let tx;
                try {
                    tx = database.transaction(STORE, 'readonly');
                } catch (err) {
                    reject(err);
                    return;
                }
                const request = tx.objectStore(STORE).get(id);
                request.onsuccess = function () { resolve(request.result || null); };
                request.onerror = function () { reject(request.error || new Error('IndexedDB-lezen mislukt.')); };
            });
        });
    }

    function remove(id) {
        return open().then(function (database) {
            return new Promise(function (resolve, reject) {
                let tx;
                try {
                    tx = database.transaction(STORE, 'readwrite');
                } catch (err) {
                    reject(err);
                    return;
                }
                tx.objectStore(STORE).delete(id);
                tx.oncomplete = function () { resolve(); };
                tx.onerror = function () { reject(tx.error || new Error('IndexedDB-verwijderen mislukt.')); };
                tx.onabort = function () { reject(tx.error || new Error('IndexedDB-verwijderen afgebroken.')); };
            });
        });
    }

    window.EGCBlobStore = {
        put: put,
        get: get,
        remove: remove
    };
})();
