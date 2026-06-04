// ==========================================================
// RENDER CONTROLLER, CATEGORIES, ASSISTANT WIDGETS & PWA KIT
// ==========================================================

// --- SISTEM TOAST NOTIFICATION ---
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toast-message');
  const toastIcon = document.getElementById('toast-icon');
  if (!toast || !toastMsg) return;
  toastMsg.textContent = message;
  if (toastIcon) {
    toastIcon.className = "fa-solid text-base";
    if (type === 'error') toastIcon.classList.add('fa-triangle-exclamation', 'text-rose-500');
    else if (type === 'warning') toastIcon.classList.add('fa-circle-exclamation', 'text-amber-500');
    else toastIcon.classList.add('fa-circle-check', 'text-emerald-400', 'dark:text-emerald-600');
  }
  toast.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-4');
  toast.classList.add('opacity-100', 'translate-y-0');
  if (toastTimeoutId) clearTimeout(toastTimeoutId);
  toastTimeoutId = setTimeout(() => {
    toast.classList.remove('opacity-100', 'translate-y-0');
    toast.classList.add('opacity-0', 'pointer-events-none', 'translate-y-4');
  }, 4000);
}

// --- SISTEM MODAL KONFIRMASI KUSTOM ---
function showCustomConfirm(title, message, callback, iconClass = 'fa-circle-question') {
  const modal = document.getElementById('custom-confirm-modal');
  if (!modal) return;
  document.getElementById('confirm-modal-title').textContent = title;
  document.getElementById('confirm-modal-message').textContent = message;
  document.getElementById('confirm-modal-icon').className = `fa-solid ${iconClass}`;
  activeConfirmCallback = callback;
  modal.classList.remove('opacity-0', 'pointer-events-none');
  modal.children[0].classList.replace('scale-95', 'scale-100');
}

function closeCustomConfirm(approved = false) {
  const modal = document.getElementById('custom-confirm-modal');
  if (!modal) return;
  modal.classList.add('opacity-0', 'pointer-events-none');
  modal.children[0].classList.replace('scale-100', 'scale-95');
  if (approved && typeof activeConfirmCallback === 'function') activeConfirmCallback();
  activeConfirmCallback = null;
}

