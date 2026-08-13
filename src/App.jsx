import React, { useEffect, useMemo, useState, useCallback } from 'react';
import './App.css';

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

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  }
}

/* --------------------------------- SVG preview --------------------------- */
function SvgPreview({ svg }) {
  if (!svg) {
    return <div className="preview-missing">asset file missing on disk</div>;
  }
  return (
    <div className="preview">
      <div className="grid-bg" />
      <div className="preview-svg" dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  );
}

/* --------------------------------- Toast --------------------------------- */
function Toast({ message }) {
  if (!message) return null;
  return <div className="toast">{message}</div>;
}

/* --------------------------------- Asset card ---------------------------- */
function AssetCard({ asset, onIntegrate, onDelete, onToast }) {
  const date = asset.dateCreated
    ? new Date(asset.dateCreated).toLocaleDateString()
    : '—';
  const dims = asset.attributes?.dimensions || '—';
  const format = (asset.format || 'svg').toUpperCase();

  const handleCopySvg = async () => {
    const ok = await copyText(asset.svg || '');
    onToast(ok ? 'Raw SVG copied' : 'Copy failed');
  };

  return (
    <article className="card">
      <SvgPreview svg={asset.svg} />
      <div className="card-body">
        <h3 className="card-title">{asset.name}</h3>
        <div className="badges">
          <span className="badge badge-cat">{asset.category}</span>
          <span className="badge">{date}</span>
          <span className="badge">{dims}</span>
          <span className="badge">{format}</span>
        </div>
        <div className="card-actions">
          <button className="btn" onClick={handleCopySvg}>
            Copy Raw SVG
          </button>
          <button className="btn btn-accent" onClick={() => onIntegrate(asset)}>
            ⚡ Integrate into Project
          </button>
          <button className="btn btn-danger" onClick={() => onDelete(asset)}>
            🗑 Delete
          </button>
        </div>
      </div>
    </article>
  );
}

