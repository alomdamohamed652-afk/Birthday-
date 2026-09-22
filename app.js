(() => {
  const cfg = window.BIRTHDAY_CONFIG;
  const $ = (s) => document.querySelector(s);

  const lock = $("#lock-screen");
  const birthday = $("#birthday-screen");
  const pinSlots = $("#pin-slots");
  const keypad = $("#keypad");
  const pinError = $("#pin-error");
  let entered = "";

  $("#lock-subtitle").textContent = cfg.lockScreen.subtitle;

  function renderSlots() {
    pinSlots.innerHTML = "";
    for (let i = 0; i < 8; i++) {
      const slot = document.createElement("div");
      slot.className = "pin-slot" + (i < entered.length ? " filled" : "");
      slot.textContent = i < entered.length ? "●" : "";
      pinSlots.appendChild(slot);
    }
  }

  ["1","2","3","4","5","6","7","8","9","clear","0","back"].forEach((key) => {
    const button = document.createElement("button");
    button.className = "key" + (key === "clear" || key === "back" ? " utility" : "");
    button.textContent = key === "back" ? "⌫" : key === "clear" ? "C" : key;
    button.type = "button";
    button.addEventListener("click", () => pressKey(key));
    keypad.appendChild(button);
  });

  function pressKey(key) {
    pinError.textContent = "";
    if (key === "clear") entered = "";
    else if (key === "back") entered = entered.slice(0, -1);
    else if (entered.length < 8) entered += key;
    renderSlots();
    if (entered.length === 8) setTimeout(checkBirthday, 180);
  }

  function checkBirthday() {
    if (entered === cfg.birthday) unlock();
    else {
      pinError.textContent = cfg.lockScreen.wrongDateMessage;
      pinSlots.classList.remove("shake");
      void pinSlots.offsetWidth;
      pinSlots.classList.add("shake");
      setTimeout(() => { entered = ""; renderSlots(); }, 650);
    }
  }

  function unlock() {
    lock.classList.add("exit");
    setTimeout(() => {
      lock.classList.add("hidden");
      birthday.classList.remove("hidden");
      birthday.classList.add("enter");
      document.body.classList.add("unlocked");
      buildBirthday();
      window.scrollTo({ top: 0, behavior: "instant" });
    }, 550);
  }

  renderSlots();

  function buildBirthday() {
    $("#recipient-name").textContent = cfg.recipientName;
    $("#intro-text").textContent = cfg.intro.text;
    $("#final-title").textContent = cfg.final.title;
    $("#final-message").textContent = cfg.final.message;
    $("#signature").textContent = cfg.final.signature;
    buildScratchCards();
    buildLetters();
    buildHeartField();
    createFloatingHearts();
  }

  function buildScratchCards() {
    const grid = $("#scratch-grid");
    cfg.scratchCards.forEach((card, index) => {
      const wrapper = document.createElement("article");
      wrapper.className = "scratch-card";
      wrapper.innerHTML = `
        <div class="scratch-content">
          <div class="scratch-number">0${index + 1}</div>
          <h4>${escapeHTML(card.title)}</h4>
          <p>${escapeHTML(card.reveal)}</p>
        </div>
        <canvas class="scratch-canvas" aria-label="Scratch to reveal"></canvas>
        <div class="scratch-label">SCRATCH ♡</div>
      `;
      grid.appendChild(wrapper);
      setupScratch(wrapper.querySelector("canvas"), wrapper);
    });
  }

  function setupScratch(canvas, wrapper) {
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    let drawing = false, last = null;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(rect.width * ratio));
      canvas.height = Math.max(1, Math.floor(rect.height * ratio));
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#e9c7cf";
      ctx.fillRect(0, 0, rect.width, rect.height);
      ctx.fillStyle = "rgba(255,255,255,.30)";
      for (let x = -20; x < rect.width + 20; x += 18) {
        ctx.beginPath(); ctx.arc(x, 18, 2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = "#a86d7b";
      ctx.font = "600 12px DM Sans, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("SCRATCH TO REVEAL ♡", rect.width / 2, rect.height / 2 + 4);
    }

    function point(e) {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    function scratch(e) {
      if (!drawing) return;
      e.preventDefault();
      const p = point(e);
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = 34; ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.beginPath();
      if (last) ctx.moveTo(last.x, last.y); else ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      last = p;
      checkRevealed();
    }

    function checkRevealed() {
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let transparent = 0;
      for (let i = 3; i < data.length; i += 32) if (data[i] < 60) transparent++;
      if (transparent / (data.length / 32) > 0.42) {
        wrapper.classList.add("revealed");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    canvas.addEventListener("pointerdown", e => { drawing = true; last = null; canvas.setPointerCapture?.(e.pointerId); scratch(e); });
    canvas.addEventListener("pointermove", scratch);
    canvas.addEventListener("pointerup", () => { drawing = false; last = null; });
    canvas.addEventListener("pointercancel", () => { drawing = false; last = null; });
    window.addEventListener("resize", resize);
    requestAnimationFrame(resize);
  }

  function buildLetters() {
    const grid = $("#letters-grid");
    cfg.letters.forEach((letter, index) => {
      const button = document.createElement("button");
      button.className = "letter-card";
      button.type = "button";
      button.innerHTML = `
        <span class="letter-icon">✉</span>
        <span class="letter-index">0${index + 1}</span>
        <strong>${escapeHTML(letter.label)}</strong>
        <small>OPEN ME ♡</small>
      `;
      button.addEventListener("click", () => openLetter(letter));
      grid.appendChild(button);
    });
  }

  function openLetter(letter) {
    $("#modal-label").textContent = letter.label;
    $("#modal-title").textContent = letter.title;
    $("#modal-message").textContent = letter.message;
    $("#letter-modal").classList.remove("hidden");
    document.body.classList.add("modal-open");
  }

  document.addEventListener("click", e => {
    if (e.target.matches("[data-close]")) {
      $("#letter-modal").classList.add("hidden");
      document.body.classList.remove("modal-open");
    }
  });

  function buildHeartField() {
    const field = $("#heart-field");
    cfg.heartMessages.forEach((message, i) => {
      const heart = document.createElement("button");
      heart.className = "memory-heart";
      heart.type = "button";
      heart.style.setProperty("--delay", `${i * 0.2}s`);
      heart.style.setProperty("--x", `${12 + ((i * 17) % 76)}%`);
      heart.style.setProperty("--y", `${15 + ((i * 29) % 65)}%`);
      heart.textContent = i % 2 ? "♡" : "♥";
      heart.addEventListener("click", () => {
        heart.classList.add("found");
        setTimeout(() => alert(message), 80);
      });
      field.appendChild(heart);
    });
  }

  function createFloatingHearts() {
    const host = $("#hearts");
    for (let i = 0; i < 18; i++) {
      const heart = document.createElement("span");
      heart.className = "floating-heart";
      heart.textContent = i % 3 === 0 ? "♥" : "♡";
      heart.style.left = `${Math.random() * 100}%`;
      heart.style.animationDelay = `${Math.random() * 8}s`;
      heart.style.animationDuration = `${8 + Math.random() * 7}s`;
      heart.style.fontSize = `${10 + Math.random() * 14}px`;
      host.appendChild(heart);
    }
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, c => ({
      "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
    }[c]));
  }
})();