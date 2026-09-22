(() => {
  "use strict";

  const cfg = window.BIRTHDAY_CONFIG;
  const $ = (selector) => document.querySelector(selector);

  const lock = $("#lock-screen");
  const birthday = $("#birthday-screen");
  const pinSlots = $("#pin-slots");
  const keypad = $("#keypad");
  const pinError = $("#pin-error");

  let entered = "";
  let unlocked = false;
  let foundHearts = 0;
  let audio = null;
  let audioFadeTimer = null;
  let experienceBuilt = false;
  let audioContext = null;

  document.title = cfg.site?.title || "A Little Birthday Story";

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    });
  }

  $("#lock-eyebrow").textContent = cfg.lockScreen.eyebrow;
  $("#lock-title").innerHTML = cfg.lockScreen.title;
  $("#lock-subtitle").textContent = cfg.lockScreen.subtitle;
  $("#pin-hint").textContent = cfg.lockScreen.hint;
  setupCountdown();

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
  $("#final-title-text").textContent = cfg.final.title;
  $("#final-message").textContent = cfg.final.message;
  $("#signature").textContent = cfg.final.signature;
  $("#replay-button").textContent = cfg.final.button;

  // ---------- COUNTDOWN ----------

  function setupCountdown() {
    const box = $("#countdown");
    const settings = cfg.site?.countdown;
    if (!box || settings?.enabled === false) return;

    const raw = String(cfg.birthday || "");
    const day = Number(raw.slice(0, 2));
    const month = Number(raw.slice(2, 4));
    if (!day || !month) return;

    $("#countdown-label").textContent = settings.label || "فاضل على اليوم الحلو";

    const update = () => {
      const now = new Date();
      let target = new Date(now.getFullYear(), month - 1, day, 0, 0, 0, 0);
      const today = now.getMonth() === month - 1 && now.getDate() === day;

      if (!today && target < now) {
        target = new Date(now.getFullYear() + 1, month - 1, day, 0, 0, 0, 0);
      }

      box.classList.remove("hidden");

      if (today) {
        $("#countdown-label").textContent = "النهارده يومك ♡";
        ["days", "hours", "minutes", "seconds"].forEach((part) => {
          $("#countdown-" + part).textContent = "00";
        });
        return;
      }

      const diff = Math.max(0, target - now);
      const values = {
        days: Math.floor(diff / 86400000),
        hours: Math.floor(diff / 3600000) % 24,
        minutes: Math.floor(diff / 60000) % 60,
        seconds: Math.floor(diff / 1000) % 60
      };

      Object.entries(values).forEach(([key, value]) => {
        $("#countdown-" + key).textContent = String(value).padStart(2, "0");
      });
    };

    update();
    window.setInterval(update, 1000);
  }

  // ---------- PIN ----------
  function renderSlots() {
    pinSlots.innerHTML = "";

    for (let i = 0; i < 8; i += 1) {
      const slot = document.createElement("div");
      slot.className = "pin-slot" + (i < entered.length ? " filled" : "");

      // Filled digits are represented by hearts instead of dots.
      slot.innerHTML = i < entered.length
        ? '<span class="pin-heart" aria-hidden="true">♥</span>'
        : '<span class="pin-empty" aria-hidden="true"></span>';

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

    if (key === "clear") {
      entered = "";
    } else if (key === "back") {
      entered = entered.slice(0, -1);
    } else if (entered.length < 8) {
      entered += key;
    }

    renderSlots();

    if (entered.length === 8) {
      // Give the final heart a moment to appear before checking.
      window.setTimeout(checkBirthday, 280);
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

  // ---------- UNLOCK + MUSIC ----------
  function unlock() {
    if (unlocked) return;
    unlocked = true;

    // Start music from the same user gesture that entered the final PIN.
    // Browsers generally allow this because the PIN click/key event is a user gesture.
    startMusic();

    lock.classList.add("exit");
    const transition = $("#unlock-transition");
    transition.classList.remove("play");
    void transition.offsetWidth;
    transition.classList.add("play");

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

  function startMusic() {
    const toggle = $("#sound-toggle");
    const music = cfg.site?.music;

    if (!music?.enabled || !music.url) {
      toggle.classList.add("disabled");
      toggle.title = "Add a music URL in config.js";
      return;
    }

    if (!audio) {
      audio = new Audio(music.url);
      audio.loop = music.loop !== false;
      audio.volume = typeof music.volume === "number" ? music.volume : 0.35;
      audio.preload = "auto";
      audio.addEventListener("error", showMusicFallback, { once: true });
    }

    audio.play().then(() => {
      // Gentle fade-in so the song enters the scene instead of jumping in.
      const target = audio.volume;
      audio.volume = 0;
      window.clearInterval(audioFadeTimer);
      let step = 0;
      audioFadeTimer = window.setInterval(() => {
        step += 1;
        audio.volume = Math.min(target, target * (step / 18));
        if (audio.volume >= target) window.clearInterval(audioFadeTimer);
      }, 45);
      toggle.classList.add("playing");
      toggle.querySelector(".sound-icon").textContent = "♫";
      toggle.querySelector(".sound-name").textContent = "تشغيل";
      toggle.title = "إيقاف الموسيقى";
    }).catch(() => {
      // Some browsers can still block playback. The visible button remains available.
      toggle.classList.remove("disabled");
      toggle.title = "Play music";
      toggle.querySelector(".sound-icon").textContent = "♪";
        toggle.querySelector(".sound-name").textContent = "الموسيقى";
      showMusicFallback();
    });
  }

  function showMusicFallback() {
    const fallback = $("#music-fallback");
    if (fallback) fallback.classList.remove("hidden");
  }

  $("#music-fallback-button").addEventListener("click", () => {
    startMusic();
    $("#music-fallback").classList.add("hidden");
  });

  renderSlots();

  // ---------- BUILD EXPERIENCE ----------
  function buildBirthday() {
    $("#recipient-name").textContent = cfg.recipientName;

    // Rebuild the interactive content on replay without stacking global listeners.
    buildScratchCards();
    buildLetters();
    buildPhotos();
    buildHeartField();
    createFloatingHearts();
    setupRevealAnimations();

    if (experienceBuilt) return;

    experienceBuilt = true;
    setupIntroButton();
    setupReplay();
    setupSoundButton();
    setupAmbientParallax();
    setupStoryMode();
  }


  function buildPhotos() {
    const title = $("#photos-title");
    const copy = $("#photos-copy");
    const grid = $("#photos-grid");
    const photos = cfg.photos;
    if (!photos) return;
    title.textContent = photos.title || "ذكريات صغيرة";
    copy.textContent = photos.copy || "";
    grid.innerHTML = "";

    (photos.items || []).forEach((photo, index) => {
      const card = document.createElement("article");
      card.className = "photo-card";
      card.tabIndex = 0;
      card.setAttribute("role", "button");
      card.setAttribute("aria-label", "فتح " + (photo.title || "الذكرى"));

      if (photo.image) {
        const img = document.createElement("img");
        img.className = "photo-image";
        img.src = String(photo.image);
        img.alt = photo.title || ("ذكرى " + (index + 1));
        img.loading = "lazy";
        img.decoding = "async";
        img.style.objectPosition = photo.focus || "center center";
        card.appendChild(img);
      } else {
        const placeholder = document.createElement("div");
        placeholder.className = "photo-placeholder";
        placeholder.innerHTML = '<div><span>♡</span><p>ضيفي الصورة هنا</p></div>';
        card.appendChild(placeholder);
      }

      const caption = document.createElement("div");
      caption.className = "photo-caption";
      const strong = document.createElement("strong");
      strong.textContent = photo.title || ("ذكرى " + (index + 1));
      const small = document.createElement("small");
      small.textContent = [photo.date, photo.caption].filter(Boolean).join(" · ");
      caption.append(strong, small);
      card.appendChild(caption);

      card.addEventListener("click", () => openPhoto(index));
      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openPhoto(index);
        }
      });
      grid.appendChild(card);
    });
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

    function paintCover(preserveCanvas = null) {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.max(1, Math.floor(rect.width * ratio));
      canvas.height = Math.max(1, Math.floor(rect.height * ratio));
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.globalCompositeOperation = "source-over";

      const gradient = ctx.createLinearGradient(0, 0, rect.width, rect.height);
      gradient.addColorStop(0, "#e8c4cd");
      gradient.addColorStop(.5, "#f0d7dd");
      gradient.addColorStop(1, "#dfb8c2");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, rect.width, rect.height);

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
      ctx.fillText("SCRATCH TO REVEAL", rect.width / 2, rect.height / 2 - 2);
      ctx.font = "22px serif";
      ctx.fillText("♡", rect.width / 2, rect.height / 2 + 29);

      if (preserveCanvas) {
        const mask = document.createElement("canvas");
        mask.width = preserveCanvas.width;
        mask.height = preserveCanvas.height;
        const maskCtx = mask.getContext("2d");
        maskCtx.drawImage(preserveCanvas, 0, 0);
        const pixels = maskCtx.getImageData(0, 0, mask.width, mask.height);
        for (let i = 3; i < pixels.data.length; i += 4) {
          pixels.data[i] = 255 - pixels.data[i];
        }
        maskCtx.putImageData(pixels, 0, 0);
        ctx.globalCompositeOperation = "destination-out";
        ctx.drawImage(mask, 0, 0, rect.width, rect.height);
        ctx.globalCompositeOperation = "source-over";
      }
    }

    function point(event) {
      const rect = canvas.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
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

      for (let i = 3; i < data.length; i += 32) {
        if (data[i] < 60) transparent += 1;
      }

      const ratio = transparent / (data.length / 32);

      if (ratio >= .42) {
        wrapper.classList.add("revealed");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        playFx("scratch");
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
        if (wrapper.classList.contains("revealed")) return;

        const previous = document.createElement("canvas");
        previous.width = canvas.width;
        previous.height = canvas.height;
        const previousCtx = previous.getContext("2d");
        previousCtx.drawImage(canvas, 0, 0);

        paintCover(previous);
      }, 120);
    });

    requestAnimationFrame(paintCover);
  }

  function burst(element) {
    for (let i = 0; i < 7; i += 1) {
      const particle = document.createElement("span");
      particle.className = "burst-heart";
      particle.textContent = i % 2 ? "♡" : "♥";
      particle.style.setProperty("--x", `${(Math.random() - .5) * 150}px`);
      particle.style.setProperty("--y", `${(Math.random() - .5) * 120}px`);
      element.appendChild(particle);
      window.setTimeout(() => particle.remove(), 850);
    }
  }

  // ---------- MICRO SOUND FX ----------

  function playFx(type) {
    const settings = cfg.site?.soundEffects;
    if (!settings?.enabled || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      const now = audioContext.currentTime;
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const volume = typeof settings.volume === "number" ? settings.volume : 0.045;
      const tones = {
        scratch: [420, 620],
        letter: [520, 760],
        gift: [360, 680],
        candle: [620, 880]
      };
      const [from, to] = tones[type] || tones.letter;

      osc.type = "sine";
      osc.frequency.setValueAtTime(from, now);
      osc.frequency.exponentialRampToValueAtTime(to, now + .12);
      gain.gain.setValueAtTime(.0001, now);
      gain.gain.exponentialRampToValueAtTime(volume, now + .012);
      gain.gain.exponentialRampToValueAtTime(.0001, now + .18);
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.start(now);
      osc.stop(now + .2);
    } catch (_) {
      // Sound effects are decorative; never let them break the experience.
    }
  }

  // ---------- LETTERS ----------
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

      button.addEventListener("click", () => {
        playFx("letter");
        openLetter(letter, button);
      });
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
    if (event.target.closest("[data-close]")) closeLetter();
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
      heart.style.setProperty("--delay", `${index * .18}s`);
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
          window.setTimeout(() => {
            showHeartToast("لقيتيهم كلهم... عندك مفاجأة أخيرة تحت. ♥");
            showFinalSurprise();
          }, 900);
        }
      });

      field.appendChild(heart);
    });
  }

  function showHeartToast(message) {
    const toast = $("#heart-toast");
    $("#heart-toast-message").textContent = message;

    toast.classList.remove("hidden", "show");
    void toast.offsetWidth;
    toast.classList.add("show");

    window.clearTimeout(showHeartToast.timer);
    showHeartToast.timer = window.setTimeout(() => {
      toast.classList.remove("show");
      window.setTimeout(() => toast.classList.add("hidden"), 350);
    }, 2700);
  }

  // ---------- STORY MODE ----------

  function setupStoryMode() {
    const progress = $("#story-progress");
    const dots = [...progress.querySelectorAll("button")];
    const sections = [...document.querySelectorAll("[data-section]")];
    const toast = $("#chapter-toast");
    const toastNumber = $("#chapter-toast-number");
    const toastTitle = $("#chapter-toast-title");

    const titles = {
      intro: "بداية صغيرة",
      scratch: "أسرار صغيرة",
      letters: "جوابات ليكي",
      photos: "ذكريات",
      hearts: "دوري على القلوب",
      final: "الأخيرة"
    };

    const activate = (id, announce = false) => {
      dots.forEach((dot) => dot.classList.toggle("active", dot.dataset.storyTarget === id));
      if (!announce || !titles[id]) return;

      const index = dots.findIndex((dot) => dot.dataset.storyTarget === id);
      toastNumber.textContent = String(index + 1).padStart(2, "0");
      toastTitle.textContent = titles[id];
      toast.classList.remove("show");
      void toast.offsetWidth;
      toast.classList.add("show");
      window.clearTimeout(setupStoryMode.toastTimer);
      setupStoryMode.toastTimer = window.setTimeout(() => toast.classList.remove("show"), 1500);
    };

    dots.forEach((dot) => {
      dot.addEventListener("click", () => {
        const target = document.querySelector('[data-section="' + dot.dataset.storyTarget + '"]');
        target?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    if (!("IntersectionObserver" in window)) {
      activate("intro");
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) activate(entry.target.dataset.section, true);
      });
    }, { threshold: 0.45 });

    sections.forEach((section) => observer.observe(section));
    activate("intro");
  }

  // ---------- PHOTO VIEWER + FINAL SURPRISE ----------

  let currentPhotoIndex = 0;
  let photoTouchStartX = null;

  function openPhoto(index) {
    const items = cfg.photos?.items || [];
    if (!items.length) return;
    currentPhotoIndex = Math.max(0, Math.min(index, items.length - 1));
    renderPhotoViewer();
    $("#photo-modal").classList.remove("hidden");
    document.body.classList.add("modal-open");
  }

  function renderPhotoViewer() {
    const items = cfg.photos?.items || [];
    const photo = items[currentPhotoIndex];
    const media = $("#photo-viewer-media");
    media.innerHTML = "";

    if (photo?.image) {
      const img = document.createElement("img");
      img.src = photo.image;
      img.alt = photo.title || "ذكرى";
      img.className = "photo-viewer-image";
      media.appendChild(img);
    } else {
      const empty = document.createElement("div");
      empty.className = "photo-viewer-empty";
      empty.textContent = "ضيفي الصورة هنا ♡";
      media.appendChild(empty);
    }

    $("#photo-counter").textContent = (currentPhotoIndex + 1) + " / " + items.length;
    $("#photo-modal-title").textContent = photo?.title || "ذكرى";
    $("#photo-modal-caption").textContent = [photo?.date, photo?.caption].filter(Boolean).join(" · ");
  }

  function closePhoto() {
    $("#photo-modal").classList.add("hidden");
    document.body.classList.remove("modal-open");
  }

  function movePhoto(direction) {
    const items = cfg.photos?.items || [];
    if (!items.length) return;
    currentPhotoIndex = (currentPhotoIndex + direction + items.length) % items.length;
    renderPhotoViewer();
  }

  $("#photo-prev").addEventListener("click", () => movePhoto(-1));
  $("#photo-next").addEventListener("click", () => movePhoto(1));

  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-photo-close]")) closePhoto();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closePhoto();
      closeLetter();
    }
    if (!$("#photo-modal").classList.contains("hidden")) {
      if (event.key === "ArrowLeft") movePhoto(1);
      if (event.key === "ArrowRight") movePhoto(-1);
    }
  });

  $("#photo-viewer-media").addEventListener("touchstart", (event) => {
    photoTouchStartX = event.changedTouches[0].clientX;
  }, { passive: true });

  $("#photo-viewer-media").addEventListener("touchend", (event) => {
    if (photoTouchStartX === null) return;
    const delta = event.changedTouches[0].clientX - photoTouchStartX;
    photoTouchStartX = null;
    if (Math.abs(delta) >= 45) movePhoto(delta < 0 ? 1 : -1);
  }, { passive: true });

  function celebrate(type = "gift") {
    if (cfg.site?.celebration?.enabled === false) return;

    const layer = $("#celebration-layer");
    if (!layer) return;

    const count = Math.min(110, Math.max(30, Number(cfg.site?.celebration?.particles) || 72));
    layer.innerHTML = "";

    for (let i = 0; i < count; i += 1) {
      const particle = document.createElement("span");
      particle.className = "celebration-particle " + (type === "candle" ? "spark" : "confetti");
      particle.textContent = type === "candle" ? (i % 3 ? "✦" : "♥") : "";
      particle.style.setProperty("--x", (50 + (Math.random() * 70 - 35)) + "%");
      particle.style.setProperty("--dx", (Math.random() * 260 - 130).toFixed(1) + "px");
      particle.style.setProperty("--delay", (Math.random() * .25).toFixed(2) + "s");
      particle.style.setProperty("--size", (5 + Math.random() * 7) + "px");
      particle.style.setProperty("--rot", (Math.random() * 360) + "deg");
      layer.appendChild(particle);
    }

    window.setTimeout(() => {
      layer.innerHTML = "";
    }, 1500);
  }

  function showFinalSurprise() {
    const section = $("#surprise-section");
    if (!section || !section.classList.contains("hidden")) return;
    section.classList.remove("hidden");
    section.setAttribute("aria-hidden", "false");
    section.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function openSurprise() {
    if ($("#gift-box").classList.contains("opened")) return;
    playFx("gift");
    celebrate("gift");
    $("#gift-box").classList.add("opened");
    $("#surprise-button").classList.add("hidden");
    $("#surprise-title").textContent = "عندي حاجة أخيرة ليكي 🎁";
    $("#surprise-copy").textContent = "بس قبل الرسالة الأخيرة... أمنية صغيرة.";

    window.setTimeout(() => {
      $("#cake-section").classList.remove("hidden");
      $("#cake-section").setAttribute("aria-hidden", "false");
      $("#cake-section").scrollIntoView({ behavior: "smooth", block: "center" });
      burst($("#cake-wrap"));
    }, 550);
  }

  $("#surprise-button").addEventListener("click", openSurprise);
  $("#gift-box").addEventListener("click", openSurprise);
  $("#gift-box").addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openSurprise();
    }
  });

  $("#candle").addEventListener("click", () => {
    const candle = $("#candle");
    if (candle.classList.contains("blown")) return;
    candle.classList.add("blown");
    playFx("candle");
    celebrate("candle");
    $("#candle-hint").textContent = "الأمنية اتقالت... ✨";
    $("#cake-wrap").classList.add("celebrate");
    burst($("#cake-wrap"));

    window.setTimeout(() => {
      const finalSection = document.querySelector(".final-section");
      finalSection?.classList.add("final-arrived");
      finalSection?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }, 850);
  });

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

  // ---------- KEEPSAKE IMAGE ----------

  async function createKeepsake() {
    if (cfg.site?.keepsake?.enabled === false) return;

    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1350;

    const ctx = canvas.getContext("2d");
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "#fff8f7");
    gradient.addColorStop(.55, "#f9e6eb");
    gradient.addColorStop(1, "#fffaf7");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "rgba(201,127,145,.08)";
    for (let i = 0; i < 18; i += 1) {
      ctx.beginPath();
      ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, 12 + Math.random() * 25, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.textAlign = "center";
    ctx.fillStyle = "#c97f91";
    ctx.font = "700 30px Cairo, sans-serif";
    ctx.fillText("♡  BIRTHDAY MEMORY  ♡", canvas.width / 2, 110);

    ctx.fillStyle = "#a86475";
    ctx.font = "700 66px Cairo, sans-serif";
    wrapCanvasText(ctx, "كل سنة وإنتِ طيبة يا " + cfg.recipientName, canvas.width / 2, 360, 900, 82);

    ctx.fillStyle = "#927d82";
    ctx.font = "500 30px Cairo, sans-serif";
    wrapCanvasText(ctx, cfg.final.message, canvas.width / 2, 570, 820, 58);

    ctx.fillStyle = "#c97f91";
    ctx.font = "600 30px Cairo, sans-serif";
    wrapCanvasText(ctx, cfg.final.signature, canvas.width / 2, 920, 820, 52);

    ctx.font = "80px Georgia, serif";
    ctx.fillText("♥", canvas.width / 2, 1090);

    ctx.fillStyle = "#b79da4";
    ctx.font = "500 20px Cairo, sans-serif";
    ctx.fillText("حكاية صغيرة معمولة مخصوص لنيرة", canvas.width / 2, 1240);

    canvas.toBlob(async (blob) => {
      if (!blob) return;

      const file = new File(
        [blob],
        cfg.site?.keepsake?.filename || "birthday-memory.png",
        { type: "image/png" }
      );

      try {
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            title: "Birthday Memory · " + cfg.recipientName,
            text: "كل سنة وإنتِ طيبة يا " + cfg.recipientName + " ♡",
            files: [file]
          });
          return;
        }
      } catch (error) {
        if (error?.name === "AbortError") return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name;
      link.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }

  function wrapCanvasText(ctx, text, centerX, startY, maxWidth, lineHeight) {
    const words = String(text).split(/\s+/);
    const lines = [];
    let line = "";

    words.forEach((word) => {
      const test = line ? line + " " + word : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    });

    if (line) lines.push(line);
    lines.forEach((line, index) => {
      ctx.fillText(line, centerX, startY + index * lineHeight);
    });
  }

  $("#memory-button").addEventListener("click", createKeepsake);

  // ---------- UX ----------
  function setupIntroButton() {
    $("#intro-button").addEventListener("click", () => {
      document.querySelector(".scratch-section")?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }, { once: true });
  }

  function setupReplay() {
    $("#replay-button").addEventListener("click", () => {
      closeLetter();

      if (audio) {
        window.clearInterval(audioFadeTimer);
        audio.pause();
        audio.currentTime = 0;
      }

      birthday.classList.add("hidden");
      lock.classList.remove("hidden", "exit");
      unlocked = false;
      entered = "";

      const surprise = $("#surprise-section");
      const cakeSection = $("#cake-section");
      surprise.classList.add("hidden");
      cakeSection.classList.add("hidden");
      surprise.setAttribute("aria-hidden", "true");
      cakeSection.setAttribute("aria-hidden", "true");
      $("#gift-box").classList.remove("opened");
      $("#surprise-button").classList.remove("hidden");
      $("#surprise-title").textContent = "لقيتيهم كلهم؟";
      $("#surprise-copy").textContent = "يبقى فاضل حاجة واحدة بس...";
      $("#candle").classList.remove("blown");
      $("#candle-hint").textContent = "دوسي على الشمعة ✨";
      $("#cake-wrap").classList.remove("celebrate");
      document.querySelector(".final-section")?.classList.remove("final-arrived");

      buildScratchCards();
      buildLetters();
      buildPhotos();
      buildHeartField();
      createFloatingHearts();
      setupRevealAnimations();
      $("#sound-toggle").classList.remove("playing");
      $("#sound-toggle .sound-icon").textContent = "♪";
      $("#sound-toggle .sound-name").textContent = "الموسيقى";
      $("#sound-toggle").title = "تشغيل الموسيقى";

      renderSlots();
      window.scrollTo({ top: 0, behavior: "instant" });
    });
  }

  function setupSoundButton() {
    const toggle = $("#sound-toggle");
    const music = cfg.site?.music;

    if (!music?.enabled || !music.url) {
      toggle.classList.add("disabled");
      toggle.title = "Add a music URL in config.js";
      return;
    }

    toggle.classList.remove("disabled");
    toggle.title = audio && !audio.paused ? "Pause music" : "Play music";

    toggle.addEventListener("click", () => {
      if (!audio) {
        startMusic();
        return;
      }

      if (audio.paused) {
        startMusic();
      } else {
        audio.pause();
        toggle.classList.remove("playing");
        toggle.querySelector(".sound-icon").textContent = "♪";
        toggle.querySelector(".sound-name").textContent = "الموسيقى";
        toggle.title = "تشغيل الموسيقى";
      }
    }, { once: false });
  }

  // ---------- REVEAL + AMBIENT MOTION ----------
  function setupRevealAnimations() {
    const items = document.querySelectorAll(".section-heading, .section-copy, .intro-card, .scratch-card, .letter-card, .photo-card, .heart-field, .final-card, .surprise-card, .cake-card");
    if (!("IntersectionObserver" in window)) {
      items.forEach((item) => item.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -50px" });

    items.forEach((item) => {
      item.classList.add("reveal-on-scroll");
      observer.observe(item);
    });
  }

  function setupAmbientParallax() {
    const hero = $(".hero");
    const glow = $(".hero-glow");
    if (!hero || !glow || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const y = Math.min(window.scrollY, window.innerHeight);
      glow.style.transform = `translate3d(0, ${y * 0.08}px, 0) scale(${1 + y * 0.00015})`;
    };
    window.addEventListener("scroll", () => {
      if (!raf) raf = requestAnimationFrame(update);
    }, { passive: true });
  }

  // ---------- SCROLL PROGRESS ----------
  let progressUpdate = null;

  function setupProgress() {
    const bar = $("#progress-bar");

    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? (window.scrollY / max) * 100 : 0;
      bar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
    };

    if (!progressUpdate) {
      progressUpdate = update;
      window.addEventListener("scroll", progressUpdate, { passive: true });
    }
    progressUpdate();
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