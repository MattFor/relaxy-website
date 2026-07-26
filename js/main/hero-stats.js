/**
 * Grr! stop looking here all is available at
 * @link https://codeberg.org/MattFor/relaxy-website
 */

/**
 * The hero byline's user and server counts, read from the live status feed.
 *
 * These used to be the hand-written "200,000+ users · 250+ servers", which is the kind of
 * number that is written once and then quietly drifts: it was already understating the
 * server count by twenty by the time anyone noticed. The Pi publishes the real figures to
 * /status.json every fifteen seconds (scripts/status/main.mjs), so the page can simply say
 * what is true right now.
 *
 * THE MARKUP SHIPS WITH REAL NUMBERS IN IT, not a placeholder. Someone with JavaScript off,
 * or reading a cached copy, still sees a truthful figure rather than a dash or a spinner -
 * this only replaces it with a fresher one. Same reason the failure path below does
 * nothing at all: a number that is a few days old beats an em-dash, and beats a "+" claim
 * that was months out of date.
 *
 * It polls at a minute rather than the technical page's fifteen seconds. That page is a
 * live monitor and is watched as one; this is a byline, and nobody sits on the landing page
 * waiting for the user count to tick.
 */
(() =>
{
    const users = document.querySelector('[data-live-users]');
    const guilds = document.querySelector('[data-live-guilds]');

    if ((!users && !guilds) || !('fetch' in window))
    {
        return;
    }

    const ENDPOINT = '/status.json';
    const REFRESH_MS = 60000;

    /**
     * Only ever writes a real, positive count.
     *
     * A zero is not a number worth printing here. The feed reports 0 while the bot is
     * restarting or before a cluster has checked in, and "0 users · 0 servers" across the
     * top of the landing page reads as a dead project rather than as a bot that is thirty
     * seconds into a reboot. The last good figure stays until a better one arrives.
     */
    const put = (el, value) =>
    {
        if (el && typeof value === 'number' && isFinite(value) && value > 0)
        {
            el.textContent = value.toLocaleString();
        }
    };

    const tick = () => fetch(ENDPOINT, { cache: 'no-store' })
    .then((res) => (res.ok
        ? res.json()
        : Promise.reject(res.status)))
    .then((data) =>
    {
        put(users, data && data.bot && data.bot.totalUsers);
        put(guilds, data && data.bot && data.bot.totalGuilds);
    })
    .catch(() =>
    { /* Keep whatever the page was served with. @see the note above. */
    });

    tick();
    window.setInterval(tick, REFRESH_MS);
})();
