// ==========================================================
// CENTRAL APPLICATION ENTRY POINT & GLOBAL STATE DECLARATIONS
// ==========================================================

// Konfigurasi Global Aplikasi
var CONFIG = {
  SCHOOL_NAME_LONG: "UPT SPF SMP Negeri 3 Makassar",
  SCHOOL_NAME_SHORT: "SMP Negeri 3 Makassar",
  SCHOOL_CODE_ABBR: "SPENTIG", 
  NPSN: "40312436",
  OPERATOR_NAME: "Rahmat Rahim",
  RAPOR_URL: "https://rapor.smpn3makassar.sch.id",
  CUTOFF_DATE: "August 31, 2026 23:59:59",
  CUTOFF_TITLE: "Batas Akhir Pemutakhiran Dapodik 2026",
  CUTOFF_DESC: "Batas waktu sinkronisasi data profil sekolah dan peserta didik untuk perhitungan dana BOS.",
  CUTOFF_FOOTER_TEXT: "Target Batas: 31 Agustus 2026",
  SECURE_PASS_KEY: "", // Akan diisi secara dinamis menggunakan Hash Master PIN Anda
  STORAGE_PREFIX: "dapohub-",
  IDLE_LIMIT_MINUTES: 15
};

// Deklarasi Variabel State Global
var activeCategory = 'semua';
var linksData = [];
var agendaData = [];
var notesData = [];
var waTemplates = [];
var authenticatorKeys = [];
var currentDateObj = new Date();
var qrScannerObj = null;
var isScanning = false;
var totpIntervalId = null;
var toastTimeoutId = null;
var activeConfirmCallback = null;
var idleTimeCounter = 0;
var sessionLocked = false;
var globalMasterPin = ""; // Penampung PIN global aman

// Template Baku Siaran WhatsApp
var defaultWaTemplates = [
  { id: "rapor", name: "1. Pengumpulan Nilai E-Rapor", text: `Assalamu'alaikum Wr. Wb. Yth. Bapak/Ibu Guru {nama},\n\nDengan hormat, mohon bantuannya untuk segera melakukan pengisian dan sinkronisasi Nilai Rapor Kelas Anda pada aplikasi E-Rapor ${CONFIG.SCHOOL_NAME_SHORT} sebelum batas waktu pengumpulan.\n\nAtas dedikasi, kerja sama, dan perhatian Bapak/Ibu, kami ucapkan terima kasih.\n\nHormat kami,\nOperator Dapodik & IT` },
  { id: "data", name: "2. Verifikasi NIK & Berkas Dapodik", text: `Assalamu'alaikum Wr. Wb. Yth. Bapak/Ibu {nama},\n\nSehubungan dengan proses pemutakhiran data berkala, mohon kesediaan Bapak/Ibu untuk memeriksa kembali kesesuaian Nomor Induk Kependudukan (NIK) serta kelengkapan riwayat kerja di portal Dapodik.\n\nJika terdapat kekeliruan data, silakan menghubungi Operator Sekolah untuk perbaikan.\n\nTerima kasih,\nOperator Dapodik & IT` },
  { id: "belajar", name: "3. Aktivasi Akun Belajar.id", text: `Yth. Bapak/Ibu Guru {nama},\n\nMohon bantuannya untuk melakukan aktivasi akun pembelajaran Belajar.id Anda guna kelancaran akses ke platform Merdeka Mengajar (PMM), Rapor Pendidikan, dan administrasi kementerian lainnya.\n\nJika membutuhkan bantuan dalam pemulihan kata sandi, silakan menghubungi tim IT sekolah.\n\nSalam hormat,\nOperator Dapodik & IT` }
];

function renderAll() {
  renderDynamicLinks();
  renderAgenda();
  renderQuickNotes();
  renderAuthenticatorKeys();
}

function applyConfigToDOM() {
  document.getElementById('view-school-header').textContent = CONFIG.SCHOOL_NAME_LONG;
  document.getElementById('view-operator-name').textContent = CONFIG.OPERATOR_NAME;
  document.getElementById('view-school-badge').textContent = CONFIG.SCHOOL_CODE_ABBR;
  document.getElementById('view-cutoff-title').innerHTML = `<i class="fa-solid fa-clock-rotate-left animate-pulse"></i> ${CONFIG.CUTOFF_TITLE}`;
  document.getElementById('view-cutoff-desc').textContent = CONFIG.CUTOFF_DESC;
  document.getElementById('view-cutoff-footer-target').textContent = CONFIG.CUTOFF_FOOTER_TEXT;

  const s = document.getElementById('view-school-profile');
  if (s) {
    s.innerHTML = `<i class="fa-solid fa-school text-blue-500"></i> ${CONFIG.SCHOOL_NAME_LONG}`;
    s.onclick = () => copyText(CONFIG.SCHOOL_NAME_LONG, "Nama sekolah berhasil disalin!");
  }
  const n = document.getElementById('view-npsn-profile');
  if (n) {
    n.innerHTML = `<i class="fa-solid fa-fingerprint text-sky-500"></i> NPSN: ${CONFIG.NPSN}`;
    n.onclick = () => copyText(CONFIG.NPSN, "NPSN sekolah berhasil disalin!");
  }
}

