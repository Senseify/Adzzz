gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

document.addEventListener("DOMContentLoaded", () => {
  const pbar = document.getElementById("pbar");
  const cur = document.getElementById("cur");
  const curRing = document.getElementById("cur-r");
  const particleContainer = document.getElementById("particle-container");
  const scenes = Array.from(document.querySelectorAll(".mem-scene"));
  const stage = document.getElementById("stage");
  const progDots = Array.from(document.querySelectorAll(".prog-dot"));
  const flash = document.getElementById("memory-flash");
  const starNodes = Array.from(document.querySelectorAll(".star-node"));

  const enhanceBtn = document.getElementById("enhance-btn");
  const bgSong = document.getElementById("bg-song");
  const songPlayerSection = document.getElementById("song-player-section");
  const songPlayPause = document.getElementById("song-play-pause");
  const songCurrentTime = document.getElementById("song-current-time");
  const songDuration = document.getElementById("song-duration");
  const songProgressFill = document.getElementById("song-progress-fill");

  const voiceCardBtn = document.getElementById("voice-card-btn");
  const voiceCardAudio = document.getElementById("voice-card-audio");
  const voiceCurrentTime = document.getElementById("voice-current-time");
  const voiceDuration = document.getElementById("voice-duration");
  const voiceProgressFill = document.getElementById("voice-progress-fill");

  const eyesFlipButtons = document.querySelectorAll(".eyes-flip-btn");

  const thingsPinForm = document.getElementById("things-pin-form");
  const thingsPinInput = document.getElementById("things-pin");
  const thingsPinMsg = document.getElementById("things-pin-msg");
  const thingsContent = document.getElementById("things-content");
  const thingsLockCard = document.getElementById("things-lock-card");
  const thingsHintBtn = document.getElementById("things-hint-btn");
  const thingsHintText = document.getElementById("things-hint-text");

  const THINGS_PIN = "992012";

  let musicStarted = false;
  let musicWasPlayingBeforeVoice = false;

  function formatTime(value) {
    if (!isFinite(value) || isNaN(value)) return "0:00";
    const mins = Math.floor(value / 60);
    const secs = Math.floor(value % 60);
    return `${mins}:${String(secs).padStart(2, "0")}`;
  }

  function updateSongMeta() {
    if (!bgSong) return;
    if (songCurrentTime) songCurrentTime.textContent = formatTime(bgSong.currentTime);
    if (songDuration) songDuration.textContent = formatTime(bgSong.duration);

    if (songProgressFill) {
      const progress = bgSong.duration ? (bgSong.currentTime / bgSong.duration) * 100 : 0;
      songProgressFill.style.width = `${progress}%`;
    }

    if (songPlayPause) {
      songPlayPause.textContent = bgSong.paused ? "▶" : "❚❚";
      songPlayPause.setAttribute("aria-label", bgSong.paused ? "Play song" : "Pause song");
    }
  }

  function playBackgroundSong() {
    if (!bgSong) return;
    bgSong.play().then(() => {
      musicStarted = true;
      if (songPlayerSection) songPlayerSection.classList.remove("hidden-player");
      updateSongMeta();
    }).catch(() => {});
  }

  function toggleBackgroundSong() {
    if (!bgSong) return;
    if (bgSong.paused) {
      pauseVoiceNote();
      bgSong.play().then(() => {
        if (songPlayerSection) songPlayerSection.classList.remove("hidden-player");
        updateSongMeta();
      }).catch(() => {});
    } else {
      bgSong.pause();
      updateSongMeta();
    }
  }

  function updateVoiceMeta() {
    if (!voiceCardAudio) return;
    if (voiceCurrentTime) voiceCurrentTime.textContent = formatTime(voiceCardAudio.currentTime);
    if (voiceDuration) voiceDuration.textContent = formatTime(voiceCardAudio.duration);

    if (voiceProgressFill) {
      const progress = voiceCardAudio.duration ? (voiceCardAudio.currentTime / voiceCardAudio.duration) * 100 : 0;
      voiceProgressFill.style.width = `${progress}%`;
    }
  }

  function pauseVoiceNote() {
    if (!voiceCardAudio) return;
    voiceCardAudio.pause();
    voiceCardAudio.currentTime = 0;
    updateVoiceMeta();
    if (voiceCardBtn) voiceCardBtn.textContent = "Play Voice Note";
  }

  if (enhanceBtn && bgSong) {
    enhanceBtn.addEventListener("click", () => {
      if (!musicStarted) {
        playBackgroundSong();
      } else {
        toggleBackgroundSong();
      }
    });
  }

  if (songPlayPause && bgSong) {
    songPlayPause.addEventListener("click", toggleBackgroundSong);
  }

  if (bgSong) {
    bgSong.addEventListener("loadedmetadata", updateSongMeta);
    bgSong.addEventListener("timeupdate", updateSongMeta);
    bgSong.addEventListener("play", updateSongMeta);
    bgSong.addEventListener("pause", updateSongMeta);
    bgSong.addEventListener("ended", updateSongMeta);
  }

  if (voiceCardBtn && voiceCardAudio && bgSong) {
    voiceCardBtn.addEventListener("click", () => {
      if (voiceCardAudio.paused) {
        // Track whether background music was playing before we pause it
        musicWasPlayingBeforeVoice = !bgSong.paused;
        bgSong.pause();
        updateSongMeta();

        voiceCardAudio.play().then(() => {
          voiceCardBtn.textContent = "Pause Voice Note";
          updateVoiceMeta();
        }).catch(() => {});
      } else {
        voiceCardAudio.pause();
        voiceCardBtn.textContent = "Play Voice Note";
        // Resume background song if it was previously playing
        if (musicWasPlayingBeforeVoice) {
          musicWasPlayingBeforeVoice = false;
          playBackgroundSong();
        }
      }
    });

    voiceCardAudio.addEventListener("timeupdate", updateVoiceMeta);
    voiceCardAudio.addEventListener("loadedmetadata", updateVoiceMeta);

    voiceCardAudio.addEventListener("ended", () => {
      voiceCardBtn.textContent = "Play Voice Note";
      updateVoiceMeta();
      // Auto-resume background song when voice note finishes
      if (musicWasPlayingBeforeVoice) {
        musicWasPlayingBeforeVoice = false;
        playBackgroundSong();
      }
    });

    voiceCardAudio.addEventListener("pause", () => {
      if (voiceCardAudio.currentTime < voiceCardAudio.duration) {
        voiceCardBtn.textContent = "Play Voice Note";
      }
    });

    voiceCardAudio.addEventListener("play", () => {
      voiceCardBtn.textContent = "Pause Voice Note";
    });
  }

  eyesFlipButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetCard = btn.closest(".eyes-card");
      if (targetCard) targetCard.classList.toggle("is-flipped");
    });
  });

  // PIN Hint Toggle
  if (thingsHintBtn && thingsHintText) {
    thingsHintBtn.addEventListener("click", () => {
      const isHidden = thingsHintText.classList.contains("hidden-hint");
      thingsHintText.classList.toggle("hidden-hint", !isHidden);
      thingsHintBtn.textContent = isHidden ? "Hide hint ✦" : "Need a hint? ✦";
    });
  }

  // Locked Note PIN Validation
  if (thingsPinForm && thingsPinInput && thingsContent) {
    thingsPinForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const enteredPin = thingsPinInput.value.trim();

      if (enteredPin === THINGS_PIN) {
        thingsContent.classList.remove("things-hidden");
        thingsContent.setAttribute("aria-hidden", "false");

        if (thingsPinMsg) {
          thingsPinMsg.textContent = "Unlocked.";
          thingsPinMsg.style.color = "rgba(243,223,155,0.84)";
        }

        if (thingsLockCard) {
          thingsLockCard.style.display = "none";
        }

        gsap.fromTo(
          thingsContent,
          { opacity: 0, y: 28 },
          {
            opacity: 1,
            y: 0,
            duration: 0.9,
            ease: "power3.out",
            onComplete: () => {
              ScrollTrigger.refresh();
              gsap.to(window, {
                duration: 0.9,
                ease: "power2.out",
                scrollTo: {
                  y: thingsContent,
                  offsetY: 40
                }
              });
            }
          }
        );
      } else {
        if (thingsPinMsg) {
          thingsPinMsg.textContent = "Wrong PIN. Try again.";
          thingsPinMsg.style.color = "rgba(255,140,140,0.92)";
        }

        thingsPinInput.value = "";
        thingsPinInput.focus();

        gsap.fromTo(
          thingsLockCard,
          { x: 0 },
          {
            x: 8,
            duration: 0.06,
            repeat: 5,
            yoyo: true,
            ease: "power1.inOut",
            clearProps: "x"
          }
        );
      }
    });
  }

  // Custom Cursor
  if (cur && curRing) {
    window.addEventListener("mousemove", (e) => {
      cur.style.left = `${e.clientX}px`;
      cur.style.top = `${e.clientY}px`;
      curRing.style.left = `${e.clientX}px`;
      curRing.style.top = `${e.clientY}px`;
    });

    const hoverables = document.querySelectorAll("a, button, .reveal-media, .star-node, .reasons-tab, .promises-tab");
    hoverables.forEach((el) => {
      el.addEventListener("mouseenter", () => {
        curRing.style.width = "42px";
        curRing.style.height = "42px";
        curRing.style.borderColor = "rgba(243,223,155,0.75)";
        cur.style.transform = "translate(-50%, -50%) scale(1.35)";
      });

      el.addEventListener("mouseleave", () => {
        curRing.style.width = "28px";
        curRing.style.height = "28px";
        curRing.style.borderColor = "rgba(201,168,76,.45)";
        cur.style.transform = "translate(-50%, -50%) scale(1)";
      });
    });
  }

  // Gold Ambient Particles
  if (particleContainer) {
    const particleCount = window.innerWidth < 768 ? 24 : 42;

    for (let i = 0; i < particleCount; i += 1) {
      const p = document.createElement("span");
      p.className = "gold-particle";
      const size = Math.random() * 3 + 1;
      const left = Math.random() * 100;
      const duration = Math.random() * 18 + 16;
      const delay = Math.random() * -24;
      const opacity = Math.random() * 0.35 + 0.18;

      p.style.width = `${size}px`;
      p.style.height = `${size}px`;
      p.style.left = `${left}%`;
      p.style.bottom = `${Math.random() * 25 - 15}vh`;
      p.style.animationDuration = `${duration}s`;
      p.style.animationDelay = `${delay}s`;
      p.style.opacity = opacity;

      particleContainer.appendChild(p);
    }
  }

  // Scroll Progress Bar
  if (pbar) {
    window.addEventListener("scroll", () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      pbar.style.width = `${progress}%`;
    });
  }

  // 14 Letters 3D Parallax Stage
  if (stage && scenes.length) {
    stage.style.height = `${scenes.length * 100}vh`;

    gsap.set(scenes, {
      xPercent: -50,
      yPercent: -50,
      transformOrigin: "50% 50%"
    });

    scenes.forEach((scene, index) => {
      const side = scene.dataset.side === "left" ? "left" : "right";
      const fromX = side === "left" ? -420 : 420;
      const exitX = side === "left" ? 420 : -420;
      const fromRotateY = side === "left" ? -14 : 14;
      const exitRotateY = side === "left" ? 14 : -14;

      gsap.set(scene, {
        x: fromX,
        y: 0,
        z: -120,
        rotateY: fromRotateY,
        rotateX: 0,
        scale: 0.96,
        autoAlpha: 0,
        force3D: true
      });

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: stage,
          start: () => `top top-=${index * window.innerHeight}`,
          end: () => `top top-=${(index + 1) * window.innerHeight}`,
          scrub: 1.1,
          invalidateOnRefresh: true
        }
      });

      tl.to(scene, {
        x: 0,
        y: 0,
        z: 0,
        rotateY: 0,
        rotateX: 0,
        scale: 1,
        autoAlpha: 1,
        duration: 0.32
      })
      .to(scene, {
        x: 0,
        y: 0,
        z: 0,
        rotateY: 0,
        rotateX: 0,
        scale: 1,
        autoAlpha: 1,
        duration: 0.36
      })
      .to(scene, {
        x: exitX,
        y: 0,
        z: -120,
        rotateY: exitRotateY,
        rotateX: 0,
        scale: 0.96,
        autoAlpha: 0,
        duration: 0.32
      });

      ScrollTrigger.create({
        trigger: stage,
        start: () => `top top-=${index * window.innerHeight}`,
        end: () => `top top-=${(index + 1) * window.innerHeight}`,
        onUpdate: (self) => {
          const active = self.progress > 0.12 && self.progress < 0.88;
          scene.classList.toggle("active", active);

          if (active) {
            progDots.forEach((dot, dotIndex) => {
              dot.classList.toggle("active", dotIndex === index);
              dot.classList.toggle("done", dotIndex < index);
            });
          }
        }
      });
    });
  }

  // Section Entrance Stagger Animations
  gsap.utils
    .toArray("#final-note, #aditi-photo-reveal, #eyes-love-note, #extra-links-section, #things-to-do-section, #hundred-reasons-section, #promises-section, #memory-archive")
    .forEach((section) => {
      const items = section.querySelectorAll(
        "h2, p, .photo-reveal-grid, .eyes-card, .extra-links-grid, .things-lock-card, .things-content, .reasons-controls, .reasons-shell, .promises-controls, .promises-shell, #constellation-map"
      );
      if (!items.length) return;

      gsap.from(items, {
        opacity: 0,
        y: 28,
        duration: 0.9,
        stagger: 0.08,
        ease: "power3.out",
        scrollTrigger: {
          trigger: section,
          start: "top 80%"
        }
      });
    });

  // Helper to accurately scroll to a scene in the stage
  function scrollToScene(targetIndex) {
    if (!stage || isNaN(targetIndex) || targetIndex < 0 || targetIndex >= scenes.length) return;
    const stageRect = stage.getBoundingClientRect();
    const stageTop = stageRect.top + window.scrollY;
    const targetY = stageTop + (targetIndex + 0.5) * window.innerHeight;

    gsap.to(window, {
      duration: 1.2,
      ease: "power3.inOut",
      scrollTo: { y: targetY }
    });
  }

  // Star Nodes Click
  starNodes.forEach((node) => {
    node.addEventListener("click", () => {
      const targetIndex = Number(node.dataset.target);
      scrollToScene(targetIndex);
    });
  });

  // Side Nav Dots Click
  progDots.forEach((dot, index) => {
    dot.addEventListener("click", () => {
      scrollToScene(index);
    });
  });

  // =======================================================================
  // 18-PHOTO LIGHTBOX MODAL
  // =======================================================================
  const photoModal = document.getElementById("photo-modal");
  const photoModalBackdrop = document.getElementById("photo-modal-backdrop");
  const photoModalImg = document.getElementById("photo-modal-img");
  const photoModalClose = document.getElementById("photo-modal-close");
  const photoModalPrev = document.getElementById("photo-modal-prev");
  const photoModalNext = document.getElementById("photo-modal-next");
  const photoModalCounter = document.getElementById("photo-modal-counter");
  const photoModalTitle = document.getElementById("photo-modal-title");
  const photoModalDesc = document.getElementById("photo-modal-desc");
  const revealCards = Array.from(document.querySelectorAll(".reveal-card"));

  let currentPhotoIndex = 0;

  function updateModalPhoto(index) {
    if (!revealCards.length) return;
    currentPhotoIndex = (index + revealCards.length) % revealCards.length;
    const card = revealCards[currentPhotoIndex];
    const img = card.querySelector(".reveal-img");
    const title = card.dataset.title || `Memory ${String(currentPhotoIndex + 1).padStart(2, "0")}`;
    const caption = card.dataset.caption || "";

    if (photoModalImg && img) {
      photoModalImg.style.opacity = "0";
      photoModalImg.style.transform = "scale(0.96)";

      setTimeout(() => {
        photoModalImg.src = img.src;
        photoModalImg.alt = img.alt || title;
        photoModalImg.style.opacity = "1";
        photoModalImg.style.transform = "scale(1)";
      }, 150);
    }

    if (photoModalCounter) {
      photoModalCounter.textContent = `${String(currentPhotoIndex + 1).padStart(2, "0")} / ${String(revealCards.length).padStart(2, "0")}`;
    }

    if (photoModalTitle) {
      photoModalTitle.textContent = title;
    }

    if (photoModalDesc) {
      photoModalDesc.textContent = caption;
    }
  }

  function openPhotoModal(index) {
    if (!photoModal) return;
    updateModalPhoto(index);
    photoModal.classList.add("active");
    photoModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closePhotoModal() {
    if (!photoModal) return;
    photoModal.classList.remove("active");
    photoModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  revealCards.forEach((card, index) => {
    const media = card.querySelector(".reveal-media");
    if (media) {
      media.setAttribute("tabindex", "0");
      media.addEventListener("click", () => openPhotoModal(index));
      media.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openPhotoModal(index);
        }
      });
    }
  });

  if (photoModalClose) photoModalClose.addEventListener("click", closePhotoModal);
  if (photoModalBackdrop) photoModalBackdrop.addEventListener("click", closePhotoModal);
  if (photoModalPrev) {
    photoModalPrev.addEventListener("click", (e) => {
      e.stopPropagation();
      updateModalPhoto(currentPhotoIndex - 1);
    });
  }
  if (photoModalNext) {
    photoModalNext.addEventListener("click", (e) => {
      e.stopPropagation();
      updateModalPhoto(currentPhotoIndex + 1);
    });
  }

  // Keyboard navigation for Lightbox
  window.addEventListener("keydown", (e) => {
    if (!photoModal || !photoModal.classList.contains("active")) return;
    if (e.key === "Escape") closePhotoModal();
    if (e.key === "ArrowLeft") updateModalPhoto(currentPhotoIndex - 1);
    if (e.key === "ArrowRight") updateModalPhoto(currentPhotoIndex + 1);
  });

  // Touch swipe support for Lightbox
  let touchStartX = 0;
  let touchEndX = 0;

  if (photoModal) {
    photoModal.addEventListener("touchstart", (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    photoModal.addEventListener("touchend", (e) => {
      touchEndX = e.changedTouches[0].screenX;
      const diffX = touchEndX - touchStartX;
      if (Math.abs(diffX) > 45) {
        if (diffX > 0) {
          updateModalPhoto(currentPhotoIndex - 1);
        } else {
          updateModalPhoto(currentPhotoIndex + 1);
        }
      }
    }, { passive: true });
  }

  // =======================================================================
  // 100 REASONS & 40 PROMISES FILTER TABS
  // =======================================================================
  const reasonTabs = document.querySelectorAll(".reasons-tab");
  const reasonItems = document.querySelectorAll(".reasons-list li");

  reasonTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      reasonTabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      const range = tab.dataset.range;

      reasonItems.forEach((item, idx) => {
        const itemNumber = idx + 1;
        let isVisible = true;

        if (range === "1-25") isVisible = itemNumber >= 1 && itemNumber <= 25;
        else if (range === "26-50") isVisible = itemNumber >= 26 && itemNumber <= 50;
        else if (range === "51-75") isVisible = itemNumber >= 51 && itemNumber <= 75;
        else if (range === "76-100") isVisible = itemNumber >= 76 && itemNumber <= 100;
        else if (range === "all") isVisible = true;

        item.classList.toggle("is-hidden-reason", !isVisible);
      });

      ScrollTrigger.refresh();
    });
  });

  const promiseTabs = document.querySelectorAll(".promises-tab");
  const promiseItems = document.querySelectorAll(".promises-list li");

  promiseTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      promiseTabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      const range = tab.dataset.range;

      promiseItems.forEach((item, idx) => {
        const itemNumber = idx + 1;
        let isVisible = true;

        if (range === "1-20") isVisible = itemNumber >= 1 && itemNumber <= 20;
        else if (range === "21-40") isVisible = itemNumber >= 21 && itemNumber <= 40;
        else if (range === "all") isVisible = true;

        item.classList.toggle("is-hidden-promise", !isVisible);
      });

      ScrollTrigger.refresh();
    });
  });

  updateSongMeta();
  updateVoiceMeta();
});