/**
 * Grr! stop looking here all is available at
 * @link https://codeberg.org/MattFor/relaxy-website
 */

const syncThemeButton = () =>
{
    const themeButton = document.getElementById('themeButton');
    if (!themeButton)
    {
        return;
    }

    const isLight = document.documentElement.classList.contains('light-mode');

    themeButton.innerText = isLight
        ? 'Dark Mode'
        : 'Light Mode';
    themeButton.setAttribute('aria-pressed', String(isLight));
};

const toggleTheme = () =>
{
    const isLight = document.documentElement.classList.toggle('light-mode');
    try
    {
        localStorage.setItem('theme', isLight
            ? 'light'
            : 'dark');
    }
    catch (e)
    {
        // Storage unavailable so theme won't persist
    }

    syncThemeButton();
};

let bgFxW = 0;
let bgFxH = 0;

const BG_FX_H_TOLERANCE = 200;

const buildBackgroundFx = () =>
{
    let fx = document.querySelector('.bg-fx');
    const isNew = !fx;

    if (isNew)
    {
        fx = document.createElement('div');
        fx.className = 'bg-fx';
        fx.setAttribute('aria-hidden', 'true');
        document.body.prepend(fx);
    }

    const box = fx.getBoundingClientRect();
    const W = Math.max(320, Math.round(box.width) || window.innerWidth);
    const H = Math.max(320, Math.round(box.height) || window.innerHeight);

    if (!isNew && W === bgFxW && Math.abs(H - bgFxH) <= BG_FX_H_TOLERANCE)
    {
        return;
    }

    bgFxW = W;
    bgFxH = H;

    const grid = 20;
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const snap = (v) => Math.round(v / grid) * grid;
    const rnd = (a, b) => a + Math.random() * (b - a);
    const rint = (a, b) => Math.floor(rnd(a, b + 1));
    const chance = (p) => Math.random() < p;

    const cx = W / 2;
    const cy = H / 2;
    const edgeBias = (x, y) => Math.max(Math.abs(x - cx) / cx, Math.abs(y - cy) / cy);
    const edgePoint = () =>
    {
        let x = clamp(snap(rnd(0, W)), 0, W);
        let y = clamp(snap(rnd(0, H)), 0, H);
        for (let t = 0; t < 5; t++)
        {
            if (Math.random() <= edgeBias(x, y))
            {
                break;
            }
            x = clamp(snap(rnd(0, W)), 0, W);
            y = clamp(snap(rnd(0, H)), 0, H);
        }
        return [
            x,
            y
        ];
    };

    const inset = Math.min(120, Math.round(Math.min(W, H) * 0.12));
    const minX = inset;
    const maxX = W - inset;
    const minY = inset;
    const maxY = H - inset;

    const flowPoint = () => [
        clamp(snap(rnd(minX, maxX)), minX, maxX),
        clamp(snap(rnd(minY, maxY)), minY, maxY)
    ];

    const bounceTo = (v, len, lo, hi) =>
    {
        const forward = v + len;
        return clamp(snap(forward < lo || forward > hi
            ? v - len
            : forward), lo, hi);
    };

    const parts = [];
    const nodes = [];
    const flows = [];

    const trace = (flow) =>
    {
        const start = flow
            ? flowPoint()
            : edgePoint();
        let x = start[0];
        let y = start[1];
        let d = 'M' + x + ' ' + y;
        const segs = flow
            ? rint(4, 7)
            : rint(2, 4);
        let horiz = chance(0.5);
        let pathLen = 0;
        for (let i = 0; i < segs; i++)
        {
            const span = horiz
                ? maxX - minX
                : maxY - minY;
            const len = snap(flow
                ? Math.min(rnd(160, 440), span)
                : rnd(80, 300)) * (chance(0.5)
                ? 1
                : -1);
            if (horiz)
            {
                const nx = flow
                    ? bounceTo(x, len, minX, maxX)
                    : clamp(x + len, 0, W);
                pathLen += Math.abs(nx - x);
                x = nx;
                d += ' H' + x;
            }
            else
            {
                const ny = flow
                    ? bounceTo(y, len, minY, maxY)
                    : clamp(y + len, 0, H);
                pathLen += Math.abs(ny - y);
                y = ny;
                d += ' V' + y;
            }
            horiz = !horiz;
        }

        const blue = chance(0.35)
            ? ' b'
            : '';
        nodes.push([
            x,
            y,
            blue
        ]);

        if (flow)
        {
            const dur = (7 + Math.random() * 9).toFixed(1);
            const del = (-Math.random() * 12).toFixed(1);
            parts.push('<path class="bg-fx-flow' + blue + '" style="animation-duration:' + dur + 's;animation-delay:' + del + 's" d="' + d + '"/>');
            flows.push([
                d,
                blue,
                pathLen
            ]);
        }
        else
        {
            parts.push('<path class="bg-fx-trace' + blue + '" d="' + d + '"/>');
        }
    };

    const area = W * H;
    const nTrace = clamp(Math.round(area / 34000), 14, 110);
    const nFlow = clamp(Math.round(area / 200000), 3, 20);

    for (let i = 0; i < nTrace; i++)
    {
        trace(false);
    }
    for (let i = 0; i < nFlow; i++)
    {
        trace(true);
    }

    nodes.forEach((n) =>
    {
        parts.push('<circle class="bg-fx-node' + n[2] + '" cx="' + n[0] + '" cy="' + n[1] + '" r="3"/>');
    });

    const nPad = clamp(Math.round(area / 200000), 4, 18);
    for (let i = 0; i < nPad; i++)
    {
        const n = nodes[rint(0, nodes.length - 1)];
        if (!n)
        {
            break;
        }
        const dur = (2.6 + Math.random() * 2.6).toFixed(1);
        const del = (-Math.random() * 3).toFixed(1);
        parts.push('<circle class="bg-fx-pad bg-fx-pulse' + n[2] + '" style="animation-duration:' + dur + 's;animation-delay:' + del + 's" cx="' + n[0] + '" cy="' + n[1] + '" r="6"/>');
    }

    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce && flows.length)
    {
        const nRider = clamp(Math.round(nFlow * 0.35), 1, 3);
        const headR = 3.4;
        const tailR = 2.4;
        const spacing = 3.4;
        const trailPx = 230;
        for (let i = 0; i < nRider; i++)
        {
            const f = flows[rint(0, flows.length - 1)];
            const len = f[2];
            if (len < 80)
            {
                continue;
            }
            const dur = (6 + Math.random() * 6).toFixed(1);
            const base = -Math.random() * parseFloat(dur);
            const span = Math.min(trailPx, len * 0.75);
            const count = clamp(Math.round(span / spacing), 8, 70);
            const step = (spacing / len) * parseFloat(dur);
            let g = '<g class="bg-fx-rider' + f[1] + '">';
            for (let k = count - 1; k >= 0; k--)
            {
                const r = (headR - (headR - tailR) * (k / (count - 1))).toFixed(2);
                const op = (0.85 * Math.pow(1 - k / count, 1.15)).toFixed(3);
                const begin = (base + k * step).toFixed(3);
                g += '<circle r="' + r + '" fill="currentColor" opacity="' + op + '"><animateMotion dur="' + dur + 's" begin="' + begin + 's" repeatCount="indefinite" rotate="none" path="' + f[0] + '"/></circle>';
            }
            g += '</g>';
            parts.push(g);
        }
    }

    fx.innerHTML = '<svg class="bg-fx-svg" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice"' + ' width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">' + parts.join('') + '</svg>';
};

