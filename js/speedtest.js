// ==========================================================
// REAL-TIME INTERNET SPEEDTEST (BANDWIDTH DETECTOR) ENGINE
// ==========================================================

// Sumber aset CDN yang diunduh untuk kalkulasi kecepatan (file ~2.4MB)
const SPEEDTEST_DOWNLOAD_URL = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.4.120/build/pdf.worker.min.js";
// Endpoint publik aman untuk pengujian unggahan biner (no-cors support)
const SPEEDTEST_UPLOAD_URL = "https://httpbin.org/post";

// Status pengujian internal
var isSpeedtestRunning = false;
var speedtestAbortController = null;

// Mengatur ulang tampilan antarmuka saat masuk tab Speedtest
function initSpeedtestWorkspace() {
  if (isSpeedtestRunning) return;
  resetSpeedtestUI();
}

// Reset data visual speedometer
function resetSpeedtestUI() {
  updateSpeedProgressRing(0);
  document.getElementById('speedtest-current-val').textContent = "0.0";
  document.getElementById('speedtest-current-status').textContent = "Siap Diuji";
  document.getElementById('speedtest-current-status').className = "inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-900 text-slate-500 mt-2";
  
  document.getElementById('speedtest-ping').textContent = "-";
  document.getElementById('speedtest-jitter').textContent = "Jitter: -";
  document.getElementById('speedtest-download').textContent = "-";
  document.getElementById('speedtest-upload').textContent = "-";
  
  const integrityBox = document.getElementById('speedtest-integrity-box');
  const integrityIcon = document.getElementById('speedtest-integrity-icon');
  const integrityTitle = document.getElementById('speedtest-integrity-title');
  const integrityDesc = document.getElementById('speedtest-integrity-desc');
  
  if (integrityBox && integrityIcon && integrityTitle && integrityDesc) {
    integrityBox.className = "p-4 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-150 dark:border-slate-700/50 flex items-start gap-4 shadow-sm";
    integrityIcon.className = "p-3 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-xl text-xl flex-shrink-0";
    integrityIcon.innerHTML = `<i class="fa-solid fa-circle-question"></i>`;
    integrityTitle.textContent = "Analisis Kelayakan Jaringan";
    integrityDesc.textContent = "Mulai uji kecepatan jaringan untuk mendeteksi kelayakan sinkronisasi Dapodik dan server ANBK sekolah.";
  }
}

// Mengubah visual cincin progress ring SVG speedometer (0 s.d 100 Mbps)
function updateSpeedProgressRing(speedMbps) {
  const ring = document.getElementById('speed-progress-ring');
  if (!ring) return;
  // Rumus hitung stroke-dashoffset: total keliling 660, offset 3/4 lingkaran = 495 (offset minimal) s.d 165 (offset maksimal)
  const maxOffset = 495;
  const minOffset = 165;
  const maxSpeedLimit = 100; // Limit speedometer 100 Mbps
  
  const ratio = Math.min(speedMbps / maxSpeedLimit, 1);
  const calculatedOffset = maxOffset - (ratio * (maxOffset - minOffset));
  
  ring.style.strokeDashoffset = calculatedOffset;
}

