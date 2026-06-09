// ==========================================================
// REAL-TIME AJAX LATENCY PING ENGINE FOR SATUAN PENDIDIKAN
// ==========================================================

// State internal pelacak auto-ping interval
var autoPingIntervalId = null;
var isAutoPingActive = true;

// Daftar server tujuan pengujian latency kementerian (Datadik)
var targetServerEndpoints = [
  { id: "srv-dapo", name: "Dapodik Pusat (Beranda Portal)", url: "https://dapo.kemendikdasmen.go.id" },
  { id: "srv-vervalpd", name: "Pusdatin VervalPD (Siswa)", url: "https://vervalpd.data.kemendikdasmen.go.id" },
  { id: "srv-vervalptk", name: "Pusdatin VervalPTK (Guru)", url: "https://vervalptk.data.kemendikdasmen.go.id" },
  { id: "srv-spdatadik", name: "SP Datadik Satuan Pendidikan", url: "https://sp.datadik.kemendikdasmen.go.id" },
  { id: "srv-infogtk", name: "Info GTK (Validasi SKTP Guru)", url: "https://info.gtk.kemendikdasmen.go.id" },
  { id: "srv-erapor", name: "Server E-Rapor SMP (Sekolah)", url: "https://rapor.smpn3makassar.sch.id" } // Bersumber dinamis
];

// Mengambil URL rapor dari konfigurasi dinamis aplikasi
function updateDynamicRaporEndpoint() {
  const eraporSrv = targetServerEndpoints.find(s => s.id === "srv-erapor");
  if (eraporSrv && typeof CONFIG !== 'undefined' && CONFIG.RAPOR_URL) {
    eraporSrv.url = CONFIG.RAPOR_URL;
  }
}

// Inisialisasi awal saat panel Uji Latensi dibuka
function initPingWorkspace() {
  updateDynamicRaporEndpoint();
  renderPingGridPlaceholder();
  pingAllEndpoints();
  
  // Setel auto-ping jika status aktif
  if (isAutoPingActive) {
    startAutoPingInterval();
  } else {
    stopAutoPingInterval();
  }
}

// Render awal struktur card server
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

// Fungsi utama penakar latensi / ping asinkron
async function measureLatencyToEndpoint(srv) {
  const startTime = performance.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000); // Batas aman RTO 6 detik

  try {
    // Sisipkan parameter acak pencegah pembacaan cache lokal browser (Force reload network request)
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
    
    // Periksa status offline global browser
    if (!navigator.onLine) {
      updateServerCardStatus(srv.id, "offline", null);
      return;
    }

    if (err.name === 'AbortError') {
      updateServerCardStatus(srv.id, "timeout", null);
    } else {
      // Meskipun terjadi error CORS, waktu respons permintaan asinkron tetap mengindikasikan ketersediaan port
      const duration = Math.round(performance.now() - startTime);
      if (duration < 3000) {
        updateServerCardStatus(srv.id, "success", duration); // Asumsikan port terbuka / terjangkau
      } else {
        updateServerCardStatus(srv.id, "error", null);
      }
    }
  }
}

// Pembaru Tampilan Status Server
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
      dot.className = "w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50";
    } else if (latency >= 150 && latency <= 500) {
      colorClass = "border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/10";
      badgeClass = "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400";
      dot.className = "w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50";
    } else {
      colorClass = "border-rose-500/30 bg-rose-50/50 dark:bg-rose-950/10";
      badgeClass = "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400";
      dot.className = "w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50";
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

// Ping Massal Semua Endpoint
function pingAllEndpoints() {
  targetServerEndpoints.forEach(srv => {
    // Kembalikan status loading card sebelum ping dijalankan kembali
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

// Manajemen Auto-Ping 10 Detik
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
    showToast("Monitoring otomatis dinonaktifkan.", "warning");
  } else {
    startAutoPingInterval();
    showToast("Monitoring otomatis diaktifkan kembali.", "success");
  }
}

function updateAutoPingUI(isActive) {
  const btn = document.getElementById('btn-toggle-autoping');
  const icon = document.getElementById('icon-autoping');
  const text = document.getElementById('text-autoping');
  if (!btn || !icon || !text) return;

  if (isActive) {
    btn.className = "flex-1 sm:flex-none px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-md shadow-rose-500/10";
    icon.className = "fa-solid fa-stop";
    text.textContent = "Hentikan Auto";
  } else {
    btn.className = "flex-1 sm:flex-none px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/10";
    icon.className = "fa-solid fa-play animate-pulse";
    text.textContent = "Aktifkan Auto";
  }
}
