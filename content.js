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
          title   // 🔹 Get problem name (title)
          difficulty // 🔹 Get difficulty (Easy, Medium, Hard)
          topicTags {
            name // 🔹 Get topic tags (e.g., "Array", "Hash Table")
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



//  // Open the description page in a new tab
//  const tab = await browser.tabs.create({ url: descriptionUrl, active: false });
//
//  // Wait for the tab to load
//  await new Promise((resolve) => {
//    browser.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
//      if (tabId === tab.id && changeInfo.status === 'complete') {
//        browser.tabs.onUpdated.removeListener(listener);
//        resolve();
//      }
//    });
//  });
//
//  // Execute a content script in the new tab to extract the description
//  const result = await browser.tabs.executeScript(tab.id, {
//    code: `const tagElements = doc.querySelectorAll('.no-underline.hover\\:text-current.relative.inline-flex.items-center.justify-center.text-caption.px-2.py-1.gap-1.rounded-full.bg-fill-secondary.text-text-secondary');`,
//  });
//  const tags = Array.from(tagElements).map(tag => tag.innerText);
//  console.log("tags: ", tags)
//  // Close the tab
//  await browser.tabs.remove(tab.id);
//
//  return tags; // Return the extracted description  
//}



//  try {
//    const response = await fetch(descriptionUrl, {
//      method: 'GET',
//      headers: {
//        'Content-Type': 'text/html',
//      },
//      mode: 'cors',  // Ensure it's a cross-origin request
//      credentials: 'include',
//      redirect: 'manual',  // Allow automatic redirects
//    });
//    if (response.type === 'opaqueredirect') {
//      throw new Error("Request was redirected. Authentication may be required.");
//    }
//
//
//    console.log("Reached description page")
//    if (!response.ok) {
//      throw new Error(`Failed to fetch description page: ${response.status}`);
//    }
//
//    const htmlText = await response.text();
//    const parser = new DOMParser();
//    const doc = parser.parseFromString(htmlText, 'text/html');
//    console.log("", doc)
//
//    // Extract the description content ***THING TO CHANGE
//    const tagElements = doc.querySelectorAll('.no-underline.hover\\:text-current.relative.inline-flex.items-center.justify-center.text-caption.px-2.py-1.gap-1.rounded-full.bg-fill-secondary.text-text-secondary');
//    const tags = Array.from(tagElements).map(tag => tag.innerText);
//    const descriptionElement = doc.querySelector('.content__u3I1'); // Adjust selector
//    const problemDescription = descriptionElement ? descriptionElement.innerText : 'Description not found'; //FIND OUT WHAT ?MEANS
//
//    console.log('Description:', problemDescription); // Log the description
//    console.log('Tags: ', tags)
//    return problemDescription;
//  } catch (error) {
//    console.error('Error fetching description page:', error);
//    return null;
//  }
//}

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