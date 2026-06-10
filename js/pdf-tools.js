// ==========================================================
// CLIENT-SIDE OFFLINE PDF PROCESSING WORKSPACE ENGINE
// ==========================================================

// State internal penyimpanan file sementara pengolahan PDF
var selectedMergeFiles = [];
var selectedSplitFile = null;
var selectedImgFiles = [];
var selectedWordFile = null;
var extractedPdfText = "";

// State khusus untuk Kompresor PDF Online Lokal
var selectedCompressFile = null;
var currentCompressionLevel = "medium"; // Pilihan bawaan: medium

// Inisialisasi awal Worker PDFJS untuk pembacaan teks PDF offline
if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
}

// Menghapus data input saat beralih ruang kerja
function resetPdfWorkspaces() {
  selectedMergeFiles = [];
  selectedSplitFile = null;
  selectedImgFiles = [];
  selectedWordFile = null;
  extractedPdfText = "";
  selectedCompressFile = null;
  currentCompressionLevel = "medium";
  
  const mergeList = document.getElementById('pdf-merge-list');
  if (mergeList) mergeList.innerHTML = '';
  
  const splitFn = document.getElementById('pdf-split-filename');
  if (splitFn) splitFn.textContent = "Unggah satu file PDF yang ingin dipisahkan";
  
  const compressFn = document.getElementById('pdf-compress-filename');
  if (compressFn) compressFn.textContent = "Tarik & Lepas File PDF disini";
  
  const compressInfo = document.getElementById('pdf-compress-info');
  if (compressInfo) compressInfo.classList.add('hidden');
  
  const imgPrev = document.getElementById('pdf-img-preview');
  if (imgPrev) imgPrev.innerHTML = '';
  
  const wordFn = document.getElementById('pdf-to-word-filename');
  if (wordFn) wordFn.textContent = "Pilih Berkas PDF yang ingin diekstrak ke Word (.doc)";
  
  const wordPrev = document.getElementById('pdf-word-preview-text');
  if (wordPrev) wordPrev.textContent = "Belum ada file yang dipilih...";
  
  const splitPages = document.getElementById('pdf-split-pages');
  if (splitPages) splitPages.value = '';
  
  const splitName = document.getElementById('pdf-split-name');
  if (splitName) splitName.value = '';
  
  const textBody = document.getElementById('pdf-text-input-body');
  if (textBody) textBody.value = '';
  
  const textFilename = document.getElementById('pdf-text-filename');
  if (textFilename) textFilename.value = '';

  // Menyetel ulang visual tombol pilihan kompresi ke setelan bawaan
  setCompressionLevel('medium');
}

// Beralih Tab Mini di dalam Menu PDF
function switchPdfSubTab(tabName) {
  const tabs = ['merge', 'split', 'compress', 'img2pdf', 'text2pdf', 'pdf2word'];
  tabs.forEach(t => {
    const btn = document.getElementById(`btn-pdf-${t}`);
    const panel = document.getElementById(`sub-pdf-${t}`);
    if (btn) {
      if (t === tabName) {
        btn.className = "flex-shrink-0 flex-1 py-2 px-3 rounded-xl text-xs font-black transition bg-white dark:bg-slate-800 text-blue-600 shadow-xs";
      } else {
        btn.className = "flex-shrink-0 flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition text-slate-500 hover:text-slate-800 dark:hover:text-slate-200";
      }
    }
    if (panel) {
      panel.classList.toggle('hidden', t !== tabName);
    }
  });
}

// --- LOGIKA KOMPRES PDF (COMPRESS) ---
function handleCompressFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;

  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith('.pdf');
  if (isPdf) {
    selectedCompressFile = file;
    
    // Konversi byte ukuran file agar ramah dibaca
    let fileSizeStr = (file.size / 1024).toFixed(1) + " KB";
    if (file.size > 1024 * 1024) {
      fileSizeStr = (file.size / (1024 * 1024)).toFixed(2) + " MB";
    }

    const filenameEl = document.getElementById('pdf-compress-filename');
    if (filenameEl) filenameEl.innerHTML = `<i class="fa-solid fa-file-zipper text-emerald-500 mr-1.5"></i>Dokumen Berhasil Dimuat`;

    const infoBox = document.getElementById('pdf-compress-info');
    const nameEl = document.getElementById('compress-file-name');
    const sizeEl = document.getElementById('compress-file-size');

    if (infoBox && nameEl && sizeEl) {
      infoBox.classList.remove('hidden');
      nameEl.textContent = file.name;
      sizeEl.textContent = fileSizeStr;
    }

    if (typeof showToast === 'function') showToast("File PDF berhasil dimuat untuk dikompres!", "success");
  } else {
    if (typeof showToast === 'function') showToast("Harap pilih berkas dengan format PDF!", "error");
    e.target.value = "";
  }
}

