const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbync4OzjipN7O8-Ky8yGjLAMhdMsxwAUjTzF7dg7EwLCMHBR66ZRwK5M2QzQJ_WbEmN/exec";

const guruApp = {
  masterBankSoal: [],
  rekapData: [],

  login() {
    const pin = document.getElementById("pinGuru").value;
    if(pin === "5555") {
      document.getElementById("secLoginGuru").classList.add("hidden");
      document.getElementById("secDashboard").classList.remove("hidden");
    } else {
      alert("PIN Salah!");
    }
  },

  switchTab(tabId) {
    document.getElementById("tabRekap").classList.add("hidden");
    document.getElementById("tabBankSoal").classList.add("hidden");
    document.getElementById(tabId).classList.remove("hidden");
  },

  async fetchRekap() {
    const sheetId = document.getElementById("targetSheetId").value.trim();
    if(!sheetId) return alert("Masukkan Sheet ID!");

    try {
      const res = await fetch(`${GAS_WEB_APP_URL}?action=getRekap&sheet_id=${sheetId}`);
      const data = await res.json();
      
      this.rekapData = data;
      const tbody = document.querySelector("#tableRekap tbody");

      if(data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">Data Kosong.</td></tr>`;
        return;
      }

      tbody.innerHTML = data.map(row => `
        <tr>
          <td style="padding:6px;">${row.timestamp}</td>
          <td>${row.nisn}</td>
          <td>${row.nama}</td>
          <td>${row.rombel}</td>
          <td><b>${row.nilai}</b></td>
          <td>${row.pelanggaran}</td>
          <td>${row.status}</td>
        </tr>
      `).join("");
    } catch(e) {
      alert("Gagal ambil data rekap!");
    }
  },

  exportToCSV() {
    if(this.rekapData.length === 0) return alert("Data kosong!");
    
    let csvContent = "data:text/csv;charset=utf-8,Waktu,NISN,Nama,Kelas,Nilai,Pelanggaran,Status\n";
    this.rekapData.forEach(r => {
      csvContent += `"${r.timestamp}","${r.nisn}","${r.nama}","${r.rombel}","${r.nilai}","${r.pelanggaran}","${r.status}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Rekap_Nilai_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  addSoalToMemory() {
    const soal = document.getElementById("inputSoalText").value.trim();
    const a = document.getElementById("optA").value.trim();
    const b = document.getElementById("optB").value.trim();
    const c = document.getElementById("optC").value.trim();
    const d = document.getElementById("optD").value.trim();
    const kunci = parseInt(document.getElementById("optKunci").value);

    if(!soal || !a || !b || !c || !d) return alert("Isi semua bidang soal!");

    this.masterBankSoal.push({
      id: this.masterBankSoal.length + 1,
      soal: soal,
      pilihan: [a, b, c, d],
      kunci: kunci
    });

    document.getElementById("countSoal").innerText = this.masterBankSoal.length;

    document.getElementById("inputSoalText").value = "";
    document.getElementById("optA").value = "";
    document.getElementById("optB").value = "";
    document.getElementById("optC").value = "";
    document.getElementById("optD").value = "";
  },

  downloadJSON() {
    if(this.masterBankSoal.length === 0) return alert("Soal masih kosong!");

    const outputObj = {
      metadata: {
        mapel: document.getElementById("genMapel").value,
        kelas: document.getElementById("genKelas").value,
        bab: document.getElementById("genBab").value,
        durasi_menit: parseInt(document.getElementById("genDurasi").value),
        token: document.getElementById("genToken").value,
        sheet_id: document.getElementById("genSheetId").value
      },
      bank_soal: this.masterBankSoal
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(outputObj, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `${outputObj.metadata.mapel.toLowerCase()}_${outputObj.metadata.kelas}_bab1.json`);
    dlAnchorElem.click();
  }
};
