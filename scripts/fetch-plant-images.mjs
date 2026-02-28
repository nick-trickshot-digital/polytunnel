/**
 * Fetch plant thumbnail images from Pixabay.
 *
 * Usage: node scripts/fetch-plant-images.mjs
 *
 * Downloads small preview images for each plant and saves them
 * to public/images/plants/{slug}.jpg
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'images', 'plants');
const API_KEY = '54837527-9bf5e5652d69ca53a3d76c40a';

// Map plant names to good Pixabay search terms (produce/food focus)
const searchTerms = {
  'Tomatoes': 'tomato vegetable fresh',
  'Cucumbers': 'cucumber vegetable fresh',
  'Peppers (Sweet)': 'bell pepper vegetable',
  'Chillies': 'chili pepper red hot',
  'Aubergines': 'eggplant aubergine vegetable',
  'Lettuce': 'lettuce salad green',
  'Basil': 'basil herb fresh leaves',
  'French Beans': 'green beans french beans',
  'Runner Beans': 'runner beans vegetable',
  'Courgettes': 'zucchini courgette vegetable',
  'Strawberries': 'strawberry fruit fresh',
  'Radishes': 'radish vegetable fresh',
  'Spinach': 'spinach leaves fresh',
  'Spring Onions': 'spring onion scallion',
  'Carrots': 'carrot vegetable fresh',
  'Beetroot': 'beetroot beet vegetable',
  'Kale': 'kale vegetable green',
  'Chard': 'swiss chard vegetable',
  'Pak Choi': 'bok choy pak choi',
  'Rocket': 'arugula rocket salad leaves',
  'Coriander': 'coriander cilantro herb',
  'Parsley': 'parsley herb fresh',
  'Dill': 'dill herb fresh',
  'Melon': 'cantaloupe melon fruit',
  'Grapes': 'grapes fruit vine',
  'Figs': 'fig fruit fresh',
  'Sweetcorn': 'sweet corn cob',
  'Squash (Winter)': 'butternut squash winter',
  'Peas': 'peas pod green',
  'Broad Beans': 'broad beans fava',
  'Florence Fennel': 'fennel bulb vegetable',
  'Celery': 'celery stalk vegetable',
  'Celeriac': 'celeriac root vegetable',
  'Sweet Potatoes': 'sweet potato vegetable',
  'Microgreens': 'microgreens sprouts',
  'Garlic': 'garlic bulb clove',
  'Onions (Overwintering Sets)': 'onion vegetable',
  'Mint': 'mint herb fresh leaves',
  'Chives': 'chives herb fresh',
  'Thyme': 'thyme herb fresh',
  'Oregano': 'oregano herb fresh',
  'Sorrel': 'sorrel herb leaves',
  'Nasturtiums': 'nasturtium flower orange',
  'Marigolds': 'marigold flower orange',
  'Turnips': 'turnip vegetable root',
  'Kohlrabi': 'kohlrabi vegetable',
  'Leeks': 'leek vegetable',
  'Potatoes (Early)': 'potato vegetable fresh',
  'Mangetout': 'snow pea mangetout',
  'Calabrese/Broccoli': 'broccoli vegetable fresh',
  'Spring Cabbage': 'cabbage vegetable green',
  'Mizuna': 'mizuna lettuce leaves',
  'Mustard Greens': 'mustard greens leaves',
  'Land Cress': 'watercress salad leaves',
  'Endive': 'endive chicory salad',
  'Perpetual Spinach': 'chard spinach leaves',
  'Okra': 'okra vegetable green',
  'Raspberries': 'raspberry fruit fresh',
  'Rosemary': 'rosemary herb fresh',
  'Sage': 'sage herb fresh leaves',
  'Lemon Balm': 'lemon balm herb',
  'Tarragon (French)': 'tarragon herb fresh',
  'Chervil': 'chervil herb fresh',
  'Borage': 'borage flower blue herb',
  'Sunflowers': 'sunflower bloom',
  'Peaches': 'peach fruit fresh',
  'Pumpkins': 'pumpkin orange',
  'Watercress': 'watercress fresh leaves',
};

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const doFetch = (fetchUrl) => {
      https.get(fetchUrl, { headers: { 'User-Agent': 'PolytunnelApp/1.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          doFetch(res.headers.location);
          return;
        }
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch (e) { reject(new Error(`JSON parse error: ${e.message}`)); }
        });
        res.on('error', reject);
      }).on('error', reject);
    };
    doFetch(url);
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const doDownload = (dlUrl) => {
      https.get(dlUrl, { headers: { 'User-Agent': 'PolytunnelApp/1.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          doDownload(res.headers.location);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        const file = fs.createWriteStream(dest);
        res.pipe(file);
        file.on('finish', () => { file.close(); resolve(); });
        file.on('error', (e) => { fs.unlinkSync(dest); reject(e); });
      }).on('error', reject);
    };
    doDownload(url);
  });
}

async function fetchPlantImage(plantName, query) {
  const slug = slugify(plantName);
  const outPath = path.join(OUTPUT_DIR, slug + '.jpg');

  // Skip if already downloaded
  if (fs.existsSync(outPath)) {
    console.log(`  ✓ ${plantName} — already exists`);
    return { plantName, slug, success: true, skipped: true };
  }

  try {
    const url = `https://pixabay.com/api/?key=${API_KEY}&q=${encodeURIComponent(query)}&image_type=photo&per_page=3&safesearch=true&category=food`;
    let data = await fetchJSON(url);

    // If no food results, try without category filter
    if (!data.hits || data.hits.length === 0) {
      const url2 = `https://pixabay.com/api/?key=${API_KEY}&q=${encodeURIComponent(query)}&image_type=photo&per_page=3&safesearch=true`;
      data = await fetchJSON(url2);
    }

    if (!data.hits || data.hits.length === 0) {
      console.log(`  ✗ ${plantName} — no results`);
      return { plantName, slug, success: false, reason: 'no results' };
    }

    // Use the preview image (150px) — small and fast
    const hit = data.hits[0];
    const imageUrl = hit.webformatURL; // 640px wide, good quality

    await downloadFile(imageUrl, outPath);
    console.log(`  ✓ ${plantName} — downloaded (${hit.webformatWidth}x${hit.webformatHeight})`);
    return { plantName, slug, success: true };
  } catch (err) {
    console.log(`  ✗ ${plantName} — error: ${err.message}`);
    return { plantName, slug, success: false, reason: err.message };
  }
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const plants = Object.entries(searchTerms);
  console.log(`Fetching images for ${plants.length} plants from Pixabay...\n`);

  const results = [];
  for (const [plantName, query] of plants) {
    const result = await fetchPlantImage(plantName, query);
    results.push(result);
    // Pixabay allows 100 req/min, but be polite
    await new Promise(r => setTimeout(r, 300));
  }

  const succeeded = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success);

  console.log(`\n--- Done ---`);
  console.log(`Downloaded: ${succeeded}/${plants.length}`);
  if (failed.length > 0) {
    console.log(`\nFailed:`);
    failed.forEach(f => console.log(`  - ${f.plantName}: ${f.reason}`));
  }

  // Generate the image mapping
  const mapping = {};
  for (const r of results) {
    if (r.success) {
      mapping[r.plantName] = `/images/plants/${r.slug}.jpg`;
    }
  }

  const mappingPath = path.join(OUTPUT_DIR, '_mapping.json');
  fs.writeFileSync(mappingPath, JSON.stringify(mapping, null, 2));
  console.log(`\nMapping written to ${mappingPath}`);
}

main().catch(console.error);
