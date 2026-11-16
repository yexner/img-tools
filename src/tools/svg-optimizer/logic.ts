export interface Options {
  /** Digits kept after the decimal point in numbers. */
  precision: number;
  keepViewBox: boolean;
  /** Take `width` and `height` off the root element, so the SVG scales to its container. */
  removeSize: boolean;
  keepIds: boolean;
}

export const defaults: Options = {
  precision: 3,
  keepViewBox: true,
  removeSize: false,
  keepIds: true,
};

export type Result = { ok: true; text: string } | { ok: false; message: string };

/** Optimize SVG markup. svgo is a big library, so it is loaded only here, when it is needed. */
export async function optimizeSvg(markup: string, o: Options): Promise<Result> {
  const { optimize } = await import('svgo/browser');
  try {
    const out = optimize(markup, {
      multipass: true,
      floatPrecision: o.precision,
      plugins: [
        { name: 'preset-default', params: { overrides: o.keepIds ? { cleanupIds: false } : {} } },
        // Removing the width and height only works when the viewBox stays, so that wins.
        ...(o.keepViewBox || o.removeSize ? [] : ['removeViewBox' as const]),
        ...(o.removeSize ? ['removeDimensions' as const] : []),
      ],
    });
    return { ok: true, text: out.data };
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    // svgo reports where the markup is wrong; keep the first line.
    return {
      ok: false,
      message: `This is not valid SVG: ${raw.split('\n')[0].replace(/^.*?:\s*/, '')}`,
    };
  }
}

export const bytesOf = (text: string) => new TextEncoder().encode(text).length;
