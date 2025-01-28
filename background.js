browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'problemData') {
      console.log('Problem Data Received:', message.data);
      // Further processing, e.g., send to Notion
      sendResponse({ status: 'success' });
    }
  });
  