/**
 * Grr stop looking here all is available at
 * @link https://codeberg.org/MattFor/relaxy-website
 */

'use strict';

const FEED = 'uptime.json';
const REFRESH_MS = 60000;

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
}[character]));

const el = (id) => document.getElementById(id);

const formatDate = (iso, options) => new Date(iso).toLocaleString(undefined, options);

const dayLabel = (date) => new Date(`${date}T12:00:00Z`).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric'
});

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

    return minutes % 60 ? `${hours}h ${minutes % 60}m` : `${hours}h`;
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

const BANNER = {
    operational: {
        css: 'is-ok',
        title: 'All Systems Operational',
        sub: (data) => `All ${data.overall.servicesTotal} services are responding.`
    },
    partial: {
        css: 'is-partial',
        title: 'Partial Outage',
        sub: (data) => `${data.overall.servicesDown} of ${data.overall.servicesTotal} services are not responding.`
    },
    major: {
        css: 'is-major',
        title: 'Major Outage',
        sub: (data) => `${data.overall.servicesDown} of ${data.overall.servicesTotal} services are not responding.`
    }
};

const renderBanner = (data) =>
{
    const state = BANNER[data.overall.status] ?? BANNER.partial;
    const banner = el('banner');

    banner.className = `banner ${state.css}`;
    el('bannerTitle').textContent = state.title;

    const uptime = data.overall.uptimePercent;
    const suffix = uptime != null
        ? ` Average uptime over the last ${data.windowDays} days: ${uptime.toFixed(2)}%.`
        : '';

    el('bannerSub').textContent = state.sub(data) + suffix;
};

const renderStrip = (service, windowDays) =>
{
    const days = service.days.slice(-windowDays);

    const bars = days.map((day) =>
    {
        const cssState = day.state === 'nodata' ? '' : ` is-${day.state}`;

        const tip = day.state === 'nodata'
            ? `${dayLabel(day.date)}\nNot monitored`
            : day.downSeconds === 0
                ? `${dayLabel(day.date)}\nNo downtime`
                : `${dayLabel(day.date)}\n${duration(day.downSeconds)} of downtime\n${day.uptimePercent.toFixed(2)}% up`;

        return `<div class="bar${cssState}" data-tip="${escapeHtml(tip)}" tabindex="0" role="img" aria-label="${escapeHtml(tip.replace(/\n/g, ', '))}"></div>`;
    }).join('');

    const uptime = service.uptimePercent != null
        ? `${service.uptimePercent.toFixed(2)}% uptime`
        : 'No data yet';

    return `
        <div class="strip">${bars}</div>
        <div class="strip-foot">
            <span class="range-start">${windowDays} days ago</span>
            <span class="uptime">${uptime}</span>
            <span>Today</span>
        </div>`;
};

const renderServices = (data) =>
{
    const windowDays = visibleDays(data.windowDays);

    el('windowLabel').textContent = String(windowDays);

    el('services').innerHTML = data.services.map((service) =>
    {
        const isUp = service.online === true;
        const isDown = service.online === false;

        const stateCss = isUp ? 'is-up' : isDown ? 'is-down' : '';
        const stateText = isUp ? 'Operational' : isDown ? 'Down' : 'Unknown';

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
                ${renderStrip(service, windowDays)}
            </article>`;
    }).join('');
};

const incidentCard = (incident) =>
{
    const chips = [];

    if (incident.ongoing)
    {
        chips.push('<span class="chip is-ongoing">Ongoing</span>');
    }

    chips.push(`<span class="chip is-${escapeHtml(incident.impact)}">${escapeHtml(incident.impact)}</span>`);

    const started = formatDate(incident.startedAt, {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const meta = incident.ongoing
        ? `Started ${started} &middot; ${relative(incident.startedAt)} &middot; still down`
        : `${started} &middot; down for ${escapeHtml(incident.durationText)}`;

    const lines = [
        `<p class="incident-line">
            <span class="incident-label">Detected</span>${escapeHtml(incident.cause)}
        </p>`
    ];

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
        <article class="incident">
            <div class="incident-head">
                <h3 class="incident-title">${escapeHtml(incident.title)}</h3>
                ${chips.join('')}
            </div>
            <p class="incident-meta">${meta}</p>
            <div class="incident-body">${lines.join('')}</div>
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
            <div class="panel">
                <div class="panel-head">
                    <h2 class="panel-title">Active incidents</h2>
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
        el('incidents').innerHTML = `<p class="empty">No incidents recorded${
            active.length ? ' before the active one above' : ` in the last ${data.windowDays} days`}. </p>`;

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
    renderServices(data);
    renderIncidents(data);

    el('stamp').textContent = `Last checked ${relative(data.generatedAt)} · ${
        formatDate(data.generatedAt, { hour: '2-digit', minute: '2-digit' })}`;
};

const showFailure = () =>
{
    const banner = el('banner');

    banner.className = 'banner is-partial';
    el('bannerTitle').textContent = 'Status feed unavailable';
    el('bannerSub').textContent =
        'This page could not load its data. That usually means the monitor on the Pi is not running - which is itself worth knowing.';

    el('services').innerHTML = '<p class="empty">No service history to show.</p>';
    el('incidents').innerHTML = '<p class="empty">No incidents to show.</p>';
};

let latest = null;

const load = () => fetch(FEED, { cache: 'no-store' })
.then((response) => (response.ok ? response.json() : Promise.reject(response.status)))
.then((data) =>
{
    latest = data;
    render(data);
})
.catch(() =>
{
    if (!latest)
    {
        showFailure();
    }
});

const syncThemeButton = () =>
{
    const button = el('themeButton');
    const isLight = document.documentElement.classList.contains('light-mode');

    button.textContent = isLight ? 'Dark Mode' : 'Light Mode';
    button.setAttribute('aria-pressed', String(isLight));
};

el('themeButton').addEventListener('click', () =>
{
    const isLight = document.documentElement.classList.toggle('light-mode');

    try
    {
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
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

setInterval(() =>
{
    if (!document.hidden)
    {
        load();
    }
}, REFRESH_MS);

document.addEventListener('visibilitychange', () =>
{
    if (!document.hidden)
    {
        load();
    }
});

syncThemeButton();
load();
