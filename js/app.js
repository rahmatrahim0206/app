// ==========================================================
// CENTRAL APPLICATION ENTRY POINT & GLOBAL STATE DECLARATIONS
// ==========================================================

// DEKLARASI GLOBAL CONFIG - MEMASTIKAN APLIKASI JALAN DI GITHUB PAGES DAN LURING TANPA CRASH
const CONFIG = {
  SCHOOL_NAME_LONG: "SMP Negeri 3 Makassar",
  SCHOOL_CODE_ABBR: "SPENTIG",
  OPERATOR_NAME: "Rahmat Rahim",
  NPSN: "40312345", // Silakan sesuaikan NPSN asli jika diperlukan
  CUTOFF_DATE: "2026-08-31T23:59:59+08:00", // Waktu Cutoff BOS
  CUTOFF_TITLE: "Cut-Off BOS Reguler Tahap II",
  CUTOFF_DESC: "Pastikan seluruh data siswa, rombel, dan NISN tervalidasi 100% untuk dasar penyaluran BOSP.",
  CUTOFF_FOOTER_TEXT: "Batas Waktu Nasional: 31 Agustus 2026",
  STORAGE_PREFIX: "dapohub_v2_3_",
  SECURE_PASS_KEY: "DAPO-HUB-SECRET-SPENTIG",
  IDLE_LIMIT_MINUTES: 15
};

// State global aplikasi
let linksData = [];
let agendaData = [];
let notesData = [];
let authenticatorKeys = [];
let waTemplates = [];
let activeCategory = 'semua';
let currentDateObj = new Date();
let isScanning = false;
let qrScannerObj = null;
let toastTimeoutId = null;
let totpIntervalId = null;
let idleTimeCounter = 0;
let sessionLocked = false;
let activeConfirmCallback = null;

// Template default WhatsApp siaran penanda variabel
const defaultWaTemplates = [
  { id: "wat-default-1", name: "Pengingat Update Profil Dapodik", text: "Selamat pagi {nama}, mohon bantuannya untuk melakukan pengecekan biodata, nomor HP aktif, dan email terdaftar pada portal GTK untuk sinkronisasi pembaruan Dapodik semester ini. Terima kasih." },
  { id: "wat-default-2", name: "Laporan Kelengkapan Sasis", text: "Halo {nama}, berikut kami sampaikan bahwa terdapat data kependudukan (NIK/NISN) siswa bimbingan Anda yang masih berstatus residu. Mohon koordinasi dengan orang tua siswa untuk pengumpulan Kartu Keluarga terbaru." }
];

