/**
 * Grr stop looking here all is available at
 * @link https://codeberg.org/MattFor/relaxy-website
 */

'use strict';

const FEED = 'uptime.json';

/**
 * How often to ask for a fresh feed.
 *
 * The publisher rebuilds uptime.json once a minute, and every 30 seconds while
 * something is actually broken, so polling faster than that mostly finds the same
 * file again. That is exactly why it is affordable: the request goes out with
 * `cache: 'no-cache'`, which is a REVALIDATION rather than a refetch, so a poll that
 * finds nothing new costs a 304 with no body instead of 58KB. The one that does find
 * something new is the one worth having arrive quickly.
 *
 * Polling stops entirely while the tab is in the background, and backs off on failure,
 * so a status page left open in a pinned tab for a week does not quietly become a load
 * generator aimed at a Raspberry Pi.
 */
const REFRESH_MS = 15000;
const BACKOFF_MAX_MS = 120000;

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&':  '&amp;',
    '<':  '&lt;',
    '>':  '&gt;',
    '"':  '&quot;',
    '\'': '&#39;'
}[character]));

const el = (id) => document.getElementById(id);

const formatDate = (iso, options) => new Date(iso).toLocaleString(undefined, options);

const dayLabel = (date) => new Date(`${date}T12:00:00Z`).toLocaleDateString(undefined, {
    month: 'short',
    day:   'numeric',
    year:  'numeric'
});

const STAMP = {
    month:  'short',
    day:    'numeric',
    hour:   '2-digit',
    minute: '2-digit'
};

const relative = (iso) =>
{
    const seconds = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);

    if (seconds < 90)
    {
        return 'just now';
    }

    const minutes = Math.round(seconds / 60);

    if (minutes < 60)
    {
        return `${minutes} min ago`;
    }

    const hours = Math.round(minutes / 60);

    if (hours < 24)
    {
        return `${hours}h ago`;
    }

    return `${Math.round(hours / 24)}d ago`;
};

const duration = (seconds) =>
{
    if (seconds == null)
    {
        return '';
    }

    if (seconds < 60)
    {
        return `${Math.max(1, Math.round(seconds))}s`;
    }

    const minutes = Math.floor(seconds / 60);

    if (minutes < 60)
    {
        return `${minutes} min`;
    }

    const hours = Math.floor(minutes / 60);

    if (hours < 24)
    {
        return minutes % 60
            ? `${hours}h ${minutes % 60}m`
            : `${hours}h`;
    }

    const days = Math.floor(hours / 24);

    return hours % 24
        ? `${days}d ${hours % 24}h`
        : `${days}d`;
};

const formatUptime = (value) =>
{
    if (value == null)
    {
        return '—';
    }

    if (value >= 100)
    {
        return '100%';
    }

    let text = value.toFixed(10);

    if (Number(text) >= 100)
    {
        text = (Math.floor(value * 1e10) / 1e10).toFixed(10);
    }

    text = text.replace(/0+$/, '').replace(/\.$/, '');

    const [whole, decimals = ''] = text.split('.');

    return `${whole}.${decimals.padEnd(2, '0')}%`;
};

const formatMs = (value) =>
{
    if (value == null)
    {
        return '—';
    }

    if (value >= 1000)
    {
        return `${(value / 1000).toFixed(2)}s`;
    }

    return value >= 100
        ? `${Math.round(value)}ms`
        : `${Math.round(value * 10) / 10}ms`;
};

const visibleDays = (available) =>
{
    const width = window.innerWidth;

    if (width <= 480)
    {
        return Math.min(available, 30);
    }

    if (width <= 760)
    {
        return Math.min(available, 60);
    }

    return available;
};

const sparkline = (samples) =>
{
    if (!Array.isArray(samples) || samples.length < 2)
    {
        return '';
    }

    const values = samples.filter((sample) => typeof sample === 'number');

    if (values.length < 2)
    {
        return '';
    }

    const peak = Math.max(...values, 1);
    const step = 100 / (samples.length - 1);

    let path = '';
    let drawing = false;

    samples.forEach((sample, index) =>
    {
        if (typeof sample !== 'number')
        {
            drawing = false;

            return;
        }

        const x = (index * step).toFixed(2);
        const y = (23 - (sample / peak) * 22).toFixed(2);

        path += `${drawing
            ? 'L'
            : 'M'}${x} ${y}`;
        drawing = true;
    });

    return `<svg class="spark" viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden="true"><path d="${path}"/></svg>`;
};

