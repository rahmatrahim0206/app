// ==========================================================
// CLIENT-SIDE OFFLINE IT SUPPORT TOOLS ENGINE
// ==========================================================

// Daftar konstan perintah CMD Windows yang sering digunakan oleh Operator Sekolah
const IT_CMD_SHEET = [
  { id: "cmd-dns", name: "Bersihkan Cache DNS", desc: "Mengatasi browser macet / gagal memuat portal ANBK pasca-perubahan jaringan.", code: "ipconfig /flushdns" },
  { id: "cmd-ping", name: "Ping ANBK Tanpa Henti", desc: "Uji stabilitas transmisi upstream jaringan ke server pusat ANBK secara konstan.", code: "ping anbk.kemendikdasmen.go.id -t" },
  { id: "cmd-winsock", name: "Atur Ulang Protokol Winsock", desc: "Memperbaiki adapter Wi-Fi/LAN yang mengalami galat socket atau No Internet.", code: "netsh winsock reset" },
  { id: "cmd-release", name: "Lepas & Perbarui IP LAN", desc: "Melepas alamat DHCP lama lalu meminta konfigurasi alokasi IP baru dari router.", code: "ipconfig /release && ipconfig /renew" },
  { id: "cmd-arp", name: "Cek Tabel ARP Lokal", desc: "Melihat daftar perangkat fisik MAC Address yang terhubung di jaringan Lab ANBK.", code: "arp -a" },
  { id: "cmd-route", name: "Bersihkan Tabel Routing", desc: "Menyetel ulang gerbang tabel rute koneksi sistem Windows.", code: "route -f" }
];

// Inisialisasi Workspace Peralatan IT
function initItToolsWorkspace() {
  switchItSubTab('subnet');
  renderItCmdCommands();
}

