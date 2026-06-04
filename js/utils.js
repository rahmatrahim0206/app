// ==========================================================
// PORTAL UTILITIES, SECURITY SHIELD & CLIPBOARD ASSISTANT
// ==========================================================

/**
 * Menyalin teks ke papan klip secara aman menggunakan metode fallback textarea
 * untuk menjamin fungsionalitas tetap berjalan dalam lingkungan iframe / sandboxed.
 */
function copyText(text, successMessage = "Teks berhasil disalin!") {
  const tempTextArea = document.createElement("textarea");
  tempTextArea.value = text;
  tempTextArea.style.position = "fixed"; // Hindari scrolling halaman saat fokus
  tempTextArea.style.opacity = "0";
  document.body.appendChild(tempTextArea);
  tempTextArea.select();
  tempTextArea.setSelectionRange(0, 99999); // Untuk perangkat mobile

  try {
    const success = document.execCommand("copy");
    if (success) {
      showToast(successMessage, "success");
    } else {
      showToast("Gagal menyalin teks.", "warning");
    }
  } catch (err) {
    console.error("Kesalahan penyalinan teks: ", err);
    showToast("Kesalahan sistem saat menyalin teks.", "error");
  }

  document.body.removeChild(tempTextArea);
}

/**
 * MEMBLOKIR PINTASAN TOMBOL INSPEKSI (DEVELOPER TOOLS)
 * Memperbolehkan klik kanan agar fungsi copy-paste bawaan browser tetap bekerja.
 */
document.addEventListener('keydown', function(e) {
  // 1. Blokir Tombol F12 (Kode tombol: 123)
  if (e.keyCode === 123) {
    e.preventDefault();
    showToast("🔒 Akses F12 dinonaktifkan demi keamanan data.", "warning");
    return false;
  }

  // 2. Blokir kombinasi Ctrl+Shift+I atau Cmd+Option+I (Inspect)
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.keyCode === 73 || e.key === 'I' || e.key === 'i')) {
    e.preventDefault();
    showToast("🔒 Pintasan Inspeksi Elemen dinonaktifkan.", "warning");
    return false;
  }

  // 3. Blokir kombinasi Ctrl+Shift+J atau Cmd+Option+J (Console)
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.keyCode === 74 || e.key === 'J' || e.key === 'j')) {
    e.preventDefault();
    showToast("🔒 Akses Konsol Pengembang dibatasi.", "warning");
    return false;
  }

  // 4. Blokir kombinasi Ctrl+Shift+C atau Cmd+Option+C (Selector Tool)
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.keyCode === 67 || e.key === 'C' || e.key === 'c')) {
    e.preventDefault();
    showToast("🔒 Alat inspeksi visual dinonaktifkan.", "warning");
    return false;
  }

  // 5. Blokir kombinasi Ctrl+U atau Cmd+Option+U (View Source)
  if ((e.ctrlKey || e.metaKey) && (e.keyCode === 85 || e.key === 'U' || e.key === 'u')) {
    e.preventDefault();
    showToast("🔒 Akses kode sumber mentah dibatasi.", "warning");
    return false;
  }
});

/**
 * INFINITE DEBUGGER LOOP
 * Jika pengguna membuka DevTools via menu browser, script ini akan otomatis 
 * memaksa browser untuk pause (beku) sehingga kode internal tidak bisa dimanipulasi.
 */
(function() {
  const protectApp = function() {
    try {
      (function() {
        // Memicu debugger internal peramban jika konsol terbuka
        return false;
      }['constructor']('debugger')());
    } catch (err) {}
  };
  
  // Jalankan debugger secara berkala setiap 200ms
  setInterval(protectApp, 200);
})();
