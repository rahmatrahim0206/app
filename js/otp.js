// ==========================================================
// GOOGLE AUTHENTICATOR MIGRATION & TOTP DECODER ENGINE
// ==========================================================

// Fungsi konversi biner Base32 ke WordArray CryptoJS
function base32toWordArray(b32) {
  const cleaned = b32.replace(/[\s\-=]+/g, "").toUpperCase();
  if (!cleaned || cleaned.length === 0) return CryptoJS.lib.WordArray.create([]);
  
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let binaryString = "";
  
  for (let i = 0; i < cleaned.length; i++) {
    const val = alphabet.indexOf(cleaned.charAt(i));
    if (val !== -1) {
      binaryString += val.toString(2).padStart(5, '0');
    }
  }
  
  const words = [];
  for (let i = 0; i < binaryString.length; i += 32) {
    const chunk = binaryString.substr(i, 32).padEnd(32, '0');
    words.push(parseInt(chunk, 2) | 0);
  }
  
  return CryptoJS.lib.WordArray.create(words, Math.floor(binaryString.length / 8));
}

// Fungsi utama pembuat token TOTP (RFC 6238)
function generateTOTP(secretKey) {
  try {
    if (!secretKey) return "000000";
    const key = base32toWordArray(secretKey);
    if (!key || key.sigBytes === 0) return "INV-KEY";
    
    const epoch = Math.floor(Date.now() / 30000);
    const timeHex = epoch.toString(16).padStart(16, '0');
    
    const hmac = CryptoJS.HmacSHA1(CryptoJS.enc.Hex.parse(timeHex), key);
    const hmacHex = CryptoJS.enc.Hex.stringify(hmac);
    
    const offset = parseInt(hmacHex.substring(hmacHex.length - 1), 16);
    const otpPart = hmacHex.substring(offset * 2, offset * 2 + 8);
    const binaryToken = (parseInt(otpPart, 16) & 0x7fffffff) % 1000000;
    return String(binaryToken).padStart(6, '0');
  } catch (e) {
    return "ERR-OTP";
  }
}

// Fungsi baca struktur varint biner
function readVarint(bytes, offset) {
  let value = 0;
  let shift = 0;
  while (true) {
    if (offset >= bytes.length) throw new Error("Varint terpotong");
    const b = bytes[offset++];
    value |= (b & 0x7F) << shift;
    if (!(b & 0x80)) break;
    shift += 7;
    if (shift > 35) throw new Error("Varint terlalu besar");
  }
  return { value, offset };
}

// Pengurai manual Google Protobuf Payload
function parseProtobuf(bytes) {
  let offset = 0;
  const fields = [];
  while (offset < bytes.length) {
    try {
      const keyResult = readVarint(bytes, offset);
      const key = keyResult.value;
      offset = keyResult.offset;
      const wireType = key & 0x07;
      const fieldNumber = key >>> 3;
      
      let value;
      if (wireType === 0) {
        const varintResult = readVarint(bytes, offset);
        value = varintResult.value;
        offset = varintResult.offset;
      } else if (wireType === 2) {
        const lenResult = readVarint(bytes, offset);
        const len = lenResult.value;
        offset = lenResult.offset;
        value = bytes.slice(offset, offset + len);
        offset += len;
      } else if (wireType === 1) {
        value = bytes.slice(offset, offset + 8);
        offset += 8;
      } else if (wireType === 5) {
        value = bytes.slice(offset, offset + 4);
        offset += 4;
      } else {
        break; 
      }
      fields.push({ fieldNumber, wireType, value });
    } catch (e) {
      break;
    }
  }
  return fields;
}

// Konversi biner ke Base32
function uint8ArrayToBase32(arr) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let value = 0;
  let output = "";
  for (let i = 0; i < arr.length; i++) {
    value = (value << 8) | arr[i];
    bits += 8;
    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += alphabet[(value << (5 - bits)) & 31];
  }
  return output;
}

// Mengubah String Base64 URL-Safe
function safeAtob(str) {
  let padded = str.replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, '');
  while (padded.length % 4 !== 0) {
    padded += '=';
  }
  return atob(padded);
}

