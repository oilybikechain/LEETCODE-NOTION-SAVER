async function fetchDescriptionData() {
    // Get the current problem's slug from the URL
    const currentUrl = window.location.href;
    const problemSlug = currentUrl.split('/')[4]; // Extract "two-sum" from "/problems/two-sum/"
  
    // Construct the description page URL
    const descriptionUrl = `https://leetcode.com/problems/${problemSlug}/description/`;
  
    try {
      // Fetch the HTML content of the description page
      const response = await fetch(descriptionUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'text/html',
        },
        credentials: 'include', // Include cookies for authenticated requests
      });
  
      if (!response.ok) {
        throw new Error(`Failed to fetch description page: ${response.status}`);
      }
  
      const htmlText = await response.text();
  
      // Parse the HTML using a DOMParser
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, 'text/html');
  
      // Extract the description content (adjust selector as needed)
      const descriptionElement = doc.querySelectorAll('.no-underline hover:text-current relative inline-flex items-center justify-center text-caption px-2 py-1 gap-1 rounded-full bg-fill-secondary text-text-secondary'); // Adjust selector
      const problemDescription = descriptionElement ? descriptionElement.innerText : 'Description not found';
  
      // Return the extracted data
      return problemDescription;
    } catch (error) {
      console.error('Error fetching description page:', error);
      return null;
    }
  }
  
  // Integrate the fetchDescriptionData function
  async function extractProblemDataWithDescription() {
    // Fetch description data
    const description = await fetchDescriptionData();
  
    // Extract other data from the current page
    const titleElement = document.querySelector('.css-v3d350');
    const problemTitle = titleElement ? titleElement.innerText : '';
  
    return {
      title: problemTitle,
      description, // Include the fetched description
      url: window.location.href,
    };
  }
  
  // Send the extracted data
  async function sendProblemDataToBackground() {
    const problemData = await extractProblemDataWithDescription();
  
    // Send a message to the background script
    browser.runtime.sendMessage({
      action: 'problemData',
      data: problemData,
    }).then((response) => {
      console.log('Data sent successfully:', response);
    }).catch((error) => {
      console.error('Error sending data:', error);
    });
  }
  
  // Run the script on page load
  window.addEventListener('load', () => {
    sendProblemDataToBackground();
  });
  