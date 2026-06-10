// ==========================================================
// REAL-TIME AJAX LATENCY PING ENGINE FOR SATUAN PENDIDIKAN
// ==========================================================

var autoPingIntervalId = null;
var isAutoPingActive = true;

var targetServerEndpoints = [
  { id: "srv-dapo", name: "Dapodik Pusat (Beranda Portal)", url: "https://dapo.kemendikdasmen.go.id" },
  { id: "srv-vervalpd", name: "Pusdatin VervalPD (Siswa)", url: "https://vervalpd.data.kemendikdasmen.go.id" },
  { id: "srv-vervalptk", name: "Pusdatin VervalPTK (Guru)", url: "https://vervalptk.data.kemendikdasmen.go.id" },
  { id: "srv-spdatadik", name: "SP Datadik Satuan Pendidikan", url: "https://sp.datadik.kemendikdasmen.go.id" },
  { id: "srv-infogtk", name: "Info GTK (Validasi SKTP Guru)", url: "https://info.gtk.kemendikdasmen.go.id" },
  { id: "srv-pip", name: "Sipintar PIP Kemendikdasmen (Pusat)", url: "https://pip.kemendikdasmen.go.id" } 
];

// Menyelaraskan URL target uji latensi langsung dari database link kustom/sistem
function syncPingEndpointsWithLinks() {
  if (typeof linksData === 'undefined' || !Array.isArray(linksData)) return;

  // Pemetaan ID server ping ke ID tautan sistem di default-links.json
  const mapping = {
    "srv-dapo": "seed-1",
    "srv-vervalpd": "seed-11",
    "srv-vervalptk": "seed-10",
    "srv-spdatadik": "seed-2",
    "srv-infogtk": "seed-19",
    "srv-pip": "seed-15"
  };

  targetServerEndpoints.forEach(srv => {
    const targetLinkId = mapping[srv.id];
    if (targetLinkId) {
      const matchedLink = linksData.find(l => l.id === targetLinkId);
      if (matchedLink && matchedLink.url) {
        srv.url = matchedLink.url; // Gunakan URL terbaru dari linksData
      }
    }
  });
}

function initPingWorkspace() {
  syncPingEndpointsWithLinks();
  renderPingGridPlaceholder();
  pingAllEndpoints();
  
  if (isAutoPingActive) {
    startAutoPingInterval();
  } else {
    stopAutoPingInterval();
  }
}

function renderPingGridPlaceholder() {
  const container = document.getElementById('ping-grid-container');
  if (!container) return;
  container.innerHTML = "";
  
  targetServerEndpoints.forEach(srv => {
    const card = document.createElement('div');
    card.id = `card-${srv.id}`;
    card.className = "p-4 bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl flex items-center justify-between transition-all duration-300";
    card.innerHTML = `
      <div class="truncate pr-4 flex-1">
        <h4 class="text-xs font-black text-slate-900 dark:text-white truncate font-space">${srv.name}</h4>
        <p class="text-[9px] text-slate-400 dark:text-slate-500 truncate mt-0.5" title="${srv.url}">${srv.url}</p>
      </div>
      <div class="flex items-center gap-3 flex-shrink-0">
        <span id="label-${srv.id}" class="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-500 font-mono tracking-wider">MENGHUBUNGKAN...</span>
        <div id="dot-${srv.id}" class="w-2.5 h-2.5 rounded-full bg-slate-300 animate-pulse"></div>
      </div>
    `;
    container.appendChild(card);
  });
}