// Sistem Pengaturan PIN Mandiri saat Pertama Kali booting atau Pengunduhan PIN
function handlePinSubmit() {
  const pinInput = document.getElementById('pin-input-field');
  if (!pinInput) return;
  
  const enteredPin = pinInput.value.trim();
  if (enteredPin.length !== 6 || !/^\d+$/.test(enteredPin)) {
    showToast("PIN Master harus berupa 6-digit angka!", "error");
    return;
  }

  try {
    const storedHash = localStorage.getItem(CONFIG.STORAGE_PREFIX + 'master-pin');

    if (!storedHash) {
      // Pengaturan awal PIN baru
      const pinHash = CryptoJS.SHA256(enteredPin).toString();
      localStorage.setItem(CONFIG.STORAGE_PREFIX + 'master-pin', pinHash);
      globalMasterPin = enteredPin;
      CONFIG.SECURE_PASS_KEY = "key-" + pinHash;
      showToast("Master PIN berhasil didaftarkan!", "success");
      bootstrapApplication();
    } else {
      // Validasi PIN yang dimasukkan
      const pinHash = CryptoJS.SHA256(enteredPin).toString();
      if (storedHash === pinHash) {
        globalMasterPin = enteredPin;
        CONFIG.SECURE_PASS_KEY = "key-" + pinHash;
        showToast("Sesi kerja berhasil dibuka!", "success");
        bootstrapApplication();
      } else {
        showToast("Master PIN Salah!", "error");
        pinInput.value = "";
      }
    }
  } catch (error) {
    console.error("Gagal memproses otentikasi PIN:", error);
    showToast("Terjadi kesalahan sistem pengamanan.", "error");
  }
}

// Inisialisasi Booting Utama Aplikasi Setelah Enkripsi Kunci Aman Terbuka
function bootstrapApplication() {
  // Tutup Overlay PIN
  const pinScreen = document.getElementById('master-pin-screen');
  if (pinScreen) pinScreen.classList.add('hidden');

  try {
    linksData = secureRead(CONFIG.STORAGE_PREFIX + 'links');
  } catch (e) {
    linksData = null;
  }

  // PERBAIKAN BUG UTAMA: Memberikan penanganan awal instan agar renderDynamicLinks() tidak crash
  if (!linksData || linksData.length === 0) {
    linksData = typeof defaultSeedLinks !== 'undefined' ? [...defaultSeedLinks] : [];
    
    fetch('data/default-links.json')
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) {
          linksData = data;
          saveLinks();
          renderDynamicLinks();
        }
      })
      .catch(() => {
        saveLinks();
        renderDynamicLinks();
      });
  }

  agendaData = secureRead(CONFIG.STORAGE_PREFIX + 'agendas') || [
    { id: "ag-1", text: "Koordinasi pemutakhiran data rombel kelas 7, 8, dan 9.", done: false, createdAt: Date.now() },
    { id: "ag-2", text: "Verifikasi keaktifan dan residu NIK siswa pada portal VervalPD.", done: false, createdAt: Date.now() + 1 }
  ];

  notesData = secureRead(CONFIG.STORAGE_PREFIX + 'notes') || [];

  authenticatorKeys = secureRead(CONFIG.STORAGE_PREFIX + 'auth-keys') || [
    { id: '2fa-seed-myasn', label: 'MyASN BKN (Contoh)', user: 'admin@bkn.go.id', key: 'JBSWY3DPEHPK3PXP' }
  ];
  
  waTemplates = secureRead(CONFIG.STORAGE_PREFIX + 'wa-templates') || [...defaultWaTemplates];

  renderAll();
  initCalendar();
  populateWaSelect();
  startTotpEngine();
  startCutOffCountdown();
  registerMainServiceWorker();
  updateOnlineStatus(navigator.onLine);
}

// Inisialisasi Utama Saat Halaman Selesai Dimuat (Pemeriksaan PIN Awal)
window.addEventListener('DOMContentLoaded', () => {
  updateClock();
  applyConfigToDOM();

  const storedHash = localStorage.getItem(CONFIG.STORAGE_PREFIX + 'master-pin');
  const titleEl = document.getElementById('pin-screen-title');
  const descEl = document.getElementById('pin-screen-desc');
  const btnEl = document.getElementById('pin-btn-text');

  if (storedHash) {
    if (titleEl) titleEl.textContent = "Buka Portal DAPO-HUB";
    if (descEl) descEl.textContent = "Masukkan 6-digit Master PIN Anda untuk mengakses seluruh data kredensial dan portal internal.";
    if (btnEl) btnEl.textContent = "Buka Kunci Sesi";
  }

  // Pemasangan Event Listener Modal Konfirmasi
  const cancelBtn = document.getElementById('btn-confirm-cancel');
  const okBtn = document.getElementById('btn-confirm-ok');
  if (cancelBtn) cancelBtn.onclick = () => closeCustomConfirm(false);
  if (okBtn) okBtn.onclick = () => closeCustomConfirm(true);

  // Penanganan Status Koneksi Runtime
  window.addEventListener('offline', () => { showToast('⚠️ Mode Luring (Offline) Aktif.', 'warning'); updateOnlineStatus(false); });
  window.addEventListener('online', () => { showToast('⚡ Portal terhubung kembali dengan jaringan.', 'success'); updateOnlineStatus(true); });

  // Detektor Keaktifan Sesi (Auto-Lock)
  ['mousemove', 'keypress', 'click', 'scroll', 'touchstart'].forEach(e => {
    document.addEventListener(e, resetIdleTimer);
  });

  setInterval(() => {
    if (!sessionLocked && ++idleTimeCounter >= CONFIG.IDLE_LIMIT_MINUTES) lockUserSession();
  }, 60000);

  setInterval(updateClock, 1000);
});
