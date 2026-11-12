// ============================================================
// EGODACT CHAT — ADDON ENTRY POINT
// ============================================================
// Registers the addon with the Egodact host extension. The host
// adds a chat button to the top bar and a "Chat" entry in the
// addons menu. Both open the chat window from ui.js.

(function () {
    'use strict';

    const client = window.EgodactAddonClient;
    const L = window.EgodactAddonLib;
    const chat = window.EGCChatUI;

    if (!client || !L || !chat) {
        console.warn('Egodact Chat: SDK, lib of UI niet geladen.');
        return;
    }

    const ADDON_ID = 'egodact-chat';

    const ICON = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:1;display:block;pointer-events:none;"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.5 8.5 0 0 1-3.8-.9L3 21l2-4.9A8.4 8.4 0 0 1 12 3.1a8.4 8.4 0 0 1 9 8.4z"></path><circle cx="8.5" cy="11.5" r="1"></circle><circle cx="12" cy="11.5" r="1"></circle><circle cx="15.5" cy="11.5" r="1"></circle></svg>';

    client.registerAddon({
        id: ADDON_ID,
        name: 'Egodact Chat',
        version: '1.0.7',
        description: 'Chat en groepschats met je Egodact-klasgenoten, direct vanuit de topbar.',
        author: 'MaxiTaxi'
    });

    client.registerMenu({
        addonId: ADDON_ID,
        id: 'egodact-chat-menu',
        title: 'Chat',
        icon: ICON
    });

    client.registerButton({
        addonId: ADDON_ID,
        id: 'egodact-chat-button',
        title: 'Chat met je klas',
        icon: ICON,
        position: 'header'
    });

    function openChat() {
        try {
            chat.open();
        } catch (err) {
            console.error('Egodact Chat: openen mislukt.', err);
        }
    }

    client.onOpen('egodact-chat-menu', openChat);
    client.onOpen('egodact-chat-button', openChat);

    // Handy while developing in the console.
    window.EgodactChat = {
        open: openChat,
        close: function () { chat.close(); }
    };
})();
