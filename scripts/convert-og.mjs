import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';

const svgPath = 'public/og-image.svg';
const pngPath = 'public/og-image.png';

const svgBuffer = readFileSync(svgPath);

await sharp(svgBuffer).resize(1200, 630).png().toFile(pngPath);

console.log(`Created ${pngPath}`);