// --- RENDERING DAFTAR TAUTAN ---
function renderDynamicLinks() {
  const wrapper = document.getElementById('dynamic-links-wrapper');
  if (!wrapper) return;
  wrapper.innerHTML = '';

  const catMap = {
    'utama': { title: 'Dapodik & Portal Utama', icon: 'fa-folder-open', color: 'text-blue-500' },
    'verval': { title: 'Verifikasi & Validasi (Verval)', icon: 'fa-shield-halved', color: 'text-emerald-500' },
    'keuangan': { title: 'Anggaran & Keuangan Sekolah', icon: 'fa-wallet', color: 'text-amber-500' },
    'guru': { title: 'Layanan Pendidik (GTK)', icon: 'fa-chalkboard-user', color: 'text-indigo-500' },
    'kepegawaian': { title: 'Layanan Kepegawaian (ASN)', icon: 'fa-id-card-clip', color: 'text-sky-500' },
    'ujian': { title: 'Asesmen Nasional (ANBK)', icon: 'fa-laptop-code', color: 'text-rose-500' },
    'daerah': { title: 'Portal Dinas & Daerah', icon: 'fa-city', color: 'text-purple-500' }
  };

  const q = document.getElementById('search-input').value.toLowerCase().trim();
  let total = 0;
  let counts = { semua: 0, utama: 0, verval: 0, keuangan: 0, guru: 0, kepegawaian: 0, "2fa_auth": 0, ujian: 0, daerah: 0 };

  linksData.forEach(l => {
    if (l.title.toLowerCase().includes(q) || l.desc.toLowerCase().includes(q)) {
      counts[l.category] = (counts[l.category] || 0) + 1;
      total++;
    }
  });
  counts['semua'] = total;
  counts['2fa_auth'] = authenticatorKeys.length;

  Object.keys(counts).forEach(k => {
    const b = document.getElementById(`badge-${k}`);
    if (b) b.textContent = counts[k];
  });

  let totalVis = 0;
  Object.keys(catMap).forEach(cat => {
    const filtered = linksData.filter(l => (activeCategory === 'semua' || activeCategory === cat) && l.category === cat && (l.title.toLowerCase().includes(q) || l.desc.toLowerCase().includes(q)));
    if (filtered.length > 0) {
      const sec = document.createElement('div');
      sec.innerHTML = `<h3 class="text-xs font-black tracking-wider uppercase text-slate-400 mb-4 flex items-center gap-2"><i class="fa-solid ${catMap[cat].icon} ${catMap[cat].color}"></i> ${catMap[cat].title}</h3>`;
      
      const grid = document.createElement('div');
      grid.className = 'grid grid-cols-1 sm:grid-cols-2 gap-4';
      
      filtered.forEach(l => {
        totalVis++;
        const a = document.createElement('a');
        a.href = l.url;
        a.target = "_blank";
        a.rel = "noopener";
        a.className = 'block p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 hover:border-blue-500 hover:shadow-lg transition-all group relative';
        const delBtn = !l.system ? `<button onclick="event.preventDefault(); event.stopPropagation(); deleteCustomLink('${l.id}')" class="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition z-20 p-1"><i class="fa-solid fa-trash text-xs"></i></button>` : '';
        a.innerHTML = `${delBtn}
          <div class="flex items-start gap-3 sm:gap-4">
            <div class="p-2.5 sm:p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 group-hover:scale-110 transition flex-shrink-0"><i class="fa-solid ${l.icon || 'fa-globe'} text-lg sm:text-xl"></i></div>
            <div class="flex-1 pr-4 min-w-0">
              <h4 class="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm md:text-base group-hover:text-blue-600 flex items-center gap-1 truncate font-space">${l.title} <i class="fa-solid fa-arrow-up-right-from-square text-[9px] opacity-0 group-hover:opacity-100 transition"></i></h4>
              <p class="text-[10px] sm:text-xs text-slate-500 mt-1.5 leading-relaxed break-words">${l.desc}</p>
            </div>
          </div>`;
        grid.appendChild(a);
      });
      sec.appendChild(grid);
      wrapper.appendChild(sec);
    }
  });

  const noRes = document.getElementById('no-results-message');
  if (noRes) totalVis === 0 ? noRes.classList.remove('hidden') : noRes.classList.add('hidden');
}

function selectCategory(cat) {
  activeCategory = cat;
  const p2Fa = document.getElementById('panel-2fa-main-auth');
  const pLinks = document.getElementById('panel-links-main-wrapper');
  if (p2Fa && pLinks) {
    if (cat === '2fa_auth') {
      p2Fa.classList.remove('hidden');
      pLinks.classList.add('hidden');
      renderAuthenticatorKeys();
    } else {
      p2Fa.classList.add('hidden');
      pLinks.classList.remove('hidden');
    }
  }
  
  document.querySelectorAll('.category-tab').forEach(t => {
    const c = t.getAttribute('data-category');
    const b = t.querySelector('span:last-child');
    if (c === cat) {
      t.className = 'category-tab inline-flex lg:flex items-center justify-between w-auto lg:w-full px-4 py-2.5 text-xs font-bold rounded-xl transition-all bg-blue-600 text-white shadow-md';
      if(b) b.className = 'ml-1.5 bg-white/20 px-1.5 py-0.5 rounded text-[10px] font-mono';
    } else {
      t.className = 'category-tab inline-flex lg:flex items-center justify-between w-auto lg:w-full px-4 py-2.5 text-xs font-bold rounded-xl transition-all bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200';
      if(b) b.className = 'ml-1.5 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-[10px] font-mono';
    }
  });
  filterLinksOrKeys();
}

function filterLinksOrKeys() {
  const s = document.getElementById('search-input'); 
  const c = document.getElementById('clear-search');
  if (s && c) s.value.trim().length > 0 ? c.classList.remove('hidden') : c.classList.add('hidden');
  activeCategory === '2fa_auth' ? renderAuthenticatorKeys() : renderDynamicLinks();
}

function clearSearchInput() { 
  const s = document.getElementById('search-input'); 
  if(s) s.value = ''; 
  filterLinksOrKeys(); 
}

