const DEBUG_MODE = true; // Set to false in production

// Custom log function that checks the debug mode
function debugLog(...messages) {
  if (DEBUG_MODE) {
    console.log(...messages);
  }
}

debugLog("popup.js loaded");

// Path: AudioAura/popup/popup.js
const volumeSlider = document.getElementById("volume");
const volumeValue = document.getElementById("volume-value");
const resetVolumeBtn = document.getElementById("reset-volume");

const bassSlider = document.getElementById("bass");
const bassValue = document.getElementById("bass-value");
const resetBassBtn = document.getElementById("reset-bass");

const reverbSelection = document.getElementById("reverb-selection");
const setReverbBtn = document.getElementById("set-reverb");
const resetReverbBtn = document.getElementById("reset-reverb");

const trebleSlider = document.getElementById("treble");
const trebleValue = document.getElementById("treble-value");
const resetTrebleBtn = document.getElementById("reset-treble");

const promptElement = document.getElementById("prompt");

function start() {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    var currentTab = tabs[0]; // There should only be one active tab

    if (!currentTab || !currentTab.url) {
      promptElement.style.display = "block"; // Show reload prompt
      promptElement.textContent = "No Active Tab Found";
      return;
    }

    // Check if the current tab's URL is from YouTube or Netflix
    const url = new URL(currentTab.url);
    const hostname = url.hostname;
    debugLog(hostname, url);
    if (
      !url.href.includes("youtube.com") &&
      !url.href.includes("netflix.com")
    ) {
      promptElement.style.display = "block"; // Show reload prompt
      promptElement.textContent =
        "This extension is only supported on YouTube and Netflix Content.";
      return; // Exit if the URL is not YouTube or Netflix
    }

    sendMessageWithRetry(
      currentTab.id,
      { isContentScriptLoaded: true },
      3,
      500,
      function (success, response) {
        if (!success) {
          // After retries, if content script is not loaded
          promptElement.style.display = "block"; // Show reload prompt
          promptElement.textContent =
            "Please reload the page to use this extension.";
        } else {
          document.querySelectorAll(".clickable-item").forEach((item) => {
            item.disabled = false;
          });
          chrome.tabs
            .sendMessage(currentTab.id, { isPopupLoaded: true })
            .then(
              (response) => {
                debugLog("Response from content.js for init", response);
              },
              (error) => {
                debugLog(error);
              }
            )
            .catch((error) => {
              debugLog(error);
            });
          initPopupValues();
        }
        // If success, you can interact with the content script as needed
      }
    );
  });
}

function initPopupValues() {
  chrome.storage.local.get("boostVolume", (data) => {
    volumeSlider.value = data.boostVolume || 1;
    volumeValue.textContent = volumeSlider.value;
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(tabs[0].id, { boostVolume: volumeSlider.value });
    });
  });

  chrome.storage.local.get("boostBass", (data) => {
    bassSlider.value = data.boostBass || 0;
    bassValue.textContent = bassSlider.value;
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(tabs[0].id, { boostBass: bassSlider.value });
    });
  });

  chrome.storage.local.get("reverb", (data) => {
    reverbSelection.value = data.reverb || "none";
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(tabs[0].id, { reverb: reverbSelection.value });
    });
  });

  chrome.storage.local.get("boostTreble", (data) => {
    trebleSlider.value = data.boostTreble || 0;
    trebleValue.textContent = trebleSlider.value;
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(tabs[0].id, { boostTreble: trebleSlider.value });
    });
  });
}