// Fungsi utama decode QR ekspor massal Google Authenticator
function parseGoogleMigrationUri(uri) {
  try {
    const urlObj = new URL(uri);
    const dataParam = urlObj.searchParams.get("data");
    if (!dataParam) return null;
    
    const binaryString = safeAtob(dataParam);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const fields = parseProtobuf(bytes);
    const accounts = [];
    const otpParamsFields = fields.filter(f => f.fieldNumber === 1 && f.wireType === 2);
    
    for (const field of otpParamsFields) {
      const subFields = parseProtobuf(field.value);
      let secretBytes = null;
      let name = "";
      let issuer = "";
      
      for (const sf of subFields) {
        if (sf.fieldNumber === 1 && sf.wireType === 2) {
          secretBytes = sf.value;
        } else if (sf.fieldNumber === 2 && sf.wireType === 2) {
          name = new TextDecoder().decode(sf.value);
        } else if (sf.fieldNumber === 3 && sf.wireType === 2) {
          issuer = new TextDecoder().decode(sf.value);
        }
      }
      
      if (secretBytes && secretBytes.length > 0) {
        const base32Secret = uint8ArrayToBase32(secretBytes);
        accounts.push({
          label: issuer || name || "Akun Google",
          user: name || "-",
          key: base32Secret
        });
      }
    }
    return accounts;
  } catch (e) {
    console.error("Kesalahan parsing data migrasi:", e);
    return null;
  }
}

