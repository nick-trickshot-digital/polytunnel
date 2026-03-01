import { NextRequest, NextResponse } from 'next/server';
import { getAnthropicClient, AI_MODEL } from '@/lib/ai/client';
import { getPlantByName, reloadPlantDatabase } from '@/lib/plants/database';
import fs from 'fs';
import path from 'path';
import https from 'https';

const PIXABAY_API_KEY = '54837527-9bf5e5652d69ca53a3d76c40a';

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function fetchJSON(url: string): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const doFetch = (fetchUrl: string) => {
      https.get(fetchUrl, { headers: { 'User-Agent': 'PolytunnelApp/1.0' } }, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          doFetch(res.headers.location);
          return;
        }
        let data = '';
        res.on('data', (chunk: string) => data += chunk);
        res.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch (e) { reject(e); }
        });
        res.on('error', reject);
      }).on('error', reject);
    };
    doFetch(url);
  });
}

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const doDownload = (dlUrl: string) => {
      https.get(dlUrl, { headers: { 'User-Agent': 'PolytunnelApp/1.0' } }, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
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

async function downloadPlantImage(plantName: string, searchQuery: string): Promise<string | null> {
  const slug = slugify(plantName);
  const outDir = path.join(process.cwd(), 'public', 'images', 'plants');
  const outPath = path.join(outDir, slug + '.jpg');

  if (fs.existsSync(outPath)) return `/images/plants/${slug}.jpg`;

  try {
    fs.mkdirSync(outDir, { recursive: true });

    // Try food category first
    let url = `https://pixabay.com/api/?key=${PIXABAY_API_KEY}&q=${encodeURIComponent(searchQuery)}&image_type=photo&per_page=3&safesearch=true&category=food`;
    let data = await fetchJSON(url) as { hits?: Array<{ webformatURL: string }> };

    if (!data.hits || data.hits.length === 0) {
      url = `https://pixabay.com/api/?key=${PIXABAY_API_KEY}&q=${encodeURIComponent(searchQuery)}&image_type=photo&per_page=3&safesearch=true`;
      data = await fetchJSON(url) as { hits?: Array<{ webformatURL: string }> };
    }

    if (!data.hits || data.hits.length === 0) return null;

    await downloadFile(data.hits[0].webformatURL, outPath);
    return `/images/plants/${slug}.jpg`;
  } catch {
    return null;
  }
}

function escapeCSVField(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes(';')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

export async function POST(request: NextRequest) {
  try {
    const { plantName: rawName } = await request.json();
    if (!rawName || typeof rawName !== 'string') {
      return NextResponse.json({ error: 'plantName is required' }, { status: 400 });
    }

    // Auto-capitalise
    const plantName = rawName.replace(/\b\w/g, (c: string) => c.toUpperCase());

    // Check if it already exists
    const existing = getPlantByName(plantName);
    if (existing) {
      return NextResponse.json({ error: 'Plant already exists in database', plant: existing }, { status: 409 });
    }

    // Use Claude to generate plant data
    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: AI_MODEL,
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `You are a horticultural database expert. Generate CSV data for the plant "${plantName}" grown in a UK polytunnel (Surrey, UK climate zone 8-9).

Return ONLY a valid JSON object with these exact fields (no markdown, no explanation):
{
  "name": "${plantName}",
  "family": "Botanical family name e.g. Solanaceae",
  "type": "annual or perennial or biennial",
  "sowIndoorsStart": month number 1-12 or null,
  "sowIndoorsEnd": month number 1-12 or null,
  "directSowStart": month number 1-12 or null,
  "directSowEnd": month number 1-12 or null,
  "transplantStart": month number 1-12 or null,
  "transplantEnd": month number 1-12 or null,
  "daysToHarvestFromSowing": number or null,
  "daysToHarvestFromTransplant": number or null,
  "harvestWindowDays": number,
  "spacingCm": number,
  "minTempC": number,
  "feedingType": "balanced or high potash or high nitrogen or ericaceous or none",
  "feedingFrequency": "weekly or fortnightly or monthly or none",
  "companions": "semicolon-separated list of companion plants e.g. Tomatoes; Basil; Carrots",
  "avoid": "semicolon-separated list of plants to avoid e.g. Fennel; Brassicas",
  "imageSearchQuery": "3-4 word Pixabay search query for a nice photo of this plant/produce"
}

Use UK-specific growing data. Month numbers: Jan=1, Dec=12. If a sowing method doesn't apply (e.g. no indoor sowing), use null for start and end.`
      }],
    });

    const textBlock = response.content.find(b => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json({ error: 'AI failed to generate plant data' }, { status: 500 });
    }

    let plantData: Record<string, unknown>;
    try {
      // Strip any markdown code fences if present
      const jsonStr = textBlock.text.replace(/```json?\s*/g, '').replace(/```\s*/g, '').trim();
      plantData = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json({ error: 'AI returned invalid JSON', raw: textBlock.text }, { status: 500 });
    }

    // Download image from Pixabay
    const searchQuery = (plantData.imageSearchQuery as string) || `${plantName} fresh`;
    const imagePath = await downloadPlantImage(plantName, searchQuery);

    // Persist to CSV + update image mappings (works in dev, gracefully skipped on read-only FS)
    let updatedPlant = null;
    try {
      const csvPath = path.join(process.cwd(), 'lib', 'plants', 'plant-database.csv');
      const csvFields = [
        plantData.name || plantName,
        plantData.family || '',
        plantData.type || 'annual',
        plantData.sowIndoorsStart ?? '',
        plantData.sowIndoorsEnd ?? '',
        plantData.directSowStart ?? '',
        plantData.directSowEnd ?? '',
        plantData.transplantStart ?? '',
        plantData.transplantEnd ?? '',
        plantData.daysToHarvestFromSowing ?? '',
        plantData.daysToHarvestFromTransplant ?? '',
        plantData.harvestWindowDays ?? '',
        plantData.spacingCm ?? '',
        plantData.minTempC ?? '',
        plantData.feedingType || 'none',
        plantData.feedingFrequency || 'none',
        plantData.companions || '',
        plantData.avoid || '',
      ].map(v => escapeCSVField(String(v === null ? '' : v)));

      fs.appendFileSync(csvPath, '\n' + csvFields.join(','));
      updatedPlant = reloadPlantDatabase().find(
        p => p.name.toLowerCase() === plantName.toLowerCase()
      );

      if (imagePath) {
        updateImageMappings(plantName, imagePath);
      }
    } catch (e) {
      console.warn('Could not persist plant to filesystem (read-only?):', e);
    }

    return NextResponse.json({
      success: true,
      plant: updatedPlant || plantData,
      imagePath,
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to create plant:', error);
    return NextResponse.json({ error: 'Failed to create plant' }, { status: 500 });
  }
}

/** Append a new entry to both image mapping files */
function updateImageMappings(plantName: string, imagePath: string) {
  try {
    // Update lib/plants/images.ts
    const imagesPath = path.join(process.cwd(), 'lib', 'plants', 'images.ts');
    let imagesContent = fs.readFileSync(imagesPath, 'utf-8');
    const insertBefore = '};\n\nexport function getPlantImage';
    const newEntry = `  '${plantName}': '${imagePath}',\n`;
    imagesContent = imagesContent.replace(insertBefore, newEntry + insertBefore);
    fs.writeFileSync(imagesPath, imagesContent);

    // Update components/ui/PlantIcon.tsx
    const iconPath = path.join(process.cwd(), 'components', 'ui', 'PlantIcon.tsx');
    let iconContent = fs.readFileSync(iconPath, 'utf-8');
    const insertBefore2 = '};\n\nexport function getPlantImageSrc';
    const newEntry2 = `  '${plantName}': '${imagePath}',\n`;
    iconContent = iconContent.replace(insertBefore2, newEntry2 + insertBefore2);
    fs.writeFileSync(iconPath, iconContent);
  } catch (e) {
    console.error('Failed to update image mappings:', e);
  }
}
