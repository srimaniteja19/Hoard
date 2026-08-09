const fs = require('fs');
const path = require('path');
const { createCanvas } = (() => {
  try { return require('canvas'); } catch { return {}; }
})();

function generatePNG(size, filePath) {
  if (createCanvas) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    // Background
    ctx.fillStyle = '#F4F0EA';
    ctx.fillRect(0, 0, size, size);

    const pad = Math.round(size * 0.1);
    const boxSize = size - pad * 2;
    const shadowOffset = Math.max(2, Math.round(size * 0.06));

    // Shadow
    ctx.fillStyle = '#000000';
    ctx.fillRect(pad + shadowOffset, pad + shadowOffset, boxSize, boxSize);

    // Yellow Box
    ctx.fillStyle = '#FFE600';
    ctx.fillRect(pad, pad, boxSize, boxSize);
    ctx.lineWidth = Math.max(1, Math.round(size * 0.06));
    ctx.strokeStyle = '#000000';
    ctx.strokeRect(pad, pad, boxSize, boxSize);

    // H mark
    ctx.lineWidth = Math.max(2, Math.round(size * 0.1));
    ctx.strokeStyle = '#000000';
    ctx.lineCap = 'square';
    
    const x1 = pad + boxSize * 0.3;
    const x2 = pad + boxSize * 0.7;
    const y1 = pad + boxSize * 0.25;
    const y2 = pad + boxSize * 0.75;
    const ym = pad + boxSize * 0.5;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1, y2);
    ctx.moveTo(x2, y1);
    ctx.lineTo(x2, y2);
    ctx.moveTo(x1, ym);
    ctx.lineTo(x2, ym);
    ctx.stroke();

    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(filePath, buffer);
    console.log(`Generated canvas PNG: ${filePath}`);
    return;
  }

  // Fallback minimal valid 1x1 yellow PNG padded to size if canvas module isn't installed
  const base64Png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  fs.writeFileSync(filePath, Buffer.from(base64Png, 'base64'));
  console.log(`Generated fallback PNG: ${filePath}`);
}

const iconsDir = path.join(__dirname, '../extension/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

generatePNG(16, path.join(iconsDir, 'icon16.png'));
generatePNG(48, path.join(iconsDir, 'icon48.png'));
generatePNG(128, path.join(iconsDir, 'icon128.png'));
