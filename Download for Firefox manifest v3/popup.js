document.addEventListener("DOMContentLoaded", async () => {
  // --- ELEMENTS ---
  const difficultyBoxes = document.querySelectorAll(".difficulty-box");
  const selectedDifficulty = document.getElementById("selected-difficulty");
  const tabButtons = document.querySelectorAll(".tab-button");
  const tabContents = document.querySelectorAll(".tab-content");
  const statusMessage = document.getElementById("status-message");
  
  const languageSelect = document.getElementById("language-select");
  const themeToggle = document.getElementById("theme-toggle");
  
  const profileSelect = document.getElementById("profile-select");
  const profileNameInput = document.getElementById("profile-name");
  const apiKeyInput = document.getElementById("notion-api-key");
  const dbIdInput = document.getElementById("notion-database-id");
  const saveProfileBtn = document.getElementById("save-profile-btn");
  const deleteProfileBtn = document.getElementById("delete-profile-btn");
  const settingsStatusMessage = document.getElementById("settings-status-message");

  // ===========================================
  // 1. THEME HANDLING (New)
  // ===========================================
  async function initTheme() {
    const { theme } = await browser.storage.local.get("theme");
    // Default to dark if not set
    if (theme === "light") {
      document.body.classList.add("light-theme");
    }
  }
  
  themeToggle.addEventListener("click", async () => {
    document.body.classList.toggle("light-theme");
    const isLight = document.body.classList.contains("light-theme");
    await browser.storage.local.set({ theme: isLight ? "light" : "dark" });
  });

  initTheme(); // Run on start

  // ===========================================
  // 2. TAB SWITCHING
  // ===========================================
  tabButtons.forEach(button => {
    button.addEventListener("click", () => {
      const tabName = button.getAttribute("data-tab");
      tabContents.forEach(content => content.classList.remove("active"));
      document.getElementById(tabName).classList.add("active");
      tabButtons.forEach(btn => btn.classList.remove("active"));
      button.classList.add("active");
    });
  });

  // ===========================================
  // 3. DIFFICULTY & LANGUAGE
  // ===========================================
  difficultyBoxes.forEach(box => {
    box.addEventListener("click", () => {
      difficultyBoxes.forEach(b => b.classList.remove("selected"));
      box.classList.add("selected");
      selectedDifficulty.value = box.getAttribute("data-value");
    });
  });

  // Load last used language
  const { lastUsedLanguage } = await browser.storage.local.get("lastUsedLanguage");
  if (lastUsedLanguage) languageSelect.value = lastUsedLanguage;

  // Listen for auto-detected language
  browser.runtime.onMessage.addListener((message) => {
      if (message.action === "problemData" && message.data.detectedLanguage) {
           const options = Array.from(languageSelect.options).map(o => o.value);
           if (options.includes(message.data.detectedLanguage)) {
             languageSelect.value = message.data.detectedLanguage;
           }
      }
  });

  // ===========================================
  // 4. MANUAL REFRESH
  // ===========================================
  document.getElementById("refresh-data-btn").addEventListener("click", async () => {
      statusMessage.textContent = "⏳ Fetching...";
      statusMessage.className = "status-message";
      try {
          const tabs = await browser.tabs.query({active: true, currentWindow: true});
          if (tabs.length === 0) throw new Error("No active tab");
          await browser.tabs.sendMessage(tabs[0].id, {action: "manualFetch"});
          statusMessage.textContent = "✅ Data refreshed!";
          statusMessage.className = "status-message success";
          setTimeout(() => { statusMessage.textContent = ""; }, 2000);
      } catch (error) {
          statusMessage.textContent = "❌ Connection failed.";
          statusMessage.className = "status-message error";
      }
  });

  // ===========================================
  // 5. PROFILE MANAGEMENT
  // ===========================================
  async function loadProfiles() {
    const { notionProfiles, activeProfileId } = await browser.storage.local.get(["notionProfiles", "activeProfileId"]);
    let profiles = notionProfiles || {};
    let activeId = activeProfileId || "default";

    profileSelect.innerHTML = "";

    if (Object.keys(profiles).length === 0) {
        profiles = { "default": { name: "Default", apiKey: "", databaseId: "" } };
        activeId = "default";
        await browser.storage.local.set({ notionProfiles: profiles, activeProfileId: activeId });
    }

    for (const [id, profile] of Object.entries(profiles)) {
        const option = document.createElement("option");
        option.value = id;
        option.textContent = profile.name;
        profileSelect.appendChild(option);
    }

    if (profiles[activeId]) {
        profileSelect.value = activeId;
        fillInputs(profiles[activeId]);
    } else {
        const firstId = Object.keys(profiles)[0];
        profileSelect.value = firstId;
        fillInputs(profiles[firstId]);
        await browser.storage.local.set({ activeProfileId: firstId });
    }
  }

  function fillInputs(profile) {
      profileNameInput.value = profile.name;
      apiKeyInput.value = profile.apiKey;
      dbIdInput.value = profile.databaseId;
  }

  profileSelect.addEventListener("change", async () => {
      const selectedId = profileSelect.value;
      const { notionProfiles } = await browser.storage.local.get("notionProfiles");
      if (notionProfiles && notionProfiles[selectedId]) {
          fillInputs(notionProfiles[selectedId]);
          await browser.storage.local.set({ activeProfileId: selectedId });
      }
  });

  saveProfileBtn.addEventListener("click", async () => {
      const name = profileNameInput.value.trim();
      const apiKey = apiKeyInput.value.trim();
      const dbId = dbIdInput.value.trim();

      if (!name) return;

      const { notionProfiles } = await browser.storage.local.get(["notionProfiles"]);
      let profiles = notionProfiles || {};
      const currentId = profileSelect.value;
      
      let targetId = currentId;
      if (profiles[currentId].name !== name) {
          const newId = Date.now().toString(); 
          profiles[newId] = { name, apiKey, databaseId: dbId };
          targetId = newId;
      } else {
          profiles[currentId].apiKey = apiKey;
          profiles[currentId].databaseId = dbId;
      }

      await browser.storage.local.set({ notionProfiles: profiles, activeProfileId: targetId });
      settingsStatusMessage.textContent = "✅ Saved!";
      settingsStatusMessage.className = "status-message success";
      setTimeout(() => { settingsStatusMessage.textContent = ""; }, 2000);
      loadProfiles(); 
  });

  deleteProfileBtn.addEventListener("click", async () => {
      const { notionProfiles } = await browser.storage.local.get("notionProfiles");
      const currentId = profileSelect.value;

      if (Object.keys(notionProfiles).length <= 1) {
          settingsStatusMessage.textContent = "Cannot delete last profile.";
          settingsStatusMessage.className = "status-message error";
          return;
      }

      delete notionProfiles[currentId];
      const nextId = Object.keys(notionProfiles)[0];
      await browser.storage.local.set({ notionProfiles: notionProfiles, activeProfileId: nextId });
      loadProfiles();
  });

  loadProfiles();

  // ===========================================
  // 6. SAVE PROBLEM
  // ===========================================
  document.getElementById("save-btn").addEventListener("click", async () => {
    const selectedLang = languageSelect.value;
    if (selectedLang) await browser.storage.local.set({ lastUsedLanguage: selectedLang });

    const data = {
      difficulty: selectedDifficulty.value,
      language: selectedLang, 
      alternativeMethods: document.getElementById("alternative-methods").value,
      remarks: document.getElementById("remarks").value,
      correct: document.getElementById("correct").checked,
      worthReviewing: document.getElementById("worth-reviewing").checked,
    };

    try {
      const response = await browser.runtime.sendMessage({ action: "saveToNotion", data: data });

      if (response && response.status === "success") {
        statusMessage.textContent = "✅ Saved!";
        statusMessage.className = "status-message success";
      } else {
        statusMessage.textContent = `❌ ${response ? response.error : "Error"}`;
        statusMessage.className = "status-message error";
      }
    } catch (error) {
      statusMessage.textContent = "❌ Failed.";
      statusMessage.className = "status-message error";
    }
  });

  browser.runtime.onMessage.addListener((message) => {
    if (message.action === "notionResponse") {
      if (message.response.status === "success") {
        statusMessage.textContent = "✅ Saved!";
        statusMessage.className = "status-message success";
      } else {
        statusMessage.textContent = `❌ ${message.response.error}`;
        statusMessage.className = "status-message error";
      }
    }
  });
});