const playEgg = (el, anim) =>
{
    if (el.dataset.egging)
    {
        return;
    }

    el.dataset.egging = '1';
    el.classList.add(anim);
    el.addEventListener('animationend', () =>
    {
        el.classList.remove(anim);
        delete el.dataset.egging;
    }, { once: true });
};

const eggToast = (text) =>
{
    const previous = document.querySelector('.egg-toast');
    if (previous)
    {
        previous.remove();
    }

    const toast = document.createElement('div');
    toast.className = 'egg-toast';
    toast.setAttribute('role', 'status');
    toast.textContent = text;
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('is-visible'));
    window.setTimeout(() =>
    {
        toast.classList.remove('is-visible');
        toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    }, 2800);
};

const prefersReducedMotion = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (list) => list[Math.floor(Math.random() * list.length)];

const HEART_GLYPHS = [
    '❤️',
    '💖',
    '💕',
    '💗',
    '💓',
    '💘'
];

const heartBurst = (count) =>
{
    if (prefersReducedMotion())
    {
        return;
    }

    for (let i = 0; i < count; i++)
    {
        const heart = document.createElement('span');
        heart.className = 'egg-heart';
        heart.textContent = pick(HEART_GLYPHS);
        heart.setAttribute('aria-hidden', 'true');
        heart.style.left = rand(2, 98).toFixed(2) + 'vw';
        heart.style.top = rand(20, 95).toFixed(2) + 'vh';
        heart.style.fontSize = rand(0.9, 2.4).toFixed(2) + 'rem';
        heart.style.setProperty('--drift', Math.round(rand(-140, 140)) + 'px');
        heart.style.setProperty('--rise', Math.round(rand(150, 380)) + 'px');
        heart.style.setProperty('--tilt', Math.round(rand(-35, 35)) + 'deg');
        heart.style.animationDuration = rand(1.6, 3.1).toFixed(2) + 's';
        heart.style.animationDelay = rand(0, 0.7).toFixed(2) + 's';
        document.body.appendChild(heart);
        heart.addEventListener('animationend', () => heart.remove(), { once: true });
    }
};