function setCompressionLevel(level) {
  currentCompressionLevel = level;
  const btnLow = document.getElementById('btn-compress-low');
  const btnMedium = document.getElementById('btn-compress-medium');
  const btnHigh = document.getElementById('btn-compress-high');

  if (!btnLow || !btnMedium || !btnHigh) return;

  // Atur ulang gaya kelas Tailwind untuk semua tombol kompresi
  const unselectedStyle = "py-2.5 px-3 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50";
  btnLow.className = unselectedStyle;
  btnMedium.className = unselectedStyle;
  btnHigh.className = unselectedStyle;

  // Setel warna biru terpilih untuk tingkat kualitas yang aktif
  if (level === 'low') {
    btnLow.className = "py-2.5 px-3 rounded-xl text-xs font-bold border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 shadow-xs text-center";
  } else if (level === 'medium') {
    btnMedium.className = "py-2.5 px-3 rounded-xl text-xs font-bold border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 shadow-xs text-center";
  } else if (level === 'high') {
    btnHigh.className = "py-2.5 px-3 rounded-xl text-xs font-bold border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 shadow-xs text-center";
  }
}

// Proses Kompresi PDF Menggunakan pdf.js (Renders to Canvas) dan pdf-lib (Re-embeds JPEGs)
async function processPdfCompression() {
  if (!selectedCompressFile) {
    if (typeof showToast === 'function') showToast("Harap pilih berkas PDF terlebih dahulu!", "warning");
    return;
  }

  if (typeof showToast === 'function') showToast("Memulai proses kompresi lokal... Mohon tunggu.", "warning");

  try {
    const { PDFDocument } = PDFLib;
    const arrayBuffer = await selectedCompressFile.arrayBuffer();
    
    // Muat dokumen PDF asli menggunakan pdf.js
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const totalPages = pdf.numPages;
    const compressedPdfDoc = await PDFDocument.create();

    // Atur parameter rasio skala & kualitas JPEG berdasarkan tingkat kompresi pilihan pengguna
    let scaleRatio = 1.0;
    let jpegQuality = 0.6; // Bawaan rekomendasi

    if (currentCompressionLevel === 'low') {
      scaleRatio = 1.5; // Kualitas tinggi
      jpegQuality = 0.8;
    } else if (currentCompressionLevel === 'medium') {
      scaleRatio = 1.0; // Standar
      jpegQuality = 0.5;
    } else if (currentCompressionLevel === 'high') {
      scaleRatio = 0.75; // Ukuran berkas paling hemat
      jpegQuality = 0.3;
    }

    // Melakukan rendering tiap halaman PDF asli ke Canvas lalu mengekstrak gambar JPEG terkompresi
    for (let i = 1; i <= totalPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: scaleRatio });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const renderContext = {
        canvasContext: ctx,
        viewport: viewport
      };

      await page.render(renderContext).promise;

      // Konversi hasil render kanvas menjadi biner gambar JPEG terkompresi
      const jpegDataUrl = canvas.toDataURL('image/jpeg', jpegQuality);
      const jpegBytes = await fetch(jpegDataUrl).then(res => res.arrayBuffer());

      // Sematkan gambar terkompresi ke dalam dokumen pdf-lib yang baru
      const embeddedImage = await compressedPdfDoc.embedJpg(jpegBytes);
      const { width, height } = embeddedImage.scale(1.0);
      const newPage = compressedPdfDoc.addPage([width, height]);
      
      newPage.drawImage(embeddedImage, {
        x: 0,
        y: 0,
        width: width,
        height: height
      });
    }

    const compressedBytes = await compressedPdfDoc.save();
    const cleanName = selectedCompressFile.name.replace(".pdf", "_terkompresi.pdf");
    
    // Eksekusi download langsung
    triggerBlobDownload(compressedBytes, cleanName, "application/pdf");
    if (typeof showToast === 'function') showToast("Kompresi selesai! File berhasil diperkecil.", "success");
    resetPdfWorkspaces();
  } catch (err) {
    console.error("Gagal melakukan kompresi PDF secara lokal:", err);
    if (typeof showToast === 'function') showToast("Gagal memproses kompresi dokumen PDF.", "error");
  }
}

