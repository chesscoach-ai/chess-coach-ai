import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const source = path.join(root, "public", "brand", "app-icon-1024.png");
const androidRoot = path.join(root, "android", "app", "src", "main", "res");
const densities = {
  mdpi: 48,
  hdpi: 72,
  xhdpi: 96,
  xxhdpi: 144,
  xxxhdpi: 192,
};

for (const [density, size] of Object.entries(densities)) {
  const directory = path.join(androidRoot, `mipmap-${density}`);
  await mkdir(directory, { recursive: true });
  const icon = await sharp(source).resize(size, size).png().toBuffer();
  await Promise.all([
    sharp(icon).toFile(path.join(directory, "ic_launcher.png")),
    sharp(icon).toFile(path.join(directory, "ic_launcher_round.png")),
    sharp(source)
      .resize(Math.round(size * 2.25), Math.round(size * 2.25), { fit: "contain" })
      .png()
      .toFile(path.join(directory, "ic_launcher_foreground.png")),
  ]);
}

await sharp(source)
  .resize(1024, 1024)
  .png()
  .toFile(
    path.join(
      root,
      "ios",
      "App",
      "App",
      "Assets.xcassets",
      "AppIcon.appiconset",
      "AppIcon-512@2x.png",
    ),
  );

console.log("Icônes natives Chess Clan générées.");
