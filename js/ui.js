// ============================================================
// EGODACT CHAT — UI
// ============================================================
// Builds the chat window with the Egodact theme variables so it
// follows dark/light mode automatically. All user content is set
// with textContent; only static SVG/icons use innerHTML.

(function () {
    'use strict';

    const L = window.EgodactAddonLib;
    const Store = window.EGCStore;
    const Transport = window.EGCTransport;
    const Directory = window.EGCDirectory;
    const Identity = window.EGCIdentity;
    if (!L || !Store || !Transport || !Directory || !Identity) return;

    const el = L.el;
    const ui = L.ui;

    const ICON_CHAT = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;pointer-events:none;"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.5 8.5 0 0 1-3.8-.9L3 21l2-4.9A8.4 8.4 0 0 1 12 3.1a8.4 8.4 0 0 1 9 8.4z"></path></svg>';
    const ICON_CLOSE = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;pointer-events:none;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
    const ICON_PLUS = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;pointer-events:none;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>';
    const ICON_GEAR = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;pointer-events:none;"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 8a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"></path></svg>';
    const ICON_SEND = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;pointer-events:none;"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>';
    const ICON_BACK = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;pointer-events:none;"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>';
    const ICON_REFRESH = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;pointer-events:none;"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.5 9a9 9 0 0 1 14.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0 0 20.5 15"></path></svg>';
    const ICON_PAPERCLIP = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;pointer-events:none;"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>';
    const ICON_FILE = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;pointer-events:none;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>';
    const ICON_DOWNLOAD = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;pointer-events:none;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>';

    const CSS = `
.egdc-backdrop{position:fixed;inset:0;background:var(--egd-backdrop,rgba(0,0,0,.65));z-index:9999999;display:flex;align-items:center;justify-content:center;padding:12px;box-sizing:border-box;font-family:Arial,sans-serif;}
.egdc-modal{background:var(--egd-modal,#424242);color:var(--egd-tekst,#fff);width:min(940px,100%);height:min(660px,100%);border-radius:10px;box-shadow:var(--egd-schaduw,0 8px 30px rgba(0,0,0,.4));display:flex;flex-direction:column;overflow:hidden;border:1px solid var(--egd-rand,#555);box-sizing:border-box;}
.egdc-head{display:flex;align-items:center;gap:10px;padding:11px 16px;border-bottom:1px solid var(--egd-rand,#555);flex:0 0 auto;min-height:50px;box-sizing:border-box;}
.egdc-head-icon{color:var(--egd-accent,#90caf9);display:inline-flex;}
.egdc-head h2{font-size:17px;font-weight:600;margin:0;}
.egdc-badge{font-size:11px;line-height:1;padding:4px 8px;border-radius:999px;border:1px solid var(--egd-rand,#555);color:var(--egd-tekst-zacht,#b0b0b0);white-space:nowrap;}
.egdc-badge.on{color:var(--egd-accent,#90caf9);border-color:var(--egd-accent,#90caf9);}
.egdc-badge.off{color:var(--egd-gevaar,#ef5350);border-color:var(--egd-gevaar,#ef5350);}
.egdc-iconbtn{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;padding:0;border:1px solid transparent;border-radius:6px;background:transparent;color:var(--egd-tekst,#fff);cursor:pointer;flex:0 0 auto;box-sizing:border-box;}
.egdc-iconbtn:hover{background:var(--egd-hover,rgba(255,255,255,.08));border-color:var(--egd-rand,#555);}
.egdc-close{margin-left:auto;display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border:1px solid var(--egd-rand,#555);border-radius:6px;background:transparent;color:var(--egd-tekst,#fff);cursor:pointer;flex:0 0 auto;}
.egdc-close:hover{background:var(--egd-hover,rgba(255,255,255,.08));}
.egdc-body{flex:1;min-height:0;display:flex;}
.egdc-side{width:286px;flex:0 0 286px;border-right:1px solid var(--egd-rand,#555);display:flex;flex-direction:column;min-height:0;background:var(--egd-paneel,#333);}
.egdc-side-head{padding:10px;display:flex;gap:9px;align-items:center;border-bottom:1px solid var(--egd-rand,#555);}
.egdc-me-avatar{flex:0 0 auto;display:flex;}
.egdc-me{min-width:0;flex:1;}
.egdc-me-name{font-size:13px;font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.egdc-me-sub{font-size:11px;color:var(--egd-tekst-zacht,#b0b0b0);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;}
.egdc-search{padding:8px 10px;}
.egdc-search input{width:100%;padding:8px 10px;border-radius:6px;border:1px solid var(--egd-rand,#555);background:var(--egd-veld,#2e2e2e);color:var(--egd-tekst,#fff);font-size:13px;outline:none;box-sizing:border-box;font-family:inherit;}
.egdc-search input:focus{border-color:var(--egd-accent,#90caf9);}
.egdc-rooms{flex:1;overflow-y:auto;padding:2px 8px 10px;min-height:0;}
.egdc-room{display:flex;gap:10px;align-items:center;padding:9px;border-radius:8px;cursor:pointer;border:1px solid transparent;box-sizing:border-box;outline:none;}
.egdc-room:hover,.egdc-room:focus-visible{background:var(--egd-hover,rgba(255,255,255,.06));}
.egdc-room.active{background:var(--egd-hover,rgba(255,255,255,.08));border-color:var(--egd-accent,#90caf9);}
.egdc-room-body{min-width:0;flex:1;}
.egdc-room-top{display:flex;justify-content:space-between;gap:8px;align-items:baseline;}
.egdc-room-name{font-size:13px;font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.egdc-room-time{font-size:10px;color:var(--egd-tekst-zacht,#b0b0b0);flex:0 0 auto;}
.egdc-room-last{font-size:12px;color:var(--egd-tekst-zacht,#b0b0b0);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:3px;}
.egdc-unread{width:8px;height:8px;border-radius:50%;background:var(--egd-accent,#90caf9);flex:0 0 auto;}
.egdc-room-close{width:24px;height:24px;flex:0 0 auto;padding:0;opacity:.55;background:transparent;border-color:transparent;}
.egdc-room-close:hover{opacity:1;background:var(--egd-hover,rgba(255,255,255,.08));border-color:var(--egd-rand,#555);}
.egdc-side-foot{padding:7px 10px;border-top:1px solid var(--egd-rand,#555);display:flex;align-items:center;gap:8px;font-size:11px;color:var(--egd-tekst-zacht,#b0b0b0);min-height:42px;box-sizing:border-box;}
.egdc-status{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.egdc-main{flex:1;min-width:0;display:flex;flex-direction:column;min-height:0;background:var(--egd-veld,#2e2e2e);}
.egdc-main-head{display:flex;align-items:center;gap:10px;padding:9px 14px;border-bottom:1px solid var(--egd-rand,#555);min-height:53px;box-sizing:border-box;background:var(--egd-modal,#424242);flex:0 0 auto;}
.egdc-main-title{font-size:14px;font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.egdc-main-sub{font-size:11px;color:var(--egd-tekst-zacht,#b0b0b0);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;}
.egdc-main-headtext{min-width:0;flex:1;}
.egdc-main-body{flex:1;min-height:0;display:flex;flex-direction:column;}
.egdc-messages{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:9px;min-height:0;}
.egdc-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:var(--egd-tekst-zacht,#b0b0b0);padding:24px;text-align:center;}
.egdc-empty-icon{color:var(--egd-accent,#90caf9);opacity:.7;}
.egdc-empty-title{font-size:15px;font-weight:bold;color:var(--egd-tekst,#fff);}
.egdc-empty-text{font-size:12px;max-width:340px;line-height:1.5;}
.egdc-day{align-self:center;font-size:10px;color:var(--egd-tekst-zacht,#b0b0b0);background:var(--egd-paneel,#333);padding:3px 9px;border-radius:999px;border:1px solid var(--egd-rand,#555);}
.egdc-msg{display:flex;gap:8px;max-width:82%;align-self:flex-start;align-items:flex-end;}
.egdc-msg.mine{align-self:flex-end;flex-direction:row-reverse;}
.egdc-msg-content{min-width:0;display:flex;flex-direction:column;align-items:flex-start;}
.egdc-msg.mine .egdc-msg-content{align-items:flex-end;}
.egdc-msg-sender{font-size:10px;color:var(--egd-tekst-zacht,#b0b0b0);margin:0 0 3px 4px;}
.egdc-bubble{background:var(--egd-paneel,#333);padding:8px 11px;border-radius:12px;border-top-left-radius:3px;font-size:13px;line-height:1.42;white-space:pre-wrap;word-break:break-word;box-shadow:0 1px 2px rgba(0,0,0,.18);}
.egdc-msg.mine .egdc-bubble{background:var(--egd-accent,#90caf9);color:var(--egd-accent-tekst,#0d47a1);border-top-left-radius:12px;border-top-right-radius:3px;}
.egdc-msg-meta{font-size:10px;color:var(--egd-tekst-zacht,#b0b0b0);margin:3px 4px 0;}
.egdc-composer{position:relative;display:flex;gap:8px;padding:10px 14px;border-top:1px solid var(--egd-rand,#555);align-items:flex-end;flex:0 0 auto;background:var(--egd-modal,#424242);}
.egdc-composer textarea{flex:1;resize:none;max-height:120px;min-height:38px;padding:9px 11px;border-radius:8px;border:1px solid var(--egd-rand,#555);background:var(--egd-veld,#2e2e2e);color:var(--egd-tekst,#fff);font-size:13px;font-family:inherit;outline:none;box-sizing:border-box;line-height:1.4;}
.egdc-composer textarea:focus{border-color:var(--egd-accent,#90caf9);}
.egdc-send{width:40px;height:38px;border:none;border-radius:8px;background:var(--egd-accent,#90caf9);color:var(--egd-accent-tekst,#0d47a1);display:inline-flex;align-items:center;justify-content:center;cursor:pointer;flex:0 0 auto;}
.egdc-send:disabled{opacity:.45;cursor:default;}
.egdc-emoji-btn{width:38px;height:38px;padding:0;border:1px solid var(--egd-rand,#555);border-radius:8px;background:var(--egd-paneel,#333);color:var(--egd-tekst,#fff);font-size:18px;line-height:1;cursor:pointer;flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;}
.egdc-emoji-btn:hover{background:var(--egd-hover,rgba(255,255,255,.08));}
.egdc-emoji-pop{position:fixed;z-index:40;display:flex;flex-direction:column;width:336px;max-width:calc(100vw - 16px);max-height:360px;border-radius:10px;border:1px solid var(--egd-rand,#555);background:var(--egd-modal,#424242);box-shadow:0 12px 32px rgba(0,0,0,.5);overflow:hidden;}
.egdc-emoji-search{width:100%;padding:9px 10px;border:none;border-bottom:1px solid var(--egd-rand,#555);background:var(--egd-veld,#2e2e2e);color:var(--egd-tekst,#fff);font-size:13px;font-family:inherit;outline:none;box-sizing:border-box;}
.egdc-emoji-search:focus{border-bottom-color:var(--egd-accent,#90caf9);}
.egdc-emoji-scroll{flex:1;overflow-y:auto;padding:4px 6px 10px;min-height:0;}
.egdc-emoji-group{position:sticky;top:0;z-index:1;padding:8px 4px 4px;font-size:10px;letter-spacing:.04em;text-transform:uppercase;color:var(--egd-tekst-zacht,#b0b0b0);background:var(--egd-modal,#424242);}
.egdc-emoji-grid{display:grid;grid-template-columns:repeat(8,1fr);gap:2px;}
.egdc-emoji-item{width:100%;height:34px;padding:0;border:none;border-radius:6px;background:transparent;font-size:20px;line-height:1;cursor:pointer;}
.egdc-emoji-item:hover{background:var(--egd-hover,rgba(255,255,255,.12));}
.egdc-emoji-empty{padding:16px;text-align:center;font-size:12px;color:var(--egd-tekst-zacht,#b0b0b0);}
/* emoji-picker-element (vendor/emoji-picker.js) inherits the host theme; */
/* the dark class on the element keeps contrast when --egd-* is missing. */
.egdc-emoji-pop-web{padding:0;}
.egdc-emoji-picker{height:100%!important;max-width:100%!important;--background:var(--egd-modal,#424242);--border-color:var(--egd-rand,#555);--indicator-color:var(--egd-accent,#90caf9);--input-border-color:var(--egd-rand,#555);--input-font-color:var(--egd-tekst,#fff);--input-placeholder-color:var(--egd-tekst-zacht,#b0b0b0);--outline-color:var(--egd-accent,#90caf9);--category-font-color:var(--egd-tekst,#fff);--button-hover-background:var(--egd-hover,rgba(255,255,255,.12));--button-active-background:var(--egd-hover,rgba(255,255,255,.2));}
.egdc-msg-actions{display:flex;gap:2px;align-items:center;align-self:center;opacity:0;transition:opacity .12s;margin:0 2px;}
.egdc-msg:hover .egdc-msg-actions,.egdc-msg-actions:focus-within{opacity:1;}
.egdc-msg-actions button{width:24px;height:24px;padding:0;display:inline-flex;align-items:center;justify-content:center;border:1px solid transparent;border-radius:6px;background:transparent;color:var(--egd-tekst-zacht,#b0b0b0);font-size:13px;line-height:1;cursor:pointer;}
.egdc-msg-actions button:hover{background:var(--egd-hover,rgba(255,255,255,.1));border-color:var(--egd-rand,#555);color:var(--egd-tekst,#fff);}
.egdc-msg-actions button.danger:hover{color:var(--egd-gevaar,#ef5350);border-color:var(--egd-gevaar,#ef5350);}
.egdc-reactions{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;}
.egdc-reaction{display:inline-flex;align-items:center;gap:4px;padding:1px 7px;border-radius:999px;border:1px solid var(--egd-rand,#555);background:var(--egd-paneel,#333);color:var(--egd-tekst,#fff);font-size:12px;line-height:1.6;cursor:pointer;font-family:inherit;}
.egdc-reaction:hover{background:var(--egd-hover,rgba(255,255,255,.1));}
.egdc-reaction.active{border-color:var(--egd-accent,#90caf9);background:rgba(144,202,249,.18);}
.egdc-edit{display:flex;flex-direction:column;gap:6px;min-width:210px;}
.egdc-edit textarea{width:100%;min-height:54px;resize:vertical;padding:8px 10px;border-radius:8px;border:1px solid var(--egd-accent,#90caf9);background:var(--egd-veld,#2e2e2e);color:var(--egd-tekst,#fff);font-size:13px;font-family:inherit;outline:none;box-sizing:border-box;}
.egdc-edit-actions{display:flex;gap:6px;justify-content:flex-end;}
.egdc-edit-actions .egdc-btn{padding:5px 10px;}
    .egdc-composer-wrap{display:flex;flex-direction:column;flex:0 0 auto;}
    .egdc-file-input{display:none;}
    .egdc-attachbar{display:none;flex-direction:column;gap:6px;padding:8px 14px;border-top:1px solid var(--egd-rand,#555);background:var(--egd-modal,#424242);}
    .egdc-attach-chip{display:flex;align-items:center;gap:10px;padding:6px 8px;border-radius:8px;border:1px solid var(--egd-rand,#555);background:var(--egd-paneel,#333);max-width:100%;}
    .egdc-attach-thumb{width:40px;height:40px;object-fit:cover;border-radius:6px;flex:0 0 auto;}
    .egdc-attach-icon{font-size:22px;line-height:1;flex:0 0 auto;}
    .egdc-attach-info{min-width:0;flex:1;display:flex;flex-direction:column;gap:1px;}
    .egdc-attach-name{font-size:12px;font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .egdc-attach-size{font-size:10px;color:var(--egd-tekst-zacht,#b0b0b0);}
    .egdc-attach-remove{width:26px;height:26px;padding:0;border:1px solid transparent;border-radius:6px;background:transparent;color:var(--egd-tekst-zacht,#b0b0b0);font-size:16px;line-height:1;cursor:pointer;flex:0 0 auto;}
    .egdc-attach-remove:hover{color:var(--egd-gevaar,#ef5350);border-color:var(--egd-gevaar,#ef5350);}
    .egdc-attach-progress{display:flex;align-items:center;gap:8px;font-size:11px;color:var(--egd-tekst-zacht,#b0b0b0);}
    .egdc-attach-progress-bar{flex:1;height:6px;border-radius:999px;background:var(--egd-veld,#2e2e2e);overflow:hidden;}
    .egdc-attach-progress-bar span{display:block;height:100%;width:0%;background:var(--egd-accent,#90caf9);transition:width .15s;}
    .egdc-attach{max-width:280px;margin:0 0 4px;}
    .egdc-attach-loading,.egdc-attach-error{padding:10px 12px;border-radius:8px;border:1px dashed var(--egd-rand,#555);font-size:12px;color:var(--egd-tekst-zacht,#b0b0b0);}
    .egdc-attach-link{display:inline-block;margin-top:6px;font-size:11px;color:var(--egd-accent,#90caf9);text-decoration:underline;cursor:pointer;}
    .egdc-attach-image{max-width:280px;max-height:280px;border-radius:8px;display:block;cursor:zoom-in;}
    .egdc-attach-video,.egdc-attach-audio{max-width:280px;border-radius:8px;}
    .egdc-attach-name-line{font-size:11px;color:var(--egd-tekst-zacht,#b0b0b0);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .egdc-attach-file{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;border:1px solid var(--egd-rand,#555);background:var(--egd-paneel,#333);color:var(--egd-tekst,#fff);text-decoration:none;cursor:pointer;box-sizing:border-box;}
    .egdc-attach-file:hover{background:var(--egd-hover,rgba(255,255,255,.08));}
    .egdc-attach-file-icon{color:var(--egd-accent,#90caf9);flex:0 0 auto;display:inline-flex;}
    .egdc-attach-file-body{min-width:0;flex:1;display:flex;flex-direction:column;gap:1px;}
    .egdc-attach-file-name{font-size:12px;font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .egdc-attach-file-size{font-size:10px;color:var(--egd-tekst-zacht,#b0b0b0);}
    .egdc-attach-file-dl{flex:0 0 auto;color:var(--egd-tekst-zacht,#b0b0b0);display:inline-flex;}
    .egdc-main.egdc-drop{outline:2px dashed var(--egd-accent,#90caf9);outline-offset:-6px;}
        .egdc-embeds{display:flex;flex-direction:column;gap:6px;margin-top:4px;max-width:280px;}
    .egdc-embed-gif{max-width:280px;max-height:280px;border-radius:8px;display:block;}
    .egdc-embed-iframe{width:280px;height:200px;border:none;border-radius:8px;}
    .egdc-embed-video{max-width:280px;max-height:280px;border-radius:8px;display:block;}
    @media (hover:none){.egdc-msg-actions{opacity:1;}}
.egdc-panel{flex:1;overflow-y:auto;padding:16px;min-height:0;}
.egdc-panel h3{font-size:15px;margin:0 0 4px;font-weight:bold;}
.egdc-panel p{margin:0 0 12px;font-size:12px;color:var(--egd-tekst-zacht,#b0b0b0);line-height:1.5;}
.egdc-panel .egdc-grow{flex:1;}
.egdc-toolbar{display:flex;gap:8px;align-items:center;margin:0 0 10px;flex-wrap:wrap;}
.egdc-input{width:100%;padding:9px 10px;border-radius:6px;border:1px solid var(--egd-rand,#555);background:var(--egd-veld,#2e2e2e);color:var(--egd-tekst,#fff);font-size:13px;outline:none;box-sizing:border-box;font-family:inherit;}
.egdc-input:focus{border-color:var(--egd-accent,#90caf9);}
.egdc-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 12px;border-radius:6px;border:1px solid var(--egd-rand,#555);background:var(--egd-paneel,#333);color:var(--egd-tekst,#fff);font-size:12px;font-weight:bold;cursor:pointer;font-family:inherit;}
.egdc-btn:hover{background:var(--egd-hover,rgba(255,255,255,.08));}
.egdc-btn.primary{background:var(--egd-accent,#90caf9);color:var(--egd-accent-tekst,#0d47a1);border-color:transparent;}
.egdc-btn.danger{background:transparent;color:var(--egd-gevaar,#ef5350);border-color:var(--egd-gevaar,#ef5350);}
.egdc-btn:disabled{opacity:.45;cursor:default;}
.egdc-user-list{display:flex;flex-direction:column;gap:4px;margin-top:4px;}
.egdc-user{display:flex;align-items:center;gap:10px;padding:8px;border-radius:8px;cursor:pointer;border:1px solid transparent;width:100%;text-align:left;background:transparent;color:var(--egd-tekst,#fff);font-family:inherit;font-size:13px;box-sizing:border-box;}
.egdc-user:hover{background:var(--egd-hover,rgba(255,255,255,.06));border-color:var(--egd-rand,#555);}
.egdc-user:disabled{opacity:.5;cursor:default;}
.egdc-user-body{min-width:0;flex:1;}
.egdc-user-name{font-size:13px;font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.egdc-user-sub{font-size:11px;color:var(--egd-tekst-zacht,#b0b0b0);margin-top:2px;}
.egdc-user.selected{background:var(--egd-hover,rgba(255,255,255,.08));border-color:var(--egd-accent,#90caf9);}
.egdc-user-check{width:20px;height:20px;border-radius:50%;border:1px solid var(--egd-rand,#555);display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;font-size:12px;font-weight:bold;line-height:1;box-sizing:border-box;}
.egdc-user.selected .egdc-user-check{background:var(--egd-accent,#90caf9);border-color:var(--egd-accent,#90caf9);color:var(--egd-accent-tekst,#0d47a1);}
.egdc-pickbar{display:none;flex-wrap:wrap;gap:6px;margin:0 0 10px;}
.egdc-chip{display:inline-flex;align-items:center;gap:5px;padding:3px 4px 3px 3px;border-radius:999px;border:1px solid var(--egd-rand,#555);background:var(--egd-paneel,#333);font-size:12px;max-width:100%;}
.egdc-chip-x{border:none;background:transparent;color:inherit;cursor:pointer;font-size:15px;line-height:1;padding:0 5px 0 1px;opacity:.7;font-family:inherit;}
.egdc-chip-x:hover{opacity:1;}
.egdc-pick-foot{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:14px;padding-top:12px;border-top:1px solid var(--egd-rand,#555);position:sticky;bottom:-16px;background:var(--egd-veld,#2e2e2e);}
.egdc-notice{display:flex;flex-direction:column;gap:8px;padding:10px 12px;border-radius:8px;border:1px solid var(--egd-rand,#555);background:var(--egd-paneel,#333);font-size:12px;line-height:1.5;margin:6px 0;}
.egdc-notice.error{border-color:var(--egd-gevaar,#ef5350);}
.egdc-notice.warn{border-color:var(--egd-a-streep,#ffb300);}
.egdc-notice.info{color:var(--egd-tekst-zacht,#b0b0b0);}
.egdc-notice .egdc-btn{align-self:flex-start;}
.egdc-info{display:grid;grid-template-columns:1fr 1.4fr;gap:6px 10px;font-size:12px;margin:0 0 14px;}
.egdc-info dt{color:var(--egd-tekst-zacht,#b0b0b0);}
.egdc-info dd{margin:0;word-break:break-word;}
.egdc-section{border-top:1px solid var(--egd-rand,#555);padding-top:14px;margin-top:14px;}
.egdc-section:first-child{border-top:none;padding-top:0;margin-top:0;}
.egdc-muted{font-size:11px !important;color:var(--egd-tekst-zacht,#b0b0b0);}
.egdc-loading{display:flex;align-items:center;gap:8px;padding:12px;color:var(--egd-tekst-zacht,#b0b0b0);font-size:12px;}
.egdc-spinner{width:14px;height:14px;border-radius:50%;border:2px solid var(--egd-rand,#555);border-top-color:var(--egd-accent,#90caf9);animation:egdc-spin .8s linear infinite;flex:0 0 auto;}
@keyframes egdc-spin{to{transform:rotate(360deg);}}
.egdc-avatar{position:relative;border-radius:50%;background:#757575;color:#fff;display:inline-flex;align-items:center;justify-content:center;overflow:hidden;flex:0 0 auto;font-weight:bold;box-sizing:border-box;border:1px solid rgba(0,0,0,.2);}
.egdc-avatar img{width:100%;height:100%;object-fit:cover;display:block;}
.egdc-back{display:none;}
.egdc-back-panel{display:inline-flex !important;}
@media (max-width:780px){
  .egdc-backdrop{padding:0;}
  .egdc-modal{width:100%;height:100%;border-radius:0;border:none;}
  .egdc-side{width:100%;flex:1 1 auto;border-right:none;}
  .egdc-modal.has-room .egdc-side{display:none;}
  .egdc-modal:not(.has-room):not(.panel-open) .egdc-main{display:none;}
  .egdc-modal.panel-open .egdc-side{display:none;}
  .egdc-modal.panel-open .egdc-main{display:flex;}
  .egdc-back{display:inline-flex;}
}
`;

    const state = {
        identity: null,
        baseIdentity: null,
        rooms: [],
        activeRoomId: null,
        messages: [],
        messagesError: '',
        roomsError: '',
        view: 'chat',
        filter: '',
        directory: { users: [], error: '', loading: false, fetchedAt: 0, cached: false },
        backend: { kind: 'none', error: '' },
        online: 'unknown',
        onlineError: '',
        picked: new Map(),
        newFilter: '',
        groupName: '',
        pendingPeer: null,
        editingId: '',
        editDraft: '',
        pendingFile: null,
        pendingPreviewUrl: null,
        uploading: false,
        uploadProgress: 0
    };

    let root = null;
    let modal = null;
    let parts = {};
    let unsubRooms = null;
    let unsubMessages = null;
    let openToken = 0;
    let keyHandler = null;
    let autoSelected = false;
    let healedRoomKeys = new Set();
    let probeTimer = null;
    let probing = false;
    let networkHandler = null;

    // ------------------------------------------------------------
    // Small helpers
    // ------------------------------------------------------------

    function clear(node) {
        if (!node) return;
        while (node.firstChild) node.removeChild(node.firstChild);
    }

    function timeText(ms) {
        if (!ms) return '';
        try {
            return new Date(ms).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
        } catch (err) {
            return '';
        }
    }

    function roomTimeText(ms) {
        if (!ms) return '';
        const date = new Date(ms);
        const now = new Date();
        const sameDay = date.toDateString() === now.toDateString();
        if (sameDay) return timeText(ms);
        const yesterday = new Date(now.getTime() - 86400000);
        if (date.toDateString() === yesterday.toDateString()) return 'Gisteren';
        try {
            return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
        } catch (err) {
            return '';
        }
    }

    function dayKey(ms) {
        try { return new Date(ms || Date.now()).toDateString(); } catch (err) { return ''; }
    }

    function dayLabel(ms) {
        const now = new Date();
        const date = new Date(ms || Date.now());
        if (date.toDateString() === now.toDateString()) return 'Vandaag';
        const yesterday = new Date(now.getTime() - 86400000);
        if (date.toDateString() === yesterday.toDateString()) return 'Gisteren';
        try {
            return date.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
        } catch (err) {
            return '';
        }
    }

    function makeAvatar(profile, size) {
        const p = profile || {};
        const node = el('div', { class: 'egdc-avatar' });
        node.style.width = size + 'px';
        node.style.height = size + 'px';
        node.style.fontSize = Math.max(9, Math.round(size * 0.42)) + 'px';
        const name = p.firstName || p.name || '?';
        node.textContent = String(name).trim().charAt(0).toUpperCase() || '?';

        if (p.photo) {
            const img = el('img', { src: p.photo, alt: '' });
            img.style.display = 'none';
            img.addEventListener('load', function () {
                node.textContent = '';
                img.style.display = 'block';
            });
            img.addEventListener('error', function () {
                if (img.parentNode) img.parentNode.removeChild(img);
            });
            node.appendChild(img);
        }

        return node;
    }

    function findDirectoryUser(id) {
        const needle = String(id == null ? '' : id).trim().toLowerCase();
        if (!needle) return null;
        return state.directory.users.find(function (u) {
            return String(u.id).toLowerCase() === needle ||
                (u.email && String(u.email).toLowerCase() === needle);
        }) || null;
    }

    // Rooms store every key we know for a member (Egodact id + e-mail),
    // so the peer is any member key that is not one of ours.
    function selfMemberKeys() {
        const me = state.identity || {};
        const keys = [];
        if (me.id) keys.push(String(me.id).toLowerCase());
        (me.aliases || []).forEach(function (id) {
            if (id) keys.push(String(id).toLowerCase());
        });
        if (me.email) keys.push(String(me.email).toLowerCase());
        return keys;
    }

    function isSelfMemberKey(key) {
        const needle = String(key == null ? '' : key).trim().toLowerCase();
        if (!needle) return true;
        if (selfMemberKeys().indexOf(needle) !== -1) return true;
        const user = findDirectoryUser(key);
        return !!(user && String(user.id) === String(state.identity && state.identity.id));
    }

    function peerMemberKeys(room) {
        return (room && room.members ? room.members : []).filter(function (key) {
            return !isSelfMemberKey(key);
        });
    }

    // Closed conversations are remembered per account (e-mail), so the
    // key stays the same when the technical id is aligned with Egodact.
    function hiddenStoreKey() {
        const me = state.identity || {};
        return String(me.email || me.id || 'guest').trim().toLowerCase();
    }

    function hiddenRoomIds() {
        return Store.hiddenRooms(hiddenStoreKey());
    }

    function hideRoom(roomId) {
        if (!roomId) return;
        const room = state.rooms.find(function (r) { return r.id === roomId; }) || null;
        const name = room ? roomDisplay(room).name : '';
        Store.hideRoom(hiddenStoreKey(), roomId, true);
        state.rooms = state.rooms.filter(function (r) { return r.id !== roomId; });
        if (state.activeRoomId === roomId) {
            leaveRoom();
        } else {
            renderRooms();
        }
        toast('Gesprek' + (name ? ' met ' + name : '') + ' gesloten. Herstellen kan bij Instellingen.', 'info', 4200);
    }

    // Closed rooms are only hidden locally, so we can restore just one
    // conversation without touching the others. Transport.rooms() keeps
    // the full room cache (including hidden rooms), which gives us the
    // name and last message for the settings list.
    function hiddenRoomEntries() {
        const hidden = hiddenRoomIds();
        const cached = {};
        let rooms = [];
        try { rooms = Transport.rooms ? Transport.rooms() : []; } catch (err) { rooms = []; }
        (rooms || []).forEach(function (room) {
            if (room && room.id) cached[room.id] = room;
        });
        return Object.keys(hidden).sort(function (a, b) {
            return (hidden[b] || 0) - (hidden[a] || 0);
        }).map(function (id) {
            return { id: id, room: cached[id] || null };
        });
    }

    function resubscribeRooms() {
        if (unsubRooms) { try { unsubRooms(); } catch (err) {} }
        unsubRooms = Transport.listRooms(onRooms);
    }

    function restoreHiddenRoom(roomId) {
        if (!roomId) return;
        Store.hideRoom(hiddenStoreKey(), roomId, false);
        resubscribeRooms();
        renderChrome();
        renderMain();
        toast('Gesprek hersteld.', 'success');
    }

    function restoreHiddenRooms() {
        Store.clearHiddenRooms(hiddenStoreKey());
        resubscribeRooms();
        renderChrome();
        renderMain();
        toast('Gesloten gesprekken hersteld.', 'success');
    }

    function roomDisplay(room) {
        if (!room) {
            if (state.pendingPeer) {
                const peer = state.pendingPeer;
                return {
                    name: peer.name || 'Onbekend',
                    firstName: peer.firstName || String(peer.name || 'O').split(/\s+/)[0],
                    photo: peer.picture || peer.photo || ''
                };
            }
            return { name: 'Gesprek', firstName: 'G', photo: '' };
        }
        if (room.type === 'dm') {
            const keys = peerMemberKeys(room);
            let profile = null;
            for (let i = 0; i < keys.length; i++) {
                const key = keys[i];
                profile = (room.memberProfiles && room.memberProfiles[key]) ||
                    findDirectoryUser(key) || null;
                if (profile) break;
            }
            profile = profile || {};
            return {
                name: profile.name || 'Onbekend',
                firstName: profile.firstName || String(profile.name || 'O').split(/\s+/)[0],
                photo: profile.photo || profile.picture || ''
            };
        }
        return {
            name: room.name || 'Groep',
            firstName: String(room.name || 'G')[0],
            photo: ''
        };
    }

    function roomSubtitle(room) {
        if (!room) return '';
        if (room.type === 'group') {
            const members = room.members || [];
            const ids = members.filter(function (key) {
                const value = String(key);
                return value.indexOf('@') === -1 && value.indexOf(':') === -1;
            });
            const count = ids.length || Math.ceil(members.length / 2);
            return count + (count === 1 ? ' lid' : ' leden');
        }
        return 'Direct bericht';
    }

    function currentRoom() {
        if (!state.activeRoomId) return null;
        return state.rooms.find(function (r) { return r.id === state.activeRoomId; }) ||
            Transport.getRoom(state.activeRoomId) || null;
    }

    function toast(message, type, duration) {
        try {
            ui.toast(message, { type: type || 'success', duration: duration || 3200 });
        } catch (err) {
            console.log('[Egodact Chat]', message);
        }
    }

    function notice(text, type, actionLabel, action) {
        const node = el('div', { class: 'egdc-notice ' + (type || 'info') });
        node.appendChild(el('div', { text: text }));
        if (actionLabel && typeof action === 'function') {
            node.appendChild(el('button', {
                type: 'button',
                class: 'egdc-btn',
                text: actionLabel,
                onClick: action
            }));
        }
        return node;
    }

    function loadingNode(text) {
        const node = el('div', { class: 'egdc-loading' });
        node.appendChild(el('span', { class: 'egdc-spinner' }));
        node.appendChild(el('span', { text: text || 'Laden…' }));
        return node;
    }

    function applyIdentity() {
        const base = Object.assign({}, state.baseIdentity);
        state.identity = Identity.applyDisplayName(base);
    }

    function identitySourceText() {
        const source = state.identity && state.identity.source;
        if (source === 'egodact') return 'Egodact-profiel';
        if (source === 'single-sign-on') return 'Egodact-login';
        return 'Lokaal';
    }

    function backendText() {
        if (state.backend.kind === 'firebase') {
            return 'Firebase' + (Transport.projectId() ? ' · ' + Transport.projectId() : '');
        }
        if (state.backend.kind === 'local') return 'Lokale demo';
        return 'Verbinden…';
    }

    // ------------------------------------------------------------
    // Shell
    // ------------------------------------------------------------

    function injectCss() {
        if (document.getElementById('egdc-style')) return;
        const style = document.createElement('style');
        style.id = 'egdc-style';
        style.textContent = CSS;
        (document.head || document.documentElement).appendChild(style);
    }

    function buildComposer() {
        const wrap = el('div', { class: 'egdc-composer-wrap' });
        parts.attachBar = el('div', { class: 'egdc-attachbar' });

        const row = el('div', { class: 'egdc-composer' });
        parts.input = el('textarea', { rows: 1, placeholder: 'Schrijf een bericht…' });
        parts.attachBtn = el('button', {
            type: 'button',
            class: 'egdc-emoji-btn',
            title: 'Bestand toevoegen',
            html: ICON_PAPERCLIP,
            onClick: function () { if (parts.fileInput) parts.fileInput.click(); }
        });
        parts.emojiBtn = el('button', {
            type: 'button',
            class: 'egdc-emoji-btn',
            title: 'Emoji',
            text: '\ud83d\ude42',
            onClick: function () {
                try { var t = document.createElement('div'); t.textContent = '[Egodact Chat] emoji button clicked'; t.style.cssText = 'position:fixed;top:8px;left:8px;z-index:2147483647;background:#c00;color:#fff;padding:8px 12px;border-radius:6px;font:14px/1.2 Arial,sans-serif;'; document.body.appendChild(t); setTimeout(function(){ t.remove(); }, 2500); } catch (e) {}
                openEmojiPicker(parts.emojiBtn, insertEmoji);
            }
        });
        parts.sendBtn = el('button', {
            type: 'button',
            class: 'egdc-send',
            title: 'Versturen',
            html: ICON_SEND,
            onClick: send
        });

        parts.fileInput = el('input', {
            type: 'file',
            class: 'egdc-file-input',
            onChange: function () {
                const files = parts.fileInput && parts.fileInput.files;
                const file = files && files.length ? files[0] : null;
                if (parts.fileInput) parts.fileInput.value = '';
                if (file) selectAttachment(file);
            }
        });

        parts.input.addEventListener('keydown', function (event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                send();
            }
        });
        parts.input.addEventListener('input', function () { autoGrow(); updateComposer(); });
        parts.input.addEventListener('paste', function (event) {
            const files = event.clipboardData && event.clipboardData.files;
            if (files && files.length) {
                event.preventDefault();
                selectAttachment(files[0]);
            }
        });

        row.append(parts.attachBtn, parts.emojiBtn, parts.input, parts.sendBtn);
        wrap.append(parts.attachBar, row, parts.fileInput);
        return wrap;
    }

    // ------------------------------------------------------------
    // Emoji data + picker
    // ------------------------------------------------------------
    // Every fully-qualified Unicode emoji ships in js/emoji-data.js.
    // The picker parses that once on first open. Instead of creating
    // ~4,000 buttons up front it lays out the group headers plus
    // fixed-height chunks, and builds a chunk's buttons only when it
    // scrolls near the viewport. Opening stays instant even though
    // "People & Body" alone has 2,400 emoji.
    const EMOJI_CHUNK = 120;
    let emojiGroups = null;
    let recentEmoji = null;
    let emojiPickerNode = null;
    let emojiPickerAnchor = null;
    let emojiPickerClose = null;

    function escapeEmojiAttr(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function emojiButtonHtml(item) {
        return '<button type="button" class="egdc-emoji-item" title="' +
            escapeEmojiAttr(item.name) + '" data-emoji="' +
            escapeEmojiAttr(item.emoji) + '">' + item.emoji + '</button>';
    }

    function loadEmojiGroups() {
        if (emojiGroups) return emojiGroups;
        emojiGroups = [];
        const source = window.EGCEmoji;
        if (!source || !Array.isArray(source.groups)) return emojiGroups;
        source.groups.forEach(function (group) {
            const items = [];
            String(group.items || '').split('\n').forEach(function (line) {
                if (!line) return;
                const at = line.indexOf('|');
                if (at === -1) return;
                const name = line.slice(0, at);
                items.push({
                    name: name,
                    key: name.toLowerCase(),
                    emoji: line.slice(at + 1)
                });
            });
            if (items.length) {
                emojiGroups.push({
                    name: group.name,
                    items: items,
                    html: []
                });
            }
        });
        return emojiGroups;
    }

    // Chunk markup is cached on the group, so reopening the picker or
    // scrolling back up never rebuilds thousands of strings.
    function chunkHtml(group, index) {
        if (!group.html[index]) {
            const slice = group.items.slice(index * EMOJI_CHUNK, (index + 1) * EMOJI_CHUNK);
            group.html[index] = slice.map(emojiButtonHtml).join('');
        }
        return group.html[index];
    }

    function recentEmojis() {
        if (recentEmoji) return recentEmoji;
        const stored = Store.get('recent_emoji', []);
        recentEmoji = Array.isArray(stored) ? stored.filter(function (item) {
            return typeof item === 'string' && item;
        }).slice(0, 32) : [];
        return recentEmoji;
    }

    function rememberEmoji(emoji) {
        if (!emoji) return;
        const next = recentEmojis().filter(function (item) { return item !== emoji; });
        next.unshift(emoji);
        recentEmoji = next.slice(0, 32);
        Store.set('recent_emoji', recentEmoji);
    }

    function closeEmojiPicker() {
        if (emojiPickerNode && emojiPickerNode.parentNode) {
            emojiPickerNode.parentNode.removeChild(emojiPickerNode);
        }
        emojiPickerNode = null;
        emojiPickerAnchor = null;
        if (emojiPickerClose) {
            try { document.removeEventListener('mousedown', emojiPickerClose, true); } catch (err) {}
            try { document.removeEventListener('keydown', emojiPickerClose, true); } catch (err) {}
            emojiPickerClose = null;
        }
    }

    function fillEmojiGrid(grid, html) {
        grid.style.minHeight = '';
        grid.innerHTML = html;
    }

    // Both pickers use the same fixed positioning: clamp to the viewport and
    // float above the anchor when there is not enough room below.
    function positionEmojiPop(pop, anchor, width, height) {
        const rect = anchor.getBoundingClientRect();
        let left = rect.left;
        if (left + width > window.innerWidth - 8) {
            left = Math.max(8, window.innerWidth - width - 8);
        }
        let top = rect.top - height - 8;
        if (top < 8) top = Math.min(window.innerHeight - height - 8, rect.bottom + 8);
        pop.style.width = Math.round(width) + 'px';
        pop.style.left = Math.round(left) + 'px';
        pop.style.top = Math.round(Math.max(8, top)) + 'px';
    }

    // emoji-picker-element ships in vendor/emoji-picker.js and reads its data
    // from the package itself, so it works despite the page CSP (which blocks
    // the cdn.jsdelivr.net default) and without a network connection.
    function emojiDataUrl() {
        // In the extension the data is inlined in vendor/emoji-picker.js,
        // so no chrome-extension:// fetch (which the page CSP blocks) is
        // needed. The test page has no `chrome.runtime`, so it loads the
        // separate JSON file over HTTP instead.
        try {
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
                return 'egc:inline';
            }
        } catch (err) {}
        return 'vendor/emoji-picker-data.json';
    }

    function showWebEmojiPicker(anchor, onPick) {
        try { var _e = document.createElement('div'); _e.textContent = '[Egodact Chat] showWebEmojiPicker called'; _e.style.cssText = 'position:fixed;top:104px;left:8px;z-index:2147483647;background:#930;color:#fff;padding:8px 12px;border-radius:6px;font:14px/1.2 Arial,sans-serif;'; document.body.appendChild(_e); setTimeout(function(){ _e.remove(); }, 3000); } catch (err) {}
        const pop = el('div', { class: 'egdc-emoji-pop egdc-emoji-pop-web' });
        const picker = document.createElement('emoji-picker');
        picker.className = 'egdc-emoji-picker dark';
        picker.setAttribute('locale', 'en');
        picker.dataSource = emojiDataUrl();
        picker.addEventListener('emoji-click', function (event) {
            const detail = event.detail || {};
            const emoji = detail.unicode || (detail.emoji && detail.emoji.unicode);
            if (!emoji) return;
            rememberEmoji(emoji);
            onPick(emoji);
        });
        pop.appendChild(picker);
        root.appendChild(pop);
        try {
            var _r = pop.getBoundingClientRect();
            var _m = document.createElement('div');
            _m.textContent = '[Egodact Chat] pop appended, size=' + Math.round(_r.width) + 'x' + Math.round(_r.height) + ' at ' + Math.round(_r.left) + ',' + Math.round(_r.top);
            _m.style.cssText = 'position:fixed;top:72px;left:8px;z-index:2147483647;background:#0a0;color:#fff;padding:8px 12px;border-radius:6px;font:14px/1.2 Arial,sans-serif;';
            document.body.appendChild(_m);
            setTimeout(function(){ _m.remove(); }, 3000);
            pop.style.zIndex = '2147483647';
            pop.style.outline = '4px solid lime';
        } catch (e) {}

        // The component sizes itself to whole emoji columns; shrinking it
        // makes the grid clip its last column. Keep its natural width and only
        // clamp it to the viewport.
        pop.style.width = 'auto';
        const natural = Math.ceil(picker.getBoundingClientRect().width) + 2;
        const width = Math.min(natural || 336, Math.max(240, window.innerWidth - 16));
        const height = Math.min(400, Math.max(240, window.innerHeight - 80));
        pop.style.width = Math.round(width) + 'px';
        pop.style.height = Math.round(height) + 'px';
        positionEmojiPop(pop, anchor, width, height);

        emojiPickerNode = pop;
        emojiPickerAnchor = anchor;
        emojiPickerClose = function (event) {
            if (event.type === 'keydown') {
                if (event.key === 'Escape') {
                    event.stopPropagation();
                    closeEmojiPicker();
                }
                return;
            }
            if (pop.contains(event.target)) return;
            if (anchor.contains && anchor.contains(event.target)) return;
            closeEmojiPicker();
        };
        document.addEventListener('mousedown', emojiPickerClose, true);
        document.addEventListener('keydown', emojiPickerClose, true);

        // If the custom element did not render, or its data did not load
        // (for example because the host page CSP blocked the fetch),
        // re-open with the built-in picker instead of an empty box.
        function fallbackIfNeeded() {
            if (emojiPickerNode !== pop) return;
            const shadow = picker.shadowRoot;
            if (!shadow || !shadow.querySelector('.picker')) {
                closeEmojiPicker();
                openEmojiPicker(anchor, onPick, true);
                return;
            }
            const loaded = shadow.querySelectorAll('[id^="emo-"]').length;
            const message = (shadow.querySelector('.message') || {}).textContent || '';
            if (loaded === 0 && /could not load/i.test(message)) {
                closeEmojiPicker();
                openEmojiPicker(anchor, onPick, true);
            }
        }
        if (typeof requestAnimationFrame === 'function') {
            requestAnimationFrame(function () {
                // First check: did the component render at all?
                if (emojiPickerNode !== pop) return;
                const shadow = picker.shadowRoot;
                if (!shadow || !shadow.querySelector('.picker')) {
                    closeEmojiPicker();
                    openEmojiPicker(anchor, onPick, true);
                    return;
                }
                // Second check: did the data load? Give it a moment.
                setTimeout(fallbackIfNeeded, 2500);
            });
        }
        return true;
    }

    function openEmojiPicker(anchor, onPick, forceBuiltin) {
        try { var t2 = document.createElement('div'); t2.textContent = '[Egodact Chat] openEmojiPicker called, root=' + !!root + ' anchor=' + !!anchor; t2.style.cssText = 'position:fixed;top:40px;left:8px;z-index:2147483647;background:#06c;color:#fff;padding:8px 12px;border-radius:6px;font:14px/1.2 Arial,sans-serif;'; document.body.appendChild(t2); setTimeout(function(){ t2.remove(); }, 2500); } catch (e) {}
        if (!root || !anchor) return;
        // Clicking the same button again closes the picker.
        if (emojiPickerNode && emojiPickerAnchor === anchor) {
            closeEmojiPicker();
            return;
        }
        closeEmojiPicker();
        if (!forceBuiltin && typeof customElements !== 'undefined' &&
            customElements.get('emoji-picker')) {
            try {
                if (showWebEmojiPicker(anchor, onPick)) return;
            } catch (err) {
                try { console.warn('[Egodact Chat] emoji-picker failed, falling back:', err); } catch (e) {}
                closeEmojiPicker();
            }
        } else if (!forceBuiltin) {
            try { console.warn('[Egodact Chat] emoji-picker custom element not registered; using built-in picker.'); } catch (e) {}
        }

        try { var _b = document.createElement('div'); _b.textContent = '[Egodact Chat] builtin picker starting'; _b.style.cssText = 'position:fixed;top:136px;left:8px;z-index:2147483647;background:#555;color:#fff;padding:8px 12px;border-radius:6px;font:14px/1.2 Arial,sans-serif;'; document.body.appendChild(_b); setTimeout(function(){ _b.remove(); }, 3000); } catch (e) {}
        const pop = el('div', { class: 'egdc-emoji-pop' });
        const search = el('input', {
            class: 'egdc-emoji-search',
            type: 'search',
            placeholder: 'Zoek emoji…'
        });
        search.setAttribute('aria-label', 'Zoek emoji');
        const scroll = el('div', { class: 'egdc-emoji-scroll' });
        let waiting = [];

        // Fill every chunk that is inside the viewport plus a 600px
        // margin. Reserved heights are exact, so this stays stable.
        function fillVisible() {
            if (!waiting.length) return;
            const top = scroll.scrollTop - 600;
            const bottom = scroll.scrollTop + scroll.clientHeight + 600;
            const rest = [];
            waiting.forEach(function (entry) {
                if (entry.top <= bottom && entry.top + entry.height >= top) {
                    fillEmojiGrid(entry.grid, chunkHtml(entry.group, entry.index));
                } else {
                    rest.push(entry);
                }
            });
            waiting = rest;
        }

        scroll.addEventListener('scroll', fillVisible);

        function paint(filter) {
            waiting = [];
            clear(scroll);
            scroll.scrollTop = 0;

            const needle = String(filter || '').trim().toLowerCase();
            const groups = loadEmojiGroups();
            const pending = [];
            let shown = 0;

            function addGroup(name, group) {
                if (!group.items.length) return;
                scroll.appendChild(el('div', { class: 'egdc-emoji-group', text: name }));
                const chunks = Math.ceil(group.items.length / EMOJI_CHUNK);
                for (let index = 0; index < chunks; index++) {
                    const count = Math.min(EMOJI_CHUNK, group.items.length - index * EMOJI_CHUNK);
                    const grid = el('div', { class: 'egdc-emoji-grid' });
                    // Eight columns of 34px with a 2px gap, so the
                    // reservation is exact and filling never jumps.
                    grid.style.minHeight = Math.ceil(count / 8) * 36 + 'px';
                    scroll.appendChild(grid);
                    shown += count;
                    pending.push({ grid: grid, group: group, index: index });
                }
            }

            if (!needle) {
                const recent = recentEmojis();
                if (recent.length) {
                    addGroup('Recent', {
                        items: recent.map(function (emoji) {
                            return { name: emoji, emoji: emoji };
                        }),
                        html: []
                    });
                }
                groups.forEach(function (group) { addGroup(group.name, group); });
            } else {
                // Cap results so even a one-letter query stays fast;
                // typing more narrows it down anyway.
                const maxTotal = 480;
                let total = 0;
                groups.forEach(function (group) {
                    if (total >= maxTotal) return;
                    const matches = [];
                    for (let i = 0; i < group.items.length; i++) {
                        if (matches.length >= 160) break;
                        if (group.items[i].key.indexOf(needle) !== -1) matches.push(group.items[i]);
                    }
                    if (!matches.length) return;
                    total += matches.length;
                    addGroup(group.name, { items: matches, html: [] });
                });
            }

            if (!shown) {
                scroll.appendChild(el('div', {
                    class: 'egdc-emoji-empty',
                    text: 'Geen emoji gevonden.'
                }));
                return;
            }

            // Measure the reserved chunks once, then fill what is near.
            const origin = scroll.getBoundingClientRect().top;
            pending.forEach(function (entry) {
                const rect = entry.grid.getBoundingClientRect();
                entry.top = rect.top - origin + scroll.scrollTop;
                entry.height = rect.height;
            });
            waiting = pending;
            fillVisible();
        }

        scroll.addEventListener('click', function (event) {
            const button = event.target && event.target.closest
                ? event.target.closest('[data-emoji]')
                : null;
            if (!button) return;
            const emoji = button.getAttribute('data-emoji');
            if (!emoji) return;
            rememberEmoji(emoji);
            onPick(emoji);
        });

        search.addEventListener('input', function () { paint(search.value); });
        search.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') {
                event.stopPropagation();
                closeEmojiPicker();
            }
        });

        pop.append(search, scroll);
        root.appendChild(pop);
        paint('');

        const width = Math.min(336, Math.max(200, window.innerWidth - 16));
        const height = Math.min(360, Math.max(220, window.innerHeight - 80));
        positionEmojiPop(pop, anchor, width, height);

        emojiPickerNode = pop;
        emojiPickerAnchor = anchor;
        emojiPickerClose = function (event) {
            if (event.type === 'keydown') {
                if (event.key === 'Escape') {
                    event.stopPropagation();
                    closeEmojiPicker();
                }
                return;
            }
            if (pop.contains(event.target)) return;
            if (anchor.contains && anchor.contains(event.target)) return;
            closeEmojiPicker();
        };
        document.addEventListener('mousedown', emojiPickerClose, true);
        document.addEventListener('keydown', emojiPickerClose, true);

        try { search.focus(); } catch (err) {}
    }

    function insertEmoji(emoji) {
        if (!parts.input) return;
        const input = parts.input;
        const start = typeof input.selectionStart === 'number' ? input.selectionStart : input.value.length;
        const end = typeof input.selectionEnd === 'number' ? input.selectionEnd : input.value.length;
        input.value = input.value.slice(0, start) + emoji + input.value.slice(end);
        try {
            input.focus();
            input.setSelectionRange(start + emoji.length, start + emoji.length);
        } catch (err) {}
        autoGrow();
    }

    function autoGrow() {
        if (!parts.input) return;
        parts.input.style.height = 'auto';
        parts.input.style.height = Math.min(parts.input.scrollHeight, 120) + 'px';
    }

    function build() {
        injectCss();

        const existing = document.getElementById('egodact-custom-modal-backdrop');
        if (existing) existing.remove();

        root = el('div', { class: 'egdc-backdrop', id: 'egodact-custom-modal-backdrop' });
        modal = el('div', { class: 'egdc-modal' });

        const head = el('div', { class: 'egdc-head' });
        head.appendChild(el('span', { class: 'egdc-head-icon', html: ICON_CHAT }));
        head.appendChild(el('h2', { text: 'Chat' }));
        parts.badge = el('span', { class: 'egdc-badge' });
        head.appendChild(parts.badge);
        head.appendChild(el('button', {
            type: 'button',
            class: 'egdc-close',
            title: 'Sluiten',
            html: ICON_CLOSE,
            onClick: close
        }));

        const body = el('div', { class: 'egdc-body' });
        const side = el('aside', { class: 'egdc-side' });

        const sideHead = el('div', { class: 'egdc-side-head' });
        parts.meAvatar = el('span', { class: 'egdc-me-avatar' });
        const me = el('div', { class: 'egdc-me' });
        parts.meName = el('div', { class: 'egdc-me-name' });
        parts.meSub = el('div', { class: 'egdc-me-sub' });
        me.append(parts.meName, parts.meSub);
        const newBtn = el('button', {
            type: 'button',
            class: 'egdc-iconbtn',
            title: 'Nieuw gesprek',
            html: ICON_PLUS,
            onClick: function () { showView('new'); }
        });
        sideHead.append(parts.meAvatar, me, newBtn);

        const searchWrap = el('div', { class: 'egdc-search' });
        parts.search = el('input', { type: 'search', placeholder: 'Zoek gesprek…' });
        parts.search.setAttribute('aria-label', 'Zoek gesprek');
        parts.search.addEventListener('input', function () {
            state.filter = parts.search.value.trim().toLowerCase();
            renderRooms();
        });
        searchWrap.appendChild(parts.search);

        parts.rooms = el('div', { class: 'egdc-rooms' });

        const foot = el('div', { class: 'egdc-side-foot' });
        parts.status = el('span', { class: 'egdc-status' });
        const gear = el('button', {
            type: 'button',
            class: 'egdc-iconbtn',
            title: 'Instellingen',
            html: ICON_GEAR,
            onClick: function () { showView('settings'); }
        });
        foot.append(parts.status, gear);

        side.append(sideHead, searchWrap, parts.rooms, foot);

        const main = el('section', { class: 'egdc-main' });
        parts.main = main;
        parts.mainHead = el('header', { class: 'egdc-main-head' });
        parts.mainBody = el('div', { class: 'egdc-main-body' });
        parts.composer = buildComposer();
        main.append(parts.mainHead, parts.mainBody, parts.composer);

        if (main && main.addEventListener) {
            ['dragenter', 'dragover'].forEach(function (name) {
                main.addEventListener(name, function (event) {
                    event.preventDefault();
                    event.stopPropagation();
                    main.classList.add('egdc-drop');
                });
            });
            ['dragleave', 'dragend'].forEach(function (name) {
                main.addEventListener(name, function (event) {
                    event.preventDefault();
                    event.stopPropagation();
                    main.classList.remove('egdc-drop');
                });
            });
            main.addEventListener('drop', function (event) {
                event.preventDefault();
                event.stopPropagation();
                main.classList.remove('egdc-drop');
                const files = event.dataTransfer && event.dataTransfer.files;
                if (files && files.length) selectAttachment(files[0]);
            });
        }

        body.append(side, main);
        modal.append(head, body);
        root.appendChild(modal);
        document.body.appendChild(root);

        root.addEventListener('click', function (event) {
            if (event.target === root) close();
        });

        keyHandler = function (event) {
            if (event.key === 'Escape' && root && root.parentNode) close();
        };
        document.addEventListener('keydown', keyHandler);
    }

    function close() {
        openToken++;
        cleanupSubs();
        stopProbeLoop();
        if (networkHandler) {
            try {
                window.removeEventListener('online', networkHandler);
                window.removeEventListener('offline', networkHandler);
            } catch (err) {}
            networkHandler = null;
        }
        state.online = 'unknown';
        state.onlineError = '';
        if (keyHandler) {
            try { document.removeEventListener('keydown', keyHandler); } catch (err) {}
            keyHandler = null;
        }
        if (root && root.parentNode) root.parentNode.removeChild(root);
        root = null;
        modal = null;
        parts = {};
        state.activeRoomId = null;
        state.messages = [];
        state.pendingPeer = null;
        state.view = 'chat';
        clearAttachment();
        resetMessageUi();
        closeEmojiPicker();
    }

    function cleanupSubs() {
        if (unsubRooms) { try { unsubRooms(); } catch (err) {} unsubRooms = null; }
        if (unsubMessages) { try { unsubMessages(); } catch (err) {} unsubMessages = null; }
    }

    // ------------------------------------------------------------
    // Open / boot
    // ------------------------------------------------------------

    async function open() {
        if (root) return;

        state.view = 'chat';
        state.filter = '';
        state.activeRoomId = null;
        state.messages = [];
        state.rooms = [];
        state.roomsError = '';
        state.messagesError = '';
        state.picked = new Map();
        state.newFilter = '';
        state.groupName = '';
        state.pendingPeer = null;
        state.pendingFile = null;
        state.pendingPreviewUrl = null;
        state.uploading = false;
        state.uploadProgress = 0;
        state.directory = { users: [], error: '', loading: true, fetchedAt: 0, cached: false };
        state.backend = { kind: 'none', error: '' };
        autoSelected = false;

        state.baseIdentity = Identity.detect();
        applyIdentity();
        const identityKeysBefore = Transport.keysOf(state.baseIdentity).join('|');

        build();
        renderChrome();
        renderMain();

        const token = ++openToken;

        networkHandler = function () {
            if (!navigator.onLine) {
                state.online = 'offline';
                state.onlineError = 'Geen internetverbinding.';
                renderStatus();
                renderRooms();
                renderMessages();
                return;
            }
            checkConnection(true);
        };
        try {
            window.addEventListener('online', networkHandler);
            window.addEventListener('offline', networkHandler);
        } catch (err) {}

        // Connect first. Firebase only needs the user id, not the
        // Egodact directory, so a slow or blocked API request must
        // never keep the chat on "Verbinden…".
        const transportTask = startTransport(token);

        const directoryTask = (async function () {
            let result;
            try {
                result = await Directory.load({ authSub: state.baseIdentity.authSub });
            } catch (err) {
                result = {
                    users: [],
                    fetchedAt: 0,
                    cached: false,
                    error: String(err && err.message || err),
                    debug: null,
                    selfProfile: null
                };
            }
            if (token !== openToken || !root) return;

            state.directory = {
                users: result.users || [],
                error: result.error || '',
                loading: false,
                fetchedAt: result.fetchedAt || 0,
                cached: !!result.cached,
                debug: result.debug || null
            };

            const previousIdentityId = String(state.identity && state.identity.id || '');
            const resolvedByDirectory = state.directory.users.length > 0;

            if (state.directory.users.length) {
                state.baseIdentity = Identity.resolveFromDirectory(state.baseIdentity, state.directory.users);
                applyIdentity();
            }
            // If we fetched the user's own profile, adopt it directly. Only
            // override the id when the directory did not already resolve one:
            // the directory id is what other clients see in their own
            // directory, so keeping it consistent is what makes rooms and
            // messages sync across users.
            if (result.selfProfile) {
                if (resolvedByDirectory && state.identity && state.identity.source === 'egodact') {
                    // Keep the directory-resolved id; just refresh metadata.
                    const sp = result.selfProfile;
                    if (sp.name) state.baseIdentity.name = sp.name;
                    if (sp.firstName) state.baseIdentity.firstName = sp.firstName;
                    if (sp.email) state.baseIdentity.email = sp.email;
                    if (sp.picture) state.baseIdentity.photo = sp.picture;
                    applyIdentity();
                } else {
                    state.baseIdentity = Identity.adopt(state.baseIdentity, result.selfProfile);
                    applyIdentity();
                }
            }

            // The id other clients see in their directory is often a
            // name-derived 'u_...' id, while /auth/me returns a numeric
            // id. Use the directory-style id as primary and keep the
            // numeric one as alias, otherwise every user sits in a room
            // nobody else can see.
            state.baseIdentity = Identity.alignWithDirectory(
                state.baseIdentity,
                state.directory.users,
                result.selfProfile
            );
            applyIdentity();

            renderChrome();
            renderMain();

            // Rooms that arrived before the directory did can now be healed.
            healRooms(state.rooms);

            const identityChanged = String(state.identity && state.identity.id || '') !== previousIdentityId ||
                Transport.keysOf(state.identity).join('|') !== identityKeysBefore;

            // The name/e-mail may have changed; hand the fresh identity
            // to the transport. If the Egodact user id changed (Auth0 sub
            // -> real Egodact id), the room subscription must be rebuilt
            // too, otherwise messages/rooms stay filtered on the old id.
            try {
                if (identityChanged) {
                    await restartTransport();
                } else {
                    await Transport.init(state.identity);
                }
            } catch (err) {}
            if (token !== openToken || !root) return;
            renderChrome();
        })();

        await Promise.allSettled([transportTask, directoryTask]);
    }

    async function startTransport(token, force) {
        cleanupSubs();
        state.backend = { kind: 'none', error: '' };
        renderChrome();

        let result;
        try {
            result = await Transport.init(state.identity, force ? { force: true } : undefined);
        } catch (err) {
            console.error('Egodact Chat: transport starten mislukt.', err);
            result = { kind: 'local', error: String(err && err.message || err) };
        }
        if (token !== openToken || !root) return;

        state.backend = {
            kind: result.kind || 'local',
            error: result.error || ''
        };
        renderChrome();
        renderIdentity();
        renderMain();

        if (result.error) {
            console.warn('Egodact Chat: ' + result.error);
            toast('Chat gebruikt lokale modus: ' + result.error, 'error', 7000);
        }

        unsubRooms = Transport.listRooms(onRooms);
        checkConnection(true);
        startProbeLoop();
    }

    // ------------------------------------------------------------
    // Connection health
    // ------------------------------------------------------------
    // Firestore happily queues writes while it is offline, so the UI
    // looks fine even when the other side receives nothing. A server
    // round-trip is the only reliable way to tell the difference.
    async function checkConnection(silent) {
        if (!root || state.backend.kind !== 'firebase' || probing) return;
        probing = true;
        const wasOffline = state.online === 'offline';
        if (!silent) {
            renderStatus();
            renderRooms();
        }
        let result;
        try {
            result = await Transport.checkConnection();
        } catch (err) {
            result = { ok: false, error: String(err && err.message || err) };
        }
        probing = false;
        if (!root) return;
        const ok = !!(result && result.ok);
        state.online = ok ? 'ok' : 'offline';
        state.onlineError = ok ? '' : ((result && result.error) || 'Geen verbinding met Firebase.');
        if (ok && wasOffline) {
            toast('Weer verbonden met Firebase.', 'success', 3000);
        }
        renderStatus();
        renderRooms();
        renderMessages();
    }

    function startProbeLoop() {
        stopProbeLoop();
        probeTimer = setInterval(function () {
            if (!root || document.hidden) return;
            checkConnection(true);
        }, 25000);
    }

    function stopProbeLoop() {
        if (probeTimer) {
            clearInterval(probeTimer);
            probeTimer = null;
        }
    }

    async function restartTransport() {
        const token = openToken;
        state.rooms = [];
        state.activeRoomId = null;
        state.messages = [];
        state.roomsError = '';
        state.messagesError = '';
        autoSelected = false;
        if (modal) modal.classList.remove('has-room');

        state.backend = { kind: 'none', error: '' };
        renderChrome();
        renderMain();

        await startTransport(token, true);
    }

    // Older room documents only contain Egodact ids. Add the known
    // e-mail keys so the other participant's subscription matches the
    // room even when the two clients spell that person's id differently.
    function healRooms(rooms) {
        const directory = state.directory && state.directory.users || [];
        if (!directory.length || !state.identity) return;

        const byKey = {};
        directory.forEach(function (user) {
            byKey[String(user.id)] = user;
            byKey[String(user.id).toLowerCase()] = user;
            if (user.email) {
                const email = String(user.email).toLowerCase();
                byKey[email] = user;
                byKey[String(user.email)] = user;
            }
        });

        rooms.forEach(function (room) {
            if (!room || !room.id) return;
            if (room.type !== 'dm' && room.type !== 'group') return;

            const members = (room.members || []).map(String);
            const users = [];
            const seen = {};

            function addUser(user) {
                if (!user || !user.id) return;
                const key = String(user.id);
                if (seen[key]) return;
                seen[key] = true;
                users.push(user);
            }

            members.forEach(function (member) {
                addUser(byKey[member] || byKey[member.toLowerCase()]);
            });
            addUser(state.identity);

            const wanted = [];
            users.forEach(function (user) {
                wanted.push(String(user.id));
                (user.aliases || []).forEach(function (id) {
                    if (id) wanted.push(String(id));
                });
                if (user.email) wanted.push(String(user.email).toLowerCase());
            });

            const missing = wanted.filter(function (key) {
                return key && members.indexOf(key) === -1;
            });
            if (!missing.length) return;

            const signature = room.id + '|' + missing.sort().join(',');
            if (healedRoomKeys.has(signature)) return;
            healedRoomKeys.add(signature);

            try {
                Transport.addMemberKeys(room.id, users).catch(function () {});
            } catch (err) {}
        });
    }

    // Older versions could create two DM rooms for the same pair of
    // people (one per client). When the peer writes into another room
    // with the same peer, follow them there so replies are seen live.
    function maybeFollowPeerRoom() {
        if (state.view !== 'chat' || !state.activeRoomId) return;
        const active = state.rooms.find(function (r) { return r.id === state.activeRoomId; });
        if (!active || active.type !== 'dm') return;

        const peerKeys = peerMemberKeys(active).map(function (key) {
            return String(key).toLowerCase();
        });
        if (!peerKeys.length) return;

        const myId = String(state.identity && state.identity.id || '');
        const activeAt = active.lastMessageAt || active.createdAt || 0;
        let best = null;

        state.rooms.forEach(function (room) {
            if (!room || room.id === active.id || room.type !== 'dm') return;
            if (String(room.lastMessageSender || '') === myId) return;
            const keys = peerMemberKeys(room).map(function (key) {
                return String(key).toLowerCase();
            });
            const samePeer = keys.some(function (key) {
                return peerKeys.indexOf(key) !== -1;
            });
            if (!samePeer) return;
            const at = room.lastMessageAt || room.createdAt || 0;
            if (at <= activeAt) return;
            if (!best || at > (best.lastMessageAt || best.createdAt || 0)) best = room;
        });

        if (best) selectRoom(best.id);
    }

    function onRooms(rooms, meta) {
        if (!root) return;
        const allRooms = Array.isArray(rooms) ? rooms : [];
        const hidden = hiddenRoomIds();
        state.rooms = allRooms.filter(function (room) {
            return room && !hidden[room.id];
        });
        state.roomsError = (meta && meta.error) || '';
        if (meta && meta.fromCache === false && state.online !== 'ok') {
            state.online = 'ok';
            state.onlineError = '';
            renderStatus();
        }
        healRooms(allRooms);
        renderRooms();

        if (state.view === 'chat') {
            renderChatHead();

            if (!state.activeRoomId && state.rooms.length && !autoSelected &&
                window.innerWidth > 780) {
                autoSelected = true;
                selectRoom(state.rooms[0].id);
                return;
            }

            maybeFollowPeerRoom();
        }

    }

    // ------------------------------------------------------------
    // Chrome (identity, status, room list)
    // ------------------------------------------------------------

    function renderChrome() {
        if (!root) return;
        renderIdentity();
        renderStatus();
        renderRooms();
    }

    function renderIdentity() {
        if (!parts.meAvatar || !state.identity) return;
        clear(parts.meAvatar);
        parts.meAvatar.appendChild(makeAvatar(state.identity, 36));
        parts.meName.textContent = state.identity.name || 'Student';
        parts.meSub.textContent = backendText();
    }

    function renderStatus() {
        if (!parts.status) return;
        const kind = state.backend.kind;
        const offline = kind === 'firebase' && state.online === 'offline';
        parts.badge.textContent = kind === 'firebase'
            ? (offline ? 'Offline' : 'Firebase')
            : (kind === 'local' ? 'Lokaal' : '…');
        parts.badge.className = 'egdc-badge' + (kind === 'firebase' ? (offline ? ' off' : ' on') : '');

        const error = state.backend.error || Transport.lastError() || state.roomsError || '';
        if (offline) {
            parts.status.textContent = 'Offline: berichten worden bewaard en later verzonden.';
            parts.status.title = state.onlineError || 'Geen verbinding met Firebase.';
            return;
        }
        parts.status.textContent = error || backendText();
        parts.status.title = error || (kind === 'local'
            ? 'Lokale demo: berichten blijven in deze browser.'
            : (kind === 'firebase' ? 'Verbonden met Firebase.' : 'Verbinden…'));
    }

    function renderRooms() {
        if (!parts.rooms) return;
        clear(parts.rooms);

        if (state.backend.error && state.backend.kind !== 'firebase') {
            parts.rooms.appendChild(notice(
                'Niet verbonden met Firebase: ' + state.backend.error,
                'error',
                'Opnieuw',
                function () { restartTransport(); }
            ));
        }

        if (state.roomsError) {
            parts.rooms.appendChild(notice(state.roomsError, 'error'));
        }

        if (state.backend.kind === 'firebase' && state.online === 'offline') {
            parts.rooms.appendChild(notice(
                'Geen verbinding met Firebase. Nieuwe berichten komen pas binnen zodra je weer online bent.',
                'warn',
                'Opnieuw',
                function () { checkConnection(true); }
            ));
        }

        const filter = state.filter;
        const rooms = state.rooms.filter(function (room) {
            if (!filter) return true;
            return roomDisplay(room).name.toLowerCase().indexOf(filter) !== -1;
        });

        if (!rooms.length) {
            const text = state.rooms.length
                ? 'Geen gesprek gevonden.'
                : (state.backend.kind === 'none' ? 'Gesprekken laden…' : 'Nog geen gesprekken. Start er een met +.');
            parts.rooms.appendChild(el('div', {
                class: 'egdc-empty-text',
                text: text,
                style: { padding: '18px 6px', textAlign: 'center' }
            }));
            return;
        }

        const read = Store.readMap(state.identity.id);
        const meId = String(state.identity.id);

        rooms.forEach(function (item) {
            const display = roomDisplay(item);
            const row = el('div', {
                class: 'egdc-room' + (item.id === state.activeRoomId ? ' active' : ''),
                role: 'button',
                tabIndex: 0
            });
            row.appendChild(makeAvatar(display, 36));

            const body = el('div', { class: 'egdc-room-body' });
            const top = el('div', { class: 'egdc-room-top' });
            top.appendChild(el('div', { class: 'egdc-room-name', text: display.name }));
            top.appendChild(el('div', { class: 'egdc-room-time', text: roomTimeText(item.lastMessageAt) }));

            const lastText = item.lastMessage
                ? (String(item.lastMessageSender) === meId ? 'Jij: ' : '') + item.lastMessage
                : 'Nog geen berichten';

            body.append(top, el('div', { class: 'egdc-room-last', text: lastText }));
            row.appendChild(body);

            const readAt = read[item.id] || 0;
            const unread = item.lastMessageAt > (readAt + 1500) &&
                String(item.lastMessageSender) !== meId;
            if (unread) row.appendChild(el('span', { class: 'egdc-unread' }));

            row.appendChild(el('button', {
                type: 'button',
                class: 'egdc-iconbtn egdc-room-close',
                title: 'Gesprek sluiten',
                html: ICON_CLOSE,
                onClick: function (event) {
                    event.stopPropagation();
                    hideRoom(item.id);
                }
            }));

            row.addEventListener('click', function () { selectRoom(item.id); });
            row.addEventListener('keydown', function (event) {
                if (event.target !== row) return;
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    selectRoom(item.id);
                }
            });

            parts.rooms.appendChild(row);
        });
    }

    // ------------------------------------------------------------
    // Main pane
    // ------------------------------------------------------------

    function showView(view) {
        state.view = view;
        if (view === 'new') {
            state.picked = new Map();
            state.newFilter = '';
            state.groupName = '';
            state.pendingPeer = null;
        }
        renderMain();
        renderRooms();
    }

    function selectRoom(roomId, peer) {
        if (!roomId) return;
        state.pendingPeer = peer || null;
        state.activeRoomId = roomId;
        state.view = 'chat';
        state.messages = [];
        state.messagesError = '';
        resetMessageUi();
        clearAttachment();

        if (unsubMessages) { try { unsubMessages(); } catch (err) {} unsubMessages = null; }

        const room = currentRoom();
        Store.markRead(state.identity.id, roomId, Date.now());

        if (modal) {
            modal.classList.add('has-room');
            modal.classList.remove('panel-open');
        }

        renderMain();
        renderRooms();

        unsubMessages = Transport.watchMessages(roomId, function (messages, meta) {
            if (state.activeRoomId !== roomId || !root) return;
            state.messages = Array.isArray(messages) ? messages : [];
            state.messagesError = (meta && meta.error) || '';
            renderMessages();
            Store.markRead(state.identity.id, roomId, Date.now());
        });

        if (!room) {
            // The room document may still be on its way; the metadata
            // listener will refresh the header when it arrives.
            setTimeout(function () {
                if (state.activeRoomId === roomId) renderChatHead();
            }, 600);
        }

        setTimeout(function () {
            if (state.activeRoomId === roomId && parts.input) {
                try { parts.input.focus(); } catch (err) {}
            }
        }, 50);
    }

    function resetMessageUi() {
        state.editingId = '';
        state.editDraft = '';
    }

    function leaveRoom() {
        state.activeRoomId = null;
        state.messages = [];
        state.messagesError = '';
        state.pendingPeer = null;
        resetMessageUi();
        clearAttachment();
        if (unsubMessages) { try { unsubMessages(); } catch (err) {} unsubMessages = null; }
        if (modal) modal.classList.remove('has-room');
        renderMain();
        renderRooms();
    }

    function renderMain() {
        if (!modal) return;
        modal.classList.toggle('panel-open', state.view !== 'chat');

        clear(parts.mainBody);
        parts.messages = null;
        parts.pickList = null;
        parts.pickChips = null;
        parts.pickName = null;
        parts.pickAction = null;
        parts.pickCount = null;

        if (state.view === 'chat') {
            modal.classList.toggle('has-room', !!state.activeRoomId);
            renderChatHead();

            if (state.activeRoomId) {
                parts.composer.style.display = 'flex';
                parts.messages = el('div', { class: 'egdc-messages' });
                parts.mainBody.appendChild(parts.messages);
                renderMessages();
            } else {
                parts.composer.style.display = 'none';
                parts.mainBody.appendChild(emptyState());
            }
            return;
        }

        parts.composer.style.display = 'none';
        if (state.view === 'new') renderNewPanel();
        else if (state.view === 'settings') renderSettingsPanel();
    }

    function backButton(handler, alwaysVisible) {
        return el('button', {
            type: 'button',
            class: 'egdc-iconbtn egdc-back' + (alwaysVisible ? ' egdc-back-panel' : ''),
            title: 'Terug',
            html: ICON_BACK,
            onClick: handler
        });
    }

    function renderPanelHead(title, subtitle) {
        clear(parts.mainHead);
        parts.mainHead.style.display = 'flex';
        parts.mainHead.appendChild(backButton(function () { showView('chat'); }, true));
        const text = el('div', { class: 'egdc-main-headtext' });
        text.append(
            el('div', { class: 'egdc-main-title', text: title }),
            el('div', { class: 'egdc-main-sub', text: subtitle || '' })
        );
        parts.mainHead.appendChild(text);
    }

    function renderChatHead() {
        if (!parts.mainHead) return;
        clear(parts.mainHead);

        if (!state.activeRoomId) {
            parts.mainHead.style.display = 'none';
            return;
        }

        parts.mainHead.style.display = 'flex';
        parts.mainHead.appendChild(backButton(leaveRoom));

        const room = currentRoom();
        const display = roomDisplay(room);
        parts.mainHead.appendChild(makeAvatar(display, 32));

        const text = el('div', { class: 'egdc-main-headtext' });
        text.append(
            el('div', { class: 'egdc-main-title', text: display.name }),
            el('div', { class: 'egdc-main-sub', text: roomSubtitle(room) })
        );
        parts.mainHead.appendChild(text);

        parts.mainHead.appendChild(el('button', {
            type: 'button',
            class: 'egdc-iconbtn',
            title: 'Gesprek sluiten',
            html: ICON_CLOSE,
            onClick: function () { hideRoom(state.activeRoomId); }
        }));
    }

    function emptyState() {
        const wrap = el('div', { class: 'egdc-empty' });
        wrap.append(
            el('span', { class: 'egdc-empty-icon', html: ICON_CHAT }),
            el('div', { class: 'egdc-empty-title', text: 'Nog geen gesprek open' }),
            el('div', {
                class: 'egdc-empty-text',
                text: 'Kies links een gesprek of start een nieuwe chat met iemand uit je Egodact-challenges.'
            })
        );
        wrap.appendChild(el('button', {
            type: 'button',
            class: 'egdc-btn primary',
            text: 'Nieuw gesprek',
            onClick: function () { showView('new'); }
        }));
        return wrap;
    }

    function renderMessages() {
        if (!parts.messages || !state.identity) return;
        const box = parts.messages;

        const nearBottom = !box.dataset.filled ||
            (box.scrollHeight - box.scrollTop - box.clientHeight < 140);

        clear(box);

        if (state.messagesError) {
            box.appendChild(notice(state.messagesError, 'error', 'Opnieuw verbinden', restartTransport));
        }

        if (state.backend.kind === 'firebase' && state.online === 'offline') {
            box.appendChild(notice(
                'Offline: dit gesprek ververst pas als de verbinding terug is.',
                'warn',
                'Opnieuw',
                function () { checkConnection(true); }
            ));
        }

        if (!state.messages.length) {
            if (!state.messagesError) {
                box.appendChild(el('div', {
                    class: 'egdc-empty-text',
                    text: 'Nog geen berichten. Zeg hallo!',
                    style: { textAlign: 'center', margin: 'auto' }
                }));
            }
        } else {
            const meId = String(state.identity.id);
            const room = currentRoom();
            const showSender = !room || room.type === 'group';
            let lastDay = '';

            state.messages.forEach(function (message) {
                const key = dayKey(message.createdAt);
                if (key !== lastDay) {
                    lastDay = key;
                    box.appendChild(el('div', { class: 'egdc-day', text: dayLabel(message.createdAt) }));
                }

                // Older messages may carry an alias of our id (for
                // example the Auth0/directory spelling), so match any
                // key that belongs to this account, not just the
                // current id.
                const mine = String(message.senderId) === meId ||
                    isSelfMemberKey(message.senderId);
                const row = el('div', { class: 'egdc-msg' + (mine ? ' mine' : '') });
                if (!mine) {
                    row.appendChild(makeAvatar({
                        name: message.senderName,
                        firstName: String(message.senderName || '?').split(/\s+/)[0],
                        photo: message.senderPhoto
                    }, 28));
                }

                const content = el('div', { class: 'egdc-msg-content' });
                if (!mine && showSender) {
                    content.appendChild(el('div', { class: 'egdc-msg-sender', text: message.senderName || 'Onbekend' }));
                }

                if (state.editingId === message.id) {
                    if (message.attachment) content.appendChild(buildAttachment(message));
                    content.appendChild(buildEditBox(message));
                } else {
                    if (message.attachment) content.appendChild(buildAttachment(message));
                    if (message.text) content.appendChild(el('div', { class: 'egdc-bubble', text: message.text }));
                    const embeds = gifEmbeds(message.text);
                    if (embeds.length) {
                        const box = el('div', { class: 'egdc-embeds' });
                        embeds.forEach(function (embed) {
                            if (embed.type === 'img') {
                                const img = el('img', { class: 'egdc-embed-gif', src: embed.src, alt: 'GIF' });
                                img.loading = 'lazy';
                                box.appendChild(img);
                                inlineOrFallback(img, embed.src, function () {
                                    img.replaceWith(buildMediaLink(embed.src, '', 'Afbeelding openen'));
                                });
                            } else if (embed.type === 'iframe') {
                                const iframe = el('iframe', { class: 'egdc-embed-iframe', src: embed.src, frameborder: '0', allowfullscreen: '' });
                                iframe.setAttribute('allow', 'autoplay; fullscreen');
                                box.appendChild(iframe);
                            } else if (embed.type === 'video') {
                                const video = el('video', { class: 'egdc-embed-video', controls: '', preload: 'metadata' });
                                video.src = embed.src;
                                video.setAttribute('playsinline', '');
                                video.addEventListener('error', function () {
                                    console.warn('Egodact Chat: embed video kon niet afspelen.', video.error, embed.src);
                                    video.replaceWith(buildMediaLink(embed.src, '', 'Video openen'));
                                });
                                box.appendChild(video);
                            }
                        });
                        content.appendChild(box);
                    }
                }

                content.appendChild(el('div', {
                    class: 'egdc-msg-meta',
                    text: timeText(message.createdAt) +
                        (message.editedAt ? ' · bewerkt' : '') +
                        (message.pending ? ' · verzenden…' : '')
                }));

                const reactions = reactionEntries(message);
                if (reactions.length) {
                    const bar = el('div', { class: 'egdc-reactions' });
                    reactions.forEach(function (entry) {
                        const active = entry.users.indexOf(meId) !== -1;
                        bar.appendChild(el('button', {
                            type: 'button',
                            class: 'egdc-reaction' + (active ? ' active' : ''),
                            title: active ? 'Jij reageerde met ' + entry.emoji : entry.emoji,
                            text: entry.emoji + ' ' + entry.users.length,
                            onClick: function () { toggleReaction(message, entry.emoji); }
                        }));
                    });
                    content.appendChild(bar);
                }

                row.appendChild(content);
                row.appendChild(buildMessageActions(message, mine));
                box.appendChild(row);
            });
        }

        box.dataset.filled = '1';
        if (nearBottom) box.scrollTop = box.scrollHeight;
    }

    function selectAttachment(file) {
        if (!file) return;
        try {
            Transport.validateAttachment(file);
        } catch (err) {
            toast(String(err && err.message || 'Ongeldig bestand.'), 'error', 5000);
            return;
        }
        if (state.pendingPreviewUrl) {
            try { URL.revokeObjectURL(state.pendingPreviewUrl); } catch (err) {}
            state.pendingPreviewUrl = null;
        }
        state.pendingFile = file;
        if (Transport.attachmentType(file) === 'image') {
            try { state.pendingPreviewUrl = URL.createObjectURL(file); } catch (err) {}
        }
        renderAttachBar();
        updateComposer();
    }

    function clearAttachment() {
        if (state.pendingPreviewUrl) {
            try { URL.revokeObjectURL(state.pendingPreviewUrl); } catch (err) {}
            state.pendingPreviewUrl = null;
        }
        state.pendingFile = null;
        state.uploadProgress = 0;
        renderAttachBar();
        updateComposer();
    }

    function renderAttachBar() {
        if (!parts.attachBar) return;
        clear(parts.attachBar);
        const file = state.pendingFile;
        if (!file) {
            parts.attachBar.style.display = 'none';
            return;
        }
        parts.attachBar.style.display = 'flex';
        const chip = el('div', { class: 'egdc-attach-chip' });
        if (Transport.attachmentType(file) === 'image' && state.pendingPreviewUrl) {
            chip.appendChild(el('img', { class: 'egdc-attach-thumb', src: state.pendingPreviewUrl, alt: '' }));
        } else {
            chip.appendChild(el('span', { class: 'egdc-attach-icon', text: '\ud83d\udcc4' }));
        }
        const info = el('div', { class: 'egdc-attach-info' });
        info.append(
            el('span', { class: 'egdc-attach-name', text: file.name || 'bestand' }),
            el('span', { class: 'egdc-attach-size', text: Transport.attachmentSizeLabel(file.size) })
        );
        chip.appendChild(info);
        chip.appendChild(el('button', {
            type: 'button',
            class: 'egdc-attach-remove',
            title: 'Verwijderen',
            text: '\u00d7',
            onClick: function () { clearAttachment(); }
        }));
        parts.attachBar.appendChild(chip);

        if (state.uploading) {
            const progress = el('div', { class: 'egdc-attach-progress' });
            const bar = el('div', { class: 'egdc-attach-progress-bar' });
            const fill = el('span');
            fill.style.width = Math.round((state.uploadProgress || 0) * 100) + '%';
            bar.appendChild(fill);
            progress.append(bar, el('span', { class: 'egdc-attach-percent', text: Math.round((state.uploadProgress || 0) * 100) + '%' }));
            parts.attachBar.appendChild(progress);
        }
    }

    function updateAttachProgress() {
        if (!parts.attachBar) return;
        const fill = parts.attachBar.querySelector('.egdc-attach-progress-bar span');
        if (fill) fill.style.width = Math.round((state.uploadProgress || 0) * 100) + '%';
        const label = parts.attachBar.querySelector('.egdc-attach-percent');
        if (label) label.textContent = Math.round((state.uploadProgress || 0) * 100) + '%';
    }

    function updateComposer() {
        if (!parts.sendBtn) return;
        parts.sendBtn.disabled = !!state.uploading;
    }

    // The Egodact page ships a strict Content-Security-Policy that only
    // allows images from its own domain. Media from Cloudinary or Tenor is
    // therefore refused by the browser even though the URL is fine. The
    // extension relaxes that policy (rules/csp_media.json). As a second
    // line of defence the bytes are fetched from the extension context and
    // handed to the <img> as a data URL, which the policy always allows.
    function remoteToDataUrl(url) {
        return fetch(url, { credentials: 'omit' }).then(function (res) {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.blob();
        }).then(function (blob) {
            return new Promise(function (resolve, reject) {
                const reader = new FileReader();
                reader.onload = function () { resolve(String(reader.result || '')); };
                reader.onerror = function () { reject(new Error('Bestand lezen mislukt.')); };
                reader.readAsDataURL(blob);
            });
        });
    }

    function inlineOrFallback(img, url, onFail) {
        let retried = false;
        img.addEventListener('error', function () {
            if (retried) {
                if (onFail) onFail();
                return;
            }
            retried = true;
            remoteToDataUrl(url).then(function (dataUrl) {
                img.src = dataUrl;
            }).catch(function () {
                if (onFail) onFail();
            });
        });
    }

    function buildMediaLink(url, name, label) {
        const link = el('a', {
            class: 'egdc-attach-link',
            href: url,
            target: '_blank',
            rel: 'noopener noreferrer',
            text: label || 'Openen in een nieuw tabblad'
        });
        if (name) link.title = name;
        return link;
    }

    function buildMediaFallback(url, name, message) {
        const box = el('div', { class: 'egdc-attach-error' });
        box.appendChild(el('div', { text: message || 'Deze bijlage kan niet in de chat worden getoond.' }));
        box.appendChild(buildMediaLink(url, name, 'Openen in een nieuw tabblad'));
        return box;
    }

    function buildAttachment(message) {
        const att = (message && message.attachment) || {};
        const kind = att.type || 'file';
        const wrap = el('div', { class: 'egdc-attach' });
        const loading = el('div', { class: 'egdc-attach-loading', text: 'Bijlage laden…' });
        wrap.appendChild(loading);
        Transport.attachmentUrl(att).then(function (url) {
            clear(wrap);
            if (!url) {
                wrap.appendChild(el('div', { class: 'egdc-attach-error', text: 'Bijlage niet beschikbaar.' }));
                return;
            }
            if (kind === 'image') {
                const link = el('a', { class: 'egdc-attach-media', href: url, target: '_blank', rel: 'noopener noreferrer' });
                const img = el('img', { class: 'egdc-attach-image', src: url, alt: att.name || 'Afbeelding' });
                link.appendChild(img);
                wrap.appendChild(link);
                inlineOrFallback(img, url, function () {
                    clear(wrap);
                    wrap.appendChild(buildMediaFallback(url, att.name, 'Afbeelding kan niet in de chat worden getoond.'));
                });
            } else if (kind === 'video') {
                const video = el('video', { class: 'egdc-attach-video', controls: '', preload: 'metadata' });
                video.src = url;
                video.setAttribute('playsinline', '');
                video.addEventListener('error', function () {
                    console.warn('Egodact Chat: video kon niet afspelen.', video.error, url);
                    clear(wrap);
                    wrap.appendChild(buildMediaFallback(url, att.name, 'Video kan niet in de chat worden afgespeeld.'));
                });
                wrap.appendChild(video);
                wrap.appendChild(buildMediaLink(url, att.name, 'Video openen in een nieuw tabblad'));
            } else if (kind === 'audio') {
                const audio = el('audio', { class: 'egdc-attach-audio', controls: '', preload: 'metadata' });
                audio.src = url;
                wrap.appendChild(audio);
            } else {
                const link = el('a', { class: 'egdc-attach-file', href: url, target: '_blank', rel: 'noopener noreferrer', download: att.name || '' });
                link.appendChild(el('span', { class: 'egdc-attach-file-icon', html: ICON_FILE }));
                const body = el('span', { class: 'egdc-attach-file-body' });
                body.append(
                    el('span', { class: 'egdc-attach-file-name', text: att.name || 'Bestand' }),
                    el('span', { class: 'egdc-attach-file-size', text: Transport.attachmentSizeLabel(att.size) })
                );
                link.appendChild(body);
                link.appendChild(el('span', { class: 'egdc-attach-file-dl', html: ICON_DOWNLOAD }));
                wrap.appendChild(link);
            }
            if (att.name && kind !== 'file') {
                wrap.appendChild(el('div', { class: 'egdc-attach-name-line', text: att.name }));
            }
        }).catch(function () {
            clear(wrap);
            wrap.appendChild(el('div', { class: 'egdc-attach-error', text: 'Bijlage niet beschikbaar.' }));
        });
        return wrap;
    }

    function gifEmbeds(text) {
        const src = String(text || '');
        const out = [];
        const seen = new Set();

        // Tenor page URLs: https://tenor.com/.../view/...-gif-<id>
        const tenorRe = /https?:\/\/tenor\.com\/(?:[\w-]+\/)?view\/[^\s]*?-gif-(\d+)/gi;
        let m;
        while ((m = tenorRe.exec(src)) !== null) {
            const id = m[1];
            if (seen.has('tenor:' + id)) continue;
            seen.add('tenor:' + id);
            out.push({ type: 'iframe', src: 'https://tenor.com/embed/' + id });
        }

        // Direct GIF/image URLs
        const urlRe = /https?:\/\/[^\s<>"')]+/gi;
        let u;
        while ((u = urlRe.exec(src)) !== null) {
            const raw = u[0].replace(/[.,;:!?)]+$/, '');
            if (/\.(gif|png|jpg|jpeg|webp)(\?|$)/i.test(raw)) {
                if (seen.has(raw)) continue;
                seen.add(raw);
                out.push({ type: 'img', src: raw });
            } else if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(raw)) {
                if (seen.has(raw)) continue;
                seen.add(raw);
                out.push({ type: 'video', src: raw });
            }
        }

        return out;
    }

    async function send() {
        if (!parts.input || state.uploading) return;
        const text = parts.input.value.trim();
        const file = state.pendingFile;
        if (!text && !file) return;
        if (!state.activeRoomId) {
            toast('Kies eerst een gesprek.', 'info');
            return;
        }

        const roomId = state.activeRoomId;
        const previousText = parts.input.value;
        closeEmojiPicker();

        let attachment = null;
        if (file) {
            state.uploading = true;
            state.uploadProgress = 0;
            updateComposer();
            renderAttachBar();
            try {
                attachment = await Transport.uploadAttachment(roomId, file, function (fraction) {
                    state.uploadProgress = fraction;
                    updateAttachProgress();
                });
            } catch (err) {
                state.uploading = false;
                state.uploadProgress = 0;
                updateComposer();
                renderAttachBar();
                toast(String(err && err.message || 'Uploaden mislukt.'), 'error', 6000);
                return;
            }
        }

        parts.input.value = '';
        autoGrow();
        clearAttachment();
        state.uploading = false;
        state.uploadProgress = 0;
        updateComposer();

        try {
            await Transport.sendMessage(roomId, text, attachment);
        } catch (err) {
            if (attachment) {
                try { await Transport.deleteAttachment(attachment); } catch (e) {}
            }
            parts.input.value = previousText;
            autoGrow();
            if (file) selectAttachment(file);
            toast(String(err && err.message || 'Bericht versturen mislukt.'), 'error', 5000);
        }
    }

    // ------------------------------------------------------------
    // Message actions (react / edit / delete)
    // ------------------------------------------------------------

    function reactionEntries(message) {
        const map = (message && message.reactions) || {};
        return Object.keys(map).filter(function (emoji) {
            return Array.isArray(map[emoji]) && map[emoji].length;
        }).map(function (emoji) {
            return { emoji: emoji, users: map[emoji].map(String) };
        });
    }

    // New messages store the writing client in senderUid, so the rules
    // can verify ownership. Messages from before 1.1.0 have no
    // senderUid; the first edit claims them for this client (see
    // firestore.rules), so they become manageable too.
    function canManageMessage(message, mine) {
        if (!mine || !message || !message.id || message.pending) return false;
        if (state.backend.kind !== 'firebase') return true;
        if (!message.senderUid) return true;
        const uid = String(Transport.myUid ? Transport.myUid() : '');
        return !!uid && String(message.senderUid) === uid;
    }

    function buildMessageActions(message, mine) {
        const actions = el('div', { class: 'egdc-msg-actions' });
        // System notes and pending writes cannot be reacted to.
        if (!message || !message.id || message.pending || message.senderId === 'system') {
            return actions;
        }

        const reactBtn = el('button', {
            type: 'button',
            title: 'Reageren',
            text: '\ud83d\ude42',
            onClick: function (event) {
                event.stopPropagation();
                openEmojiPicker(reactBtn, function (emoji) {
                    closeEmojiPicker();
                    toggleReaction(message, emoji);
                });
            }
        });
        actions.appendChild(reactBtn);

        if (canManageMessage(message, mine)) {
            actions.appendChild(el('button', {
                type: 'button',
                title: 'Bewerken',
                text: '\u270e',
                onClick: function (event) {
                    event.stopPropagation();
                    state.editingId = message.id;
                    state.editDraft = message.text || '';
                    renderMessages();
                }
            }));
            actions.appendChild(el('button', {
                type: 'button',
                class: 'danger',
                title: 'Verwijderen',
                text: '\u2715',
                onClick: function (event) {
                    event.stopPropagation();
                    removeMessage(message);
                }
            }));
        }

        return actions;
    }

    async function toggleReaction(message, emoji) {
        if (!state.activeRoomId || !message || !message.id) return;
        const me = String(state.identity.id);
        const users = (message.reactions && message.reactions[emoji]) || [];
        const active = users.map(String).indexOf(me) !== -1;
        try {
            await Transport.setReaction(state.activeRoomId, message.id, emoji, !active);
        } catch (err) {
            toast(String(err && err.message || 'Reageren mislukt.'), 'error', 6000);
        }
    }

    function buildEditBox(message) {
        const box = el('div', { class: 'egdc-edit' });
        const area = el('textarea', { rows: 2 });
        area.value = state.editDraft !== '' ? state.editDraft : (message.text || '');
        area.addEventListener('input', function () { state.editDraft = area.value; });
        box.appendChild(area);

        const actions = el('div', { class: 'egdc-edit-actions' });
        actions.appendChild(el('button', {
            type: 'button',
            class: 'egdc-btn',
            text: 'Annuleren',
            onClick: function () {
                resetMessageUi();
                renderMessages();
            }
        }));
        actions.appendChild(el('button', {
            type: 'button',
            class: 'egdc-btn primary',
            text: 'Opslaan',
            onClick: function () { saveEdit(message, area.value); }
        }));
        box.appendChild(actions);

        area.addEventListener('keydown', function (event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                saveEdit(message, area.value);
            } else if (event.key === 'Escape') {
                resetMessageUi();
                renderMessages();
            }
        });

        setTimeout(function () {
            try {
                area.focus();
                area.setSelectionRange(area.value.length, area.value.length);
            } catch (err) {}
        }, 0);

        return box;
    }

    async function saveEdit(message, value) {
        const text = String(value || '').trim();
        if (!text) {
            toast('Een bericht mag niet leeg zijn.', 'info');
            return;
        }
        if (text === message.text) {
            resetMessageUi();
            renderMessages();
            return;
        }
        try {
            await Transport.editMessage(state.activeRoomId, message.id, text);
            resetMessageUi();
            renderMessages();
            toast('Bericht bewerkt.', 'success', 2200);
        } catch (err) {
            toast(String(err && err.message || 'Bewerken mislukt.'), 'error', 6000);
        }
    }

    async function removeMessage(message) {
        if (!state.activeRoomId || !message || !message.id) return;
        if (!window.confirm('Dit bericht verwijderen? Dit kan niet ongedaan worden gemaakt.')) return;
        try {
            await Transport.deleteMessage(state.activeRoomId, message.id, message.attachment);
            toast('Bericht verwijderd.', 'success', 2200);
        } catch (err) {
            toast(String(err && err.message || 'Verwijderen mislukt.'), 'error', 6000);
        }
    }

    // ------------------------------------------------------------
    // New chat / group
    // ------------------------------------------------------------

    function norm(value) {
        return String(value || '').trim().toLowerCase();
    }

    // Your own Egodact user should never show up in the picker, even
    // when the Auth0 identity could not be matched to a directory id.
    function isMe(user) {
        if (!user) return false;
        if (String(user.id) === String(state.identity.id)) return true;
        const myEmail = norm(state.identity.email);
        return !!(myEmail && user.email && norm(user.email) === myEmail);
    }

    function directoryUsers(filter) {
        const f = norm(filter);
        return state.directory.users.filter(function (user) {
            if (isMe(user)) return false;
            if (!f) return true;
            return norm(user.name).indexOf(f) !== -1 ||
                norm(user.firstName).indexOf(f) !== -1 ||
                norm(user.email).indexOf(f) !== -1;
        });
    }

    function directoryStatus() {
        if (state.directory.loading) return loadingNode('Gebruikers laden…');
        if (state.directory.error && !state.directory.users.length) {
            return notice(state.directory.error, 'error', 'Opnieuw proberen', retryDirectory);
        }
        if (!state.directory.users.length) {
            return notice(
                'Geen gebruikers gevonden. Je deelt blijkbaar nog geen challenges met iemand, of je Egodact-sessie is verlopen.',
                'info',
                'Opnieuw proberen',
                retryDirectory
            );
        }
        if (state.directory.error) {
            return notice('Offline cache gebruikt: ' + state.directory.error, 'warn', 'Verversen', retryDirectory);
        }
        return null;
    }

    function renderNewPanel() {
        renderPanelHead('Nieuw gesprek', 'Kies een of meer mensen uit je Egodact-challenges.');

        const panel = el('div', { class: 'egdc-panel' });

        const search = el('input', { class: 'egdc-input', type: 'search', placeholder: 'Zoek op naam of school-e-mail…' });
        search.value = state.newFilter;
        search.setAttribute('aria-label', 'Zoek op naam');
        let searchTimer = null;
        search.addEventListener('input', function () {
            state.newFilter = search.value;
            if (searchTimer) clearTimeout(searchTimer);
            searchTimer = setTimeout(function () {
                doAutocompleteSearch(state.newFilter);
            }, 300);
            renderPickRows();
        });

        const toolbar = el('div', { class: 'egdc-toolbar' });
        toolbar.append(
            el('button', {
                type: 'button',
                class: 'egdc-btn',
                html: ICON_REFRESH + '<span>Verversen</span>',
                onClick: retryDirectory
            }),
            el('span', {
                class: 'egdc-muted egdc-grow',
                text: state.directory.users.length
                    ? state.directory.users.length + ' mensen'
                    : ''
            })
        );

        parts.pickChips = el('div', { class: 'egdc-pickbar' });
        parts.pickList = el('div', { class: 'egdc-user-list' });

        parts.pickName = el('input', {
            class: 'egdc-input',
            type: 'text',
            placeholder: 'Naam van de groep (optioneel)'
        });
        parts.pickName.value = state.groupName;
        parts.pickName.style.display = 'none';
        parts.pickName.addEventListener('input', function () {
            state.groupName = parts.pickName.value;
        });

        parts.pickAction = el('button', {
            type: 'button',
            class: 'egdc-btn primary',
            text: 'Kies deelnemers',
            onClick: startConversation
        });
        parts.pickCount = el('span', { class: 'egdc-muted egdc-grow' });

        const foot = el('div', { class: 'egdc-pick-foot' });
        foot.append(
            parts.pickAction,
            el('button', {
                type: 'button',
                class: 'egdc-btn',
                text: 'Alles wissen',
                onClick: function () {
                    state.picked.clear();
                    state.groupName = '';
                    if (parts.pickName) parts.pickName.value = '';
                    renderPick();
                }
            }),
            parts.pickCount
        );

        panel.append(search, toolbar, parts.pickChips, parts.pickList, parts.pickName, foot);
        parts.mainBody.appendChild(panel);

        renderPick();
    }

    function userText(user) {
        const body = el('div', { class: 'egdc-user-body' });
        body.append(
            el('div', { class: 'egdc-user-name', text: user.name || user.firstName || 'Onbekend' }),
            el('div', { class: 'egdc-user-sub', text: user.email || 'Egodact-gebruiker' })
        );
        return body;
    }

    function renderPick() {
        renderPickChips();
        renderPickRows();
        updatePickFoot();
    }

    function renderPickChips() {
        if (!parts.pickChips) return;
        clear(parts.pickChips);
        parts.pickChips.style.display = state.picked.size ? 'flex' : 'none';

        state.picked.forEach(function (user) {
            const chip = el('span', { class: 'egdc-chip' });
            chip.append(
                makeAvatar(user, 20),
                el('span', { text: user.firstName || user.name })
            );
            chip.appendChild(el('button', {
                type: 'button',
                class: 'egdc-chip-x',
                title: 'Verwijderen',
                text: '×',
                onClick: function () {
                    state.picked.delete(String(user.id));
                    renderPick();
                }
            }));
            parts.pickChips.appendChild(chip);
        });
    }

    async function doAutocompleteSearch(query) {
        query = String(query || '').trim();
        if (!query || query.length < 2) {
            renderPickRows();
            return;
        }
        try {
            const result = await Directory.autocomplete(query);
            if (result && result.users && result.users.length) {
                const existing = new Set(state.directory.users.map(function (u) { return String(u.id); }));
                result.users.forEach(function (u) {
                    if (!existing.has(String(u.id))) {
                        state.directory.users.push(u);
                        existing.add(String(u.id));
                    }
                });
            }
        } catch (err) {}
        renderPickRows();
    }

    function renderPickRows() {
        if (!parts.pickList) return;
        clear(parts.pickList);

        const status = directoryStatus();
        if (status) parts.pickList.appendChild(status);

        if (state.directory.loading) {
            updatePickFoot();
            return;
        }

        const users = directoryUsers(state.newFilter);

        if (!users.length) {
            if (!status) {
                const empty = el('div', {
                    class: 'egdc-empty-text',
                    style: { padding: '14px 4px', textAlign: 'center' }
                });
                empty.appendChild(el('div', { text: state.directory.users.length ? 'Niemand gevonden met die naam.' : 'Nog geen gebruikers beschikbaar.' }));
                const dbg = state.directory.debug;
                if (dbg) {
                    const info = 'API: ' + dbg.challengeCount + ' challenges, ' + dbg.rawUserCount + ' raw users' +
                        (dbg.userFieldNames && dbg.userFieldNames.length ? ' (veld: ' + dbg.userFieldNames.join(', ') + ')' : '') +
                        (dbg.topKeys && dbg.topKeys.length ? ' · keys: ' + dbg.topKeys.join(', ') : '');
                    empty.appendChild(el('div', { class: 'egdc-muted', text: info, style: { marginTop: '8px', fontSize: '11px' } }));
                }
                parts.pickList.appendChild(empty);
            }
            updatePickFoot();
            return;
        }

        users.forEach(function (user) {
            const selected = state.picked.has(String(user.id));
            const row = el('button', {
                type: 'button',
                class: 'egdc-user' + (selected ? ' selected' : '')
            });
            row.append(
                makeAvatar(user, 34),
                userText(user),
                el('span', { class: 'egdc-user-check', text: selected ? '✓' : '' })
            );
            row.addEventListener('click', function () { togglePick(user); });
            parts.pickList.appendChild(row);
        });

        updatePickFoot();
    }

    function togglePick(user) {
        const id = String(user.id);
        if (state.picked.has(id)) state.picked.delete(id);
        else state.picked.set(id, user);
        renderPick();
    }

    function updatePickFoot() {
        const count = state.picked.size;

        if (parts.pickCount) {
            parts.pickCount.textContent = count
                ? count + (count === 1 ? ' persoon gekozen' : ' personen gekozen')
                : '';
        }
        if (parts.pickAction) {
            parts.pickAction.disabled = count === 0;
            parts.pickAction.textContent = count === 0
                ? 'Kies deelnemers'
                : (count === 1 ? 'Chat starten' : 'Groep maken');
        }
        if (parts.pickName) {
            parts.pickName.style.display = count > 1 ? 'block' : 'none';
        }
    }

    async function startConversation() {
        const picked = Array.from(state.picked.values());
        if (!picked.length) {
            toast('Kies eerst iemand.', 'info');
            return;
        }

        const button = parts.pickAction;
        const label = button ? button.textContent : '';
        if (button) {
            button.disabled = true;
            button.textContent = 'Bezig…';
        }

        try {
            let roomId;
            if (picked.length === 1) {
                roomId = await Transport.ensureDm(picked[0]);
                selectRoom(roomId, picked[0]);
            } else {
                const fallbackName = 'Groep met ' + picked.slice(0, 3).map(function (u) {
                    return u.firstName || u.name;
                }).join(', ') + (picked.length > 3 ? '…' : '');
                const name = state.groupName.trim() || fallbackName;
                roomId = await Transport.createGroup(name, picked);
                selectRoom(roomId);
            }

            state.picked = new Map();
            state.newFilter = '';
            state.groupName = '';
        } catch (err) {
            if (button) {
                button.disabled = false;
                button.textContent = label;
            }
            toast(String(err && err.message || 'Gesprek starten mislukt.'), 'error', 5000);
        }
    }

    // ------------------------------------------------------------
    // Settings
    // ------------------------------------------------------------

    function infoRow(label, value) {
        return [el('dt', { text: label }), el('dd', { text: value == null || value === '' ? '—' : String(value) })];
    }

    function renderSettingsPanel() {
        renderPanelHead('Instellingen', 'Profiel, verbinding en gegevens.');

        const panel = el('div', { class: 'egdc-panel' });

        const profile = el('div', { class: 'egdc-section' });
        profile.appendChild(el('h3', { text: 'Profiel' }));
        const me = el('div', { class: 'egdc-user', style: { cursor: 'default', paddingLeft: '0' } });
        me.append(makeAvatar(state.identity, 40), userText({
            name: state.identity.name,
            firstName: state.identity.firstName,
            id: state.identity.id
        }));
        profile.appendChild(me);

        const nameField = el('div', { class: 'egdc-field', style: { marginTop: '10px' } });
        nameField.appendChild(el('label', { text: 'Weergavenaam (leeg = Egodact-naam)' }));
        const nameInput = el('input', {
            class: 'egdc-input',
            type: 'text',
            placeholder: state.baseIdentity.name || 'Je naam'
        });
        nameInput.value = Store.displayNameOverride();
        nameField.appendChild(nameInput);
        nameField.appendChild(el('button', {
            type: 'button',
            class: 'egdc-btn primary',
            text: 'Naam opslaan',
            onClick: async function () {
                Store.set('display_name', nameInput.value.trim());
                applyIdentity();
                try { await Transport.init(state.identity); } catch (err) {}
                renderChrome();
                renderMain();
                toast('Weergavenaam opgeslagen.', 'success');
            }
        }));
        profile.appendChild(nameField);
        profile.appendChild(el('p', {
            class: 'egdc-muted',
            text: 'Deze naam zien anderen bij je berichten. Je Egodact-id blijft hetzelfde.'
        }));
        panel.appendChild(profile);

        const connection = el('div', { class: 'egdc-section' });
        connection.appendChild(el('h3', { text: 'Verbinding' }));
        const dl = el('dl', { class: 'egdc-info' });
        infoRow('Backend', state.backend.kind === 'firebase' ? 'Firebase'
            : (state.backend.kind === 'local' ? 'Lokale demo' : 'Verbinden…')).forEach(function (n) { dl.appendChild(n); });
        infoRow('Project', state.backend.kind === 'firebase' ? Transport.projectId() : (Transport.projectId() || '—')).forEach(function (n) { dl.appendChild(n); });
        infoRow('Status', state.backend.error || Transport.lastError() || (state.backend.kind === 'firebase' ? 'Verbonden' : 'Alleen deze browser')).forEach(function (n) { dl.appendChild(n); });
        infoRow('SDK', Transport.sdkLoaded() ? 'geladen' : 'NIET geladen').forEach(function (n) { dl.appendChild(n); });
        connection.appendChild(dl);

        const connectionButtons = el('div', { class: 'egdc-toolbar' });
        connectionButtons.appendChild(el('button', {
            type: 'button',
            class: 'egdc-btn',
            text: 'Opnieuw verbinden',
            onClick: restartTransport
        }));
        connectionButtons.appendChild(el('button', {
            type: 'button',
            class: 'egdc-btn',
            text: 'Berichten vernieuwen',
            onClick: function () {
                if (!state.activeRoomId) { toast('Geen actief gesprek.', 'info'); return; }
                const rid = state.activeRoomId;
                if (unsubMessages) { try { unsubMessages(); } catch (err) {} unsubMessages = null; }
                state.messages = [];
                state.messagesError = '';
                renderMessages();
                unsubMessages = Transport.watchMessages(rid, function (messages, meta) {
                    if (state.activeRoomId !== rid || !root) return;
                    state.messages = Array.isArray(messages) ? messages : [];
                    state.messagesError = (meta && meta.error) || '';
                    renderMessages();
                    Store.markRead(state.identity.id, rid, Date.now());
                });
                toast('Berichten worden opnieuw geladen.', 'info', 2000);
            }
        }));
        connectionButtons.appendChild(el('button', {
            type: 'button',
            class: 'egdc-btn',
            text: 'Kopieer diagnose',
            onClick: function () {
                const report = JSON.stringify({
                    kind: Transport.kind(),
                    project: Transport.projectId(),
                    sdk: Transport.sdkLoaded(),
                    error: Transport.lastError(),
                    backend: state.backend,
                    directory: {
                        users: state.directory.users.length,
                        error: state.directory.error,
                        fetchedAt: state.directory.fetchedAt
                    },
                    identity: {
                        id: state.identity.id,
                        aliases: state.identity.aliases || [],
                        email: state.identity.email,
                        source: state.identity.source
                    },
                    connection: {
                        online: state.online,
                        onlineError: state.onlineError,
                        navigatorOnline: (typeof navigator !== 'undefined' ? navigator.onLine : null),
                        myKeys: Transport.keysOf(state.identity)
                    },
                    sync: {
                        activeRoomId: state.activeRoomId,
                        roomsCount: (state.rooms || []).length,
                        hiddenRooms: Object.keys(hiddenRoomIds()).length,
                        roomsError: state.roomsError || '',
                        messagesCount: (state.messages || []).length,
                        messagesError: state.messagesError || '',
                        hasUnsubMessages: !!unsubMessages,
                        view: state.view
                    }
                }, null, 2);
                try {
                    navigator.clipboard.writeText(report);
                    toast('Diagnose gekopieerd naar het klembord.', 'success');
                } catch (err) {
                    console.log('[Egodact Chat] diagnose', report);
                    toast('Diagnose staat in de console.', 'info');
                }
            }
        }));
        connection.appendChild(connectionButtons);

        if (state.backend.kind !== 'firebase') {
            connection.appendChild(el('p', {
                class: 'egdc-muted',
                text: 'Lokale demo: berichten worden alleen in deze browser bewaard. De chat is nog niet met Firebase verbonden.'
            }));
        }
        panel.appendChild(connection);

        const egodactSection = el('div', { class: 'egdc-section' });
        egodactSection.appendChild(el('h3', { text: 'Egodact' }));
        const dl2 = el('dl', { class: 'egdc-info' });
        infoRow('Identiteit', identitySourceText()).forEach(function (n) { dl2.appendChild(n); });
        infoRow('Egodact-id', state.identity.id).forEach(function (n) { dl2.appendChild(n); });
        infoRow('E-mail', state.identity.email).forEach(function (n) { dl2.appendChild(n); });
        const _apiAuth = Identity.getApiAuth();
        infoRow('Access token', _apiAuth && _apiAuth.token ? 'Gevonden' : 'NIET gevonden').forEach(function (n) { dl2.appendChild(n); });
        infoRow('Gebruikers', state.directory.users.length ? String(state.directory.users.length) : '—').forEach(function (n) { dl2.appendChild(n); });
        const dbg = state.directory.debug;
        if (dbg) {
            infoRow('API challenges', String(dbg.challengeCount)).forEach(function (n) { dl2.appendChild(n); });
            infoRow('API velden', dbg.userFieldNames && dbg.userFieldNames.length ? dbg.userFieldNames.join(', ') : '—').forEach(function (n) { dl2.appendChild(n); });
            infoRow('API keys', dbg.topKeys && dbg.topKeys.length ? dbg.topKeys.join(', ') : '—').forEach(function (n) { dl2.appendChild(n); });
        }
        infoRow('Bijgewerkt', state.directory.fetchedAt ? new Date(state.directory.fetchedAt).toLocaleString('nl-NL') : '—').forEach(function (n) { dl2.appendChild(n); });
        egodactSection.appendChild(dl2);
        egodactSection.appendChild(el('button', {
            type: 'button',
            class: 'egdc-btn',
            html: ICON_REFRESH + '<span>Gebruikers verversen</span>',
            onClick: retryDirectory
        }));
        panel.appendChild(egodactSection);

        const chatsSection = el('div', { class: 'egdc-section' });
        chatsSection.appendChild(el('h3', { text: 'Gesprekken' }));
        const hiddenEntries = hiddenRoomEntries();
        const hiddenCount = hiddenEntries.length;
        chatsSection.appendChild(el('p', {
            class: 'egdc-muted',
            text: hiddenCount
                ? hiddenCount + (hiddenCount === 1 ? ' gesprek is' : ' gesprekken zijn') + ' gesloten op dit apparaat.'
                : 'Geen gesloten gesprekken. Sluit een gesprek met het kruisje in de lijst.'
        }));
        if (hiddenCount) {
            const list = el('div', { class: 'egdc-user-list' });
            hiddenEntries.forEach(function (entry) {
                const display = roomDisplay(entry.room);
                const row = el('div', { class: 'egdc-user', style: { cursor: 'default' } });
                row.appendChild(makeAvatar(display, 30));
                const body = el('div', { class: 'egdc-user-body' });
                body.appendChild(el('div', { class: 'egdc-user-name', text: display.name }));
                body.appendChild(el('div', {
                    class: 'egdc-user-sub',
                    text: entry.room && entry.room.lastMessage ? entry.room.lastMessage : 'Gesloten gesprek'
                }));
                row.appendChild(body);
                row.appendChild(el('button', {
                    type: 'button',
                    class: 'egdc-btn',
                    text: 'Herstellen',
                    onClick: function () { restoreHiddenRoom(entry.id); }
                }));
                list.appendChild(row);
            });
            chatsSection.appendChild(list);
            chatsSection.appendChild(el('button', {
                type: 'button',
                class: 'egdc-btn',
                text: 'Alle gesloten gesprekken herstellen',
                onClick: restoreHiddenRooms
            }));
        }
        panel.appendChild(chatsSection);

        const localSection = el('div', { class: 'egdc-section' });
        localSection.appendChild(el('h3', { text: 'Lokale gegevens' }));
        localSection.appendChild(el('p', {
            class: 'egdc-muted',
            text: 'Wist leesmarkeringen, de gebruikerscache en de lokale demo-geschiedenis. Firebase-berichten blijven staan.'
        }));
        localSection.appendChild(el('button', {
            type: 'button',
            class: 'egdc-btn danger',
            text: 'Lokale chatgegevens wissen',
            onClick: function () {
                if (!window.confirm('Lokale chatgegevens wissen? De pagina wordt daarna herladen.')) return;
                Store.clearChatData();
                toast('Lokale gegevens gewist. Herlaad de pagina.', 'success', 4000);
                setTimeout(function () { window.location.reload(); }, 900);
            }
        }));
        panel.appendChild(localSection);

        parts.mainBody.appendChild(panel);
    }

    async function retryDirectory() {
        state.directory.loading = true;
        state.directory.error = '';
        if (state.view === 'new') renderPick();
        renderChrome();

        const result = await Directory.load({ force: true, authSub: state.baseIdentity.authSub });
        if (!root) return;

        const previousId = String(state.baseIdentity.id);
        state.directory = {
            users: result.users || [],
            error: result.error || '',
            loading: false,
            fetchedAt: result.fetchedAt || 0,
            cached: !!result.cached,
            debug: result.debug || null
        };

        if (state.directory.users.length) {
            state.baseIdentity = Identity.resolveFromDirectory(state.baseIdentity, state.directory.users);
            applyIdentity();
        }
        // If we fetched the user's own profile, adopt it directly.
        if (result.selfProfile) {
            state.baseIdentity = Identity.adopt(state.baseIdentity, result.selfProfile);
            applyIdentity();
        }
        state.baseIdentity = Identity.alignWithDirectory(
            state.baseIdentity,
            state.directory.users,
            result.selfProfile
        );
        applyIdentity();

        const changed = String(state.identity.id) !== previousId;

        if (changed) {
            await restartTransport();
            toast('Egodact-identiteit bijgewerkt. Verbinding herstart.', 'success');
        } else {
            try { await Transport.init(state.identity); } catch (err) {}
            renderChrome();
            if (state.view === 'new') renderPick();
            toast(result.error ? 'Verversen mislukt: ' + result.error : 'Gebruikers bijgewerkt.', result.error ? 'error' : 'success', 4500);
        }
    }

    // ------------------------------------------------------------
    // Export
    // ------------------------------------------------------------

    window.EGCChatUI = {
        open: open,
        close: close,
        isOpen: function () { return !!root; }
    };
})();
