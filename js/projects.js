const PROJECTS_URL = 'data/projects.json';
const LOCAL_PROJECTS_KEY = 'gunturPortfolioLocalProjects';

function escapeHTML(value = '') {
  return String(value).replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[char]);
}

function statusClass(status = '') {
  return status.toLowerCase() === 'completed' ? 'done' : 'progress';
}

function projectURL(id) {
  const local = (() => { try { return JSON.parse(localStorage.getItem(LOCAL_PROJECTS_KEY) || '[]'); } catch { return []; } })();
  const localProject = local.find(p => p.id === id);
  if (localProject?.github) return localProject.github;
  const pages = {
    'flappy-bird': 'flappy-bird.html',
    '2d-platformer': '2d-platformer.html'
  };
  return pages[id] || '#';
}

function renderFeaturedProject(project) {
  const tags = [...(project.tags || []), ...(project.technologies || [])]
    .map(tag => `<span>${escapeHTML(tag)}</span>`).join('');
  return `
    <a class="project-card glass reveal project-link-card" href="${projectURL(project.id)}" aria-label="Open ${escapeHTML(project.title)} project">
      ${project.thumbnail ? `<div class="project-art project-image"><img src="${escapeHTML(project.thumbnail)}" alt="Screenshot of ${escapeHTML(project.title)}"></div>` : `<div class="project-art ${escapeHTML(project.artClass || '')}"><span>${escapeHTML(project.artText || project.title)}</span></div>`}
      <div class="project-body">
        <div class="project-title"><h3>${escapeHTML(project.title)}</h3><span class="status ${statusClass(project.status)}">${escapeHTML(project.status)}</span></div>
        <p>${escapeHTML(project.description)}</p>
        <div class="tags">${tags}</div>
      </div>
    </a>`;
}

function renderSmallProjects(projects) {
  if (!projects.length) return '';
  const rows = projects.map(project => `
    <a href="${projectURL(project.id)}">
      <span><i class="fa-solid fa-code"></i><b>${escapeHTML(project.title)}</b></span>
      <small>${escapeHTML(project.status)}</small>
      <i class="fa-solid fa-arrow-right"></i>
    </a>`).join('');
  return `
    <details class="mini-projects glass reveal">
      <summary>
        <span class="mini-icon"><i class="fa-solid fa-list"></i></span>
        <span class="mini-summary-copy"><b>Small Projects</b><small>Smaller experiments and things that don't need a screenshot.</small></span>
        <i class="fa-solid fa-chevron-down chevron"></i>
      </summary>
      <div class="mini-list">${rows}</div>
    </details>`;
}

async function loadProjects() {
  const response = await fetch(PROJECTS_URL);
  if (!response.ok) throw new Error(`Could not load projects (${response.status})`);
  const base = await response.json();
  let local = [];
  try { local = JSON.parse(localStorage.getItem(LOCAL_PROJECTS_KEY) || '[]'); } catch {}
  return [...local, ...base];
}

async function renderHomeProjects() {
  const target = document.getElementById('project-grid');
  if (!target) return;
  try {
    const projects = await loadProjects();
    const featured = projects.filter(p => p.featured && p.size !== 'small');
    const small = projects.filter(p => p.size === 'small');
    target.innerHTML = featured.map(renderFeaturedProject).join('') + renderSmallProjects(small);
    window.refreshReveal?.();
  } catch (error) {
    target.innerHTML = `<div class="project-load-error glass"><b>Projects couldn't load.</b><span>Run the site through Live Server or another local web server.</span></div>`;
    console.error(error);
  }
}

async function renderProjectsArchive() {
  const target = document.getElementById('projects-archive');
  if (!target) return;
  try {
    const projects = await loadProjects();
    const featured = projects.filter(p => p.size !== 'small');
    const small = projects.filter(p => p.size === 'small');
    target.innerHTML = `
      <div class="archive-featured">${featured.map(renderFeaturedProject).join('')}</div>
      ${small.length ? `<section class="archive-small glass reveal"><span class="section-label"><i class="fa-solid fa-list"></i> Small Projects</span><div class="archive-small-list">${small.map(p => `<div class="archive-small-item"><span><b>${escapeHTML(p.title)}</b><small>${escapeHTML(p.description)}</small></span><span class="archive-type">${escapeHTML(p.status)}</span></div>`).join('')}</div></section>` : ''}`;
    window.refreshReveal?.();
  } catch (error) {
    target.innerHTML = `<div class="project-load-error glass"><b>Projects couldn't load.</b><span>Run the site through Live Server or another local web server.</span></div>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderHomeProjects();
  renderProjectsArchive();
});
