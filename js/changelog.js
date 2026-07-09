/**
 * Grr! stop looking here all is available at
 * @link https://codeberg.org/MattFor/relaxy-website
 */

const MAX_RETRIES = 3;
const RETRY_DELAY = 1500;

const loadMarkdown = (url, target, attempt) =>
{
    fetch(url)
    .then(response =>
    {
        if (!response.ok)
        {
            throw new Error('Network response was not ok: ' + response.statusText);
        }

        return response.text();
    })
    .then(markdown =>
    {
        target.innerHTML = marked(markdown);
    })
    .catch(error =>
    {
        console.error(`Error fetching ${url} (attempt ${attempt}/${MAX_RETRIES}):`, error);

        if (attempt < MAX_RETRIES)
        {
            target.innerHTML = `<p class="changelog-retry-msg">Loading… (retry ${attempt}/${MAX_RETRIES - 1})</p>`;
            setTimeout(() => loadMarkdown(url, target, attempt + 1), RETRY_DELAY);
        }
        else
        {
            target.innerHTML = '<p>Failed to load content after multiple attempts.</p>' + '<p><button onclick="location.reload()" style="margin-top:0.5rem;padding:0.4em 1em;cursor:pointer;border-radius:6px;border:1px solid var(--border);background:var(--bg-elevated);color:var(--text);font-size:0.9rem">Retry</button></p>';
        }
    });
};

const changelogContent = document.getElementById('changelog-content');

if (changelogContent)
{
    const isDevlog = window.location.href.includes('devlog');
    const mainUrl = isDevlog
        ? 'https://cdn.relaxy.xyz/relaxy/website/text/devlog.md'
        : 'https://cdn.relaxy.xyz/relaxy/website/text/changelog.md';

    loadMarkdown(mainUrl, changelogContent, 1);
}

const oldChangelogContent = document.getElementById('old-changelog-content');

if (oldChangelogContent)
{
    loadMarkdown('https://cdn.relaxy.xyz/relaxy/website/text/changelog-old.md', oldChangelogContent, 1);
}

const upcomingContent = document.getElementById('upcoming-content');

if (upcomingContent)
{
    loadMarkdown('https://cdn.relaxy.xyz/relaxy/website/text/upcoming.md', upcomingContent, 1);
}
