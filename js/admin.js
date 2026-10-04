const WORKER_URL = 'https://aboutgun-admin.diantarapepohonanhutanmati.workers.dev/';
const $ = s => document.querySelector(s);
const loginScreen = $('#login-screen');
const publisherScreen = $('#publisher-screen');
const loginForm = $('#login-form');
const form = $('#project-form');
const imageInput = $('#image');
const preview = $('#image-preview');
const empty = $('#image-empty');
const publishButton = $('.admin-publish[type="submit"]');
const statusBox = $('#publish-status');
let adminKey = '';
let imageData = '';

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'admin-toast';
  t.textContent = msg;
  document.body.append(t);
  setTimeout(() => t.remove(), 2600);
}
function setStatus(message, state = '') {
  statusBox.textContent = message;
  statusBox.className = `publish-status ${state}`.trim();
}
function showPublisher() {
  loginScreen.hidden = true;
  publisherScreen.hidden = false;
  $('#year').value = new Date().getFullYear();
  updateType();
}
function lockAdmin() {
  adminKey = '';
  imageData = '';
  loginForm.reset();
  form.reset();
  preview.removeAttribute('src');
  preview.style.display = 'none';
  empty.style.display = 'grid';
  publisherScreen.hidden = true;
  loginScreen.hidden = false;
  $('#login-key').focus();
}
loginForm.addEventListener('submit', async e => {
  e.preventDefault();
  const keyInput = $('#login-key');
  const key = keyInput.value.trim();
  if (!key) return;

  const button = loginForm.querySelector('button[type="submit"]');
  button.disabled = true;
  button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Checking...';

  try {
    const response = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Key': key },
      body: JSON.stringify({ action: 'verify-key' })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) throw new Error(result.error || `Verification failed (${response.status})`);

    adminKey = key;
    keyInput.value = '';
    showPublisher();
    toast('Admin unlocked');
  } catch (error) {
    console.error(error);
    adminKey = '';
    keyInput.select();
    toast(/wrong admin key|unauthorized/i.test(error.message) ? 'Wrong Admin Key' : error.message);
  } finally {
    button.disabled = false;
    button.innerHTML = '<i class="fa-solid fa-arrow-right-to-bracket"></i> Continue';
  }
});
$('#lock-admin').addEventListener('click', lockAdmin);

function updateType() {
  const selected = $('input[name=size]:checked');
  if (!selected) return;
  const small = selected.value === 'small';
  $('#image-field').style.display = small ? 'none' : 'grid';
}
document.querySelectorAll('input[name=size]').forEach(r => r.addEventListener('change', updateType));

imageInput.addEventListener('change', () => {
  const file = imageInput.files[0];
  if (!file) return;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    imageInput.value = ''; imageData = ''; toast('Use JPG, PNG, or WebP'); return;
  }
  if (file.size > 4 * 1024 * 1024) {
    imageInput.value = ''; imageData = ''; toast('Image must be 4 MB or smaller'); return;
  }
  const reader = new FileReader();
  reader.onload = e => { imageData = e.target.result; preview.src = imageData; preview.style.display = 'block'; empty.style.display = 'none'; };
  reader.readAsDataURL(file);
});

function clearProjectFields() {
  form.reset(); imageData = '';
  preview.removeAttribute('src'); preview.style.display = 'none'; empty.style.display = 'grid';
  $('#year').value = new Date().getFullYear(); updateType();
}
$('#reset-form').onclick = clearProjectFields;

form.addEventListener('submit', async e => {
  e.preventDefault();
  if (!adminKey) { lockAdmin(); return; }
  const size = $('input[name=size]:checked').value;
  const title = $('#title').value.trim();
  if (size === 'featured' && !imageData) { toast('Choose an image for a featured project'); return; }
  const project = {
    title,
    description: $('#description').value.trim(),
    status: $('#status').value.trim() || 'Experiment',
    year: +$('#year').value || new Date().getFullYear(),
    size,
    tags: $('#tags').value.split(',').map(x => x.trim()).filter(Boolean),
    github: $('#github').value.trim(),
    image: size === 'featured' ? imageData : '',
    imageType: size === 'featured' && imageInput.files[0] ? imageInput.files[0].type : ''
  };
  publishButton.disabled = true;
  publishButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Publishing...';
  setStatus('Publishing to GitHub…', 'working');
  try {
    const response = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
      body: JSON.stringify({ action: 'publish-project', project })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) throw new Error(result.error || `Publish failed (${response.status})`);
    setStatus(`${title} published. GitHub Pages may need a short moment to update.`, 'success');
    toast('Published to portfolio'); clearProjectFields();
  } catch (error) {
    console.error(error);
    if (/wrong admin key|unauthorized/i.test(error.message)) {
      setStatus('Wrong Admin Key. Admin locked.', 'error');
      toast('Wrong Admin Key');
      setTimeout(lockAdmin, 900);
    } else {
      setStatus(error.message, 'error'); toast('Publish failed');
    }
  } finally {
    publishButton.disabled = false;
    publishButton.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Publish to Portfolio';
  }
});
