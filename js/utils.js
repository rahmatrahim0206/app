// ==========================================================
// UTILITY FUNCTIONS, CLOCK, THEME, AND IDLE CONTROL
// ==========================================================

// Fungsi Salin Teks ke Clipboard (Aman untuk iFrame Sandbox)
function copyText(textToCopy, successMessage) {
  const dummy = document.createElement('textarea');
  dummy.value = textToCopy;
  document.body.appendChild(dummy);
  dummy.select();
  document.execCommand('copy');
  document.body.removeChild(dummy);
  if (typeof showToast === 'function') {
    showToast(successMessage || "Teks berhasil disalin!");
  }
}

// Fungsi Acak Kata Sandi Aman
function generateSecurePassword() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+\";";
  let pass = "";
  for (let i = 0; i < 12; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const pwInput = document.getElementById('generated-password-input');
  if (pwInput) pwInput.value = pass;
}

function copyGeneratedPassword() {
  const pwInput = document.getElementById('generated-password-input');
  if (pwInput && pwInput.value) {
    copyText(pwInput.value, "Kata sandi aman berhasil disalin!");
  }
}

// Pembaruan Jam & Hari WITA Aktif
function updateClock() {
  const timeDisplay = document.getElementById('header-time');
  const dateDisplay = document.getElementById('header-date');
  if (!timeDisplay || !dateDisplay) return;
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const witaDate = new Date(utc + (3600000 * 8)); 
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  timeDisplay.textContent = `${String(witaDate.getHours()).padStart(2, '0')}:${String(witaDate.getMinutes()).padStart(2, '0')}:${String(witaDate.getSeconds()).padStart(2, '0')} WITA`;
  dateDisplay.textContent = `${days[witaDate.getDay()]}, ${witaDate.getDate()} ${months[witaDate.getMonth()]} ${witaDate.getFullYear()}`;
}

// Pengatur Tema Gelap/Terang
function toggleTheme() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  const icon = document.getElementById('theme-icon');
  if (icon) icon.className = isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  if (typeof initCalendar === 'function') initCalendar();
}

// Penunjuk Status Jaringan Online/Offline
function updateOnlineStatus(isOnline) {
  const bdg = document.getElementById('status-badge');
  const icn = document.getElementById('status-badge-icon');
  const txtBdg = document.getElementById('status-text-badge');
  const plse = document.getElementById('status-pulse-dot');
  const lbl = document.getElementById('status-label');
  if (!bdg || !icn || !txtBdg || !plse || !lbl) return;
  if (isOnline) {
    bdg.className = "absolute -bottom-1 -right-1 block h-5 w-5 rounded-full ring-4 ring-white dark:ring-slate-800 bg-emerald-500 flex items-center justify-center text-[10px] text-white font-bold transition-colors";
    icn.className = "fa-solid fa-cloud-arrow-up animate-pulse";
    txtBdg.className = "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 border border-emerald-200/50";
    plse.className = "w-1.5 h-1.5 mr-1.5 rounded-full bg-emerald-500 animate-pulse";
    lbl.textContent = "Online";
  } else {
    bdg.className = "absolute -bottom-1 -right-1 block h-5 w-5 rounded-full ring-4 ring-white dark:ring-slate-800 bg-amber-500 flex items-center justify-center text-[10px] text-white font-bold transition-colors";
    icn.className = "fa-solid fa-hard-drive";
    txtBdg.className = "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 border border-amber-200/50";
    plse.className = "w-1.5 h-1.5 mr-1.5 rounded-full bg-amber-500";
    lbl.textContent = "Luring (Lokal)";
  }
}

// Detektor Kunci Layar Otomatis
function resetIdleTimer() { 
  if (!sessionLocked) idleTimeCounter = 0; 
}

function lockUserSession() {
  sessionLocked = true;
  const screen = document.getElementById('idle-lock-screen');
  const card = document.getElementById('lock-card');
  if (screen && card) {
    screen.classList.replace('pointer-events-none', 'pointer-events-auto');
    screen.classList.replace('opacity-0', 'opacity-100');
    card.classList.replace('scale-95', 'scale-100');
  }
}

function unlockSession() {
  sessionLocked = false;
  idleTimeCounter = 0;
  const screen = document.getElementById('idle-lock-screen');
  const card = document.getElementById('lock-card');
  if (screen && card) {
    screen.classList.replace('pointer-events-auto', 'pointer-events-none');
    screen.classList.replace('opacity-100', 'opacity-0');
    card.classList.replace('scale-100', 'scale-95');
    if (typeof showToast === 'function') {
      showToast("Sesi kerja berhasil dipulihkan!", "success");
    }
  }
}

// --- PERBAIKAN SISTEM PROTEKSI & SALIN (COPY-PASTE) ---

// 1. Mencegah Klik Kanan (Context Menu) di Seluruh Area Aplikasi Secara Mutlak (Termasuk INPUT dan TEXTAREA)
document.addEventListener('contextmenu', function(e) {
  e.preventDefault();
  if (typeof showToast === 'function') {
    showToast("⚠️ Klik kanan dinonaktifkan demi keamanan kredensial dan perlindungan kode.", "warning");
  }
});

// 2. SISTEM MONITOR TOMBOL PINTAS: Memblokir DevTools/Inspeksi, Mengizinkan Ctrl+C (Menyalin) & Ctrl+D (Bookmark/Pengingat Aman)
document.addEventListener('keydown', function(e) {
  // A. Blokir tombol F12 (Developer Tools)
  if (e.keyCode === 123) {
    e.preventDefault();
    if (typeof showToast === 'function') showToast("⚠️ Developer tools dinonaktifkan.", "error");
    return false;
  }
  
  // B. Blokir Ctrl+Shift+I (Inspeksi Elemen)
  if (e.ctrlKey && e.shiftKey && e.keyCode === 73) {
    e.preventDefault();
    if (typeof showToast === 'function') showToast("⚠️ Inspeksi elemen dilarang.", "error");
    return false;
  }
  
  // C. Blokir Ctrl+Shift+J (Akses Konsol DevTools)
  if (e.ctrlKey && e.shiftKey && e.keyCode === 74) {
    e.preventDefault();
    if (typeof showToast === 'function') showToast("⚠️ Akses konsol dinonaktifkan.", "error");
    return false;
  }

  // D. Blokir Ctrl+Shift+C (Inspeksi melalui Kursor Element Selector)
  if (e.ctrlKey && e.shiftKey && e.keyCode === 67) {
    e.preventDefault();
    if (typeof showToast === 'function') showToast("⚠️ Fitur inspeksi dinonaktifkan.", "error");
    return false;
  }
  
  // E. Blokir Ctrl+U (Akses Source Code)
  if (e.ctrlKey && e.keyCode === 85) {
    e.preventDefault();
    if (typeof showToast === 'function') showToast("⚠️ Akses kode sumber dinonaktifkan.", "error");
    return false;
  }

  // F. Izinkan Ctrl+C Biasa (Menyalin Teks)
  if (e.ctrlKey && !e.shiftKey && e.keyCode === 67) {
    // Membiarkan peramban menyalin data clipboard secara normal dan aman
    setTimeout(() => {
      if (typeof showToast === 'function') {
        showToast("📋 Teks berhasil disalin ke papan klip!", "success");
      }
    }, 50);
  }
  
  // G. Izinkan Ctrl+D (Pintasan Bookmark / Duplikasi)
  if (e.ctrlKey && e.keyCode === 68) {
    if (typeof showToast === 'function') {
      showToast("🔒 Pintasan Ctrl+D terpantau aman oleh sistem.", "warning");
    }
  }
});
