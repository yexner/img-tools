// A little GIF reader for tests: size, frame delays and loop flag, straight from the bytes.
export interface GifInfo {
  width: number;
  height: number;
  delays: number[];
  loops: boolean;
}

export function gifInfo(bytes: Uint8Array): GifInfo {
  const delays: number[] = [];
  for (let i = 0; i + 7 < bytes.length; i++) {
    if (bytes[i] === 0x21 && bytes[i + 1] === 0xf9 && bytes[i + 2] === 4) {
      const ms = (bytes[i + 4] | (bytes[i + 5] << 8)) * 10;
      delays.push(ms <= 10 ? 100 : ms);
    }
  }
  return {
    width: bytes[6] | (bytes[7] << 8),
    height: bytes[8] | (bytes[9] << 8),
    delays,
    loops: new TextDecoder('latin1').decode(bytes).includes('NETSCAPE2.0'),
  };
}
