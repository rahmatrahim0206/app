// ==========================================================
// SECURE DATA STORAGE, SYSTEM BACKUP, AND DISASTER RESET
// ==========================================================

function secureSave(key, rawData) {
  try {
    const stringified = JSON.stringify(rawData);
    if (typeof CryptoJS !== 'undefined' && CONFIG.SECURE_PASS_KEY) {
      localStorage.setItem(key, CryptoJS.AES.encrypt(stringified, CONFIG.SECURE_PASS_KEY).toString());
    } else {
      localStorage.setItem(key, stringified);
    }
  } catch (error) {
    localStorage.setItem(key, JSON.stringify(rawData));
  }
}

function secureRead(key) {
  try {
    const rawValue = localStorage.getItem(key);
    if (!rawValue) return null;
    if (rawValue.startsWith('[') || rawValue.startsWith('{') || rawValue.startsWith('"')) {
      return JSON.parse(rawValue);
    }
    if (typeof CryptoJS !== 'undefined' && CONFIG.SECURE_PASS_KEY) {
      const dec = CryptoJS.AES.decrypt(rawValue, CONFIG.SECURE_PASS_KEY).toString(CryptoJS.enc.Utf8);
      return dec ? JSON.parse(dec) : null;
    }
    return JSON.parse(rawValue);
  } catch (error) {
    return null;
  }
}

// Prosedur Ekspor File Pencadangan
function exportBackupData() { 
  const payload = {
    links: linksData,
    agendas: agendaData,
    notes: notesData,
    authKeys: authenticatorKeys
  };
  const b = new Blob([JSON.stringify(payload)], { type: 'application/json' }); 
  const u = URL.createObjectURL(b);
  const a = document.createElement('a');
  a.href = u;
  a.download = `cadangan_dapohub_${CONFIG.SCHOOL_CODE_ABBR.toLowerCase()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  if (typeof showToast === 'function') showToast("Berkas pencadangan sistem berhasil diekspor!");
}

function triggerImportData() { 
  const importInput = document.getElementById('import-file-input');
  if (importInput) importInput.click(); 
}

// Prosedur Impor File Pemulihan
function importBackupData(e) { 
  if (e.target.files[0]) { 
    const r = new FileReader();
    r.onload = (ev) => { 
      try { 
        const d = JSON.parse(ev.target.result); 
        linksData = d.links || linksData;
        agendaData = d.agendas || agendaData;
        notesData = d.notes || notesData;
        authenticatorKeys = d.authKeys || authenticatorKeys; 
        
        saveLinks();
        saveAgenda();
        secureSave(CONFIG.STORAGE_PREFIX + 'notes', notesData);
        saveAuthenticatorKeys();
        
        if (typeof renderAll === 'function') renderAll();
        if (typeof initCalendar === 'function') initCalendar(); 
        if (typeof renderQuickNotes === 'function') renderQuickNotes();
        if (typeof showToast === 'function') showToast("Seluruh data sistem berhasil dipulihkan!"); 
      } catch (ex) {
        if (typeof showToast === 'function') showToast("Format berkas cadangan tidak dikenali atau rusak.", "error");
      } 
    };
    r.readAsText(e.target.files[0]); 
  } 
}

// Prosedur Reset Darurat (DIPERBAIKI: Mengosongkan data localStorage dan sessionStorage)
function triggerEmergencyReset() {
  if (typeof showCustomConfirm === 'function') {
    showCustomConfirm(
      "Lakukan Atur Ulang Darurat?", 
      "PERINGATAN SENSITIF: Tindakan ini akan menghapus seluruh data Anda secara permanen dari browser ini, termasuk Master PIN, kunci keamanan 2FA, catatan memo, agenda, serta tautan kustom. Sistem akan dimuat ulang ke pengaturan awal pabrik.", 
      () => {
        // 1. Bersihkan database permanen di localStorage
        const keysToRemove = ['links', 'agendas', 'notes', 'auth-keys', 'wa-templates', 'master-pin'];
        keysToRemove.forEach(key => {
          localStorage.removeItem(CONFIG.STORAGE_PREFIX + key);
        });

        // 2. Bersihkan penampung sesi sementara di sessionStorage agar tidak membypass otentikasi setelah reload
        const sessionKeysToRemove = ['session-pin', 'session-hash', 'last-active', 'session-locked'];
        sessionKeysToRemove.forEach(key => {
          sessionStorage.removeItem(CONFIG.STORAGE_PREFIX + key);
        });
        
        if (typeof updateClock === 'function') updateClock();
        if (typeof showToast === 'function') showToast("Prosedur darurat dijalankan. Memuat ulang sistem...", "error");
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }, 
      'fa-triangle-exclamation'
    );
  }
}
