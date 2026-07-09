/**
 * Grr! stop looking here all is available at
 * @link https://codeberg.org/MattFor/relaxy-website
 */

(() =>
{
    const toggle = document.getElementById('navToggle');
    const drawer = document.getElementById('navDrawer');
    const overlay = document.getElementById('navOverlay');
    const closeBtn = document.getElementById('navDrawerClose');
    const drawerNav = document.getElementById('drawerNav');
    const topnav = document.getElementById('topnav');

    if (!toggle || !drawer)
    {
        return;
    }

    if (topnav && drawerNav)
    {
        const makeLabel = (text) =>
        {
            const el = document.createElement('div');
            el.className = 'drawer-group-label';
            el.textContent = text;
            return el;
        };

        const sections = topnav.querySelectorAll(':scope > a[href^="#"]');
        const pageLinks = topnav.querySelectorAll('a.nav-page');

        if (sections.length)
        {
            drawerNav.appendChild(makeLabel('Sections'));
            sections.forEach(a => drawerNav.appendChild(a.cloneNode(true)));
        }

        if (pageLinks.length)
        {
            drawerNav.appendChild(makeLabel('Pages'));
            pageLinks.forEach(a => drawerNav.appendChild(a.cloneNode(true)));
        }
    }

    const openDrawer = () =>
    {
        drawer.classList.add('is-open');
        toggle.classList.add('is-open');
        drawer.setAttribute('aria-hidden', 'false');
        toggle.setAttribute('aria-expanded', 'true');
        document.body.classList.add('nav-open');
        closeBtn?.focus();
    };

    const closeDrawer = () =>
    {
        drawer.classList.remove('is-open');
        toggle.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('nav-open');

        const panel = drawer.querySelector('.nav-drawer-panel');

        const done = () =>
        {
            drawer.setAttribute('aria-hidden', 'true');
            toggle.focus();
            panel.removeEventListener('transitionend', done);
        };

        panel.addEventListener('transitionend', done, { once: true });
    };

    toggle.addEventListener('click', openDrawer);
    overlay?.addEventListener('click', closeDrawer);
    closeBtn?.addEventListener('click', closeDrawer);
    drawerNav?.querySelectorAll('a').forEach(a => a.addEventListener('click', closeDrawer));

    document.addEventListener('keydown', e =>
    {
        if (e.key === 'Escape' && drawer.classList.contains('is-open'))
        {
            closeDrawer();
        }
    });
})();
