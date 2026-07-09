/**
 * Grr! stop looking here all is available at
 * @link https://codeberg.org/MattFor/relaxy-website
 */

(() =>
{
    const pages = [
        {
            name: 'Home',
            short: 'Home',
            link: '/'
        },
        {
            name: 'Matrix',
            short: 'Matrix',
            link: '/subpages/matrix',
            nav: true
        },
        {
            name: 'CDN',
            short: 'CDN',
            link: '/subpages/cdn',
            nav: true
        },
        {
            name: 'Dashboard',
            short: 'Dashboard',
            link: '/subpages/dashboard',
            nav: true
        },
        {
            name: 'Terms of Service',
            short: 'Terms',
            link: '/subpages/terms-of-service'
        },
        {
            name: 'Privacy Policy',
            short: 'Privacy',
            link: '/subpages/privacy-policy'
        },
        {
            name: 'Changelog',
            short: 'Changelog',
            link: '/subpages/changelog'
        },
        {
            name: 'Devlog',
            short: 'Devlog',
            link: '/subpages/devlog'
        },
        {
            name: 'Credits',
            short: 'Credits',
            link: '/subpages/credits'
        },
        {
            name: 'Technical Breakdown',
            short: 'Technical',
            link: '/subpages/technical'
        }
    ];

    const path = window.location.pathname;
    const isCurrent = (link) => link === '/'
        ? (path === '/' || path.endsWith('/index.html'))
        : path.endsWith(link.replace(/^\//, '')) || path.includes(link);

    const ordered = pages.filter((p) => !p.nav).concat(pages.filter((p) => p.nav));
    const others = ordered.filter((p) => !isCurrent(p.link));

    const bottom = document.getElementById('subpages-bar');
    if (bottom)
    {
        bottom.innerHTML = others
        .map((p) => `<a href="${p.link}">${p.name}</a>`)
        .join(' <span aria-hidden="true">|</span> ');
    }

    const top = document.getElementById('topnav');
    if (top)
    {
        const onHome = top.children.length > 0;

        const makePill = (p) =>
        {
            const a = document.createElement('a');
            a.href = p.link;
            a.textContent = p.short;
            a.className = 'nav-page';
            if (isCurrent(p.link))
            {
                a.classList.add('is-active');
                a.setAttribute('aria-current', 'page');
            }
            return a;
        };

        const buildMore = (items, trailing) =>
        {
            const details = document.createElement('details');
            details.className = 'nav-more';

            const summary = document.createElement('summary');
            summary.textContent = 'More';
            details.appendChild(summary);

            const menu = document.createElement('div');
            menu.className = 'nav-more-menu';

            const add = (p) =>
            {
                const a = makePill(p);
                if (a.classList.contains('is-active'))
                {
                    details.classList.add('is-active');
                }
                menu.appendChild(a);
            };

            items.forEach(add);

            if (trailing && trailing.length)
            {
                const divider = document.createElement('div');
                divider.className = 'nav-more-sep';
                divider.setAttribute('aria-hidden', 'true');
                menu.appendChild(divider);
                trailing.forEach(add);
            }

            details.appendChild(menu);
            return details;
        };

        const services = pages.filter((p) => p.nav);
        const rest = pages.filter((p) => !p.nav && p.link !== '/');
        const home = pages.find((p) => p.link === '/');

        const homePill = makePill(home);
        top.insertBefore(homePill, top.firstChild);
        const homeSep = document.createElement('span');
        homeSep.className = 'nav-sep';
        homeSep.setAttribute('aria-hidden', 'true');
        top.insertBefore(homeSep, homePill.nextSibling);

        if (onHome)
        {
            const sep = document.createElement('span');
            sep.className = 'nav-sep';
            sep.setAttribute('aria-hidden', 'true');
            top.appendChild(sep);
            top.appendChild(buildMore(rest, services));
        }
        else
        {
            rest.forEach((p) => top.appendChild(makePill(p)));
            top.appendChild(buildMore(services));
        }

        const details = top.querySelector('.nav-more');
        if (details)
        {
            details.addEventListener('click', (e) =>
            {
                if (e.target.tagName === 'A')
                {
                    details.removeAttribute('open');
                }
            });
            document.addEventListener('click', (e) =>
            {
                if (!details.contains(e.target))
                {
                    details.removeAttribute('open');
                }
            });
        }
    }
})();