// --- SISTEM PANEL TAB ASISTEN (KANAN) ---
function switchAsistenTab(t) {
  ['agenda', 'kalender', 'alat'].forEach(id => {
    const btn = document.getElementById(`btn-tab-${id}`);
    const panel = document.getElementById(`panel-tab-${id}`);
    
    if (btn) {
      if (id === t) {
        btn.className = "flex-1 py-2 px-2 rounded-xl text-[11px] font-extrabold bg-white dark:bg-slate-800 text-blue-600 shadow-sm";
      } else {
        btn.className = "flex-1 py-2 px-2 rounded-xl text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200";
      }
    }
    if (panel) {
      panel.classList.toggle('hidden', id !== t);
    }
  });
  
  if (t === 'kalender') {
    initCalendar();
  }
}

function switchSubTab(t) {
  ['tugas', 'memo'].forEach(id => {
    const btn = document.getElementById(`btn-sub-${id}`);
    const panel = document.getElementById(`sub-panel-${id}`);
    
    if (btn) {
      if (id === t) {
        btn.className = "flex-1 py-1.5 text-[10px] font-black bg-white dark:bg-slate-800 text-blue-600 shadow-xs rounded-lg";
      } else {
        btn.className = "flex-1 py-1.5 text-[10px] font-bold text-slate-500";
      }
    }
    if (panel) {
      panel.classList.toggle('hidden', id !== t);
    }
  });
}

// Pembuka/Penutup Modul Modal Dialog
function openAddAgendaModal() {
  const m = document.getElementById('add-agenda-modal');
  if (m) {
    m.classList.remove('opacity-0', 'pointer-events-none');
    m.children[0].classList.replace('scale-95', 'scale-100');
  }
}

function closeAddAgendaModal() {
  const m = document.getElementById('add-agenda-modal');
  if (m) {
    m.classList.add('opacity-0', 'pointer-events-none');
    m.children[0].classList.replace('scale-100', 'scale-95');
  }
}

function openAddMemoModal() {
  const m = document.getElementById('add-memo-modal');
  if (m) {
    m.classList.remove('opacity-0', 'pointer-events-none');
    m.children[0].classList.replace('scale-95', 'scale-100');
  }
}

function closeAddMemoModal() {
  const m = document.getElementById('add-memo-modal');
  if (m) {
    m.classList.add('opacity-0', 'pointer-events-none');
    m.children[0].classList.replace('scale-100', 'scale-95');
  }
}

function openAddLinkModal() {
  const m = document.getElementById('add-link-modal');
  if (m) {
    m.classList.remove('opacity-0', 'pointer-events-none');
    m.children[0].classList.replace('scale-95', 'scale-100');
  }
}

function closeAddLinkModal() {
  const m = document.getElementById('add-link-modal');
  if (m) {
    m.classList.add('opacity-0', 'pointer-events-none');
    m.children[0].classList.replace('scale-100', 'scale-95');
  }
}

// --- TAB ASISTEN: AGENDA KERJA ---
function saveAgenda() { secureSave(CONFIG.STORAGE_PREFIX + 'agendas', agendaData); }

function renderAgenda() {
  const c = document.getElementById('agenda-list-container');
  if (!c) return;
  c.innerHTML = '';
  const f = document.getElementById('agenda-filter').value;
  const tasks = agendaData.filter(t => f === 'semua' ? true : (f === 'belum' ? !t.done : t.done)).sort((a,b)=>a.createdAt-b.createdAt);
  
  tasks.forEach(t => {
    const d = document.createElement('div');
    d.className = 'flex justify-between items-start gap-2 p-2 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 group';
    d.innerHTML = `
      <label class="flex gap-2 flex-1 cursor-pointer">
        <input type="checkbox" ${t.done?'checked':''} onchange="toggleTaskDone('${t.id}')" class="mt-1 h-3 w-3 rounded text-blue-600 focus:ring-blue-500">
        <span class="text-xs ${t.done?'line-through opacity-50':''}">${t.text}</span>
      </label>
      <button onclick="deleteAgendaItem('${t.id}')" class="text-rose-500 opacity-0 group-hover:opacity-100 transition p-1">
        <i class="fa-solid fa-trash-can text-[10px]"></i>
      </button>`;
    c.appendChild(d);
  });
  updateCountdownTask();
}