// Beralih Sub-tab di dalam Menu IT Support
function switchItSubTab(tabName) {
  const tabs = ['subnet', 'dns', 'cmd', 'codec'];
  tabs.forEach(t => {
    const btn = document.getElementById(`btn-it-${t}`);
    const panel = document.getElementById(`sub-it-${t}`);
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

// --- ALAT 1: KALKULATOR SUBNETTING IP (IP CALCULATOR) ---
function calculateSubnet() {
  const ipInput = document.getElementById('subnet-ip-input');
  const cidrInput = document.getElementById('subnet-cidr-input');
  if (!ipInput || !cidrInput) return;

  const ipStr = ipInput.value.trim();
  const cidr = parseInt(cidrInput.value);

  // Validasi pola IP Address IPv4 standar
  const ipPattern = /^([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})$/;
  if (!ipPattern.test(ipStr)) {
    if (typeof showToast === 'function') showToast("Format alamat IP tidak valid!", "error");
    return;
  }

  const octets = ipStr.split('.').map(Number);
  for (let oct of octets) {
    if (oct < 0 || oct > 255) {
      if (typeof showToast === 'function') showToast("Angka oktet IP harus berada di antara 0-255!", "error");
      return;
    }
  }

  // Hitung Parameter Subnet Mask
  let maskBinary = "";
  for (let i = 0; i < 32; i++) {
    maskBinary += i < cidr ? "1" : "0";
  }

  const maskOctets = [];
  for (let i = 0; i < 32; i += 8) {
    maskOctets.push(parseInt(maskBinary.substr(i, 8), 2));
  }
  const subnetMaskStr = maskOctets.join('.');

  // Hitung Network Address & Broadcast Address
  const ipBinary = octets.map(oct => oct.toString(2).padStart(8, '0')).join('');
  let netBinary = "";
  let broadBinary = "";

  for (let i = 0; i < 32; i++) {
    netBinary += i < cidr ? ipBinary[i] : "0";
    broadBinary += i < cidr ? ipBinary[i] : "1";
  }

  const netOctets = [];
  const broadOctets = [];
  for (let i = 0; i < 32; i += 8) {
    netOctets.push(parseInt(netBinary.substr(i, 8), 2));
    broadOctets.push(parseInt(broadBinary.substr(i, 8), 2));
  }

  const netAddressStr = netOctets.join('.');
  const broadAddressStr = broadOctets.join('.');

  // Hitung Usable IP Range
  const startIpOctets = [...netOctets];
  startIpOctets[3] += 1;
  const endIpOctets = [...broadOctets];
  endIpOctets[3] -= 1;

  const startIpStr = startIpOctets.join('.');
  const endIpStr = endIpOctets.join('.');
  const ipRangeStr = cidr >= 31 ? "Tidak Berlaku untuk prefix /31 atau /32" : `${startIpStr} - ${endIpStr}`;

  // Hitung Jumlah Usable Hosts
  const totalHosts = cidr >= 31 ? 0 : Math.pow(2, 32 - cidr) - 2;

  // Render Hasil Perhitungan Subnetting ke DOM
  document.getElementById('sub-res-mask').textContent = subnetMaskStr;
  document.getElementById('sub-res-net').textContent = netAddressStr;
  document.getElementById('sub-res-broad').textContent = broadAddressStr;
  document.getElementById('sub-res-hosts').textContent = `${totalHosts} Host`;
  document.getElementById('sub-res-range').textContent = ipRangeStr;

  if (typeof showToast === 'function') showToast("Kalkulasi subnetting berhasil diperbarui!", "success");
}

// --- ALAT 2: SIMULASI PENGECEKAN DNS & DOMAIN ---
function setDnsTemplate(domain) {
  const input = document.getElementById('dns-domain-input');
  if (input) {
    input.value = domain;
    runDnsLookup();
  }
}

async function runDnsLookup() {
  const input = document.getElementById('dns-domain-input');
  const resultsBox = document.getElementById('dns-results-box');
  const consoleOut = document.getElementById('dns-console-output');
  if (!input || !resultsBox || !consoleOut) return;

  const domain = input.value.trim().toLowerCase();
  if (!domain) {
    if (typeof showToast === 'function') showToast("Mohon masukkan nama domain terlebih dahulu!", "warning");
    return;
  }

  resultsBox.classList.remove('hidden');
  // Diperbaiki: Mengganti spentig dengan portal
  consoleOut.innerHTML = `<span class="text-blue-400">root@dapohub-portal:~#</span> dig ${domain} +nocookie +nocmd +noquestion +nostats<br><span class="text-slate-400">; Mengontak server DNS utama... silakan tunggu.</span><br><br><span class="animate-pulse text-amber-500">; QUERYING NAMESERVERS...</span>`;

  await new Promise(r => setTimeout(r, 1200));

  // Simulasi resolusi DNS record bervariasi asinkron berdasarkan domain kementerian
  const fakeIPs = {
    "anbk.kemendikdasmen.go.id": { a: "103.40.124.88", ns: "ns1.kemendikbud.go.id\nns2.kemendikbud.go.id", mx: "10 mx.kemendikbud.go.id" },
    "dapo.kemendikdasmen.go.id": { a: "103.40.124.32", ns: "ns1.kemendikbud.go.id\nns2.kemendikbud.go.id", mx: "10 mx.kemendikbud.go.id" },
    "sp.datadik.kemendikdasmen.go.id": { a: "103.40.124.45", ns: "ns1.kemendikbud.go.id\nns2.kemendikbud.go.id", mx: "10 mx.kemendikbud.go.id" },
    "info.gtk.kemendikdasmen.go.id": { a: "103.40.124.60", ns: "ns3.kemendikbud.go.id\nns4.kemendikbud.go.id", mx: "10 mail.kemendikbud.go.id" }
  };

  const domainData = fakeIPs[domain] || {
    a: `${Math.floor(Math.random() * 200) + 1}.${Math.floor(Math.random() * 254)}.${Math.floor(Math.random() * 254)}.${Math.floor(Math.random() * 254)}`,
    ns: "ns1.isp-lokal.net\nns2.isp-lokal.net",
    mx: "10 mail.domain-kustom.sch.id"
  };

  // Diperbaiki: Mengganti spentig dengan portal secara konsisten
  const lines = [
    `<span class="text-blue-400">root@dapohub-portal:~#</span> dig ${domain} +nocookie +nocmd +noquestion +nostats`,
    `<span class="text-slate-500">; Resolving DNS records for ${domain}...</span>`,
    ``,
    `<span class="text-emerald-500">;; ANSWER SECTION (A Record):</span>`,
    `${domain.padEnd(35, ' ')} 3600    IN    A     <span class="text-white font-bold">${domainData.a}</span>`,
    ``,
    `<span class="text-emerald-500">;; AUTHORITY SECTION (NS Records):</span>`,
    domainData.ns.split('\n').map(ns => `${domain.padEnd(35, ' ')} 86400   IN    NS    ${ns}`).join('<br>'),
    ``,
    `<span class="text-emerald-500">;; MAIL EXCHANGE SECTION (MX Records):</span>`,
    `${domain.padEnd(35, ' ')} 14400   IN    MX    ${domainData.mx}`,
    ``,
    `<span class="text-blue-400">root@dapohub-portal:~#</span> ping ${domain} -c 3`,
    `PING ${domain} (${domainData.a}) 56(84) bytes of data.`,
    `64 bytes from ${domainData.a}: icmp_seq=1 ttl=56 time=${Math.floor(Math.random() * 80) + 12} ms`,
    `64 bytes from ${domainData.a}: icmp_seq=2 ttl=56 time=${Math.floor(Math.random() * 80) + 12} ms`,
    `64 bytes from ${domainData.a}: icmp_seq=3 ttl=56 time=${Math.floor(Math.random() * 80) + 12} ms`,
    ``,
    `--- ${domain} ping statistics ---`,
    `3 packets transmitted, 3 received, 0% packet loss, time 2003ms`,
    `rtt min/avg/max/mdev = 12.4/32.5/92.1 ms`
  ];

  consoleOut.innerHTML = lines.join('<br>');
  if (typeof showToast === 'function') showToast(`Pemeriksaan DNS ${domain} selesai!`, "success");
}

// --- ALAT 3: PERINTAH PINTAS WINDOWS CMD ---
function renderItCmdCommands() {
  const container = document.getElementById('cmd-command-container');
  if (!container) return;
  container.innerHTML = "";

  IT_CMD_SHEET.forEach(cmd => {
    const card = document.createElement('div');
    card.className = "p-4 bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl flex flex-col justify-between hover:shadow-md transition duration-200 animate-fade-in";
    card.innerHTML = `
      <div class="space-y-1">
        <h4 class="text-xs font-black text-slate-900 dark:text-white font-space">${cmd.name}</h4>
        <p class="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">${cmd.desc}</p>
      </div>
      <div onclick="copyItCommand('${cmd.code}')" class="mt-3 bg-slate-50 dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-100 dark:border-slate-700 font-mono text-[10px] text-blue-600 dark:text-blue-400 cursor-pointer hover:border-blue-500 dark:hover:border-blue-500 active:scale-95 transition flex justify-between items-center group" title="Klik untuk menyalin">
        <span class="truncate pr-2 select-all">${cmd.code}</span>
        <i class="fa-solid fa-copy text-slate-400 group-hover:text-blue-500 transition flex-shrink-0"></i>
      </div>
    `;
    container.appendChild(card);
  });
}

function copyItCommand(code) {
  if (typeof copyText === 'function') {
    copyText(code, "Perintah Windows CMD disalin! Silakan tempelkan di Command Prompt.");
  }
}

// --- ALAT 4: BASE64 STRING ENCODER / DECODER ---
function processBase64Encode() {
  const plainInput = document.getElementById('codec-plain-text');
  const base64Output = document.getElementById('codec-base64-text');
  if (!plainInput || !base64Output) return;

  const plainText = plainInput.value;
  if (!plainText) {
    if (typeof showToast === 'function') showToast("Teks normal masih kosong!", "warning");
    return;
  }

  try {
    // Membaca bit teks multibyte menggunakan UTF-8 encoder bawaan CryptoJS
    const wordArray = CryptoJS.enc.Utf8.parse(plainText);
    const base64 = CryptoJS.enc.Base64.stringify(wordArray);
    base64Output.value = base64;
    if (typeof showToast === 'function') showToast("Teks berhasil di-encode ke Base64!", "success");
  } catch (e) {
    if (typeof showToast === 'function') showToast("Galat melakukan encoding teks.", "error");
  }
}

function processBase64Decode() {
  const plainOutput = document.getElementById('codec-plain-text');
  const base64Input = document.getElementById('codec-base64-text');
  if (!plainOutput || !base64Input) return;

  const base64Text = base64Input.value.trim().replace(/\s/g, '');
  if (!base64Text) {
    if (typeof showToast === 'function') showToast("String Base64 masih kosong!", "warning");
    return;
  }

  try {
    const parsedWordArray = CryptoJS.enc.Base64.parse(base64Text);
    const decodedText = CryptoJS.enc.Utf8.stringify(parsedWordArray);
    
    if (!decodedText && base64Text.length > 0) {
      throw new Error("Invalid base64 string structure.");
    }
    
    plainOutput.value = decodedText;
    if (typeof showToast === 'function') showToast("String Base64 berhasil di-decode!", "success");
  } catch (e) {
    if (typeof showToast === 'function') showToast("Galat: Karakter Base64 rusak atau tidak valid!", "error");
  }
}

function clearCodecFields() {
  const plain = document.getElementById('codec-plain-text');
  const b64 = document.getElementById('codec-base64-text');
  if (plain) plain.value = "";
  if (b64) b64.value = "";
  if (typeof showToast === 'function') showToast("Kolom encoder dibersihkan.");
}
