let problemData = null;
console.log("Background script loaded!");

// Function to get stored Notion API key and database ID
async function getNotionCredentials() {
  const { notionApiKey, notionDatabaseId } = await browser.storage.local.get(["notionApiKey", "notionDatabaseId"]);
  if (!notionApiKey || !notionDatabaseId) {
    console.error("Notion API key or Database ID not found. Please set them in the extension settings.");
    return null;
  }
  return { notionApiKey, notionDatabaseId };
}

// Listen for messages from the content script
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Message received in background script:", message);

  if (message.action === "problemData") {
    console.log("Problem Data Received:", message.data);
    problemData = message.data; // Store problem data
    sendResponse({ status: "success" });
  }

  if (message.action === "saveToNotion") {
    console.log("Popup Data Received:", message.data);

    if (!problemData) {
      console.error("Error: No problem data available.");
      sendResponse({ status: "error", error: "No problem data available. Try refreshing the page." });
      return true;
    }

    // Format the data correctly
    const formattedData = {
      Done: message.data.correct ? true : false,
      "Question": problemData["Question"] || "Untitled", // FIXED: Correctly referencing problem title
      "QuestionLink": problemData["QuestionLink"] || "", // FIXED: Ensure consistency in naming
      "Tag": Array.isArray(problemData.tags) ? problemData.tags : [], // Ensure array format
      "Level": problemData.difficulty || "Unknown",
      "My expertise": message.data.difficulty || "", 
      "Alternative methods": message.data.alternativeMethods || "",
      "Remarks": message.data.remarks || "",
      "Solution link": problemData.Solution || "",
      "Worth reviewing?": message.data.worthReviewing ? true : false,
    };

    console.log("Formatted Data to Save:", formattedData);

    getNotionCredentials().then(credentials => {
      if (!credentials) {
        sendResponse({ status: "error", error: "Notion API credentials missing." });
        return;
      }

      const { notionApiKey, notionDatabaseId } = credentials;
      addEntryToNotionDatabase(formattedData, notionApiKey, notionDatabaseId)
        .then(response => sendResponse(response))
        .catch(error => sendResponse({ status: "error", error: error.message }));
    });

    return true; // Keep the message channel open for async response
  }
});

// Function to add an entry to the Notion database
async function addEntryToNotionDatabase(data, notionApiKey, databaseId) {
  const response = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${notionApiKey}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify({
      parent: {
        type: "database_id",
        database_id: databaseId
      },
      properties: {
        "Question": { title: [{ text: { content: data["Question"] } }] }, // FIXED: Correct key usage
        "Question Link": { url: data["QuestionLink"] }, // FIXED: Consistent key usage
        "Done": { checkbox: data.Done },
        "Tag": { multi_select: data.Tag.map(tag => ({ name: tag })) },
        "Level": { select: { name: data.Level } },
        "My Expertise": { select: { name: data["My expertise"] } },
        "Alternative Method": { multi_select: data["Alternative methods"].split(", ").map(method => ({ name: method })) },
        "Remarks": { rich_text: [{ text: { content: data.Remarks } }] },
        "My Solution Link": { url: data["Solution link"] },
        "Worth reviewing?": { checkbox: data["Worth reviewing?"] },
      },
    }),
  });
  console.log("Final Data Sent to Notion:", JSON.stringify(data, null, 2));

  if (!response.ok) {
    const error = await response.json();
    console.error("Failed to update Notion database:", error);
    return { status: "error", error: error.message };
  }

  console.log("✅ Successfully added entry to Notion database!");
  return { status: "success" };
}
