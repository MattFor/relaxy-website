/**
 * Grr stop looking here all is available at
 * @link https://codeberg.org/MattFor/relaxy-website
 */

'use strict';

const FEED = 'uptime.json';

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

const formatUptimeShort = (value) =>
{
    if (value == null)
    {
        return '—';
    }

    if (value >= 100)
    {
        return '100%';
    }

    return `${(Math.floor(value * 100) / 100).toFixed(2)}%`;
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

const SPARK_FLOOR = 23;

const sparkline = (samples) =>
{
    if (!Array.isArray(samples) || samples.length < 2)
    {
        return '';
    }

    const values = samples.filter((sample) => typeof sample === 'number');
    const peak = Math.max(...values, 1);
    const step = 100 / (samples.length - 1);

    const at = (index) => Math.min(100, Math.max(0, index * step)).toFixed(2);

    let live = '';
    let gaps = '';
    let drawing = false;
    let gapFrom = null;

    const closeGap = (until) =>
    {
        gaps += `M${at(gapFrom === 0
            ? 0
            : gapFrom - 0.5)} ${SPARK_FLOOR}L${at(until)} ${SPARK_FLOOR}`;
        gapFrom = null;
    };

    samples.forEach((sample, index) =>
    {
        if (typeof sample !== 'number')
        {
            drawing = false;

            if (gapFrom === null)
            {
                gapFrom = index;
            }

            return;
        }

        if (gapFrom !== null)
        {
            closeGap(index - 0.5);
        }

        live += `${drawing
            ? 'L'
            : 'M'}${at(index)} ${(23 - (sample / peak) * 22).toFixed(2)}`;
        drawing = true;
    });

    if (gapFrom !== null)
    {
        closeGap(samples.length - 1);
    }

    if (!live && !gaps)
    {
        return '';
    }

    return `<svg class="spark" viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden="true">${gaps
        ? `<path class="spark-gap" d="${gaps}"/>`
        : ''}${live
        ? `<path d="${live}"/>`
        : ''}</svg>`;
};

const respondingText = (data) =>
{
    const unknown = data.overall.servicesUnknown ?? 0;
    const total = data.overall.servicesTotal;

    return unknown
        ? `${total - unknown - data.overall.servicesDown} of ${total} services are responding; ${unknown} could not be checked.`
        : `All ${total} services are responding.`;
};

const BANNER = {
    operational: {
        css:   'is-ok',
        title: 'Everything\'s fine!',
        sub:   respondingText
    },
    maintenance: {
        css:   'is-maintenance',
        title: 'Under Maintenance',
        sub:   (data) => `${respondingText(data)} Planned work is in progress.`
    },
    partial:     {
        css:   'is-partial',
        title: 'Partial Outage',
        sub:   (data) => (data.overall.servicesDown
            ? `${data.overall.servicesDown} of ${data.overall.servicesTotal} services are not responding.`
            : `${respondingText(data)} An incident is open.`)
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
    const window = data.windowDays;

    document.querySelectorAll('.stat-window').forEach((node) =>
    {
        node.textContent = String(window);
    });

    el('statUptime').textContent = formatUptime(data.overall.uptimePercent);

    const spans = data.overall.uptime;

    const shortSpans = spans
        ? [
            spans.today != null
                ? `Today ${formatUptimeShort(spans.today)}`
                : null,
            spans.days7 != null
                ? `7 days ${formatUptimeShort(spans.days7)}`
                : null
        ].filter(Boolean).join(' · ')
        : '';

    if (shortSpans)
    {
        el('statUptimeNote').textContent = shortSpans;
    }
    else
    {
        const measured = data.services.filter((service) => service.uptimePercent != null);

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
    }

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

    const unknown = data.overall.servicesUnknown ?? 0;
    const up = data.overall.servicesTotal - data.overall.servicesDown - unknown;

    el('statServices').textContent = `${up} / ${data.overall.servicesTotal}`;
    el('statServicesNote').textContent = data.overall.servicesDown
        ? `${data.overall.servicesDown} not responding${unknown
            ? `, ${unknown} unknown`
            : ''}`
        : unknown
            ? `${unknown} could not be checked`
            : 'Everything is answering';
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
                : day.state === 'restart'
                    ? `${dayLabel(day.date)}\n${duration(day.downSeconds)} restarting\n${formatUptime(day.uptimePercent)} up${timing}`
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

    return `
        <div class="timing">
            <span class="timing-now">${current != null
        ? formatMs(current)
        : '—'}</span>
            ${sparkline(latency.samples)}
        </div>`;
};

const renderSpans = (service) =>
{
    const SPANS = [
        [
            'today',
            'Today'
        ],
        [
            'days7',
            '7 days'
        ],
        [
            'days30',
            '30 days'
        ],
        [
            'window',
            '90 days'
        ]
    ];

    const uptime = service.uptime
        ? SPANS.map(([key, label]) =>
        {
            const value = service.uptime[key]?.uptimePercent;

            const css = value == null
                ? ' is-empty'
                : value >= 99.9
                    ? ' is-up'
                    : value >= 99
                        ? ' is-partial'
                        : ' is-down';

            return `
                <span class="span${css}">
                    <span class="span-key">${label}</span>
                    <span class="span-value">${formatUptimeShort(value)}</span>
                </span>`;
        }).join('')
        : '';

    const latency = service.latency;

    const fact = (key, value) => (value == null
        ? ''
        : `<span class="span is-timing"><span class="span-key">${key}</span><span class="span-value">${value}</span></span>`);

    const timing = latency
        ? [
            fact('p50',
                latency.p50RecentMs != null
                    ? formatMs(latency.p50RecentMs)
                    : null),
            fact('p95',
                latency.p95RecentMs != null
                    ? formatMs(latency.p95RecentMs)
                    : null),
            fact('p99',
                latency.p99RecentMs != null
                    ? formatMs(latency.p99RecentMs)
                    : null),
            fact('jitter',
                latency.jitterRecentMs != null
                    ? `±${formatMs(latency.jitterRecentMs)}`
                    : null),
            fact('range',
                latency.minWindowMs != null && latency.maxWindowMs != null
                    ? `${formatMs(latency.minWindowMs)}–${formatMs(latency.maxWindowMs)}`
                    : null)
        ].join('')
        : '';

    if (!uptime && !timing)
    {
        return '';
    }

    const age = latency?.measuredAt
        ? (Date.now() - Date.parse(latency.measuredAt)) / 1000
        : null;

    const stamp = age != null && age >= 5
        ? `<span class="span-age" title="This service reports its own latency rather than being probed from here.">${duration(age)} ago</span>`
        : '';

    return `
        <div class="spans">
            ${uptime}
            <span class="spans-gap"></span>
            ${timing}${stamp}
        </div>`;
};

const renderAvailability = (service) =>
{
    const stats = service.availability;

    if (!stats)
    {
        return '';
    }

    const parts = [];

    if (service.online === false)
    {
        parts.push('<strong>Down right now</strong>');
    }
    else if (stats.streakSeconds != null)
    {
        parts.push(`${duration(stats.streakSeconds)} without downtime`);
    }
    else if (!stats.downtimeSeconds && !stats.outages)
    {
        parts.push('No downtime ever recorded');
    }

    if (stats.downtimeSeconds > 0)
    {
        parts.push(`${duration(stats.downtimeSeconds)} down in 90 days`);
    }

    if (stats.outages > 0)
    {
        parts.push(`${stats.outages} ${stats.outages === 1
            ? 'outage'
            : 'outages'}`);
        parts.push(`longest ${duration(stats.longestOutageSeconds)}`);

        if (stats.meanRecoverySeconds != null)
        {
            parts.push(`usually back in ${duration(stats.meanRecoverySeconds)}`);
        }
    }

    if (stats.observedPercent != null && stats.observedPercent < 99.5)
    {
        parts.push(`monitored ${Math.round(stats.observedPercent)}% of the window`);
    }

    return `<p class="facts">${parts.join(' &middot; ')}</p>`;
};

const renderMeta = (service) =>
{
    const meta = service.meta;

    if (!meta)
    {
        return '';
    }

    const parts = [];

    if (meta.machines != null)
    {
        parts.push(`${meta.machines} ${meta.machines === 1
            ? 'machine'
            : 'machines'}`);
    }

    if (meta.shards != null)
    {
        parts.push(`${meta.shards} ${meta.shards === 1
            ? 'shard'
            : 'shards'}`);
    }

    if (meta.clusters != null)
    {
        parts.push(meta.clustersReady != null && meta.clustersReady !== meta.clusters
            ? `${meta.clustersReady}/${meta.clusters} clusters ready`
            : `${meta.clusters} ${meta.clusters === 1
                ? 'cluster'
                : 'clusters'}`);
    }

    if (meta.guilds != null)
    {
        parts.push(`${meta.guilds.toLocaleString()} servers`);
    }

    if (meta.worstShardMs != null)
    {
        parts.push(`worst shard ${formatMs(meta.worstShardMs)}`);
    }

    if (meta.databaseMs != null)
    {
        parts.push(`database ${formatMs(meta.databaseMs)}`);
    }

    if (meta.heartbeatMs != null)
    {
        parts.push(`clusters ${formatMs(meta.heartbeatMs)}`);
    }

    if (meta.startedAt)
    {
        const seconds = (Date.now() - Date.parse(meta.startedAt)) / 1000;

        if (Number.isFinite(seconds) && seconds > 0)
        {
            parts.push(`${service.online === false
                ? 'ran'
                : 'running'} for ${duration(seconds)}`);
        }
    }

    if (meta.version)
    {
        parts.push(escapeHtml(meta.version));
    }

    return parts.length
        ? `<p class="facts is-meta">${parts.join(' &middot; ')}</p>`
        : '';
};

const CATEGORY_ORDER = [
    'Bot',
    'Web',
    'Chat',
    'Apps',
    'Games'
];

const SERVICE_ORDER = {
    'Relaxy! bot':             0,
    'Relaxy! Dashboard':       1,
    'Database':                2,
    'Website':                 3,
    'The CDN':                 4,
    'Matrix (Continuwuity)':   5,
    'Matrix registration API': 6,
    'IRC (ngIRCd)':            7,
    'Minecraft server':        8
};

const serviceCard = (service, windowDays) =>
{
    const isUp = service.online === true;
    const isRestarting = service.restarting === true && !isUp;
    const isDown = service.online === false && !isRestarting;

    const stateCss = isUp
        ? 'is-up'
        : isRestarting
            ? 'is-restart'
            : isDown
                ? 'is-down'
                : '';
    const stateText = isUp
        ? 'Operational'
        : isRestarting
            ? 'Restarting'
            : isDown
                ? 'Down'
                : 'Unknown';

    return `
        <article class="service">
            <div class="service-head">
                <div>
                    <span class="service-name">${escapeHtml(service.name)}</span>
                </div>
                <span class="service-state ${stateCss}">
                    <span class="dot" aria-hidden="true"></span>${stateText}
                </span>
            </div>
            ${renderTiming(service)}
            ${renderMeta(service)}
            ${renderSpans(service)}
            ${renderStrip(service, windowDays)}
            ${renderAvailability(service)}
        </article>`;
};

const renderServices = (data) =>
{
    const windowDays = visibleDays(data.windowDays);

    el('windowLabel').textContent = String(windowDays);

    const groups = new Map();

    for (const service of data.services)
    {
        const category = service.category ?? 'Other';

        if (!groups.has(category))
        {
            groups.set(category, []);
        }

        groups.get(category).push(service);
    }

    const categories = [...groups.keys()].sort((a, b) =>
    {
        const orderA = CATEGORY_ORDER.indexOf(a);
        const orderB = CATEGORY_ORDER.indexOf(b);

        return (orderA < 0
            ? CATEGORY_ORDER.length
            : orderA) - (orderB < 0
            ? CATEGORY_ORDER.length
            : orderB) || a.localeCompare(b);
    });

    el('services').innerHTML = categories.map((category) =>
    {
        const services = groups.get(category).sort((a, b) => (SERVICE_ORDER[a.name] ?? Number.MAX_SAFE_INTEGER) - (SERVICE_ORDER[b.name] ?? Number.MAX_SAFE_INTEGER));

        return `
            <section class="group">
                <div class="group-head">
                    <h3 class="group-name">${escapeHtml(category)}</h3>
                </div>
                ${services.map((service) => serviceCard(service, windowDays)).join('')}
            </section>`;
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

const incidentChildren = (children) =>
{
    if (!Array.isArray(children) || !children.length)
    {
        return '';
    }

    const rows = children.map((child) => `
        <li class="child">
            <span class="child-name">${escapeHtml(child.name)}</span>
            <span class="child-time">${child.ongoing
        ? 'still down'
        : escapeHtml(child.durationText)}</span>
        </li>`).join('');

    return `
        <div class="incident-group" tabindex="0" role="group" aria-label="${children.length} affected services">
            <span class="group-toggle">${children.length} affected &middot; hover to expand</span>
            <div class="children"><ul class="child-list">${rows}</ul></div>
        </div>`;
};

const incidentCard = (incident) =>
{
    const chips = [];

    if (incident.ongoing)
    {
        chips.push('<span class="chip is-ongoing">Ongoing</span>');
    }

    chips.push(`<span class="chip is-${escapeHtml(incident.impact)}">${escapeHtml(incident.impact)}</span>`);

    if (incident.causeCode === 'host-reboot' || incident.causeCode === 'watchdog')
    {
        chips.push('<span class="chip is-restart">Restart</span>');
    }

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

    const restart = incident.causeCode === 'host-reboot' || incident.causeCode === 'watchdog';

    return `
        <article class="incident${incident.ongoing
        ? ' is-live'
        : ''}${restart
        ? ' is-restart'
        : ''}">
            <div class="incident-head">
                <h3 class="incident-title">${escapeHtml(incident.title)}</h3>
                ${chips.join('')}
            </div>
            <p class="incident-meta">${meta}</p>
            ${incidentChildren(incident.children)}
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
