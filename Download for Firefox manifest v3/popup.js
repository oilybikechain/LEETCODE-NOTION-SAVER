document.addEventListener("DOMContentLoaded", async () => {
  // Elements
  const header = document.querySelector("header");
  const mainView = document.getElementById("main-view");
  const settingsView = document.getElementById("settings-view");
  const reviewView = document.getElementById("review-view");
  const reviewListContainer = document.getElementById("review-list-container");
  const toggleRecent = document.getElementById("scope-recent");
  const toggleAll = document.getElementById("scope-all");
  
  // Icons & Inputs
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

  // Setup Wizard Elements
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

  

  let currentStep = 1;
  const totalSteps = 3;

  // ===============================================
  // 1. INITIALIZATION
  // ===============================================
  
  const { theme, autoDetect, notionApiKey, notionDatabaseId } = await browser.storage.local.get([
    "theme", "autoDetect", "notionApiKey", "notionDatabaseId"
  ]);
  
  if (theme === "light") document.body.classList.add("light-theme");
  if (notionApiKey) apiKeyInput.value = notionApiKey;
  if (notionDatabaseId) dbIdInput.value = notionDatabaseId;
  document.getElementById("auto-detect").checked = (autoDetect !== false);

  if (!notionApiKey || !notionDatabaseId) {
      openSetupWizard();
  } else {
      fetchData(); 
  }

  // ===============================================
  // 2. DATA FETCHING (Determines View)
  // ===============================================
  
  async function fetchData() {
    displayTitle.textContent = "Fetching data...";
    problemCard.classList.remove("hidden");
    statusMessage.textContent = "";
    retryBtn.classList.add("hidden");

    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs.length === 0) throw new Error("No active tab");
      
      // Try to talk to LeetCode content script
      await browser.tabs.sendMessage(tabs[0].id, { action: "manualFetch" });
      
      // If we are here, we are on LeetCode. Show Main View.
      mainView.classList.remove("hidden");
      reviewView.classList.add("hidden");

    } catch (e) {
      // ❌ Failed to talk to content script -> We are NOT on a problem page.
      // 🔄 Switch to Review List mode
      console.log("Not on LeetCode problem. Showing review list.");
      loadReviewList();
    }
  }

  // ===============================================
  // REVIEW LIST LOGIC
  // ===============================================

  // Listen for Toggle Changes
  toggleRecent.addEventListener("change", () => loadReviewList("recent"));
  toggleAll.addEventListener("change", () => loadReviewList("all"));

  async function loadReviewList(scope = "recent") {
      // Ensure view is visible
      mainView.classList.add("hidden");
      reviewView.classList.remove("hidden");
      
      const loadingText = scope === "all" 
        ? "Scanning full database... (this may take a moment)" 
        : "Scanning recent history...";
        
      reviewListContainer.innerHTML = `<p class="small-text" style="text-align:center; margin-top:20px;">${loadingText}</p>`;

      // Send mode to background
      const response = await browser.runtime.sendMessage({ 
          action: "fetchReviewList",
          mode: scope // 'recent' or 'all'
      });

      if(response.status === "success") {
          renderReviewList(response.data);
      } else {
          reviewListContainer.innerHTML = `<p class="status-message error">${response.error}</p>`;
      }
  }

  function renderReviewList(items) {
      reviewListContainer.innerHTML = "";
      
      if(items.length === 0) {
          reviewListContainer.innerHTML = '<p class="empty-review">🎉 No problems to review!</p>';
          return;
      }

      items.forEach(item => {
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
          reviewListContainer.appendChild(el);
      });
  }

  // Update fetchData to default to 'recent' view if not on LeetCode
  async function fetchData() {
    // ... [setup code] ...
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs.length === 0) throw new Error("No active tab");
      await browser.tabs.sendMessage(tabs[0].id, { action: "manualFetch" });
      
      mainView.classList.remove("hidden");
      reviewView.classList.add("hidden");
    } catch (e) {
      // Default to "Recent" view on load error
      if(toggleAll.checked) loadReviewList("all");
      else loadReviewList("recent");
    }
  }

  // ... [ALL OTHER LOGIC (Setup, Settings, Save) REMAINS THE SAME] ...
  
  // (Paste rest of previous popup.js code here: Setup Wizard, Toggle View, Save Logic)
  // Re-including key navigation components below for completeness context:

  function toggleView() {
    // If on review view, clicking gear goes to settings
    if (settingsView.classList.contains("hidden")) {
        mainView.classList.add("hidden");
        reviewView.classList.add("hidden"); // Hide review if active
        settingsView.classList.remove("hidden");
        iconGear.classList.add("hidden");
        iconHome.classList.remove("hidden");
    } else {
        // Go back (Check if we should go to Main or Review based on fetch context is hard, 
        // simpler to just try fetch again or default to main)
        settingsView.classList.add("hidden");
        iconHome.classList.add("hidden");
        iconGear.classList.remove("hidden");
        fetchData(); // Will decide whether to show Main or Review
    }
  }
  settingsToggle.addEventListener("click", toggleView);

  // ... [Standard listeners for Save/Setup/Theme] ...
  
  // Setup Listeners
  function openSetupWizard() {
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

  setupBackBtn.addEventListener("click", () => { if(currentStep>1) { currentStep--; updateSetupUI(); }});
  
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

  setupNextBtn.addEventListener("click", async () => {
      setupError.textContent = "";
      setupNextBtn.disabled = true;

      if (currentStep === 2) {
          const key = setupApiKey.value.trim();
          if (!key) {
              setupError.textContent = "Please enter an API Key.";
              setupApiKey.classList.add("invalid");
              setupNextBtn.disabled = false;
              return;
          }
          setupApiKey.classList.remove("invalid");
          setupApiKey.classList.add("valid");
      }

      if (currentStep === 3) {
          const dbId = setupDbId.value.trim();
          const key = setupApiKey.value.trim() || apiKeyInput.value.trim();

          if (dbId.length < 20) {
              setupError.textContent = "Invalid ID format.";
              setupDbId.classList.add("invalid");
              setupNextBtn.disabled = false;
              return;
          }

          setupNextBtn.textContent = "Verifying...";
          try {
              const response = await browser.runtime.sendMessage({
                  action: "validateNotion",
                  data: { apiKey: key, dbId: dbId }
              });

              if (response.status === "success") {
                  await browser.storage.local.set({ notionApiKey: key, notionDatabaseId: dbId });
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
      if (apiKeyInput.value) setupApiKey.value = apiKeyInput.value;
      if (dbIdInput.value) setupDbId.value = dbIdInput.value;
      openSetupWizard();
  });

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
        if(data.detectedLanguage) document.getElementById("language-select").value = data.detectedLanguage;
    }
  });

  saveBtn.addEventListener("click", async () => {
      saveBtn.textContent = "Saving...";
      saveBtn.disabled = true;
      const payload = {
        difficulty: document.getElementById("selected-difficulty").value,
        language: document.getElementById("language-select").value,
        alternativeMethods: document.getElementById("alternative-methods").value,
        remarks: document.getElementById("remarks").value,
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

  // Settings Save Buttons
  saveKeyBtn.addEventListener("click", async () => {
      await browser.storage.local.set({ notionApiKey: apiKeyInput.value.trim() });
      document.getElementById("settings-status-message").textContent = "✅ Key Saved";
  });
  saveDbBtn.addEventListener("click", async () => {
      await browser.storage.local.set({ notionDatabaseId: dbIdInput.value.trim() });
      document.getElementById("settings-status-message").textContent = "✅ DB ID Saved";
  });
  
  // Dots
  document.querySelectorAll(".dot").forEach(dot => {
      dot.addEventListener("click", () => {
          document.querySelectorAll(".dot").forEach(d => d.classList.remove("selected"));
          dot.classList.add("selected");
          document.getElementById("selected-difficulty").value = dot.getAttribute("data-value");
      });
  });
});