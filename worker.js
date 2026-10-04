const OWNER = 'GunturArmadani';
const REPO = 'aboutgun';
const BRANCH = 'main';
const ALLOWED_ORIGIN = 'https://gunturarmadani.github.io';

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': origin === ALLOWED_ORIGIN ? ALLOWED_ORIGIN : ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
      'Vary': 'Origin'
    };

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return json({ success: false, error: 'Method not allowed' }, 405, cors);
    if (origin && origin !== ALLOWED_ORIGIN) return json({ success: false, error: 'Origin not allowed' }, 403, cors);
    if (!env.GITHUB_TOKEN || !env.ADMIN_KEY) return json({ success: false, error: 'Worker secrets are not configured' }, 500, cors);
    if (request.headers.get('X-Admin-Key') !== env.ADMIN_KEY) return json({ success: false, error: 'Wrong Admin Key' }, 401, cors);

    try {
      const body = await request.json();
      if (body.action !== 'publish-project') return json({ success: false, error: 'Unknown action' }, 400, cors);
      const p = body.project || {};
      const title = clean(p.title, 100);
      const description = clean(p.description, 500);
      const size = p.size;
      if (!title || !description || !['featured', 'small'].includes(size)) return json({ success: false, error: 'Project data is incomplete' }, 400, cors);
      if (size === 'featured' && !p.image) return json({ success: false, error: 'Featured projects need an image' }, 400, cors);

      const dataPath = 'data/projects.json';
      const current = await gh(`/repos/${OWNER}/${REPO}/contents/${dataPath}?ref=${BRANCH}`, env);
      if (!current.ok) throw new Error(`Could not read projects.json (${current.status})`);
      const file = await current.json();
      const projects = JSON.parse(base64ToUtf8(file.content.replace(/\n/g, '')));
      if (!Array.isArray(projects)) throw new Error('projects.json is not an array');

      let slug = slugify(title);
      if (!slug) throw new Error('Project name cannot create a valid slug');
      if (projects.some(x => x.id === slug)) slug = `${slug}-${Date.now().toString().slice(-5)}`;

      const project = {
        id: slug,
        title,
        description,
        status: clean(p.status, 60) || 'Experiment',
        year: Number.isInteger(p.year) && p.year >= 2000 && p.year <= 2100 ? p.year : new Date().getFullYear(),
        featured: size === 'featured',
        size,
        technologies: [],
        tags: Array.isArray(p.tags) ? p.tags.slice(0, 12).map(x => clean(x, 40)).filter(Boolean) : []
      };
      const github = clean(p.github, 300);
      if (github) project.github = github;

      if (size === 'featured') {
        const ext = imageExtension(p.imageType);
        const imagePath = `assets/projects/${slug}/cover.${ext}`;
        const image64 = String(p.image).includes(',') ? String(p.image).split(',')[1] : String(p.image);
        if (image64.length > 6_000_000) return json({ success: false, error: 'Image is too large' }, 413, cors);
        const imageUpload = await gh(`/repos/${OWNER}/${REPO}/contents/${imagePath}`, env, {
          method: 'PUT',
          body: JSON.stringify({ message: `Add image for ${title}`, content: image64, branch: BRANCH })
        });
        if (!imageUpload.ok) throw new Error(`Image upload failed (${imageUpload.status})`);
        project.thumbnail = imagePath;
      }

      projects.unshift(project);
      const update = await gh(`/repos/${OWNER}/${REPO}/contents/${dataPath}`, env, {
        method: 'PUT',
        body: JSON.stringify({
          message: `Add project: ${title}`,
          content: utf8ToBase64(JSON.stringify(projects, null, 2) + '\n'),
          sha: file.sha,
          branch: BRANCH
        })
      });
      if (!update.ok) {
        const detail = await update.text();
        throw new Error(`projects.json update failed (${update.status}): ${detail.slice(0, 180)}`);
      }
      return json({ success: true, id: slug, message: `${title} published` }, 200, cors);
    } catch (error) {
      console.error(error);
      return json({ success: false, error: error.message || 'Unexpected error' }, 500, cors);
    }
  }
};

function clean(value, max) { return String(value || '').trim().slice(0, max); }
function slugify(value) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
function imageExtension(type = '') { if (type === 'image/png') return 'png'; if (type === 'image/webp') return 'webp'; return 'jpg'; }
function json(data, status, headers) { return new Response(JSON.stringify(data), { status, headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' } }); }
async function gh(path, env, options = {}) {
  return fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'aboutgun-admin-worker',
      ...(options.headers || {})
    }
  });
}
function utf8ToBase64(text) { const bytes = new TextEncoder().encode(text); let binary = ''; for (const b of bytes) binary += String.fromCharCode(b); return btoa(binary); }
function base64ToUtf8(value) { const binary = atob(value); const bytes = Uint8Array.from(binary, c => c.charCodeAt(0)); return new TextDecoder().decode(bytes); }
