const fs = require("node:fs");

const MAX_DIMENSION = 16_777_216;

function imageSize(input) {
  const data = toBuffer(input);
  const dimensions =
    parsePng(data) ||
    parseGif(data) ||
    parseJpeg(data) ||
    parseBmp(data) ||
    parseWebp(data) ||
    parsePsd(data) ||
    parseSvg(data) ||
    parseTiff(data) ||
    parseKtx(data);

  if (!dimensions) {
    throw new TypeError("Unsupported or malformed image data.");
  }

  return dimensions;
}

function toBuffer(input) {
  if (typeof input === "string") {
    return fs.readFileSync(input);
  }
  if (Buffer.isBuffer(input)) {
    return input;
  }
  if (ArrayBuffer.isView(input)) {
    return Buffer.from(input.buffer, input.byteOffset, input.byteLength);
  }
  if (input instanceof ArrayBuffer) {
    return Buffer.from(input);
  }
  throw new TypeError("Image input must be a file path or binary data.");
}

function validDimensions(width, height, type) {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width <= 0 ||
    height <= 0 ||
    width > MAX_DIMENSION ||
    height > MAX_DIMENSION
  ) {
    return null;
  }
  return { width, height, type };
}

function parsePng(data) {
  if (
    data.length < 24 ||
    !data.subarray(0, 8).equals(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    ) ||
    data.toString("ascii", 12, 16) !== "IHDR"
  ) {
    return null;
  }
  return validDimensions(data.readUInt32BE(16), data.readUInt32BE(20), "png");
}

function parseGif(data) {
  if (
    data.length < 10 ||
    (data.toString("ascii", 0, 6) !== "GIF87a" &&
      data.toString("ascii", 0, 6) !== "GIF89a")
  ) {
    return null;
  }
  return validDimensions(data.readUInt16LE(6), data.readUInt16LE(8), "gif");
}

function parseJpeg(data) {
  if (data.length < 4 || data[0] !== 0xff || data[1] !== 0xd8) {
    return null;
  }

  for (let offset = 2; offset + 3 < data.length; ) {
    if (data[offset] !== 0xff) {
      return null;
    }
    while (offset < data.length && data[offset] === 0xff) {
      offset++;
    }
    const marker = data[offset++];
    if (marker === 0xd9 || marker === 0xda) {
      return null;
    }
    if (marker >= 0xd0 && marker <= 0xd7) {
      continue;
    }
    if (offset + 1 >= data.length) {
      return null;
    }
    const length = data.readUInt16BE(offset);
    if (length < 2 || offset + length > data.length) {
      return null;
    }
    if (
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf)
    ) {
      if (length < 7) {
        return null;
      }
      return validDimensions(
        data.readUInt16BE(offset + 5),
        data.readUInt16BE(offset + 3),
        "jpg",
      );
    }
    offset += length;
  }

  return null;
}

function parseBmp(data) {
  if (data.length < 26 || data.toString("ascii", 0, 2) !== "BM") {
    return null;
  }
  const dibSize = data.readUInt32LE(14);
  if (dibSize === 12 && data.length >= 26) {
    return validDimensions(data.readUInt16LE(18), data.readUInt16LE(20), "bmp");
  }
  if (dibSize >= 40 && data.length >= 26) {
    return validDimensions(
      Math.abs(data.readInt32LE(18)),
      Math.abs(data.readInt32LE(22)),
      "bmp",
    );
  }
  return null;
}

function parseWebp(data) {
  if (
    data.length < 20 ||
    data.toString("ascii", 0, 4) !== "RIFF" ||
    data.toString("ascii", 8, 12) !== "WEBP"
  ) {
    return null;
  }
  const chunk = data.toString("ascii", 12, 16);
  if (chunk === "VP8X" && data.length >= 30) {
    return validDimensions(
      1 + data[24] + (data[25] << 8) + (data[26] << 16),
      1 + data[27] + (data[28] << 8) + (data[29] << 16),
      "webp",
    );
  }
  if (
    chunk === "VP8 " &&
    data.length >= 30 &&
    data[23] === 0x9d &&
    data[24] === 0x01 &&
    data[25] === 0x2a
  ) {
    return validDimensions(
      data.readUInt16LE(26) & 0x3fff,
      data.readUInt16LE(28) & 0x3fff,
      "webp",
    );
  }
  if (chunk === "VP8L" && data.length >= 25 && data[20] === 0x2f) {
    return validDimensions(
      1 + data[21] + ((data[22] & 0x3f) << 8),
      1 + ((data[22] & 0xc0) >> 6) + (data[23] << 2) + ((data[24] & 0x0f) << 10),
      "webp",
    );
  }
  return null;
}

