/**
 * Grr! stop looking here all is available at
 * @link https://codeberg.org/MattFor/relaxy-website
 */

(() =>
{
    const mq = (q) => !!(window.matchMedia && window.matchMedia(q).matches);

    const reduceMotion = mq('(prefers-reduced-motion: reduce)');

    const canDrag = mq('(pointer: fine)') && !reduceMotion;

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

    const initMatrixWeb = () =>
    {
        const svg = document.querySelector('.matrix-art');
        if (!svg)
        {
            return;
        }

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

        if (canDrag)
        {
            svg.classList.add('is-interactive');
        }

        grabs.forEach((grab, i) =>
        {
            if (!canDrag)
            {
                return;
            }

            grab.addEventListener('pointerdown', (e) =>
            {
                e.preventDefault();
                dragging = i;
                lastDragged = i;
                capture(grab, e);
                svg.classList.add('is-dragging');
            });

            grab.addEventListener('pointermove', (e) =>
            {
                if (dragging !== i)
                {
                    return;
                }

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
            });

            const stop = (e) =>
            {
                if (dragging !== i)
                {
                    return;
                }

                release(grab, e);
                dragging = -1;
                settleUntil = performance.now() + SETTLE_MS;
                svg.classList.remove('is-dragging');
            };

            grab.addEventListener('pointerup', stop);
            grab.addEventListener('pointercancel', stop);
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
        if (rows.length < 2 || !canDrag)
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
        let dragRow = -1;
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
            row.addEventListener('pointerdown', (e) =>
            {
                e.preventDefault();
                const p = svgPoint(svg, e.clientX, e.clientY);
                dragRow = i;
                grabOffset = p
                    ? p.y - SLOT_Y[order.indexOf(i)]
                    : 0;
                row.classList.add('is-dragging');
                capture(row, e);
                window.clearTimeout(resetTimer);
            });

            row.addEventListener('pointermove', (e) =>
            {
                if (dragRow !== i)
                {
                    return;
                }

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
            });

            const stop = (e) =>
            {
                if (dragRow !== i)
                {
                    return;
                }

                release(row, e);
                row.classList.remove('is-dragging');
                dragRow = -1;
                layout(-1);
                scheduleReset();
            };

            row.addEventListener('pointerup', stop);
            row.addEventListener('pointercancel', stop);
        });

        layout(-1);
    };

    initMatrixWeb();
    initBotlistOrder();
})();
