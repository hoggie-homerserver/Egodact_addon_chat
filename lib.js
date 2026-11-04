/**
 * Egodact Addon Library (v1)
 * Lightweight, dependency-free helpers for building GUIs and games in Egodact addons.
 *
 * Usage in an addon content script:
 *   const L = window.EgodactAddonLib;
 *   const { ui, game, data, layout, theme, el } = L;
 *
 * The library is theme-aware: it reads the CSS variables that the Egodact host
 * injects (--egd-*), so widgets automatically match dark/light mode.
 */
(function (global) {
    'use strict';

    const VERSION = '1.0.0';

    function client() {
        return (typeof global !== 'undefined' && global.EgodactAddonClient) || null;
    }

    // ============================================================
    // THEME
    // ============================================================
    function cssVar(name, fallback) {
        try {
            const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
            return v || fallback;
        } catch (err) {
            return fallback;
        }
    }

    function theme() {
        return {
            modal: cssVar('--egd-modal', '#424242'),
            veld: cssVar('--egd-veld', '#2e2e2e'),
            paneel: cssVar('--egd-paneel', '#333333'),
            info: cssVar('--egd-info', '#2b2b2b'),
            rand: cssVar('--egd-rand', '#555555'),
            lijn: cssVar('--egd-lijn', '#444444'),
            tekst: cssVar('--egd-tekst', '#ffffff'),
            tekstZacht: cssVar('--egd-tekst-zacht', '#b0b0b0'),
            uit: cssVar('--egd-uit', '#777777'),
            accent: cssVar('--egd-accent', '#90caf9'),
            accentTekst: cssVar('--egd-accent-tekst', '#0d47a1'),
            gevaar: cssVar('--egd-gevaar', '#ef5350'),
            backdrop: cssVar('--egd-backdrop', 'rgba(0,0,0,0.65)'),
            headerIcoon: cssVar('--egd-header-icoon', '#ffffff'),
            donker: document.documentElement.getAttribute('data-egodact-thema') !== 'licht'
        };
    }

    // ============================================================
    // CORE DOM HELPER
    // ============================================================
    function el(tag, props, ...children) {
        const node = document.createElement(tag || 'div');
        props = props || {};
        Object.keys(props).forEach(function (key) {
            const val = props[key];
            if (key === 'style' && val && typeof val === 'object') {
                Object.assign(node.style, val);
            } else if (key === 'class' || key === 'className') {
                node.className = val;
            } else if (key === 'html') {
                node.innerHTML = val;
            } else if (key === 'text') {
                node.textContent = val;
            } else if (key.startsWith('on') && typeof val === 'function') {
                node.addEventListener(key.slice(2).toLowerCase(), val);
            } else if (val !== null && val !== undefined) {
                node.setAttribute(key, val);
            }
        });
        children.flat(Infinity).forEach(function (child) {
            if (child === null || child === undefined || child === false) return;
            if (typeof child === 'string' || typeof child === 'number') {
                node.appendChild(document.createTextNode(String(child)));
            } else if (child instanceof Node) {
                node.appendChild(child);
            }
        });
        return node;
    }

    function applyBaseStyle(node, opts) {
        opts = opts || {};
        const t = theme();
        Object.assign(node.style, {
            fontFamily: 'Arial, sans-serif',
            boxSizing: 'border-box'
        }, opts.style || {});
        return node;
    }

    // ============================================================
    // UI WIDGETS
    // ============================================================
    const ui = {};

    ui.panel = function (opts) {
        opts = opts || {};
        const t = theme();
        const node = el('div', {
            style: {
                backgroundColor: opts.background || t.paneel,
                border: '1px solid ' + (opts.border || t.rand),
                borderRadius: (opts.radius || 6) + 'px',
                padding: opts.padding || '12px',
                color: opts.color || t.tekst
            }
        });
        if (opts.children) opts.children.forEach(function (c) { node.appendChild(c); });
        if (opts.html) node.innerHTML = opts.html;
        return node;
    };

    ui.row = function (opts) {
        opts = opts || {};
        const node = el('div', {
            style: {
                display: 'flex',
                flexDirection: 'row',
                alignItems: opts.align || 'center',
                justifyContent: opts.justify || 'flex-start',
                gap: (opts.gap || 8) + 'px',
                flexWrap: opts.wrap ? 'wrap' : 'nowrap'
            }
        });
        if (opts.children) opts.children.forEach(function (c) { node.appendChild(c); });
        return node;
    };

    ui.col = function (opts) {
        opts = opts || {};
        const node = el('div', {
            style: {
                display: 'flex',
                flexDirection: 'column',
                alignItems: opts.align || 'stretch',
                justifyContent: opts.justify || 'flex-start',
                gap: (opts.gap || 8) + 'px'
            }
        });
        if (opts.children) opts.children.forEach(function (c) { node.appendChild(c); });
        return node;
    };

    ui.button = function (label, onClick, opts) {
        opts = opts || {};
        const t = theme();
        const node = el('button', {
            type: 'button',
            text: label,
            style: {
                padding: opts.padding || '8px 14px',
                fontSize: opts.fontSize || '13px',
                fontWeight: 'bold',
                border: 'none',
                borderRadius: (opts.radius || 4) + 'px',
                cursor: 'pointer',
                background: opts.background || t.accent,
                color: opts.color || t.accentTekst,
                minWidth: opts.minWidth || ''
            },
            onClick: function (e) {
                if (typeof onClick === 'function') onClick(e);
            }
        });
        if (opts.icon) {
            const span = el('span', { style: { marginRight: '6px' }, html: opts.icon });
            node.insertBefore(span, node.firstChild);
        }
        return node;
    };

    ui.toggle = function (label, value, onChange, opts) {
        opts = opts || {};
        const t = theme();
        const wrap = el('label', { style: { display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: t.tekst } });
        const checkbox = el('input', { type: 'checkbox' });
        checkbox.checked = !!value;
        const slider = el('span', { style: {
            position: 'relative', display: 'inline-block', width: '40px', height: '22px',
            backgroundColor: value ? t.accent : t.uit, borderRadius: '22px', transition: 'background-color 150ms ease'
        }});
        const knob = el('span', { style: {
            position: 'absolute', top: '2px', left: value ? '20px' : '2px',
            width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#fff',
            transition: 'left 150ms ease', boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
        }});
        slider.appendChild(knob);
        const text = el('span', { text: label });
        wrap.append(checkbox, slider, text);
        checkbox.style.cssText = 'opacity:0;width:0;height:0;position:absolute;';
        wrap.addEventListener('click', function (e) {
            e.preventDefault();
            const next = !checkbox.checked;
            checkbox.checked = next;
            slider.style.backgroundColor = next ? t.accent : t.uit;
            knob.style.left = next ? '20px' : '2px';
            if (typeof onChange === 'function') onChange(next);
        });
        return wrap;
    };

    ui.input = function (opts) {
        opts = opts || {};
        const t = theme();
        const node = el('input', {
            type: opts.type || 'text',
            placeholder: opts.placeholder || '',
            value: opts.value || ''
        });
        Object.assign(node.style, {
            padding: opts.padding || '8px 10px',
            fontSize: opts.fontSize || '13px',
            border: '1px solid ' + t.rand,
            borderRadius: (opts.radius || 4) + 'px',
            background: t.veld,
            color: t.tekst,
            outline: 'none',
            width: opts.width || '100%',
            boxSizing: 'border-box'
        });
        if (typeof opts.onChange === 'function') node.addEventListener('input', function (e) { opts.onChange(e.target.value); });
        return node;
    };

    ui.textarea = function (opts) {
        opts = opts || {};
        const node = el('textarea', { placeholder: opts.placeholder || '', rows: opts.rows || 4 });
        Object.assign(node.style, {
            padding: '8px 10px', fontSize: '13px',
            border: '1px solid ' + theme().rand, borderRadius: '4px',
            background: theme().veld, color: theme().tekst,
            outline: 'none', width: '100%', boxSizing: 'border-box', resize: 'vertical'
        });
        if (opts.value) node.value = opts.value;
        if (typeof opts.onChange === 'function') node.addEventListener('input', function (e) { opts.onChange(e.target.value); });
        return node;
    };

    ui.select = function (opts) {
        opts = opts || {};
        const t = theme();
        const node = el('select', {});
        (opts.options || []).forEach(function (o) {
            const opt = el('option', { value: o.value != null ? o.value : o, text: o.label != null ? o.label : o });
            node.appendChild(opt);
        });
        if (opts.value != null) node.value = opts.value;
        Object.assign(node.style, {
            padding: '8px 10px', fontSize: '13px',
            border: '1px solid ' + t.rand, borderRadius: '4px',
            background: t.veld, color: t.tekst
        });
        if (typeof opts.onChange === 'function') node.addEventListener('change', function (e) { opts.onChange(e.target.value); });
        return node;
    };

    ui.tabs = function (tabs, opts) {
        opts = opts || {};
        const t = theme();
        const wrap = el('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } });
        const bar = el('div', { style: { display: 'flex', gap: '4px', borderBottom: '1px solid ' + t.rand } });
        const content = el('div', { style: { padding: '8px 0' } });
        let active = opts.active || 0;
        function render() {
            bar.innerHTML = '';
            content.innerHTML = '';
            tabs.forEach(function (tab, i) {
                const btn = ui.button(tab.title || ('Tab ' + (i + 1)), function () {
                    active = i;
                    render();
                }, {
                    background: i === active ? t.accent : 'transparent',
                    color: i === active ? t.accentTekst : t.tekst,
                    padding: '6px 12px'
                });
                bar.appendChild(btn);
            });
            const cur = tabs[active];
            if (cur && typeof cur.render === 'function') {
                content.appendChild(cur.render());
            } else if (cur && cur.html) {
                content.innerHTML = cur.html;
            }
        }
        render();
        wrap.append(bar, content);
        return wrap;
    };

    ui.list = function (items, render, opts) {
        opts = opts || {};
        const wrap = el('div', { style: { display: 'flex', flexDirection: 'column', gap: (opts.gap || 6) + 'px' } });
        items.forEach(function (item, i) {
            const node = (typeof render === 'function') ? render(item, i) : el('div', { text: String(item) });
            wrap.appendChild(node);
        });
        return wrap;
    };

    ui.card = function (opts) {
        opts = opts || {};
        const t = theme();
        const node = el('div', {
            style: {
                backgroundColor: opts.background || t.paneel,
                border: '1px solid ' + t.rand,
                borderRadius: '8px',
                padding: opts.padding || '16px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }
        });
        if (opts.title) node.appendChild(el('h3', { text: opts.title, style: { margin: '0 0 8px 0', color: t.tekst } }));
        if (opts.children) opts.children.forEach(function (c) { node.appendChild(c); });
        if (opts.html) node.innerHTML += opts.html;
        return node;
    };

    ui.toast = function (msg, opts) {
        opts = opts || {};
        const t = theme();
        const isError = opts.type === 'error';
        const isInfo = opts.type === 'info';
        const bg = opts.background || (isError ? t.gevaar : (isInfo ? '#2e7d32' : t.accent));
        const fg = opts.color || (isError || isInfo ? '#fff' : t.accentTekst);
        const node = el('div', {
            text: msg,
            style: {
                position: 'fixed',
                bottom: (opts.bottom || 20) + 'px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: bg,
                color: fg,
                padding: '10px 16px',
                borderRadius: '6px',
                zIndex: '2147483647',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                fontSize: '13px',
                fontWeight: 'bold'
            }
        });
        document.body.appendChild(node);
        setTimeout(function () {
            node.style.transition = 'opacity 300ms ease';
            node.style.opacity = '0';
            setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 320);
        }, opts.duration || 2500);
        return node;
    };

    ui.modal = function (title, body, opts) {
        const c = client();
        if (c && typeof c.openModal === 'function') {
            const html = (typeof body === 'string') ? body : '';
            const backdrop = c.openModal(title, html);
            if (typeof body !== 'string' && body instanceof Node) {
                const modal = backdrop.firstChild;
                const container = (modal && modal.lastElementChild) ? modal.lastElementChild : backdrop;
                container.appendChild(body);
            }
            // Optional overrides for the modal panel.
            if (opts && (opts.background || opts.width)) {
                const modalEl = backdrop.firstChild;
                if (modalEl) {
                    if (opts.background) modalEl.style.backgroundColor = opts.background;
                    if (opts.width) modalEl.style.width = opts.width;
                }
            }
            return backdrop;
        }
        // Fallback: build our own modal.
        const t = theme();
        const backdrop = el('div', { style: {
            position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
            backgroundColor: t.backdrop, zIndex: '9999999', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontFamily: 'Arial, sans-serif'
        }});
        const modal = el('div', { style: {
            backgroundColor: t.modal, color: t.tekst, width: 'min(520px, calc(100vw - 32px))',
            maxHeight: 'calc(100vh - 32px)', boxSizing: 'border-box', overflow: 'hidden',
            borderRadius: '6px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px'
        }});
        const head = el('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid ' + t.rand, paddingBottom: '10px' } });
        head.appendChild(el('h2', { text: title, style: { margin: '0', fontSize: '22px', fontWeight: '500' } }));
        const close = ui.button('Sluiten', function () { if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop); }, { background: t.accent, color: t.accentTekst });
        head.appendChild(close);
        modal.appendChild(head);
        const bodyWrap = el('div', { style: { overflowY: 'auto', maxHeight: 'calc(100vh - 190px)' } });
        if (typeof body === 'string') bodyWrap.innerHTML = body;
        else if (body instanceof Node) bodyWrap.appendChild(body);
        modal.appendChild(bodyWrap);
        backdrop.appendChild(modal);
        backdrop.addEventListener('click', function (e) { if (e.target === backdrop) { if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop); } });
        document.body.appendChild(backdrop);
        return backdrop;
    };

    // ============================================================
    // GAME HELPERS
    // ============================================================
    const game = {};

    game.createCanvas = function (parent, width, height, opts) {
        opts = opts || {};
        const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1;
        const canvas = el('canvas', { width: width * dpr, height: height * dpr });
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        Object.assign(canvas.style, {
            display: 'block',
            background: opts.background || '#000',
            border: '1px solid ' + theme().rand,
            borderRadius: (opts.radius || 4) + 'px',
            imageRendering: 'auto'
        });
        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (parent) parent.appendChild(canvas);
        return { canvas: canvas, ctx: ctx, width: width, height: height, dpr: dpr };
    };

    game.input = function () {
        const state = { keys: {}, mouse: { x: 0, y: 0, down: false, clicked: false }, touches: [] };
        const onKeyDown = function (e) { state.keys[e.key] = true; state.keys[e.code] = true; };
        const onKeyUp = function (e) { state.keys[e.key] = false; state.keys[e.code] = false; };
        const onMouseMove = function (e) { const r = e.target.getBoundingClientRect ? e.target.getBoundingClientRect() : { left: 0, top: 0 }; state.mouse.x = e.clientX - r.left; state.mouse.y = e.clientY - r.top; };
        const onMouseDown = function (e) { state.mouse.down = true; state.mouse.clicked = true; };
        const onMouseUp = function (e) { state.mouse.down = false; };
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mouseup', onMouseUp);
        state.destroy = function () {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mouseup', onMouseUp);
        };
        state.consumeClick = function () { const c = state.mouse.clicked; state.mouse.clicked = false; return c; };
        return state;
    };

    game.loop = function (update, render, opts) {
        opts = opts || {};
        let running = true;
        let last = performance.now();
        let raf = null;
        function tick(now) {
            if (!running) return;
            const dt = Math.min((now - last) / 1000, opts.maxDt || 0.05);
            last = now;
            try { if (typeof update === 'function') update(dt); } catch (err) { console.error(err); }
            try { if (typeof render === 'function') render(dt); } catch (err) { console.error(err); }
            raf = requestAnimationFrame(tick);
        }
        raf = requestAnimationFrame(tick);
        return {
            stop: function () { running = false; if (raf) cancelAnimationFrame(raf); },
            pause: function () { running = false; },
            resume: function () { if (!running) { running = true; last = performance.now(); raf = requestAnimationFrame(tick); } }
        };
    };

    game.rect = function (ctx, x, y, w, h, color, opts) {
        opts = opts || {};
        ctx.fillStyle = color || '#fff';
        if (opts.radius) {
            const r = opts.radius;
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.lineTo(x + w - r, y);
            ctx.quadraticCurveTo(x + w, y, x + w, y + r);
            ctx.lineTo(x + w, y + h - r);
            ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
            ctx.lineTo(x + r, y + h);
            ctx.quadraticCurveTo(x, y + h, x, y + h - r);
            ctx.lineTo(x, y + r);
            ctx.quadraticCurveTo(x, y, x + r, y);
            ctx.closePath();
            ctx.fill();
        } else {
            ctx.fillRect(x, y, w, h);
        }
        if (opts.stroke) {
            ctx.strokeStyle = opts.stroke;
            ctx.lineWidth = opts.lineWidth || 1;
            ctx.strokeRect(x, y, w, h);
        }
    };

    game.circle = function (ctx, x, y, r, color, opts) {
        opts = opts || {};
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = color || '#fff';
        ctx.fill();
        if (opts.stroke) {
            ctx.strokeStyle = opts.stroke;
            ctx.lineWidth = opts.lineWidth || 1;
            ctx.stroke();
        }
    };

    game.text = function (ctx, str, x, y, opts) {
        opts = opts || {};
        ctx.fillStyle = opts.color || '#fff';
        ctx.font = (opts.bold ? 'bold ' : '') + (opts.size || 14) + 'px ' + (opts.font || 'Arial, sans-serif');
        ctx.textAlign = opts.align || 'left';
        ctx.textBaseline = opts.baseline || 'top';
        if (opts.shadow) {
            ctx.shadowColor = opts.shadow;
            ctx.shadowBlur = opts.shadowBlur || 4;
        }
        ctx.fillText(str, x, y);
        ctx.shadowBlur = 0;
    };

    game.sprite = function (ctx, img, x, y, w, h, opts) {
        opts = opts || {};
        if (opts.flipX) {
            ctx.save();
            ctx.translate(x + (w || img.width), y);
            ctx.scale(-1, 1);
            ctx.drawImage(img, 0, 0, w || img.width, h || img.height);
            ctx.restore();
        } else {
            ctx.drawImage(img, x, y, w || img.width, h || img.height);
        }
    };

    game.clear = function (ctx, color) {
        const c = ctx.canvas;
        if (color) {
            ctx.fillStyle = color;
            ctx.fillRect(0, 0, c.width, c.height);
        } else {
            ctx.clearRect(0, 0, c.width, c.height);
        }
    };

    game.collide = function (a, b) {
        return a.x < b.x + b.w && a.x + a.w > b.x &&
               a.y < b.y + b.h && a.y + a.h > b.y;
    };

    game.center = function (canvas) {
        return { x: canvas.width / 2, y: canvas.height / 2 };
    };

    // ============================================================
    // DATA HELPERS
    // ============================================================
    const data = {};

    data.storage = function (prefix) {
        const c = client();
        if (c && typeof c.storage === 'function') return c.storage(prefix);
        const p = 'egodact_lib_' + (prefix || 'global') + '_';
        return {
            get: function (key, fallback) {
                try { const raw = localStorage.getItem(p + key); return raw === null ? fallback : JSON.parse(raw); }
                catch (err) { return fallback; }
            },
            set: function (key, value) { try { localStorage.setItem(p + key, JSON.stringify(value)); return true; } catch (err) { return false; } },
            remove: function (key) { try { localStorage.removeItem(p + key); } catch (err) {} }
        };
    };

    const _bus = { listeners: {} };
    data.bus = {
        on: function (event, cb) {
            if (!_bus.listeners[event]) _bus.listeners[event] = [];
            _bus.listeners[event].push(cb);
            return function () { data.bus.off(event, cb); };
        },
        off: function (event, cb) {
            if (!_bus.listeners[event]) return;
            _bus.listeners[event] = _bus.listeners[event].filter(function (f) { return f !== cb; });
        },
        emit: function (event, payload) {
            const list = _bus.listeners[event] || [];
            list.forEach(function (cb) { try { cb(payload); } catch (err) { console.error(err); } });
        }
    };

    data.state = function (initial) {
        let value = (typeof initial === 'function') ? initial() : initial;
        const subs = [];
        return {
            get: function () { return value; },
            set: function (next) { value = (typeof next === 'function') ? next(value) : next; subs.forEach(function (cb) { try { cb(value); } catch (err) {} }); },
            subscribe: function (cb) { subs.push(cb); return function () { const i = subs.indexOf(cb); if (i >= 0) subs.splice(i, 1); }; }
        };
    };

    data.fetchJSON = function (url, opts) {
        opts = opts || {};
        return fetch(url, opts).then(function (res) {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.json();
        });
    };

    // ============================================================
    // LAYOUT HELPERS
    // ============================================================
    const layout = {};

    layout.center = function (node) {
        if (node) Object.assign(node.style, { display: 'flex', alignItems: 'center', justifyContent: 'center' });
        return node;
    };

    layout.grid = function (cols, opts) {
        opts = opts || {};
        const node = el('div', { style: {
            display: 'grid',
            gridTemplateColumns: 'repeat(' + cols + ', 1fr)',
            gap: (opts.gap || 8) + 'px'
        }});
        if (opts.children) opts.children.forEach(function (c) { node.appendChild(c); });
        return node;
    };

    layout.scroll = function (node, opts) {
        opts = opts || {};
        if (node) Object.assign(node.style, {
            overflowY: 'auto',
            maxHeight: opts.maxHeight || '300px'
        });
        return node;
    };

    // ============================================================
    // EXPORT
    // ============================================================
    const lib = {
        version: VERSION,
        theme: theme,
        cssVar: cssVar,
        el: el,
        ui: ui,
        game: game,
        data: data,
        layout: layout
    };

    if (typeof module !== 'undefined' && module.exports) module.exports = lib;
    if (typeof global !== 'undefined') global.EgodactAddonLib = lib;

})(typeof window !== 'undefined' ? window : this);
