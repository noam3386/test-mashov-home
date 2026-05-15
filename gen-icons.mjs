// Generate valid 192x192 and 512x512 PNG icons
import { PNG } from "./web/node_modules/pngjs/lib/png.js";
import { writeFileSync } from "fs";

function makeIcon(size, outPath) {
  const png = new PNG({ width: size, height: size });
  const radius = Math.round(size * 0.18); // corner radius
  const cx = size / 2;
  const cy = size / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) * 4;

      // Rounded rectangle check
      const dx = Math.max(0, Math.abs(x - cx) - (cx - radius));
      const dy = Math.max(0, Math.abs(y - cy) - (cy - radius));
      const inBg = dx * dx + dy * dy <= radius * radius;

      if (!inBg) {
        // transparent outside
        png.data[idx]     = 0;
        png.data[idx + 1] = 0;
        png.data[idx + 2] = 0;
        png.data[idx + 3] = 0;
        continue;
      }

      // Blue background: #3b82f6
      let r = 59, g = 130, b = 246, a = 255;

      // White house shape (scaled to icon size)
      const s = size / 192; // scale factor
      const hx = (x - cx) / s;
      const hy = (y - cy) / s;

      // Roof triangle: peak at (0,-42), base from (-38,-12) to (38,-12)
      const inRoof = hy <= -12 && hy >= -42 && Math.abs(hx) <= (hy + 42) * 38 / 30;
      // Body rectangle: (-28,-12) to (28,30)
      const inBody = hx >= -28 && hx <= 28 && hy >= -12 && hy <= 30;
      // Door: (-10,10) to (10,30)
      const inDoor = hx >= -10 && hx <= 10 && hy >= 10 && hy <= 30;

      if ((inRoof || inBody) && !inDoor) {
        r = 255; g = 255; b = 255;
      }

      png.data[idx]     = r;
      png.data[idx + 1] = g;
      png.data[idx + 2] = b;
      png.data[idx + 3] = a;
    }
  }

  const buf = PNG.sync.write(png);
  writeFileSync(outPath, buf);
  console.log(`✅ ${outPath} (${buf.length} bytes)`);
}

makeIcon(192, "web/public/icon-192.png");
makeIcon(512, "web/public/icon-512.png");
