// ============================================================
// EGODACT CHAT — CONFIG
// ============================================================
// Fill in your Firebase project config below to enable real
// cross-device chat. Until it is filled in, the addon runs in
// local demo mode (tabs on the same browser can chat with
// each other, nothing leaves the device).
//
// Firebase console -> Project settings -> Your apps -> Web app
// Also enable: Authentication -> Sign-in method -> Anonymous,
// and create a Firestore database.
//
// See README.md for the Firestore rules.

(function () {
    'use strict';

    window.EgodactChatConfig = {
        // Paste your Firebase web config here.
        firebase: {
            apiKey: '',
            authDomain: '',
            projectId: '',
            storageBucket: '',
            messagingSenderId: '',
            appId: ''
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
        roomsCollection: 'rooms'
    };
})();