const BANNER = {
    operational: {
        css:   'is-ok',
        title: 'All Systems Operational',
        sub:   (data) => `All ${data.overall.servicesTotal} services are responding.`
    },
    maintenance: {
        css:   'is-maintenance',
        title: 'Under Maintenance',
        sub:   (data) => `All ${data.overall.servicesTotal} services are responding. Planned work is in progress.`
    },
    partial:     {
        css:   'is-partial',
        title: 'Partial Outage',
        sub:   (data) => (data.overall.servicesDown
            ? `${data.overall.servicesDown} of ${data.overall.servicesTotal} services are not responding.`
            : `All ${data.overall.servicesTotal} services are responding, but an incident is open.`)
    },
    major:       {
        css:   'is-major',
        title: 'Major Outage',
        sub:   (data) => (data.overall.servicesDown
            ? `${data.overall.servicesDown} of ${data.overall.servicesTotal} services are not responding.`
            : `An incident affecting several services is open.`)
    }
};

const renderBanner = (data) =>
{
    const state = BANNER[data.overall.status] ?? BANNER.partial;
    const banner = el('banner');

    banner.className = `banner ${state.css}`;
    el('bannerTitle').textContent = state.title;
    el('bannerSub').textContent = state.sub(data);
};

const renderStats = (data) =>
{
    const measured = data.services.filter((service) => service.uptimePercent != null);
    const window = data.windowDays;

    document.querySelectorAll('.stat-window').forEach((node) =>
    {
        node.textContent = String(window);
    });

    el('statUptime').textContent = formatUptime(data.overall.uptimePercent);

    const downSeconds = measured.map((service) => service.days
                                                         .reduce((sum, day) => sum + (day.downSeconds ?? 0), 0));

    const averageDown = downSeconds.length
        ? downSeconds.reduce((sum, value) => sum + value, 0) / downSeconds.length
        : null;

    el('statUptimeNote').textContent = averageDown == null
        ? 'No history yet'
        : averageDown < 1
            ? 'No downtime recorded'
            : `${duration(averageDown)} down per service`;

    const timed = data.services.filter((service) => service.latency?.avgWindowMs != null);

    el('statResponse').textContent = formatMs(data.overall.avgLatencyMs);

    const fastest = timed.length
        ? timed.reduce((best, service) => (service.latency.avgWindowMs < best.latency.avgWindowMs
            ? service
            : best))
        : null;

    el('statResponseNote').textContent = fastest
        ? `Fastest: ${fastest.name} at ${formatMs(fastest.latency.avgWindowMs)}`
        : 'Not measured yet';

    const up = data.overall.servicesTotal - data.overall.servicesDown;

    el('statServices').textContent = `${up} / ${data.overall.servicesTotal}`;
    el('statServicesNote').textContent = data.overall.servicesDown
        ? `${data.overall.servicesDown} not responding`
        : 'Everything is answering';

    el('statIncidents').textContent = String(data.overall.activeIncidents);
    el('statIncidentsNote').textContent = data.overall.activeIncidents
        ? 'See below for updates'
        : `${data.incidents.length} in the last ${window} days`;
};

const renderStrip = (service, windowDays) =>
{
    const days = service.days.slice(-windowDays);

    const bars = days.map((day) =>
    {
        const cssState = day.state === 'nodata'
            ? ''
            : ` is-${day.state}`;

        const timing = day.avgLatencyMs != null
            ? `\n${formatMs(day.avgLatencyMs)} average response`
            : '';

        const tip = day.state === 'nodata'
            ? `${dayLabel(day.date)}\nNot monitored`
            : day.downSeconds === 0
                ? `${dayLabel(day.date)}\nNo downtime${timing}`
                : `${dayLabel(day.date)}\n${duration(day.downSeconds)} of downtime\n${formatUptime(day.uptimePercent)} up${timing}`;

        return `<div class="bar${cssState}" data-tip="${escapeHtml(tip)}" tabindex="0" role="img" aria-label="${escapeHtml(tip.replace(/\n/g, ', '))}"></div>`;
    }).join('');

    const uptime = service.uptimePercent != null
        ? `${formatUptime(service.uptimePercent)} uptime`
        : 'No data yet';

    return `
        <div class="strip">${bars}</div>
        <div class="strip-foot">
            <span class="range-start">${windowDays} days ago</span>
            <span class="uptime">${uptime}</span>
            <span>Today</span>
        </div>`;
};

