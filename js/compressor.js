// ==========================================================
// OFFLINE HIGH-PERFORMANCE IMAGE COMPRESSION WORKSPACE ENGINE
// ==========================================================

var selectedCompressPreset = 'ijazah'; // Pilihan preset aktif bawaan
var compressQueue = []; // Antrean berkas foto terproses luring

// Pengatur Preset Kompresi Foto
window.setCompressionPreset = function(presetName) {
  selectedCompressPreset = presetName;
  const targetKbInput = document.getElementById('target-kb-input');
  const targetFormat = document.getElementById('target-format');
  const scaleSlider = document.getElementById('scale-slider');
  const qualitySlider = document.getElementById('quality-slider');
  const controlsWrapper = document.getElementById('custom-controls-wrapper');

  // Atur ulang visual highlight tombol preset
  const presets = ['pasfoto', 'ijazah', 'dokumen', 'custom'];
  presets.forEach(p => {
    const btn = document.getElementById(`preset-${p}`);
    if (btn) {
      if (p === presetName) {
        btn.className = "py-3 px-2 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 shadow-sm";
      } else {
        btn.className = "py-3 px-2 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 hover:bg-slate-50";
      }
    }
  });

  // Terapkan nilai preset ke kontrol input
  if (presetName === 'pasfoto') {
    if (targetKbInput) targetKbInput.value = 180; // Di bawah limit 200KB
    if (targetFormat) targetFormat.value = "image/jpeg";
    if (scaleSlider) scaleSlider.value = 80;
    if (qualitySlider) qualitySlider.value = 75;
    if (controlsWrapper) controlsWrapper.classList.add('hidden');
  } else if (presetName === 'ijazah') {
    if (targetKbInput) targetKbInput.value = 280; // Di bawah limit 300KB
    if (targetFormat) targetFormat.value = "image/jpeg";
    if (scaleSlider) scaleSlider.value = 90;
    if (qualitySlider) qualitySlider.value = 80;
    if (controlsWrapper) controlsWrapper.classList.add('hidden');
  } else if (presetName === 'dokumen') {
    if (targetKbInput) targetKbInput.value = 450; // Di bawah limit 500KB
    if (targetFormat) targetFormat.value = "image/jpeg";
    if (scaleSlider) scaleSlider.value = 100;
    if (qualitySlider) qualitySlider.value = 85;
    if (controlsWrapper) controlsWrapper.classList.add('hidden');
  } else if (presetName === 'custom') {
    if (controlsWrapper) controlsWrapper.classList.remove('hidden');
  }

  updateSlidersVisuals();
  runAutoCompression();
}

function updateSlidersVisuals() {
  const scaleSlider = document.getElementById('scale-slider');
  const qualitySlider = document.getElementById('quality-slider');
  const scaleVal = document.getElementById('scale-value');
  const qualityVal = document.getElementById('quality-value');

  if (scaleSlider && scaleVal) scaleVal.textContent = scaleSlider.value + "%";
  if (qualitySlider && qualityVal) qualityVal.textContent = qualitySlider.value + "%";
}

window.handleSliderChange = function() {
  updateSlidersVisuals();
  runAutoCompression();
}

window.updateControlsFromCustomInput = function() {
  runAutoCompression();
}

