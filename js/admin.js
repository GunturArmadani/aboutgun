const STORAGE_KEY='gunturPortfolioLocalProjects';
const $=s=>document.querySelector(s);
const form=$('#project-form'), imageInput=$('#image'), preview=$('#image-preview'), empty=$('#image-empty');
let imageData='';
function getLocal(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]')}catch{return[]}}
function setLocal(v){localStorage.setItem(STORAGE_KEY,JSON.stringify(v));renderList()}
function slugify(s){return s.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')+'-'+Date.now().toString().slice(-5)}
function toast(msg){const t=document.createElement('div');t.className='admin-toast';t.textContent=msg;document.body.append(t);setTimeout(()=>t.remove(),2300)}
function renderList(){const data=getLocal(), target=$('#admin-project-list');$('#project-count').textContent=data.length;if(!data.length){target.innerHTML='<div class="admin-empty">Nothing added locally yet.<br>Your existing portfolio projects stay untouched.</div>';return}target.innerHTML=data.map((p,i)=>`<div class="admin-item">${p.thumbnail?`<img class="admin-item-thumb" src="${p.thumbnail}" alt="">`:`<span class="admin-item-thumb"><i class="fa-solid fa-code"></i></span>`}<span class="admin-item-copy"><b>${p.title}</b><small>${p.size==='small'?'Small Project':'Featured'} · ${p.status}</small></span><button data-remove="${i}" title="Remove"><i class="fa-solid fa-xmark"></i></button></div>`).join('');target.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{const d=getLocal();d.splice(+b.dataset.remove,1);setLocal(d);toast('Project removed')})}
function updateType(){const small=$('input[name=size]:checked').value==='small';$('#image-field').style.display=small?'none':'grid'}
document.querySelectorAll('input[name=size]').forEach(r=>r.addEventListener('change',updateType));
imageInput.addEventListener('change',()=>{const f=imageInput.files[0];if(!f)return;const reader=new FileReader();reader.onload=e=>{imageData=e.target.result;preview.src=imageData;preview.style.display='block';empty.style.display='none'};reader.readAsDataURL(f)});
function clearForm(){form.reset();imageData='';preview.removeAttribute('src');preview.style.display='none';empty.style.display='grid';$('#year').value=new Date().getFullYear();updateType()}
$('#reset-form').onclick=clearForm;
form.addEventListener('submit',e=>{e.preventDefault();const size=$('input[name=size]:checked').value;const title=$('#title').value.trim();if(size==='featured'&&!imageData){toast('Choose an image for a featured project');return}const project={id:slugify(title),title,description:$('#description').value.trim(),status:$('#status').value.trim()||'Experiment',year:+$('#year').value||new Date().getFullYear(),featured:size==='featured',size,technologies:[],tags:$('#tags').value.split(',').map(x=>x.trim()).filter(Boolean),thumbnail:size==='featured'?imageData:'',github:$('#github').value.trim()};const d=getLocal();d.unshift(project);setLocal(d);clearForm();toast('Added to your local portfolio')});
$('#clear-local').onclick=()=>{if(confirm('Remove all projects added through this local admin?')){localStorage.removeItem(STORAGE_KEY);renderList();toast('Local projects cleared')}};
$('#export-json').onclick=async()=>{let base=[];try{base=await fetch('data/projects.json').then(r=>r.json())}catch{}const merged=[...getLocal(),...base];const blob=new Blob([JSON.stringify(merged,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='projects.json';a.click();URL.revokeObjectURL(a.href);toast('projects.json exported')};
clearForm();renderList();
