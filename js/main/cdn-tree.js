(() =>
{
    const el = document.getElementById('cdn-tree');
    if (!el || !('fetch' in window))
    {
        return;
    }

    const ROOT = 'https://cdn.relaxy.xyz/';
    const MAX_DEPTH = 5;
    const MAX_ENTRIES = 500;
    let count = 0;

    const esc = (s) => String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const parseListing = (html, baseUrl) =>
    {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const out = [];
        const seen = new Set();

        doc.querySelectorAll('a[href]').forEach((a) =>
        {
            const href = a.getAttribute('href') || '';

            if (!href || href.startsWith('?') || href.startsWith('#'))
            {
                return;
            }

            if (href.startsWith('/') || /^[a-z]+:\/\//i.test(href))
            {
                return;
            }

            if (href === '../' || href === './' || href === '..' || href === '.')
            {
                return;
            }

            const isDir = href.endsWith('/');
            const name = decodeURIComponent(href.replace(/\/+$/, ''));

            if (!name || name === '..' || seen.has(name))
            {
                return;
            }

            seen.add(name);

            out.push({
                name,
                isDir,
                url: baseUrl + href
            });
        });

        out.sort((a, b) => (a.isDir === b.isDir
            ? a.name.localeCompare(b.name)
            : (a.isDir
                ? -1
                : 1)));

        return out;
    };

    const walk = async (url, depth) =>
    {
        if (depth > MAX_DEPTH || count > MAX_ENTRIES)
        {
            return [];
        }

        let entries;

        try
        {
            const res = await fetch(url);

            if (!res.ok)
            {
                return [];
            }

            entries = parseListing(await res.text(), url);
        }
        catch (e)
        {
            return null;
        }

        const nodes = [];
        for (const entry of entries)
        {
            if (count > MAX_ENTRIES)
            {
                break;
            }

            count += 1;

            const node = {
                name: entry.name,
                isDir: entry.isDir,
                children: []
            };

            if (entry.isDir)
            {
                node.children = (await walk(entry.url, depth + 1)) || [];
            }

            nodes.push(node);
        }

        return nodes;
    };

    const render = (nodes, prefix) =>
    {
        let out = '';

        nodes.forEach((node, i) =>
        {
            const last = i === nodes.length - 1;
            const branch = last
                ? '└── '
                : '├── ';

            const label = node.isDir
                ? '<span class="dir">' + esc(node.name) + '/</span>'
                : esc(node.name);

            out += prefix + branch + label + '\n';

            if (node.children && node.children.length)
            {
                out += render(node.children, prefix + (last
                    ? '    '
                    : '│   '));
            }
        });

        return out;
    };

    walk(ROOT, 0).then((tree) =>
    {
        if (tree === null || !tree.length)
        {
            return;
        }

        el.innerHTML = '<span class="dir">cdn.relaxy.xyz/</span>\n' + render(tree, '');
    });
})();
