console.log("Content script loaded!");

window.addEventListener('load', () => {
  console.log("Page is fully loaded!");
});

// Define an asynchronous function to fetch problem data from LeetCode
async function fetchDescriptionData() {
  // 🔹 Get the current page URL
  const currentUrl = window.location.href;

  // 🔹 Extract the problem "slug" (e.g., "two-sum") from the URL
  // Example: "https://leetcode.com/problems/two-sum/" → Extract "two-sum"
  const problemSlug = currentUrl.split('/')[4]; 

  // 🔹 Construct the description page URL (for debugging/logging purposes)
  const descriptionUrl = `https://leetcode.com/problems/${problemSlug}/description/`;
  console.log("Description Page URL:", descriptionUrl);

  // 🔹 Define the GraphQL query to request problem data
  const graphqlQuery = {
    query: `
      query questionData($titleSlug: String!) {
        question(titleSlug: $titleSlug) {
          title   
          difficulty 
          topicTags {
            name 
          }
        }
      }
    `,
    variables: {
      titleSlug: problemSlug, // Use extracted problem slug dynamically
    },
  };

  try {
    // 🔹 Send a POST request to LeetCode's GraphQL API
    const response = await fetch("https://leetcode.com/graphql", {
      method: "POST", // Sending data to the API
      headers: {
        "Content-Type": "application/json", // JSON request format
      },
      body: JSON.stringify(graphqlQuery), // Convert query to JSON
    });

    // 🔹 Convert the response to JSON format
    const data = await response.json();
    console.log("Fetched Data:", data);

    // 🔹 Extract the relevant problem details from API response
    const problemTitle = data.data.question.title; // Get problem name
    const difficulty = data.data.question.difficulty; // Get difficulty level
    const tags = data.data.question.topicTags.map(tag => tag.name); // Extract topic tags

    // 🔹 Log extracted data
    console.log("Problem Title:", problemTitle);
    console.log("Difficulty:", difficulty);
    console.log("Tags:", tags);

    // 🔹 Return the extracted problem data as an object
    return {
      title: problemTitle,
      difficulty: difficulty,
      tags: tags,
    };

  } catch (error) {
    // 🔹 Handle errors if the request fails
    console.error("Error fetching problem data:", error);
    return null; // Return null if an error occurs
  }
}

// Extract problem data from the current page
async function extractProblemDataWithDescription() {
  const description = await fetchDescriptionData();

  // Extract title, difficulty, and tags
  const titleElement = document.querySelector('[data-cy="question-title"]');
  const difficultyElement = document.querySelector('[data-cy="question-detail-main-tabs"]');


  const problemTitle = titleElement ? titleElement.innerText : '';
  const difficulty = difficultyElement ? difficultyElement.innerText : '';
 

  console.log('Title:', problemTitle); // Log the title
  console.log('Difficulty:', difficulty); // Log the difficulty
  console.log('Tags:', tags); // Log the tags

  return {
    title: problemTitle,
    description,
    difficulty,
    tags,
    url: window.location.href,
  };
}

// Send the extracted data to the background script
async function sendProblemDataToBackground() {
  const problemData = await extractProblemDataWithDescription();

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