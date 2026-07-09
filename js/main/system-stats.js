(() =>
{
    const grid = document.getElementById('system-stats');
    const stamp = document.getElementById('system-stats-stamp');
    if (!grid || !('fetch' in window))
    {
        return;
    }

    const ENDPOINT = '/status.json';
    const REFRESH_MS = 15000;

    const pad = (n) => (n < 10
        ? '0' + n
        : '' + n);

    const fmtUptime = (s) =>
    {
        s = Math.max(0, Math.floor(s));
        const d = Math.floor(s / 86400);
        const h = Math.floor((s % 86400) / 3600);
        const m = Math.floor((s % 3600) / 60);
        return (d > 0
            ? d + 'd '
            : '') + pad(h) + 'h ' + pad(m) + 'm';
    };

    const num = (v, digits) => (typeof v === 'number'
        ? v.toFixed(digits == null
            ? 0
            : digits)
        : null);

    const tileDefs = [
        {
            label: 'Uptime',
            get: (d) => (typeof d.uptimeSeconds === 'number'
                ? fmtUptime(d.uptimeSeconds)
                : null)
        },
        {
            label: 'CPU load',
            get: (d) => (d.cpu && num(d.cpu.load) != null
                ? num(d.cpu.load) + '%'
                : null)
        },
        {
            label: 'CPU temp',
            get: (d) => (num(d.temperatureC) != null
                ? num(d.temperatureC) + '°C'
                : null)
        },
        {
            label: 'Memory',
            get: (d) => (d.memory && num(d.memory.percent) != null
                ? num(d.memory.percent) + '%'
                : null)
        },
        {
            label: 'RAM used',
            get: (d) => (d.memory && num(d.memory.usedGb, 1) != null
                ? num(d.memory.usedGb, 1) + ' / ' + num(d.memory.totalGb, 1) + ' GB'
                : null)
        },
        {
            label: 'Cores',
            get: (d) => (d.cpu && d.cpu.cores != null
                ? String(d.cpu.cores)
                : null)
        },
        {
            label: 'Architecture',
            get: (d) => (d.arch || null)
        },
        {
            label: 'Kernel',
            get: (d) => (d.kernel || null)
        },
        {
            label: 'Host',
            get: (d) => (d.host || d.hostname || null)
        },
        {
            label: 'OS',
            get: (d) => (d.os || null)
        }
    ];

    const esc = (s) => String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const setStamp = (text) =>
    {
        if (stamp)
        {
            stamp.textContent = text;
        }
    };

    const renderOffline = () =>
    {
        grid.innerHTML = '<div class="tech-stat"><span class="num">—</span><span class="label">status feed offline</span></div>';
        setStamp('Live feed unavailable right now - the Pi is not publishing /status.json yet.');
    };

    const render = (data) =>
    {
        const tiles = [];
        tileDefs.forEach((t) =>
        {
            const v = t.get(data);
            if (v != null && v !== '')
            {
                tiles.push('<div class="tech-stat"><span class="num">' + esc(v) + '</span><span class="label">' + esc(t.label) + '</span></div>');
            }
        });
        if (!tiles.length)
        {
            renderOffline();
            return;
        }
        grid.innerHTML = tiles.join('');
        const now = new Date();
        setStamp('Live from the Pi · updated ' + pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds()));
    };

    const tick = () =>
    {
        fetch(ENDPOINT, { cache: 'no-store' })
        .then((res) => (res.ok
            ? res.json()
            : Promise.reject(res.status)))
        .then(render)
        .catch(renderOffline);
    };

    tick();
    window.setInterval(tick, REFRESH_MS);
})();