// Fallback Benih Tautan Dasar jika default-links.json gagal dimuat (CORS / Luring)
const defaultSeedLinks = [
  { "id": "seed-local-dapo", "title": "Aplikasi Dapodik Lokal", "url": "http://localhost:5774", "desc": "Akses cepat langsung menuju sistem Aplikasi Dapodik yang terpasang di komputer ini (Port 5774).", "category": "utama", "icon": "fa-laptop", "system": true },
  { "id": "seed-1", "title": "Beranda Dapodik", "url": "https://dapo.kemendikdasmen.go.id", "desc": "Pusat rilis pembaruan installer, patch aplikasi, surat edaran resmi, dan panduan Dapodik.", "category": "utama", "icon": "fa-globe", "system": true },
  { "id": "seed-2", "title": "SP Datadik Satuan Pendidikan", "url": "https://sp.datadik.kemendikdasmen.go.id/", "desc": "Kelola data kelembagaan, registrasi akun PTK, verifikasi akun lembaga, and unduh Prefill.", "category": "utama", "icon": "fa-school-flag", "system": true },
  { "id": "seed-3", "title": "PTK Datadik", "url": "https://ptk.datadik.kemendikdasmen.go.id", "desc": "Layanan autentikasi PTK mandiri untuk perbaikan riwayat pendidikan formal and riwayat kerja.", "category": "utama", "icon": "fa-id-card", "system": true },
  { "id": "seed-4", "title": "Unduh Prefill Dapodik", "url": "https://prefill2.kemendikdasmen.go.id/", "desc": "Unduh data prefill nasional untuk melakukan registrasi awal aplikasi Dapodik versi lokal.", "category": "utama", "icon": "fa-database", "system": true },
  { "id": "seed-5", "title": "Unduhan Aplikasi Dapodik", "url": "https://dapo.kemendikdasmen.go.id/unduhan", "desc": "Halaman resmi pusat unduhan Installer aplikasi, Patch, berkas panduan, dan formulir Dapodik.", "category": "utama", "icon": "fa-database", "system": true },
  { "id": "seed-6", "title": "E-Rapor SMP", "url": "https://rapor.smpn3makassar.sch.id", "desc": "Akses portal manajemen aplikasi E-Rapor terintegrasi untuk SMP dari direktorat SMP.", "category": "utama", "icon": "fa-school-flag", "system": true },
  { "id": "seed-7", "title": "Rapor Pendidikan Kemendikdasmen", "url": "https://raporpendidikan.kemendikdasmen.go.id", "desc": "Platform evaluasi mutu sistem pendidikan Indonesia. Mengukur capaian kualitas mutu pembelajaran.", "category": "utama", "icon": "fa-globe", "system": true },
  { "id": "seed-8", "title": "Cek NISN Mandiri", "url": "https://nisn.data.kemendikdasmen.go.id", "desc": "Pencarian mandiri Nomor Induk Siswa Nasional untuk validasi keaktifan identitas siswa.", "category": "verval", "icon": "fa-id-card", "system": true },
  { "id": "seed-9", "title": "Cek NUPTK GTK", "url": "https://gtk.data.kemendikdasmen.go.id/", "desc": "Pencarian publik status and nomor keaktifan NUPTK Pendidik dan Tenaga Kependidikan.", "category": "verval", "icon": "fa-id-card", "system": true },
  { "id": "seed-ijazah", "title": "Manajemen / Verval Ijazah (SIVIL)", "url": "https://ijazah.data.kemendikdasmen.go.id/manajemen/#/sign-in", "desc": "Sistem verifikasi ijazah elektronik Kemendikdasmen untuk memvalidasi kelulusan siswa dan status ijazah secara sah.", "category": "verval", "icon": "fa-graduation-cap", "system": true },
  { "id": "seed-10", "title": "Verval PTK", "url": "https://vervalptk.data.kemendikdasmen.go.id/site/login", "desc": "Verifikasi validitas NIK PTK, penerbitan NUPTK baru, and perbaikan identitas guru.", "category": "verval", "icon": "fa-id-card", "system": true },
  { "id": "seed-11", "title": "Verval PD (Peserta Didik)", "url": "https://vervalpd.data.kemendikdasmen.go.id/", "desc": "Penerbitan & perbaikan NISN, pengesahan NIK siswa terintegrasi langsung dengan database Dukcapil.", "category": "verval", "icon": "fa-id-card", "system": true },
  { "id": "seed-12", "title": "Verval SP (Satuan Pendidikan)", "url": "https://vervalsp.data.kemendikdasmen.go.id/verval/index.php/cberanda/index/", "desc": "Pengelolaan profil and spasial koordinat wilayah Satuan Pendidikan Anda.", "category": "verval", "icon": "fa-globe", "system": true },
  { "id": "seed-13", "title": "Verval TIK", "url": "https://vervaltio.data.kemendikdasmen.go.id", "desc": "Verifikasi sarana komputer, proktor, jaringan internet, and daya tampung kesiapan ujian ANBK.", "category": "verval", "icon": "fa-computer", "system": true },
  { "id": "seed-14", "title": "Pusdatin PD (Pusat Data Peserta Didik)", "url": "https://sdm.data.kemendikdasmen.go.id/", "desc": "Akses sinkronisasi residu data kependudukan peserta didik, perbaikan tingkat ganda, dan kelulusan.", "category": "verval", "icon": "fa-id-card", "system": true },
  { "id": "seed-15", "title": "Sipintar PIP (Program Indonesia Pintar)", "url": "https://pip.kemendikdasmen.go.id/home_v1", "desc": "Pemantauan penyaluran beasiswa PIP, pengajuan usulan baru, and unduh SK NOMINASI/pemberian.", "category": "keuangan", "icon": "fa-wallet", "system": true },
  { "id": "seed-16", "title": "ARKAS Kemendikdasmen", "url": "https://arkas.kemendikdasmen.go.id", "desc": "Aplikasi Rencana Kegiatan and Anggaran Sekolah untuk penyusunan dan pelaporan dana BOSP.", "category": "keuangan", "icon": "fa-wallet", "system": true },
  { "id": "seed-17", "title": "SIPLah", "url": "https://siplah.blibli.com/", "desc": "Sistem Informasi Pengadaan Sekolah untuk pembelanjaan barang and jasa dana BOSP.", "category": "keuangan", "icon": "fa-cart-shopping", "system": true },
  { "id": "seed-18", "title": "BOSP Salur", "url": "https://bosp.kemendikdasmen.go.id", "desc": "Pemantauan penyaluran dan konfirmasi laporan penggunaan dana BOSP Reguler & Kinerja.", "category": "keuangan", "icon": "fa-wallet", "system": true },
  { "id": "seed-coretax", "title": "Coretax DJP Pajak", "url": "https://coretaxdjp.pajak.go.id/identityproviderportal/Account/Login", "desc": "Portal terintegrasi sistem administrasi perpajakan masa depan DJP (Coretax System) bagi wajib pajak.", "category": "keuangan", "icon": "fa-receipt", "system": true },
  { "id": "seed-19", "title": "Info GTK", "url": "https://info.gtk.kemendikdasmen.go.id/", "desc": "Pengecekan keaktifan mengajar mandiri, validitas data beban mengajar (JJM), and keaktifan sertifikasi SKTP.", "category": "guru", "icon": "fa-chalkboard-user", "system": true },
  { "id": "seed-20", "title": "SIMPKB Login", "url": "https://paspor-gtk.simpkb.id/casgpo/login?service=https%3A%2F%2Fapp.simpkb.id%2Fauth%2Flogin", "desc": "Sistem Informasi Manajemen Pengembangan Keprofesian Berkelanjutan (PPG, Diklat, & KKG/MGMP).", "category": "guru", "icon": "fa-chalkboard-user", "system": true },
  { "id": "seed-21", "title": "Ruang GTK", "url": "https://akun.pendidikan.go.id/login?flow=fa87d033-975e-48c1-8315-b75b0be1dfb2", "desc": "Layanan bagi guru untuk pelatihan mandiri, pengisian e-Kinerja (SKP), and penyusunan modul ajar.", "category": "guru", "icon": "fa-chalkboard-user", "system": true },
  { "id": "seed-22", "title": "Akun Belajar.id", "url": "https://belajar.id", "desc": "Aktivasi, reset kata sandi, dan sinkronisasi akun Google pembelajaran guru & siswa.", "category": "guru", "icon": "fa-chalkboard-user", "system": true },
  { "id": "seed-23", "title": "Rumah Belajar", "url": "https://rumah.pendidikan.go.id/", "desc": "Portal media pembelajaran internet gratis yang menyajikan bahan belajar lengkap dari Kemendikbud.", "category": "guru", "icon": "fa-school-flag", "system": true },
  { "id": "seed-kbbi", "title": "KBBI Daring Kemendikdasmen", "url": "https://kbbi.kemendikdasmen.go.id/", "desc": "Kamus Besar Bahasa Indonesia (KBBI) elektronik resmi Resmi Pusat Pembinaan dan Pengembangan Bahasa.", "category": "guru", "icon": "fa-spell-check", "system": true },
  { "id": "seed-myasn", "title": "MyASN BKN", "url": "https://myasn.bkn.go.id", "desc": "Portal utama satu pintu layanan kepegawaian mandiri ASN nasional dari Badan Kepegawaian Negara.", "category": "kepegawaian", "icon": "fa-id-card", "system": true },
  { "id": "seed-ekinerja", "title": "e-Kinerja BKN", "url": "https://kinerja.bkn.go.id", "desc": "Sistem pengelolaan kinerja pegawai ASN terintegrasi untuk penyusunan and penilaian Sasaran Kinerja Pegawai (SKP).", "category": "kepegawaian", "icon": "fa-chalkboard-user", "system": true },
  { "id": "seed-sipp", "title": "SIPP Makassar (SIM Kepegawaian)", "url": "https://sipp.makassar.go.id", "desc": "Sistem Informasi Pelayanan Personil BKPSDMD Kota Makassar untuk pencatatan berkas fisik and administrasi ASN.", "category": "kepegawaian", "icon": "fa-city", "system": true },
  { "id": "seed-esakti", "title": "e-Sakti Makassar (Presensi & TPP)", "url": "https://esakti.makassar.go.id", "desc": "Layanan mandiri presensi ASN daerah Makassar, pemantauan kedisiplinan kerja, dan realisasi TPP harian.", "category": "kepegawaian", "icon": "fa-network-wired", "system": true },
  { "id": "seed-simpeg", "title": "SIMPEG Kemendikdasmen", "url": "https://simpeg.bkpsdmd.makassarkota.go.id/", "desc": "Sistem Informasi Manajemen Kepegawaian internal Kementerian Pendidikan, Kebudayaan, Riset, dan Teknologi.", "category": "kepegawaian", "icon": "fa-id-card", "system": true },
  { "id": "seed-24", "title": "Portal Web ANBK", "url": "https://anbk.kemendikdasmen.go.id", "desc": "Penetapan status pelaksanaan, data proktor, komputer client, penjadwalan, dan cetak kartu login.", "category": "ujian", "icon": "fa-computer", "system": true },
  { "id": "seed-25", "title": "Bio-AN SMP", "url": "https://bioansmp.kemendikdasmen.go.id", "desc": "Sistem penarikan data calon peserta Asesmen Nasional (DNT) dari pangkalan Dapodik secara terintegrasi.", "category": "ujian", "icon": "fa-id-card", "system": true },
  { "id": "seed-26", "title": "Portal TKA & Asesmen Bakat", "url": "https://tka.kemendikdasmen.go.id/", "desc": "Pusat Asesmen Pendidikan untuk pelaksanaan Tes Kemampuan Akademik (TKA) dan simulasi ujian siswa.", "category": "ujian", "icon": "fa-computer", "system": true },
  { "id": "seed-27", "title": "Dinas Pendidikan Makassar", "url": "https://disdik.makassarkota.go.id", "desc": "Situs web utama Disdik Kota Makassar. Menyediakan informasi mutasi siswa, regulasi, dan kebijakan daerah.", "category": "daerah", "icon": "fa-city", "system": true },
  { "id": "seed-28", "title": "Portal PPDB Makassar", "url": "https://spmb.makassarkota.go.id/cloginsekolahx", "desc": "Penerimaan Peserta Didik Baru wilayah SMP Negeri Kota Makassar (Jalur Zonasi, Afirmasi, Prestasi).", "category": "daerah", "icon": "fa-city", "system": true },
  { "id": "seed-29", "title": "Uji Kecepatan Koneksi", "url": "https://speedtest.net", "desc": "Uji kehandalan latensi internet Lab Komputer sebelum melakukan sinkronisasi massal.", "category": "daerah", "icon": "fa-network-wired", "system": true },
  { "id": "seed-mbg", "title": "Makan Bergizi Gratis (MBG) Portal", "url": "https://mbg.pdm.kemendikdasmen.go.id/portal", "desc": "Portal integrasi dan pendataan nasional implementasi program Makan Bergizi Gratis di sekolah.", "category": "daerah", "icon": "fa-utensils", "system": true }
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

// Inisialisasi Utama Saat Halaman Dimuat
window.onload = () => {
  applyConfigToDOM();
  
  // Membaca Data Cadangan Terenkripsi Lokal
  linksData = secureRead(CONFIG.STORAGE_PREFIX + 'links');
  
  if (!linksData || linksData.length === 0) {
    // Penanganan pengambilan default-links.json statis untuk GitHub Pages (diarahkan ke data/default-links.json)
    fetch('data/default-links.json')
      .then(res => {
        if (!res.ok) throw new Error("Gagal mengambil berkas json");
        return res.json();
      })
      .then(data => {
        linksData = data;
        saveLinks();
        renderDynamicLinks();
      })
      .catch(() => {
        // Fallback instan jika gagal (CORS, offline atau file:// protocol)
        linksData = [...defaultSeedLinks];
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
  
  // Menjalankan Rendering & Engine Latar Belakang
  renderAll();
  initCalendar();
  populateWaSelect();
  updateClock();
  startTotpEngine();
  startCutOffCountdown();
  registerMainServiceWorker();
  updateOnlineStatus(navigator.onLine);

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
};

// HELPER SIMPAN DATA AGENDA
function saveAgenda() {
  secureSave(CONFIG.STORAGE_PREFIX + 'agendas', agendaData);
}