/* ------------------------- Integration modal ----------------------------- */
function IntegrationModal({ asset, onClose, onToast }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  // Local answers for the needs-input fallback path.
  const [answers, setAnswers] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    fetch('/api/assets/integrate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: asset.id, filename: asset.filename }),
    })
      .then((r) => (r.ok ? r.json() : r.json().then((e) => Promise.reject(e))))
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e.error || 'Integration failed'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [asset]);

  // Persist the user's answers into INTEGRATION_RULE.md so future runs are seamless.
  const saveAsRule = async () => {
    setSaving(true);
    const lines = (data.questions || []).map(
      (q) => `- **${q.key}**: ${answers[q.key]?.trim() || '(unspecified)'}`
    );
    const md = `# INTEGRATION_RULE.md

Integration workflow for this project (captured from user input by asset-master).

## Steps
1. **Destination folder** — copy the asset file into the folder below.
2. **Registry update** — update the named registry/index file with the new entry.
3. **Component** — generate a component/class to load the asset if required.

## Project answers
${lines.join('\n')}
`;
    try {
      const r = await fetch('/api/rules/integration', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: md }),
      });
      onToast(r.ok ? 'INTEGRATION_RULE.md saved' : 'Save failed');
      if (r.ok) onClose();
    } catch {
      onToast('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const needsInput = data && data.status === 'needs-input';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h2>⚡ Integrate — {asset.name}</h2>
          <button className="icon-btn" onClick={onClose}>
            ✕
          </button>
        </header>

        {loading && <p className="muted">Reading INTEGRATION_RULE.md…</p>}
        {error && <p className="error">{error}</p>}

        {needsInput && (
          <div className="modal-body">
            <div className="notice">
              {data.ruleExists
                ? 'INTEGRATION_RULE.md is incomplete.'
                : 'No INTEGRATION_RULE.md found.'}{' '}
              {data.prompt}
            </div>
            {data.questions.map((q) => (
              <label key={q.key} className="field">
                <span className="field-label">{q.question}</span>
                <input
                  className="field-input"
                  value={answers[q.key] || ''}
                  onChange={(e) =>
                    setAnswers((a) => ({ ...a, [q.key]: e.target.value }))
                  }
                  placeholder="Your answer…"
                />
              </label>
            ))}
            <div className="modal-actions">
              <button
                className="btn btn-accent"
                disabled={saving}
                onClick={saveAsRule}
              >
                {saving ? 'Saving…' : 'Save as INTEGRATION_RULE.md'}
              </button>
              <button className="btn" onClick={onClose}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {data && data.status === 'ready' && (
          <div className="modal-body">
            <p className="muted">
              Destination: <code>{data.destination}</code> · Component:{' '}
              <code>{data.componentName}</code>
            </p>

            <div className="code-block">
              <div className="code-head">
                <span>{data.destination}/{data.componentName}.jsx</span>
                <button
                  className="btn btn-sm"
                  onClick={async () =>
                    onToast(
                      (await copyText(data.component))
                        ? 'Component copied'
                        : 'Copy failed'
                    )
                  }
                >
                  Copy
                </button>
              </div>
              <pre>{data.component}</pre>
            </div>

            <div className="code-block">
              <div className="code-head">
                <span>registry entry</span>
                <button
                  className="btn btn-sm"
                  onClick={async () =>
                    onToast(
                      (await copyText(data.registration))
                        ? 'Registration copied'
                        : 'Copy failed'
                    )
                  }
                >
                  Copy
                </button>
              </div>
              <pre>{data.registration}</pre>
            </div>

            <details className="rule-details">
              <summary>INTEGRATION_RULE.md (source)</summary>
              <pre className="rule-src">{data.rule}</pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}

/* --------------------------- Rule inspector ------------------------------ */
function RuleInspector({ onClose, onToast }) {
  const [tab, setTab] = useState('theme');
  const [theme, setTheme] = useState('');
  const [integration, setIntegration] = useState('');
  const [meta, setMeta] = useState({ theme: true, integration: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/rules/theme').then((r) => r.json()),
      fetch('/api/rules/integration').then((r) => r.json()),
    ])
      .then(([t, i]) => {
        setTheme(t.content || '');
        setIntegration(i.content || '');
        setMeta({ theme: t.exists, integration: i.exists });
      })
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    const endpoint =
      tab === 'theme' ? '/api/rules/theme' : '/api/rules/integration';
    const content = tab === 'theme' ? theme : integration;
    try {
      const r = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      onToast(r.ok ? 'Rule saved' : 'Save failed');
    } catch {
      onToast('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const isTheme = tab === 'theme';
  const exists = isTheme ? meta.theme : meta.integration;

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()}>
        <header className="drawer-head">
          <h2>Rule Inspector</h2>
          <button className="icon-btn" onClick={onClose}>
            ✕
          </button>
        </header>

        <div className="tabs">
          <button
            className={`tab ${isTheme ? 'active' : ''}`}
            onClick={() => setTab('theme')}
          >
            THEME_RULE.md
          </button>
          <button
            className={`tab ${!isTheme ? 'active' : ''}`}
            onClick={() => setTab('integration')}
          >
            INTEGRATION_RULE.md
          </button>
        </div>

        {loading ? (
          <p className="muted">Loading rules…</p>
        ) : (
          <>
            {!exists && (
              <div className="notice">
                Not generated yet. asset-master creates this from your project on
                the first <code>/draft</code>, or you can author it here.
              </div>
            )}
            <textarea
              className="rule-editor"
              value={isTheme ? theme : integration}
              onChange={(e) =>
                isTheme ? setTheme(e.target.value) : setIntegration(e.target.value)
              }
              spellCheck={false}
              placeholder="# Rule not generated yet…"
            />
            <div className="drawer-actions">
              <button className="btn btn-accent" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

/* ---------------------------------- App ---------------------------------- */
export default function App() {
  const [assets, setAssets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [integrateAsset, setIntegrateAsset] = useState(null);
  const [showRules, setShowRules] = useState(false);
  const [toast, setToast] = useState('');

  const pushToast = useCallback((msg) => {
    setToast(msg);
    window.clearTimeout(pushToast._t);
    pushToast._t = window.setTimeout(() => setToast(''), 2200);
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/assets').then((r) =>
        r.ok ? r.json() : Promise.reject(new Error('API error'))
      ),
      fetch('/api/categories').then((r) => (r.ok ? r.json() : { categories: [] })),
    ])
      .then(([a, c]) => {
        setAssets(a.assets || []);
        setCategories(c.categories || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const handleDelete = useCallback(
    async (asset) => {
      if (!window.confirm(`Delete "${asset.name}"? This cannot be undone.`)) {
        return;
      }
      try {
        const r = await fetch(`/api/assets/${encodeURIComponent(asset.id)}`, {
          method: 'DELETE',
        });
        if (!r.ok) {
          const e = await r.json().catch(() => ({}));
          throw new Error(e.error || 'Delete failed');
        }
        setAssets((prev) => prev.filter((a) => a.id !== asset.id));
        pushToast('Asset deleted');
      } catch (e) {
        pushToast(e.message || 'Delete failed');
      }
    },
    [pushToast]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assets.filter((a) => {
      const matchCat = category === 'All' || a.category === category;
      const tags = (a.attributes?.tags || []).join(' ').toLowerCase();
      const matchQ =
        !q ||
        a.name.toLowerCase().includes(q) ||
        String(a.category).toLowerCase().includes(q) ||
        tags.includes(q);
      return matchCat && matchQ;
    });
  }, [assets, query, category]);

  const chips = ['All', ...categories];

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">◆</span>
          <div>
            <h1>asset-master</h1>
            <p className="sub">
              Universal asset studio · {assets.length} assets ·{' '}
              {categories.length} categories
            </p>
          </div>
        </div>
        <button className="btn btn-outline" onClick={() => setShowRules(true)}>
          Rule Inspector
        </button>
      </header>

      <div className="controls">
        <input
          className="search"
          placeholder="Search assets, categories, tags…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="filters">
          {chips.map((c) => (
            <button
              key={c}
              className={`chip ${category === c ? 'active' : ''}`}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {loading && <p className="muted center">Loading registry…</p>}
      {error && (
        <p className="error center">
          {error} — is the API running on :3001? (`npm start`)
        </p>
      )}
      {!loading && !error && filtered.length === 0 && (
        <p className="muted center">No assets match.</p>
      )}

      <main className="grid">
        {filtered.map((a) => (
          <AssetCard
            key={a.id}
            asset={a}
            onIntegrate={setIntegrateAsset}
            onDelete={handleDelete}
            onToast={pushToast}
          />
        ))}
      </main>

      {integrateAsset && (
        <IntegrationModal
          asset={integrateAsset}
          onClose={() => setIntegrateAsset(null)}
          onToast={pushToast}
        />
      )}
      {showRules && (
        <RuleInspector onClose={() => setShowRules(false)} onToast={pushToast} />
      )}
      <Toast message={toast} />
    </div>
  );
}
