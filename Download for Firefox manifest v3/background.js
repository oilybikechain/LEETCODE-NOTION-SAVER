let problemData = null;

// Function to get stored Notion API key and database ID from the ACTIVE profile
async function getNotionCredentials() {
  const { notionProfiles, activeProfileId } = await browser.storage.local.get(["notionProfiles", "activeProfileId"]);
  
  if (!notionProfiles || !activeProfileId || !notionProfiles[activeProfileId]) {
    console.error("No active profile found.");
    return null;
  }

  const profile = notionProfiles[activeProfileId];
  
  if (!profile.apiKey || !profile.databaseId) {
    console.error("API Key or Database ID missing in active profile.");
    return null;
  }
  
  return { notionApiKey: profile.apiKey, notionDatabaseId: profile.databaseId };
}

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "problemData") {
    problemData = message.data; 
    // Forward detect language to popup if it's open
    if (problemData.detectedLanguage) {
        browser.runtime.sendMessage({ action: "problemData", data: problemData }).catch(() => {});
    }
    sendResponse({ status: "success" });
  }

  if (message.action === "saveToNotion") {
    if (!problemData) {
      const errorMsg = "No problem data available. Try refreshing the page.";
      sendResponse({ status: "error", error: errorMsg });
      return true;
    }

    const formattedData = {
      Done: message.data.correct ? true : false,
      "Question": problemData["Question"] || "Untitled",
      "QuestionLink": problemData["QuestionLink"] || "",
      "Tag": Array.isArray(problemData.tags) ? problemData.tags : [],
      "Level": problemData.difficulty || "Unknown",
      "My expertise": message.data.difficulty || "",
      "Language": message.data.language || "Unknown", // Added Language
      "Alternative methods": message.data.alternativeMethods || "",
      "Remarks": message.data.remarks || "",
      "Solution link": problemData.Solution || "",
      "Worth reviewing?": message.data.worthReviewing ? true : false,
    };

    getNotionCredentials().then(credentials => {
      if (!credentials) {
        const errorMsg = "Active profile missing API credentials.";
        sendResponse({ status: "error", error: errorMsg });
        browser.runtime.sendMessage({ action: "notionResponse", response: { status: "error", error: errorMsg } });
        return;
      }

      const { notionApiKey, notionDatabaseId } = credentials;
      addEntryToNotionDatabase(formattedData, notionApiKey, notionDatabaseId)
        .then(response => {
          browser.runtime.sendMessage({ action: "notionResponse", response });
          sendResponse(response);
        })
        .catch(error => {
          const errorResponse = { status: "error", error: error.message };
          browser.runtime.sendMessage({ action: "notionResponse", response: errorResponse });
          sendResponse(errorResponse);
        });
    });

    return true; 
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
          parent: { type: "database_id", database_id: databaseId },
          properties: {
            "Question": { title: [{ text: { content: data["Question"] } }] },
            "Question Link": { url: data["QuestionLink"] },
            "Done": { checkbox: data.Done },
            "Tag": { multi_select: data.Tag.map(tag => ({ name: tag })) },
            "Level": { select: { name: data.Level } },
            "My Expertise": { select: { name: data["My expertise"] } },
            "Language": { select: { name: data["Language"] } }, // Mapped to Notion Select
            "Alternative Method": { multi_select: data["Alternative methods"] ? data["Alternative methods"].split(", ").map(method => ({ name: method })) : [] },
            "Remarks": { rich_text: [{ text: { content: data.Remarks } }] },
            "My Solution Link": { url: data["Solution link"] },
            "Worth reviewing?": { checkbox: data["Worth reviewing?"] },
          },
        }),
      });

      if (response.status === 401) { throw new Error("Authentication failed: Invalid API token."); } 
      if (response.status === 403) { throw new Error("Access denied: Check permissions."); } 
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get("Retry-After") || "1", 10);
        await delay(retryAfter * 1000);
        attempt++;
        continue;
      } 
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Notion API Error: ${response.status} - ${error.message}`);
      }

      return { status: "success" };

    } catch (error) {
      console.error(error);
      if (attempt === maxAttempts - 1) return { status: "error", error: error.message };
      attempt++;
    }
  }
}

function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }