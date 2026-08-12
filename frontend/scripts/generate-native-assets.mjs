import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const brandRoot = path.join(root, "public", "brand");
const source = path.join(brandRoot, "knightly-mark.svg");
const androidRoot = path.join(root, "android", "app", "src", "main", "res");
const densities = {
  mdpi: 48,
  hdpi: 72,
  xhdpi: 96,
  xxhdpi: 144,
  xxxhdpi: 192,
};

await Promise.all([
  sharp(source).resize(64, 64).png().toFile(path.join(brandRoot, "knightly-mark-64.png")),
  sharp(source).resize(192, 192).png().toFile(path.join(brandRoot, "app-icon-192.png")),
  sharp(source).resize(512, 512).png().toFile(path.join(brandRoot, "app-icon-512.png")),
  sharp(source).resize(1024, 1024).png().toFile(path.join(brandRoot, "app-icon-1024.png")),
  sharp(source).resize(180, 180).png().toFile(path.join(brandRoot, "apple-touch-icon.png")),
]);

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

console.log("Icônes natives Knightly générées.");