function addAgendaItem() {
  const t = document.getElementById('agenda-input-text').value.trim();
  if(t) {
    agendaData.push({ id: 'ag-'+Date.now(), text: t, done: false, createdAt: Date.now() });
    saveAgenda();
    renderAgenda();
    closeAddAgendaModal();
    document.getElementById('agenda-input-text').value = '';
    showToast("Tugas baru berhasil disimpan ke agenda!");
  }
}

function toggleTaskDone(id) {
  const t = agendaData.find(x=>x.id===id);
  if(t) {
    t.done = !t.done;
    saveAgenda();
    renderAgenda();
  }
}

function deleteAgendaItem(id) {
  agendaData = agendaData.filter(x=>x.id!==id);
  saveAgenda();
  renderAgenda();
  showToast("Tugas berhasil dihapus.");
}

function updateCountdownTask() {
  const txt = document.getElementById('countdown-active-task-text');
  const btn = document.getElementById('countdown-active-task-btn');
  const p = agendaData.find(t=>!t.done);
  if(txt) txt.textContent = p ? p.text : "✅ Semua agenda pekerjaan telah selesai!";
  if(btn) p ? btn.classList.remove('hidden') : btn.classList.add('hidden');
  if(btn && p) btn.onclick = () => toggleTaskDone(p.id);
}

// --- TAB ASISTEN: KALENDER KERJA ---
function initCalendar() {
  const names = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
  const y = currentDateObj.getFullYear();
  const m = currentDateObj.getMonth();
  const headerTitle = document.getElementById('calendar-month-year');
  if (headerTitle) headerTitle.textContent = `${names[m]} ${y}`;
  const c = document.getElementById('calendar-days-grid');
  if (!c) return;
  c.innerHTML = '';
  const fd = new Date(y, m, 1).getDay();
  const td = new Date(y, m+1, 0).getDate();
  for(let i=0; i<fd; i++) c.innerHTML += `<div></div>`;
  const today = new Date();
  for(let d=1; d<=td; d++) {
    const isT = today.getDate()===d && today.getMonth()===m && today.getFullYear()===y;
    c.innerHTML += `<div onclick="document.getElementById('calendar-event-display').innerHTML='<p class=\\'text-[10px] font-bold text-blue-600 dark:text-blue-400\\'><i class=\\'fa-solid fa-circle-info\\'></i> Hari Penting: ${d} ${names[m]} ${y}</p>'" class="p-1 rounded cursor-pointer ${isT ? 'bg-blue-600 text-white font-bold':'hover:bg-blue-50 dark:hover:bg-slate-700'}">${d}</div>`;
  }
}

function prevMonth() { currentDateObj.setMonth(currentDateObj.getMonth()-1); initCalendar(); }
function nextMonth() { currentDateObj.setMonth(currentDateObj.getMonth()+1); initCalendar(); }

// --- TAB ASISTEN: BUKU SAKU MEMO ---
function renderQuickNotes() {
  const c = document.getElementById('quick-notes-list');
  if(!c) return;
  c.innerHTML = '';
  notesData.forEach(n => {
    c.innerHTML += `
      <div class="p-2 border rounded-xl bg-slate-50/50 dark:bg-slate-900/30 relative group font-sans">
        <h5 class="text-[10px] font-bold text-slate-800 dark:text-white">${n.title}</h5>
        <p class="text-[9px] text-slate-500 leading-relaxed line-clamp-2">${n.body}</p>
        <button onclick="notesData=notesData.filter(x=>x.id!=='${n.id}'); secureSave(CONFIG.STORAGE_PREFIX + 'notes', notesData); renderQuickNotes();" class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-rose-500 transition">
          <i class="fa-solid fa-trash text-[9px]"></i>
        </button>
      </div>`;
  });
}

function addQuickNote() {
  const t = document.getElementById('note-title-input').value.trim();
  const b = document.getElementById('note-body-input').value.trim();
  if(t && b) {
    notesData.push({ id: 'n-'+Date.now(), title: t, body: b });
    secureSave(CONFIG.STORAGE_PREFIX + 'notes', notesData);
    renderQuickNotes();
    closeAddMemoModal();
    document.getElementById('note-title-input').value = '';
    document.getElementById('note-body-input').value = '';
    showToast("Memo catatan berhasil disimpan!");
  }
}

