/**
 * Grr! stop looking here all is available at
 * @link https://codeberg.org/MattFor/relaxy-website
 */

(() =>
{
    const pager = document.getElementById('featurePager');

    if (!pager)
    {
        return;
    }

    const stage = pager.querySelector('.feature-stage');
    const pages = Array.from(pager.querySelectorAll('.feature-page'));
    const dots = Array.from(pager.querySelectorAll('.feature-dot'));
    const hint = pager.querySelector('[data-feature-next]');

    if (!stage || pages.length < 2)
    {
        return;
    }

    let current = 0;

    const show = (index) =>
    {
        const next = (index + pages.length) % pages.length;

        if (next === current)
        {
            return;
        }

        current = next;

        pages.forEach((page, i) =>
        {
            const active = i === current;

            page.classList.toggle('is-active', active);
            page.setAttribute('aria-hidden',
                active
                    ? 'false'
                    : 'true');
        });

        dots.forEach((dot, i) =>
        {
            const active = i === current;

            dot.classList.toggle('is-active', active);
            dot.setAttribute('aria-current',
                active
                    ? 'true'
                    : 'false');
        });
    };

    stage.addEventListener('click', () =>
    {
        const selection = window.getSelection();

        if (selection && selection.toString().trim())
        {
            return;
        }

        show(current + 1);
    });

    dots.forEach((dot, i) =>
    {
        dot.addEventListener('click', (event) =>
        {
            event.stopPropagation();
            show(i);
        });
    });

    if (hint)
    {
        hint.addEventListener('click', (event) =>
        {
            event.stopPropagation();
            show(current + 1);
        });
    }

    pager.addEventListener('keydown', (event) =>
    {
        if (event.key === 'ArrowRight')
        {
            event.preventDefault();
            show(current + 1);
        }
        else if (event.key === 'ArrowLeft')
        {
            event.preventDefault();
            show(current - 1);
        }
    });

    pages.forEach((page, i) => page.setAttribute('aria-hidden',
        i === 0
            ? 'false'
            : 'true'));
    dots.forEach((dot, i) => dot.setAttribute('aria-current',
        i === 0
            ? 'true'
            : 'false'));

    pager.classList.add('is-ready');
})();
