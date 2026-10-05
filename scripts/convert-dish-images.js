const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const root = '/var/www/vhosts/demo.menucolcodice.it/httpdocs';
const uploads = path.join(root, 'public', 'uploads');
const productsFile = path.join(root, 'database', 'menu', 'products.ts');
const dishesFile = path.join(root, 'database', 'dishes.ts');

async function toWebpOnly(filePath) {
  const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.webp`;
  const dest = path.join(uploads, filename);
  await sharp(filePath)
    .rotate()
    .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 78, alphaQuality: 85, effort: 4 })
    .toFile(dest);
  fs.chmodSync(dest, 0o644);
  return filename;
}

function extractFilenames(source) {
  const names = new Set();
  const re = /serve-image\?filename=([^"&]+)/g;
  let m;
  while ((m = re.exec(source))) names.add(decodeURIComponent(m[1]));
  return names;
}

(async () => {
  let productsSrc = fs.readFileSync(productsFile, 'utf8');
  const filenames = [...extractFilenames(productsSrc)].filter((name) =>
    /\.(png|jpe?g)$/i.test(name)
  );
  console.log('dishes to convert (webp only, no rembg)', filenames.length);
  for (const name of filenames) {
    const srcPath = path.join(uploads, name);
    if (!fs.existsSync(srcPath)) {
      console.log('missing', name);
      continue;
    }
    const next = await toWebpOnly(srcPath);
    const from = `filename=${name}`;
    const to = `filename=${next}`;
    productsSrc = productsSrc.split(from).join(to);
    if (fs.existsSync(dishesFile)) {
      const dishesSrc = fs.readFileSync(dishesFile, 'utf8').split(from).join(to);
      fs.writeFileSync(dishesFile, dishesSrc);
    }
    fs.writeFileSync(productsFile, productsSrc);
    if (name !== next) {
      try { fs.unlinkSync(srcPath); } catch {}
    }
    console.log(name, '->', next, fs.statSync(path.join(uploads, next)).size);
  }
  console.log('done');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