// Fungsi utama pengendali Speedtest
async function startInternetSpeedtest() {
  if (isSpeedtestRunning) {
    // Tombol berfungsi sebagai pembatal uji (Abort)
    if (speedtestAbortController) {
      speedtestAbortController.abort();
    }
    return;
  }

  isSpeedtestRunning = true;
  speedtestAbortController = new AbortController();
  
  const btn = document.getElementById('btn-start-speedtest');
  if (btn) {
    btn.innerHTML = `<i class="fa-solid fa-stop animate-spin-slow"></i> Hentikan Pengujian`;
    btn.className = "w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl transition shadow-lg flex items-center justify-center gap-2";
  }

  resetSpeedtestUI();
  
  try {
    // --- TAHAP 1: PENGUJIAN PING & JITTER ---
    document.getElementById('speedtest-current-status').textContent = "Menguji Latensi...";
    document.getElementById('speedtest-current-status').className = "inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 mt-2";
    
    const pingResults = [];
    for (let i = 0; i < 5; i++) {
      if (speedtestAbortController.signal.aborted) throw new Error("Aborted");
      const singlePing = await measureSinglePing();
      pingResults.push(singlePing);
      // Update nilai ping sementara
      document.getElementById('speedtest-ping').textContent = `${Math.round(singlePing)} ms`;
      await new Promise(r => setTimeout(r, 150));
    }
    
    const avgPing = Math.round(pingResults.reduce((a, b) => a + b, 0) / pingResults.length);
    let jitter = 0;
    for (let i = 1; i < pingResults.length; i++) {
      jitter += Math.abs(pingResults[i] - pingResults[i-1]);
    }
    jitter = Math.round(jitter / (pingResults.length - 1));
    
    document.getElementById('speedtest-ping').textContent = `${avgPing} ms`;
    document.getElementById('speedtest-jitter').textContent = `Jitter: ${jitter} ms`;

    // --- TAHAP 2: PENGUJIAN KECEPATAN UNDUH (DOWNLOAD) ---
    document.getElementById('speedtest-current-status').textContent = "Mengunduh Data...";
    document.getElementById('speedtest-current-status').className = "inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 mt-2 animate-pulse";
    
    const downloadSpeed = await runDownloadTest(speedtestAbortController.signal);
    document.getElementById('speedtest-download').textContent = downloadSpeed.toFixed(2);

    // --- TAHAP 3: PENGUJIAN KECEPATAN UNGGAH (UPLOAD) ---
    document.getElementById('speedtest-current-status').textContent = "Mengunggah Data...";
    document.getElementById('speedtest-current-status').className = "inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-500 mt-2 animate-pulse";
    
    const uploadSpeed = await runUploadTest(speedtestAbortController.signal);
    document.getElementById('speedtest-upload').textContent = uploadSpeed.toFixed(2);

    // --- TAHAP 4: ANALISIS HASIL & INTEGRASI SINKRONISASI ---
    document.getElementById('speedtest-current-status').textContent = "Selesai";
    document.getElementById('speedtest-current-status').className = "inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 mt-2";
    updateSpeedProgressRing(downloadSpeed);
    document.getElementById('speedtest-current-val').textContent = downloadSpeed.toFixed(1);
    
    analyzeBandwidthQuality(downloadSpeed, uploadSpeed, avgPing);

  } catch (err) {
    if (err.message === "Aborted") {
      showToast("Pengujian jaringan dibatalkan.", "warning");
    } else {
      console.error(err);
      showToast("Gagal melakukan pengetesan kecepatan internet.", "error");
    }
    resetSpeedtestUI();
  } finally {
    isSpeedtestRunning = false;
    speedtestAbortController = null;
    if (btn) {
      btn.innerHTML = `<i class="fa-solid fa-play"></i> Mulai Uji Kecepatan Jaringan (Speedtest)`;
      btn.className = "w-full py-3.5 bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white text-xs font-black rounded-xl transition shadow-lg flex items-center justify-center gap-2";
    }
  }
}

// Pengukur satu kali ping instan
async function measureSinglePing() {
  const start = performance.now();
  try {
    await fetch(`${SPEEDTEST_DOWNLOAD_URL}?t=${Date.now() + Math.random()}`, {
      method: "HEAD",
      cache: "no-store",
      mode: "no-cors"
    });
    return performance.now() - start;
  } catch (e) {
    return performance.now() - start; // Tetap kembalikan durasi transmisi
  }
}

