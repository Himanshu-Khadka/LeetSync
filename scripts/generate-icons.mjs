import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

const sizes = [16, 32, 48, 128];
mkdirSync("assets", { recursive: true });
mkdirSync("store-assets", { recursive: true });

function createIcon(size) {
  const scale = 4;
  const width = size * scale;
  const pixels = new Uint8Array(width * width * 4);

  // Draw at 4x and average the pixels down for clean small-icon edges.
  fillRoundedRect(pixels, width, 0, 0, width, width, width * 0.2, [36, 41, 47, 255]);
  drawLine(pixels, width, width * 0.25, width * 0.31, width * 0.12, width * 0.5, width * 0.25, width * 0.69, width * 0.075, [255, 255, 255, 255]);
  drawLine(pixels, width, width * 0.75, width * 0.31, width * 0.88, width * 0.5, width * 0.75, width * 0.69, width * 0.075, [255, 255, 255, 255]);
  drawLine(pixels, width, width * 0.40, width * 0.54, width * 0.51, width * 0.65, width * 0.69, width * 0.39, width * 0.085, [63, 185, 80, 255]);

  return encodePng(size, size, downsample(pixels, width, scale));
}

function createPromoTile() {
  const width = 440;
  const height = 280;
  const pixels = new Uint8Array(width * height * 4);
  fillRect(pixels, width, 0, 0, width, height, [246, 248, 250, 255]);
  fillRoundedRect(pixels, width, 36, 60, 160, 160, 32, [36, 41, 47, 255]);
  drawLine(pixels, width, 76, 110, 56, 140, 76, 170, 12, [255, 255, 255, 255]);
  drawLine(pixels, width, 156, 110, 176, 140, 156, 170, 12, [255, 255, 255, 255]);
  drawLine(pixels, width, 96, 146, 114, 164, 143, 122, 13, [63, 185, 80, 255]);
  drawPixelText(pixels, width, 220, 112, "LEETSYNC", 4, [36, 41, 47, 255]);
  return encodePng(width, height, pixels);
}

const FONT = {
  C: ["01110", "10000", "10000", "10000", "10000", "10000", "01110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  N: ["10001", "11001", "11001", "10101", "10011", "10011", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"]
};

function drawPixelText(pixels, width, x, y, value, scale, color) {
  for (const character of value) {
    const glyph = FONT[character];
    for (let row = 0; row < glyph.length; row += 1) {
      for (let column = 0; column < glyph[row].length; column += 1) {
        if (glyph[row][column] === "1") fillRect(pixels, width, x + column * scale, y + row * scale, scale, scale, color);
      }
    }
    x += 6 * scale;
  }
}

function fillRect(pixels, width, x, y, rectWidth, rectHeight, color) {
  for (let py = y; py < y + rectHeight; py += 1) {
    for (let px = x; px < x + rectWidth; px += 1) setPixel(pixels, width, px, py, color);
  }
}

function fillRoundedRect(pixels, width, x, y, rectWidth, rectHeight, radius, color) {
  for (let py = y; py < y + rectHeight; py += 1) {
    for (let px = x; px < x + rectWidth; px += 1) {
      const cx = Math.max(x + radius, Math.min(px, x + rectWidth - radius));
      const cy = Math.max(y + radius, Math.min(py, y + rectHeight - radius));
      if ((px - cx) ** 2 + (py - cy) ** 2 <= radius ** 2) setPixel(pixels, width, px, py, color);
    }
  }
}

function drawLine(pixels, width, ...args) {
  const color = args.pop();
  const thickness = args.pop();
  for (let i = 0; i < args.length - 2; i += 2) {
    drawSegment(pixels, width, args[i], args[i + 1], args[i + 2], args[i + 3], thickness, color);
  }
}

function drawSegment(pixels, width, x1, y1, x2, y2, thickness, color) {
  const minX = Math.max(0, Math.floor(Math.min(x1, x2) - thickness));
  const maxX = Math.min(width - 1, Math.ceil(Math.max(x1, x2) + thickness));
  const minY = Math.max(0, Math.floor(Math.min(y1, y2) - thickness));
  const maxY = Math.min(width - 1, Math.ceil(Math.max(y1, y2) + thickness));
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / lengthSquared));
      if (Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy)) <= thickness / 2) {
        setPixel(pixels, width, x, y, color);
      }
    }
  }
}

function setPixel(pixels, width, x, y, color) {
  const offset = (y * width + x) * 4;
  pixels.set(color, offset);
}

function downsample(source, sourceWidth, scale) {
  const size = sourceWidth / scale;
  const output = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      for (let channel = 0; channel < 4; channel += 1) {
        let total = 0;
        for (let sy = 0; sy < scale; sy += 1) {
          for (let sx = 0; sx < scale; sx += 1) {
            total += source[(((y * scale + sy) * sourceWidth + x * scale + sx) * 4) + channel];
          }
        }
        output[(y * size + x) * 4 + channel] = Math.round(total / (scale * scale));
      }
    }
  }
  return output;
}

function encodePng(width, height, rgba) {
  const scanlines = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 4 + 1);
    scanlines[rowStart] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * width * 4, width * 4).copy(scanlines, rowStart + 1);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(scanlines)),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

function chunk(type, data) {
  const name = Buffer.from(type);
  const output = Buffer.alloc(data.length + 12);
  output.writeUInt32BE(data.length, 0);
  name.copy(output, 4);
  data.copy(output, 8);
  output.writeUInt32BE(crc32(Buffer.concat([name, data])), data.length + 8);
  return output;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

for (const size of sizes) {
  writeFileSync(`assets/icon-${size}.png`, createIcon(size));
}
writeFileSync("store-assets/logo-300.png", createIcon(300));
writeFileSync("store-assets/small-promo-440x280.png", createPromoTile());
