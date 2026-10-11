// gifenc 1.0.3 ships runtime JS but its npm package does not expose usable
// TypeScript declarations to Vite's module resolver. Narrow local typings.
declare module 'gifenc' {
  type Palette = number[][];
  type Pixels = Uint8Array | Uint8ClampedArray;
  interface QuantizeOptions {
    format?: 'rgb565' | 'rgb444' | 'rgba4444';
  }
  interface GIFFrameOptions {
    palette?: Palette;
    delay?: number;
    repeat?: number;
    transparent?: boolean;
    transparentIndex?: number;
    dispose?: number;
  }
  interface GIFWriter {
    writeFrame(index: Uint8Array, width: number, height: number, options?: GIFFrameOptions): void;
    finish(): void;
    bytes(): Uint8Array;
  }
  export function GIFEncoder(): GIFWriter;
  export function quantize(pixels: Pixels, maxColors: number, options?: QuantizeOptions): Palette;
  export function applyPalette(pixels: Pixels, palette: Palette, format?: QuantizeOptions['format']): Uint8Array;
}
