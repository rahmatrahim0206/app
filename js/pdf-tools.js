// ==========================================================
// CLIENT-SIDE OFFLINE PDF PROCESSING WORKSPACE ENGINE
// ==========================================================

// State internal penyimpanan file sementara pengolahan PDF
var selectedMergeFiles = [];
var selectedSplitFile = null;
var selectedImgFiles = [];
var selectedWordFile = null;
var extractedPdfText = "";

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
  
  const mergeList = document.getElementById('pdf-merge-list');
  if (mergeList) mergeList.innerHTML = '';
  
  const splitFn = document.getElementById('pdf-split-filename');
  if (splitFn) splitFn.textContent = "Unggah satu file PDF yang ingin dipisahkan";
  
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
}

// Beralih Tab Mini di dalam Menu PDF
function switchPdfSubTab(tabName) {
  const tabs = ['merge', 'split', 'img2pdf', 'text2pdf', 'pdf2word'];
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
    showToast(`⚠️ ${ignoredCount} file diabaikan karena bukan format PDF.`, "warning");
  } else if (files.length > 0) {
    showToast(`✅ Berhasil menambahkan ${files.length - ignoredCount} file PDF.`, "success");
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
    showToast("Pilih minimal 2 berkas PDF untuk digabungkan!", "warning");
    return;
  }
  
  showToast("Sedang menggabungkan berkas PDF...", "warning");
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
    showToast("Dokumen PDF berhasil digabungkan!", "success");
    resetPdfWorkspaces();
  } catch (err) {
    console.error("Gagal melakukan penggabungan PDF:", err);
    showToast("Terjadi kegagalan menggabungkan berkas PDF.", "error");
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
    showToast("File PDF berhasil dimuat!", "success");
  } else {
    showToast("Harap pilih berkas dengan format PDF!", "error");
    e.target.value = "";
  }
}

async function processPdfSplit() {
  if (!selectedSplitFile) {
    showToast("Harap pilih berkas PDF terlebih dahulu!", "warning");
    return;
  }
  
  const pageRangeInput = document.getElementById('pdf-split-pages').value.trim();
  if (!pageRangeInput) {
    showToast("Harap isi halaman yang ingin diekstrak!", "warning");
    return;
  }
  
  showToast("Mengekstrak halaman...", "warning");
  try {
    const { PDFDocument } = PDFLib;
    const arrayBuffer = await selectedSplitFile.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const splitDoc = await PDFDocument.create();
    
    const totalPages = pdfDoc.getPageCount();
    const pagesToExtract = parsePageRanges(pageRangeInput, totalPages);
    
    if (pagesToExtract.length === 0) {
      showToast("Rentang halaman tidak valid atau melebihi total halaman!", "error");
      return;
    }
    
    const copiedPages = await splitDoc.copyPages(pdfDoc, pagesToExtract.map(p => p - 1));
    copiedPages.forEach(page => splitDoc.addPage(page));
    
    const splitBytes = await splitDoc.save();
    let outName = document.getElementById('pdf-split-name').value.trim() || "ekstrak_halaman.pdf";
    if (!outName.endsWith(".pdf")) outName += ".pdf";
    
    triggerBlobDownload(splitBytes, outName, "application/pdf");
    showToast("Halaman berhasil diekstrak!", "success");
    resetPdfWorkspaces();
  } catch (err) {
    console.error("Gagal memisahkan PDF:", err);
    showToast("Gagal memisahkan berkas PDF.", "error");
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
    showToast(`⚠️ ${ignoredCount} file diabaikan (Hanya mendukung gambar JPG/PNG).`, "warning");
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
    showToast("Pilih minimal satu gambar!", "warning");
    return;
  }
  
  showToast("Mengonversi gambar ke PDF...", "warning");
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
    showToast("Gambar berhasil di-compile ke PDF!", "success");
    resetPdfWorkspaces();
  } catch (err) {
    console.error("Gagal mengubah gambar ke PDF:", err);
    showToast("Konversi gambar ke PDF gagal.", "error");
  }
}

