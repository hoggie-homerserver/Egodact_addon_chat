// ============================================================
// EGODACT CHAT — CONFIG
// ============================================================
// The Firebase project below is baked into the extension. There is
// no in-app setting to change it: the config lives in the content
// script's isolated world, so page scripts cannot override it and
// users cannot point the chat at another project.
//
// Note that a Firebase web config is not a secret. Anyone who
// installs the extension can read it. What protects the project is
// the Firestore rules in firestore.rules, so keep those strict.
//
// Firebase console -> Project settings -> Your apps -> Web app
// Also enable: Authentication -> Sign-in method -> Anonymous,
// and create a Firestore database.

(function () {
    'use strict';

    window.EgodactChatConfig = {
        firebase: {
            apiKey: 'AIzaSyBF-ejVI_I3kmjXxjZlMGwyd3SZupQoFqY',
            authDomain: 'egodact-extension.firebaseapp.com',
            projectId: 'egodact-extension',
            storageBucket: 'egodact-extension.firebasestorage.app',
            messagingSenderId: '19331909527',
            appId: '1:19331909527:web:c86f39f6c8a0e0a5b026d2'
        },

        // Egodact API and storage keys used by the main extension.
        apiBase: 'https://api.egodact.com',
        challengePath: '/challenge-portfolio',
        accessTokenKey: 'pYfkT6ZWcUB98Sla76HppFpk4aYdTAp0_CACHE_0',
        schoolKey: 'selectedSchool',

        // How long the Egodact user directory is cached (ms).
        directoryCacheMs: 10 * 60 * 1000,

        // Maximum number of messages loaded per conversation.
        messagePageSize: 300,

        // Firestore collection names.
        roomsCollection: 'rooms',

        // Cloudinary (free tier) for attachment storage. When these are
        // set, attachments are uploaded to Cloudinary instead of Firebase
        // Storage, so the addon works on the free Spark plan. Create a
        // free account at cloudinary.com, then Settings -> Upload ->
        // Upload presets -> Add unsigned preset, and paste the values here.
        cloudinary: {
            cloudName: 'fixnlpxx',
            uploadPreset: 'Egodact_extension'
        },

        // Attachments: one file per message, up to this many bytes.
        attachments: {
            maxBytes: 25 * 1024 * 1024,
            maxPerMessage: 1,
            // Spark (free) tier has no Storage; small files are kept
            // inline in the Firestore document instead.
            inlineMaxBytes: 500 * 1024
        }
    };
})();
