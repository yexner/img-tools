/** Build-time analytics configuration (see vite.config.ts). With no variables, analytics are absent. */
export const analyticsConfig = {
  on: Boolean(__UMAMI_ID__ && __UMAMI_HOST__),
  id: __UMAMI_ID__,
  host: __UMAMI_HOST__,
  domains: __UMAMI_DOMAINS__
    .split(',')
    .map((d) => d.trim())
    .filter(Boolean),
  mode: __CONSENT_MODE__,
};

export const appInfo = { version: __APP_VERSION__, commit: __COMMIT__ };
export const repoUrl = 'https://github.com/yexner/img-tools';
export const siteUrl = 'https://img-tools.fyi';
