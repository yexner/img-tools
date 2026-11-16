// Runs before first paint (blocking external script, so no inline-script CSP hash is needed).
(function () {
  var d = document.documentElement;
  var get = function (k) {
    try {
      return localStorage.getItem('imgtools:' + k);
    } catch (_) {
      return null;
    }
  };
  var theme = get('theme');
  if (theme !== 'light' && theme !== 'dark') {
    theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  d.dataset.theme = theme;
  d.dataset.band = get('band-seen') === '1' ? 'slim' : 'compact';
  d.dataset.sidebar = get('sidebar') === 'closed' ? 'closed' : 'open';
})();
