/* RISE Orientation editor. Loads only on the ?edit link.
   Words: click and type. Pictures: click to swap or make a QR code.
   Schedule and big events: their own controls. Publish writes index.html back to GitHub. */
(()=>{
window.EDITOR=true;
const REPO={owner:'dwightrfm',repo:'rise-orientation',branch:'main'};
const LOCAL=/^(localhost|127\.0\.0\.1)$/.test(location.hostname);
const API=(LOCAL&&new URLSearchParams(location.search).get('api'))||'https://api.github.com';
const KEY='rise_edit_key';
const DAYS=['SUN','MON','TUE','WED','THU','FRI','SAT'];
const KINDS=[['','Core'],['trainer',"Trainer's"],['pz','Phone Zone']];
const TZS=[['America/Los_Angeles','Pacific'],['America/Denver','Mountain'],['America/Chicago','Central'],['America/New_York','Eastern']];
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];

/* ---------- styles ---------- */
const css=document.createElement('style');css.textContent=`
#ebar{position:fixed;left:0;right:0;top:0;height:56px;z-index:1000;display:flex;align-items:center;gap:10px;padding:0 14px;background:rgba(6,14,18,.92);backdrop-filter:blur(12px);border-bottom:1px solid rgba(255,255,255,.12);font:500 14px/1.2 -apple-system,BlinkMacSystemFont,"Inter",sans-serif;color:#eef6f7}
#ebar .tag{display:flex;align-items:center;gap:8px;font-weight:700;color:#ffc46b;white-space:nowrap}
#ebar .tag i{width:9px;height:9px;border-radius:50%;background:#ffc46b;box-shadow:0 0 10px #ffc46b}
#ebar .hint{color:rgba(238,246,247,.62);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#ebar button,.emod button{font:600 14px/1 -apple-system,BlinkMacSystemFont,"Inter",sans-serif;border:0;border-radius:10px;padding:10px 14px;cursor:pointer;background:rgba(255,255,255,.1);color:#eef6f7;white-space:nowrap}
#ebar button:hover,.emod button:hover{background:rgba(255,255,255,.18)}
#ebar .nav{display:flex;align-items:center;gap:4px}
#ebar .nav span{min-width:62px;text-align:center;font-variant-numeric:tabular-nums}
#ebar #epub,.emod .go{background:#46d9d2;color:#032326}
#ebar #epub:hover,.emod .go:hover{background:#6ae6e0}
#ebar #epub[disabled]{background:rgba(255,255,255,.1);color:rgba(238,246,247,.4);cursor:default}
body.editing [data-img],body.editing .qr{outline:3px dashed rgba(255,196,107,.85);outline-offset:4px;cursor:pointer}
body.editing .qr [data-img]{outline:0}
body.editing [data-e]:empty::before{content:"(empty)";opacity:.4}
.ed-ctl{display:none;flex-wrap:wrap;gap:6px;position:absolute;left:-6px;right:-6px;top:calc(100% - 6px);z-index:50;padding:10px;border-radius:14px;background:rgba(6,14,18,.96);box-shadow:0 14px 40px rgba(0,0,0,.6),inset 0 0 0 1px rgba(255,196,107,.5)}
body.editing .s-sch .ses{overflow:visible}.s-sch .ses:hover,.s-sch .ses:focus-within{z-index:40}.s-sch .ses:hover .ed-ctl,.s-sch .ses:focus-within .ed-ctl{display:flex}
.ed-ctl::before{content:"Day, start time (Pacific), color";width:100%;font:600 12px -apple-system,sans-serif;color:#ffc46b}
.ed-ctl select,.ed-ctl input{font:600 16px -apple-system,sans-serif;background:rgba(0,0,0,.45);color:#fff;border:1px solid rgba(255,255,255,.25);border-radius:8px;padding:4px 6px}
.ed-ctl .x{font:700 14px sans-serif;background:rgba(232,51,42,.8);color:#fff;border:0;border-radius:8px;padding:4px 9px;cursor:pointer}
.ed-add{font:600 15px -apple-system,sans-serif;background:rgba(70,217,210,.18);color:#bff5f1;border:1px dashed rgba(70,217,210,.6);border-radius:14px;padding:10px;cursor:pointer;margin-top:auto}
.eveil{position:fixed;inset:0;z-index:1100;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:16px}
.emod{background:#0b1a20;color:#eef6f7;border:1px solid rgba(255,255,255,.14);border-radius:18px;padding:24px;width:min(560px,100%);max-height:calc(100vh - 32px);overflow:auto;font:15px/1.5 -apple-system,BlinkMacSystemFont,"Inter",sans-serif;box-shadow:0 30px 80px rgba(0,0,0,.6)}
.emod h3{margin:0 0 8px;font-size:20px}
.emod p{margin:0 0 14px;color:rgba(238,246,247,.75)}
.emod label{display:block;font-size:13px;font-weight:600;color:rgba(238,246,247,.7);margin:10px 0 4px}
.emod input,.emod select{width:100%;font:15px -apple-system,sans-serif;background:rgba(255,255,255,.06);color:#fff;border:1px solid rgba(255,255,255,.2);border-radius:10px;padding:10px}
.emod .row{display:flex;gap:10px;justify-content:flex-end;margin-top:18px;flex-wrap:wrap}
.emod .ev{border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:4px 14px 14px;margin-bottom:12px}
.emod .two{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.emod .err{color:#ff8a7a;font-weight:600}
.emod ol{padding-left:20px;margin:0 0 10px}.emod li{margin:4px 0}
.emod a{color:#46d9d2}
`;document.head.appendChild(css);

/* ---------- state ---------- */
const orig=new Map(),imgs=new Map();let schedDirty=false,evDirty=false,lastPut=null;
const revOf=html=>(html.match(/<meta name="rev" content="(\d+)"/)||[])[1]||'0';
let myRev=($('meta[name=rev]')||{content:'0'}).content;
const val=el=>el.hasAttribute('data-count')?(el.dataset.prefix||'')+el.dataset.count+(el.dataset.suffix||''):(el.classList.contains('split')&&!editing&&el.dataset.src!=null?el.dataset.src:el.innerHTML);
function capture(){orig.clear();$$('[data-e]').forEach(el=>orig.set(el.dataset.e,val(el)))}
function changes(){let n=0;$$('[data-e]').forEach(el=>{if(orig.get(el.dataset.e)!==val(el))n++});return n+imgs.size+(schedDirty?1:0)+(evDirty?1:0)}
function refresh(){const n=changes(),b=$('#epub');b.disabled=!n;b.textContent=n?`Publish (${n})`:'Publish';$('#enum').textContent=`${idx+1} / ${N}`}

/* ---------- bar ---------- */
const bar=document.createElement('div');bar.id='ebar';bar.innerHTML=`
<div class="tag"><i></i>Editing</div>
<div class="hint">Click any words to change them. Click a picture to swap it.</div>
<div class="nav"><button id="eprev" title="Back">‹</button><span id="enum"></span><button id="enext" title="Next">›</button></div>
<button id="eall">All slides</button><button id="eevents">Big events</button><button id="eview">Preview</button><button id="ehelp">Help</button><button id="epub" disabled>Publish</button>`;
document.body.appendChild(bar);window.EDITBAR=56;fit();
$('#eprev').onclick=()=>{prev();refresh()};$('#enext').onclick=()=>{next();refresh()};
$('#eall').onclick=()=>toggleOverview();
const baseGo=go;window.go=n=>{baseGo(n);refresh()};
const baseToggle=toggleEdit;window.toggleEdit=function(){baseToggle();$('#eview').textContent=editing?'Preview':'Keep editing';sched(editing);if(editing)fillCounts();refresh()};
$('#eview').onclick=()=>toggleEdit();
$('#eevents').onclick=eventsPanel;$('#ehelp').onclick=helpPanel;$('#epub').onclick=publish;
addEventListener('keyup',()=>setTimeout(refresh));addEventListener('click',()=>setTimeout(refresh));
addEventListener('input',e=>{const el=e.target.closest&&e.target.closest('[data-count]');if(el)setCount(el,el.textContent);refresh()});
const warn=e=>{if(changes()){e.preventDefault();e.returnValue=''}};addEventListener('beforeunload',warn);

/* typing: plain text only, Enter makes a line break */
document.addEventListener('paste',e=>{if(e.target.closest&&e.target.closest('[contenteditable]')){e.preventDefault();document.execCommand('insertText',false,e.clipboardData.getData('text/plain'))}});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&document.activeElement&&document.activeElement.isContentEditable){e.preventDefault();document.execCommand(document.activeElement.hasAttribute('data-count')?'insertText':'insertLineBreak',false,'')}},true);

