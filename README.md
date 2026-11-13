# Egodact Addon: Chat

Chat and group chats with your Egodact classmates, opened from the Egodact top bar.

Built as a standalone addon extension for **Egodact Smart** (`Egodact_addon_extension`). It registers itself through `window.EgodactAddonClient` and uses `window.EgodactAddonLib` for the UI, so it follows the host's dark/light theme automatically.

![status](https://img.shields.io/badge/status-v1.4.0-blue)

---

## What it does

- **Header button + Addons menu entry** in Egodact.
- **Direct messages** with people from your Egodact challenges.
- **Group chats** with a name and any number of participants.
- **Real-time messages** through Firebase Firestore.
- **Egodact identity detection** from the Auth0 login already in the page.
- **User picker** built from the Egodact `challenge-portfolio` API.
- **Unread dots**, conversation search, message timestamps and day separators.
- **Full emoji picker** in the composer and on every message: emoji-picker-element with categories, skin tones, search and favourites, covering every Unicode emoji from a bundled dataset (no network needed).
- **Reactions** on any message; they sync through Firestore and stay highlighted per user.
- **Edit and delete your own messages**, including messages sent before 1.1.0 (the first editor claims them); the rules check the writing client, so nobody can change someone else's text.
- **Attachments**: send photos, videos, audio and any other file type (up to 25 MB per file, one per message). Images and videos are previewed inline; other files show as a downloadable card. Drag-and-drop or paste a file into the composer.
- **Close a single conversation** and restore just that one later under Settings.
- **Local demo mode** that works before Firebase is configured.

---

## Quick start

1. Load `Egodact_addon_chat/` as an unpacked extension in Chrome or Edge (MV3, Chromium only).
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

The project config is **baked into the extension** in `config.js`:

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

There is deliberately **no in-app way to change it**. The config lives in the content script's isolated world, so page scripts cannot override it, and end users get no settings field for it. Changing projects means editing the extension and shipping a new build.

A Firebase web config is not a secret: anyone who installs the extension can read it. What protects the project is the Firestore rules, not the config.

### 3. Enable anonymous sign-in

Firebase console -> **Authentication** -> **Sign-in method** -> enable **Anonymous**.

The addon uses anonymous auth only to gate database access. Chat identity comes from Egodact.

### 4. Create Firestore

Firebase console -> **Firestore Database** -> **Create database**.

Start in production mode; the rules below allow the addon to work.

### 5. Publish the rules

Copy `firestore.rules` into Firebase console -> **Firestore Database** -> **Rules** -> **Publish**.

### 5b. Enable Storage and publish storage rules

Firebase console -> **Storage** -> **Get started** (pick a location and production mode). Then copy `storage.rules` into Firebase console -> **Storage** -> **Rules** -> **Publish**.

Attachments are stored under `chat/{roomId}/{uploadId}/{fileName}` and readable by any signed-in client; only the uploader (whose uid is in the object metadata) can delete them.

### 5c. Spark (free) plan note

Firebase Storage requires the Blaze plan. On the free Spark plan the addon automatically falls back to **inline storage**: small files (up to 500 KB, `config.attachments.inlineMaxBytes`) are kept inside the Firestore message as a base64 data URL. Larger files need Blaze. The fallback is transparent and needs no configuration.

### 5d. (Optioneel) Cloudinary voor grotere bestanden / video's

Firebase Storage vereist het Blaze-plan. Op het gratis Spark-plan werkt de addon al met inline opslag (tot 500 KB). Wil je grotere foto's, video's en elk bestandstype zonder Blaze, gebruik dan de gratis tier van Cloudinary:

1. Maak een gratis account op [cloudinary.com](https://cloudinary.com/) (geen creditcard).
2. Ga naar **Settings -> Upload -> Upload presets -> Add upload preset**.
3. Zet **Signing Mode** op **Unsigned** en sla op. Noteer de preset-naam.
4. Kopieer je **Cloud name** (Dashboard) en de preset-naam in `config.js`:

   ```js
   cloudinary: {
       cloudName: 'jouw-cloud',
       uploadPreset: 'jouw-preset'
   }
   ```

5. Herlaad de extensie. Attachments gaan dan naar Cloudinary (image/video/raw) en werken voor elk bestandstype, zonder Blaze.

### 5e. Media en de Content-Security-Policy van Egodact

`app.egodact.com` stuurt een strenge `Content-Security-Policy` mee waarin `img-src` en `media-src` alleen de eigen site toestaan. Zonder aanpassing weigert de browser elke foto of video van Cloudinary (en `blob:`-URL's), waardoor een video wel als speler verschijnt maar op 0:00 blijft staan.

De addon lost dat op met een declarativeNetRequest-regel in `rules/csp_media.json`: voor het document van `app.egodact.com` wordt dezelfde policy teruggestuurd, maar met `blob:`, `https://res.cloudinary.com`, Firebase Storage en Tenor/Giphy toegevoegd aan `img-src`/`media-src`, en Tenor aan `frame-src`. `script-src` blijft ongewijzigd.

- De regel staat aan zolang de extensie aan staat. Wil je hem uitzetten, zet `enabled` op `false` in de `declarative_net_request`-sectie van `manifest.json` en herlaad de extensie.
- Na het toevoegen van de regel vraagt Chrome bij herladen om de nieuwe machtiging (`declarativeNetRequest`) te accepteren.
- Video's worden waar mogelijk als origineel bestand gestreamd (MP4/WebM). Video's in andere containers (.mov, .avi, .mkv ...) worden door Cloudinary naar H.264 MP4 omgezet. Lukt afspelen toch niet, dan toont de bijlage een link om het bestand in een nieuw tabblad te openen.

### 6. Reload

Reload `app.egodact.com`. The badge in the chat header should say **Firebase**.

---

## Testing without Egodact

`test-page.html` mocks the host: it answers the addon registration events, renders the header button, injects a fake Auth0 token (`Anna Test`) and serves a static user directory from `test-directory.json`.

1. Start a static server in this folder, for example:
   `python -m http.server 8777 --bind 127.0.0.1`
2. Open `http://127.0.0.1:8777/test-page.html` twice.
3. Click the chat icon in both tabs. With no Firebase config you get **Lokaal** mode, and both tabs share the same rooms and messages.

This only tests the UI, identity parsing and the local transport. Real cross-device chat and the real Egodact directory need a Firebase project and a logged-in `app.egodact.com` session.

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
    senderUid: string        # Firebase uid of the writing client
    reactions: { [emoji]: [egodactUserId, ...] }
    editedAt: timestamp
    createdAt: timestamp
    attachment: {                    # optional, one per message
        name: string                 # file name
        size: number                 # bytes
        type: 'image'|'video'|'audio'|'file'
        storage: 'firebase'|'local'
        mime: string
        id: string                   # local: IndexedDB key
        path: string                 # firebase: Storage path
        url: string                  # firebase: download URL
    }
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
- Attachments in local mode are kept in the browser's IndexedDB (`EGCBlobStore`), because localStorage is far too small for photos and videos. They survive a reload of the same browser profile but are not shared across devices.

Local data is namespaced under `egodact_chat_*` and can be cleared in **Settings -> Lokale chatgegevens wissen**.

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
| `js/blobstore.js` | IndexedDB blob store for local-mode attachments. |
| `js/emoji-data.js` | Generated full Unicode emoji dataset (v18.0) used by the picker. |
| `vendor/emoji-picker.js` | Vendored emoji-picker-element 1.29.1 web component (Apache-2.0). |
| `vendor/emoji-picker-data.json` | Emoji dataset for the web component (MIT, emoji-picker-element-data). |
| `tools/fetch-emoji-picker.py` | Rebuilds `vendor/emoji-picker.js` + `vendor/emoji-picker-data.json`. |
| `js/ui.js` | Chat window, room list, messages, emoji picker, user picker, groups, settings. |
| `tools/build-emoji-data.py` | Regenerates `js/emoji-data.js` from `emoji-test.txt`. |
| `vendor/` | Firebase 10.14.1 compat SDK (vendored for MV3). |
| `firestore.rules` | Baseline Firestore rules (attachment-aware). |
| `storage.rules` | Firebase Storage rules for attachments. |
| `rules/csp_media.json` | declarativeNetRequest rule that lets the host page load Cloudinary/Tenor media (see 5e). |
| `test-page.html` | Mock Egodact host for local testing (see below). |
| `test-directory.json` | Fake `challenge-portfolio` response used by the test page. |

---

## Security notes

This is a school-project chat, not a hardened messenger:

- Firestore rules require **anonymous auth** and validate write shape/size, but do not enforce room membership, because membership uses Egodact ids while Firebase auth uses anonymous uids.
- Anyone who can load the extension can authenticate and read the `rooms` collection.
- The Firebase web config is public by design (it is part of the extension bundle). Keep the rules strict instead of trying to hide the config.
- Sender names and ids are client-supplied. There is no server-side identity verification.
- Messages without `senderUid` (sent before 1.1.0) can be deleted by any signed-in client until one client claims them by editing.
- Attachments are limited to 25 MB per file and one per message. Firestore validates the metadata shape; Storage rules check the size and the uploader uid in object metadata. Attachment metadata is immutable once a message is sent.
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
| Badge says **Offline** | The client has no server connection: messages are queued locally and sent when the link returns. The addon probes the server every 25 seconds and falls back to HTTP long polling, which usually fixes school or proxy networks that block Firestore's streaming channel. |
| Firebase is not real-time | Check that Firestore is enabled (not Realtime Database) and rules are published. |
| Two conversations with the same person | Older builds could create one DM per client. Newer builds reuse the first room; the chat automatically follows the peer into the thread where they reply. |
| Cannot edit or delete a message | Only the client that wrote it can. Messages from before 1.1.0 have no `senderUid`; the first client that edits one claims it, after which it is locked to that client. Publish the 1.2.0 `firestore.rules`; without them edits and reactions are rejected. |
| Reactions do nothing | The rules are still the old version. Publish `firestore.rules` under Firestore Database -> Rules. |
| Upload fails with permission error | Enable Storage and publish `storage.rules`. Until then only local mode can store attachments. |
| Attachment shows 'Bijlage niet beschikbaar' | The Storage object was deleted, or the local IndexedDB was cleared. The message still shows its text. |
| File too large | The default cap is 25 MB per file (`config.attachments.maxBytes`). |
| Attachment shows 'Bijlage niet beschikbaar' on Spark | Files over 500 KB cannot be stored inline; upgrade to Blaze or pick a smaller file. |
| Photo or video shows a broken image, or the player stays at 0:00 | The page's Content-Security-Policy is blocking the file. Reload the extension so `rules/csp_media.json` is active, and accept the `declarativeNetRequest` permission Chrome asks for. |
| A `.exe` or `.bat` file is refused | Cloudinary blocks executable uploads at account level. Wrap it in a `.zip`; every other file type works. |

---

## Development notes

- The addon is a content script on `https://app.egodact.com/*`.
- All user content is rendered with `textContent`; static icons use `innerHTML`.
- Firebase is vendored locally because MV3 forbids remotely hosted code.
- Firestore runs with `experimentalAutoDetectLongPolling`; the UI shows an **Offline** badge when a server probe fails instead of silently queueing messages.
- Each message stores `senderUid` (the Firebase anonymous uid of the writer). Editing and deleting are limited to that uid in `firestore.rules`. Pre-1.1.0 messages have no `senderUid`; the first editor claims them by writing their uid. Reactions are a `reactions` map keyed by emoji with Egodact user ids.
- Emoji come from `js/emoji-data.js`, generated from Unicode `emoji-test.txt` v18.0 (3,963 fully-qualified emoji). The picker parses the data lazily on first open, renders groups in fixed-height chunks as they scroll into view, and keeps the last 32 picks in localStorage.
- The picker is [emoji-picker-element](https://github.com/nolanlawson/emoji-picker-element) 1.29.1, vendored in `vendor/emoji-picker.js` because MV3 forbids remotely hosted code and the page CSP blocks `cdn.jsdelivr.net`. Its data is bundled as `vendor/emoji-picker-data.json` (`dataSource` set by `js/ui.js`) and cached in IndexedDB, so the picker needs no network. `js/emoji-data.js` stays as the built-in fallback when the custom element is unavailable.
- Closed conversations are hidden per account in `localStorage`; every hidden room can be restored individually from Settings.
- The UI uses the host's `--egd-*` CSS variables, so light/dark mode is automatic.
- The chat intentionally reuses the host modal id `egodact-custom-modal-backdrop` so only one Egodact modal is open at a time.
- All local keys use the `egodact_chat_` prefix.
- Attachments use Firebase Storage in real mode and IndexedDB (`egodact_chat_blobs`) in local mode. `Transport.uploadAttachment`/`attachmentUrl`/`deleteAttachment` hide the difference; the UI never touches Storage or IndexedDB directly.
- The composer supports drag-and-drop and paste of files; the hidden file input is the fallback.
- Media is delivered straight from Cloudinary. `cloudinaryDeliveryUrl()` in `js/transport.js` keeps the original MP4/WebM stream and only transcodes exotic containers to H.264 MP4. `rules/csp_media.json` relaxes the host page's CSP so those URLs are allowed in the DOM; `js/ui.js` additionally converts blocked images to data URLs and offers an 'open in new tab' link when playback is impossible.

### Updating the emoji data

Emoji are regenerated from the official Unicode data, not edited by hand:

```
curl -o emoji-test.txt https://unicode.org/Public/emoji/latest/emoji-test.txt
python tools/build-emoji-data.py emoji-test.txt
```

The script writes `js/emoji-data.js`; reload the extension afterwards.

### Updating the emoji picker

`vendor/emoji-picker.js` is built from the upstream ES modules; do not edit it by hand:

```
python tools/fetch-emoji-picker.py
```

The script downloads emoji-picker-element `1.29.1` from unpkg, wraps the two ES modules in IIFEs (a content script cannot use `import`), and fetches the matching `emoji-picker-element-data` JSON. Bump `PICKER_VERSION` in the script to upgrade. Licences: the component is Apache-2.0, the data is MIT.

### Roadmap ideas

- Typing indicators and presence.
- Image and file attachments. **(shipped in 1.3.0)**
- Mentions and notifications.
- Firebase custom auth tied to Egodact accounts.