// --- LOGIKA GABUNG PDF (MERGE) ---
function handleMergeFilesSelect(e) {
  const files = Array.from(e.target.files);
  let ignoredCount = 0;
  
  files.forEach(file => {
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith('.pdf');
    if (isPdf) {
      selectedMergeFiles.push(file);
    } else {
      ignoredCount++;
    }
  });
  
  if (ignoredCount > 0) {
    if (typeof showToast === 'function') showToast(`⚠️ ${ignoredCount} file diabaikan karena bukan format PDF.`, "warning");
  } else if (files.length > 0) {
    if (typeof showToast === 'function') showToast(`✅ Berhasil menambahkan ${files.length - ignoredCount} file PDF.`, "success");
  }
  
  renderMergeFilesList();
  e.target.value = ""; 
}

function renderMergeFilesList() {
  const container = document.getElementById('pdf-merge-list');
  if (!container) return;
  container.innerHTML = "";
  
  selectedMergeFiles.forEach((file, index) => {
    const item = document.createElement('div');
    item.className = "flex justify-between items-center p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 text-xs animate-fade-in";
    item.innerHTML = `
      <span class="truncate font-medium flex-1 pr-4"><i class="fa-solid fa-file-pdf text-rose-500 mr-1.5"></i>${index + 1}. ${file.name}</span>
      <button onclick="removeMergeFile(${index})" class="text-rose-500 hover:text-rose-700 transition p-1" title="Hapus dari antrean"><i class="fa-solid fa-circle-minus"></i></button>
    `;
    container.appendChild(item);
  });
}

function removeMergeFile(index) {
  selectedMergeFiles.splice(index, 1);
  renderMergeFilesList();
}

async function processPdfMerge() {
  if (selectedMergeFiles.length < 2) {
    if (typeof showToast === 'function') showToast("Pilih minimal 2 berkas PDF untuk digabungkan!", "warning");
    return;
  }
  
  if (typeof showToast === 'function') showToast("Sedang menggabungkan berkas PDF...", "warning");
  try {
    const { PDFDocument } = PDFLib;
    const mergedPdf = await PDFDocument.create();
    
    for (const file of selectedMergeFiles) {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    }
    
    const mergedPdfBytes = await mergedPdf.save();
    triggerBlobDownload(mergedPdfBytes, "dapohub_tergabung.pdf", "application/pdf");
    if (typeof showToast === 'function') showToast("Dokumen PDF berhasil digabungkan!", "success");
    resetPdfWorkspaces();
  } catch (err) {
    console.error("Gagal melakukan penggabungan PDF:", err);
    if (typeof showToast === 'function') showToast("Terjadi kegagalan menggabungkan berkas PDF.", "error");
  }
}

// --- LOGIKA PISAH PDF (SPLIT) ---
function handleSplitFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;

  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith('.pdf');
  if (isPdf) {
    selectedSplitFile = file;
    document.getElementById('pdf-split-filename').innerHTML = `<i class="fa-solid fa-file-pdf text-rose-500 mr-1.5"></i>${file.name}`;
    document.getElementById('pdf-split-name').value = file.name.replace(".pdf", "_bagian.pdf");
    if (typeof showToast === 'function') showToast("File PDF berhasil dimuat!", "success");
  } else {
    if (typeof showToast === 'function') showToast("Harap pilih berkas dengan format PDF!", "error");
    e.target.value = "";
  }
}

