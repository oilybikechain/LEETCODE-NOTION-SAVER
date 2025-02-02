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
      Done: message.data.correct ? "Yes" : "No",
      "Question link": problemData["QuestionLink"] || "",
      Tag: problemData.tags ? problemData.tags.join(", ") : "N/A",
      Level: problemData.difficulty || "Unknown",
      "My expertise": message.data.difficulty || "", 
      "Alternative methods": message.data.alternativeMethods || "",
      Remarks: message.data.remarks || "",
      "Solution link": problemData.Solution || "",
      "Worth reviewing?": message.data.worthReviewing ? "Yes" : "No",
      Date: new Date().toISOString().split('T')[0], // Ensure date is included
    };

    console.log("Formatted Data to Save:", formattedData);

    // Send data to Notion
    createNotionPage(formattedData)
      .then(response => {
        console.log('Notion page created:', response);
        sendResponse({ status: 'success' });
      })
      .catch(error => {
        console.error('Error creating Notion page:', error);
        sendResponse({ status: 'error', error: error.message });
      });

    return true; // Keep the message channel open for sendResponse
  }
});

// Function to create a Notion page
async function updateNotionDatabase(data, pageId) {
  const notionApiKey = 'your_notion_integration_key';

  const response = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${notionApiKey}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28',
    },
    body: JSON.stringify({
      properties: {
        'Difficulty': { select: { name: data.Level } },
        'Tags': { multi_select: data.Tag.split(", ").map(tag => ({ name: tag })) },
        'Alternative Methods': { rich_text: [{ text: { content: data["Alternative methods"] } }] },
        'Remarks': { rich_text: [{ text: { content: data.Remarks } }] },
        'Correct?': { checkbox: data.Done === "Yes" },
        'Worth Reviewing?': { checkbox: data["Worth reviewing?"] === "Yes" },
        'Date': { date: { start: data.Date } },
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error("Failed to update Notion database:", error);
    return { status: "error", error: error.message };
  }

  console.log("Successfully updated Notion table!");
  return { status: "success" };
}

updateNotionDatabase(problemData, pageId)
  .then(response => console.log(response))
  .catch(error => console.error(error));