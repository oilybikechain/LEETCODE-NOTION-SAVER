// Extracts problem information from LeetCode's page
function extractProblemData() {
    // Extract the problem title
    const currentUrl = window.location.href;
    const problemTitle = currentUrl.split('/')[4]; // Extract "two-sum" from "/problems/two-sum/
  
    // Extract the problem tags (if available)
    const tagElements = document.querySelectorAll('.tag'); // Change selector if necessary
    const tags = Array.from(tagElements).map((tag) => tag.innerText);
  
    // Extract the user's written solution
    const userSolutionElement = document.querySelector('.user-code'); // Adjust selector based on LeetCode's structure
    const userSolution = userSolutionElement ? userSolutionElement.innerText : '';
  
    // Extract the provided solution (LeetCode's editorial or hints)
    const providedSolutionElement = document.querySelector('.editorial-solution'); // Adjust selector
    const providedSolution = providedSolutionElement ? providedSolutionElement.innerText : '';
  
    // Extract the date completed (if available on the page or use current date)
    const completionDate = new Date().toISOString(); // Format as ISO 8601 string
  
    return {
      title: problemTitle,
      tags,
      userSolution,
      providedSolution,
      completionDate,
      url: window.location.href,
    };
  }
  
  // Send the extracted data to the background script
  function sendProblemDataToBackground() {
    const problemData = extractProblemData();
  
    // Send data to the background script
    browser.runtime.sendMessage({
      action: 'problemData',
      data: problemData,
    }).then((response) => {
      console.log('Data sent successfully:', response);
    }).catch((error) => {
      console.error('Error sending data:', error);
    });
  }
  
  // Run the script when the page is fully loaded
  window.addEventListener('load', () => {
    sendProblemDataToBackground();
  });
  