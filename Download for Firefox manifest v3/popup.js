document.addEventListener("DOMContentLoaded", async () => {
  // --- UI Elements ---
  const mainView = document.getElementById("main-view");
  const settingsView = document.getElementById("settings-view");
  const settingsToggle = document.getElementById("settings-toggle");
  
  // Icons
  const iconGear = document.getElementById("icon-gear");
  const iconHome = document.getElementById("icon-home");

  const themeToggle = document.getElementById("theme-toggle");
  const retryBtn = document.getElementById("retry-btn");
  
  const displayTitle = document.getElementById("display-title");
  const displayDifficulty = document.getElementById("display-difficulty");
  const displayTags = document.getElementById("display-tags");
  const problemCard = document.getElementById("problem-card");

  const difficultyDots = document.querySelectorAll(".dot");
  const selectedDifficulty = document.getElementById("selected-difficulty");
  const languageSelect = document.getElementById("language-select");
  const approachInput = document.getElementById("alternative-methods");
  const remarksInput = document.getElementById("remarks");
  const saveBtn = document.getElementById("save-btn");
  const statusMessage = document.getElementById("status-message");

  // Settings Elements
  const apiKeyInput = document.getElementById("notion-api-key");
  const dbIdInput = document.getElementById("notion-database-id");
  const saveKeyBtn = document.getElementById("save-key-btn"); // New Button
  const saveDbBtn = document.getElementById("save-db-btn");   // New Button
  const settingsStatusMsg = document.getElementById("settings-status-message");
  const autoDetectCheckbox = document.getElementById("auto-detect");

  // ===============================================
  // 1. INIT SETTINGS
  // ===============================================
  
  const { theme, autoDetect, notionApiKey, notionDatabaseId } = await browser.storage.local.get([
    "theme", "autoDetect", "notionApiKey", "notionDatabaseId"
  ]);
  
  if (theme === "light") document.body.classList.add("light-theme");
  
  if (notionApiKey) apiKeyInput.value = notionApiKey;
  if (notionDatabaseId) dbIdInput.value = notionDatabaseId;
  autoDetectCheckbox.checked = (autoDetect !== false); 

  themeToggle.addEventListener("click", async () => {
    document.body.classList.toggle("light-theme");
    const isLight = document.body.classList.contains("light-theme");
    await browser.storage.local.set({ theme: isLight ? "light" : "dark" });
  });

  autoDetectCheckbox.addEventListener("change", async () => {
      await browser.storage.local.set({ autoDetect: autoDetectCheckbox.checked });
  });

  // ===============================================
  // 2. VIEW NAVIGATION (Gear <-> Home Toggle)
  // ===============================================
  
  function toggleView() {
    if (settingsView.classList.contains("hidden")) {
        // Go to Settings
        mainView.classList.add("hidden");
        settingsView.classList.remove("hidden");
        // Swap Icon to Home
        iconGear.classList.add("hidden");
        iconHome.classList.remove("hidden");
    } else {
        // Go to Main
        settingsView.classList.add("hidden");
        mainView.classList.remove("hidden");
        // Swap Icon to Gear
        iconHome.classList.add("hidden");
        iconGear.classList.remove("hidden");
    }
  }

  settingsToggle.addEventListener("click", toggleView);

  // ===============================================
  // 3. DATA FETCHING
  // ===============================================
  
  async function fetchData() {
    displayTitle.textContent = "Fetching data...";
    problemCard.classList.remove("hidden");
    statusMessage.textContent = "";
    retryBtn.classList.add("hidden");

    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs.length === 0) throw new Error("No active tab");
      await browser.tabs.sendMessage(tabs[0].id, { action: "manualFetch" });
    } catch (e) {
      console.log(e);
      displayTitle.textContent = "No Problem Found";
      displayDifficulty.textContent = "N/A";
      statusMessage.textContent = "Navigate to a LeetCode problem.";
      statusMessage.className = "status-message error";
      retryBtn.classList.remove("hidden");
    }
  }

  fetchData();
  retryBtn.addEventListener("click", fetchData);

  browser.runtime.onMessage.addListener((message) => {
    if (message.action === "problemData" && message.data) {
      const data = message.data;
      displayTitle.textContent = data.Question || "Unknown";
      displayTitle.title = data.Question;
      displayDifficulty.textContent = data.difficulty || "-";
      displayDifficulty.className = `badge ${data.difficulty}`;
      
      displayTags.innerHTML = "";
      if (data.tags && Array.isArray(data.tags)) {
        data.tags.slice(0, 4).forEach(tag => {
          const span = document.createElement("span");
          span.className = "tag-chip";
          span.textContent = tag;
          displayTags.appendChild(span);
        });
      }

      if (data.detectedLanguage) {
         browser.storage.local.get("lastUsedLanguage").then(({ lastUsedLanguage }) => {
             const opts = Array.from(languageSelect.options).map(o => o.value.toLowerCase());
             if (opts.includes(data.detectedLanguage.toLowerCase())) {
                 languageSelect.value = data.detectedLanguage;
             } else if (lastUsedLanguage) {
                 languageSelect.value = lastUsedLanguage;
             }
         });
      }
    }
  });

  // ===============================================
  // 4. MAIN ACTIONS
  // ===============================================

  difficultyDots.forEach(dot => {
    dot.addEventListener("click", () => {
      difficultyDots.forEach(d => d.classList.remove("selected"));
      dot.classList.add("selected");
      selectedDifficulty.value = dot.getAttribute("data-value");
    });
  });

  saveBtn.addEventListener("click", async () => {
    saveBtn.textContent = "Saving...";
    saveBtn.disabled = true;

    if (languageSelect.value) {
        await browser.storage.local.set({ lastUsedLanguage: languageSelect.value });
    }

    const payload = {
      difficulty: selectedDifficulty.value,
      language: languageSelect.value,
      alternativeMethods: approachInput.value,
      remarks: remarksInput.value,
      correct: document.getElementById("correct").checked,
      worthReviewing: document.getElementById("worth-reviewing").checked
    };

    browser.runtime.sendMessage({ action: "saveToNotion", data: payload })
      .then(response => {
        saveBtn.disabled = false;
        if (response.status === "success") {
          saveBtn.textContent = "Saved!";
          statusMessage.textContent = "✅ Saved to Notion.";
          statusMessage.className = "status-message success";
          setTimeout(() => { saveBtn.textContent = "Save to Notion"; }, 2000);
        } else {
          saveBtn.textContent = "Save to Notion";
          statusMessage.textContent = `❌ ${response.error}`;
          statusMessage.className = "status-message error";
        }
      });
  });

  // ===============================================
  // 5. INDEPENDENT CREDENTIAL SAVING
  // ===============================================

  // Save API Key
  saveKeyBtn.addEventListener("click", async () => {
      const key = apiKeyInput.value.trim();
      if (!key) {
        settingsStatusMsg.textContent = "❌ API Key is empty.";
        settingsStatusMsg.className = "status-message error";
        return;
      }

      await browser.storage.local.set({ notionApiKey: key });
      settingsStatusMsg.textContent = "✅ API Key Saved!";
      settingsStatusMsg.className = "status-message success";
      setTimeout(() => settingsStatusMsg.textContent = "", 2000);
  });

  // Save Database ID
  saveDbBtn.addEventListener("click", async () => {
      const db = dbIdInput.value.trim();
      if (!db) {
        settingsStatusMsg.textContent = "❌ Database ID is empty.";
        settingsStatusMsg.className = "status-message error";
        return;
      }

      await browser.storage.local.set({ notionDatabaseId: db });
      settingsStatusMsg.textContent = "✅ Database ID Saved!";
      settingsStatusMsg.className = "status-message success";
      setTimeout(() => settingsStatusMsg.textContent = "", 2000);
  });
});