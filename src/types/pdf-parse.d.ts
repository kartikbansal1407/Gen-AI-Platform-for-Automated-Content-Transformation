declare module "pdf-parse/lib/pdf-parse.js" {
  export default function parse(
    buffer: Uint8Array,
  ): Promise<{ text: string; numpages: number }>;
}