// --- LOGIKA TEKS KE PDF ---
async function processTextToPdf() {
  const textContent = document.getElementById('pdf-text-input-body').value.trim();
  if (!textContent) {
    showToast("Harap ketik atau tempelkan teks terlebih dahulu!", "warning");
    return;
  }
  
  showToast("Membuat PDF dari teks...", "warning");
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
    showToast("PDF dari naskah teks berhasil diunduh!", "success");
    resetPdfWorkspaces();
  } catch (err) {
    console.error("Gagal mengonversi teks ke PDF:", err);
    showToast("Gagal menghasilkan PDF dari naskah.", "error");
  }
}

// --- LOGIKA UTAMA: PDF KE WORD (PDF TO WORD) DENGAN ALGORITMA REKONSTRUKSI 2D ---
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
      
      // Ambil sedikit potongan teks di awal sebagai visual preview instan
      let previewText = textContent.items.slice(0, 15).map(item => item.str).join(' ');
      if (previewEl) {
        previewEl.textContent = previewText.trim() ? previewText.substring(0, 180) + "..." : "Tidak ada teks terbaca di halaman pertama.";
      }
    } catch (err) {
      console.error("Gagal membaca preview PDF:", err);
      if (previewEl) previewEl.textContent = "Gagal memuat teks preview PDF.";
    }
  } else {
    showToast("Harap pilih berkas dengan format PDF!", "error");
    e.target.value = "";
  }
}

