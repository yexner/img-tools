// Color pairs for backgrounds. All original; shared by the tools that draw a background.

export interface Gradient {
  id: string;
  label: string;
  from: string;
  to: string;
}

/** Twelve ready-made gradients (all original color pairs). */
export const GRADIENTS: Gradient[] = [
  { id: 'dusk', label: 'Dusk', from: '#1f2a68', to: '#a23b72' },
  { id: 'ocean', label: 'Ocean', from: '#0b3d91', to: '#1fb5a8' },
  { id: 'forest', label: 'Forest', from: '#0f3d2e', to: '#6aa84f' },
  { id: 'ember', label: 'Ember', from: '#7a1f1f', to: '#f08a24' },
  { id: 'plum', label: 'Plum', from: '#3b1a5a', to: '#d6609a' },
  { id: 'slate', label: 'Slate', from: '#1c2330', to: '#4b5b73' },
  { id: 'citrus', label: 'Citrus', from: '#e0a100', to: '#7ac142' },
  { id: 'sky', label: 'Sky', from: '#2b6cff', to: '#8fd3ff' },
  { id: 'berry', label: 'Berry', from: '#5a0f3d', to: '#e5484d' },
  { id: 'mint', label: 'Mint', from: '#0f766e', to: '#a7f3d0' },
  { id: 'sand', label: 'Sand', from: '#8a5a2b', to: '#f2d7a6' },
  { id: 'night', label: 'Night', from: '#05060f', to: '#2b2f6b' },
];