const renderTiming = (service) =>
{
    const latency = service.latency;

    if (!latency)
    {
        return '<p class="timing is-absent">Response time not measured for this service.</p>';
    }

    const current = latency.currentMs ?? latency.avgRecentMs;

    const facts = [
        latency.p95RecentMs != null
            ? `<span class="timing-fact"><span class="timing-key">p95</span>${formatMs(latency.p95RecentMs)}</span>`
            : '',
        latency.avgWindowMs != null
            ? `<span class="timing-fact"><span class="timing-key">avg</span>${formatMs(latency.avgWindowMs)}</span>`
            : '',
        latency.minWindowMs != null && latency.maxWindowMs != null
            ? `<span class="timing-fact"><span class="timing-key">range</span>${formatMs(latency.minWindowMs)}&ndash;${formatMs(latency.maxWindowMs)}</span>`
            : ''
    ].join('');

    return `
        <div class="timing">
            <span class="timing-now">${current != null
        ? formatMs(current)
        : '—'}</span>
            ${sparkline(latency.samples)}
            <span class="timing-facts">${facts}</span>
        </div>`;
};

const SERVICE_ORDER = {
    'Relaxy! bot':             0,
    'Relaxy! Dashboard':       1,
    'Website':                 2,
    'The CDN':                 3,
    'Matrix (Continuwuity)':   4,
    'Matrix registration API': 5,
    'IRC (ngIRCd)':            6,
    'Minecraft server':        7
};

const renderServices = (data) =>
{
    const windowDays = visibleDays(data.windowDays);

    el('windowLabel').textContent = String(windowDays);

    const services = [...data.services].sort((a, b) =>
    {
        const orderA = SERVICE_ORDER[a.name] ?? Number.MAX_SAFE_INTEGER;
        const orderB = SERVICE_ORDER[b.name] ?? Number.MAX_SAFE_INTEGER;
        return orderA - orderB;
    });

    el('services').innerHTML = services.map((service) =>
    {
        const isUp = service.online === true;
        const isDown = service.online === false;

        const stateCss = isUp
            ? 'is-up'
            : isDown
                ? 'is-down'
                : '';
        const stateText = isUp
            ? 'Operational'
            : isDown
                ? 'Down'
                : 'Unknown';

        return `
            <article class="service">
                <div class="service-head">
                    <div>
                        <span class="service-name">${escapeHtml(service.name)}</span>
                        <span class="service-cat">${escapeHtml(service.category)}</span>
                    </div>
                    <span class="service-state ${stateCss}">
                        <span class="dot" aria-hidden="true"></span>${stateText}
                    </span>
                </div>
                ${renderTiming(service)}
                ${renderStrip(service, windowDays)}
            </article>`;
    }).join('');
};

const updateTimeline = (updates) =>
{
    if (!Array.isArray(updates) || !updates.length)
    {
        return '';
    }

    const items = updates.map((update) => `
        <li class="update is-${escapeHtml(update.status)}">
            <div class="update-head">
                <span class="update-status">${escapeHtml(update.status)}</span>
                <time class="update-time" datetime="${escapeHtml(update.at)}">${escapeHtml(formatDate(update.at, STAMP))}</time>
            </div>
            <p class="update-body">${escapeHtml(update.body)}</p>
        </li>`).join('');

    return `<ol class="updates">${items}</ol>`;
};

const incidentCard = (incident) =>
{
    const chips = [];

    if (incident.ongoing)
    {
        chips.push('<span class="chip is-ongoing">Ongoing</span>');
    }

    chips.push(`<span class="chip is-${escapeHtml(incident.impact)}">${escapeHtml(incident.impact)}</span>`);

    if (incident.manual)
    {
        chips.push('<span class="chip is-declared">Declared</span>');
    }

    const started = formatDate(incident.startedAt, STAMP);
    const running = duration((Date.now() - Date.parse(incident.startedAt)) / 1000);

    const meta = incident.ongoing
        ? `${escapeHtml(incident.serviceName)} &middot; started ${started} &middot; ongoing for ${escapeHtml(running)}`
        : `${escapeHtml(incident.serviceName)} &middot; ${started} &middot; lasted ${escapeHtml(incident.durationText)}`;

    const lines = [];

    if (incident.cause)
    {
        lines.push(`<p class="incident-line">
            <span class="incident-label">${incident.manual
            ? 'What is going on'
            : 'Detected'}</span>${escapeHtml(incident.cause)}
        </p>`);
    }

    if (incident.note)
    {
        lines.push(`<p class="incident-line is-manual">
            <span class="incident-label">What happened</span>${escapeHtml(incident.note)}
        </p>`);
    }

    if (incident.resolution)
    {
        lines.push(`<p class="incident-line is-manual">
            <span class="incident-label">Resolution</span>${escapeHtml(incident.resolution)}
        </p>`);
    }

    return `
        <article class="incident${incident.ongoing
        ? ' is-live'
        : ''}">
            <div class="incident-head">
                <h3 class="incident-title">${escapeHtml(incident.title)}</h3>
                ${chips.join('')}
            </div>
            <p class="incident-meta">${meta}</p>
            <div class="incident-body">${lines.join('')}</div>
            ${updateTimeline(incident.updates)}
        </article>`;
};