async function processPdfToWord() {
  if (!selectedWordFile) {
    showToast("Pilih berkas PDF terlebih dahulu!", "warning");
    return;
  }
  
  showToast("Menganalisis tata letak & struktur paragraf...", "warning");
  try {
    const arrayBuffer = await selectedWordFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let htmlPagesContent = "";
    
    for (let pNum = 1; pNum <= pdf.numPages; pNum++) {
      const page = await pdf.getPage(pNum);
      const textContent = await page.getTextContent();
      const items = textContent.items.filter(item => item.str && item.str.trim() !== '');
      
      if (items.length === 0) {
        htmlPagesContent += `
          <!-- Halaman ${pNum} -->
          <p class="MsoNormal" style="color: #9ca3af; font-style: italic; text-align: center;">Tidak ada teks terdeteksi di halaman ${pNum} (Halaman Gambar/Kosong).</p>
        `;
        if (pNum < pdf.numPages) {
          htmlPagesContent += `<br clear="all" style="page-break-before: always; mso-break-type: section-break;" />`;
        }
        continue;
      }

      // Tahap 1: Dynamic Row Clustering berdasarkan Baseline Y-coordinate
      // PDF.js seringkali membaca teks secara acak. Kita urutkan Y secara vertikal menurun (atas ke bawah).
      items.sort((a, b) => b.transform[5] - a.transform[5]);
      
      let rows = [];
      let currentRow = [];
      let currentY = items[0].transform[5];
      
      for (let item of items) {
        let y = item.transform[5];
        let fontSize = Math.abs(item.transform[3]); 
        
        // Jarak batas toleransi baseline dinamis disesuaikan dengan 60% ukuran huruf aktif
        let threshold = fontSize * 0.6;
        if (threshold < 4.5) threshold = 4.5;
        
        if (Math.abs(currentY - y) <= threshold) {
          currentRow.push(item);
        } else {
          rows.push({
            y: currentY,
            fontSize: Math.abs(currentRow[0].transform[3]),
            items: currentRow
          });
          currentRow = [item];
          currentY = y;
        }
      }
      if (currentRow.length > 0) {
        rows.push({
          y: currentY,
          fontSize: Math.abs(currentRow[0].transform[3]),
          items: currentRow
        });
      }

      // Tahap 2: Urutkan setiap baris secara horizontal (X-coordinate) dan rekatkan suku kata
      let pageLines = [];
      for (let row of rows) {
        row.items.sort((a, b) => a.transform[4] - b.transform[4]);
        
        let rowText = "";
        for (let i = 0; i < row.items.length; i++) {
          let item = row.items[i];
          let str = item.str;
          
          if (i === 0) {
            rowText += str;
          } else {
            let prevItem = row.items[i - 1];
            // Hitung lebar fisik celah horizontal antara item sebelumnya dan sekarang
            let prevRightEdge = prevItem.transform[4] + prevItem.width;
            let currentLeftEdge = item.transform[4];
            let gap = currentLeftEdge - prevRightEdge;
            
            // Rekatkan tanpa spasi jika celahnya sempit (suku kata/huruf terpecah)
            if (gap < 2.2) {
              rowText += str;
            } else {
              // Tambahkan spasi normal jika ada jeda kata
              if (rowText.endsWith(' ') || str.startsWith(' ')) {
                rowText += str;
              } else {
                rowText += ' ' + str;
              }
            }
          }
        }
        
        rowText = rowText.replace(/\s+/g, ' ');
        if (rowText.trim().length > 0) {
          pageLines.push({
            text: rowText.trim(),
            y: row.y,
            fontSize: row.fontSize
          });
        }
      }

      // Tahap 3: Gabungkan baris-baris terfragmentasi menjadi satu aliran naskah paragraf mengalir
      let paragraphs = [];
      let currentPara = "";
      
      for (let i = 0; i < pageLines.length; i++) {
        let line = pageLines[i];
        let text = line.text;
        
        if (currentPara === "") {
          currentPara = text;
        } else {
          let prevLine = pageLines[i - 1];
          let yGap = Math.abs(prevLine.y - line.y);
          let expectedHeight = prevLine.fontSize * 1.8; // Standar line spacing PDF
          
          let isNewParagraph = false;
          // Buat paragraf baru jika jarak vertikal sangat jauh, atau baris sebelumnya diakhiri titik/tanda baca akhir
          if (yGap > expectedHeight * 1.35) {
            isNewParagraph = true;
          } else if (/[.:?!"']$/.test(prevLine.text) && yGap > expectedHeight * 1.05) {
            isNewParagraph = true;
          }
          
          if (isNewParagraph) {
            paragraphs.push({
              text: currentPara,
              fontSize: prevLine.fontSize
            });
            currentPara = text;
          } else {
            // Sambung baris aktif dengan perlakuan khusus kata hubung di ujung baris (-)
            if (currentPara.endsWith('-')) {
              currentPara = currentPara.slice(0, -1) + text;
            } else {
              currentPara += " " + text;
            }
          }
        }
      }
      if (currentPara !== "") {
        let lastLine = pageLines[pageLines.length - 1];
        paragraphs.push({
          text: currentPara,
          fontSize: lastLine ? lastLine.fontSize : 11
        });
      }

      // Tahap 4: Susun kode HTML Word Mso-Style yang rapi dan elegan
      let pageHtml = "";
      paragraphs.forEach(para => {
        let text = para.text.replace(/\s+/g, ' ').trim();
        if (text.length === 0) return;
        
        // Deteksi Judul / Kop Formal (Ciri: Ukuran font besar, kapital penuh, atau baris singkat)
        let isHeading = false;
        if (para.fontSize > 13.5) {
          isHeading = true;
        } else if (text.length < 90 && (text === text.toUpperCase() || text.startsWith("BAB ") || text.startsWith("KEMENTERIAN") || text.startsWith("KEPUTUSAN") || text.startsWith("PEMERINTAH"))) {
          isHeading = true;
        }
        
        if (isHeading) {
          pageHtml += `<p class="MsoHeading" style="margin-top: 14pt; margin-bottom: 6pt; font-family: 'Segoe UI', Arial, sans-serif; font-size: ${para.fontSize > 12 ? para.fontSize : 12.5}pt; font-weight: bold; text-align: center; color: #111827; line-height: 1.25;">${text}</p>`;
        } else {
          // Format Paragraf Normal yang Justify dengan indentasi khas naskah resmi Microsoft Word
          pageHtml += `<p class="MsoNormal" style="margin-top: 0in; margin-bottom: 8pt; text-align: justify; font-family: 'Calibri', Arial, sans-serif; font-size: 11pt; line-height: 1.25; text-indent: 0.35in; color: #1f2937;">${text}</p>`;
        }
      });
      
      htmlPagesContent += `
        <!-- Halaman ${pNum} -->
        <div style="margin-bottom: 24pt;">
          ${pageHtml}
        </div>
      `;
      
      // Sisipkan Pembagi Halaman Fisik Asli MS Word (Page Break)
      if (pNum < pdf.numPages) {
        htmlPagesContent += `<br clear="all" style="page-break-before: always; mso-break-type: section-break;" />`;
      }
    }
    
    if (!htmlPagesContent.replace(/<[^>]*>/g, '').trim()) {
      showToast("Gagal mendeteksi teks. Berkas PDF ini mungkin hasil scan (berbentuk gambar).", "warning");
      return;
    }

    // Konstruksi templat dokumen standar Microsoft Word dengan integrasi @page dan Mso Stylesheet
    const blobHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
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
          @page Section1 {
            size: 595.3pt 841.9pt; /* Ukuran Kertas A4 Resmi */
            margin: 72.0pt 72.0pt 72.0pt 72.0pt; /* Margin Standar 1 Inci (Sekitar 2.54cm) */
            mso-header-margin: 36.0pt;
            mso-footer-margin: 36.0pt;
            mso-header: h1;
            mso-footer: f1;
            mso-paper-source: 0;
          }
          div.Section1 {
            page: Section1;
          }
          /* Pengaturan global MS Word Class Stylesheet */
          p.MsoNormal, li.MsoNormal, div.MsoNormal {
            mso-style-parent: "";
            margin: 0in;
            margin-bottom: 8pt;
            mso-pagination: widow-orphan;
            font-size: 11.0pt;
            font-family: "Calibri", sans-serif;
            mso-ascii-font-family: Calibri;
            mso-hansi-font-family: Calibri;
            mso-bidi-font-family: "Times New Roman";
            line-height: 1.15;
          }
          p.MsoHeading {
            margin-top: 14.0pt;
            margin-bottom: 6.0pt;
            mso-pagination: widow-orphan;
            page-break-after: avoid;
            font-size: 12.0pt;
            font-family: "Segoe UI", sans-serif;
            font-weight: bold;
          }
          p.MsoHeader, p.MsoFooter {
            margin: 0in;
            mso-pagination: widow-orphan;
            font-size: 8.5pt;
            font-family: "Segoe UI", sans-serif;
          }
          body {
            font-family: 'Calibri', 'Arial', sans-serif;
            font-size: 11pt;
            color: #1f2937;
            background-color: #ffffff;
          }
        </style>
      </head>
      <body>
        <!-- Elemen Header & Footer Asli MS Word (Akan disembunyikan dalam halaman dan masuk ke sistem Footer asli) -->
        <div style="mso-element:header" id="h1">
          <p class="MsoHeader" style="text-align: right; border-bottom: 0.5pt solid #e5e7eb; padding-bottom: 3px; color: #9ca3af; text-transform: uppercase; font-weight: bold;">Dokumen Hasil Ekstraksi Dapodik</p>
        </div>
        <div style="mso-element:footer" id="f1">
          <p class="MsoFooter" style="text-align: center; color: #9ca3af; border-top: 0.5pt solid #e5e7eb; padding-top: 3px;">
            Halaman <span style="mso-field-code:'PAGE'"></span> dari <span style="mso-field-code:'NUMPAGES'"></span>
          </p>
        </div>
        
        <div class="Section1">
          ${htmlPagesContent}
        </div>
      </body>
      </html>
    `;
    
    const docBytes = new TextEncoder().encode(blobHtml);
    const outName = selectedWordFile.name.replace(".pdf", "_ekstrak.doc");
    triggerBlobDownload(docBytes, outName, "application/msword");
    showToast("Berkas Word (.doc) berhasil diunduh!", "success");
    resetPdfWorkspaces();
  } catch (err) {
    console.error("Gagal mengubah PDF ke Word:", err);
    showToast("Proses konversi PDF ke Word gagal.", "error");
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
