/**
 * Generate the favicon and PWA icons from the master logo.svg.
 *
 * This keeps the favicons in sync with the SVG logo: change logo.svg,
 * rebuild, and the favicon/icons follow automatically.
 *
 * Run via `npm run generate:icons` (also hooked into `prebuild`).
 */
import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const logoSvg = join(root, 'logo.svg');
const publicDir = join(root, 'public');
const iconsDir = join(publicDir, 'icons');

/** Rasterize the SVG to a square PNG (transparent background, centered). */
async function rasterize(size) {
    return sharp(logoSvg)
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();
}

/** Pack PNG buffers into a multi-size .ico file (PNG-compressed entries). */
function createIco(images) {
    const count = images.length;
    const headerSize = 6;
    const entrySize = 16;
    const dataOffset = headerSize + entrySize * count;

    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0); // reserved
    header.writeUInt16LE(1, 2); // type = icon
    header.writeUInt16LE(count, 4); // count

    const entries = [];
    let offset = dataOffset;
    for (const { size, buffer } of images) {
        const entry = Buffer.alloc(16);
        entry.writeUInt8(size >= 256 ? 0 : size, 0); // width (0 = 256)
        entry.writeUInt8(size >= 256 ? 0 : size, 1); // height (0 = 256)
        entry.writeUInt8(0, 2); // color count
        entry.writeUInt8(0, 3); // reserved
        entry.writeUInt16LE(1, 4); // planes
        entry.writeUInt16LE(32, 6); // bit count
        entry.writeUInt32LE(buffer.length, 8); // image size
        entry.writeUInt32LE(offset, 12); // offset
        entries.push(entry);
        offset += buffer.length;
    }

    return Buffer.concat([header, ...entries, ...images.map((img) => img.buffer)]);
}

/** Generate public/favicon.ico (16, 32, 48px). */
async function generateFavicon() {
    const sizes = [16, 32, 48];
    const images = await Promise.all(sizes.map(async (size) => ({ size, buffer: await rasterize(size) })));
    writeFileSync(join(publicDir, 'favicon.ico'), createIco(images));
    console.log(`  favicon.ico (${sizes.join(', ')}px)`);
}

/** Generate the PWA/app icons (public/icons/*.png). */
async function generatePwaIcons() {
    const icons = {
        'favicon-16x16.png': 16,
        'favicon-32x32.png': 32,
        'icon-72x72.png': 72,
        'icon-96x96.png': 96,
        'icon-128x128.png': 128,
        'icon-144x144.png': 144,
        'icon-152x152.png': 152,
        'icon-192x192.png': 192,
        'icon-384x384.png': 384,
        'icon-512x512.png': 512,
        'android-chrome-192x192.png': 192,
        'android-chrome-512x512.png': 512,
        'apple-touch-icon.png': 180,
    };
    for (const [filename, size] of Object.entries(icons)) {
        writeFileSync(join(iconsDir, filename), await rasterize(size));
    }
    console.log(`  PWA icons (${Object.keys(icons).length} files)`);
}

/**
 * Generate the maskable icon: white background, logo scaled to fit within
 * the safe zone (a circle with 80% of the icon diameter).
 */
async function generateMaskableIcon() {
    const size = 192;
    const safeZone = Math.floor(size * 0.8);
    const logo = await rasterize(safeZone);
    const buffer = await sharp({
        create: { width: size, height: size, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
    })
        .composite([{ input: logo, gravity: 'center' }])
        .png()
        .toBuffer();
    writeFileSync(join(iconsDir, 'maskable-icon-192x192.png'), buffer);
    console.log(`  maskable-icon-192x192.png (white bg, ${safeZone}px logo)`);
}

await mkdirSync(iconsDir, { recursive: true });
await generateFavicon();
await generatePwaIcons();
await generateMaskableIcon();
console.log('✓ All favicons generated from logo.svg');