const CONFETTI_COLORS = [
    '#ff69b4',
    '#ff4069',
    '#4a90e2',
    '#ffe600',
    '#38d430',
    '#9b4dff',
    '#00c2ff',
    '#ff8a00'
];

let confettiLayer = null;
let confettiTimer = 0;

const dropConfetti = (count) =>
{
    if (prefersReducedMotion())
    {
        return;
    }

    if (!confettiLayer)
    {
        confettiLayer = document.createElement('div');
        confettiLayer.className = 'egg-confetti';
        confettiLayer.setAttribute('aria-hidden', 'true');
        document.body.appendChild(confettiLayer);
    }

    for (let i = 0; i < count; i++)
    {
        const bit = document.createElement('span');
        bit.className = 'egg-confetti-bit';
        bit.style.left = rand(0, 100).toFixed(2) + 'vw';
        bit.style.background = pick(CONFETTI_COLORS);
        bit.style.setProperty('--drift', Math.round(rand(-160, 160)) + 'px');
        bit.style.setProperty('--spin', Math.round(rand(-900, 900)) + 'deg');
        bit.style.animationDuration = rand(2.4, 4.6).toFixed(2) + 's';
        bit.style.animationDelay = rand(0, 0.6).toFixed(2) + 's';

        if (Math.random() < 0.35)
        {
            bit.style.borderRadius = '50%';
        }

        confettiLayer.appendChild(bit);
        bit.addEventListener('animationend', () => bit.remove(), { once: true });
    }
};

const startConfetti = () =>
{
    if (prefersReducedMotion() || confettiTimer)
    {
        return;
    }

    dropConfetti(70);

    confettiTimer = window.setInterval(() => dropConfetti(16), 700);
};

const stopConfetti = () =>
{
    window.clearInterval(confettiTimer);
    confettiTimer = 0;

    if (confettiLayer)
    {
        confettiLayer.remove();
        confettiLayer = null;
    }
};

const NO_DRAG_SELECTOR = [
    'img',
    '.brand',
    '.invite-button',
    '.button-secondary',
    '.kofi-button',
    '.supporter-chip',
    '.topgg-link',
    '.botlist-link',
    '.node-card',
    '.owner-flip',
    '.owner-text a',
    '.tag-item'
].join(', ');

const disableGhostDrag = () =>
{
    document.querySelectorAll(NO_DRAG_SELECTOR).forEach((el) => el.setAttribute('draggable', 'false'));

    document.addEventListener('dragstart', (e) =>
    {
        const el = e.target;
        if (el && el.closest && el.closest(NO_DRAG_SELECTOR))
        {
            e.preventDefault();
        }
    });
};

const attachKofi = () =>
{
    document.querySelectorAll('.kofi-button').forEach((button) =>
    {
        button.addEventListener('click', () => heartBurst(12));
    });
};

const OWNER_TILT_DEG = 9;

