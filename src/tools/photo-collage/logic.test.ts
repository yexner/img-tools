import { describe, expect, it } from 'vitest';
import { coverSource, draw, layout, type Options, type Surface } from './logic';

const o: Options = { columns: 3, gap: 10, margin: 20, background: '#fff', width: 1000 };

describe('layout', () => {
  it('makes square cells that exactly fill the width', () => {
    const l = layout(7, o);
    expect(l.cell).toBeCloseTo((1000 - 40 - 20) / 3);
    expect(l.rows).toBe(3);
    const last = l.cells[2];
    expect(last.x + last.size).toBeCloseTo(1000 - 20);
    expect(l.height).toBe(Math.round(40 + 3 * l.cell + 2 * 10));
  });

  it('adds rows as needed and places cells row by row', () => {
    const l = layout(5, { ...o, columns: 2 });
    expect(l.rows).toBe(3);
    expect(l.cells[2].x).toBe(l.cells[0].x);
    expect(l.cells[2].y).toBeCloseTo(l.cells[0].y + l.cell + 10);
  });

  it('works with one column and with no gap or margin', () => {
    const l = layout(2, { ...o, columns: 1, gap: 0, margin: 0 });
    expect(l.cell).toBe(1000);
    expect(l.height).toBe(2000);
    expect(layout(1, { ...o, columns: 9 }).cells.length).toBe(1);
  });

  it('never has a cell smaller than a pixel', () => {
    expect(layout(1, { ...o, margin: 600 }).cell).toBe(1);
  });
});

describe('coverSource', () => {
  it('takes the center square', () => {
    expect(coverSource(300, 100)).toEqual({ sx: 100, sy: 0, side: 100 });
    expect(coverSource(100, 300)).toEqual({ sx: 0, sy: 100, side: 100 });
    expect(coverSource(50, 50)).toEqual({ sx: 0, sy: 0, side: 50 });
  });
});

describe('draw', () => {
  it('paints the background and each picture, scaled, in order', async () => {
    const calls: string[] = [];
    const ctx: Surface = {
      fillStyle: '',
      fillRect: (...a) => calls.push(`fill ${ctx.fillStyle} ${a.join(',')}`),
      drawImage: (_i, ...a) => calls.push(`draw ${a.map((n) => Math.round(n)).join(',')}`),
    };
    const l = await draw(
      ctx,
      2,
      { ...o, columns: 2, gap: 0, margin: 0, width: 200 },
      0.5,
      async (i) => ({
        width: i === 0 ? 400 : 100,
        height: 200,
      }),
    );
    expect(calls[0]).toBe(`fill #fff 0,0,100,${l.height / 2}`);
    expect(calls[1]).toBe('draw 100,0,200,200,0,0,50,50');
    expect(calls[2]).toBe('draw 0,50,100,100,50,0,50,50');
  });

  it('loads one picture at a time and lets the caller free it', async () => {
    const events: string[] = [];
    await draw(
      { fillStyle: '', fillRect() {}, drawImage() {} },
      3,
      o,
      1,
      async (i) => {
        events.push(`load ${i}`);
        return { width: 10, height: 10 };
      },
      (i) => events.push(`done ${i}`),
    );
    expect(events).toEqual(['load 0', 'done 0', 'load 1', 'done 1', 'load 2', 'done 2']);
  });
});
