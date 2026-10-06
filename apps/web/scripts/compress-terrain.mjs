import sharp from "sharp";
import { writeFileSync } from "node:fs";

const SRC = "public/png/terrain-map.png";

const img = sharp(SRC).resize(1600, 1200, { fit: "cover" });

await img.clone().webp({ quality: 72 }).toFile("public/png/terrain-map.webp");

const tiny = await sharp(SRC)
  .resize(24, 18, { fit: "cover" })
  .blur(1)
  .removeAlpha()
  .raw()
  .toBuffer();
const b64 = `data:image/jpeg;base64,${(await sharp(SRC).resize(24, 18, { fit: "cover" }).blur(1).jpeg({ quality: 40 }).toBuffer()).toString("base64")}`;
writeFileSync("public/png/terrain-map-blur.txt", b64);

console.log("terrain-map.webp + blur placeholder written");
