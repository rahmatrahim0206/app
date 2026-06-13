// ==========================================================
// RENDER CONTROLLER, CATEGORIES, ASSISTANT WIDGETS & PWA KIT
// ==========================================================

// --- DEKLARASI & INITIALISASI VARIABEL GLOBAL (PENGAMAN EROR) ---
if (typeof activeCategory === 'undefined') window.activeCategory = 'semua';
if (typeof toastTimeoutId === 'undefined') window.toastTimeoutId = null;
if (typeof activeConfirmCallback === 'undefined') window.activeConfirmCallback = null;
if (typeof currentDateObj === 'undefined') window.currentDateObj = new Date();
if (typeof linksData === 'undefined') window.linksData = [];
if (typeof agendaData === 'undefined') window.agendaData = [];
if (typeof notesData === 'undefined') window.notesData = [];
if (typeof waTemplates === 'undefined') window.waTemplates = [];

// --- SISTEM TOAST NOTIFICATION ---
window.showToast = function(message, type = 'success') {
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

// --- SISTEM MODAL CONFIRMATION CUSTOM ---
window.showCustomConfirm = function(title, message, callback, iconClass = 'fa-circle-question') {
  const modal = document.getElementById('custom-confirm-modal');
  if (!modal) return;
  document.getElementById('confirm-modal-title').textContent = title;
  document.getElementById('confirm-modal-message').textContent = message;
  document.getElementById('confirm-modal-icon').className = `fa-solid ${iconClass}`;
  activeConfirmCallback = callback;
  modal.classList.remove('opacity-0', 'pointer-events-none');
  modal.children[0].classList.replace('scale-95', 'scale-100');
}

window.closeCustomConfirm = function(approved = false) {
  const modal = document.getElementById('custom-confirm-modal');
  if (!modal) return;
  modal.classList.add('opacity-0', 'pointer-events-none');
  modal.children[0].classList.replace('scale-100', 'scale-95');
  if (approved && typeof activeConfirmCallback === 'function') activeConfirmCallback();
  activeConfirmCallback = null;
}

// --- RENDERING DAFTAR TAUTAN ---
window.renderDynamicLinks = function() {
  const wrapper = document.getElementById('dynamic-links-wrapper');
  if (!wrapper) return;
  wrapper.innerHTML = '';

  const catMap = {
    'utama': { title: 'Dapodik & Portal Utama', icon: 'fa-folder-open', color: 'text-blue-500' },
    'verval': { title: 'Verifikasi & Validasi (Verval)', icon: 'fa-shield-halved', color: 'text-emerald-500' },
    'keuangan': { title: 'Anggaran & Keuangan Sekolah', icon: 'fa-wallet', color: 'text-amber-500' },
    'guru': { title: 'Layanan Pendidik (GTK)', icon: 'fa-chalkboard-user', color: 'text-indigo-500' },
    'kepegawaian': { title: 'Layanan Kepegawaian (ASN)', icon: 'fa-id-card-clip', color: 'text-sky-500' },
    'portal_tka': { title: 'Asesmen', icon: 'fa-laptop-code', color: 'text-rose-500' },
    'daerah': { title: 'Portal Dinas & Daerah', icon: 'fa-city', color: 'text-purple-500' }
  };

  const searchInput = document.getElementById('search-input');
  const q = searchInput ? searchInput.value.toLowerCase().trim() : '';
  let total = 0;
  let counts = { semua: 0, utama: 0, verval: 0, keuangan: 0, guru: 0, kepegawaian: 0, portal_tka: 0, daerah: 0, pdf_tools: 6, ping_tools: 6, speedtest: 1, "2fa_auth": 0, whatsapp: 0, it_tools: 4 };

  if (!linksData || !Array.isArray(linksData)) {
    linksData = typeof defaultSeedLinks !== 'undefined' ? [...defaultSeedLinks] : [];
  }

  linksData.forEach(l => {
    if (l.title.toLowerCase().includes(q) || l.desc.toLowerCase().includes(q)) {
      counts[l.category] = (counts[l.category] || 0) + 1;
      total++;
    }
  });
  counts['semua'] = total;
  counts['2fa_auth'] = typeof authenticatorKeys !== 'undefined' ? authenticatorKeys.length : 0;
  counts['whatsapp'] = typeof waTemplates !== 'undefined' ? waTemplates.length : 0;

  Object.keys(counts).forEach(k => {
    const b = document.getElementById(`badge-${k}`);
    if (b) b.textContent = counts[k];
  });

  let totalVis = 0;
  Object.keys(catMap).forEach(cat => {
    const filtered = linksData.filter(l => (activeCategory === 'semua' || activeCategory === cat) && l.category === cat && (l.title.toLowerCase().includes(q) || l.desc.toLowerCase().includes(q)));
    if (filtered.length > 0) {
      const sec = document.createElement('div');
      sec.className = 'space-y-4 mb-6 animate-fade-in';
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
              <p class="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed break-words">${l.desc}</p>
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

// --- FUNGSI KLIK KATEGORI UTAMA ---
window.selectCategory = function(cat) {
  activeCategory = cat;
  const p2Fa = document.getElementById('panel-2fa-main-auth');
  const pLinks = document.getElementById('panel-links-main-wrapper');
  const pPdf = document.getElementById('panel-pdf-tools-wrapper');
  const pPing = document.getElementById('panel-ping-tools-wrapper');
  const pSpeed = document.getElementById('panel-speedtest-wrapper');
  const pWa = document.getElementById('panel-whatsapp-wrapper');
  const pIt = document.getElementById('panel-it-tools-wrapper');
  
  if (p2Fa && pLinks && pPdf && pPing && pSpeed && pWa && pIt) {
    p2Fa.classList.add('hidden');
    pLinks.classList.add('hidden');
    pPdf.classList.add('hidden');
    pPing.classList.add('hidden');
    pSpeed.classList.add('hidden');
    pWa.classList.add('hidden');
    pIt.classList.add('hidden');

    // --- SINKRONISASI CLEANUP OTOMATIS LAYANAN YANG TERBUKA DI LATAR BELAKANG ---
    if (cat !== 'ping_tools' && typeof stopAutoPingInterval === 'function') {
      stopAutoPingInterval();
    }
    if (cat !== 'speedtest' && typeof speedtestAbortController !== 'undefined' && speedtestAbortController) {
      speedtestAbortController.abort();
    }
    if (cat !== '2fa_auth' && typeof isScanning !== 'undefined' && isScanning && typeof toggleQrScanner === 'function') {
      toggleQrScanner();
    }

    if (cat === '2fa_auth') {
      p2Fa.classList.remove('hidden');
      if (typeof renderAuthenticatorKeys === 'function') renderAuthenticatorKeys();
    } else if (cat === 'pdf_tools') {
      pPdf.classList.remove('hidden');
      if (typeof resetPdfWorkspaces === 'function') resetPdfWorkspaces();
    } else if (cat === 'ping_tools') {
      pPing.classList.remove('hidden');
      if (typeof initPingWorkspace === 'function') initPingWorkspace();
    } else if (cat === 'speedtest') {
      pSpeed.classList.remove('hidden');
      if (typeof initSpeedtestWorkspace === 'function') initSpeedtestWorkspace();
    } else if (cat === 'whatsapp') {
      pWa.classList.remove('hidden');
      if (typeof populateWaSelect === 'function') populateWaSelect();
    } else if (cat === 'it_tools') {
      pIt.classList.remove('hidden');
      if (typeof initItToolsWorkspace === 'function') initItToolsWorkspace();
    } else {
      pLinks.className = "space-y-6";
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

window.filterLinksOrKeys = function() {
  const s = document.getElementById('search-input'); 
  const c = document.getElementById('clear-search');
  if (s && c) s.value.trim().length > 0 ? c.classList.remove('hidden') : c.classList.add('hidden');
  
  const noRes = document.getElementById('no-results-message');
  
  if (activeCategory === '2fa_auth' || activeCategory === 'pdf_tools' || activeCategory === 'ping_tools' || activeCategory === 'speedtest' || activeCategory === 'whatsapp' || activeCategory === 'it_tools') {
    if (noRes) noRes.classList.add('hidden');
    if (activeCategory === '2fa_auth' && typeof renderAuthenticatorKeys === 'function') renderAuthenticatorKeys();
  } else {
    renderDynamicLinks();
  }
}

window.clearSearchInput = function() { 
  const s = document.getElementById('search-input'); 
  if(s) s.value = ''; 
  filterLinksOrKeys(); 
}

// --- SISTEM PANEL TAB KOTAK 1 (KALENDER & BUKU SAKU MEMO) ---
window.switchCalendarMemoTab = function(t) {
  const calendarBtn = document.getElementById('btn-tab-calendar');
  const memoBtn = document.getElementById('btn-tab-memo');
  const calendarPanel = document.getElementById('panel-tab-calendar');
  const memoPanel = document.getElementById('panel-tab-memo');

  if (t === 'calendar') {
    if (calendarBtn) calendarBtn.className = "flex-1 py-2 px-1 rounded-xl text-[11px] font-extrabold bg-white dark:bg-slate-800 text-blue-600 shadow-sm";
    if (memoBtn) memoBtn.className = "flex-1 py-2 px-1 rounded-xl text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200";
    if (calendarPanel) calendarPanel.classList.remove('hidden');
    if (memoPanel) memoPanel.classList.add('hidden');
    initCalendar();
  } else if (t === 'memo') {
    if (calendarBtn) calendarBtn.className = "flex-1 py-2 px-1 rounded-xl text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200";
    if (memoBtn) memoBtn.className = "flex-1 py-2 px-1 rounded-xl text-[11px] font-extrabold bg-white dark:bg-slate-800 text-blue-600 shadow-sm";
    if (calendarPanel) calendarPanel.classList.add('hidden');
    if (memoPanel) memoPanel.classList.remove('hidden');
    renderQuickNotes();
  }
}

// Modul Modal Dialog
window.openAddAgendaModal = function() {
  const m = document.getElementById('add-agenda-modal');
  if (m) {
    m.classList.remove('opacity-0', 'pointer-events-none');
    m.children[0].classList.replace('scale-95', 'scale-100');
  }
}

window.closeAddAgendaModal = function() {
  const m = document.getElementById('add-agenda-modal');
  if (m) {
    m.classList.add('opacity-0', 'pointer-events-none');
    m.children[0].classList.replace('scale-100', 'scale-95');
  }
}

window.openAddMemoModal = function() {
  const m = document.getElementById('add-memo-modal');
  if (m) {
    m.classList.remove('opacity-0', 'pointer-events-none');
    m.children[0].classList.replace('scale-95', 'scale-100');
  }
}

window.closeAddMemoModal = function() {
  const m = document.getElementById('add-memo-modal');
  if (m) {
    m.classList.add('opacity-0', 'pointer-events-none');
    m.children[0].classList.replace('scale-100', 'scale-95');
  }
}

window.openAddLinkModal = function() {
  const m = document.getElementById('add-link-modal');
  if (m) {
    m.classList.remove('opacity-0', 'pointer-events-none');
    m.children[0].classList.replace('scale-95', 'scale-100');
  }
}

window.closeAddLinkModal = function() {
  const m = document.getElementById('add-link-modal');
  if (m) {
    m.classList.add('opacity-0', 'pointer-events-none');
    m.children[0].classList.replace('scale-100', 'scale-95');
  }
}

// --- TAB ASISTEN: AGENDA KERJA ---
function saveAgenda() { if (typeof secureSave === 'function') secureSave(CONFIG.STORAGE_PREFIX + 'agendas', agendaData); }

window.renderAgenda = function() {
  const c = document.getElementById('agenda-list-container');
  if (!c) return;
  
  const fragment = document.createDocumentFragment();
  const filterEl = document.getElementById('agenda-filter');
  const f = filterEl ? filterEl.value : 'semua';
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
    fragment.appendChild(d);
  });
  
  c.innerHTML = '';
  c.appendChild(fragment);
  updateCountdownTask();
}

window.addAgendaItem = function() {
  const input = document.getElementById('agenda-input-text');
  const t = input ? input.value.trim() : '';
  if(t) {
    agendaData.push({ id: 'ag-'+Date.now(), text: t, done: false, createdAt: Date.now() });
    saveAgenda();
    renderAgenda();
    closeAddAgendaModal();
    if (input) input.value = '';
    showToast("Tugas baru berhasil disimpan ke agenda!");
  }
}

window.toggleTaskDone = function(id) {
  const t = agendaData.find(x=>x.id===id);
  if(t) {
    t.done = !t.done;
    saveAgenda();
    renderAgenda();
  }
}

window.deleteAgendaItem = function(id) {
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

// --- TAB ASISTEN: KALENDER KERJA DENGAN MEMO AKTIF ---
window.initCalendar = function() {
  const names = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
  const y = currentDateObj.getFullYear();
  const m = currentDateObj.getMonth();
  const headerTitle = document.getElementById('calendar-month-year');
  if (headerTitle) headerTitle.textContent = `${names[m]} ${y}`;
  const c = document.getElementById('calendar-days-grid');
  if (!c) return;

  const fd = new Date(y, m, 1).getDay();
  const td = new Date(y, m+1, 0).getDate();
  const today = new Date();
  
  let htmlBuffer = [];
  
  for(let i=0; i<fd; i++) {
    htmlBuffer.push(`<div></div>`);
  }
  
  for(let d=1; d<=td; d++) {
    const isT = today.getDate()===d && today.getMonth()===m && today.getFullYear()===y;
    const dateStr = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const hasNote = notesData.some(n => n.date === dateStr);
    
    let itemClass = 'hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300';
    if (isT) {
      itemClass = 'bg-blue-600 text-white font-bold shadow-sm';
    } else if (hasNote) {
      itemClass = 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-bold';
    }
    
    const indicatorDot = (hasNote && !isT) ? `<span class="absolute bottom-0.5 left-1/2 -translate-x-1/2 block w-1 h-1 rounded-full bg-amber-500"></span>` : '';
    
    htmlBuffer.push(`
      <div onclick="showDateMemos('${d}', ${m}, ${y})" 
           class="p-1 rounded cursor-pointer transition-colors duration-150 relative ${itemClass}">
        ${d}
        ${indicatorDot}
      </div>
    `);
  }
  
  c.innerHTML = htmlBuffer.join('');
}

window.showDateMemos = function(day, month, year) {
  const names = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
  const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  const filteredMemos = notesData.filter(n => n.date === dateStr);
  const displayEl = document.getElementById('calendar-event-display');
  
  if (!displayEl) return;
  
  if (filteredMemos.length === 0) {
    displayEl.innerHTML = `<p class="text-[10px] text-slate-400 italic"><i class="fa-solid fa-info-circle text-blue-400"></i> Tidak ada memo pada tanggal ${day} ${names[month]} ${year}.</p>`;
  } else {
    let listHtml = `<div class="space-y-2"><p class="text-[10px] text-slate-500 font-black uppercase tracking-wide">📅 Memo ${day} ${names[month]}:</p>`;
    filteredMemos.forEach(n => {
      listHtml += `
        <div class="p-2 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl">
          <h5 class="text-[10px] font-black text-amber-800 dark:text-amber-400">${n.title}</h5>
          <p class="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">${n.body}</p>
        </div>
      `;
    });
    listHtml += `</div>`;
    displayEl.innerHTML = listHtml;
  }
}

window.prevMonth = function() { currentDateObj.setMonth(currentDateObj.getMonth()-1); initCalendar(); }
window.nextMonth = function() { currentDateObj.setMonth(currentDateObj.getMonth()+1); initCalendar(); }

// --- TAB ASISTEN: BUKU SAKU MEMO ---
window.renderQuickNotes = function() {
  const c = document.getElementById('quick-notes-list');
  if(!c) return;
  
  const fragment = document.createDocumentFragment();
  
  notesData.forEach(n => {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'p-3 border border-slate-150 dark:border-slate-700/60 rounded-xl bg-slate-50/50 dark:bg-slate-900/30 relative group font-sans';
    
    const dateFormatted = n.date ? n.date.split('-').reverse().join('/') : "-";
    
    const h5 = document.createElement('h5');
    h5.className = 'text-[10px] font-bold text-slate-800 dark:text-white flex items-center justify-between pr-4';
    h5.innerHTML = `<span>${n.title}</span> <span class="text-[8px] bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-slate-500">${dateFormatted}</span>`;
    
    const p = document.createElement('p');
    p.className = 'text-[9px] text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3 mt-1';
    p.textContent = n.body;
    
    const btn = document.createElement('button');
    btn.className = 'absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-rose-500 transition';
    btn.innerHTML = '<i class="fa-solid fa-trash text-[9px]"></i>';
    btn.onclick = () => {
      notesData = notesData.filter(x => x.id !== n.id);
      if (typeof secureSave === 'function') secureSave(CONFIG.STORAGE_PREFIX + 'notes', notesData);
      renderQuickNotes();
      initCalendar();
    };
    
    itemDiv.appendChild(h5);
    itemDiv.appendChild(p);
    itemDiv.appendChild(btn);
    fragment.appendChild(itemDiv);
  });
  
  c.innerHTML = '';
  c.appendChild(fragment);
}

window.addQuickNote = function() {
  const tEl = document.getElementById('note-title-input');
  const dEl = document.getElementById('note-date-input');
  const bEl = document.getElementById('note-body-input');
  const t = tEl ? tEl.value.trim() : '';
  const d = dEl ? dEl.value : '';
  const b = bEl ? bEl.value.trim() : '';
  
  if(t && d && b) {
    notesData.push({ id: 'n-'+Date.now(), title: t, date: d, body: b });
    if (typeof secureSave === 'function') secureSave(CONFIG.STORAGE_PREFIX + 'notes', notesData);
    renderQuickNotes();
    initCalendar();
    closeAddMemoModal();
    if(tEl) tEl.value = '';
    if(dEl) dEl.value = '';
    if(bEl) bEl.value = '';
    showToast("Memo catatan berhasil disimpan!");
  } else {
    showToast("Mohon lengkapi seluruh isian memo!", "warning");
  }
}

// --- TAB ASISTEN: BROADCAST WHATSAPP ---
window.populateWaSelect = function() {
  const s = document.getElementById('wa-template-select');
  if(s) {
    s.innerHTML = '';
    const fragment = document.createDocumentFragment();
    waTemplates.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.name;
      fragment.appendChild(opt);
    });
    s.appendChild(fragment);
  }
}

window.copyBroadcastMessage = function() {
  const select = document.getElementById('wa-template-select');
  const recInput = document.getElementById('wa-recipient-name');
  if(!select) return;
  const t = waTemplates.find(x=>x.id===select.value);
  if(t && typeof copyText === 'function') {
    copyText(t.text.replace(/{nama}/g, recInput ? recInput.value || "Bapak/Ibu Guru" : "Bapak/Ibu Guru"), "Pesan siaran WhatsApp berhasil disalin!");
  }
}

window.sendBroadcastWhatsApp = function() {
  const select = document.getElementById('wa-template-select');
  const recInput = document.getElementById('wa-recipient-name');
  if(!select) return;
  const t = waTemplates.find(x=>x.id===select.value);
  if(t) window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(t.text.replace(/{nama}/g, recInput ? recInput.value || "Bapak/Ibu Guru" : "Bapak/Ibu Guru"))}`, '_blank');
}

window.openTemplatesModal = function() {
  const m = document.getElementById('templates-modal');
  if (m) {
    m.classList.remove('opacity-0', 'pointer-events-none');
    m.children[0].classList.replace('scale-95', 'scale-100');
    renderTemplatesList();
  }
}

window.closeTemplatesModal = function() {
  const m = document.getElementById('templates-modal');
  if (m) {
    m.classList.add('opacity-0', 'pointer-events-none');
    m.children[0].classList.replace('scale-100', 'scale-95');
  }
}

window.renderTemplatesList = function() {
  const container = document.getElementById('templates-list-container');
  if(!container) return;
  
  const buffer = [];
  waTemplates.forEach(t => {
    buffer.push(`
      <div class="p-3 border dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 rounded-xl flex justify-between items-start gap-2 animate-fade-in">
        <div class="truncate flex-1">
          <h5 class="text-xs font-bold truncate text-slate-800 dark:text-white">${t.name}</h5>
          <!-- Perbaikan Typo: text-slate-505 diselaraskan menjadi text-slate-500 -->
          <p class="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">${t.text}</p>
        </div>
        <div class="flex gap-1.5 flex-shrink-0">
          <button onclick="editTemplate('${t.id}')" class="text-blue-500 hover:text-blue-700 transition" title="Ubah"><i class="fa-solid fa-pen-to-square"></i></button>
          <button onclick="deleteTemplate('${t.id}')" class="text-rose-500 hover:text-rose-700 transition" title="Hapus"><i class="fa-solid fa-trash-can"></i></button>
        </div>
      </div>
    `);
  });
  container.innerHTML = buffer.join('');
}

window.showAddTemplateForm = function() {
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

window.hideTemplateForm = function() {
  const lv = document.getElementById('templates-list-view');
  const fv = document.getElementById('template-form-view');
  if (lv && fv) {
    lv.classList.remove('hidden');
    fv.classList.add('hidden');
  }
}

window.saveTemplate = function() {
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
  if (typeof secureSave === 'function') secureSave(CONFIG.STORAGE_PREFIX + 'wa-templates', waTemplates);
  populateWaSelect();
  renderTemplatesList();
  hideTemplateForm();
  showToast("Template pesan berhasil disimpan!");
}

window.editTemplate = function(id) {
  const t = waTemplates.find(x => x.id === id);
  if(t) {
    showAddTemplateForm();
    document.getElementById('template-edit-id').value = t.id;
    document.getElementById('template-name-input').value = t.name;
    document.getElementById('template-text-input').value = t.text;
  }
}

window.deleteTemplate = function(id) {
  showCustomConfirm("Hapus Template?", "Template siaran pesan ini akan dihapus secara permanen.", () => {
    waTemplates = waTemplates.filter(x => x.id !== id);
    if (typeof secureSave === 'function') secureSave(CONFIG.STORAGE_PREFIX + 'wa-templates', waTemplates);
    populateWaSelect();
    renderTemplatesList();
    showToast("Template berhasil dihapus.");
  }, 'fa-trash-can');
}

// --- PWA OFFLINE DEPLOYMENT KIT DOWNLOADER ---
window.downloadPwaFile = function(fileType) {
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

window.registerMainServiceWorker = function() {
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
window.startCutOffCountdown = function() {
  if (typeof CONFIG === 'undefined' || !CONFIG.CUTOFF_DATE) return;
  const targetDate = new Date(CONFIG.CUTOFF_DATE).getTime();
  const daysEl = document.getElementById("countdown-days");
  const hoursEl = document.getElementById("countdown-hours");
  const minutesEl = document.getElementById("countdown-minutes");
  const secondsEl = document.getElementById("countdown-seconds");
  
  if (!daysEl || !hoursEl || !minutesEl || !secondsEl) return;

  function updateCountdown() {
    const now = Date.now();
    const distance = targetDate - now;

    if (distance < 0) {
      daysEl.textContent = "00";
      hoursEl.textContent = "00";
      minutesEl.textContent = "00";
      secondsEl.textContent = "00";
      return;
    }
    
    const d = Math.floor(distance / 86400000);
    const h = Math.floor((distance % 86400000) / 3600000);
    const m = Math.floor((distance % 3600000) / 60000);
    const s = Math.floor((distance % 60000) / 1000);
    
    daysEl.textContent = d < 10 ? '0' + d : d;
    hoursEl.textContent = h < 10 ? '0' + h : h;
    minutesEl.textContent = m < 10 ? '0' + m : m;
    secondsEl.textContent = s < 10 ? '0' + s : s;
  }
  
  updateCountdown();
  setInterval(updateCountdown, 1000);
}

const manifestJsonText = `{\n  "name": "DAPO-HUB SPENTIG",\n  "short_name": "DAPO-HUB",\n  "description": "Portal Integrasi Operator Dapodik & IT SMP Negeri 3 Makassar",\n  "start_url": "index.html",\n  "display": "standalone",\n  "background_color": "#f8fafc",\n  "theme_color": "#2563eb",\n  "icons": [\n    {\n      "src": "https://cdn-icons-png.flaticon.com/512/2210/2210143.png",\n      "sizes": "512x512",\n      "type": "image/png"\n    }\n  ]\n}`;

const serviceWorkerJsText = `
  const CACHE_NAME = 'dapohub-cache-v3';
  const ASSETS_TO_CACHE = [\n    './',\n    './index.html',\n    './manifest.json',\n    './css/style.css',\n    './js/utils.js',\n    './js/storage.js',\n    './js/otp.js',\n    './js/links.js',\n    './js/pdf-tools.js',\n    './js/ping-tools.js',\n    './js/speedtest.js',\n    './js/it-tools.js',\n    './js/ui.js',\n    './js/app.js',\n    'https://cdn.tailwindcss.com',\n    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',\n    'https://cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.8/html5-qrcode.min.js',\n    'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.2.0/crypto-js.min.js',\n    'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js',\n    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js'\n  ];\n  self.addEventListener('install', (e) => e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS_TO_CACHE))));\n  self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))));\n  self.addEventListener('fetch', (e) => {\n    if (!e.request.url.startsWith('http')) return;\n    e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request).catch(() => caches.match('./index.html'))));\n  });\n`;
