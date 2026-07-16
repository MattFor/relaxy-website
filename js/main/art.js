/**
 * Grr! stop looking here all is available at
 * @link https://codeberg.org/MattFor/relaxy-website
 */

(() =>
{
    const mq = (q) => !!(window.matchMedia && window.matchMedia(q).matches);

    const reduceMotion = mq('(prefers-reduced-motion: reduce)');

    const hasHover = mq('(hover: hover)') && mq('(pointer: fine)');

    const canDragArt = !reduceMotion;
    const canDrag = hasHover && !reduceMotion;

    const svgPoint = (svg, clientX, clientY) =>
    {
        if (!svg.createSVGPoint || !svg.getScreenCTM)
        {
            return null;
        }

        const ctm = svg.getScreenCTM();
        if (!ctm)
        {
            return null;
        }

        const point = svg.createSVGPoint();
        point.x = clientX;
        point.y = clientY;

        return point.matrixTransform(ctm.inverse());
    };

    const capture = (el, e) =>
    {
        if (el.setPointerCapture)
        {
            el.setPointerCapture(e.pointerId);
        }
    };

    const release = (el, e) =>
    {
        if (el.releasePointerCapture && el.hasPointerCapture && el.hasPointerCapture(e.pointerId))
        {
            el.releasePointerCapture(e.pointerId);
        }
    };

    const bindDrag = (el, handlers) =>
    {
        let active = false;

        const onMove = (e) =>
        {
            if (active)
            {
                handlers.move(e);
            }
        };

        const onUp = (e) =>
        {
            if (!active)
            {
                return;
            }

            active = false;
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onUp);
            release(el, e);
            handlers.end(e);
        };

        el.addEventListener('pointerdown', (e) =>
        {
            if (active || e.button > 0)
            {
                return;
            }

            e.preventDefault();
            active = true;
            capture(el, e);
            window.addEventListener('pointermove', onMove);
            window.addEventListener('pointerup', onUp);
            window.addEventListener('pointercancel', onUp);
            handlers.start(e);
        });

        el.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    };

    const SVG_NS = 'http://www.w3.org/2000/svg';

    const buildMatrixWeb = (svg, hub) =>
    {
        const linksG = svg.querySelector('.ma-links');
        const nodesG = svg.querySelector('.ma-nodes');
        const grabsG = svg.querySelector('.ma-grabs');
        if (!linksG || !nodesG || !grabsG)
        {
            return;
        }

        const COUNT = 7;
        const VIEW_W = 220;
        const VIEW_H = 130;
        const rnd = (a, b) => a + Math.random() * (b - a);
        const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

        const make = (tag, attrs) =>
        {
            const el = document.createElementNS(SVG_NS, tag);
            Object.keys(attrs).forEach((k) => el.setAttribute(k, attrs[k]));
            return el;
        };

        linksG.textContent = '';
        nodesG.textContent = '';
        grabsG.textContent = '';

        const spin = Math.random() * Math.PI * 2;
        const nodes = [];

        for (let i = 0; i < COUNT; i++)
        {
            const angle = spin + (i / COUNT) * Math.PI * 2 + rnd(-0.22, 0.22);
            const r = Math.random() < 0.5
                ? 5
                : 5.5;

            nodes.push({
                r,
                x: clamp(hub.x + Math.cos(angle) * rnd(62, 92), r + 2, VIEW_W - r - 2),
                y: clamp(hub.y + Math.sin(angle) * rnd(32, 48), r + 2, VIEW_H - r - 2),
                blue: Math.random() < 0.35
            });
        }

        const pulsing = nodes.map((_, i) => i);
        for (let i = pulsing.length - 1; i > 0; i--)
        {
            const j = Math.floor(Math.random() * (i + 1));
            const t = pulsing[i];
            pulsing[i] = pulsing[j];
            pulsing[j] = t;
        }
        const pulse = pulsing.slice(0, 3);

        nodes.forEach((n, i) =>
        {
            const classes = [];
            if (n.blue)
            {
                classes.push('b');
            }

            const at = pulse.indexOf(i);
            if (at > -1)
            {
                classes.push('ma-pulse');
                if (at % 2)
                {
                    classes.push('d');
                }
            }

            linksG.appendChild(make('line', {
                'data-a': 'h',
                'data-b': String(i),
                x1: hub.x,
                y1: hub.y,
                x2: n.x.toFixed(2),
                y2: n.y.toFixed(2)
            }));

            nodesG.appendChild(make('circle', {
                'data-node': String(i),
                class: classes.join(' '),
                cx: n.x.toFixed(2),
                cy: n.y.toFixed(2),
                r: n.r
            }));

            grabsG.appendChild(make('circle', {
                class: 'ma-grab',
                'data-grab': String(i),
                cx: n.x.toFixed(2),
                cy: n.y.toFixed(2),
                r: 13
            }));
        });

        let extra = 0;
        for (let i = 0; i < COUNT && extra < 3; i++)
        {
            const j = (i + 1) % COUNT;
            if (Math.random() >= 0.45)
            {
                continue;
            }

            extra += 1;
            linksG.appendChild(make('line', {
                class: 'b',
                'data-a': String(i),
                'data-b': String(j),
                x1: nodes[i].x.toFixed(2),
                y1: nodes[i].y.toFixed(2),
                x2: nodes[j].x.toFixed(2),
                y2: nodes[j].y.toFixed(2)
            }));
        }
    };

    const initMatrixWeb = () =>
    {
        const svg = document.querySelector('.matrix-art');
        if (!svg)
        {
            return;
        }

        buildMatrixWeb(svg, {
            x: 110,
            y: 62
        });

        const circles = Array.from(svg.querySelectorAll('[data-node]'));
        const grabs = Array.from(svg.querySelectorAll('[data-grab]'));
        const links = Array.from(svg.querySelectorAll('[data-a]'));
        if (!circles.length || !links.length)
        {
            return;
        }

        const HUB = {
            x: 110,
            y: 62
        };
        const MAX_DRAG = 24;
        const NEIGHBOUR_PULL = 0.24;
        const SETTLE_MS = 1400;

        const box = svg.viewBox.baseVal;
        const VIEW_W = box && box.width
            ? box.width
            : 220;
        const VIEW_H = box && box.height
            ? box.height
            : 130;

        const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

        const nodes = circles.map((el, i) =>
        {
            const r = parseFloat(el.getAttribute('r'));
            return {
                el,
                grab: grabs[i],
                r,
                pad: r + 1,
                hx: parseFloat(el.getAttribute('cx')),
                hy: parseFloat(el.getAttribute('cy')),
                ox: 0,
                oy: 0,
                x: parseFloat(el.getAttribute('cx')),
                y: parseFloat(el.getAttribute('cy')),
                phase: Math.random() * Math.PI * 2,
                ampX: 1.5 + Math.random() * 1.7,
                ampY: 1.3 + Math.random() * 1.7,
                speed: 0.45 + Math.random() * 0.5
            };
        });

        const neighbours = nodes.map(() => []);
        links.forEach((line) =>
        {
            const a = line.dataset.a;
            const b = line.dataset.b;
            if (a !== 'h' && b !== 'h')
            {
                neighbours[Number(a)].push(Number(b));
                neighbours[Number(b)].push(Number(a));
            }
        });

        let dragging = -1;
        let lastDragged = -1;
        let settleUntil = 0;
        let dragOx = 0;
        let dragOy = 0;

        const endpoint = (key) => (key === 'h'
            ? HUB
            : nodes[Number(key)]);

        const paint = () =>
        {
            nodes.forEach((n) =>
            {
                n.x = clamp(n.hx + n.ox, n.pad, VIEW_W - n.pad);
                n.y = clamp(n.hy + n.oy, n.pad, VIEW_H - n.pad);

                const x = n.x.toFixed(2);
                const y = n.y.toFixed(2);
                n.el.setAttribute('cx', x);
                n.el.setAttribute('cy', y);

                if (n.grab)
                {
                    n.grab.setAttribute('cx', x);
                    n.grab.setAttribute('cy', y);
                }
            });

            links.forEach((line) =>
            {
                const p = endpoint(line.dataset.a);
                const q = endpoint(line.dataset.b);
                line.setAttribute('x1', p.x.toFixed(2));
                line.setAttribute('y1', p.y.toFixed(2));
                line.setAttribute('x2', q.x.toFixed(2));
                line.setAttribute('y2', q.y.toFixed(2));
            });
        };

        let raf = 0;
        let started = 0;

        const frame = (ts) =>
        {
            if (!started)
            {
                started = ts;
            }
            const t = (ts - started) / 1000;

            const held = dragging < 0 && lastDragged >= 0 && ts < settleUntil;
            const puller = dragging >= 0
                ? dragging
                : (held
                    ? lastDragged
                    : -1);

            nodes.forEach((n, i) =>
            {
                let tx;
                let ty;

                if (dragging === i || (held && lastDragged === i))
                {
                    tx = dragOx;
                    ty = dragOy;
                }
                else
                {
                    tx = Math.sin(t * n.speed + n.phase) * n.ampX;
                    ty = Math.cos(t * n.speed * 0.85 + n.phase) * n.ampY;

                    if (puller >= 0 && neighbours[puller].indexOf(i) > -1)
                    {
                        tx += dragOx * NEIGHBOUR_PULL;
                        ty += dragOy * NEIGHBOUR_PULL;
                    }
                }

                const k = dragging === i
                    ? 0.45
                    : 0.07;
                n.ox += (tx - n.ox) * k;
                n.oy += (ty - n.oy) * k;
            });

            paint();
            raf = window.requestAnimationFrame(frame);
        };

        const lockHit = svg.querySelector('.ma-lock-hit');
        if (lockHit)
        {
            lockHit.addEventListener('click', () => svg.classList.toggle('lock-open'));
        }

        if (canDragArt)
        {
            svg.classList.add('is-interactive');
        }

        grabs.forEach((grab, i) =>
        {
            if (!canDragArt)
            {
                return;
            }

            bindDrag(grab, {
                start: () =>
                {
                    dragging = i;
                    lastDragged = i;
                    svg.classList.add('is-dragging');
                },

                move: (e) =>
                {
                    const p = svgPoint(svg, e.clientX, e.clientY);
                    if (!p)
                    {
                        return;
                    }

                    let dx = p.x - nodes[i].hx;
                    let dy = p.y - nodes[i].hy;
                    const len = Math.hypot(dx, dy);

                    if (len > MAX_DRAG)
                    {
                        dx *= MAX_DRAG / len;
                        dy *= MAX_DRAG / len;
                    }

                    dragOx = dx;
                    dragOy = dy;
                },

                end: () =>
                {
                    dragging = -1;
                    settleUntil = performance.now() + SETTLE_MS;
                    svg.classList.remove('is-dragging');
                }
            });
        });

        if (reduceMotion)
        {
            return;
        }

        const setRunning = (on) =>
        {
            if (on && !raf)
            {
                started = 0;
                raf = window.requestAnimationFrame(frame);
            }
            else if (!on && raf)
            {
                window.cancelAnimationFrame(raf);
                raf = 0;
            }
        };

        if ('IntersectionObserver' in window)
        {
            new IntersectionObserver((entries) =>
            {
                setRunning(entries.some((entry) => entry.isIntersecting));
            }, { threshold: 0 }).observe(svg);
        }
        else
        {
            setRunning(true);
        }
    };

    const initBotlistOrder = () =>
    {
        const svg = document.querySelector('.botlist-art');
        if (!svg)
        {
            return;
        }

        const rows = Array.from(svg.querySelectorAll('.bl-row'));
        if (rows.length < 2 || !canDragArt)
        {
            return;
        }

        svg.classList.add('is-interactive');

        const SLOT_Y = [
            14,
            50,
            86
        ];
        const RESET_MS = 5000;

        let order = rows.map((_, i) => i);
        let grabOffset = 0;
        let resetTimer = 0;

        const place = (row, y) =>
        {
            rows[row].style.transform = 'translate(0px, ' + y + 'px)';
        };

        const layout = (skip) =>
        {
            order.forEach((row, slot) =>
            {
                rows[row].classList.toggle('is-top', slot === 0);

                if (row !== skip)
                {
                    place(row, SLOT_Y[slot]);
                }
            });
        };

        const scheduleReset = () =>
        {
            window.clearTimeout(resetTimer);
            resetTimer = window.setTimeout(() =>
            {
                order = rows.map((_, i) => i);
                layout(-1);
            }, RESET_MS);
        };

        rows.forEach((row, i) =>
        {
            bindDrag(row, {
                start: (e) =>
                {
                    const p = svgPoint(svg, e.clientX, e.clientY);
                    grabOffset = p
                        ? p.y - SLOT_Y[order.indexOf(i)]
                        : 0;
                    row.classList.add('is-dragging');
                    window.clearTimeout(resetTimer);
                },

                move: (e) =>
                {
                    const p = svgPoint(svg, e.clientX, e.clientY);
                    if (!p)
                    {
                        return;
                    }

                    const first = SLOT_Y[0] - 12;
                    const last = SLOT_Y[SLOT_Y.length - 1] + 12;
                    const y = Math.max(first, Math.min(p.y - grabOffset, last));
                    place(i, y.toFixed(2));

                    let best = 0;
                    let bestGap = Infinity;
                    SLOT_Y.forEach((slotY, slot) =>
                    {
                        const gap = Math.abs(slotY - y);
                        if (gap < bestGap)
                        {
                            bestGap = gap;
                            best = slot;
                        }
                    });

                    const current = order.indexOf(i);
                    if (best !== current)
                    {
                        order.splice(current, 1);
                        order.splice(best, 0, i);
                        layout(i);
                    }
                },

                end: () =>
                {
                    row.classList.remove('is-dragging');
                    layout(-1);
                    scheduleReset();
                }
            });
        });

        layout(-1);
    };

    const initTopggBars = () =>
    {
        const svg = document.querySelector('.topgg-art');
        if (!svg)
        {
            return;
        }

        const bars = Array.from(svg.querySelectorAll('.tg-bar'));
        if (bars.length < 2 || !canDragArt)
        {
            return;
        }

        svg.classList.add('is-interactive');

        const SLOT_X = [
            22,
            58,
            94,
            130,
            166
        ];
        const RESET_MS = 5000;

        let order = bars.map((_, i) => i);
        let grabOffset = 0;
        let resetTimer = 0;

        const place = (bar, x) =>
        {
            bars[bar].style.transform = 'translate(' + x + 'px, 0px)';
        };

        const layout = (skip) =>
        {
            order.forEach((bar, slot) =>
            {
                bars[bar].classList.toggle('is-top', slot === 0);

                if (bar !== skip)
                {
                    place(bar, SLOT_X[slot]);
                }
            });
        };

        const scheduleReset = () =>
        {
            window.clearTimeout(resetTimer);
            resetTimer = window.setTimeout(() =>
            {
                order = bars.map((_, i) => i);
                layout(-1);
            }, RESET_MS);
        };

        bars.forEach((bar, i) =>
        {
            bindDrag(bar, {
                start: (e) =>
                {
                    const p = svgPoint(svg, e.clientX, e.clientY);
                    grabOffset = p
                        ? p.x - SLOT_X[order.indexOf(i)]
                        : 0;
                    bar.classList.add('is-dragging');
                    window.clearTimeout(resetTimer);
                },

                move: (e) =>
                {
                    const p = svgPoint(svg, e.clientX, e.clientY);
                    if (!p)
                    {
                        return;
                    }

                    const first = SLOT_X[0] - 16;
                    const last = SLOT_X[SLOT_X.length - 1] + 16;
                    const x = Math.max(first, Math.min(p.x - grabOffset, last));
                    place(i, x.toFixed(2));

                    let best = 0;
                    let bestGap = Infinity;
                    SLOT_X.forEach((slotX, slot) =>
                    {
                        const gap = Math.abs(slotX - x);
                        if (gap < bestGap)
                        {
                            bestGap = gap;
                            best = slot;
                        }
                    });

                    const current = order.indexOf(i);
                    if (best !== current)
                    {
                        order.splice(current, 1);
                        order.splice(best, 0, i);
                        layout(i);
                    }
                },

                end: () =>
                {
                    bar.classList.remove('is-dragging');
                    layout(-1);
                    scheduleReset();
                }
            });
        });

        layout(-1);
    };

    const HEART_GLYPHS = [
        '❤️',
        '💖',
        '💕',
        '💗',
        '💓'
    ];

    const MAX_CHIP_HEARTS = 14;

    const spawnChipHeart = (chip) =>
    {
        if (chip.querySelectorAll('.chip-heart').length >= MAX_CHIP_HEARTS)
        {
            return;
        }

        const heart = document.createElement('span');
        heart.className = 'chip-heart';
        heart.textContent = HEART_GLYPHS[Math.floor(Math.random() * HEART_GLYPHS.length)];
        heart.setAttribute('aria-hidden', 'true');
        heart.style.left = (14 + Math.random() * 72).toFixed(1) + '%';
        heart.style.fontSize = (0.65 + Math.random() * 0.5).toFixed(2) + 'rem';
        heart.style.setProperty('--drift', Math.round(Math.random() * 44 - 22) + 'px');

        const dur = 0.95 + Math.random() * 0.7;
        heart.style.animationDuration = dur.toFixed(2) + 's';

        chip.appendChild(heart);

        let gone = false;
        const kill = () =>
        {
            if (gone)
            {
                return;
            }

            gone = true;
            window.clearTimeout(timer);
            heart.remove();
        };

        const timer = window.setTimeout(kill, dur * 1000 + 400);
        heart.addEventListener('animationend', kill, { once: true });
    };

    let heartTimer = 0;

    const stopChipHearts = () =>
    {
        window.clearInterval(heartTimer);
        heartTimer = 0;
    };

    window.addEventListener('blur', stopChipHearts);
    document.addEventListener('visibilitychange', () =>
    {
        if (document.hidden)
        {
            stopChipHearts();
        }
    });

    const attachHearts = (el) =>
    {
        if (reduceMotion || !el)
        {
            return;
        }

        if (!hasHover)
        {
            el.addEventListener('pointerdown', () =>
            {
                for (let i = 0; i < 3; i++)
                {
                    window.setTimeout(() => spawnChipHeart(el), i * 110);
                }
            });

            return;
        }

        el.addEventListener('pointerenter', () =>
        {
            stopChipHearts();
            spawnChipHeart(el);
            heartTimer = window.setInterval(() => spawnChipHeart(el), 260);
        });

        el.addEventListener('pointerleave', stopChipHearts);
        el.addEventListener('pointercancel', stopChipHearts);
    };

    const initSupporters = () =>
    {
        const chips = Array.from(document.querySelectorAll('.supporter-chip'));
        if (!chips.length)
        {
            return;
        }

        chips.forEach((chip) =>
        {
            attachHearts(chip);

            if (!canDrag)
            {
                return;
            }

            let dragging = false;
            let startX = 0;
            let startY = 0;
            let moved = 0;

            chip.addEventListener('pointerdown', (e) =>
            {
                e.preventDefault();
                dragging = true;
                moved = 0;
                startX = e.clientX;
                startY = e.clientY;
                chip.classList.add('is-dragging');
                capture(chip, e);
            });

            chip.addEventListener('pointermove', (e) =>
            {
                if (!dragging)
                {
                    return;
                }

                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                moved = Math.max(moved, Math.hypot(dx, dy));
                chip.style.transform = 'translate(' + dx.toFixed(1) + 'px, ' + dy.toFixed(1) + 'px)';
            });

            const stop = (e) =>
            {
                if (!dragging)
                {
                    return;
                }

                dragging = false;
                release(chip, e);
                chip.classList.remove('is-dragging');

                chip.style.transform = '';
            };

            chip.addEventListener('pointerup', stop);
            chip.addEventListener('pointercancel', stop);

            chip.addEventListener('click', (e) =>
            {
                if (moved > 4)
                {
                    e.preventDefault();
                }
                moved = 0;
            });
        });
    };

    const initLegendHearts = () =>
    {
        attachHearts(document.querySelector('.tier-key[data-tier="supporter"]'));
    };

    initMatrixWeb();
    initBotlistOrder();
    initTopggBars();
    initSupporters();
    initLegendHearts();
})();