async function measureLatencyToEndpoint(srv) {
  const startTime = performance.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000); 

  try {
    await fetch(`${srv.url}/favicon.ico?nocache=${Date.now() + Math.random()}`, {
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    const duration = Math.round(performance.now() - startTime);
    updateServerCardStatus(srv.id, "success", duration);
  } catch (err) {
    clearTimeout(timeoutId);
    
    if (!navigator.onLine) {
      updateServerCardStatus(srv.id, "offline", null);
      return;
    }

    if (err.name === 'AbortError') {
      updateServerCardStatus(srv.id, "timeout", null);
    } else {
      const duration = Math.round(performance.now() - startTime);
      if (duration < 3000) {
        updateServerCardStatus(srv.id, "success", duration); 
      } else {
        updateServerCardStatus(srv.id, "error", null);
      }
    }
  }
}

function updateServerCardStatus(id, state, latency) {
  const card = document.getElementById(`card-${id}`);
  const label = document.getElementById(`label-${id}`);
  const dot = document.getElementById(`dot-${id}`);
  if (!card || !label || !dot) return;

  if (state === "success") {
    let colorClass = "";
    let badgeClass = "";
    let statusText = `${latency} ms`;

    if (latency < 150) {
      colorClass = "border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/10";
      badgeClass = "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400";
      dot.className = "w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm";
    } else if (latency >= 150 && latency <= 500) {
      colorClass = "border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/10";
      badgeClass = "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400";
      dot.className = "w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm";
    } else {
      colorClass = "border-rose-500/30 bg-rose-50/50 dark:bg-rose-950/10";
      badgeClass = "bg-rose-100 text-rose-800 dark:bg-rose-950/40 text-rose-400";
      dot.className = "w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm";
    }

    card.className = `p-4 bg-white dark:bg-slate-800 border rounded-2xl flex items-center justify-between transition-all duration-300 ${colorClass}`;
    label.className = `text-[9px] font-extrabold px-2.5 py-0.5 rounded-md font-mono tracking-wider ${badgeClass}`;
    label.textContent = statusText;
  } else if (state === "timeout") {
    card.className = "p-4 bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-900/40 bg-rose-50/20 dark:bg-rose-950/5 rounded-2xl flex items-center justify-between transition-all duration-300";
    label.className = "text-[9px] font-extrabold px-2 py-0.5 rounded-md font-mono bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-400 tracking-wider";
    label.textContent = "TIMEOUT";
    dot.className = "w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse";
  } else if (state === "offline") {
    card.className = "p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between transition-all duration-300";
    label.className = "text-[9px] font-extrabold px-2 py-0.5 rounded-md font-mono bg-slate-100 dark:bg-slate-900 text-slate-400 tracking-wider";
    label.textContent = "OFFLINE";
    dot.className = "w-2.5 h-2.5 rounded-full bg-slate-400";
  } else {
    card.className = "p-4 bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-900/40 rounded-2xl flex items-center justify-between transition-all duration-300";
    label.className = "text-[9px] font-extrabold px-2 py-0.5 rounded-md font-mono bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-400 tracking-wider";
    label.textContent = "RTO / DOWN";
    dot.className = "w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm";
  }
}

function pingAllEndpoints() {
  targetServerEndpoints.forEach(srv => {
    const label = document.getElementById(`label-${srv.id}`);
    const dot = document.getElementById(`dot-${srv.id}`);
    if (label && dot) {
      label.textContent = "MENGUJI...";
      label.className = "text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-400 font-mono tracking-wider";
      dot.className = "w-2.5 h-2.5 rounded-full bg-slate-300 animate-ping";
    }
    measureLatencyToEndpoint(srv);
  });
}

function startAutoPingInterval() {
  stopAutoPingInterval();
  autoPingIntervalId = setInterval(pingAllEndpoints, 10000);
  isAutoPingActive = true;
  updateAutoPingUI(true);
}

function stopAutoPingInterval() {
  if (autoPingIntervalId) {
    clearInterval(autoPingIntervalId);
    autoPingIntervalId = null;
  }
  isAutoPingActive = false;
  updateAutoPingUI(false);
}

function toggleAutoPing() {
  if (isAutoPingActive) {
    stopAutoPingInterval();
    if (typeof showToast === 'function') showToast("Monitoring otomatis dinonaktifkan.", "warning");
  } else {
    startAutoPingInterval();
    if (typeof showToast === 'function') showToast("Monitoring otomatis diaktifkan kembali.", "success");
  }
}

function updateAutoPingUI(isActive) {
  const btn = document.getElementById('btn-toggle-autoping');
  const icon = document.getElementById('icon-autoping');
  const text = document.getElementById('text-autoping');
  if (!btn || !icon || !text) return;

  if (isActive) {
    btn.className = "flex-1 md:flex-none px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md";
    icon.className = "fa-solid fa-stop";
    text.textContent = "Hentikan Auto";
  } else {
    btn.className = "flex-1 md:flex-none px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md";
    icon.className = "fa-solid fa-play animate-pulse";
    text.textContent = "Aktifkan Auto";
  }
}
