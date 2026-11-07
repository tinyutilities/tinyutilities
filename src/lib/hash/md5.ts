/**
 * MD5 (RFC 1321). The Web Crypto API deliberately does not offer MD5, so this is a small
 * self-contained implementation, verified in md5.test.ts against the RFC 1321 test suite and
 * against Node's built-in implementation. MD5 is broken for security purposes (practical
 * collisions exist); it is offered only for checksums and compatibility with existing systems.
 */

const shifts = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4,
  11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
];

// K[i] = floor(2^32 * abs(sin(i + 1))), as specified in RFC 1321.
const constants = Array.from({ length: 64 }, (_, index) => Math.floor(Math.abs(Math.sin(index + 1)) * 2 ** 32) >>> 0);

function rotateLeft(value: number, amount: number): number {
  return ((value << amount) | (value >>> (32 - amount))) >>> 0;
}

/** Returns the MD5 digest of `data` as 16 bytes. */
export function md5(data: Uint8Array): Uint8Array {
  const bitLength = data.length * 8;
  const fullBlocksLength = data.length - (data.length % 64);
  // Only the final partial block (plus padding and the length) needs copying; large inputs are
  // hashed in place instead of duplicating the whole buffer.
  const tailLength = data.length - fullBlocksLength;
  const tail = new Uint8Array(tailLength + 9 > 64 ? 128 : 64);
  tail.set(data.subarray(fullBlocksLength));
  tail[tailLength] = 0x80;
  const tailView = new DataView(tail.buffer);
  tailView.setUint32(tail.length - 8, bitLength >>> 0, true);
  tailView.setUint32(tail.length - 4, Math.floor(bitLength / 2 ** 32), true);

  const dataView = new DataView(data.buffer, data.byteOffset, data.byteLength);

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;
  const words = new Uint32Array(16);

  const processBlock = (view: DataView, offset: number) => {
    for (let index = 0; index < 16; index += 1) {
      words[index] = view.getUint32(offset + index * 4, true);
    }

    let a = a0;
    let b = b0;
    let c = c0;
    let d = d0;

    for (let index = 0; index < 64; index += 1) {
      let f: number;
      let g: number;

      if (index < 16) {
        f = (b & c) | (~b & d);
        g = index;
      } else if (index < 32) {
        f = (d & b) | (~d & c);
        g = (5 * index + 1) % 16;
      } else if (index < 48) {
        f = b ^ c ^ d;
        g = (3 * index + 5) % 16;
      } else {
        f = c ^ (b | ~d);
        g = (7 * index) % 16;
      }

      f = (f + a + constants[index] + words[g]) >>> 0;
      a = d;
      d = c;
      c = b;
      b = (b + rotateLeft(f, shifts[index])) >>> 0;
    }

    a0 = (a0 + a) >>> 0;
    b0 = (b0 + b) >>> 0;
    c0 = (c0 + c) >>> 0;
    d0 = (d0 + d) >>> 0;
  };

  for (let offset = 0; offset < fullBlocksLength; offset += 64) processBlock(dataView, offset);
  for (let offset = 0; offset < tail.length; offset += 64) processBlock(tailView, offset);

  const digest = new Uint8Array(16);
  const out = new DataView(digest.buffer);
  out.setUint32(0, a0, true);
  out.setUint32(4, b0, true);
  out.setUint32(8, c0, true);
  out.setUint32(12, d0, true);
  return digest;
}
