export type Category =
  | 'convert'
  | 'compress'
  | 'resize-crop'
  | 'privacy'
  | 'watermark'
  | 'animation'
  | 'developer'
  | 'creative'
  | 'photo-id';

/** Format ids, mapped in #lib/core/formats.ts to MIME types, extensions, magic bytes and labels. */
export type InputKind =
  | 'jpeg'
  | 'png'
  | 'webp'
  | 'avif'
  | 'gif'
  | 'bmp'
  | 'tiff'
  | 'heic'
  | 'svg'
  | 'pdf'
  | 'video'
  | 'image'; /* any image format */

/** Big or WASM dependencies, loaded through #lib/codecs and warmed on page open. */
export type Codec =
  'heic' | 'tiff' | 'webp-enc' | 'avif-enc' | 'oxipng' | 'pdfjs' | 'svgo' | 'mp4' | 'gif' | 'serif';

export interface ToolMeta {
  /** "WebP to JPG" (US English). */
  name: string;
  /** One line, 90 characters at most; shown on cards and under the title. */
  description: string;
  /** Search result title, 60 characters at most, ending in the brand. Default: "{name} · IMG-TOOLS". */
  seoTitle?: string;
  /** Search result description, 155 characters at most. Default: `description`. */
  seoDescription?: string;
  /** Two to three plain sentences shown under the title; unique per tool and true to what the tool does. */
  intro?: string;
  category: Category;
  /** Sort order of the tool within its category, as `group.number`. */
  spec: `${number}.${number}`;
  /** Raw SVG: `import icon from '@tabler/icons/outline/x.svg?raw'`. */
  icon: string;
  /** `[]` for tools without file input (for example the OG image generator). */
  accepts: InputKind[];
  /** Many files at once, and folder drop. */
  batch: boolean;
  /** Short format hint on the card, for example `WebP → JPG`. */
  hint?: string;
  /** Extra search words. */
  keywords?: string[];
  /** Codecs the default settings need; they are warmed when the page opens. */
  needs?: Codec[];
}

export interface Help {
  /** 3–5 imperative steps. */
  steps: string[];
  /** 3–6 entries; `backticks` render as code, nothing else. */
  faq: { q: string; a: string }[];
}

export type OutputFormat = 'original' | 'jpeg' | 'png' | 'webp' | 'avif';

/** What a BatchTool `run` returns per input file. */
export type Output =
  | { blob: Blob; name?: string; suffix?: string; note?: string }
  | { text: string; label: string; filename?: string; note?: string }
  | { data: unknown };

export type RunResult = Blob | Output | Output[];

export interface RunContext {
  signal: AbortSignal;
  /** Per-file progress, 0 to 1. */
  progress(fraction: number): void;
  /** Ask the visitor for a value, for example a PDF password. Resolves to null if canceled. */
  ask(prompt: { label: string; secret?: boolean }): Promise<string | null>;
  /** Show a message and let the visitor continue or cancel, for example before a very slow job. */
  confirm(message: string): Promise<boolean>;
}

/** A tool with its slug, as produced by the registry. */
export type Tool = ToolMeta & { slug: string };

/** One input of a ComposeTool, in the order the visitor arranged them. */
export interface ComposeSource {
  id: number;
  file: File;
  kind: InputKind;
  /** Object URL for a thumbnail, or '' when the browser cannot show the file. */
  thumb: string;
}
