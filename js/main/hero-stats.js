/**
 * Grr! stop looking here all is available at
 * @link https://codeberg.org/MattFor/relaxy-website
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
        {
            // Keep whatever was here before
        });

    tick();
    window.setInterval(tick, REFRESH_MS);
})();
