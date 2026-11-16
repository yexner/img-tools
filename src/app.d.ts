declare global {
  const __UMAMI_ID__: string;
  const __UMAMI_HOST__: string;
  const __UMAMI_DOMAINS__: string;
  const __CONSENT_MODE__: 'opt-in' | 'opt-out';
  const __APP_VERSION__: string;
  const __COMMIT__: string;

  declare module '*.svg?raw' {
    const svg: string;
    export default svg;
  }
}

export {};
