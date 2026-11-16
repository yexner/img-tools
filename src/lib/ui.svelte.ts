import { isRecordOfBool, isStringArray, persisted } from './persisted.svelte';
import { loadUmami, statsActive, STATS_KEY } from './analytics';

const pins = persisted<string[]>('pins', [], isStringArray);
const openCats = persisted<Record<string, boolean>>('cats', {}, isRecordOfBool);

let drawer = $state(false);
let palette = $state(false);
let statsOn = $state(false);
let toastText = $state('');
let toastTimer: ReturnType<typeof setTimeout> | undefined;

export const ui = {
  get drawer() {
    return drawer;
  },
  set drawer(v: boolean) {
    drawer = v;
  },
  get palette() {
    return palette;
  },
  set palette(v: boolean) {
    palette = v;
  },
  get pins() {
    return pins.value;
  },
  isPinned: (slug: string) => pins.value.includes(slug),
  togglePin(slug: string) {
    pins.value = pins.value.includes(slug)
      ? pins.value.filter((s) => s !== slug)
      : [...pins.value, slug];
  },
  /** Stored open/closed state of a sidebar category, or undefined if never touched. */
  catOpen: (id: string): boolean | undefined => openCats.value[id],
  setCatOpen(id: string, open: boolean) {
    openCats.value = { ...openCats.value, [id]: open };
  },
  get stats() {
    return statsOn;
  },
  refreshStats() {
    statsOn = statsActive();
  },
  setStats(on: boolean) {
    try {
      localStorage.setItem(STATS_KEY, on ? 'on' : 'off');
    } catch {
      // private mode: the choice lasts for this page view only
    }
    statsOn = statsActive();
    if (statsOn) loadUmami();
  },
  get toast() {
    return toastText;
  },
  showToast(text: string) {
    toastText = text;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toastText = ''), 2000);
  },
};