async function processPdfSplit() {
  if (!selectedSplitFile) {
    if (typeof showToast === 'function') showToast("Harap pilih berkas PDF terlebih dahulu!", "warning");
    return;
  }
  
  const pageRangeInput = document.getElementById('pdf-split-pages').value.trim();
  if (!pageRangeInput) {
    if (typeof showToast === 'function') showToast("Harap isi halaman yang ingin diekstrak!", "warning");
    return;
  }
  
  if (typeof showToast === 'function') showToast("Mengekstrak halaman...", "warning");
  try {
    const { PDFDocument } = PDFLib;
    const arrayBuffer = await selectedSplitFile.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const splitDoc = await PDFDocument.create();
    
    const totalPages = pdfDoc.getPageCount();
    const pagesToExtract = parsePageRanges(pageRangeInput, totalPages);
    
    if (pagesToExtract.length === 0) {
      if (typeof showToast === 'function') showToast("Rentang halaman tidak valid atau melebihi total halaman!", "error");
      return;
    }
    
    const copiedPages = await splitDoc.copyPages(pdfDoc, pagesToExtract.map(p => p - 1));
    copiedPages.forEach(page => splitDoc.addPage(page));
    
    const splitBytes = await splitDoc.save();
    let outName = document.getElementById('pdf-split-name').value.trim() || "ekstrak_halaman.pdf";
    if (!outName.endsWith(".pdf")) outName += ".pdf";
    
    triggerBlobDownload(splitBytes, outName, "application/pdf");
    if (typeof showToast === 'function') showToast("Halaman berhasil diekstrak!", "success");
    resetPdfWorkspaces();
  } catch (err) {
    console.error("Gagal memisahkan PDF:", err);
    if (typeof showToast === 'function') showToast("Gagal memisahkan berkas PDF.", "error");
  }
}

function parsePageRanges(text, maxPages) {
  const pages = [];
  const parts = text.split(',');
  for (let part of parts) {
    part = part.trim();
    if (part.includes('-')) {
      const range = part.split('-');
      const start = parseInt(range[0]);
      const end = parseInt(range[1]);
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = start; i <= end; i++) {
          if (i > 0 && i <= maxPages) pages.push(i);
        }
      }
    } else {
      const single = parseInt(part);
      if (!isNaN(single) && single > 0 && single <= maxPages) {
        pages.push(single);
      }
    }
  }
  return [...new Set(pages)].sort((a,b) => a-b);
}

// --- LOGIKA GAMBAR KE PDF (IMAGE TO PDF) ---
function handleImageSelect(e) {
  const files = Array.from(e.target.files);
  let ignoredCount = 0;

  files.forEach(file => {
    const isImg = file.type === "image/jpeg" || file.type === "image/jpg" || file.type === "image/png" || 
                  file.name.toLowerCase().endsWith('.jpg') || file.name.toLowerCase().endsWith('.jpeg') || 
                  file.name.toLowerCase().endsWith('.png');
    if (isImg) {
      selectedImgFiles.push(file);
    } else {
      ignoredCount++;
    }
  });
  
  if (ignoredCount > 0) {
    if (typeof showToast === 'function') showToast(`⚠️ ${ignoredCount} file diabaikan (Hanya mendukung gambar JPG/PNG).`, "warning");
  }
  
  renderImagePreviews();
  e.target.value = "";
}

function renderImagePreviews() {
  const container = document.getElementById('pdf-img-preview');
  if (!container) return;
  container.innerHTML = "";
  
  selectedImgFiles.forEach((file, index) => {
    const r = new FileReader();
    r.onload = (ev) => {
      const box = document.createElement('div');
      box.className = "relative group rounded-xl border overflow-hidden aspect-square bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 animate-fade-in";
      box.innerHTML = `
        <img src="${ev.target.result}" class="object-cover w-full h-full" />
        <button onclick="removeImgFile(${index})" class="absolute top-1 right-1 bg-rose-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] hover:bg-rose-700 transition" title="Hapus"><i class="fa-solid fa-times"></i></button>
      `;
      container.appendChild(box);
    };
    r.readAsDataURL(file);
  });
}

function removeImgFile(index) {
  selectedImgFiles.splice(index, 1);
  renderImagePreviews();
}