function sendMessageWithRetry(tabId, message, maxRetries, delay, callback) {
  let attempt = 0; // Initialize attempt counter

  function attemptSendMessage() {
    chrome.tabs
      .sendMessage(tabId, message)
      .then((response) => {
        if (response && response.loaded) {
          debugLog("Content script is loaded.");
          callback(true, response); // Successful response
        } else {
          debugLog("Unexpected response: ", response);
          callback(false, null); // Failed after retries
        }
      })
      .catch((error) => {
        debugLog("Content.js not loaded.");
        if (attempt < maxRetries) {
          attempt++;
          debugLog(`Retry #${attempt}`);
          setTimeout(attemptSendMessage, delay); // Wait for delay milliseconds before retrying
        } else {
          debugLog(
            "Content script is not loaded after retries. Please reload the page."
          );
          callback(false, null); // Failed after retries
        }
      });
  }

  attemptSendMessage(); // Start the attempt loop
}

volumeSlider.addEventListener("input", function () {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    debugLog(tabs);
    chrome.tabs
      .sendMessage(tabs[0].id, { boostVolume: volumeSlider.value })
      .then((response) => {
        debugLog("Response from content.js", response);
        chrome.storage.local.set({ boostVolume: volumeSlider.value }, () => {
          debugLog("Volume preset saved");
        });
        volumeValue.textContent = volumeSlider.value;
      })
      .catch((error) => {
        debugLog(error);
      });
  });
});

resetVolumeBtn.addEventListener("click", function () {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs
      .sendMessage(tabs[0].id, { boostVolume: "1" })
      .then((response) => {
        debugLog("Response from content.js", response);
        chrome.storage.local.set({ boostVolume: 1 }, () => {
          debugLog("Volume preset saved");
        });
        volumeSlider.value = 1;
        volumeValue.textContent = 1;
      });
  });
});

bassSlider.addEventListener("input", function () {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs
      .sendMessage(tabs[0].id, { boostBass: bassSlider.value })
      .then((response) => {
        debugLog("Response from content.js", response);
        chrome.storage.local.set({ boostBass: bassSlider.value }, () => {
          debugLog("Bass preset saved");
        });
        bassValue.textContent = bassSlider.value;
      })
      .catch((error) => {
        debugLog(error);
      });
  });
});

resetBassBtn.addEventListener("click", function () {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, { boostBass: "0" }).then((response) => {
      debugLog("Response from content.js", response);
      chrome.storage.local.set({ boostBass: 0 }, () => {
        debugLog("Bass preset saved");
      });
      bassSlider.value = 0;
      bassValue.textContent = 0;
    });
  });
});

setReverbBtn.addEventListener("click", function () {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs
      .sendMessage(tabs[0].id, { reverb: reverbSelection.value })
      .then((response) => {
        debugLog("Response from content.js", response);
        chrome.storage.local.set({ reverb: reverbSelection.value }, () => {
          debugLog("Reverb preset saved");
        });
      })
      .catch((error) => {
        debugLog(error);
      });
  });
});

resetReverbBtn.addEventListener("click", function () {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs
      .sendMessage(tabs[0].id, { reverb: "none" })
      .then((response) => {
        debugLog("Response from content.js", response);
        chrome.storage.local.set({ reverb: "none" }, () => {
          debugLog("Reverb preset saved");
        });
        reverbSelection.selectedIndex = -1;
      })
      .catch((error) => {
        debugLog(error);
      });
  });
});

trebleSlider.addEventListener("input", function () {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs
      .sendMessage(tabs[0].id, { boostTreble: trebleSlider.value })
      .then((response) => {
        debugLog("Response from content.js", response);
        chrome.storage.local.set({ boostTreble: trebleSlider.value }, () => {
          debugLog("Treble preset saved");
        });
      })
      .catch((error) => {
        debugLog(error);
      });
    trebleValue.textContent = trebleSlider.value;
  });
});

resetTrebleBtn.addEventListener("click", function () {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs
      .sendMessage(tabs[0].id, { boostTreble: "0" })
      .then((response) => {
        debugLog("Response from content.js", response);
        chrome.storage.local.set({ boostTreble: 0 }, () => {
          debugLog("Treble preset saved");
        });
        trebleSlider.value = 0;
        trebleValue.textContent = 0;
      })
      .catch((error) => {
        debugLog(error);
      });
  });
});

start();
