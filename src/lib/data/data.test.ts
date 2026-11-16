import { describe, expect, it } from 'vitest';
import { documentFileName, passportDocuments, photoPixels } from './passport-documents';
import { sizeName, socialSizes } from './social-sizes';

describe('social sizes', () => {
  it('names an official https source and a check date for every entry', () => {
    for (const s of socialSizes) {
      expect(s.source, s.id).toMatch(/^https:\/\//);
      expect(s.verified, s.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(s.width).toBeGreaterThan(0);
      expect(s.height).toBeGreaterThan(0);
    }
  });

  it('has no repeated file name', () => {
    const names = socialSizes.map(sizeName);
    expect(new Set(names).size).toBe(names.length);
  });

  it('covers the five required platforms', () => {
    const platforms = new Set(socialSizes.map((s) => s.platform));
    for (const p of ['Instagram', 'X', 'LinkedIn', 'YouTube', 'Facebook'])
      expect(platforms).toContain(p);
  });

  it('only uses official sites as sources', () => {
    const allowed = [
      'help.instagram.com',
      'help.x.com',
      'www.linkedin.com',
      'support.google.com',
      'www.facebook.com',
    ];
    for (const s of socialSizes) expect(allowed).toContain(new URL(s.source).host);
  });
});

describe('passport documents', () => {
  it('names an official https source and a check date for every entry', () => {
    for (const d of passportDocuments) {
      expect(d.source, d.id).toMatch(/^https:\/\//);
      expect(d.verified, d.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      if (d.head) {
        expect(d.head.min, d.id).toBeLessThan(d.head.max);
        expect(d.head.max, d.id).toBeLessThan(d.height);
      }
    }
  });

  it('has no repeated id or file name', () => {
    expect(new Set(passportDocuments.map((d) => d.id)).size).toBe(passportDocuments.length);
    const names = passportDocuments.map(documentFileName);
    expect(new Set(names).size).toBe(names.length);
  });

  it('only uses official sites as sources', () => {
    const allowed = [
      'travel.state.gov',
      'www.gov.uk',
      'www.canada.ca',
      'www.passports.gov.au',
      'www.visaforchina.cn',
      'www.sf.us.emb-japan.go.jp',
      'portal2.passportindia.gov.in',
      'ociservices.gov.in',
    ];
    for (const d of passportDocuments) expect(allowed).toContain(new URL(d.source).host);
  });

  it('gives pixel sizes at 300 DPI', () => {
    expect(photoPixels({ width: 35, height: 45 })).toEqual({ width: 413, height: 531 });
    expect(photoPixels({ width: 50.8, height: 50.8 })).toEqual({ width: 600, height: 600 });
  });
});
