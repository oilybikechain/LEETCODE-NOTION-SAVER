document.addEventListener("DOMContentLoaded", async () => {
  // Elements
  const header = document.querySelector("header");
  const mainView = document.getElementById("main-view");
  const settingsView = document.getElementById("settings-view");
  const reviewView = document.getElementById("review-view");
  const setupView = document.getElementById("setup-view");
  const settingsToggle = document.getElementById("settings-toggle");
  const reviewListContainer = document.getElementById("review-list-container");
  
  const iconGear = document.getElementById("icon-gear");
  const iconHome = document.getElementById("icon-home");
  const themeToggle = document.getElementById("theme-toggle");
  const retryBtn = document.getElementById("retry-btn");
  const displayTitle = document.getElementById("display-title");
  const problemCard = document.getElementById("problem-card");
  const saveBtn = document.getElementById("save-btn");
  const statusMessage = document.getElementById("status-message");

  const apiKeyInput = document.getElementById("notion-api-key");
  const dbIdInput = document.getElementById("notion-database-id");
  const saveKeyBtn = document.getElementById("save-key-btn");
  const saveDbBtn = document.getElementById("save-db-btn");
  const launchSetupBtn = document.getElementById("launch-setup-btn");

  const setupBackBtn = document.getElementById("setup-back-btn");
  const setupNextBtn = document.getElementById("setup-next-btn");
  const setupError = document.getElementById("setup-error");
  const setupSteps = document.querySelectorAll(".setup-step");
  const stepDots = document.querySelectorAll(".step-dot");
  const setupApiKey = document.getElementById("setup-api-key");
  const setupDbId = document.getElementById("setup-db-id");
  const setupSaveKeyBtn = document.getElementById("setup-save-key-btn");
  const setupSaveDbBtn = document.getElementById("setup-save-db-btn");
  const setupKeyMsg = document.getElementById("setup-key-msg");
  const setupDbMsg = document.getElementById("setup-db-msg");

  // Inputs
  const languageSelect = document.getElementById("language-select");
  const selectedDifficulty = document.getElementById("selected-difficulty");
  const approachInput = document.getElementById("alternative-methods");
  const remarksInput = document.getElementById("remarks");

  const toggleRecent = document.getElementById("scope-recent");
  const toggleAll = document.getElementById("scope-all");

  let currentStep = 1;
  const totalSteps = 3;

  // ===============================================
  // 1. INITIALIZATION & LANGUAGE PRE-SELECT
  // ===============================================
  
  const { theme, autoDetect, notionApiKey, notionDatabaseId, lastUsedLanguage } = await browser.storage.local.get([
    "theme", "autoDetect", "notionApiKey", "notionDatabaseId", "lastUsedLanguage"
  ]);
  
  if (theme === "light") document.body.classList.add("light-theme");
  if (notionApiKey) apiKeyInput.value = notionApiKey;
  if (notionDatabaseId) dbIdInput.value = notionDatabaseId;
  document.getElementById("auto-detect").checked = (autoDetect !== false);

  // Set Language: History > Default "Python"
  if (lastUsedLanguage) {
      languageSelect.value = lastUsedLanguage;
  } else {
      languageSelect.value = "Python";
  }

  if (!notionApiKey || !notionDatabaseId) {
      openSetupWizard();
  } else {
      fetchData(); 
  }

  // ===============================================
  // 2. SETUP WIZARD LOGIC
  // ===============================================

  async function openSetupWizard() {
      // PRE-FILL SETUP INPUTS
      const { notionApiKey, notionDatabaseId } = await browser.storage.local.get(["notionApiKey", "notionDatabaseId"]);
      if (notionApiKey) setupApiKey.value = notionApiKey;
      if (notionDatabaseId) setupDbId.value = notionDatabaseId;

      header.classList.add("hidden");
      mainView.classList.add("hidden");
      settingsView.classList.add("hidden");
      reviewView.classList.add("hidden");
      setupView.classList.remove("hidden");
      currentStep = 1;
      updateSetupUI();
  }

  function closeSetupWizard() {
      setupView.classList.add("hidden");
      header.classList.remove("hidden");
      iconHome.classList.add("hidden");
      iconGear.classList.remove("hidden");
  }

  function updateSetupUI() {
      setupSteps.forEach((el, index) => {
          if (index + 1 === currentStep) el.classList.add("active");
          else el.classList.remove("active");
      });
      stepDots.forEach((dot, index) => {
          if (index + 1 <= currentStep) dot.classList.add("active");
          else dot.classList.remove("active");
      });
      setupBackBtn.classList.toggle("hidden", currentStep === 1);
      setupNextBtn.textContent = currentStep === totalSteps ? "Finish" : "Next";
      setupError.textContent = "";
  }

  setupSaveKeyBtn.addEventListener("click", async () => {
      const key = setupApiKey.value.trim();
      if(!key) { setupKeyMsg.textContent = "❌ Empty"; return; }
      await browser.storage.local.set({ notionApiKey: key });
      apiKeyInput.value = key;
      setupKeyMsg.textContent = "✅ Saved!";
      setupApiKey.classList.add("valid");
  });

  setupSaveDbBtn.addEventListener("click", async () => {
      const db = setupDbId.value.trim();
      if(!db) { setupDbMsg.textContent = "❌ Empty"; return; }
      await browser.storage.local.set({ notionDatabaseId: db });
      dbIdInput.value = db;
      setupDbMsg.textContent = "✅ Saved!";
      setupDbId.classList.add("valid");
  });

  setupBackBtn.addEventListener("click", () => {
      if (currentStep > 1) {
          currentStep--;
          updateSetupUI();
      }
  });

  setupNextBtn.addEventListener("click", async () => {
      setupError.textContent = "";
      setupNextBtn.disabled = true;

      // STEP 2: API KEY
      if (currentStep === 2) {
          const key = setupApiKey.value.trim();
          if (!key) {
              setupError.textContent = "Please enter an API Key.";
              setupApiKey.classList.add("invalid");
              setupNextBtn.disabled = false;
              return;
          }
          
          // Auto-save logic if user proceeds without clicking save
          if(!apiKeyInput.value || apiKeyInput.value !== key) {
             await browser.storage.local.set({ notionApiKey: key });
             apiKeyInput.value = key;
          }
          
          setupApiKey.classList.remove("invalid");
          setupApiKey.classList.add("valid");
      }

      // STEP 3: DATABASE ID
      if (currentStep === 3) {
          const dbId = setupDbId.value.trim();
          // Use input or fallback to saved value
          const finalDbId = dbId || dbIdInput.value;
          const finalKey = setupApiKey.value.trim() || apiKeyInput.value.trim();

          if (finalDbId.length < 20) {
              setupError.textContent = "Invalid ID format.";
              setupDbId.classList.add("invalid");
              setupNextBtn.disabled = false;
              return;
          }

          setupNextBtn.textContent = "Verifying...";
          try {
              const response = await browser.runtime.sendMessage({
                  action: "validateNotion",
                  data: { apiKey: finalKey, dbId: finalDbId }
              });

              if (response.status === "success") {
                  await browser.storage.local.set({ notionApiKey: finalKey, notionDatabaseId: finalDbId });
                  apiKeyInput.value = finalKey;
                  dbIdInput.value = finalDbId;
                  
                  closeSetupWizard();
                  fetchData(); 
              } else {
                  setupError.textContent = "Connection Failed: " + (response.error || "Check inputs.");
              }
          } catch (e) {
              setupError.textContent = "Error testing connection.";
          }
          setupNextBtn.disabled = false;
          return;
      }

      currentStep++;
      updateSetupUI();
      setupNextBtn.disabled = false;
  });

  launchSetupBtn.addEventListener("click", () => {
      openSetupWizard();
  });

  // ===============================================
  // 3. NAVIGATION
  // ===============================================

  function toggleView() {
    if (settingsView.classList.contains("hidden")) {
        mainView.classList.add("hidden");
        reviewView.classList.add("hidden");
        settingsView.classList.remove("hidden");
        iconGear.classList.add("hidden");
        iconHome.classList.remove("hidden");
    } else {
        settingsView.classList.add("hidden");
        iconHome.classList.add("hidden");
        iconGear.classList.remove("hidden");
        fetchData(); 
    }
  }

  settingsToggle.addEventListener("click", toggleView);

  themeToggle.addEventListener("click", async () => {
    document.body.classList.toggle("light-theme");
    const isLight = document.body.classList.contains("light-theme");
    await browser.storage.local.set({ theme: isLight ? "light" : "dark" });
  });

  document.getElementById("auto-detect").addEventListener("change", async (e) => {
      await browser.storage.local.set({ autoDetect: e.target.checked });
  });

  // ===============================================
  // 4. DATA FETCHING (DASHBOARD)
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
      mainView.classList.remove("hidden");
      reviewView.classList.add("hidden");
    } catch (e) {
      loadReviewList();
    }
  }

  toggleRecent.addEventListener("change", () => loadReviewList("recent"));
  toggleAll.addEventListener("change", () => loadReviewList("all"));

  async function loadReviewList(scope = "recent") {
      mainView.classList.add("hidden");
      reviewView.classList.remove("hidden");
      
      const loadingText = scope === "all" ? "Scanning full database..." : "Scanning recent history...";
      reviewListContainer.innerHTML = `<p class="small-text" style="text-align:center; margin-top:20px;">${loadingText}</p>`;

      const response = await browser.runtime.sendMessage({ 
          action: "fetchReviewList",
          mode: scope
      });

      if(response.status === "success") {
          renderDashboard(response.data);
      } else {
          reviewListContainer.innerHTML = `<p class="status-message error">${response.error}</p>`;
      }
  }

  function renderDashboard(data) {
      reviewListContainer.innerHTML = "";
      
      if (!data || (!data.unsolved && !data.review)) {
          reviewListContainer.innerHTML = '<p class="status-message error">Invalid data structure</p>';
          return;
      }

      if (data.unsolved.length > 0) {
          const h = document.createElement("div");
          h.className = "section-header";
          h.innerText = `📝 Unsolved Problems (${data.unsolved.length})`;
          reviewListContainer.appendChild(h);
          data.unsolved.forEach(item => reviewListContainer.appendChild(createItemEl(item)));
      }

      if (data.review.length > 0) {
          const h = document.createElement("div");
          h.className = "section-header";
          h.innerText = `🔄 Review Queue (${data.review.length})`;
          reviewListContainer.appendChild(h);
          data.review.forEach(item => reviewListContainer.appendChild(createItemEl(item)));
      }

      if (data.unsolved.length === 0 && data.review.length === 0) {
          reviewListContainer.innerHTML = '<p class="empty-review">🎉 No problems found!</p>';
      }
  }

  function createItemEl(item) {
      const el = document.createElement('a');
      el.className = "review-item";
      el.href = item.url;
      el.target = "_blank";
      el.innerHTML = `
        <div class="review-info">
          <div class="review-title" title="${item.title}">${item.title}</div>
          <div class="review-date">Last Practiced: ${new Date(item.lastPracticed).toLocaleDateString()}</div>
        </div>
        <div class="review-badge ${item.difficulty}">${item.difficulty}</div>
      `;
      return el;
  }

  retryBtn.addEventListener("click", fetchData);

  browser.runtime.onMessage.addListener((message) => {
    if (message.action === "problemData" && message.data) {
        const data = message.data;
        displayTitle.textContent = data.Question;
        displayTitle.title = data.Question;
        document.getElementById("display-difficulty").textContent = data.difficulty;
        document.getElementById("display-difficulty").className = `badge ${data.difficulty}`;
        const tagsContainer = document.getElementById("display-tags");
        tagsContainer.innerHTML = "";
        data.tags.slice(0,4).forEach(t => {
            const s = document.createElement("span"); s.className = "tag-chip"; s.textContent = t;
            tagsContainer.appendChild(s);
        });
        
        if(data.detectedLanguage) {
             const opts = Array.from(languageSelect.options).map(o => o.value);
             if (opts.includes(data.detectedLanguage)) {
                 languageSelect.value = data.detectedLanguage;
             }
        }
    }
  });

  saveBtn.addEventListener("click", async () => {
      saveBtn.textContent = "Saving...";
      saveBtn.disabled = true;
      
      await browser.storage.local.set({ lastUsedLanguage: languageSelect.value });

      const officialDiff = document.getElementById("display-difficulty").textContent;
      const userDiff = selectedDifficulty.value;
      const methods = approachInput.value.trim();
      const remarks = remarksInput.value.trim();

      const payload = {
        difficulty: userDiff || officialDiff,
        language: languageSelect.value || "Python",
        alternativeMethods: methods || "None",
        remarks: remarks || "None",
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

  saveKeyBtn.addEventListener("click", async () => {
      await browser.storage.local.set({ notionApiKey: apiKeyInput.value.trim() });
      document.getElementById("settings-status-message").textContent = "✅ Key Saved";
  });
  saveDbBtn.addEventListener("click", async () => {
      await browser.storage.local.set({ notionDatabaseId: dbIdInput.value.trim() });
      document.getElementById("settings-status-message").textContent = "✅ DB ID Saved";
  });
  
  document.querySelectorAll(".dot").forEach(dot => {
      dot.addEventListener("click", () => {
          document.querySelectorAll(".dot").forEach(d => d.classList.remove("selected"));
          dot.classList.add("selected");
          document.getElementById("selected-difficulty").value = dot.getAttribute("data-value");
      });
  });
});