// Mengurai tautan URI otpauth:// standar
function parseOtpAuthUri(uri) {
  try {
    if (!uri.startsWith('otpauth://')) return null;
    const url = new URL(uri);
    const params = new URLSearchParams(url.search);
    const secret = params.get('secret');
    if (!secret) return null;

    let label = decodeURIComponent(url.pathname.replace(/^\//, ''));
    let issuer = params.get('issuer') || '';
    let user = '';

    if (label.includes(':')) {
      const parts = label.split(':');
      if (!issuer) issuer = parts[0].trim();
      user = parts.slice(1).join(':').trim();
    } else {
      user = label.trim();
    }
    
    if (!issuer) issuer = 'TOTP';

    return { label: issuer, user: user || '-', key: secret };
  } catch (e) {
    const secretMatch = uri.match(/[?&]secret=([^&]+)/i);
    if (secretMatch) {
      const secret = secretMatch[1];
      const issuerMatch = uri.match(/[?&]issuer=([^&]+)/i);
      const issuer = issuerMatch ? decodeURIComponent(issuerMatch[1]) : 'TOTP';
      return { label: issuer, user: '-', key: secret };
    }
    return null;
  }
}

// Eksekusi pemrosesan QR Code hasil pindai (Kamera/Unggah Berkas)
function handleQrCodeResult(res) {
  if (res.startsWith('otpauth-migration://')) {
    const accounts = parseGoogleMigrationUri(res);
    if (accounts && accounts.length > 0) {
      let successCount = 0;
      accounts.forEach(acc => {
        const newId = '2fa-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
        if (!authenticatorKeys.some(k => k.key === acc.key)) {
          authenticatorKeys.push({
            id: newId,
            label: acc.label,
            user: acc.user,
            key: acc.key
          });
          successCount++;
        }
      });
      if (successCount > 0) {
        saveAuthenticatorKeys();
        renderAuthenticatorKeys();
        if (typeof showToast === 'function') showToast(`Berhasil mengimpor ${successCount} akun dari Google Authenticator!`, 'success');
      } else {
        if (typeof showToast === 'function') showToast("Semua akun migrasi ini sudah terdaftar sebelumnya di portal.", "warning");
      }
    } else {
      if (typeof showToast === 'function') showToast("Gagal menguraikan berkas migrasi Google Authenticator.", "error");
    }
    return;
  }

  const parsed = parseOtpAuthUri(res);
  if (parsed) {
    document.getElementById('auth-main-label').value = parsed.label;
    document.getElementById('auth-main-user').value = parsed.user;
    document.getElementById('auth-main-key').value = parsed.key;
    save2FaKeyFromMain();
  } else {
    const cleaned = res.replace(/[\s\-=]+/g, '').toUpperCase();
    if (/^[A-Z2-7]+$/.test(cleaned)) {
      document.getElementById('auth-main-key').value = cleaned;
      if (typeof showToast === 'function') showToast("Kunci rahasia berhasil dimuat. Lengkapi nama layanan lalu simpan.", "warning");
    } else {
      if (typeof showToast === 'function') showToast("Hasil scan QR Code tidak mengandung format OTP valid.", "error");
    }
  }
}

// Rendering Token OTP
function renderAuthenticatorKeys() {
  const container = document.getElementById('main-authenticator-list');
  if (!container) return;
  
  const searchQuery = document.getElementById('search-input').value.toLowerCase().trim();
  const filteredKeys = authenticatorKeys.filter(k => 
    k.label.toLowerCase().includes(searchQuery) || 
    k.user.toLowerCase().includes(searchQuery)
  );
  
  const badge2Fa = document.getElementById('badge-2fa_auth');
  if (badge2Fa) badge2Fa.textContent = authenticatorKeys.length;

  if (filteredKeys.length === 0) {
    if (searchQuery.length > 0) {
      container.innerHTML = `<div class="col-span-1 md:col-span-2 p-8 text-center text-slate-400 italic">Akun OTP dengan kata kunci "${searchQuery}" tidak ditemukan.</div>`;
    } else {
      container.innerHTML = `<div class="col-span-1 md:col-span-2 p-8 text-center text-slate-400 italic">Belum ada akun TOTP tersimpan. Mulai scan QR atau tambah manual.</div>`;
    }
    return;
  }

  const secondsLeft = 30 - (Math.floor(Date.now() / 1000) % 30);

  let htmlContent = "";
  filteredKeys.forEach(k => {
    const currentOtp = generateTOTP(k.key);
    const formattedOtp = currentOtp.length === 6 ? `${currentOtp.substring(0,3)} ${currentOtp.substring(3,6)}` : currentOtp;
    
    const badgeColorClass = secondsLeft < 6 
      ? "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/40" 
      : "bg-blue-50 dark:bg-slate-800/80 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-slate-700";

    const stopwatchAnimClass = secondsLeft < 6 ? "animate-ping" : "";

    htmlContent += `
      <div class="p-4 bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl hover:shadow-md transition duration-200">
        <div class="flex justify-between items-start mb-2.5">
          <div class="truncate pr-2 w-[65%]">
            <h4 class="text-xs font-black truncate text-slate-900 dark:text-white" title="${k.label}">${k.label}</h4>
            <p class="text-[10px] text-slate-400 dark:text-slate-500 truncate" title="${k.user}">${k.user}</p>
          </div>
          <div class="flex items-center gap-1.5 flex-shrink-0">
            <span class="text-[9px] font-mono px-1.5 py-0.5 rounded-md border ${badgeColorClass} font-black flex items-center gap-1 transition-colors duration-300" title="Sisa waktu token">
              <i class="fa-solid fa-stopwatch ${stopwatchAnimClass}"></i> ${secondsLeft}s
            </span>
            <button onclick="delete2FaKey('${k.id}')" class="text-slate-300 hover:text-rose-500 transition p-1" title="Hapus Kunci">
              <i class="fa-solid fa-trash-can text-xs"></i>
            </button>
          </div>
        </div>
        <div onclick="copyText('${currentOtp}', 'Token OTP ${k.label} disalin!')" class="bg-slate-50 dark:bg-slate-900 py-3 rounded-xl border border-slate-100 dark:border-slate-700 text-center cursor-pointer hover:border-blue-500 dark:hover:border-blue-500 active:scale-95 transition-all group" title="Klik untuk menyalin token">
          <span class="font-space font-black text-2xl tracking-wider text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">${formattedOtp}</span>
        </div>
      </div>
    `;
  });
  container.innerHTML = htmlContent;
}

function saveAuthenticatorKeys() {
  secureSave(CONFIG.STORAGE_PREFIX + 'auth-keys', authenticatorKeys);
  const b = document.getElementById('badge-2fa_auth');
  if (b) b.textContent = authenticatorKeys.length;
}

function save2FaKeyFromMain() {
  const labelInput = document.getElementById('auth-main-label');
  const userInput = document.getElementById('auth-main-user');
  const keyInput = document.getElementById('auth-main-key');

  const rawLabel = labelInput.value.trim();
  const rawUser = userInput.value.trim();
  const rawKey = keyInput.value.replace(/[\s\-=]+/g, '').toUpperCase();

  if (!rawLabel || !rawKey) {
    if (typeof showToast === 'function') showToast("Harap isi Nama Layanan & Kunci Rahasia!", "warning");
    return;
  }

  if (!/^[A-Z2-7]+$/.test(rawKey)) {
    if (typeof showToast === 'function') showToast("Kunci Rahasia tidak valid! Base32 hanya boleh berisi huruf A-Z dan angka 2-7.", "error");
    return;
  }

  const newId = '2fa-' + Date.now();
  authenticatorKeys.push({ 
    id: newId, 
    label: rawLabel, 
    user: rawUser || '-', 
    key: rawKey 
  });

  saveAuthenticatorKeys();
  renderAuthenticatorKeys();
  if (typeof showToast === 'function') showToast(`Kunci OTP ${rawLabel} berhasil ditambahkan!`);
  
  labelInput.value = '';
  userInput.value = '';
  keyInput.value = '';
}

function delete2FaKey(id) {
  const keyObj = authenticatorKeys.find(k => k.id === id);
  const nameLabel = keyObj ? keyObj.label : "Kunci OTP";
  
  if (typeof showCustomConfirm === 'function') {
    showCustomConfirm("Hapus Kunci OTP?", `Akun OTP "${nameLabel}" Anda akan dihapus secara permanen.`, () => {
      authenticatorKeys = authenticatorKeys.filter(k => k.id !== id);
      saveAuthenticatorKeys();
      renderAuthenticatorKeys();
      if (typeof showToast === 'function') showToast(`Kunci OTP "${nameLabel}" telah dihapus.`);
    }, 'fa-trash-can');
  }
}

// TOTP clock ticking engine
function startTotpEngine() {
  if (totpIntervalId) clearInterval(totpIntervalId);
  
  function updateTick() {
    const now = Date.now();
    const secondsLeft = 30 - (Math.floor(now / 1000) % 30);
    
    const tt = document.getElementById('otp-timer-text'); 
    const pb = document.getElementById('otp-progress-bar');
    
    if (tt) tt.textContent = secondsLeft;
    if (pb) { 
      const percentage = (secondsLeft / 30) * 100;
      pb.style.width = `${percentage}%`; 
      if (secondsLeft < 6) {
        pb.className = "h-full bg-rose-500 rounded-full transition-all duration-300";
      } else {
        pb.className = "h-full bg-blue-600 rounded-full transition-all duration-300";
      }
    }
    
    renderAuthenticatorKeys();
  }
  
  updateTick();
  totpIntervalId = setInterval(updateTick, 1000);
}

// QR Scanner Cam control
function toggleQrScanner() {
  if (typeof Html5Qrcode === 'undefined') {
    if (typeof showToast === 'function') showToast("Pustaka QR Scanner belum siap dimuat.", "error");
    return;
  }
  const wrp = document.getElementById('qr-reader-wrapper');
  const bText = document.getElementById('text-btn-scan');
  if (isScanning) {
    if (wrp) wrp.classList.add('hidden');
    if (bText) bText.textContent = "Scan Kamera";
    isScanning = false;
    if (qrScannerObj) {
      qrScannerObj.stop().catch(() => {});
    }
  } else {
    if (wrp) wrp.classList.remove('hidden');
    if (bText) bText.textContent = "Hentikan";
    isScanning = true;
    qrScannerObj = new Html5Qrcode("qr-reader");
    qrScannerObj.start(
      { facingMode: "environment" },
      { fps: 15, qrbox: 220 },
      res => {
        toggleQrScanner();
        handleQrCodeResult(res);
      },
      () => {}
    ).catch(() => {
      toggleQrScanner();
      if (typeof showToast === 'function') showToast("Gagal mengakses kamera internal perangkat.", "error");
    });
  }
}

function triggerQrFileInput() { 
  const fileInput = document.getElementById('qr-file-input');
  if (fileInput) fileInput.click(); 
}

function scanQrFile(e) {
  if (typeof Html5Qrcode === 'undefined') {
    if (typeof showToast === 'function') showToast("Pustaka QR Reader belum siap.", "error");
    return;
  }
  if(e.target.files[0]) {
    new Html5Qrcode("qr-reader").scanFile(e.target.files[0], true).then(res => {
      handleQrCodeResult(res);
    }).catch(() => {
      if (typeof showToast === 'function') showToast("Gagal mendeteksi kode QR dalam gambar tersebut.", "error");
    });
  }
}