/* counters: show the real number while editing, read it back as prefix + number + suffix */
function fillCounts(){$$('[data-count]').forEach(el=>el.textContent=(el.dataset.prefix||'')+el.dataset.count+(el.dataset.suffix||''))}
function setCount(el,t){const m=t.trim().match(/^(\D*?)(\d+(?:\.\d+)?)(.*)$/);if(!m)return;el.dataset.count=m[2];if(m[1])el.dataset.prefix=m[1];else delete el.dataset.prefix;el.dataset.suffix=m[3]}

/* ---------- modal helper ---------- */
function modal(html){const v=document.createElement('div');v.className='eveil';v.innerHTML=`<div class="emod">${html}</div>`;document.body.appendChild(v);
  const close=()=>v.remove();v.addEventListener('click',e=>{if(e.target===v)close()});v.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape')close()});return{el:v.firstChild,close}}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------- pictures ---------- */
stage.addEventListener('click',e=>{if(!editing||overview)return;const qr=e.target.closest('.qr');const host=(qr&&qr.querySelector('[data-img]'))||e.target.closest('[data-img]');if(!host)return;e.preventDefault();e.stopPropagation();picMenu(host,!!qr)},true);
function picMenu(el,isQR){const m=modal(`<h3>Change this picture</h3>
  <p>${isQR?'Make a new QR code from a link, or upload a picture.':'Pick a new picture from your computer. It replaces this one in the same spot.'}</p>
  ${isQR?`<label>Link the QR code should open</label><input id="qurl" placeholder="https://..."><div class="row" style="justify-content:flex-start;margin-top:10px"><button class="go" id="qmake">Make QR code</button></div><p id="qerr" class="err"></p><label>Or</label>`:''}
  <div class="row" style="justify-content:flex-start;margin-top:6px"><button id="pup">Upload a picture</button><button id="pcancel">Cancel</button></div>`);
  const fi=document.createElement('input');fi.type='file';fi.accept='image/*';
  m.el.querySelector('#pup').onclick=()=>fi.click();m.el.querySelector('#pcancel').onclick=m.close;
  fi.onchange=async()=>{if(!fi.files[0])return;try{setPic(el,await shrink(fi.files[0],isQR));m.close()}catch(err){alert('That file could not be opened as a picture.')}};
  if(isQR){const go=async()=>{const u=m.el.querySelector('#qurl').value.trim();if(!/^https?:\/\/\S+\.\S+/.test(u)){m.el.querySelector('#qerr').textContent='Paste the full link, starting with https://';return}
      try{setPic(el,await makeQR(u));m.close();toast('New QR code in place. Scan it with your phone to test it.')}catch(err){m.el.querySelector('#qerr').textContent='Could not make the QR code. Check your internet and try again.'}};
    m.el.querySelector('#qmake').onclick=go;m.el.querySelector('#qurl').addEventListener('keydown',e=>{if(e.key==='Enter')go()});setTimeout(()=>m.el.querySelector('#qurl').focus(),30)}}
async function shrink(file,png){const bmp=await createImageBitmap(file);const k=Math.min(1,1600/Math.max(bmp.width,bmp.height));const c=document.createElement('canvas');c.width=Math.round(bmp.width*k);c.height=Math.round(bmp.height*k);c.getContext('2d').drawImage(bmp,0,0,c.width,c.height);
  let b=png?null:await new Promise(r=>c.toBlob(r,'image/webp',.88));if(!b||b.type!=='image/webp')b=await new Promise(r=>c.toBlob(r,'image/png'));return b}
function loadQRLib(){return window.qrcode?Promise.resolve():new Promise((ok,no)=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js';s.onload=ok;s.onerror=no;document.head.appendChild(s)})}
async function makeQR(url){await loadQRLib();const q=qrcode(0,'M');q.addData(url);q.make();const n=q.getModuleCount(),cell=16,pad=2,c=document.createElement('canvas');c.width=c.height=(n+pad*2)*cell;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.fillStyle='#000';
  for(let r=0;r<n;r++)for(let col=0;col<n;col++)if(q.isDark(r,col))x.fillRect((col+pad)*cell,(r+pad)*cell,cell,cell);return new Promise(r=>c.toBlob(r,'image/png'))}
function picPath(el){const cur=el.tagName==='IMG'?el.getAttribute('src'):(el.style.backgroundImage.match(/url\(["']?([^"')]+)/)||[])[1]||'';return (cur.split('/').pop().replace(/\.\w+$/,'').replace(/-[a-z0-9]{6,}$/,'')||'pic')}
function setPic(el,blob){const ext=blob.type==='image/webp'?'webp':'png';const p={path:`assets/${picPath(el)}-${Date.now().toString(36)}.${ext}`,blob};imgs.set(el.dataset.img,p);
  const u=URL.createObjectURL(blob);if(el.tagName==='IMG')el.src=u;else el.style.backgroundImage=`url(${u})`;refresh()}

/* ---------- weekly schedule ---------- */
const week=$('.s-sch .week');
function fmt12(h,m){const ap=h<12?'am':'pm',hh=h%12||12;return hh+(m?':'+String(m).padStart(2,'0'):'')+ap}
function sesCtl(ses){const[d,h,m]=ses.dataset.s.split(',').map(Number);const kind=ses.classList.contains('trainer')?'trainer':ses.classList.contains('pz')?'pz':'';
  const c=document.createElement('div');c.className='ed-ctl';c.innerHTML=`<select class="d">${DAYS.map((n,i)=>`<option value="${i}"${i===d?' selected':''}>${n}</option>`).join('')}</select><input class="tm2" type="time" value="${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}" title="Start time, Pacific"><select class="kd">${KINDS.map(([v,n])=>`<option value="${v}"${v===kind?' selected':''}>${n}</option>`).join('')}</select><button class="x" title="Remove this session">✕</button>`;
  c.addEventListener('click',e=>e.stopPropagation());c.addEventListener('keydown',e=>e.stopPropagation());
  c.querySelector('.d').onchange=e=>{const day=$(`.day[data-dow="${e.target.value}"]`,week);const add=$('.ed-add',day);day.insertBefore(ses,add);setS(ses);dense();dirtyS()};
  c.querySelector('.tm2').onchange=e=>{setS(ses);const[hh,mm]=e.target.value.split(':').map(Number);const tm=$('.tm',ses);if(tm&&!isNaN(hh))tm.innerHTML=`${fmt12(hh,mm)} PT<br>${fmt12((hh+3)%24,mm)} ET`;dirtyS()};
  c.querySelector('.kd').onchange=e=>{ses.classList.remove('trainer','pz');if(e.target.value)ses.classList.add(e.target.value);const k=$('.k',ses);if(k)k.textContent=KINDS.find(x=>x[0]===e.target.value)[1];dirtyS()};
  c.querySelector('.x').onclick=()=>{if(confirm('Remove this session from the schedule?')){ses.remove();dense();dirtyS()}};
  ses.appendChild(c)}
function setS(ses){const c=$('.ed-ctl',ses);const[hh,mm]=(c.querySelector('.tm2').value||'9:00').split(':').map(Number);ses.dataset.s=`${c.querySelector('.d').value},${hh},${mm}`}
function dense(){$$('.day',week).forEach(d=>d.classList.toggle('dense',$$('.ses',d).length>=3))}
function dirtyS(){schedDirty=true;refresh();if(slides[idx].dataset.hook==='schedule'){if(hookStop)hookStop();hookStop=hooks.schedule(slides[idx])}}
let nid=0;
function sched(on){$$('.ed-ctl,.ed-add',week).forEach(x=>x.remove());if(!on)return;
  $$('.ses',week).forEach(sesCtl);
  $$('.day',week).forEach(day=>{const b=document.createElement('button');b.className='ed-add';b.textContent='+ Add session';b.onclick=e=>{e.stopPropagation();const s=document.createElement('div');const id='n'+Date.now().toString(36)+(nid++);
    s.className='glass ses';s.dataset.s=`${day.dataset.dow},9,0`;s.innerHTML=`<div class="k" data-e="${id}a" contenteditable="true">Core</div><div class="t" data-e="${id}b" contenteditable="true">New session</div><div class="tm" data-e="${id}c" contenteditable="true">9am PT<br>12pm ET</div>`;
    day.insertBefore(s,b);sesCtl(s);dense();dirtyS();$('.t',s).focus();document.execCommand('selectAll')};day.appendChild(b)})}
function cleanWeek(){const w=week.cloneNode(true);$$('.ed-ctl,.ed-add',w).forEach(x=>x.remove());$$('[contenteditable]',w).forEach(x=>x.removeAttribute('contenteditable'));
  $$('.day',w).forEach(d=>d.classList.remove('today'));$$('.ses',w).forEach(s=>{s.classList.remove('is-next');s.style.removeProperty('--gx');s.style.removeProperty('--gy');if(!s.getAttribute('style'))s.removeAttribute('style')});return w.innerHTML}

/* ---------- big events ---------- */
const pad2=n=>String(n).padStart(2,'0');
const toDate=a=>`${a[0]}-${pad2(a[1])}-${pad2(a[2])}`;
function autoLabel(s,e){const[y1,m1,d1]=s.split('-').map(Number),[y2,m2,d2]=e.split('-').map(Number);if(!y1)return'';
  if(s===e)return`${MONTHS[m1-1]} ${d1}, ${y1}`;if(y1===y2&&m1===m2)return`${MONTHS[m1-1]} ${d1} to ${d2}, ${y1}`;if(y1===y2)return`${MONTHS[m1-1]} ${d1} to ${MONTHS[m2-1]} ${d2}, ${y1}`;return`${MONTHS[m1-1]} ${d1}, ${y1} to ${MONTHS[m2-1]} ${d2}, ${y2}`}
function eventsPanel(){const m=modal(`<h3>Big events</h3><p>The slide shows the next event that has not ended yet, with a live countdown. Events that already ended show as "Just wrapped."</p><div id="evs"></div>
  <div class="row" style="justify-content:space-between"><button id="evadd">+ Add event</button><span><button id="evcancel">Cancel</button> <button class="go" id="evsave">Save</button></span></div>`);
  const box=m.el.querySelector('#evs');
  const row=e=>{const d=document.createElement('div');d.className='ev';d.innerHTML=`<label>Event name</label><input class="n" value="${esc(e.name)}"><label>City, state</label><input class="w" value="${esc(e.where)}">
    <div class="two"><div><label>First day</label><input class="s" type="date" value="${toDate(e.start)}"></div><div><label>Last day</label><input class="e" type="date" value="${toDate(e.end)}"></div></div>
    <div class="two"><div><label>Dates as shown on the slide</label><input class="l" value="${esc(e.label)}"></div><div><label>Time zone of the event</label><select class="z">${TZS.map(([v,n])=>`<option value="${v}"${v===e.tz?' selected':''}>${n}</option>`).join('')}</select></div></div>
    <div class="row" style="margin-top:10px"><button class="rm">Remove this event</button></div>`;
    const upd=()=>{d.querySelector('.l').value=autoLabel(d.querySelector('.s').value,d.querySelector('.e').value||d.querySelector('.s').value)};
    d.querySelector('.s').onchange=()=>{if(!d.querySelector('.e').value||d.querySelector('.e').value<d.querySelector('.s').value)d.querySelector('.e').value=d.querySelector('.s').value;upd()};d.querySelector('.e').onchange=upd;
    d.querySelector('.rm').onclick=()=>d.remove();box.appendChild(d)};
  EVENTS.forEach(row);
  m.el.querySelector('#evadd').onclick=()=>{const t=new Date(Date.now()+30*864e5),s=[t.getFullYear(),t.getMonth()+1,t.getDate(),9,0];row({name:'New event',where:'City, State',label:autoLabel(toDate(s),toDate(s)),start:s,end:[...s.slice(0,3),23,0],tz:'America/Los_Angeles'})};
  m.el.querySelector('#evcancel').onclick=m.close;
  m.el.querySelector('#evsave').onclick=()=>{const out=[];for(const d of $$('.ev',m.el)){const s=d.querySelector('.s').value,e=d.querySelector('.e').value||s;if(!s){alert('Every event needs a first day.');return}
      const[a,b,c]=s.split('-').map(Number),[x,y,z]=e.split('-').map(Number);out.push({name:d.querySelector('.n').value.trim()||'Event',where:d.querySelector('.w').value.trim(),label:d.querySelector('.l').value.trim()||autoLabel(s,e),start:[a,b,c,9,0],end:[x,y,z,23,0],tz:d.querySelector('.z').value})}
    EVENTS.length=0;EVENTS.push(...out);evDirty=true;m.close();refresh();
    const s=$('.s-ev');const i=slides.indexOf(s);if(idx===i){if(hookStop)hookStop();hookStop=hooks.events(s)}else go(i);refresh();toast('Event saved. Press Publish to put it live.')}}
stage.addEventListener('click',e=>{if(editing&&!overview&&e.target.closest('.ev-name,.ev-when')){e.stopPropagation();eventsPanel()}},true);

/* ---------- help ---------- */
function helpPanel(){const m=modal(`<h3>How editing works</h3><ol>
  <li><b>Words:</b> click any words on a slide and type. Enter makes a new line.</li>
  <li><b>Pictures:</b> pictures have a gold dashed border. Click one to upload a new one. QR codes can be remade from a link.</li>
  <li><b>Weekly schedule</b> (slide 11): each session has its own day, start time (Pacific), and color. "+ Add session" adds one.</li>
  <li><b>Big events</b> (slide 12): use the Big events button. The countdown updates on its own.</li>
  <li><b>Moving around:</b> the ‹ › buttons, or the arrow keys when you are not typing. "All slides" shows every slide at once.</li>
  <li><b>Publish</b> saves everything to the live site. It shows up there in 1 to 2 minutes.</li></ol>
  <p>Typing mistake? Press Ctrl+Z (Cmd+Z on a Mac). Nothing is lost after you publish: every version is saved, and Dwight can roll it back.</p>
  <div class="row" style="justify-content:space-between"><button id="hforget">Forget my key on this computer</button><button class="go" id="hok">Got it</button></div>`);
  m.el.querySelector('#hok').onclick=m.close;m.el.querySelector('#hforget').onclick=()=>{try{localStorage.removeItem(KEY)}catch(e){}m.close();toast('Key removed from this computer')}}

/* ---------- GitHub ---------- */
async function gh(method,path,key,body){const h={Accept:'application/vnd.github+json'};if(key)h.Authorization=`Bearer ${key}`;const r=await fetch(`${API}/repos/${REPO.owner}/${REPO.repo}${path?'/'+path:''}`,{method,cache:'no-store',headers:h,body:body?JSON.stringify(body):undefined});
  if(!r.ok){const err=new Error('GitHub '+r.status);err.status=r.status;throw err}return r.json()}
const enc=s=>{const b=new TextEncoder().encode(s);let t='';for(let i=0;i<b.length;i+=32768)t+=String.fromCharCode(...b.subarray(i,i+32768));return btoa(t)};
const dec=s=>new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g,'')),c=>c.charCodeAt(0)));
const b64=blob=>new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result.split(',')[1]);f.readAsDataURL(blob)});
function getKey(){let k='';try{k=localStorage.getItem(KEY)||''}catch(e){}if(k)return Promise.resolve(k);
  return new Promise(done=>{const m=modal(`<h3>One-time setup</h3><p>Paste the edit key Dwight sent you. This computer remembers it, so you only do this once.</p><input id="kin" type="password" autocomplete="off" placeholder="github_pat_..."><p id="kerr" class="err"></p><div class="row"><button id="kno">Cancel</button><button class="go" id="kok">Save key</button></div>`);
    const go=async()=>{const v=m.el.querySelector('#kin').value.trim();if(!v)return;m.el.querySelector('#kerr').textContent='Checking...';
      try{const r=await gh('GET','',v);if(r.permissions&&r.permissions.push===false)throw Object.assign(new Error(),{status:403});try{localStorage.setItem(KEY,v)}catch(e){}m.close();done(v)}
      catch(e){m.el.querySelector('#kerr').textContent=e.status===401?'That key did not work. Check you copied all of it.':e.status?'That key cannot edit this deck. Ask Dwight for a new one.':'Could not reach GitHub. Check your internet.'}};
    m.el.querySelector('#kok').onclick=go;m.el.querySelector('#kin').addEventListener('keydown',e=>{if(e.key==='Enter')go()});m.el.querySelector('#kno').onclick=()=>{m.close();done('')};setTimeout(()=>m.el.querySelector('#kin').focus(),30)})}

/* turn the live edits into a new index.html, starting from the newest copy on GitHub */
function apply(html){const doc=new DOMParser().parseFromString(html,'text/html');
  if(schedDirty){const w=doc.querySelector('.s-sch .week');if(w)w.innerHTML=cleanWeek()}
  if(evDirty){doc.getElementById('events').textContent='\n['+'\n'+EVENTS.map(e=>JSON.stringify(e).replace(/</g,'\\u003c')).join(',\n')+'\n]\n'}
  $$('[data-e]').forEach(el=>{const id=el.dataset.e,v=val(el);if(orig.get(id)===v)return;const t=doc.querySelector(`[data-e="${CSS.escape(id)}"]`);if(!t)return;
    if(el.hasAttribute('data-count')){['count','suffix','prefix'].forEach(k=>{if(el.dataset[k]!=null)t.dataset[k]=el.dataset[k];else delete t.dataset[k]})}
    else{const tmp=document.createElement('div');tmp.innerHTML=v;$$('[contenteditable]',tmp).forEach(x=>x.removeAttribute('contenteditable'));t.innerHTML=tmp.innerHTML}});
  imgs.forEach((p,id)=>{const t=doc.querySelector(`[data-img="${id}"]`);if(!t)return;if(t.tagName==='IMG')t.setAttribute('src',p.path);else t.style.backgroundImage=`url(${p.path})`});
  let meta=doc.querySelector('meta[name=rev]');if(!meta){meta=doc.createElement('meta');meta.name='rev';doc.head.appendChild(meta)}meta.content=String(Date.now());
  return'<!doctype html>\n'+doc.documentElement.outerHTML}
let busy=false;
async function publish(){if(busy||!changes())return;const key=await getKey();if(!key)return;busy=true;const b=$('#epub');b.disabled=true;b.textContent='Publishing...';
  const n=changes();
  try{for(const p of imgs.values())if(!p.done){await gh('PUT','contents/'+p.path,key,{message:'New picture from the edit page',content:await b64(p.blob),branch:REPO.branch});p.done=true}
    for(let tries=0;;tries++){let cur=await gh('GET',`contents/index.html?ref=${REPO.branch}`,key);
      if(lastPut&&cur.sha===lastPut.before)cur={sha:lastPut.sha,content:enc(lastPut.html)};
      const src=dec(cur.content);
      if(revOf(src)!==myRev&&(schedDirty||evDirty)){const err=new Error('stale');err.status='stale';throw err}
      const html=apply(src);
      try{const r=await gh('PUT','contents/index.html',key,{message:`Edit from the edit page (${n} change${n>1?'s':''})`,content:enc(html),sha:cur.sha,branch:REPO.branch});lastPut={before:cur.sha,sha:r.content.sha,html};myRev=revOf(html);break}
      catch(e){if(e.status===409&&tries<2)continue;throw e}}
    imgs.clear();schedDirty=evDirty=false;capture();
    const m=modal(`<h3>Published</h3><p>Your changes are saved. The live site shows them in 1 to 2 minutes. If you still see the old version after that, refresh the page.</p><div class="row"><button class="go" id="pok">Done</button></div>`);m.el.querySelector('#pok').onclick=m.close}
  catch(e){const msg=e.status===401?'Your edit key stopped working (it may have expired). Ask Dwight for a new one, then click Help and "Forget my key" before trying again.':e.status===403||e.status===404?'Your edit key is not allowed to change this deck. Ask Dwight for a new one.':e.status==='stale'?'Someone else saved changes to the deck while you were editing. Your schedule or event change was not saved, so it would not erase theirs. Write it down, refresh the page, and make it again.':e.status===409||e.status===422?'Someone else saved at the same moment. Click Publish again.':'Could not reach GitHub. Check your internet and click Publish again. Your edits are still here.';
    if(e.status===401||e.status===403||e.status===404){try{localStorage.removeItem(KEY)}catch(x){}}
    const m=modal(`<h3>Not published yet</h3><p class="err">${msg}</p><div class="row"><button class="go" id="eok">OK</button></div>`);m.el.querySelector('#eok').onclick=m.close}
  finally{busy=false;refresh()}}

/* ---------- start ---------- */
capture();if(!editing)toggleEdit();
/* make sure this page is the newest version before editing; the live site lags a publish by a minute or two */
(async()=>{let latest;try{latest=revOf(dec((await gh('GET',`contents/index.html?ref=${REPO.branch}`)).content))}catch(e){return}
  if(latest===myRev)return;
  const m=modal(`<h3>Loading the newest version</h3><p>Someone just published changes, and the site is still catching up. This page refreshes on its own when it is ready, usually within 2 minutes.</p>`);
  (async function wait(){try{const t=await (await fetch(location.pathname+'?r='+Date.now(),{cache:'no-store'})).text();if(revOf(t)===latest){removeEventListener('beforeunload',warn);const q=new URLSearchParams(location.search);q.set('r',latest);location.replace(location.pathname+'?'+q+location.hash);return}}catch(e){}setTimeout(wait,15000)})()})();
toast('Editing · click any words');
})();
