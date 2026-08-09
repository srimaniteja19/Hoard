const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Pure JS CRC32 calculation
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const typeAndData = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([len, typeAndData, crcBuf]);
}

function makeHoardPNG(size) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8;  // bit depth 8
  ihdrData[9] = 6;  // RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdrChunk = createChunk('IHDR', ihdrData);

  // Raw RGBA pixels with scanline filter byte 0x00
  const rowSize = 1 + size * 4;
  const rawData = Buffer.alloc(size * rowSize);

  const border = Math.max(1, Math.floor(size * 0.08));
  const pad = Math.floor(size * 0.12);

  for (let y = 0; y < size; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter 0

    for (let x = 0; x < size; x++) {
      const pxOffset = rowOffset + 1 + x * 4;

      // Check if inside inner badge vs shadow vs outer
      const isInner = x >= pad && x < size - pad && y >= pad && y < size - pad;
      const isInnerBorder = isInner && (x < pad + border || x >= size - pad - border || y < pad + border || y >= size - pad - border);

      // Check H letter stroke
      const x1 = Math.floor(pad + (size - 2 * pad) * 0.3);
      const x2 = Math.floor(pad + (size - 2 * pad) * 0.7);
      const y1 = Math.floor(pad + (size - 2 * pad) * 0.25);
      const y2 = Math.floor(pad + (size - 2 * pad) * 0.75);
      const ym = Math.floor(pad + (size - 2 * pad) * 0.5);

      const isHStroke =
        isInner &&
        !isInnerBorder &&
        (((x >= x1 - border / 2 && x <= x1 + border / 2) || (x >= x2 - border / 2 && x <= x2 + border / 2)) && y >= y1 && y <= y2) ||
        (isInner && !isInnerBorder && (y >= ym - border / 2 && y <= ym + border / 2 && x >= x1 && x <= x2));

      if (isHStroke || isInnerBorder) {
        // Black stroke #000000
        rawData[pxOffset + 0] = 0;
        rawData[pxOffset + 1] = 0;
        rawData[pxOffset + 2] = 0;
        rawData[pxOffset + 3] = 255;
      } else if (isInner) {
        // Yellow fill #FFE600
        rawData[pxOffset + 0] = 255;
        rawData[pxOffset + 1] = 230;
        rawData[pxOffset + 2] = 0;
        rawData[pxOffset + 3] = 255;
      } else {
        // Cream background #F4F0EA
        rawData[pxOffset + 0] = 244;
        rawData[pxOffset + 1] = 240;
        rawData[pxOffset + 2] = 234;
        rawData[pxOffset + 3] = 255;
      }
    }
  }

  const idatData = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', idatData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const iconsDir = path.join(__dirname, '../extension/icons');
fs.writeFileSync(path.join(iconsDir, 'icon16.png'), makeHoardPNG(16));
fs.writeFileSync(path.join(iconsDir, 'icon48.png'), makeHoardPNG(48));
fs.writeFileSync(path.join(iconsDir, 'icon128.png'), makeHoardPNG(128));

console.log('Real PNG icons generated successfully!');