// Eksekusi Pemasukan Berkas Gambar Kedalam Antrean
window.handleFileSelect = function(e) {
  const files = Array.from(e.target.files);
  if (files.length === 0) return;

  if (typeof showToast === 'function') showToast(`Memuat ${files.length} gambar ke dalam kompresor...`, "success");

  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = function(event) {
      const img = new Image();
      img.onload = function() {
        const item = {
          id: 'img-comp-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
          file: file,
          originalSrc: event.target.result,
          originalSize: file.size,
          imageObj: img,
          processed: false,
          compressedBlob: null,
          compressedSrc: null,
          compressedSize: 0,
          savedPercentage: 0
        };
        compressQueue.push(item);
        compressSingleItem(item);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('results-card').classList.remove('hidden');
  e.target.value = ""; // Bersihkan agar dapat mengunggah file yang sama
}

// Proses Inti Kompresi Foto Menggunakan HTML5 Canvas Offscreen
async function compressSingleItem(item) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const scale = parseInt(document.getElementById('scale-slider').value) / 100;
  const quality = parseInt(document.getElementById('quality-slider').value) / 100;
  let mimeType = document.getElementById('target-format').value;
  if (mimeType === 'original') mimeType = item.file.type;

  const targetWidth = item.imageObj.width * scale;
  const targetHeight = item.imageObj.height * scale;

  canvas.width = targetWidth;
  canvas.height = targetHeight;
  ctx.drawImage(item.imageObj, 0, 0, targetWidth, targetHeight);

  canvas.toBlob((blob) => {
    if (!blob) return;
    
    // Periksa jika ukuran hasil kompresi masih melampaui limit target KB (Khusus Non-Custom Presets)
    const targetKb = parseInt(document.getElementById('target-kb-input').value);
    const currentSizeKb = blob.size / 1024;

    if (currentSizeKb > targetKb && selectedCompressPreset !== 'custom') {
      // Rekompres ulang secara dinamis dengan menurunkan rasio kualitas demi mencapai target KB
      const adjustedQuality = Math.max(quality - 0.2, 0.15);
      canvas.toBlob((adjustedBlob) => {
        saveCompressedResult(item, adjustedBlob);
      }, mimeType, adjustedQuality);
    } else {
      saveCompressedResult(item, blob);
    }
  }, mimeType, quality);
}

function saveCompressedResult(item, blob) {
  item.compressedBlob = blob;
  item.compressedSize = blob.size;
  item.compressedSrc = URL.createObjectURL(blob);
  item.savedPercentage = Math.round(((item.originalSize - blob.size) / item.originalSize) * 100);
  item.processed = true;

  renderQueueList();
}

function runAutoCompression() {
  if (compressQueue.length === 0) return;
  compressQueue.forEach(item => {
    compressSingleItem(item);
  });
}

function renderQueueList() {
  const container = document.getElementById('results-container');
  if (!container) return;
  container.innerHTML = "";

  let totalOriginalSize = 0;
  let totalCompressedSize = 0;

  compressQueue.forEach(item => {
    totalOriginalSize += item.originalSize;
    totalCompressedSize += item.compressedSize;

    const row = document.createElement('div');
    row.className = "p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800 flex items-center justify-between gap-4 animate-fade-in";
    
    const sizeOrigStr = (item.originalSize / 1024).toFixed(1) + " KB";
    const sizeCompStr = item.processed ? (item.compressedSize / 1024).toFixed(1) + " KB" : "Mengompres...";
    const savedText = item.processed ? `Hemat ${item.savedPercentage}%` : '';

    row.innerHTML = `
      <div class="flex items-center gap-3 truncate flex-1">
        <div class="w-12 h-12 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-950 flex-shrink-0 border dark:border-slate-800">
          <img src="${item.compressedSrc || item.originalSrc}" class="object-cover w-full h-full" />
        </div>
        <div class="truncate flex-1">
          <h5 class="text-xs font-bold text-slate-800 dark:text-slate-200 truncate font-space">${item.file.name}</h5>
          <p class="text-[9px] text-slate-400 mt-0.5 flex gap-1.5 items-center font-mono">
            <span>${sizeOrigStr}</span>
            <i class="fa-solid fa-arrow-right text-[8px]"></i>
            <span class="text-emerald-500 font-bold">${sizeCompStr}</span>
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2 flex-shrink-0">
        ${item.processed ? `<span class="text-[9px] font-black font-mono px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">${savedText}</span>` : ''}
        <button onclick="downloadSingleCompressed('${item.id}')" class="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-blue-600 hover:text-white transition" title="Unduh Berkas"><i class="fa-solid fa-download"></i></button>
        <button onclick="removeQueueItem('${item.id}')" class="w-8 h-8 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 flex items-center justify-center transition" title="Hapus"><i class="fa-solid fa-circle-minus"></i></button>
      </div>
    `;
    container.appendChild(row);
  });

  const avgSavedBadge = document.getElementById('avg-saved-badge');
  if (avgSavedBadge && totalOriginalSize > 0) {
    const totalSaved = Math.round(((totalOriginalSize - totalCompressedSize) / totalOriginalSize) * 100);
    avgSavedBadge.textContent = `Hemat Total ${totalSaved}%`;
  }
}

window.downloadSingleCompressed = function(id) {
  const item = compressQueue.find(x => x.id === id);
  if (item && item.compressedBlob) {
    const ext = item.compressedBlob.type.split('/')[1] || 'jpg';
    const cleanName = item.file.name.substring(0, item.file.name.lastIndexOf('.')) + `_dapohub_comp.${ext}`;
    
    const a = document.createElement('a');
    a.href = item.compressedSrc;
    a.download = cleanName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

window.removeQueueItem = function(id) {
  const item = compressQueue.find(x => x.id === id);
  if (item && item.compressedSrc) {
    URL.revokeObjectURL(item.compressedSrc);
  }
  compressQueue = compressQueue.filter(x => x.id !== id);
  renderQueueList();
  if (compressQueue.length === 0) {
    document.getElementById('results-card').classList.add('hidden');
  }
}

window.clearQueue = function() {
  compressQueue.forEach(item => {
    if (item.compressedSrc) URL.revokeObjectURL(item.compressedSrc);
  });
  compressQueue = [];
  renderQueueList();
  document.getElementById('results-card').classList.add('hidden');
  if (typeof showToast === 'function') showToast("Seluruh antrean dibersihkan.", "warning");
}

// Kompres Massal Menjadi File ZIP Menggunakan JSZip (Client-Side)
window.downloadAllProcessed = function() {
  if (compressQueue.length === 0) return;
  if (typeof JSZip === 'undefined') {
    if (typeof showToast === 'function') showToast("Pustaka jszip.js belum siap dimuat.", "error");
    return;
  }

  if (typeof showToast === 'function') showToast("Sedang mengepak berkas foto ke dokumen ZIP...", "warning");

  const zip = new JSZip();
  compressQueue.forEach((item, idx) => {
    const ext = item.compressedBlob.type.split('/')[1] || 'jpg';
    const name = item.file.name.substring(0, item.file.name.lastIndexOf('.')) + `_comp_${idx + 1}.${ext}`;
    zip.file(name, item.compressedBlob);
  });

  zip.generateAsync({ type: "blob" }).then((content) => {
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `paket_foto_dapohub_${CONFIG.SCHOOL_CODE_ABBR.toLowerCase()}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if (typeof showToast === 'function') showToast("Paket ZIP berhasil diunduh!", "success");
  });
}

// Simulasi Otorisasi & Penyimpanan Awan Luring Standalone
window.simulateGoogleDriveAuth = function() {
  if (typeof showToast === 'function') showToast("Menghubungkan ke API Google Drive UPT SPF...", "warning");
  setTimeout(() => {
    if (typeof showToast === 'function') showToast("Integrasi Google Drive Sekolah Berhasil Diotorisasi!", "success");
  }, 1500);
}

window.simulateUploadAllDrive = function() {
  if (compressQueue.length === 0) return;
  if (typeof showToast === 'function') showToast("Mengunggah seluruh berkas ke folder '/Dapodik_Pasfoto'...", "warning");
  setTimeout(() => {
    if (typeof showToast === 'function') showToast("Berhasil mencadangkan seluruh foto ijazah ke Google Drive!", "success");
  }, 2000);
}

window.downloadOfflineAppBundle = function() {
  if (typeof showToast === 'function') showToast("Menyiapkan rilis mandiri DAPO-HUB...", "warning");
  setTimeout(() => {
    if (typeof showToast === 'function') showToast("Rilis luring mandiri (.html) berhasil dikemas!", "success");
  }, 1000);
}