// Uji Kecepatan Unduh Akurat Berbasis Aliran Byte Stream Reader
async function runDownloadTest(signal) {
  const response = await fetch(`${SPEEDTEST_DOWNLOAD_URL}?nocache=${Date.now() + Math.random()}`, {
    signal,
    cache: "no-store"
  });
  
  if (!response.body) throw new Error("ReadableStream tidak didukung");
  
  const reader = response.body.getReader();
  let receivedLength = 0;
  const startTime = performance.now();
  
  // Penampung riwayat kecepatan instan untuk kestabilan grafik ring
  const valDisplay = document.getElementById('speedtest-current-val');
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    receivedLength += value.length;
    const elapsedTime = (performance.now() - startTime) / 1000; // satuan detik
    
    if (elapsedTime > 0) {
      // Kecepatan Mbps = (Bytes * 8 bit) / (1024 * 1024) / Detik
      const currentMbps = (receivedLength * 8) / (1024 * 1024) / elapsedTime;
      if (valDisplay) valDisplay.textContent = currentMbps.toFixed(1);
      updateSpeedProgressRing(currentMbps);
    }
  }
  
  const totalTime = (performance.now() - startTime) / 1000;
  return (receivedLength * 8) / (1024 * 1024) / totalTime;
}

// Uji Kecepatan Unggah dengan Transmisi POST Biner
async function runUploadTest(signal) {
  // Buat dummy payload biner 1MB acak
  const dummyPayload = new Uint8Array(1024 * 1024);
  crypto.getRandomValues(dummyPayload);
  
  const startTime = performance.now();
  
  const response = await fetch(`${SPEEDTEST_UPLOAD_URL}?nocache=${Date.now()}`, {
    method: "POST",
    body: dummyPayload,
    signal,
    mode: "no-cors",
    cache: "no-store"
  });
  
  const totalTime = (performance.now() - startTime) / 1000;
  // Kecepatan Mbps = (1MB * 8 bit) / Detik
  return 8 / totalTime;
}

// Menganalisis Kelayakan Bandwidth Terhadap Aplikasi Dapodik
function analyzeBandwidthQuality(download, upload, ping) {
  const box = document.getElementById('speedtest-integrity-box');
  const icon = document.getElementById('speedtest-integrity-icon');
  const title = document.getElementById('speedtest-integrity-title');
  const desc = document.getElementById('speedtest-integrity-desc');
  
  if (!box || !icon || !title || !desc) return;
  
  if (download >= 15 && upload >= 5 && ping < 100) {
    // 🟢 KONEKSI SANGAT BAIK
    box.className = "p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-500/30 flex items-start gap-4 shadow-sm animate-fade-in";
    icon.className = "p-3 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-xl text-xl flex-shrink-0";
    icon.innerHTML = `<i class="fa-solid fa-circle-check"></i>`;
    title.textContent = "Koneksi Sangat Layak (Sangat Direkomendasikan)";
    desc.textContent = "Bandwidth koneksi Lab Komputer Anda sangat prima. Sangat aman digunakan untuk melakukan proses sinkronisasi massal Dapodik, unggahan berkas Verval masal, serta pelaksanaan ujian ANBK.";
  } else if (download >= 5 && upload >= 2 && ping < 200) {
    // 🟡 KONEKSI CUKUP
    box.className = "p-4 bg-amber-50 dark:bg-amber-950/20 rounded-2xl border border-amber-500/30 flex items-start gap-4 shadow-sm animate-fade-in";
    icon.className = "p-3 bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-xl text-xl flex-shrink-0";
    icon.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i>`;
    title.textContent = "Koneksi Cukup (Gunakan dengan Hati-Hati)";
    desc.textContent = "Koneksi cukup stabil untuk penjelajahan ringan dan edit data. Namun, jika ingin melakukan sinkronisasi Dapodik, pastikan tidak ada komputer client lain yang sedang mengunduh atau menonton video agar data tidak korup.";
  } else {
    // 🔴 KONEKSI BURUK
    box.className = "p-4 bg-rose-50 dark:bg-rose-950/20 rounded-2xl border border-rose-500/30 flex items-start gap-4 shadow-sm animate-fade-in";
    icon.className = "p-3 bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 rounded-xl text-xl flex-shrink-0";
    icon.innerHTML = `<i class="fa-solid fa-circle-xmark"></i>`;
    title.textContent = "Koneksi Buruk (Hindari Sinkronisasi Dapodik)";
    desc.textContent = "Bandwidth sangat minim atau latensi terlalu tinggi. Sangat berisiko memicu data sync corrupt atau time-out pengiriman biner Dapodik. Cari sinyal atau gunakan tethering ponsel cadangan yang lebih stabil.";
  }
}
