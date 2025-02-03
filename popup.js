document.addEventListener("DOMContentLoaded", () => {
  const difficultyBoxes = document.querySelectorAll(".difficulty-box");
  const selectedDifficulty = document.getElementById("selected-difficulty");
  const tabButtons = document.querySelectorAll(".tab-button");
  const tabContents = document.querySelectorAll(".tab-content");

  // Tab Switching Logic
  tabButtons.forEach(button => {
    button.addEventListener("click", () => {
      const tabName = button.getAttribute("data-tab");

      // Hide all tab contents
      tabContents.forEach(content => content.classList.remove("active"));

      // Show the selected tab content
      document.getElementById(tabName).classList.add("active");

      // Highlight the active tab button
      tabButtons.forEach(btn => btn.classList.remove("active"));
      button.classList.add("active");
    });
  });

  // Difficulty Selection Logic
  difficultyBoxes.forEach(box => {
    box.addEventListener("click", () => {
      // Remove "selected" class from all boxes
      difficultyBoxes.forEach(b => b.classList.remove("selected"));

      // Add "selected" class to the clicked box
      box.classList.add("selected");

      // Store selected value
      selectedDifficulty.value = box.getAttribute("data-value");
    });
  });

  // Save Problem Button Logic
  document.getElementById("save-btn").addEventListener("click", async () => {
    const data = {
      difficulty: selectedDifficulty.value,
      alternativeMethods: document.getElementById("alternative-methods").value,
      remarks: document.getElementById("remarks").value,
      correct: document.getElementById("correct").checked,
      worthReviewing: document.getElementById("worth-reviewing").checked,
    };

    try {
      const response = await browser.runtime.sendMessage({
        action: "saveToNotion",
        data: data,
      });
      console.log("Response from background script:", response);
      alert("Problem saved to Notion successfully!");
    } catch (error) {
      console.error("Error sending data to background script:", error);
      alert("Failed to save problem to Notion.");
    }
  });

  // Save Settings Button Logic
  document.getElementById("save-settings-btn").addEventListener("click", async () => {
    const notionApiKey = document.getElementById("notion-api-key").value;
    const notionDatabaseId = document.getElementById("notion-database-id").value;

    try {
      await browser.storage.local.set({ notionApiKey, notionDatabaseId });
      alert("Settings saved successfully!");
      displaySavedSettings();
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings.");
    }
  });

  // Display Saved Settings
  async function displaySavedSettings() {
    const { notionApiKey, notionDatabaseId } = await browser.storage.local.get(["notionApiKey", "notionDatabaseId"]);
    document.getElementById("display-api-key").textContent = notionApiKey || "Not set";
    document.getElementById("display-database-id").textContent = notionDatabaseId || "Not set";
  }

  // Load Saved Settings on Page Load
  displaySavedSettings();
});