const OWNER_IMG_BASE = 'https://cdn.relaxy.xyz/relaxy/website/img/people/';
const OWNER_IMG_COUNT = 17;
const OWNER_CURRENT = 'owner7';

const attachOwnerCard = () =>
{
    const photo = document.getElementById('ownerPhoto');
    const flip = photo && photo.querySelector('.owner-flip');
    const inner = flip && flip.querySelector('.owner-flip-inner');
    const front = flip && flip.querySelector('.owner-front');
    const back = flip && flip.querySelector('.owner-back');
    if (!flip || !inner || !front || !back)
    {
        return;
    }

    const urls = [];
    for (let i = 1; i <= OWNER_IMG_COUNT; i++)
    {
        urls.push(OWNER_IMG_BASE + 'owner' + i + '.webp');
    }

    let currentIndex = urls.indexOf(OWNER_IMG_BASE + OWNER_CURRENT + '.webp');
    if (currentIndex < 0)
    {
        currentIndex = 0;
    }

    let bag = [];

    const refill = () =>
    {
        bag = urls.map((_, i) => i);
        for (let i = bag.length - 1; i > 0; i--)
        {
            const j = Math.floor(Math.random() * (i + 1));
            [bag[i], bag[j]] = [bag[j], bag[i]];
        }
    };

    const draw = (exclude) =>
    {
        if (!bag.length)
        {
            refill();
        }

        let at = bag.findIndex((i) => i !== exclude);
        if (at < 0)
        {
            refill();
            at = bag.findIndex((i) => i !== exclude);
            if (at < 0)
            {
                at = 0;
            }
        }

        return bag.splice(at, 1)[0];
    };

    refill();
    const usedAt = bag.indexOf(currentIndex);
    if (usedAt >= 0)
    {
        bag.splice(usedAt, 1);
    }

    let frontIndex = currentIndex;
    let backIndex = draw(currentIndex);
    front.src = urls[frontIndex];
    back.src = urls[backIndex];

    let flipped = false;
    let busy = false;

    flip.addEventListener('click', () =>
    {
        if (busy)
        {
            return;
        }
        busy = true;

        flipped = !flipped;
        flip.classList.toggle('is-flipped', flipped);
        flip.setAttribute('aria-pressed', String(flipped));

        const shownIndex = flipped
            ? backIndex
            : frontIndex;

        let done = false;
        const advance = () =>
        {
            if (done)
            {
                return;
            }
            done = true;
            inner.removeEventListener('transitionend', onEnd);

            const nextIndex = draw(shownIndex);
            if (flipped)
            {
                frontIndex = nextIndex;
                front.src = urls[nextIndex];
            }
            else
            {
                backIndex = nextIndex;
                back.src = urls[nextIndex];
            }

            busy = false;
        };

        const onEnd = (e) =>
        {
            if (e.target === inner && e.propertyName === 'transform')
            {
                advance();
            }
        };

        inner.addEventListener('transitionend', onEnd);
        window.setTimeout(advance, 600);
    });

    if (prefersReducedMotion())
    {
        return;
    }

    photo.addEventListener('pointermove', (e) =>
    {
        const box = photo.getBoundingClientRect();
        const nx = (e.clientX - box.left) / box.width - 0.5;
        const ny = (e.clientY - box.top) / box.height - 0.5;

        flip.style.setProperty('--ry', (nx * OWNER_TILT_DEG * 2).toFixed(2) + 'deg');
        flip.style.setProperty('--rx', (-ny * OWNER_TILT_DEG).toFixed(2) + 'deg');
    });

    photo.addEventListener('pointerleave', () =>
    {
        flip.style.removeProperty('--rx');
        flip.style.removeProperty('--ry');
    });
};

const attachEggs = () =>
{
    const anims = [
        'egg-spin',
        'egg-wobble',
        'egg-jump'
    ];

    const targets = document.querySelectorAll('.hero-logo, .footer-relaxy, .patreon-image, .eng-icon');
    targets.forEach((el) =>
    {
        let clicks = 0;
        el.style.cursor = 'pointer';
        el.addEventListener('click', () =>
        {
            clicks += 1;

            // Every fifth poke escalates from a nudge into a full barrel roll :D
            if (clicks % 5 === 0)
            {
                playEgg(el, 'egg-roll');
                return;
            }

            playEgg(el, anims[Math.floor(Math.random() * anims.length)]);
        });
    });
};

