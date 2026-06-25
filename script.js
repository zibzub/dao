    const animation = document.querySelector(".svg-animation");
    const track = animation.querySelector(".svg-animation__track");
    const firstImage = animation.querySelector(".svg-animation__image--first");
    const secondImage = animation.querySelector(".svg-animation__image--second");
    const soundToggle = document.querySelector(".sound-toggle");
    const gestureHints = document.querySelector(".gesture-hints");
    let pressCount = 0;
    let animationFrame = 0;
    let isSpinning = false;
    let spinStartTime = 0;
    let spinStartAngle = 0;
    let spinTargetAngle = 0;
    let spinDuration = 0;
    let lastPressTime = 0;
    let rapidMomentumLevel = 0;
    let currentAngle = 0;
    let currentScale = 1;
    let spinStartScale = 1;
    let maxMomentumReached = false;
    let maxMomentumReachedTime = 0;
    let maxScaleReachedTime = 0;
    let colorOverlayArmed = false;
    let colorOverlayActive = false;
    let colorOverlayStartTime = 0;
    let colorOverlayOpacity = 0;
    let overlayFadeStartTime = 0;
    let overlayFadeStartOpacity = 0;
    let lockedOverdrive = false;
    let finishingLockedOverdrive = false;
    let lockedLastFrameTime = 0;
    let overdriveStopArmed = false;
    let lastOverdriveTapTime = 0;
    let activeRapidClickWindow = 220;
    let lockedActiveSpinSpeed = 1080;
    let hueCycleSpeed = 1;
    let currentHue = 0;
    let colorLastFrameTime = 0;
    let lockedPointerId = null;
    let lockedPointerStartX = 0;
    let lockedPointerStartY = 0;
    let lockedPointerStartTime = 0;
    let lockedPointerStartSpinSpeed = 1080;
    let lockedPointerStartHueSpeed = 1;
    let lockedPointerMoved = false;
    let lockedPointerHolding = false;
    let audioContext = null;
    let masterGain = null;
    let tapSoundCount = 0;
    let soundEnabled = false;
    let pulseStartTime = 0;
    let currentPulseAmount = 0;
    let gestureHintsDismissed = false;
    let gestureHintsVisible = false;

    const baseRotation = 360;
    const baseDuration = 280;
    const rapidClickWindowTouch = 220;
    const rapidClickWindowMouse = 420;
    const extraRotationPerRapidClick = 360;
    const extraDurationPerRapidClick = 120;
    const maxExtraRotations =16;
    const baseScale = 1;
    const maxScale = 1.4;
    const scalePeakProgress = 0.35;
    const scaleGrowDuration = 900;
    const colorOverlayDelay = 3000;
    const hueCycleDuration = 20000;
    const overlayFadeDuration = 350;
    const overlayMaxOpacity = 0.45;
    const lockedSpinSpeed = 1080;
    const minLockedSpinSpeed = 540;
    const maxLockedSpinSpeed = 4320;
    const minHueCycleSpeed = 0.25;
    const maxHueCycleSpeed = 4;
    const lockedHoldThreshold = 300;
    const lockedDragThreshold = 8;
    const spinSpeedDragRange = 180;
    const hueSpeedDragRange = 180;
    const lockedFinishDuration = 1100;
    const overdriveStopArmDelay = 600;
    const baseHueDegreesPerSecond = 360 / (hueCycleDuration / 1000);
    const pulseDuration = 180;
    const pulseScaleBoost = 0.15;
    const pulseBrightnessBoost = 0.50;
    const hintsDismissedKey = "daoGestureHintsDismissed";
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

    firstImage.src = animation.dataset.srcA;
    secondImage.src = animation.dataset.srcB;

    const colorOverlay = document.createElement("div");
    colorOverlay.className = "svg-animation__color-overlay";
    colorOverlay.setAttribute("aria-hidden", "true");
    colorOverlay.style.maskImage =
      `url("${animation.dataset.srcA}")`;
    colorOverlay.style.webkitMaskImage =
      `url("${animation.dataset.srcA}")`;
    colorOverlay.style.maskPosition = "center";
    colorOverlay.style.webkitMaskPosition = "center";
    colorOverlay.style.maskRepeat = "no-repeat";
    colorOverlay.style.webkitMaskRepeat = "no-repeat";
    colorOverlay.style.maskSize = "contain";
    colorOverlay.style.webkitMaskSize = "contain";
    track.append(colorOverlay);

    function easeOutCubic(progress) {
      return 1 - Math.pow(1 - progress, 3);
    }

    function clamp(value, min, max) {
      return Math.min(Math.max(value, min), max);
    }

    function loadGestureHintsPreference() {
      try {
        gestureHintsDismissed =
          localStorage.getItem(hintsDismissedKey) === "true";
      } catch (error) {
        gestureHintsDismissed = false;
      }
    }

    function setGestureHintsVisible(visible) {
      gestureHintsVisible = visible && !gestureHintsDismissed;
      gestureHints.dataset.visible = String(gestureHintsVisible);
    }

    function dismissGestureHints() {
      if (gestureHintsDismissed) return;

      gestureHintsDismissed = true;
      setGestureHintsVisible(false);
      try {
        localStorage.setItem(hintsDismissedKey, "true");
      } catch (error) {
        console.warn("Unable to save gesture hint preference.", error);
      }
    }

    function ensureAudioContext() {
      if (!audioContext) {
        const AudioContext =
          window.AudioContext || window.webkitAudioContext;
        audioContext = new AudioContext();
        masterGain = audioContext.createGain();
        masterGain.gain.value = 0.8;
        masterGain.connect(audioContext.destination);
      }

      if (audioContext.state === "suspended") {
        audioContext.resume();
      }
    }

    function loadSoundPreference() {
      soundEnabled = false;
    }

    function saveSoundPreference() {
      try {
        localStorage.setItem("daoSoundEnabled", String(soundEnabled));
      } catch (error) {
        console.warn("Unable to save sound preference.", error);
      }
    }

    function updateSoundToggle() {
      soundToggle.setAttribute("aria-pressed", String(soundEnabled));
      soundToggle.setAttribute(
        "aria-label",
        soundEnabled ? "Turn sound off" : "Turn sound on"
      );
    }

    function primeAudio() {
      try {
        ensureAudioContext();

        const now = audioContext.currentTime;
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        gain.gain.setValueAtTime(0, now);
        oscillator.connect(gain);
        gain.connect(masterGain);
        oscillator.start(now);
        oscillator.stop(now + 0.01);
      } catch (error) {
        console.warn("Unable to prime audio.", error);
      }
    }

    function playKick() {
      try {
        ensureAudioContext();

        const now = audioContext.currentTime;
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(60, now);
        oscillator.frequency.exponentialRampToValueAtTime(45, now + 0.09);

        gain.gain.setValueAtTime(0.9, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        oscillator.connect(gain);
        gain.connect(masterGain);
        oscillator.start(now);
        oscillator.stop(now + 0.2);
      } catch (error) {
        console.warn("Unable to play kick sound.", error);
      }
    }

    function playKick2() {
      try {
        ensureAudioContext();

        const now = audioContext.currentTime;
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(120, now);
        oscillator.frequency.exponentialRampToValueAtTime(45, now + 0.09);

        gain.gain.setValueAtTime(0.9, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        oscillator.connect(gain);
        gain.connect(masterGain);
        oscillator.start(now);
        oscillator.stop(now + 0.2);
      } catch (error) {
        console.warn("Unable to play kick2 sound.", error);
      }
    }

    function playSnare() {
      try {
        ensureAudioContext();

        const now = audioContext.currentTime;
        const bufferSize = Math.floor(audioContext.sampleRate * 0.18);
        const noiseBuffer = audioContext.createBuffer(
          1,
          bufferSize,
          audioContext.sampleRate
        );
        const output = noiseBuffer.getChannelData(0);

        for (let index = 0; index < bufferSize; index += 1) {
          output[index] = Math.random() * 2 - 1;
        }

        const noise = audioContext.createBufferSource();
        const noiseFilter = audioContext.createBiquadFilter();
        const noiseGain = audioContext.createGain();
        noise.buffer = noiseBuffer;
        noiseFilter.type = "highpass";
        noiseFilter.frequency.setValueAtTime(900, now);
        noiseGain.gain.setValueAtTime(0.45, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(masterGain);

        const body = audioContext.createOscillator();
        const bodyGain = audioContext.createGain();
        body.type = "triangle";
        body.frequency.setValueAtTime(100, now);
        bodyGain.gain.setValueAtTime(0.18, now);
        bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        body.connect(bodyGain);
        bodyGain.connect(masterGain);

        noise.start(now);
        noise.stop(now + 0.18);
        body.start(now);
        body.stop(now + 0.09);
      } catch (error) {
        console.warn("Unable to play snare sound.", error);
      }
    }

    function playTapSound() {
      if (!soundEnabled) return;

      tapSoundCount += 1;

      if (tapSoundCount % 2 === 1) {
        playKick();
      } else {
        playKick2();
      }
    }

    function getPulseProgress(time) {
      if (!pulseStartTime) return 0;
      return Math.min((time - pulseStartTime) / pulseDuration, 1);
    }

    function getPulseAmount(time) {
      const progress = getPulseProgress(time);
      if (progress >= 1) {
        pulseStartTime = 0;
        return 0;
      }

      return Math.sin(progress * Math.PI);
    }

    function updatePulse(time) {
      currentPulseAmount = reducedMotion.matches ? 0 : getPulseAmount(time);
    }

    function applyTransform(angle, scale) {
      const pulseScale =
        scale * (1 + currentPulseAmount * pulseScaleBoost);
      const pulseBrightness =
        1 + currentPulseAmount * pulseBrightnessBoost;

      track.style.transform =
        `rotate(${angle}deg) scale(${pulseScale})`;
      track.style.filter =
        "drop-shadow(0 0.4rem 0.45rem rgb(0 0 0 / 65%)) "
        + `brightness(${pulseBrightness})`;
    }

    function getSpinProgress(time) {
      if (!isSpinning || !spinDuration) return 0;
      return Math.min((time - spinStartTime) / spinDuration, 1);
    }

    function getCurrentAngle(time) {
      if (!isSpinning || !spinDuration) return currentAngle;

      const progress = getSpinProgress(time);
      return spinStartAngle
        + (spinTargetAngle - spinStartAngle) * easeOutCubic(progress);
    }

    function getMomentumScale(time) {
      if (!maxMomentumReached) return baseScale;

      const scaleGrowProgress = Math.min(
        Math.max((time - maxMomentumReachedTime) / scaleGrowDuration, 0),
        1
      );
      return baseScale
        + (maxScale - baseScale) * easeOutCubic(scaleGrowProgress);
    }

    function getScaleAtTime(time) {
      if (finishingLockedOverdrive) {
        const progress = getSpinProgress(time);
        return spinStartScale
          + (baseScale - spinStartScale) * easeOutCubic(progress);
      }

      if (!maxMomentumReached) return baseScale;

      const progress = getSpinProgress(time);
      if (progress < scalePeakProgress) {
        const growProgress = progress / scalePeakProgress;
        return spinStartScale
          + (getMomentumScale(time) - spinStartScale)
            * easeOutCubic(growProgress);
      }

      const peakTime = spinStartTime + spinDuration * scalePeakProgress;
      const segmentPeakScale = Math.max(
        spinStartScale,
        getMomentumScale(peakTime)
      );
      const shrinkProgress =
        (progress - scalePeakProgress) / (1 - scalePeakProgress);
      return segmentPeakScale
        + (baseScale - segmentPeakScale) * easeOutCubic(shrinkProgress);
    }

    function getCurrentScale(time) {
      if (!isSpinning || !spinDuration) return currentScale;
      return getScaleAtTime(time);
    }

    function advanceHue(time) {
      if (!colorLastFrameTime) {
        colorLastFrameTime = time;
        return;
      }

      const elapsed = Math.min((time - colorLastFrameTime) / 1000, 0.05);
      colorLastFrameTime = time;
      currentHue =
        (currentHue
          + baseHueDegreesPerSecond * hueCycleSpeed * elapsed) % 360;
    }

    function applyColorOverlay() {
      colorOverlay.style.backgroundColor =
        `hsl(${currentHue}, 100%, 45%)`;
      colorOverlay.style.opacity = colorOverlayOpacity;
    }

    function beginOverlayFade(time) {
      if (overlayFadeStartTime) return;
      colorOverlayActive = false;
      if (!colorOverlayOpacity) {
        colorOverlay.style.opacity = 0;
        return;
      }
      overlayFadeStartTime = time;
      overlayFadeStartOpacity = colorOverlayOpacity;
    }

    function updateColorOverlay(time) {
      if (lockedOverdrive) {
        advanceHue(time);
        const fadeInProgress = Math.min(
          (time - colorOverlayStartTime) / overlayFadeDuration,
          1
        );
        colorOverlayOpacity =
          overlayMaxOpacity * easeOutCubic(fadeInProgress);
        applyColorOverlay();
        return;
      }

      if (finishingLockedOverdrive) {
        advanceHue(time);
        if (overlayFadeStartTime) {
          const fadeOutProgress = Math.min(
            (time - overlayFadeStartTime) / overlayFadeDuration,
            1
          );
          colorOverlayOpacity =
            overlayFadeStartOpacity * (1 - easeOutCubic(fadeOutProgress));
        } else {
          colorOverlayOpacity = 0;
        }
        applyColorOverlay();
        return;
      }

      const sustainedOverdrive =
        maxMomentumReached
        && rapidMomentumLevel === maxExtraRotations
        && time - lastPressTime <= activeRapidClickWindow;

      if (
        sustainedOverdrive
        && !maxScaleReachedTime
        && currentScale >= maxScale - 0.01
      ) {
        maxScaleReachedTime = time;
        colorOverlayArmed = true;
      }

      if (
        colorOverlayArmed
        && !colorOverlayActive
        && !overlayFadeStartTime
        && sustainedOverdrive
        && time - maxScaleReachedTime >= colorOverlayDelay
      ) {
        colorOverlayActive = true;
        colorOverlayStartTime = time;
        currentHue = 0;
        colorLastFrameTime = time;
        lockedActiveSpinSpeed = lockedSpinSpeed;
        hueCycleSpeed = 1;
        lockedOverdrive = true;
        animation.style.touchAction = "none";
        lockedLastFrameTime = time;
        lastOverdriveTapTime = time;
        overdriveStopArmed = false;
        currentScale = maxScale;
        applyTransform(currentAngle, currentScale);
      }

      if (!sustainedOverdrive) {
        beginOverlayFade(time);
      }

      if (colorOverlayActive) {
        const fadeInProgress = Math.min(
          (time - colorOverlayStartTime) / overlayFadeDuration,
          1
        );
        colorOverlayOpacity =
          overlayMaxOpacity * easeOutCubic(fadeInProgress);
      } else if (overlayFadeStartTime) {
        const fadeOutProgress = Math.min(
          (time - overlayFadeStartTime) / overlayFadeDuration,
          1
        );
        colorOverlayOpacity =
          overlayFadeStartOpacity * (1 - easeOutCubic(fadeOutProgress));
      } else {
        colorOverlayOpacity = 0;
      }

      applyColorOverlay();
    }

    function resetColorOverlay() {
      maxScaleReachedTime = 0;
      colorOverlayArmed = false;
      colorOverlayActive = false;
      colorOverlayStartTime = 0;
      colorOverlayOpacity = 0;
      overlayFadeStartTime = 0;
      overlayFadeStartOpacity = 0;
      currentHue = 0;
      colorLastFrameTime = 0;
      hueCycleSpeed = 1;
      colorOverlay.style.opacity = 0;
      colorOverlay.style.backgroundColor = "";
    }

    function beginLockedOverdriveFinish(time) {
      setGestureHintsVisible(false);
      if (lockedLastFrameTime) {
        const elapsed = Math.min((time - lockedLastFrameTime) / 1000, 0.05);
        currentAngle =
          (currentAngle + lockedActiveSpinSpeed * elapsed) % baseRotation;
      }

      cancelAnimationFrame(animationFrame);
      lockedOverdrive = false;
      finishingLockedOverdrive = true;
      lockedLastFrameTime = 0;
      spinStartTime = time;
      spinStartAngle = currentAngle;
      spinStartScale = currentScale;
      spinTargetAngle =
        Math.ceil(currentAngle / baseRotation) * baseRotation + baseRotation;
      spinDuration = lockedFinishDuration;
      isSpinning = true;
      beginOverlayFade(time);
      animationFrame = requestAnimationFrame(spin);
    }

    function resetLockedPointer() {
      lockedPointerId = null;
      lockedPointerStartX = 0;
      lockedPointerStartY = 0;
      lockedPointerStartTime = 0;
      lockedPointerStartSpinSpeed = lockedSpinSpeed;
      lockedPointerStartHueSpeed = 1;
      lockedPointerMoved = false;
      lockedPointerHolding = false;
    }

    function finishSpin() {
      setGestureHintsVisible(false);
      pulseStartTime = 0;
      currentPulseAmount = 0;
      applyTransform(0, baseScale);
      resetColorOverlay();
      currentAngle = 0;
      currentScale = baseScale;
      animationFrame = 0;
      isSpinning = false;
      spinStartTime = 0;
      spinStartAngle = 0;
      spinTargetAngle = 0;
      spinDuration = 0;
      lastPressTime = 0;
      rapidMomentumLevel = 0;
      spinStartScale = baseScale;
      maxMomentumReached = false;
      maxMomentumReachedTime = 0;
      lockedOverdrive = false;
      finishingLockedOverdrive = false;
      lockedLastFrameTime = 0;
      overdriveStopArmed = false;
      lastOverdriveTapTime = 0;
      activeRapidClickWindow = rapidClickWindowTouch;
      lockedActiveSpinSpeed = lockedSpinSpeed;
      hueCycleSpeed = 1;
      currentHue = 0;
      colorLastFrameTime = 0;
      resetLockedPointer();
      animation.style.touchAction = "";
    }

    function spin(time) {
      if (lockedOverdrive) {
        const elapsed = lockedLastFrameTime
          ? Math.min((time - lockedLastFrameTime) / 1000, 0.05)
          : 0;
        lockedLastFrameTime = time;
        currentAngle =
          (currentAngle + lockedActiveSpinSpeed * elapsed) % baseRotation;
        currentScale = maxScale;
        updatePulse(time);
        applyTransform(currentAngle, currentScale);
        updateColorOverlay(time);
        if (
          !overdriveStopArmed
          && time - lastOverdriveTapTime >= overdriveStopArmDelay
        ) {
          overdriveStopArmed = true;
          setGestureHintsVisible(true);
        }
        animationFrame = requestAnimationFrame(spin);
        return;
      }

      const progress = getSpinProgress(time);
      currentAngle = spinStartAngle
        + (spinTargetAngle - spinStartAngle) * easeOutCubic(progress);
      currentScale = getScaleAtTime(time);
      updatePulse(time);
      applyTransform(currentAngle, currentScale);
      updateColorOverlay(time);

      if (lockedOverdrive) {
        animationFrame = requestAnimationFrame(spin);
        return;
      }

      if (progress >= 1) {
        finishSpin();
        return;
      }

      animationFrame = requestAnimationFrame(spin);
    }

    function toggleImage() {
      pressCount += 1;
      animation.dataset.visibleImage =
        pressCount % 2 === 0 ? "first" : "second";
    }

    function animate(pointerType = "keyboard") {
      toggleImage();

      if (reducedMotion.matches) return;

      const pressTime = performance.now();
      activeRapidClickWindow =
        pointerType === "mouse" || pointerType === "keyboard"
          ? rapidClickWindowMouse
          : rapidClickWindowTouch;

      if (lockedOverdrive) {
        if (overdriveStopArmed) {
          beginLockedOverdriveFinish(pressTime);
        } else {
          lastOverdriveTapTime = pressTime;
          overdriveStopArmed = false;
        }
        return;
      }

      if (finishingLockedOverdrive) return;

      const isRapidPress =
        isSpinning
        && pressTime - lastPressTime <= activeRapidClickWindow;

      if (isSpinning) {
        currentAngle = getCurrentAngle(pressTime);
        currentScale = getCurrentScale(pressTime);
        cancelAnimationFrame(animationFrame);
        spinStartAngle = currentAngle;
        spinStartScale = currentScale;

        if (isRapidPress) {
          rapidMomentumLevel = Math.min(
            rapidMomentumLevel + 1,
            maxExtraRotations
          );
          if (
            rapidMomentumLevel === maxExtraRotations
            && !maxMomentumReached
          ) {
            maxMomentumReached = true;
            maxMomentumReachedTime = pressTime;
          }
        } else {
          rapidMomentumLevel = 0;
          resetColorOverlay();
        }
      } else {
        currentAngle = 0;
        currentScale = baseScale;
        spinStartAngle = 0;
        spinStartScale = baseScale;
        rapidMomentumLevel = 0;
        maxMomentumReached = false;
        maxMomentumReachedTime = 0;
      }

      const nextFullRotation =
        Math.ceil(spinStartAngle / baseRotation) * baseRotation;
      spinTargetAngle = isRapidPress
        ? nextFullRotation
          + extraRotationPerRapidClick * rapidMomentumLevel
        : nextFullRotation + baseRotation;
      spinDuration = baseDuration
        + extraDurationPerRapidClick * rapidMomentumLevel;
      spinStartTime = pressTime;
      lastPressTime = pressTime;
      isSpinning = true;
      animationFrame = requestAnimationFrame(spin);
    }

    function handlePointerDown(event) {
      playTapSound();

      if (!lockedOverdrive) {
        animate(event.pointerType);
        return;
      }

      toggleImage();
      lockedPointerId = event.pointerId;
      lockedPointerStartX = event.clientX;
      lockedPointerStartY = event.clientY;
      lockedPointerStartTime = performance.now();
      lockedPointerStartSpinSpeed = lockedActiveSpinSpeed;
      lockedPointerStartHueSpeed = hueCycleSpeed;
      lockedPointerMoved = false;
      lockedPointerHolding = false;
      animation.setPointerCapture(event.pointerId);
    }

    function handlePointerMove(event) {
      if (!lockedOverdrive || event.pointerId !== lockedPointerId) return;

      const dx = event.clientX - lockedPointerStartX;
      const dy = event.clientY - lockedPointerStartY;
      const distance = Math.hypot(dx, dy);
      const heldLongEnough =
        performance.now() - lockedPointerStartTime >= lockedHoldThreshold;

      if (distance >= lockedDragThreshold || heldLongEnough) {
        lockedPointerMoved = true;
        lockedPointerHolding = true;
        dismissGestureHints();
      }

      if (!lockedPointerHolding) return;

      lockedActiveSpinSpeed = clamp(
        lockedPointerStartSpinSpeed
          + (-dy / spinSpeedDragRange)
            * (maxLockedSpinSpeed - minLockedSpinSpeed),
        minLockedSpinSpeed,
        maxLockedSpinSpeed
      );
      hueCycleSpeed = clamp(
        lockedPointerStartHueSpeed
          + (dx / hueSpeedDragRange)
            * (maxHueCycleSpeed - minHueCycleSpeed),
        minHueCycleSpeed,
        maxHueCycleSpeed
      );
      lastOverdriveTapTime = performance.now();
      overdriveStopArmed = false;
    }

    function releasePointerCapture(pointerId) {
      if (animation.hasPointerCapture(pointerId)) {
        animation.releasePointerCapture(pointerId);
      }
    }

    function handlePointerUp(event) {
      if (!lockedOverdrive || event.pointerId !== lockedPointerId) return;

      const releaseTime = performance.now();
      const pressDuration = releaseTime - lockedPointerStartTime;
      const isShortTap =
        pressDuration < lockedHoldThreshold && !lockedPointerMoved;
      const shouldStop = isShortTap && overdriveStopArmed;

      releasePointerCapture(event.pointerId);
      resetLockedPointer();

      if (shouldStop) {
        beginLockedOverdriveFinish(releaseTime);
        return;
      }

      lastOverdriveTapTime = releaseTime;
      overdriveStopArmed = !isShortTap;
    }

    function handlePointerCancel(event) {
      if (event.pointerId !== lockedPointerId) return;

      releasePointerCapture(event.pointerId);
      resetLockedPointer();
      lastOverdriveTapTime = performance.now();
      overdriveStopArmed = true;
    }

    function handleOutsidePointerDown(event) {
      if (!lockedOverdrive || finishingLockedOverdrive) return;
      if (event.target.closest(".corner-control")) return;
      if (animation.contains(event.target)) return;

      playTapSound();
      if (!reducedMotion.matches) {
        pulseStartTime = performance.now();
      }
    }

    animation.addEventListener("pointerdown", handlePointerDown);
    animation.addEventListener("pointermove", handlePointerMove);
    animation.addEventListener("pointerup", handlePointerUp);
    animation.addEventListener("pointercancel", handlePointerCancel);
    document.addEventListener("pointerdown", handleOutsidePointerDown);
    soundToggle.addEventListener("click", () => {
      soundEnabled = !soundEnabled;
      saveSoundPreference();
      updateSoundToggle();
      if (soundEnabled) {
        primeAudio();
      }
    });
    animation.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        playTapSound();
        animate("keyboard");
      }
    });

    loadSoundPreference();
    updateSoundToggle();
    loadGestureHintsPreference();