const renderIncidents = (data) =>
{
    const active = data.incidents.filter((incident) => incident.ongoing);
    const past = data.incidents.filter((incident) => !incident.ongoing);
    const activeHost = el('activeIncidents');

    if (active.length)
    {
        activeHost.innerHTML = `
            <div class="panel is-active">
                <div class="panel-head">
                    <h2 class="panel-title">Active incidents</h2>
                    <p class="panel-note">Updated as we learn more</p>
                </div>
                ${active.map(incidentCard).join('')}
            </div>`;
        activeHost.hidden = false;
    }
    else
    {
        activeHost.hidden = true;
        activeHost.innerHTML = '';
    }

    el('incidentCount').textContent = data.incidents.length
        ? `${data.incidents.length} in the last ${data.windowDays} days`
        : '';

    if (!past.length)
    {
        el('incidents').innerHTML = `<p class="empty">No incidents recorded${active.length
            ? ' before the active one above'
            : ` in the last ${data.windowDays} days`}. </p>`;

        return;
    }

    const groups = new Map();

    for (const incident of past)
    {
        const key = incident.startedAt.slice(0, 10);

        if (!groups.has(key))
        {
            groups.set(key, []);
        }

        groups.get(key).push(incident);
    }

    el('incidents').innerHTML = [...groups.entries()].map(([date, list]) => `
        <h3 class="incident-day">${escapeHtml(dayLabel(date))}</h3>
        ${list.map(incidentCard).join('')}`).join('');
};

const render = (data) =>
{
    renderBanner(data);
    renderStats(data);
    renderServices(data);
    renderIncidents(data);

    el('stamp').textContent = `Last checked ${relative(data.generatedAt)} · ${formatDate(data.generatedAt, {
        hour:   '2-digit',
        minute: '2-digit'
    })}`;
};

const showFailure = () =>
{
    const banner = el('banner');

    banner.className = 'banner is-partial';
    el('bannerTitle').textContent = 'Status feed unavailable';
    el('bannerSub').textContent = 'This page could not load its data. That usually means the monitor on the host is not running - which is itself worth knowing.';

    el('services').innerHTML = '<p class="empty">No service history to show.</p>';
    el('incidents').innerHTML = '<p class="empty">No incidents to show.</p>';
};

let latest = null;
let failures = 0;

const load = () => fetch(FEED, { cache: 'no-cache' })
    .then((response) => (response.ok
        ? response.json()
        : Promise.reject(response.status)))
    .then((data) =>
    {
        failures = 0;
        latest = data;
        render(data);
    })
    .catch(() =>
    {
        failures += 1;

        if (!latest)
        {
            showFailure();
        }
    });

let timer = null;

const schedule = (delay) =>
{
    clearTimeout(timer);
    timer = setTimeout(poll, delay);
};

const poll = () =>
{
    if (document.hidden)
    {
        schedule(REFRESH_MS);

        return;
    }

    load().then(() => schedule(failures
        ? Math.min(REFRESH_MS * (2 ** failures), BACKOFF_MAX_MS)
        : REFRESH_MS));
};

const syncThemeButton = () =>
{
    const button = el('themeButton');
    const isLight = document.documentElement.classList.contains('light-mode');

    button.textContent = isLight
        ? 'Dark Mode'
        : 'Light Mode';
    button.setAttribute('aria-pressed', String(isLight));
};

el('themeButton').addEventListener('click', () =>
{
    const isLight = document.documentElement.classList.toggle('light-mode');

    try
    {
        localStorage.setItem('theme',
            isLight
                ? 'light'
                : 'dark');
    }
    catch (error)
    {
        // Storage unavailable
    }

    syncThemeButton();
});

let resizeTimer = null;

window.addEventListener('resize', () =>
{
    clearTimeout(resizeTimer);

    resizeTimer = setTimeout(() =>
    {
        if (latest)
        {
            renderServices(latest);
        }
    }, 200);
});

document.addEventListener('visibilitychange', () =>
{
    if (!document.hidden)
    {
        poll();
    }
});

syncThemeButton();
poll();