const KONAMI = [
    'ArrowUp',
    'ArrowUp',
    'ArrowDown',
    'ArrowDown',
    'ArrowLeft',
    'ArrowRight',
    'ArrowLeft',
    'ArrowRight',
    'b',
    'a'
];

const LOVE_WORDS = [
    {
        word: 'iloverelaxy',
        hearts: 46,
        confetti: true,
        toast: 'Relaxy! loves you MORE. 💞'
    },
    {
        word: 'iloveyou',
        hearts: 46,
        confetti: true,
        toast: 'Relaxy! loves you MORE. 💞'
    },
    {
        word: 'relaxy',
        hearts: 20,
        confetti: false,
        toast: 'Relaxy! loves you too.'
    },
    {
        word: 'love',
        hearts: 10,
        confetti: false,
        toast: 'Aww. Love you too. 💗'
    }
];

const LOVE_SETTLE_MS = 500;

const attachKeyboardEggs = () =>
{
    let konamiAt = 0;
    let typed = '';
    let settleTimer = 0;

    document.addEventListener('keydown', (e) =>
    {
        const tag = e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable)
        {
            return;
        }

        const key = e.key.length === 1
            ? e.key.toLowerCase()
            : e.key;

        konamiAt = key === KONAMI[konamiAt]
            ? konamiAt + 1
            : (key === KONAMI[0]
                ? 1
                : 0);

        if (konamiAt === KONAMI.length)
        {
            konamiAt = 0;

            const on = document.documentElement.classList.toggle('party-mode');
            if (on)
            {
                startConfetti();
            }
            else
            {
                stopConfetti();
            }

            eggToast(on
                ? 'Party mode! Relaxy! is dancing.'
                : 'Party over. Back to work.');
            return;
        }

        if (e.key.length !== 1)
        {
            return;
        }

        typed = (typed + key).slice(-16);

        window.clearTimeout(settleTimer);
        settleTimer = window.setTimeout(() =>
        {
            const hit = LOVE_WORDS.find((entry) => typed.endsWith(entry.word));
            if (!hit)
            {
                return;
            }

            typed = '';

            heartBurst(hit.hearts);
            eggToast(hit.toast);

            if (hit.confetti)
            {
                dropConfetti(80);
            }

            const mascot = document.querySelector('.hero-logo') || document.querySelector('.relaxy-coach-avatar');
            if (mascot)
            {
                playEgg(mascot, 'egg-jump');
            }
        }, LOVE_SETTLE_MS);
    });
};

const BUTTON_TILT_DEG = 13;
const BUTTON_PULL_PX = 7;

const attachButtonMagnet = () =>
{
    if (prefersReducedMotion())
    {
        return;
    }

    document.querySelectorAll('.button-secondary').forEach((button) =>
    {
        button.addEventListener('pointermove', (e) =>
        {
            const box = button.getBoundingClientRect();
            const nx = (e.clientX - box.left) / box.width - 0.5;
            const ny = (e.clientY - box.top) / box.height - 0.5;

            button.style.setProperty('--ry', (nx * BUTTON_TILT_DEG * 2).toFixed(2) + 'deg');
            button.style.setProperty('--rx', (-ny * BUTTON_TILT_DEG).toFixed(2) + 'deg');
            button.style.setProperty('--tx', (nx * BUTTON_PULL_PX * 2).toFixed(2) + 'px');
            button.style.setProperty('--ty', (ny * BUTTON_PULL_PX).toFixed(2) + 'px');
        });

        button.addEventListener('pointerleave', () =>
        {
            [
                '--rx',
                '--ry',
                '--tx',
                '--ty'
            ].forEach((prop) => button.style.removeProperty(prop));
        });
    });
};

