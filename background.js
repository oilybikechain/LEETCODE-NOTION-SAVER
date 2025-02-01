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

    // Combine problem data and popup data
    const combinedData = {
      ...problemData,
      ...message.data,
      date: new Date().toISOString().split('T')[0], // Add current date
    };

    // Send data to Notion
    createNotionPage(combinedData)
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
async function createNotionPage(data) {
  const notionApiKey = 'your_notion_integration_key';
  const databaseId = 'your_notion_database_id';

  const response = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${notionApiKey}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28',
    },
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties: {
        'Title': { title: [{ text: { content: data.title } }] },
        'Description': { rich_text: [{ text: { content: data.description } }] },
        'Difficulty': { select: { name: data.difficulty } },
        'Tags': { multi_select: data.tags.map(tag => ({ name: tag })) },
        'Alternative Methods': { rich_text: [{ text: { content: data.alternativeMethods } }] },
        'Remarks': { rich_text: [{ text: { content: data.remarks } }] },
        'Correct?': { checkbox: data.correct },
        'Worth Reviewing?': { checkbox: data.worthReviewing },
        'URL': { url: data.url },
        'Date': { date: { start: data.date } },
      },
    }),
  });

  return response.json();
}