// --- TAB ASISTEN: BROADCAST WHATSAPP ---
function populateWaSelect() {
  const s = document.getElementById('wa-template-select');
  if(s) {
    s.innerHTML = '';
    waTemplates.forEach(t => s.innerHTML += `<option value="${t.id}">${t.name}</option>`);
  }
}

function copyBroadcastMessage() {
  const t = waTemplates.find(x=>x.id===document.getElementById('wa-template-select').value);
  if(t) copyText(t.text.replace(/{nama}/g, document.getElementById('wa-recipient-name').value || "Bapak/Ibu Guru"), "Pesan siaran WhatsApp berhasil disalin!");
}

function sendBroadcastWhatsApp() {
  const t = waTemplates.find(x=>x.id===document.getElementById('wa-template-select').value);
  if(t) window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(t.text.replace(/{nama}/g, document.getElementById('wa-recipient-name').value || "Bapak/Ibu Guru"))}`, '_blank');
}

function openTemplatesModal() {
  const m = document.getElementById('templates-modal');
  if (m) {
    m.classList.remove('opacity-0', 'pointer-events-none');
    m.children[0].classList.replace('scale-95', 'scale-100');
    renderTemplatesList();
  }
}

function closeTemplatesModal() {
  const m = document.getElementById('templates-modal');
  if (m) {
    m.classList.add('opacity-0', 'pointer-events-none');
    m.children[0].classList.replace('scale-100', 'scale-95');
  }
}

function renderTemplatesList() {
  const container = document.getElementById('templates-list-container');
  if(!container) return;
  container.innerHTML = '';
  waTemplates.forEach(t => {
    container.innerHTML += `
      <div class="p-3 border dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 rounded-xl flex justify-between items-start gap-2">
        <div class="truncate flex-1">
          <h5 class="text-xs font-bold truncate text-slate-800 dark:text-white">${t.name}</h5>
          <p class="text-[10px] text-slate-500 truncate mt-0.5">${t.text}</p>
        </div>
        <div class="flex gap-1.5 flex-shrink-0">
          <button onclick="editTemplate('${t.id}')" class="text-blue-500 hover:text-blue-700 transition" title="Ubah"><i class="fa-solid fa-pen-to-square"></i></button>
          <button onclick="deleteTemplate('${t.id}')" class="text-rose-500 hover:text-rose-700 transition" title="Hapus"><i class="fa-solid fa-trash-can"></i></button>
        </div>
      </div>`;
  });
}

function showAddTemplateForm() {
  const lv = document.getElementById('templates-list-view');
  const fv = document.getElementById('template-form-view');
  if (lv && fv) {
    lv.classList.add('hidden');
    fv.classList.remove('hidden');
  }
  document.getElementById('template-edit-id').value = '';
  document.getElementById('template-name-input').value = '';
  document.getElementById('template-text-input').value = '';
}

function hideTemplateForm() {
  const lv = document.getElementById('templates-list-view');
  const fv = document.getElementById('template-form-view');
  if (lv && fv) {
    lv.classList.remove('hidden');
    fv.classList.add('hidden');
  }
}

function saveTemplate() {
  const id = document.getElementById('template-edit-id').value;
  const name = document.getElementById('template-name-input').value.trim();
  const text = document.getElementById('template-text-input').value.trim();
  if(!name || !text) return showToast("Lengkapi nama & pesan template!", "warning");
  if(id) {
    const idx = waTemplates.findIndex(t => t.id === id);
    if(idx !== -1) waTemplates[idx] = { id, name, text };
  } else {
    waTemplates.push({ id: 'wat-'+Date.now(), name, text });
  }
  secureSave(CONFIG.STORAGE_PREFIX + 'wa-templates', waTemplates);
  populateWaSelect();
  renderTemplatesList();
  hideTemplateForm();
  showToast("Template pesan berhasil disimpan!");
}

function editTemplate(id) {
  const t = waTemplates.find(x => x.id === id);
  if(t) {
    showAddTemplateForm();
    document.getElementById('template-edit-id').value = t.id;
    document.getElementById('template-name-input').value = t.name;
    document.getElementById('template-text-input').value = t.text;
  }
}

function deleteTemplate(id) {
  showCustomConfirm("Hapus Template?", "Template siaran pesan ini akan dihapus secara permanen.", () => {
    waTemplates = waTemplates.filter(x => x.id !== id);
    secureSave(CONFIG.STORAGE_PREFIX + 'wa-templates', waTemplates);
    populateWaSelect();
    renderTemplatesList();
    showToast("Template berhasil dihapus.");
  }, 'fa-trash-can');
}

// --- PWA OFFLINE DEPLOYMENT KIT DOWNLOADER ---
function downloadPwaFile(fileType) {
  let content = "", filename = "", mimeType = "";
  if (fileType === 'manifest') {
    content = manifestJsonText; filename = "manifest.json"; mimeType = "application/json";
  } else if (fileType === 'sw') {
    content = serviceWorkerJsText; filename = "sw.js"; mimeType = "application/javascript";
  }
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast(`Berkas ${filename} berhasil diunduh! Silakan taruh di folder root Anda.`, "success");
}

function registerMainServiceWorker() {
  const statusText = document.getElementById('pwa-sw-status-text');
  const statusDot = document.getElementById('pwa-sw-status-dot');
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(() => {
        if (statusText) statusText.textContent = "Aktif (Layanan Luring Siap)";
        if (statusDot) statusDot.className = "w-1.5 h-1.5 rounded-full bg-emerald-500";
      })
      .catch(() => {
        if (statusText) statusText.textContent = "Dukung Luring (Gunakan Paket)";
        if (statusDot) statusDot.className = "w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse";
      });
  } else {
    if (statusText) statusText.textContent = "Tidak Didukung Peramban";
    if (statusDot) statusDot.className = "w-1.5 h-1.5 rounded-full bg-rose-500";
  }
}

// Real-time Countdown Cut-off BOS
function startCutOffCountdown() {
  const targetDate = new Date(CONFIG.CUTOFF_DATE).getTime();
  function updateCountdown() {
    const now = new Date().getTime();
    const distance = targetDate - now;
    const daysEl = document.getElementById("countdown-days");
    const hoursEl = document.getElementById("countdown-hours");
    const minutesEl = document.getElementById("countdown-minutes");
    const secondsEl = document.getElementById("countdown-seconds");
    if (!daysEl || !hoursEl || !minutesEl || !secondsEl) return;

    if (distance < 0) {
      daysEl.textContent = "00";
      hoursEl.textContent = "00";
      minutesEl.textContent = "00";
      secondsEl.textContent = "00";
      return;
    }
    daysEl.textContent = String(Math.floor(distance / (1000 * 60 * 60 * 24))).padStart(2, '0');
    hoursEl.textContent = String(Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))).padStart(2, '0');
    minutesEl.textContent = String(Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
    secondsEl.textContent = String(Math.floor((distance % (1000 * 60)) / 1000)).padStart(2, '0');
  }
  updateCountdown();
  setInterval(updateCountdown, 1000);
}

// Berkas Sumber Manifest & Service Worker untuk Unduhan Paket Luring
const manifestJsonText = `{
  "name": "DAPO-HUB SPENTIG",
  "short_name": "DAPO-HUB",
  "description": "Portal Integrasi Operator Dapodik & IT SMP Negeri 3 Makassar",
  "start_url": "index.html",
  "display": "standalone",
  "background_color": "#f8fafc",
  "theme_color": "#2563eb",
  "icons": [
    {
      "src": "https://cdn-icons-png.flaticon.com/512/2210/2210143.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}`;

const serviceWorkerJsText = `
  const CACHE_NAME = 'dapohub-cache-v3';
  const ASSETS_TO_CACHE = ['./', './index.html', './manifest.json'];
  self.addEventListener('install', (e) => e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS_TO_CACHE))));
  self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))));
  self.addEventListener('fetch', (e) => {
    if (!e.request.url.startsWith('http')) return;
    e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request).catch(() => caches.match('./index.html'))));
  });
`;
