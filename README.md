# Egodact Addon: Chat

Chat and group chats with your Egodact classmates, opened from the Egodact top bar.

Built as a standalone addon extension for **Egodact Smart** (`Egodact_addon_extension`). It registers itself through `window.EgodactAddonClient` and uses `window.EgodactAddonLib` for the UI, so it follows the host's dark/light theme automatically.

![status](https://img.shields.io/badge/status-v1.0.0-blue)

---

## What it does

- **Header button + Addons menu entry** in Egodact.
- **Direct messages** with people from your Egodact challenges.
- **Group chats** with a name and any number of participants.
- **Real-time messages** through Firebase Firestore.
- **Egodact identity detection** from the Auth0 login already in the page.
- **User picker** built from the Egodact `challenge-portfolio` API.
- **Unread dots**, conversation search, message timestamps and day separators.
- **Local demo mode** that works before Firebase is configured.

---

## Quick start

1. Load `Egodact_addon_chat/` as an unpacked extension in Chrome/Edge/Firefox.
2. Make sure the host extension (`Egodact Smart`) is also loaded.
3. Open `https://app.egodact.com/` and click the chat icon in the top bar.

Without Firebase config the addon starts in **local demo mode**: messages are stored in `localStorage` and shared between tabs of the same browser.

For real chat, continue with the Firebase setup below.

---

## Firebase setup

### 1. Create a project

1. Go to [console.firebase.google.com](https://console.firebase.google.com/).
2. Create a project (Google Analytics is not needed).
3. Add a **Web app** (`</>`), give it a name, and copy the config object.

### 2. Paste the config

Open `config.js` and fill in `firebase`:

```js
firebase: {
    apiKey: 'AIza…',
    authDomain: 'your-project.firebaseapp.com',
    projectId: 'your-project',
    storageBucket: 'your-project.appspot.com',
    messagingSenderId: '1234567890',
    appId: '1:1234567890:web:abcdef'
}
```

### 3. Enable anonymous sign-in

Firebase console → **Authentication** → **Sign-in method** → enable **Anonymous**.

The addon uses anonymous auth only to gate database access. Chat identity comes from Egodact.

### 4. Create Firestore

Firebase console → **Firestore Database** → **Create database**.

Start in production mode; the rules below allow the addon to work.

### 5. Publish the rules

Copy `firestore.rules` into Firebase console → **Firestore Database** → **Rules** → **Publish**.

### 6. Reload

Reload `app.egodact.com`. The badge in the chat header should say **Firebase**.

---

## How it works

### Addon registration

`content.js` registers the addon, a menu entry and a header button:

```js
client.registerButton({
    addonId: 'egodact-chat',
    id: 'egodact-chat-button',
    title: 'Chat met je klas',
    icon: ICON,
    position: 'header'
});
```

The host renders the button and sends `egodact:addon:open` back to the addon, which opens the chat UI.

### Identity

`js/identity.js` scans `localStorage` for the Auth0 cache that Egodact already writes (`*_CACHE_0`). It decodes the `id_token` JWT and reads `name`, `given_name`, `email`, `picture` and `sub`.

Because the Auth0 `sub` is not necessarily the same id the Egodact API uses, the identity is reconciled with the API directory:

1. exact id match
2. profile photo match
3. full name match
4. email local-part / first-name match

The resolved Egodact user id is cached, so DMs are stable across reloads and devices. If nothing can be resolved, a stable local id is generated and the user can set a display name in Settings.

### User directory

`js/directory.js` calls:

```
GET https://api.egodact.com/challenge-portfolio
Authorization: Bearer <access_token>
School: <selectedSchool>
```

and collects every `users[]` entry from the challenge portfolio. That is the set of people you share a challenge with — the people you can chat with.

The request goes through `background.js`, which has `host_permissions` for `api.egodact.com`, so page CORS/CSP cannot block it. A direct `fetch` is used as a fallback.

The directory is cached for 10 minutes.

### Transport

`js/transport.js` exposes one API with two implementations:

| Mode | When | Behaviour |
|------|------|-----------|
| `firebase` | config has `apiKey`, `projectId`, `appId` | Firestore + anonymous auth, real-time across devices |
| `local` | otherwise (or Firebase init failed) | `localStorage` + `BroadcastChannel`, same browser only |

If Firebase fails (missing auth, bad config, permission denied), the addon falls back to local mode and tells you why instead of breaking.

### Firestore data model

```
rooms/{roomId}
    type: 'dm' | 'group'
    name: string
    members: [egodactUserId, ...]
    memberProfiles: { [id]: { name, firstName, photo } }
    lastMessage: string
    lastMessageAt: timestamp
    lastMessageSender: string
    lastMessageSenderName: string
    createdAt: timestamp

rooms/{roomId}/messages/{messageId}
    text: string
    senderId: string
    senderName: string
    senderPhoto: string
    createdAt: timestamp
```

- DM room ids are deterministic: `dm_<hash(sorted user ids)>`.
- Rooms are discovered with `where('members', 'array-contains', myId)`.
- Messages are loaded with `orderBy('createdAt').limitToLast(300)`.

---

## Local demo mode

Useful before creating a Firebase project:

- Open the chat in two tabs of the same browser.
- Both tabs share the **Lokaal testkanaal**.
- Messages appear in the other tab immediately via `BroadcastChannel`.
- DMs and groups can be created too, but only exist locally.

Local data is namespaced under `egodact_chat_*` and can be cleared in **Settings → Lokale chatgegevens wissen**.

---

## Files

| File | Purpose |
|------|---------|
| `manifest.json` | MV3 manifest. |
| `content.js` | Registers the addon/menu/header button. |
| `config.js` | Firebase config and API settings. |
| `background.js` | Service worker that proxies Egodact API calls. |
| `sdk.js` | Egodact addon client SDK (v2). |
| `lib.js` | Egodact addon UI/game library (v1). |
| `js/store.js` | Namespaced localStorage helpers, read markers. |
| `js/identity.js` | Auth0 token decoding and identity reconciliation. |
| `js/directory.js` | Challenge-portfolio user directory + cache. |
| `js/transport.js` | Firestore transport + local demo transport. |
| `js/ui.js` | Chat window, room list, messages, user picker, groups, settings. |
| `vendor/` | Firebase 10.14.1 compat SDK (vendored for MV3). |
| `firestore.rules` | Baseline Firestore rules. |

---

## Security notes

This is a school-project chat, not a hardened messenger:

- Firestore rules require **anonymous auth** but do not enforce room membership, because membership uses Egodact ids while Firebase auth uses anonymous uids.
- Anyone who can load the extension and authenticate can technically read the `rooms` collection.
- Sender names and ids are client-supplied. There is no server-side identity verification.
- Don't use it for sensitive information.

For stronger rules you'd add a small backend that issues Firebase custom tokens tied to Egodact users, and store `authUid` in each room.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Badge says **Lokaal** | `config.js` is missing `apiKey`/`projectId`/`appId`, or Firebase init failed. Open Settings for the exact error. |
| `Anonieme aanmelding staat uit` | Enable Anonymous in Firebase Authentication. |
| `Firestore-regels blokkeren het chatten` | Publish `firestore.rules`. |
| `Geen gebruikers gevonden` | You don't share challenges with anyone yet, or the Egodact session expired. Reload and log in again. |
| `Je Egodact-sessie is verlopen` | Reload `app.egodact.com` and log in again. |
| Chat opens but no rooms | Start a new conversation with **+**; empty accounts have no rooms. |
| Firebase is not real-time | Check that Firestore is enabled (not Realtime Database) and rules are published. |

---

## Development notes

- The addon is a content script on `https://app.egodact.com/*`.
- All user content is rendered with `textContent`; static icons use `innerHTML`.
- Firebase is vendored locally because MV3 forbids remotely hosted code.
- The UI uses the host's `--egd-*` CSS variables, so light/dark mode is automatic.
- The chat intentionally reuses the host modal id `egodact-custom-modal-backdrop` so only one Egodact modal is open at a time.
- All local keys use the `egodact_chat_` prefix.

### Roadmap ideas

- Typing indicators and presence.
- Message deletion / editing.
- Image and file attachments.
- Mentions and notifications.
- Firebase custom auth tied to Egodact accounts.
