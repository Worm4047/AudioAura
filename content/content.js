// Define a global debug mode flag
const DEBUG_MODE = true; // Set to false in production

// Custom log function that checks the debug mode
function debugLog(...messages) {
  if (DEBUG_MODE) {
    console.log(...messages);
  }
}

debugLog("content.js loaded");

let source;
let audioContext;
let volumeGainNode;
let bassGainNode;
let bassBoostFilter;
let convolver;
let initDone = false;
let reverbPresets;
let trebleBoostFilter;

reverbPresets = {
  club: { duration: 2, decay: 4, zPosition: -5 },
  auditorium: { duration: 3, decay: 5, zPosition: -15 },
  concertHall: { duration: 3.5, decay: 5.5, zPosition: -20 },
  theater: { duration: 2.5, decay: 4.5, zPosition: -2.5 },
};

function connectNodes() {
  source.connect(volumeGainNode);
  volumeGainNode.connect(bassBoostFilter);
  bassBoostFilter.connect(bassGainNode);
  bassGainNode.connect(audioContext.destination);
}

function initNodes() {
  videoElement = document.querySelector("video");
  if (videoElement == null) {
    return false;
  }

  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  source = audioContext.createMediaElementSource(videoElement);
  volumeGainNode = audioContext.createGain();
  volumeGainNode.gain.value = 1;
  bassGainNode = audioContext.createGain();
  bassBoostFilter = audioContext.createBiquadFilter();
  bassBoostFilter.frequency.value = 250;
  bassBoostFilter.type = "lowshelf";
  bassBoostFilter.gain.value = 0;
  convolver = audioContext.createConvolver();
  trebleBoostFilter = audioContext.createBiquadFilter();
  trebleBoostFilter.type = "highshelf";
  trebleBoostFilter.frequency.value = 3000; // Target frequencies above 3000 Hz
  return true;
}

function boostVolume(boostFactor) {
  // 1 is normal, 2 is double the volume, etc.
  volumeGainNode.gain.value = boostFactor; // Boost the volume by 2x
}

function boostBass(boostFactor) {
  bassBoostFilter.type = "lowshelf";
  bassBoostFilter.frequency.value = 250; // Target frequencies below 200 Hz
  bassBoostFilter.gain.value = boostFactor; // Amount of boost in dB
}

// Function to create an impulse response
function createImpulseResponse(duration = 1, decay = 2, reverse = false) {
  const sampleRate = audioContext.sampleRate;
  const length = sampleRate * duration;
  const impulseResponse = audioContext.createBuffer(2, length, sampleRate);

  // 2. Generate white noise and 3. Apply a decay curve
  for (let i = 0; i < 2; i++) {
    const channel = impulseResponse.getChannelData(i);
    for (let j = 0; j < length; j++) {
      const envelope = Math.pow(1 - j / length, decay); // Decay curve
      channel[j] = (Math.random() * 2 - 1) * envelope;
    }
  }

  if (reverse) {
    for (let i = 0; i < 2; i++) {
      const channel = impulseResponse.getChannelData(i);
      Array.prototype.reverse.call(channel);
    }
  }

  return impulseResponse;
}

function reverb(duration, decay, zPosition) {
  debugLog(
    "Setting reverb with duration",
    duration,
    ", decay",
    decay,
    "and zPosition",
    zPosition
  );
  convolver.buffer = createImpulseResponse(duration, decay);
  source.connect(convolver);
  convolver.connect(audioContext.destination);
}

function boostTreble(boostFactor) {
  trebleBoostFilter.gain.value = boostFactor; // Amount of boost in dB
  source.connect(trebleBoostFilter);
  trebleBoostFilter.connect(audioContext.destination);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  debugLog(request, sender, sendResponse);
  if (request.boostVolume) {
    boostVolume(request.boostVolume);
    sendResponse("Volume boosted to " + request.boostVolume);
  } else if (request.boostBass) {
    boostBass(request.boostBass * 3);
    sendResponse("Bass boosted to " + request.boostBass);
  } else if (request.reverb) {
    if (request.reverb === "none" && convolver !== undefined) {
      convolver.disconnect();
      sendResponse("Reverb reset");
      connectNodes();
      return;
    } else {
      reverb(
        reverbPresets[request.reverb].duration,
        reverbPresets[request.reverb].decay,
        reverbPresets[request.reverb].zPosition
      );
      sendResponse("Reverb set");
    }
  } else if (request.boostTreble) {
    if (request.boostTreble === "0" && trebleBoostFilter !== undefined) {
      trebleBoostFilter.disconnect();
      sendResponse("Treble reset");
      connectNodes();
      return;
    }
    boostTreble(request.boostTreble);
    sendResponse("Treble boosted to " + request.boostTreble);
  } else if (request.isContentScriptLoaded) {
    sendResponse({ loaded: true });
    return true;
  } else if (request.isPopupLoaded) {
    if (initDone) {
      sendResponse({ loaded: true });
    } else {
      initResult = initNodes();
      if (initResult === true) {
        debugLog("Nodes initialized");
        connectNodes();
        initDone = true;
      }
      sendResponse({ contentloaded: true });
    }
  }
});
