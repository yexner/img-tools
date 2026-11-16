import { formats, outputFormats } from '#lib/core/formats';
import { analyticsConfig } from '#lib/config';

/** The closed event schema. `/privacy` renders its tables from these constants. */
export const ACTIONS = [
  'open',
  'upload',
  'run',
  'done',
  'error',
  'download',
  'download-all',
  'copy',
  'unsupported',
] as const;
export type Action = (typeof ACTIONS)[number];

const FILE_BUCKETS = ['1', '2-5', '6-20', '21-100', '100+'] as const;
const MS_BUCKETS = ['<1s', '1-5s', '5-30s', '30s+'] as const;
const REASONS = [
  'decode-failed',
  'unsupported-format',
  'too-large',
  'out-of-memory',
  'wrong-password',
  'encoder-failed',
  'needs-download',
  'timeout',
  'cancelled',
] as const;
type Reason = (typeof REASONS)[number];
const BROWSER_FLAGS = ['native-heic', 'native-webp-enc', 'webcodecs-h264'] as const;

export const PROPERTIES = [
  { name: 'files', values: 'Count bucket: ' + FILE_BUCKETS.join(', ') },
  {
    name: 'input',
    values: 'Detected input format (one of: ' + Object.keys(formats).join(', ') + ')',
  },
  {
    name: 'output',
    values: 'Chosen output format (' + ['original', ...outputFormats].join(', ') + ')',
  },
  { name: 'preset', values: 'Name of a built-in preset' },
  { name: 'quality', values: 'Quality setting, rounded to 5' },
  { name: 'ms', values: 'Duration bucket: ' + MS_BUCKETS.join(', ') },
  { name: 'reason', values: 'Fixed error code: ' + REASONS.join(', ') },
  { name: 'browser', values: 'Capability flags only: ' + BROWSER_FLAGS.join(', ') },
] as const;

export interface RawProps {
  files?: number;
  input?: string;
  output?: string;
  preset?: string;
  quality?: number;
  ms?: number;
  reason?: string;
  browser?: string[];
  [key: string]: unknown;
}

export function bucketFiles(n: number): (typeof FILE_BUCKETS)[number] {
  if (n <= 1) return '1';
  if (n <= 5) return '2-5';
  if (n <= 20) return '6-20';
  if (n <= 100) return '21-100';
  return '100+';
}

export function bucketMs(ms: number): (typeof MS_BUCKETS)[number] {
  if (ms < 1000) return '<1s';
  if (ms < 5000) return '1-5s';
  if (ms < 30000) return '5-30s';
  return '30s+';
}

const INPUTS = new Set<string>(Object.keys(formats));
const OUTPUTS = new Set<string>(['original', ...outputFormats]);

/** Keep only allowed properties with allowed values, bucketed. Anything else is dropped. */
export function sanitizeProps(raw: RawProps = {}): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  if (typeof raw.files === 'number' && Number.isFinite(raw.files))
    out.files = bucketFiles(raw.files);
  if (typeof raw.input === 'string' && INPUTS.has(raw.input)) out.input = raw.input;
  if (typeof raw.output === 'string' && OUTPUTS.has(raw.output)) out.output = raw.output;
  if (typeof raw.preset === 'string' && /^[a-z0-9-]{1,40}$/.test(raw.preset))
    out.preset = raw.preset;
  if (typeof raw.quality === 'number' && Number.isFinite(raw.quality)) {
    out.quality = Math.round(raw.quality / 5) * 5;
  }
  if (typeof raw.ms === 'number' && Number.isFinite(raw.ms)) out.ms = bucketMs(raw.ms);
  if (typeof raw.reason === 'string' && (REASONS as readonly string[]).includes(raw.reason)) {
    out.reason = raw.reason;
  }
  if (Array.isArray(raw.browser)) {
    const flags = raw.browser.filter((f) => (BROWSER_FLAGS as readonly string[]).includes(f));
    if (flags.length) out.browser = flags.join(',');
  }
  return out;
}

export interface GuardContext {
  configured: boolean;
  hostname: string;
  domains: string[];
  doNotTrack: boolean;
  globalPrivacyControl: boolean;
  mode: 'opt-in' | 'opt-out';
  stored: 'on' | 'off' | null;
}

