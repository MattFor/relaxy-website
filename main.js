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
        // storage unavailable so theme won't persist
    }

    syncThemeButton();
};

let bgFxSize = '';

const buildBackgroundFx = () =>
{
    const W = Math.max(320, window.innerWidth);
    const H = Math.max(320, window.innerHeight);

    const key = W + 'x' + H;
    if (document.querySelector('.bg-fx') && key === bgFxSize)
    {
        return;
    }
    bgFxSize = key;

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

    const parts = [];
    const nodes = [];
    const flows = [];

    const trace = (flow) =>
    {
        const start = edgePoint();
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
            const len = snap(flow
                ? rnd(160, 440)
                : rnd(80, 300)) * (chance(0.5)
                ? 1
                : -1);
            if (horiz)
            {
                const nx = clamp(x + len, 0, W);
                pathLen += Math.abs(nx - x);
                x = nx;
                d += ' H' + x;
            }
            else
            {
                const ny = clamp(y + len, 0, H);
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

    const svg = '<svg class="bg-fx-svg" xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">' + parts.join('') + '</svg>';

    const existing = document.querySelector('.bg-fx');
    if (existing)
    {
        existing.remove();
    }

    const fx = document.createElement('div');
    fx.className = 'bg-fx';
    fx.setAttribute('aria-hidden', 'true');
    fx.innerHTML = svg;

    document.body.prepend(fx);
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
        el.style.cursor = 'pointer';
        el.addEventListener('click', () =>
        {
            if (el.dataset.egging)
            {
                return;
            }
            const anim = anims[Math.floor(Math.random() * anims.length)];
            el.dataset.egging = '1';
            el.classList.add(anim);
            el.addEventListener('animationend', () =>
            {
                el.classList.remove(anim);
                delete el.dataset.egging;
            }, { once: true });
        });
    });
};

window.toggleTheme = toggleTheme;

const initPage = () =>
{
    syncThemeButton();
    buildBackgroundFx();
    attachEggs();
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
window.addEventListener('resize', () =>
{
    clearTimeout(bgFxTimer);
    bgFxTimer = setTimeout(buildBackgroundFx, 250);
});
