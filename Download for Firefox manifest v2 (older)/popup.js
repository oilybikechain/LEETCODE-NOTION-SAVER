document.addEventListener("DOMContentLoaded", () => {
  const difficultyBoxes = document.querySelectorAll(".difficulty-box");
  const selectedDifficulty = document.getElementById("selected-difficulty");
  const tabButtons = document.querySelectorAll(".tab-button");
  const tabContents = document.querySelectorAll(".tab-content");
  const statusMessage = document.getElementById("status-message");
  const settingsStatusMessage = document.getElementById("settings-status-message"); // ✅ Added this line

  // Tab Switching Logic
  tabButtons.forEach(button => {
    button.addEventListener("click", () => {
      const tabName = button.getAttribute("data-tab");

      tabContents.forEach(content => content.classList.remove("active"));
      document.getElementById(tabName).classList.add("active");

      tabButtons.forEach(btn => btn.classList.remove("active"));
      button.classList.add("active");
    });
  });

  // Difficulty Selection Logic
  difficultyBoxes.forEach(box => {
    box.addEventListener("click", () => {
      difficultyBoxes.forEach(b => b.classList.remove("selected"));
      box.classList.add("selected");
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

      if (response.status === "success") {
        statusMessage.textContent = "✅ Successfully saved to Notion!";
        statusMessage.className = "status-message success";
      } else {
        statusMessage.textContent = `❌ Error: ${response.error}`;
        statusMessage.className = "status-message error";
      }
    } catch (error) {
      console.error("Error sending data to background script:", error);
      statusMessage.textContent = "❌ Failed to save problem to Notion.";
      statusMessage.className = "status-message error";
    }
  });

  // Listen for background script responses
  browser.runtime.onMessage.addListener((message) => {
    if (message.action === "notionResponse") {
      if (message.response.status === "success") {
        statusMessage.textContent = "✅ Successfully saved to Notion!";
        statusMessage.className = "status-message success";
      } else {
        statusMessage.textContent = `❌ Error: ${message.response.error}`;
        statusMessage.className = "status-message error";
      }
    }
  });

   // Save Settings Button Logic
   document.getElementById("save-settings-btn").addEventListener("click", async () => {
    const notionApiKey = document.getElementById("notion-api-key").value.trim();
    const notionDatabaseId = document.getElementById("notion-database-id").value.trim();

    try {
      // Retrieve existing settings
      const { notionApiKey: existingApiKey, notionDatabaseId: existingDatabaseId } = await browser.storage.local.get(["notionApiKey", "notionDatabaseId"]);

      // Only update if the new value is not empty
      const updatedApiKey = notionApiKey || existingApiKey;
      const updatedDatabaseId = notionDatabaseId || existingDatabaseId;

      // Save the updated settings
      await browser.storage.local.set({
        notionApiKey: updatedApiKey,
        notionDatabaseId: updatedDatabaseId,
      });

      // Update the settings status message
      settingsStatusMessage.textContent = "✅ Settings saved successfully!";
      settingsStatusMessage.className = "status-message success";

      // Display the updated settings
      displaySavedSettings();
    } catch (error) {
      console.error("Error saving settings:", error);
      settingsStatusMessage.textContent = "❌ Failed to save settings.";
      settingsStatusMessage.className = "status-message error";
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
