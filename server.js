import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = 3001;
const ASSETS_DIR = path.join(__dirname, 'assets');
const REGISTRY_PATH = path.join(ASSETS_DIR, 'registry.json');
const THEME_RULE_PATH = path.join(__dirname, 'THEME_RULE.md');
const INTEGRATION_RULE_PATH = path.join(__dirname, 'INTEGRATION_RULE.md');

const app = express();
app.use(express.json({ limit: '5mb' }));

/* -------------------------------------------------------------------------- */
/*  Filesystem helpers                                                        */
/* -------------------------------------------------------------------------- */

async function ensureAssetsDir() {
  await fs.mkdir(ASSETS_DIR, { recursive: true });
}

async function readRegistry() {
  await ensureAssetsDir();
  try {
    const raw = await fs.readFile(REGISTRY_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return { assets: parsed };
    if (!Array.isArray(parsed.assets)) parsed.assets = [];
    return parsed;
  } catch (err) {
    if (err.code === 'ENOENT') {
      const fresh = { assets: [] };
      await fs.writeFile(REGISTRY_PATH, JSON.stringify(fresh, null, 2), 'utf-8');
      return fresh;
    }
    throw err;
  }
}

async function writeRegistry(registry) {
  await ensureAssetsDir();
  await fs.writeFile(REGISTRY_PATH, JSON.stringify(registry, null, 2), 'utf-8');
}

// Attach raw SVG markup for each asset when the file exists on disk.
async function withSvgContent(assets) {
  return Promise.all(
    assets.map(async (asset) => {
      if (!asset.filename) return asset;
      const svgPath = path.join(ASSETS_DIR, asset.filename);
      try {
        const svg = await fs.readFile(svgPath, 'utf-8');
        return { ...asset, svg };
      } catch {
        return { ...asset, svg: null };
      }
    })
  );
}

async function readFileOrNull(p) {
  try {
    return await fs.readFile(p, 'utf-8');
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

/* -------------------------------------------------------------------------- */
/*  Integration-rule analysis                                                 */
/*                                                                            */
/*  We do NOT hardcode any domain. A rule counts as "complete" only when it   */
/*  explicitly encodes the three universal integration steps:                 */
/*    1. a destination folder for the asset file,                             */
/*    2. a registry/index file to update,                                     */
/*    3. a component/class/module to generate.                                */
/*  If any is missing, the caller must ASK the user — never assume.           */
/* -------------------------------------------------------------------------- */

function analyzeIntegrationRule(rule) {
  if (!rule || !rule.trim()) {
    return {
      complete: false,
      missing: ['destinationFolder', 'registryFile', 'component'],
      found: {},
    };
  }
  const text = rule.toLowerCase();

  // Step 1: an explicit destination path (a folder-looking token).
  const folderMatch = rule.match(/(?:^|\s)([./\w-]*\/[\w./-]*)/m);
  const hasFolder =
    /(folder|directory|destination|place|path|save to|copy to|output)/.test(
      text
    ) && !!folderMatch;

  // Step 2: an explicit registry/index/manifest file to update.
  const hasRegistry =
    /(registry|index\.\w+|manifest|barrel|catalog|register|update .*\.(js|ts|json|py|rb|go))/.test(
      text
    );

  // Step 3: an explicit component/class/module to create.
  const hasComponent =
    /(component|class|module|wrapper|generate .*\.(jsx|tsx|vue|svelte|js|ts))/.test(
      text
    );

  const missing = [];
  if (!hasFolder) missing.push('destinationFolder');
  if (!hasRegistry) missing.push('registryFile');
  if (!hasComponent) missing.push('component');

  return {
    complete: missing.length === 0,
    missing,
    found: {
      destinationFolder: hasFolder ? folderMatch?.[1]?.trim() ?? null : null,
      registryFile: hasRegistry,
      component: hasComponent,
    },
  };
}

const INTEGRATION_QUESTIONS = {
  destinationFolder:
    'Which folder should the asset file be copied into? (e.g. src/assets/icons)',
  registryFile:
    'Which registry/index file should be updated with the new entry, and in what format?',
  component:
    'Should a component/class/module be generated to load this asset? If so, where and what framework?',
};

/* -------------------------------------------------------------------------- */
/*  Code generation for integration (used only when the rule is complete)     */
/* -------------------------------------------------------------------------- */

function toPascalCase(name) {
  return (
    String(name)
      .replace(/\.[a-z0-9]+$/i, '')
      .replace(/[^a-zA-Z0-9]+/g, ' ')
      .trim()
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join('') || 'Asset'
  );
}

function buildComponentSnippet(asset, svg, analysis) {
  const pascal = toPascalCase(asset.filename || asset.name || asset.id);
  const dest = analysis.found.destinationFolder || 'src/assets';
  const inner = (svg || '<svg xmlns="http://www.w3.org/2000/svg"></svg>')
    .replace(/<\?xml[\s\S]*?\?>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .trim()
    .replace(/<svg\b/, '<svg {...props}')
    .replace(/\n/g, '\n    ');

  const component = `// ${dest}/${pascal}.jsx
import React from 'react';

// Auto-generated from ./assets/${asset.filename} by asset-master.
export default function ${pascal}(props) {
  return (
    ${inner}
  );
}
`;

  const registration = `// registry entry for ${asset.id}
{
  id: ${JSON.stringify(asset.id)},
  name: ${JSON.stringify(asset.name)},
  category: ${JSON.stringify(asset.category)},
  component: ${pascal}
}
`;

  return { componentName: pascal, destination: dest, component, registration };
}

/* -------------------------------------------------------------------------- */
/*  Routes                                                                     */
/* -------------------------------------------------------------------------- */

// GET /api/assets — serve the catalog dynamically from registry.json (+ SVG).
app.get('/api/assets', async (_req, res) => {
  try {
    const registry = await readRegistry();
    const assets = await withSvgContent(registry.assets);
    res.json({ assets });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/categories — unique categories currently present in registry.json.
app.get('/api/categories', async (_req, res) => {
  try {
    const registry = await readRegistry();
    const categories = [
      ...new Set(
        registry.assets
          .map((a) => a.category)
          .filter((c) => typeof c === 'string' && c.trim())
      ),
    ].sort((a, b) => a.localeCompare(b));
    res.json({ categories });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/assets/register — append a new asset if id/filename not present.
app.post('/api/assets/register', async (req, res) => {
  try {
    const asset = req.body || {};
    if (!asset.name || !asset.category) {
      return res.status(400).json({ error: 'name and category are required' });
    }

    const registry = await readRegistry();

    const id =
      asset.id ||
      `${String(asset.name).toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;
    const filename = asset.filename || `${id}.svg`;

    const exists = registry.assets.some(
      (a) => a.id === id || a.filename === filename
    );
    if (exists) {
      return res.status(200).json({ status: 'exists', id, filename });
    }

    const now = new Date().toISOString();
    const ext = path.extname(filename).replace('.', '') || 'svg';
    const record = {
      id,
      name: asset.name,
      filename,
      category: asset.category,
      format: asset.format || ext,
      attributes: asset.attributes || {},
      dateCreated: asset.dateCreated || now,
      dateModified: now,
    };

    if (typeof asset.svg === 'string' && asset.svg.trim()) {
      await ensureAssetsDir();
      await fs.writeFile(path.join(ASSETS_DIR, filename), asset.svg, 'utf-8');
    }

    registry.assets.push(record);
    await writeRegistry(registry);

    res.status(201).json({ status: 'created', asset: record });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/assets/:id — remove an asset from the registry and delete its
// file from disk (best-effort). Matches by id or filename.
app.delete('/api/assets/:id', async (req, res) => {
  try {
    const key = req.params.id;
    const registry = await readRegistry();
    const index = registry.assets.findIndex(
      (a) => a.id === key || a.filename === key
    );
    if (index === -1) {
      return res.status(404).json({ error: 'asset not found in registry' });
    }

    const [removed] = registry.assets.splice(index, 1);
    await writeRegistry(registry);

    if (removed.filename) {
      try {
        await fs.unlink(path.join(ASSETS_DIR, removed.filename));
      } catch (err) {
        if (err.code !== 'ENOENT') throw err;
      }
    }

    res.json({ status: 'deleted', asset: removed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/rules/theme — serve THEME_RULE.md if present. Do NOT fabricate a
// domain-specific default; the skill generates it on first /draft.
app.get('/api/rules/theme', async (_req, res) => {
  try {
    const content = await readFileOrNull(THEME_RULE_PATH);
    res.json({ exists: content !== null, content: content ?? '' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/rules/theme — persist edits from the Rule Inspector.
app.put('/api/rules/theme', async (req, res) => {
  try {
    const content = typeof req.body?.content === 'string' ? req.body.content : '';
    await fs.writeFile(THEME_RULE_PATH, content, 'utf-8');
    res.json({ status: 'saved' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/rules/integration — serve INTEGRATION_RULE.md if present, plus an
// analysis of whether it is complete enough to integrate without asking.
app.get('/api/rules/integration', async (_req, res) => {
  try {
    const content = await readFileOrNull(INTEGRATION_RULE_PATH);
    const analysis = analyzeIntegrationRule(content);
    res.json({ exists: content !== null, content: content ?? '', analysis });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/rules/integration — persist edits from the Rule Inspector.
app.put('/api/rules/integration', async (req, res) => {
  try {
    const content = typeof req.body?.content === 'string' ? req.body.content : '';
    await fs.writeFile(INTEGRATION_RULE_PATH, content, 'utf-8');
    res.json({ status: 'saved' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/assets/integrate — read INTEGRATION_RULE.md and either return the
// generated integration plan (rule complete) OR a needs-input prompt (missing,
// incomplete, or empty). Never assume.
app.post('/api/assets/integrate', async (req, res) => {
  try {
    const { id, filename } = req.body || {};
    if (!id && !filename) {
      return res.status(400).json({ error: 'id or filename is required' });
    }

    const registry = await readRegistry();
    const asset = registry.assets.find(
      (a) => a.id === id || a.filename === filename
    );
    if (!asset) {
      return res.status(404).json({ error: 'asset not found in registry' });
    }

    const rule = await readFileOrNull(INTEGRATION_RULE_PATH);
    const analysis = analyzeIntegrationRule(rule);

    if (!analysis.complete) {
      return res.json({
        status: 'needs-input',
        asset,
        ruleExists: rule !== null,
        missing: analysis.missing,
        questions: analysis.missing.map((k) => ({
          key: k,
          question: INTEGRATION_QUESTIONS[k],
        })),
        prompt:
          'How should this asset be integrated? Please specify the folder path, any registry files to update, and if a component class needs to be created.',
      });
    }

    let svg = null;
    try {
      svg = await fs.readFile(path.join(ASSETS_DIR, asset.filename), 'utf-8');
    } catch {
      /* file may not exist yet */
    }

    const plan = buildComponentSnippet(asset, svg, analysis);

    res.json({ status: 'ready', asset, rule, analysis, ...plan });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`[asset-master] API listening on http://localhost:${PORT}`);
});
