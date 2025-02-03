let problemData = null;
console.log("Background script loaded!");

// Listen for messages from the content script
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Message received in background script:", message);
  
  if (message.action === 'problemData') {
    console.log('Problem Data Received:', message.data);
    problemData = message.data; // Store problem data
    sendResponse({ status: 'success' });
  }

  if (message.action === 'saveToNotion') {
    console.log('Popup Data Received:', message.data);

    if (!problemData) {
      console.error("Error: No problem data available.");
      sendResponse({ status: 'error', error: "No problem data available. Try refreshing the page." });
      return true;
    }
    
    // Format the data correctly
    const formattedData = {
      Done: message.data.correct ? true : false,  // Checkbox requires boolean
      "Question": problemData["Question"] || "Untitled",
      "Question link": problemData["QuestionLink"] || "",
      "Tag": Array.isArray(problemData.tags) ? problemData.tags : [], // Ensure array format
      "Level": problemData.difficulty || "Unknown",
      "My expertise": message.data.difficulty || "", 
      "Alternative methods": message.data.alternativeMethods || "",
      "Remarks": message.data.remarks || "",
      "Solution link": problemData.Solution || "",
      "Worth reviewing?": message.data.worthReviewing ? true : false,  // Checkbox requires boolean
    };

    console.log("Formatted Data to Save:", formattedData);

    addEntryToNotionDatabase(formattedData)
     .then(response => console.log(response))
     .catch(error => console.error(error));
  }
});

async function addEntryToNotionDatabase(data) {
  const notionApiKey = ''; // Replace with your actual key
  const databaseId = ''; // Your database ID

  const response = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${notionApiKey}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },

    body: JSON.stringify({
      parent: {
        "type":"database_id",
        database_id: databaseId },
      properties: {
        "Question": { title: [{ text: { content: data["Question link"] } }] },
        "Done": { checkbox: data.Done === "Yes" },
        "Tag": { multi_select: data.Tag.map(tag => ({ name: tag })) },
        "Level": { select: { name: data.Level } },
        "My Expertise": { select: { name: data["My expertise"] } },
        "Alternative Method": { multi_select: data["Alternative methods"].split(", ").map(method => ({ name: method })) },
        "Remarks": { rich_text: [{ text: { content: data.Remarks } }] },
        "My Solution Link": { url: data["Solution link"] },
        "Worth reviewing?": { checkbox: data["Worth reviewing?"] === "Yes" },
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error("Failed to update Notion database:", error);
    return { status: "error", error: error.message };
  }

  console.log("✅ Successfully added entry to Notion database!");
  return { status: "success" };
}

