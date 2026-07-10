/**
 * Grr! stop looking here all is available at
 * @link https://codeberg.org/MattFor/relaxy-website
 */

(() =>
{
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const revealables = document.querySelectorAll('.reveal');

    if (reduceMotion || !('IntersectionObserver' in window))
    {
        revealables.forEach((el) => el.classList.add('is-visible'));
    }
    else
    {
        const revealObserver = new IntersectionObserver((entries, obs) =>
        {
            entries.forEach((entry) =>
            {
                if (!entry.isIntersecting)
                {
                    return;
                }

                entry.target.style.transitionDelay = (entry.target.dataset.revealDelay || '0') + 'ms';
                entry.target.classList.add('is-visible');
                obs.unobserve(entry.target);
            });
        }, {
            rootMargin: '0px 0px -8% 0px',
            threshold: 0.12
        });

        revealables.forEach((el) => revealObserver.observe(el));
    }

    const navLinks = Array.from(document.querySelectorAll('.site-nav a[href^=\'#\']'));
    if (navLinks.length && 'IntersectionObserver' in window)
    {
        const byId = new Map(navLinks.map((a) => [
            a.getAttribute('href').slice(1),
            a
        ]));

        const sections = navLinks
        .map((a) => document.getElementById(a.getAttribute('href').slice(1)))
        .filter(Boolean);

        const setActive = (id) =>
        {
            navLinks.forEach((a) =>
            {
                const on = a.getAttribute('href').slice(1) === id;
                a.classList.toggle('is-active', on);
                if (on)
                {
                    a.setAttribute('aria-current', 'true');
                }
                else
                {
                    a.removeAttribute('aria-current');
                }
            });
        };

        const navObserver = new IntersectionObserver((entries) =>
        {
            const visible = entries
            .filter((e) => e.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
            if (visible && byId.has(visible.target.id))
            {
                setActive(visible.target.id);
            }
        }, {
            rootMargin: '-45% 0px -45% 0px',
            threshold: [
                0,
                0.25,
                0.5,
                1
            ]
        });

        sections.forEach((s) => navObserver.observe(s));
    }

    const data = window.RELAXY_COMMANDS;

    const grid = document.getElementById('cmd-grid');
    if (data && grid)
    {
        const catLabels = {
            fun: 'Fun',
            image: 'Image',
            miscellaneous: 'Miscellaneous',
            moderation: 'Moderation',
            music: 'Music'
        };

        const byCategory = new Map();
        let total = 0;
        for (const [name, info] of Object.entries(data))
        {
            if (!byCategory.has(info.c))
            {
                byCategory.set(info.c, []);
            }
            byCategory.get(info.c).push(name);
            total += 1;
        }

        const frag = document.createDocumentFragment();
        for (const [cat, names] of byCategory)
        {
            const section = document.createElement('div');
            section.className = 'cmd-category';

            const heading = document.createElement('h3');
            heading.textContent = (catLabels[cat] || cat.charAt(0).toUpperCase() + cat.slice(1)) + ' ';
            const count = document.createElement('span');
            count.className = 'count';
            count.textContent = names.length + (names.length === 1
                ? ' command'
                : ' commands');
            heading.appendChild(count);
            section.appendChild(heading);

            const chipGrid = document.createElement('div');
            chipGrid.className = 'chip-grid';
            names.forEach((name) =>
            {
                const chip = document.createElement('button');
                chip.type = 'button';
                chip.className = 'chip';
                chip.dataset.cmd = name;
                chip.textContent = name;
                chipGrid.appendChild(chip);
            });
            section.appendChild(chipGrid);
            frag.appendChild(section);
        }
        grid.appendChild(frag);

        const totalEl = document.getElementById('cmd-total');
        if (totalEl)
        {
            totalEl.textContent = String(total);
        }
    }

    let cmdHelp = null;

    const chips = document.querySelectorAll('.chip[data-cmd]');
    if (data)
    {
        const tip = document.createElement('div');
        tip.className = 'cmd-tip';
        tip.setAttribute('role', 'tooltip');
        tip.innerHTML = '<div class="cmd-tip-head">' + '<p class="cmd-name"></p>' + '</div>' + '<div class="cmd-body cmd-help"></div>' + '<p class="cmd-hint"></p>';
        const elName = tip.querySelector('.cmd-name');
        const elBody = tip.querySelector('.cmd-body');
        const elHint = tip.querySelector('.cmd-hint');
        document.body.appendChild(tip);

        const lookup = Object.create(null);
        const chipByName = new Map();
        chips.forEach((c) => chipByName.set(c.dataset.cmd, c));

        Object.keys(data).forEach((name) =>
        {
            lookup[name.toLowerCase()] = name;
            (data[name].a || []).forEach((alias) =>
            {
                if (!(alias.toLowerCase() in lookup))
                {
                    lookup[alias.toLowerCase()] = name;
                }
            });
        });

        const escapeHtml = (s) => String(s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        const renderInline = (s) => escapeHtml(s)
        .replace(/\[([^\]]+)]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/__([^_]+)__/g, '<u>$1</u>')
        .replace(/~~([^~]+)~~/g, '<s>$1</s>')
        .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');

        const renderCode = (lang, content) =>
        {
            const code = content.replace(/^\n+|\n+$/g, '');
            const kind = (lang || '').toLowerCase();

            if (kind === 'diff')
            {
                const rows = escapeHtml(code).split('\n').map((l) =>
                {
                    const t = l.replace(/^\s+/, '');
                    const cls = t.startsWith('+')
                        ? 'diff-add'
                        : (t.startsWith('-')
                            ? 'diff-del'
                            : 'diff-ctx');
                    return '<span class="diff-row ' + cls + '">' + (l === ''
                        ? ' '
                        : l) + '</span>';
                }).join('');
                return '<pre class="cmd-code cmd-code-diff">' + rows + '</pre>';
            }

            const cls = kind
                ? ' cmd-code-' + kind.replace(/[^a-z0-9]/g, '')
                : '';
            return '<pre class="cmd-code' + cls + '">' + escapeHtml(code) + '</pre>';
        };

        const renderText = (text) =>
        {
            let out = '';
            let listOpen = false;
            let para = [];
            const flushPara = () =>
            {
                if (para.length)
                {
                    out += '<p class="cmd-para">' + para.join('<br>') + '</p>';
                    para = [];
                }
            };
            const closeList = () =>
            {
                if (listOpen)
                {
                    out += '</ul>';
                    listOpen = false;
                }
            };

            text.split('\n').forEach((raw) =>
            {
                const line = raw.replace(/\s+$/, '');
                const heading = line.match(/^(#{1,3})\s+(.*)$/);
                const bullet = line.match(/^\s*[-*]\s+(.*)$/);

                if (heading)
                {
                    flushPara();
                    closeList();
                    out += '<p class="cmd-h cmd-h' + heading[1].length + '">' + renderInline(heading[2]) + '</p>';
                }
                else if (bullet)
                {
                    flushPara();
                    if (!listOpen)
                    {
                        out += '<ul class="cmd-list">';
                        listOpen = true;
                    }
                    out += '<li>' + renderInline(bullet[1]) + '</li>';
                }
                else if (line.trim() === '')
                {
                    flushPara();
                    closeList();
                }
                else
                {
                    closeList();
                    para.push(renderInline(line));
                }
            });

            flushPara();
            closeList();
            return out;
        };

        const mdToHtml = (src) =>
        {
            if (!src)
            {
                return '';
            }
            const fence = /```(\w*)[^\S\n]*\n?([\s\S]*?)```/g;
            let out = '';
            let last = 0;
            let m;
            while ((m = fence.exec(src)))
            {
                if (m.index > last)
                {
                    out += renderText(src.slice(last, m.index));
                }
                out += renderCode(m[1], m[2]);
                last = m.index + m[0].length;
            }
            if (last < src.length)
            {
                out += renderText(src.slice(last));
            }
            return out;
        };

        const metaFields = [
            {
                keys: [
                    'p',
                    'perms',
                    'permissions'
                ],
                label: 'Permissions',
                pills: true
            },
            {
                keys: [
                    'up',
                    'userPermissions'
                ],
                label: 'You need',
                pills: true
            },
            {
                keys: [
                    'bp',
                    'botPermissions'
                ],
                label: 'Relaxy needs',
                pills: true
            },
            {
                keys: [
                    'cd',
                    'cooldown'
                ],
                label: 'Cooldown',
                cooldown: true
            },
            {
                keys: [
                    'e',
                    'examples'
                ],
                label: 'Examples',
                code: true
            }
        ];
        const firstDefined = (info, keys) =>
        {
            for (const k of keys)
            {
                if (info[k] != null && info[k] !== '')
                {
                    return info[k];
                }
            }
            return undefined;
        };
        const toArray = (v) => (Array.isArray(v)
            ? v
            : [v]);
        const catLabel = (c) => (c
            ? c.charAt(0).toUpperCase() + c.slice(1)
            : '');
        const field = (label, valueHtml) => '<div class="cmd-field"><span class="cmd-field-label">' + label + '</span><span class="cmd-field-val">' + valueHtml + '</span></div>';
        const pill = (text, cls) => '<span class="cmd-pill' + (cls
            ? ' ' + cls
            : '') + '">' + escapeHtml(String(text)) + '</span>';

        const renderMeta = (info) =>
        {
            let html = '';
            metaFields.forEach((f) =>
            {
                const v = firstDefined(info, f.keys);
                if (v == null || (Array.isArray(v) && !v.length))
                {
                    return;
                }
                let valHtml;
                if (f.cooldown)
                {
                    valHtml = pill(/^\d+$/.test(String(v))
                        ? v + 's'
                        : v);
                }
                else if (f.pills)
                {
                    valHtml = toArray(v).map((x) => pill(x)).join('');
                }
                else if (f.code)
                {
                    valHtml = toArray(v)
                    .map((x) => '<code>' + escapeHtml(String(x)) + '</code>').join('<br>');
                }
                else
                {
                    valHtml = escapeHtml(String(v));
                }
                html += field(f.label, valHtml);
            });
            if (info.nsfw)
            {
                html += field('NSFW', pill('18+ only', 'cmd-pill-warn'));
            }
            if (info.dis)
            {
                html += field('Status', pill('DISABLED', 'cmd-pill-warn'));
            }
            return html;
        };

        const buildBody = (name, info, full, withCategory) =>
        {
            let html = '<code class="cmd-usage">' + escapeHtml(info.u || '=' + name) + '</code>';
            if (info.a && info.a.length)
            {
                html += field('Aliases', info.a
                .map((a) => '<code>=' + escapeHtml(a) + '</code>').join(' '));
            }
            if (full && withCategory)
            {
                if (info.c)
                {
                    html += field('Category', pill(catLabel(info.c)));
                }
            }
            html += renderMeta(info);
            html += '<div class="cmd-desc">' + mdToHtml(info.d || 'No description.') + '</div>';
            return html;
        };

        const suggestSource = Object.keys(data).map((name) => ({
            name,
            hay: (name + ' ' + (data[name].a || []).join(' ')).toLowerCase()
        }));

        cmdHelp = {
            renderFull: (name) => (data[name]
                ? buildBody(name, data[name], true, true)
                : ''),
            resolve: (q) => lookup[String(q).trim().toLowerCase().replace(/^=/, '')],
            suggest: (q) =>
            {
                const s = String(q).trim().toLowerCase().replace(/^=/, '');
                if (!s)
                {
                    return [];
                }

                const starts = [];
                const contains = [];
                for (const item of suggestSource)
                {
                    if (item.name.startsWith(s))
                    {
                        starts.push(item.name);
                    }
                    else if (item.hay.indexOf(s) > -1)
                    {
                        contains.push(item.name);
                    }
                }

                return starts.concat(contains).slice(0, 8);
            }
        };

        let pinned = null;

        const place = (chip) =>
        {
            const margin = 10;
            const gap = 8;
            const r = chip.getBoundingClientRect();

            const spaceBelow = window.innerHeight - r.bottom - gap - margin;
            const spaceAbove = r.top - gap - margin;
            const below = spaceBelow >= spaceAbove;

            const mobileShare = tip.classList.contains('is-full')
                ? 0.72
                : 0.58;
            const viewportCap = window.innerWidth <= 720
                ? Math.floor(window.innerHeight * mobileShare)
                : window.innerHeight - margin * 2;
            const avail = Math.min(Math.max(below
                ? spaceBelow
                : spaceAbove, 140), viewportCap);

            tip.style.maxHeight = avail + 'px';

            tip.style.left = '0';
            tip.style.top = '0';
            const tr = tip.getBoundingClientRect();
            let left = r.left + r.width / 2 - tr.width / 2;
            left = Math.max(margin, Math.min(left, window.innerWidth - tr.width - margin));
            const top = below
                ? r.bottom + gap
                : r.top - tr.height - gap;
            tip.style.left = Math.round(left) + 'px';
            tip.style.top = Math.round(Math.max(margin, top)) + 'px';
        };

        const render = (name, info, full, withCategory) =>
        {
            elName.textContent = '=' + name;
            elBody.innerHTML = buildBody(name, info, full, withCategory);
            tip.classList.toggle('is-full', !!full);
            elHint.textContent = full
                ? 'Press Esc or click away to close'
                : 'Click to keep this open';
        };

        const show = (chip) =>
        {
            const info = data[chip.dataset.cmd];
            if (!info)
            {
                return;
            }
            render(chip.dataset.cmd, info, false);
            tip.classList.add('is-open');
            place(chip);
        };

        const showFull = (name) =>
        {
            const info = data[name];
            if (!info)
            {
                return;
            }
            const targetChip = chipByName.get(name);
            if (pinned && pinned !== targetChip)
            {
                pinned.classList.remove('is-active');
            }
            if (targetChip)
            {
                pinned = targetChip;
                targetChip.classList.add('is-active');
            }
            render(name, info, true, false);
            tip.classList.add('is-open', 'is-pinned');
            if (pinned)
            {
                place(pinned);
            }
        };

        const hide = () =>
        {
            if (pinned)
            {
                return;
            }
            tip.classList.remove('is-open', 'is-pinned', 'is-full');
        };

        const clearPin = () =>
        {
            if (!pinned)
            {
                return;
            }
            pinned.classList.remove('is-active');
            pinned = null;
            tip.classList.remove('is-pinned', 'is-open', 'is-full');
        };

        chips.forEach((chip) =>
        {
            chip.addEventListener('mouseenter', () =>
            {
                if (!pinned)
                {
                    show(chip);
                }
            });

            chip.addEventListener('mouseleave', hide);
            chip.addEventListener('focus', () =>
            {
                if (!pinned)
                {
                    show(chip);
                }
            });

            chip.addEventListener('blur', hide);
            chip.addEventListener('click', (e) =>
            {
                e.stopPropagation();
                if (pinned === chip)
                {
                    clearPin();
                    return;
                }
                showFull(chip.dataset.cmd);
            });
        });

        document.addEventListener('click', (e) =>
        {
            if (pinned && !tip.contains(e.target))
            {
                clearPin();
            }
        });
        document.addEventListener('keydown', (e) =>
        {
            if (e.key === 'Escape')
            {
                clearPin();
                tip.classList.remove('is-open');
            }
        });

        const isMobile = window.matchMedia('(pointer: coarse)').matches;

        window.addEventListener('scroll', () =>
        {
            if (isMobile)
            {
                if (pinned)
                {
                    clearPin();
                }
                else
                {
                    tip.classList.remove('is-open');
                }

                return;
            }

            if (pinned)
            {
                const r = pinned.getBoundingClientRect();
                const offscreen = r.bottom < -80 || r.top > window.innerHeight + 80;

                if (offscreen)
                {
                    clearPin();
                }
                else
                {
                    place(pinned);
                }
            }
            else if (tip.classList.contains('is-open'))
            {
                tip.classList.remove('is-open');
            }
        }, { passive: true });
    }

    const coach = document.getElementById('relaxyCoach');
    if (coach)
    {
        const STORAGE_KEY = 'relaxyCoachState';
        const LEGACY_KEY = 'relaxyCoachDismissed';

        let manuallyTucked = false;
        try
        {
            if (localStorage.getItem(LEGACY_KEY) === '1')
            {
                localStorage.removeItem(LEGACY_KEY);
                localStorage.setItem(STORAGE_KEY, 'tucked');
            }

            manuallyTucked = localStorage.getItem(STORAGE_KEY) === 'tucked';
        }
        catch (e)
        {
            // Storage unavailable
        }

        let flashTimer = 0;

        const panel = coach.querySelector('.relaxy-coach-panel');
        const hint = coach.querySelector('.relaxy-coach-hint');
        const avatar = coach.querySelector('.relaxy-coach-avatar');
        const closeBtn = coach.querySelector('.relaxy-coach-close');
        const resizeHandle = coach.querySelector('.relaxy-coach-resize');
        const input = coach.querySelector('.relaxy-coach-input');
        const result = coach.querySelector('.relaxy-coach-result');

        const flash = () =>
        {
            coach.classList.remove('is-flashing');
            void coach.offsetWidth;
            coach.classList.add('is-flashing');
            window.clearTimeout(flashTimer);
            flashTimer = window.setTimeout(() => coach.classList.remove('is-flashing'), 4000);
        };

        const reveal = () =>
        {
            if (!coach.hidden)
            {
                return;
            }
            coach.hidden = false;
            coach.classList.add('is-tucked');
            requestAnimationFrame(() => coach.classList.add('is-visible'));
        };

        const tuck = () =>
        {
            manuallyTucked = true;
            closeSearch();
            coach.classList.add('is-tucked');
            try
            {
                localStorage.setItem(STORAGE_KEY, 'tucked');
            }
            catch (e)
            {
                // Nothing...
            }
        };

        const untuck = () =>
        {
            if (!coach.classList.contains('is-tucked'))
            {
                return;
            }
            coach.classList.remove('is-tucked');
            try
            {
                localStorage.removeItem(STORAGE_KEY);
            }
            catch (e)
            {
                // Nothing...
            }

            flash();
        };

        const openSearch = () =>
        {
            if (!cmdHelp)
            {
                return;
            }
            coach.classList.add('is-open');
            if (input)
            {
                input.focus();
            }
        };

        const resetSize = () =>
        {
            if (panel)
            {
                panel.style.width = '';
                panel.style.maxWidth = '';
            }
            if (result)
            {
                result.style.maxHeight = '';
            }
        };

        const closeSearch = () =>
        {
            coach.classList.remove('is-open', 'has-result');
            resetSize();
            closeSuggest();
            if (input)
            {
                input.value = '';
            }
            if (result)
            {
                result.innerHTML = '';
            }
        };

        const runSearch = () =>
        {
            if (!cmdHelp || !result)
            {
                return;
            }
            const name = cmdHelp.resolve(input.value);
            if (!name)
            {
                result.innerHTML = input.value.trim()
                    ? '<p class="relaxy-coach-empty">Invalid command name, try again!</p>'
                    : '';
                coach.classList.remove('has-result');
                resetSize();
                return;
            }
            result.innerHTML = '<p class="cmd-name">=' + name + '</p>' + cmdHelp.renderFull(name);
            input.value = '=' + name;
            coach.classList.add('has-result');
            closeSuggest();
        };

        if (resizeHandle && panel && result)
        {
            let startX = 0, startY = 0, startW = 0, startH = 0;

            const onMove = (e) =>
            {
                const maxW = Math.min(640, window.innerWidth - 140);
                const maxH = Math.round(window.innerHeight * 0.7);
                const w = Math.min(Math.max(startW + (startX - e.clientX), 320), maxW);
                const h = Math.min(Math.max(startH + (startY - e.clientY), 120), maxH);
                panel.style.width = w + 'px';
                panel.style.maxWidth = w + 'px';
                result.style.maxHeight = h + 'px';
            };

            const onUp = (e) =>
            {
                if (resizeHandle.releasePointerCapture)
                {
                    resizeHandle.releasePointerCapture(e.pointerId);
                }

                coach.classList.remove('is-resizing');
                window.removeEventListener('pointermove', onMove);
                window.removeEventListener('pointerup', onUp);
            };

            resizeHandle.addEventListener('pointerdown', (e) =>
            {
                e.preventDefault();
                startX = e.clientX;
                startY = e.clientY;
                startW = panel.getBoundingClientRect().width;
                startH = result.getBoundingClientRect().height;

                if (resizeHandle.setPointerCapture)
                {
                    resizeHandle.setPointerCapture(e.pointerId);
                }

                coach.classList.add('is-resizing');
                window.addEventListener('pointermove', onMove);
                window.addEventListener('pointerup', onUp);
            });
        }

        let activeIdx = -1;
        let suggestBox = null;
        if (input && input.parentNode)
        {
            suggestBox = document.createElement('ul');
            suggestBox.className = 'relaxy-coach-suggest';
            suggestBox.setAttribute('role', 'listbox');
            input.insertAdjacentElement('afterend', suggestBox);
        }

        const closeSuggest = () =>
        {
            activeIdx = -1;
            if (suggestBox)
            {
                suggestBox.innerHTML = '';
                suggestBox.classList.remove('is-open');
            }
        };

        const setActiveSuggest = (idx) =>
        {
            if (!suggestBox)
            {
                return;
            }

            const items = suggestBox.children;
            if (!items.length)
            {
                return;
            }

            activeIdx = (idx + items.length) % items.length;
            for (let i = 0; i < items.length; i++)
            {
                items[i].classList.toggle('is-active', i === activeIdx);
            }

            items[activeIdx].scrollIntoView({ block: 'nearest' });
        };

        const renderSuggest = () =>
        {
            if (!suggestBox || !cmdHelp || !cmdHelp.suggest)
            {
                return;
            }

            const names = cmdHelp.suggest(input.value);
            if (!names.length)
            {
                closeSuggest();
                return;
            }

            suggestBox.innerHTML = names
            .map((n) => '<li class="relaxy-coach-suggest-item" role="option" data-name="' + n + '">=' + n + '</li>')
            .join('');
            suggestBox.classList.add('is-open');

            setActiveSuggest(0);
        };

        const chooseSuggest = (name) =>
        {
            input.value = '=' + name;
            closeSuggest();
            runSearch();
            input.focus();
        };

        if (suggestBox)
        {
            suggestBox.addEventListener('mousedown', (e) =>
            {
                const li = e.target.closest('.relaxy-coach-suggest-item');
                if (li)
                {
                    e.preventDefault();
                    chooseSuggest(li.dataset.name);
                }
            });

            suggestBox.addEventListener('mousemove', (e) =>
            {
                const li = e.target.closest('.relaxy-coach-suggest-item');
                if (li)
                {
                    setActiveSuggest(Array.prototype.indexOf.call(suggestBox.children, li));
                }
            });
        }

        if (closeBtn)
        {
            closeBtn.addEventListener('click', (e) =>
            {
                e.stopPropagation();
                tuck();
            });
        }

        if (hint)
        {
            hint.addEventListener('click', openSearch);
        }

        if (avatar)
        {
            avatar.addEventListener('click', () =>
            {
                if (coach.classList.contains('is-tucked'))
                {
                    untuck();
                    return;
                }
                coach.classList.contains('is-open')
                    ? closeSearch()
                    : openSearch();
            });
        }

        if (input)
        {
            input.addEventListener('input', renderSuggest);
            input.addEventListener('keydown', (e) =>
            {
                const items = suggestBox
                    ? suggestBox.children
                    : [];
                const open = !!(suggestBox && suggestBox.classList.contains('is-open') && items.length);

                if (e.key === 'ArrowDown' && open)
                {
                    e.preventDefault();
                    setActiveSuggest(activeIdx + 1);
                }
                else if (e.key === 'ArrowUp' && open)
                {
                    e.preventDefault();
                    setActiveSuggest(activeIdx - 1);
                }
                else if (e.key === 'Enter' || e.key === 'Tab')
                {
                    if (open && activeIdx > -1)
                    {
                        e.preventDefault();
                        chooseSuggest(items[activeIdx].dataset.name);
                    }
                    else if (e.key === 'Enter')
                    {
                        e.preventDefault();
                        runSearch();
                    }
                }
                else if (e.key === 'Escape' && open)
                {
                    e.stopPropagation();
                    closeSuggest();
                }
            });
        }

        document.addEventListener('click', (e) =>
        {
            if (!coach.contains(e.target))
            {
                closeSearch();
            }
        });

        document.addEventListener('keydown', (e) =>
        {
            if (e.key === 'Escape')
            {
                closeSearch();
            }
        });

        let helpTyped = '';
        document.addEventListener('keydown', (e) =>
        {
            const tag = e.target.tagName;
            if (e.key.length !== 1 || tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable)
            {
                return;
            }

            helpTyped = (helpTyped + e.key.toLowerCase()).slice(-4);
            if (helpTyped !== 'help')
            {
                return;
            }

            helpTyped = '';

            e.preventDefault();

            untuck();
            openSearch();

            if (input)
            {
                input.value = '';
            }
        });

        reveal();

        const commandsSection = document.getElementById('commands');
        if (!manuallyTucked && commandsSection && 'IntersectionObserver' in window)
        {
            const coachObserver = new IntersectionObserver((entries, obs) =>
            {
                if (entries.some((e) => e.isIntersecting))
                {
                    untuck();
                    obs.disconnect();
                }
            }, { rootMargin: '0px 0px -25% 0px' });

            coachObserver.observe(commandsSection);
        }
    }
})();