/** True only when sending is allowed. Every other case is a silent no-op. */
export function canSend(c: GuardContext): boolean {
  if (!c.configured) return false;
  if (!c.domains.includes(c.hostname)) return false;
  if (c.doNotTrack || c.globalPrivacyControl) return false;
  // opt-out: counting runs unless the browser asks not to be tracked (no switch, nothing is read from storage).
  return c.mode === 'opt-out' ? true : c.stored === 'on';
}

export type TrackingSignal = 'Do Not Track' | 'Global Privacy Control' | 'both';

/** The privacy signal the browser sends, if any. Browser only: call it from onMount, never while prerendering. */
export function trackingSignal(): TrackingSignal | null {
  if (typeof navigator === 'undefined') return null;
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  const dnt = nav.doNotTrack === '1';
  const gpc = nav.globalPrivacyControl === true;
  return dnt && gpc ? 'both' : dnt ? 'Do Not Track' : gpc ? 'Global Privacy Control' : null;
}

export const STATS_KEY = 'imgtools:stats';

function readStored(): 'on' | 'off' | null {
  try {
    const v = localStorage.getItem(STATS_KEY);
    return v === 'on' || v === 'off' ? v : null;
  } catch {
    return null;
  }
}

function context(): GuardContext {
  const signal = trackingSignal();
  return {
    configured: analyticsConfig.on,
    hostname: location.hostname,
    domains: analyticsConfig.domains,
    doNotTrack: signal === 'Do Not Track' || signal === 'both',
    globalPrivacyControl: signal === 'Global Privacy Control' || signal === 'both',
    mode: analyticsConfig.mode,
    stored: analyticsConfig.mode === 'opt-in' ? readStored() : null,
  };
}

/** Whether stats are currently being sent (opt-in builds: state of the consent switch). */
export function statsActive(): boolean {
  try {
    return canSend(context());
  } catch {
    return false;
  }
}

interface Umami {
  track: (nameOrProps?: string, data?: Record<string, string | number>) => void;
}

/**
 * Adds Umami's script to the page head, once, and only when sending is allowed. A visitor whose browser sends
 * Do Not Track or Global Privacy Control (or has not opted in, in opt-in builds) therefore makes no request to Umami at all.
 */
export function loadUmami(): void {
  try {
    if (typeof document === 'undefined' || !analyticsConfig.on) return;
    if (document.querySelector('script[data-website-id]') || !canSend(context())) return;
    const script = document.createElement('script');
    script.defer = true;
    script.src = `${analyticsConfig.host}/script.js`;
    script.dataset.websiteId = analyticsConfig.id;
    script.dataset.domains = analyticsConfig.domains.join(',');
    script.dataset.autoTrack = 'false';
    script.dataset.doNotTrack = 'true';
    document.head.append(script);
  } catch {
    // never throws, never delays a tool
  }
}

/** The script is added on demand, so it may not be there yet when the first event is sent. */
function withUmami(fn: (umami: Umami) => void, tries = 50): void {
  const umami = (window as Window & { umami?: Umami }).umami;
  if (umami) fn(umami);
  else if (tries > 0) setTimeout(() => withUmami(fn, tries - 1), 100);
}

function send(name: string | undefined, data: Record<string, string | number>): void {
  try {
    // Our own checks come first: no consent (opt-in), Do Not Track, Global Privacy Control, wrong host.
    if (!canSend(context())) return;
    loadUmami();
    withUmami((umami) => {
      try {
        // No name: a page view of the current page (the script is told not to track on its own).
        if (name) umami.track(name, Object.keys(data).length ? data : undefined);
        else umami.track();
      } catch {
        // never throws, never delays a tool
      }
    });
  } catch {
    // never throws, never delays a tool
  }
}

/** The only way anything is counted. `slug:action`, plus allowed properties. */
export function track(slug: string, action: Action, props?: RawProps): void {
  if (typeof window === 'undefined' || !analyticsConfig.on) return;
  send(`${slug}:${action}`, sanitizeProps(props));
}

/** Page view (the `open` event). */
export function trackPageView(): void {
  if (typeof window === 'undefined' || !analyticsConfig.on) return;
  send(undefined, {});
}
