(() => {
  "use strict";

  const cfg = window.BIRTHDAY_CONFIG;
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  const lock = $("#lock-screen");
  const birthday = $("#birthday-screen");
  const pinSlots = $("#pin-slots");
  const keypad = $("#keypad");
  const pinError = $("#pin-error");

  let entered = "";
  let unlocked = false;
  let foundHearts = 0;
  let audio = null;

  // ---------- INITIAL CONTENT ----------
  document.title = cfg.site?.title || "A Little Birthday Story";

  $("#lock-eyebrow").textContent = cfg.lockScreen.eyebrow;
  $("#lock-title").innerHTML = cfg.lockScreen.title;
  $("#lock-subtitle").textContent = cfg.lockScreen.subtitle;
  $("#pin-hint").textContent = cfg.lockScreen.hint;

  $("#hero-eyebrow").textContent = cfg.hero.eyebrow;
  $("#hero-prefix").textContent = cfg.hero.titlePrefix;
  $("#hero-scroll").textContent = cfg.hero.scrollText;

  $("#intro-title").textContent = cfg.intro.title;
  $("#intro-text").textContent = cfg.intro.text;
  $("#intro-button").textContent = cfg.intro.button;

  $("#scratch-title").textContent = cfg.scratch.title;
  $("#scratch-copy").textContent = cfg.scratch.copy;

  $("#letters-title").textContent = cfg.letters.title;
  $("#letters-copy").textContent = cfg.letters.copy;

  $("#hearts-title").textContent = cfg.hearts.title;
  $("#hearts-copy").textContent = cfg.hearts.copy;

  $("#final-eyebrow").textContent = cfg.final.eyebrow;
  $("#final-title").textContent = cfg.final.title;
  $("#final-message").textContent = cfg.final.message;
  $("#signature").textContent = cfg.final.signature;
  $("#replay-button").textContent = cfg.final.button;

  // ---------- PIN INPUT ----------
  function renderSlots() {
    pinSlots.innerHTML = "";
    for (let i = 0; i < 8; i += 1) {
      const slot = document.createElement("div");
      slot.className = "pin-slot" + (i < entered.length ? " filled" : "");
      slot.innerHTML = i < entered.length
        ? '<span class="pin-dot">●</span>'
        : '<span class="pin-empty"></span>';
      pinSlots.appendChild(slot);
    }
  }

  const keys = ["1","2","3","4","5","6","7","8","9","clear","0","back"];
  keys.forEach((key) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "key" + (key === "clear" || key === "back" ? " utility" : "");
    button.textContent = key === "back" ? "⌫" : key === "clear" ? "C" : key;
    button.setAttribute("aria-label", key === "back" ? "Delete" : key);
    button.addEventListener("click", () => pressKey(key));
    keypad.appendChild(button);
  });

  function pressKey(key) {
    if (unlocked) return;
    pinError.textContent = "";

    if (key === "clear") entered = "";
    else if (key === "back") entered = entered.slice(0, -1);
    else if (entered.length < 8) entered += key;

    renderSlots();

    if (entered.length === 8) {
      window.setTimeout(checkBirthday, 180);
    }
  }

  document.addEventListener("keydown", (event) => {
    if (!lock || lock.classList.contains("hidden")) return;

    if (/^[0-9]$/.test(event.key)) pressKey(event.key);
    else if (event.key === "Backspace") pressKey("back");
    else if (event.key === "Escape") pressKey("clear");
  });

  function checkBirthday() {
    if (entered === String(cfg.birthday)) {
      unlock();
      return;
    }

    pinError.textContent = cfg.lockScreen.wrongDateMessage;
    pinSlots.classList.remove("shake");
    void pinSlots.offsetWidth;
    pinSlots.classList.add("shake");

    window.setTimeout(() => {
      entered = "";
      renderSlots();
    }, 650);
  }

  function unlock() {
    if (unlocked) return;
    unlocked = true;

    lock.classList.add("exit");

    window.setTimeout(() => {
      lock.classList.add("hidden");
      birthday.classList.remove("hidden");
      birthday.classList.add("enter");
      document.body.classList.add("unlocked");

      buildBirthday();
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: "instant" });
        setupProgress();
      });
    }, 600);
  }

  renderSlots();

  // ---------- BUILD EXPERIENCE ----------
  function buildBirthday() {
    $("#recipient-name").textContent = cfg.recipientName;
    buildScratchCards();
    buildLetters();
    buildHeartField();
    createFloatingHearts();
    setupIntroButton();
    setupReplay();
    setupSound();
  }

  // ---------- SCRATCH CARDS ----------
  function buildScratchCards() {
    const grid = $("#scratch-grid");
    grid.innerHTML = "";

    cfg.scratch.cards.forEach((card, index) => {
      const wrapper = document.createElement("article");
      wrapper.className = "scratch-card";
      wrapper.innerHTML = `
        <div class="scratch-content">
          <div class="scratch-number">0${index + 1}</div>
          <div class="revealed-heart">♡</div>
          <h4>${escapeHTML(card.title)}</h4>
          <p>${escapeHTML(card.reveal)}</p>
          <span class="revealed-label">REVEALED · ♡</span>
        </div>
        <canvas class="scratch-canvas" aria-label="Scratch to reveal"></canvas>
        <div class="scratch-label">SCRATCH ♡</div>
      `;

      grid.appendChild(wrapper);
      setupScratch(wrapper.querySelector(".scratch-canvas"), wrapper);
    });
  }

  function setupScratch(canvas, wrapper) {
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    let drawing = false;
    let last = null;
    let resizeTimer;

    function paintCover() {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.max(1, Math.floor(rect.width * ratio));
      canvas.height = Math.max(1, Math.floor(rect.height * ratio));
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.globalCompositeOperation = "source-over";

      const gradient = ctx.createLinearGradient(0, 0, rect.width, rect.height);
      gradient.addColorStop(0, "#e8c4cd");
      gradient.addColorStop(0.5, "#f0d7dd");
      gradient.addColorStop(1, "#dfb8c2");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, rect.width, rect.height);

      // Soft paper-like dots.
      ctx.fillStyle = "rgba(255,255,255,.35)";
      for (let x = -20; x < rect.width + 20; x += 18) {
        for (let y = 8; y < rect.height; y += 18) {
          ctx.beginPath();
          ctx.arc(x + ((y / 18) % 2 ? 8 : 0), y, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.fillStyle = "#a66b79";
      ctx.font = "600 11px DM Sans, sans-serif";
      ctx.textAlign = "center";
      ctx.letterSpacing = "1px";
      ctx.fillText("SCRATCH TO REVEAL", rect.width / 2, rect.height / 2 - 2);
      ctx.font = "22px serif";
      ctx.fillText("♡", rect.width / 2, rect.height / 2 + 29);
    }

    function point(event) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      };
    }

    function scratch(event) {
      if (!drawing || wrapper.classList.contains("revealed")) return;
      event.preventDefault();

      const p = point(event);
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = 36;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.beginPath();
      if (last) ctx.moveTo(last.x, last.y);
      else ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();

      last = p;
      checkRevealed();
    }

    function checkRevealed() {
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let transparent = 0;

      // Sampling keeps the interaction fast on phones.
      for (let i = 3; i < data.length; i += 32) {
        if (data[i] < 60) transparent += 1;
      }

      const ratio = transparent / (data.length / 32);
      if (ratio >= 0.42) {
        wrapper.classList.add("revealed");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        burst(wrapper);
      }
    }

    canvas.addEventListener("pointerdown", (event) => {
      drawing = true;
      last = null;
      canvas.setPointerCapture?.(event.pointerId);
      scratch(event);
    });

    canvas.addEventListener("pointermove", scratch);
    canvas.addEventListener("pointerup", () => {
      drawing = false;
      last = null;
    });
    canvas.addEventListener("pointercancel", () => {
      drawing = false;
      last = null;
    });

    window.addEventListener("resize", () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        if (!wrapper.classList.contains("revealed")) paintCover();
      }, 120);
    });

    requestAnimationFrame(paintCover);
  }

  function burst(element) {
    for (let i = 0; i < 7; i += 1) {
      const particle = document.createElement("span");
      particle.className = "burst-heart";
      particle.textContent = i % 2 ? "♡" : "♥";
      particle.style.setProperty("--x", `${(Math.random() - 0.5) * 150}px`);
      particle.style.setProperty("--y", `${(Math.random() - 0.5) * 120}px`);
      element.appendChild(particle);
      window.setTimeout(() => particle.remove(), 850);
    }
  }

  // ---------- LETTERS / ENVELOPES ----------
  function buildLetters() {
    const grid = $("#letters-grid");
    grid.innerHTML = "";

    cfg.letters.cards.forEach((letter, index) => {
      const button = document.createElement("button");
      button.className = "letter-card";
      button.type = "button";
      button.innerHTML = `
        <span class="letter-envelope">
          <span class="envelope-flap"></span>
          <span class="envelope-heart">♡</span>
        </span>
        <span class="letter-index">0${index + 1}</span>
        <strong>${escapeHTML(letter.label)}</strong>
        <small>OPEN ME · ♡</small>
      `;
      button.addEventListener("click", () => openLetter(letter, button));
      grid.appendChild(button);
    });
  }

  function openLetter(letter, button) {
    button.classList.add("opened");
    $("#modal-label").textContent = letter.label;
    $("#modal-title").textContent = letter.title;
    $("#modal-message").textContent = letter.message;
    $("#letter-modal").classList.remove("hidden");
    document.body.classList.add("modal-open");
  }

  document.addEventListener("click", (event) => {
    if (!event.target.closest("[data-close]")) return;
    closeLetter();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeLetter();
  });

  function closeLetter() {
    $("#letter-modal").classList.add("hidden");
    document.body.classList.remove("modal-open");
  }

  // ---------- HEART HUNT ----------
  function buildHeartField() {
    const field = $("#heart-field");
    field.innerHTML = "";
    foundHearts = 0;

    const messages = cfg.hearts.messages;
    $("#heart-total").textContent = messages.length;
    $("#found-count").textContent = "0";

    messages.forEach((message, index) => {
      const heart = document.createElement("button");
      heart.className = "memory-heart";
      heart.type = "button";
      heart.setAttribute("aria-label", "Find hidden heart");
      heart.style.setProperty("--delay", `${index * 0.18}s`);
      heart.style.setProperty("--x", `${8 + ((index * 19) % 82)}%`);
      heart.style.setProperty("--y", `${10 + ((index * 31) % 74)}%`);
      heart.textContent = index % 2 ? "♡" : "♥";

      heart.addEventListener("click", () => {
        if (heart.classList.contains("found")) return;
        heart.classList.add("found");
        foundHearts += 1;
        $("#found-count").textContent = String(foundHearts);
        showHeartToast(message);

        if (foundHearts === messages.length) {
          window.setTimeout(() => showHeartToast("You found them all. One final surprise is waiting below. ♥"), 900);
        }
      });

      field.appendChild(heart);
    });
  }

  function showHeartToast(message) {
    const toast = $("#heart-toast");
    $("#heart-toast-message").textContent = message;
    toast.classList.remove("hidden");
    toast.classList.remove("show");
    void toast.offsetWidth;
    toast.classList.add("show");

    window.clearTimeout(showHeartToast.timer);
    showHeartToast.timer = window.setTimeout(() => {
      toast.classList.remove("show");
      window.setTimeout(() => toast.classList.add("hidden"), 350);
    }, 2700);
  }

  // ---------- FLOATING HEARTS ----------
  function createFloatingHearts() {
    const host = $("#hearts");
    host.innerHTML = "";

    for (let i = 0; i < 22; i += 1) {
      const heart = document.createElement("span");
      heart.className = "floating-heart";
      heart.textContent = i % 3 === 0 ? "♥" : "♡";
      heart.style.left = `${Math.random() * 100}%`;
      heart.style.animationDelay = `${Math.random() * 9}s`;
      heart.style.animationDuration = `${8 + Math.random() * 9}s`;
      heart.style.fontSize = `${9 + Math.random() * 13}px`;
      host.appendChild(heart);
    }
  }

  // ---------- SMALL UX ----------
  function setupIntroButton() {
    $("#intro-button").addEventListener("click", () => {
      document.querySelector(".scratch-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, { once: true });
  }

  function setupReplay() {
    $("#replay-button").addEventListener("click", () => {
      closeLetter();
      birthday.classList.add("hidden");
      lock.classList.remove("hidden", "exit");
      lock.classList.remove("exit");
      unlocked = false;
      entered = "";
      renderSlots();
      window.scrollTo({ top: 0, behavior: "instant" });
    });
  }

  function setupSound() {
    const toggle = $("#sound-toggle");
    const music = cfg.site?.music;

    if (!music?.enabled || !music.url) {
      toggle.classList.add("disabled");
      toggle.title = "Add a music URL in config.js";
      return;
    }

    audio = new Audio(music.url);
    audio.loop = true;
    audio.volume = 0.35;

    toggle.addEventListener("click", () => {
      if (audio.paused) {
        audio.play().then(() => {
          toggle.classList.add("playing");
          toggle.textContent = "♫";
        }).catch(() => {
          showHeartToast("Tap again after allowing audio. ♡");
        });
      } else {
        audio.pause();
        toggle.classList.remove("playing");
        toggle.textContent = "♪";
      }
    });
  }

  // ---------- SCROLL PROGRESS ----------
  function setupProgress() {
    const bar = $("#progress-bar");
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? (window.scrollY / max) * 100 : 0;
      bar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
    };

    window.addEventListener("scroll", update, { passive: true });
    update();
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[character]));
  }
})();