async function processImageToPdf() {
  if (selectedImgFiles.length === 0) {
    if (typeof showToast === 'function') showToast("Pilih minimal satu gambar!", "warning");
    return;
  }
  
  if (typeof showToast === 'function') showToast("Mengonversi gambar ke PDF...", "warning");
  try {
    const { PDFDocument } = PDFLib;
    const pdfDoc = await PDFDocument.create();
    
    for (const file of selectedImgFiles) {
      const arrayBuffer = await file.arrayBuffer();
      let embeddedImage;
      if (file.type === "image/jpeg" || file.type === "image/jpg" || file.name.toLowerCase().endsWith('.jpg') || file.name.toLowerCase().endsWith('.jpeg')) {
        embeddedImage = await pdfDoc.embedJpg(arrayBuffer);
      } else if (file.type === "image/png" || file.name.toLowerCase().endsWith('.png')) {
        embeddedImage = await pdfDoc.embedPng(arrayBuffer);
      }
      
      const { width, height } = embeddedImage.scale(1.0);
      const page = pdfDoc.addPage([width, height]);
      page.drawImage(embeddedImage, {
        x: 0,
        y: 0,
        width: width,
        height: height
      });
    }
    
    const pdfBytes = await pdfDoc.save();
    triggerBlobDownload(pdfBytes, "dapohub_gambar.pdf", "application/pdf");
    if (typeof showToast === 'function') showToast("Gambar berhasil di-compile ke PDF!", "success");
    resetPdfWorkspaces();
  } catch (err) {
    console.error("Gagal mengubah gambar ke PDF:", err);
    if (typeof showToast === 'function') showToast("Konversi gambar ke PDF gagal.", "error");
  }
}

// --- LOGIKA TEKS KE PDF ---
async function processTextToPdf() {
  const textContent = document.getElementById('pdf-text-input-body').value.trim();
  if (!textContent) {
    if (typeof showToast === 'function') showToast("Harap ketik atau tempelkan teks terlebih dahulu!", "warning");
    return;
  }
  
  if (typeof showToast === 'function') showToast("Membuat PDF dari teks...", "warning");
  try {
    const { PDFDocument, StandardFonts, rgb } = PDFLib;
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const margin = 50;
    const maxLineWidth = pageWidth - (margin * 2);
    const fontSize = 11;
    const lineHeight = fontSize * 1.5;
    
    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let currentY = pageHeight - margin;
    
    const paragraphs = textContent.split('\n');
    
    for (let para of paragraphs) {
      const words = para.split(' ');
      let line = "";
      
      for (let word of words) {
        const testLine = line + word + " ";
        const testWidth = font.widthOfTextAtSize(testLine, fontSize);
        
        if (testWidth > maxLineWidth && line !== "") {
          if (currentY < margin + lineHeight) {
            page = pdfDoc.addPage([pageWidth, pageHeight]);
            currentY = pageHeight - margin;
          }
          page.drawText(line.trim(), { x: margin, y: currentY, size: fontSize, font: font, color: rgb(0.1, 0.1, 0.1) });
          currentY -= lineHeight;
          line = word + " ";
        } else {
          line = testLine;
        }
      }
      
      if (line !== "") {
        if (currentY < margin + lineHeight) {
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          currentY = pageHeight - margin;
        }
        page.drawText(line.trim(), { x: margin, y: currentY, size: fontSize, font: font, color: rgb(0.1, 0.1, 0.1) });
        currentY -= lineHeight;
      }
      currentY -= lineHeight * 0.5; 
    }
    
    const pdfBytes = await pdfDoc.save();
    let filename = document.getElementById('pdf-text-filename').value.trim() || "dokumen_teks.pdf";
    if (!filename.endsWith(".pdf")) filename += ".pdf";
    
    triggerBlobDownload(pdfBytes, filename, "application/pdf");
    if (typeof showToast === 'function') showToast("PDF dari naskah teks berhasil diunduh!", "success");
    resetPdfWorkspaces();
  } catch (err) {
    console.error("Gagal mengonversi teks ke PDF:", err);
    if (typeof showToast === 'function') showToast("Gagal menghasilkan PDF dari naskah.", "error");
  }
}

// --- LOGIKA PDF KE WORD (PDF TO WORD TEXT EXTRACTION) ---
async function handlePdfToWordSelect(e) {
  const file = e.target.files[0];
  if (!file) return;

  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith('.pdf');
  if (isPdf) {
    selectedWordFile = file;
    document.getElementById('pdf-to-word-filename').innerHTML = `<i class="fa-solid fa-file-pdf text-rose-500 mr-1.5"></i>${file.name}`;
    
    const previewEl = document.getElementById('pdf-word-preview-text');
    if (previewEl) previewEl.textContent = "Membaca data teks file PDF...";
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(1);
      const textContent = await page.getTextContent();
      const firstPageText = textContent.items.map(item => item.str).join(' ');
      
      if (previewEl) {
        previewEl.textContent = firstPageText.substring(0, 150) + (firstPageText.length > 150 ? "..." : "");
      }
    } catch (err) {
      console.error("Gagal membaca preview PDF:", err);
      if (previewEl) previewEl.textContent = "Gagal memuat teks preview PDF.";
    }
  } else {
    if (typeof showToast === 'function') showToast("Harap pilih berkas dengan format PDF!", "error");
    e.target.value = "";
  }
}