function parsePsd(data) {
  if (
    data.length < 22 ||
    data.toString("ascii", 0, 4) !== "8BPS" ||
    data.readUInt16BE(4) !== 1
  ) {
    return null;
  }
  return validDimensions(data.readUInt32BE(18), data.readUInt32BE(14), "psd");
}

function parseSvg(data) {
  const text = data.subarray(0, Math.min(data.length, 1_048_576)).toString("utf8");
  const tag = text.match(/<svg\b[^>]*>/i);
  if (!tag) {
    return null;
  }
  const width = svgDimension(tag[0], "width");
  const height = svgDimension(tag[0], "height");
  if (width && height) {
    return validDimensions(width, height, "svg");
  }
  const viewBox = tag[0].match(/\bviewBox\s*=\s*["']\s*[-+\d.eE]+\s+[-+\d.eE]+\s+([-+\d.eE]+)\s+([-+\d.eE]+)\s*["']/i);
  if (!viewBox) {
    return null;
  }
  return validDimensions(Math.round(Number(viewBox[1])), Math.round(Number(viewBox[2])), "svg");
}

function svgDimension(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*[\"']\\s*([+\\-\\d.eE]+)(?:px)?\\s*[\"']`, "i"));
  if (!match) {
    return null;
  }
  const value = Number(match[1]);
  return Number.isFinite(value) ? Math.round(value) : null;
}

function parseTiff(data) {
  if (data.length < 8) {
    return null;
  }
  const littleEndian = data.toString("ascii", 0, 2) === "II";
  const bigEndian = data.toString("ascii", 0, 2) === "MM";
  if (!littleEndian && !bigEndian) {
    return null;
  }
  const read16 = littleEndian
    ? (offset) => data.readUInt16LE(offset)
    : (offset) => data.readUInt16BE(offset);
  const read32 = littleEndian
    ? (offset) => data.readUInt32LE(offset)
    : (offset) => data.readUInt32BE(offset);
  if (read16(2) !== 42) {
    return null;
  }
  const ifdOffset = read32(4);
  if (ifdOffset > data.length - 2) {
    return null;
  }
  const count = read16(ifdOffset);
  if (count > 1024 || ifdOffset + 2 + count * 12 > data.length) {
    return null;
  }
  let width;
  let height;
  for (let index = 0; index < count; index++) {
    const entry = ifdOffset + 2 + index * 12;
    const tag = read16(entry);
    if (tag !== 256 && tag !== 257) {
      continue;
    }
    const type = read16(entry + 2);
    const valueCount = read32(entry + 4);
    if (valueCount !== 1 || (type !== 3 && type !== 4)) {
      continue;
    }
    const value = type === 3 ? read16(entry + 8) : read32(entry + 8);
    if (tag === 256) {
      width = value;
    } else {
      height = value;
    }
  }
  return width && height ? validDimensions(width, height, "tiff") : null;
}

function parseKtx(data) {
  const ktx1 = Buffer.from([0xab, 0x4b, 0x54, 0x58, 0x20, 0x31, 0x31, 0xbb, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ktx2 = Buffer.from([0xab, 0x4b, 0x54, 0x58, 0x20, 0x32, 0x30, 0xbb, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (data.length >= 44 && data.subarray(0, 12).equals(ktx1)) {
    const endianness = data.readUInt32LE(12);
    if (endianness === 0x04030201) {
      return validDimensions(data.readUInt32LE(36), data.readUInt32LE(40), "ktx");
    }
    if (endianness === 0x01020304) {
      return validDimensions(data.readUInt32BE(36), data.readUInt32BE(40), "ktx");
    }
    return null;
  }
  if (data.length >= 28 && data.subarray(0, 12).equals(ktx2)) {
    return validDimensions(data.readUInt32LE(20), data.readUInt32LE(24), "ktx");
  }
  return null;
}

module.exports = imageSize;
module.exports.default = imageSize;
module.exports.imageSize = imageSize;
module.exports.types = ["png", "jpg", "jpeg", "bmp", "gif", "webp", "psd", "svg", "tiff", "ktx"];