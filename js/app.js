const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbync4OzjipN7O8-Ky8yGjLAMhdMsxwAUjTzF7dg7EwLCMHBR66ZRwK5M2QzQJ_WbEmN/exec";

const MAPEL_LIST = [
  "PAI", "PPKn", "Bahasa Indonesia", "Matematika", 
  "IPA", "IPS", "Bahasa Inggris", "PJOK", "Informatika / TIK", "Seni Budaya"
];

const app = {
  state: {
    selectedMapel: "",
    selectedKelas: "",
    selectedBabFile: "",
    jsonData: null,
    activeSoal: [],
    userAnswers: {},
    currentIndex: 0,
    siswaData: {},
    timerInterval: null,
    remainingTime: 0,
    violationCount: 0,
    isExamRunning: false
  },

  init() {
    this.renderMapel();
    this.checkLocalStorage();
    this.setupAntiCheat();
  },

  renderMapel() {
    const list = document.getElementById("listMapel");
    list.innerHTML = MAPEL_LIST.map(m => 
      `<button class="btn" onclick="app.selectMapel('${m}')">${m}</button>`
    ).join("");
  },

  selectMapel(mapel) {
    this.state.selectedMapel = mapel;
    this.switchStep("stepKelas");
  },

  selectKelas(kelas) {
    this.state.selectedKelas = kelas;
    this.loadBabList();
    this.switchStep("stepBab");
  },

  loadBabList() {
    const list = document.getElementById("listBab");
    const filename = `${this.state.selectedMapel.toLowerCase().replace(/[^a-z0-9]/g, '')}_${this.state.selectedKelas}_bab1.json`;
    
    list.innerHTML = `
      <div class="card" style="border: 1px solid #cbd5e1;">
        <h4>Bab 1: Penilaian Harian / Sumatif</h4>
        <p style="font-size:0.85rem; color:#64748b;">File target: data/${filename}</p>
        <br>
        <button class="btn btn-success" onclick="app.selectBab('data/${filename}')">Pilih Materi Ini</button>
      </div>
    `;
  },

  async selectBab(filePath) {
    try {
      const res = await fetch(filePath);
      if(!res.ok) throw new Error("File soal belum tersedia.");
      this.state.jsonData = await res.json();
      this.state.selectedBabFile = filePath;
      this.switchStep("stepFormSiswa");
    } catch (e) {
      alert("Gagal memuat bank soal: " + e.message);
    }
  },

  switchStep(stepId) {
    ["stepMapel", "stepKelas", "stepBab", "stepFormSiswa", "stepKuis"].forEach(id => {
      document.getElementById(id).classList.add("hidden");
    });
    document.getElementById(stepId).classList.remove("hidden");
  },

  navBack(stepId) { this.switchStep(stepId); },

  prepareExamSoal(masterBank) {
    const shuffled = [...masterBank].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 40);

    return selected.map(s => {
      const originalOptions = s.pilihan.map((text, idx) => ({ text, isCorrect: idx === s.kunci }));
      const shuffledOptions = originalOptions.sort(() => 0.5 - Math.random());
      
      return {
        id: s.id,
        soal: s.soal,
        pilihan: shuffledOptions.map(o => o.text),
        kunciBaru: shuffledOptions.findIndex(o => o.isCorrect)
      };
    });
  },

  startExam(e) {
    e.preventDefault();
    const tokenInput = document.getElementById("siswaToken").value.trim();
    const nisn = document.getElementById("siswaNisn").value.trim();

    if(nisn.length !== 10) return alert("NISN harus 10 digit!");
    if(tokenInput !== this.state.jsonData.metadata.token) return alert("Token Ujian Salah!");

    this.state.siswaData = {
      nama: document.getElementById("siswaNama").value.trim(),
      nisn: nisn,
      rombel: document.getElementById("siswaRombel").value.trim()
    };

    this.state.activeSoal = this.prepareExamSoal(this.state.jsonData.bank_soal);
    this.state.remainingTime = this.state.jsonData.metadata.durasi_menit * 60;
    this.state.isExamRunning = true;

    this.requestFullscreen();

    document.getElementById("displayNama").innerText = this.state.siswaData.nama;
    document.getElementById("stickyTimer").classList.remove("hidden");
    this.switchStep("stepKuis");

    this.startTimer();
    this.renderCurrentSoal();
    this.renderGridNav();
    this.saveStateToLocal();
  },

  renderCurrentSoal() {
    const idx = this.state.currentIndex;
    const q = this.state.activeSoal[idx];
    document.getElementById("soalNumber").innerText = `Soal ${idx + 1} dari ${this.state.activeSoal.length}`;
    document.getElementById("soalText").innerText = q.soal;

    const optContainer = document.getElementById("optionsContainer");
    const prefixes = ["A", "B", "C", "D"];
    
    optContainer.innerHTML = q.pilihan.map((optText, optIdx) => {
      const isSelected = this.state.userAnswers[idx] === optIdx ? "selected" : "";
      return `
        <div class="option-item ${isSelected}" onclick="app.chooseAnswer(${optIdx})">
          <div class="option-prefix">${prefixes[optIdx]}</div>
          <div>${optText}</div>
        </div>
      `;
    }).join("");

    document.getElementById("btnPrev").style.visibility = idx === 0 ? "hidden" : "visible";
    document.getElementById("btnNext").style.visibility = idx === this.state.activeSoal.length - 1 ? "hidden" : "visible";
  },

  chooseAnswer(optIdx) {
    this.state.userAnswers[this.state.currentIndex] = optIdx;
    this.renderCurrentSoal();
    this.renderGridNav();
    this.saveStateToLocal();
  },

  nextSoal() {
    if(this.state.currentIndex < this.state.activeSoal.length - 1) {
      this.state.currentIndex++;
      this.renderCurrentSoal();
      this.renderGridNav();
    }
  },

  prevSoal() {
    if(this.state.currentIndex > 0) {
      this.state.currentIndex--;
      this.renderCurrentSoal();
      this.renderGridNav();
    }
  },

  renderGridNav() {
    const grid = document.getElementById("gridNavSoal");
    grid.innerHTML = this.state.activeSoal.map((_, idx) => {
      const isAnswered = this.state.userAnswers[idx] !== undefined;
      const isActive = this.state.currentIndex === idx;
      let cls = "btn-num";
      if(isAnswered) cls += " answered";
      if(isActive) cls += " active";
      return `<button class="${cls}" onclick="app.jumpToSoal(${idx})">${idx + 1}</button>`;
    }).join("");
  },

  jumpToSoal(idx) {
    this.state.currentIndex = idx;
    this.renderCurrentSoal();
    this.renderGridNav();
  },

  startTimer() {
    this.state.timerInterval = setInterval(() => {
      this.state.remainingTime--;
      this.updateTimerDisplay();
      this.saveStateToLocal();

      if(this.state.remainingTime <= 0) {
        clearInterval(this.state.timerInterval);
        alert("Waktu Ujian telah Habis!");
        this.submitExam("Selesai (Auto-Submit Timeout)");
      }
    }, 1000);
  },

  updateTimerDisplay() {
    const m = Math.floor(this.state.remainingTime / 60).toString().padStart(2, '0');
    const s = (this.state.remainingTime % 60).toString().padStart(2, '0');
    document.getElementById("timerCount").innerText = `${m}:${s}`;
  },

  saveStateToLocal() {
    if(!this.state.isExamRunning) return;
    const payload = {
      siswaData: this.state.siswaData,
      activeSoal: this.state.activeSoal,
      userAnswers: this.state.userAnswers,
      remainingTime: this.state.remainingTime,
      violationCount: this.state.violationCount,
      metadata: this.state.jsonData.metadata,
      currentIndex: this.state.currentIndex
    };
    localStorage.setItem("limatask_state", JSON.stringify(payload));
  },

  checkLocalStorage() {
    const saved = localStorage.getItem("limatask_state");
    if(saved) {
      if(confirm("Lanjutkan sesi ujian sebelumnya?")) {
        const data = JSON.parse(saved);
        this.state.siswaData = data.siswaData;
        this.state.activeSoal = data.activeSoal;
        this.state.userAnswers = data.userAnswers;
        this.state.remainingTime = data.remainingTime;
        this.state.violationCount = data.violationCount;
        this.state.jsonData = { metadata: data.metadata };
        this.state.currentIndex = data.currentIndex;
        this.state.isExamRunning = true;

        document.getElementById("displayNama").innerText = this.state.siswaData.nama;
        document.getElementById("stickyTimer").classList.remove("hidden");
        this.updateViolationBadge();
        this.switchStep("stepKuis");
        this.startTimer();
        this.renderCurrentSoal();
        this.renderGridNav();
      } else {
        localStorage.removeItem("limatask_state");
      }
    }
  },

  setupAntiCheat() {
    ['contextmenu', 'copy', 'paste', 'cut', 'selectstart'].forEach(evt => {
      document.addEventListener(evt, e => {
        if(this.state.isExamRunning) e.preventDefault();
      });
    });

    document.addEventListener('keydown', e => {
      if(!this.state.isExamRunning) return;
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J" || e.key === "C")) ||
        (e.ctrlKey && e.key === "u")
      ) {
        e.preventDefault();
        this.triggerViolation("Shortcut Inspect Element terdeteksi!");
      }
    });

    document.addEventListener("visibilitychange", () => {
      if(this.state.isExamRunning && document.hidden) {
        this.triggerViolation("Terdeteksi pindah aplikasi/tab!");
      }
    });

    window.addEventListener("blur", () => {
      if(this.state.isExamRunning) {
        this.triggerViolation("Terdeteksi kehilangan fokus layar!");
      }
    });

    history.pushState(null, null, location.href);
    window.addEventListener("popstate", () => {
      if(this.state.isExamRunning) {
        history.pushState(null, null, location.href);
        this.triggerViolation("Tombol Back dilarang!");
      }
    });
  },

  triggerViolation(reason) {
    this.state.violationCount++;
    this.updateViolationBadge();
    AudioAlarm.playViolateBeep();

    alert(`⚠️ PERINGATAN PELANGGARAN (${this.state.violationCount}/5)\nReason: ${reason}`);

    if(this.state.violationCount >= 5) {
      clearInterval(this.state.timerInterval);
      alert("❌ DISKUALIFIKASI! Mencapai 5x pelanggaran.");
      this.submitExam("Diskualifikasi: 5x Pelanggaran");
    } else {
      this.saveStateToLocal();
    }
  },

  updateViolationBadge() {
    document.getElementById("violateBadge").innerText = `Pelanggaran: ${this.state.violationCount}/5`;
  },

  requestFullscreen() {
    const doc = document.documentElement;
    if (doc.requestFullscreen) doc.requestFullscreen();
    else if (doc.webkitRequestFullscreen) doc.webkitRequestFullscreen();
  },

  confirmSubmit() {
    if(confirm(`Kumpulkan jawaban sekarang?`)) {
      this.submitExam("Selesai (User Submit)");
    }
  },

  async submitExam(status) {
    this.state.isExamRunning = false;
    clearInterval(this.state.timerInterval);

    let correctCount = 0;
    this.state.activeSoal.forEach((q, idx) => {
      if(this.state.userAnswers[idx] === q.kunciBaru) correctCount++;
    });

    const finalScore = Math.round((correctCount / this.state.activeSoal.length) * 100);

    const payload = {
      action: "submitNilai",
      sheet_id: this.state.jsonData.metadata.sheet_id,
      timestamp: new Date().toLocaleString("id-ID"),
      nisn: this.state.siswaData.nisn,
      nama: this.state.siswaData.nama,
      rombel: this.state.siswaData.rombel,
      mapel: this.state.jsonData.metadata.mapel,
      bab: this.state.jsonData.metadata.bab,
      nilai: finalScore,
      pelanggaran: this.state.violationCount,
      status: status,
      detailJawaban: JSON.stringify(this.state.userAnswers)
    };

    document.body.innerHTML = `<h2 style="text-align:center; padding:50px;">Mengirim Jawaban...</h2>`;

    try {
      await fetch(GAS_WEB_APP_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      localStorage.removeItem("limatask_state");

      document.body.innerHTML = `
        <div style="text-align:center; padding:50px; font-family:sans-serif;">
          <h2 style="color:green;">Jawaban Berhasil Terkirim!</h2>
          <p><b>Nama:</b> ${payload.nama}</p>
          <p><b>Nilai:</b> ${payload.nilai}</p>
          <br>
          <button onclick="window.location.reload()">Kembali</button>
        </div>
      `;
    } catch(err) {
      alert("Gagal kirim data ke server.");
    }
  }
};

window.onload = () => app.init();