const greetTheCurious = () =>
{
    if (!window.console || !console.log)
    {
        return;
    }

    console.log('%c  ___     _                 _ \n' + ' | _ \\___| |__ _ __ ___  _| |\n' + ' |   / -_) / _` \\ \\ / || |_|\n' + ' |_|_\\___|_\\__,_/_\\_\\\\_, (_)\n' + '                     |__/   ', 'color:#ff69b4;font-weight:700');
    console.log('%cPoking around? Good. It is all open source: https://codeberg.org/MattFor/relaxy-website' + '\nMaybe there are some more eggs here to find....', 'color:#4a90e2');
};

const fmtUptime = (seconds) =>
{
    const s = Math.max(0, Math.floor(seconds));
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);

    if (d > 0)
    {
        return d + 'd ' + h + 'h';
    }

    return h > 0
        ? h + 'h ' + m + 'm'
        : m + 'm';
};

const piFields = {
    os: (d) => d.os,
    kernel: (d) => d.kernel,
    arch: (d) => d.arch,
    cores: (d) => (d.cpu && d.cpu.cores != null
        ? d.cpu.cores + ' cores'
        : null),
    load: (d) => (d.cpu && typeof d.cpu.load === 'number'
        ? d.cpu.load.toFixed(0) + '%'
        : null),
    mem: (d) => (d.memory && d.memory.usedGb != null && d.memory.totalGb != null
        ? d.memory.usedGb + ' / ' + d.memory.totalGb + ' GB'
        : null),
    uptime: (d) => (typeof d.uptimeSeconds === 'number'
        ? fmtUptime(d.uptimeSeconds)
        : null),
    temp: (d) => (typeof d.temperatureC === 'number'
        ? d.temperatureC.toFixed(1) + ' °C'
        : null)
};

const PI_ONLINE_ENDPOINT = 'https://on.relaxy.xyz/';

const setPiStatus = (badge, state, label) =>
{
    badge.classList.remove('is-up', 'is-down', 'is-checking');
    badge.classList.add(state);
    badge.querySelector('.status-text').textContent = label;
};

const checkPiOnline = () =>
{
    const badge = document.getElementById('piStatus');
    if (!badge || !('fetch' in window))
    {
        return;
    }

    setPiStatus(badge, 'is-checking', 'Checking');

    fetch(PI_ONLINE_ENDPOINT, { cache: 'no-store' })
    .then((res) => res.text())
    .then((body) => body.trim() === '1')
    .catch(() => fetch(PI_ONLINE_ENDPOINT, {
        cache: 'no-store',
        mode: 'no-cors'
    }).then(() => true))
    .then((up) => setPiStatus(badge, up
        ? 'is-up'
        : 'is-down', up
        ? 'Online'
        : 'Offline'))
    .catch(() => setPiStatus(badge, 'is-down', 'Offline'));
};

const loadPiStats = () =>
{
    const card = document.getElementById('hostMachine');
    if (!card || !('fetch' in window))
    {
        return;
    }

    fetch('/status.json', { cache: 'no-store' })
    .then((res) => (res.ok
        ? res.json()
        : Promise.reject(res.status)))
    .then((data) =>
    {
        Object.keys(piFields).forEach((key) =>
        {
            const cell = card.querySelector('[data-pi="' + key + '"]');
            const value = piFields[key](data);
            if (cell && value != null && value !== '')
            {
                cell.textContent = value;
            }
        });

        card.classList.add('is-live');
    })
    .catch(() =>
    {
        // Feed is down;
    });
};

window.toggleTheme = toggleTheme;

const initPage = () =>
{
    syncThemeButton();
    buildBackgroundFx();
    disableGhostDrag();
    attachEggs();
    attachKeyboardEggs();
    attachButtonMagnet();
    attachKofi();
    attachOwnerCard();
    greetTheCurious();
    loadPiStats();

    if (document.getElementById('piStatus'))
    {
        checkPiOnline();
        window.setInterval(checkPiOnline, 60000);
    }
};

if (document.readyState === 'loading')
{
    document.addEventListener('DOMContentLoaded', initPage);
}
else
{
    initPage();
}

let bgFxTimer;
let bgFxLastW = window.innerWidth;

window.addEventListener('resize', () =>
{
    if (window.innerWidth === bgFxLastW)
    {
        return;
    }

    bgFxLastW = window.innerWidth;
    clearTimeout(bgFxTimer);
    bgFxTimer = setTimeout(buildBackgroundFx, 250);
});