async function processPdfToWord() {
  if (!selectedWordFile) {
    if (typeof showToast === 'function') showToast("Pilih berkas PDF terlebih dahulu!", "warning");
    return;
  }
  
  if (typeof showToast === 'function') showToast("Membaca seluruh teks PDF secara luring...", "warning");
  try {
    const arrayBuffer = await selectedWordFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullTextResult = "";
    
    // Algoritma Clustered Reading: Menyatukan koordinat Y secara presisi untuk memelihara paragraf Word asli
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // Mengelompokkan item teks berdasarkan koordinat Y (Baselines)
      const lineMap = {};
      textContent.items.forEach(item => {
        // y-coordinate adalah item.transform[5]
        const y = Math.round(item.transform[5] * 2) / 2; // toleransi setengah poin koordinat
        if (!lineMap[y]) lineMap[y] = [];
        lineMap[y].push(item);
      });
      
      // Mengurutkan baselines Y dari atas ke bawah (Y descending) dan urutkan teks horizontal (X ascending)
      const sortedBaselines = Object.keys(lineMap).map(Number).sort((a, b) => b - a);
      let pageText = "";
      
      sortedBaselines.forEach(y => {
        const lineItems = lineMap[y].sort((a, b) => a.transform[4] - b.transform[4]);
        const lineStr = lineItems.map(item => item.str).join(' ');
        pageText += lineStr + "\n";
      });
      
      fullTextResult += `[HALAMAN ${i}]\n\n${pageText}\n\n`;
    }
    
    if (!fullTextResult.trim()) {
      if (typeof showToast === 'function') showToast("Gagal mendeteksi teks. Berkas PDF ini mungkin hasil scan (berbentuk gambar).", "warning");
      return;
    }
    
    // Integrasi XML asli Microsoft Word Office Standard HTML Wrapper dengan dynamic footer page numbers
    const blobHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <title>Ekstraksi Dokumen DAPO-HUB</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          @page {
            size: 21cm 29.7cm; /* Ukuran A4 */
            margin: 2.5cm 2.5cm 2.5cm 2.5cm;
            mso-header-margin: 1.27cm;
            mso-footer-margin: 1.27cm;
            mso-footer: f1;
          }
          body {
            font-family: 'Segoe UI', Calibri, Arial, sans-serif;
            font-size: 11pt;
            line-height: 1.5;
            color: #111111;
          }
          p.MsoNormal {
            margin: 0in 0in 8pt 0in;
            text-align: justify;
          }
          div.MsoFooter {
            mso-element: footer;
            id: f1;
          }
          p.MsoFooterText {
            margin: 0in;
            text-align: center;
            font-size: 10pt;
            color: #666666;
            border-top: 1px solid #e0e0e0;
            padding-top: 5px;
          }
          .page-break {
            page-break-before: always;
            mso-special-character: page-break;
          }
        </style>
      </head>
      <body>
        <div style="white-space: pre-line;">
          ${fullTextResult.replace(/\[HALAMAN \d+\]/g, '<div class="page-break"></div>')}
        </div>
        
        <!-- Integrasi XML Penomoran Kertas Dinamis Microsoft Word Footer -->
        <div style="mso-element:footer" id="f1">
          <p class="MsoFooterText" align="center">
            Halaman <span style="mso-field-code: PAGE"></span> dari <span style="mso-field-code: NUMPAGES"></span>
          </p>
        </div>
      </body>
      </html>
    `;
    
    const docBytes = new TextEncoder().encode(blobHtml);
    const outName = selectedWordFile.name.replace(".pdf", "_ekstrak.doc");
    triggerBlobDownload(docBytes, outName, "application/msword");
    if (typeof showToast === 'function') showToast("Berkas Word (.doc) berhasil diunduh!", "success");
    resetPdfWorkspaces();
  } catch (err) {
    console.error("Gagal mengubah PDF ke Word:", err);
    if (typeof showToast === 'function') showToast("Proses konversi PDF ke Word gagal.", "error");
  }
}

// Pemicu Unduh Blob Data
function triggerBlobDownload(bytes, filename, mimeType) {
  const blob = new Blob([bytes], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
