/**
 * Grr! stop looking here all is available at
 * @link https://codeberg.org/MattFor/relaxy-website
 */

const scrollToTop = () =>
{
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
};

const scrollToBottom = () =>
{
    window.scrollTo({
        top: document.body.scrollHeight,
        behavior: 'smooth'
    });
};
