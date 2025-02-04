let problemData = null;
console.log("Background script loaded!");

async function getNotionCredentials() {
  const { notionApiKey, notionDatabaseId } = await chrome.storage.local.get(["notionApiKey", "notionDatabaseId"]); // Use chrome.storage
  if (!notionApiKey || !notionDatabaseId) {
    console.error("Notion API key or Database ID not found. Please set them in the extension settings.");
    return null;
  }
  return { notionApiKey, notionDatabaseId };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => { // Use chrome.runtime
  console.log("Message received in background script:", message);

  if (message.action === "problemData") {
    console.log("Problem Data Received:", message.data);
    problemData = message.data;
    sendResponse({ status: "success" });
  }

  if (message.action === "saveToNotion") {
    console.log("Popup Data Received:", message.data);

    if (!problemData) {
      const errorMsg = "No problem data available. Try refreshing the page.";
      console.error(errorMsg);
      sendResponse({ status: "error", error: errorMsg });
      chrome.runtime.sendMessage({ action: "notionResponse", response: { status: "error", error: errorMsg } }); // Use chrome.runtime
      return true;
    }

    const formattedData = {
      Done: message.data.correct ? true : false,
      "Question": problemData["Question"] || "Untitled",
      "QuestionLink": problemData["QuestionLink"] || "",
      "Tag": Array.isArray(problemData.tags) ? problemData.tags : [],
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
        const errorMsg = "Notion API credentials missing.";
        sendResponse({ status: "error", error: errorMsg });
        chrome.runtime.sendMessage({ action: "notionResponse", response: { status: "error", error: errorMsg } }); // Use chrome.runtime
        return;
      }

      const { notionApiKey, notionDatabaseId } = credentials;
      addEntryToNotionDatabase(formattedData, notionApiKey, notionDatabaseId)
        .then(response => {
          chrome.runtime.sendMessage({ action: "notionResponse", response }); // Use chrome.runtime
          sendResponse(response);
        })
        .catch(error => {
          const errorResponse = { status: "error", error: error.message };
          chrome.runtime.sendMessage({ action: "notionResponse", response: errorResponse }); // Use chrome.runtime
          sendResponse(errorResponse);
        });
    });

    return true; // Keep the message channel open for async response
  }
});

async function addEntryToNotionDatabase(data, notionApiKey, databaseId) {
  const url = "https://api.notion.com/v1/pages";
  let attempt = 0;
  const maxAttempts = 3;

  while (attempt < maxAttempts) {
    try {
      const response = await fetch(url, {
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
            "Question": { title: [{ text: { content: data["Question"] } }] },
            "Question Link": { url: data["QuestionLink"] },
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

      if (response.status === 401) {
        const errorMsg = "Authentication failed: Invalid API token.";
        console.error(errorMsg);
        notifyUser(errorMsg);
        return { status: "error", error: errorMsg };
      } 
      if (response.status === 403) {
        const errorMsg = "Access denied: Ensure your Notion integration has the right permissions.";
        console.error(errorMsg);
        notifyUser(errorMsg);
        return { status: "error", error: errorMsg };
      } 
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get("Retry-After") || "1", 10);
        console.warn(`Rate limited. Retrying in ${retryAfter} seconds...`);
        await delay(retryAfter * 1000);
        attempt++;
        continue;
      } 
      if (!response.ok) {
        const error = await response.json();
        const errorMsg = `Notion API Error: ${response.status} - ${error.message}`;
        console.error(errorMsg);
        notifyUser(errorMsg);
        return { status: "error", error: errorMsg };
      }

      console.log("Entry successfully added to Notion.");
      return { status: "success" };

    } catch (error) {
      console.error("Failed to send request to Notion:", error);
      notifyUser("Network error occurred while sending data to Notion.");
      return { status: "error", error: error.message };
    }
  }

  const errorMsg = "Max retry attempts reached.";
  console.error(errorMsg);
  return { status: "error", error: errorMsg };
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function notifyUser(message) {
  if (typeof chrome !== "undefined" && chrome.notifications) { // Use chrome.notifications
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icon.png",
      title: "Notion Extension",
      message: message,
    });
  } else {
    console.log("Notification:", message);
  }
}