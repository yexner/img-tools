import type { TrackingSignal } from './analytics';

/** The sentence shown instead of a switch when the browser sends a privacy signal. */
export function signalSentence(signal: TrackingSignal): string {
  const name = signal === 'both' ? 'Do Not Track and Global Privacy Control' : signal;
  return `Your browser has ${name} enabled, so usage counting is switched off for you.`;
}

/** Privacy band wording, chosen from the build configuration. Must match what the build does. */
export function bandText(
  on: boolean,
  mode: 'opt-in' | 'opt-out',
  signal: TrackingSignal | null = null,
): { lead: string; rest: string } {
  const lead = 'Your images never leave your device.';
  if (!on)
    return {
      lead,
      rest: 'Everything runs in your browser. No accounts, no cookies, no analytics.',
    };
  if (signal) {
    return {
      lead,
      rest: `${signalSentence(signal)} Everything runs in your browser; no images, file contents or metadata are stored or sent.`,
    };
  }
  if (mode === 'opt-out') {
    return {
      lead,
      rest: 'Everything runs in your browser. No images, file contents or metadata are stored or sent. The only thing counted is anonymous usage (which tool is used), never anything from your pictures.',
    };
  }
  return {
    lead,
    rest: 'Everything runs in your browser. Anonymous usage stats (Umami, GDPR-compliant, no personal data stored) are off unless you switch them on.',
  };
}
