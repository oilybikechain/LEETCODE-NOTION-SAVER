console.log("Content script loaded!");

// ✅ Robust function to extract problem slug from any LeetCode URL
function getProblemSlug() {
  const match = window.location.pathname.match(/\/problems\/([^/]+)/);
  return match ? match[1] : null;
}

// Define an asynchronous function to fetch problem data from LeetCode
async function fetchSiteData() {
  const problemSlug = getProblemSlug();
  
  if (!problemSlug) {
    console.error("Could not extract problem slug from URL:", window.location.href);
    return null;
  }

  const descriptionUrl = `https://leetcode.com/problems/${problemSlug}/description/`;
  console.log("Target Problem:", problemSlug);

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
    variables: { titleSlug: problemSlug },
  };

  try {
    const response = await fetch("https://leetcode.com/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(graphqlQuery),
    });

    const data = await response.json();
    
    // Safety check if data exists
    if (!data.data || !data.data.question) {
        console.error("GraphQL returned no question data.");
        return null;
    }

    const problemTitle = data.data.question.title;
    const difficulty = data.data.question.difficulty;
    const tags = data.data.question.topicTags.map(tag => tag.name);

    // Detect Language (using the function from previous step)
    const detectedLanguage = typeof detectLanguage === 'function' ? detectLanguage() : null;

    return {
      QuestionLink: descriptionUrl,
      Question: problemTitle,
      difficulty: difficulty,
      tags: tags,
      Solution: window.location.href, // Use current actual URL for solution link
      detectedLanguage: detectedLanguage
    };

  } catch (error) {
    console.error("Error fetching problem data:", error);
    return null;
  }
}

async function sendProblemDataToBackground() {
  const problemData = await fetchSiteData();
  
  if (problemData) {
      browser.runtime.sendMessage({
        action: 'problemData',
        data: problemData,
      }).catch((error) => console.error('Error sending data:', error));
  }
}

// ✅ 1. Initial Run
window.addEventListener('load', sendProblemDataToBackground);

// ✅ 2. Handle SPA Navigation (Detects URL changes without reload)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    console.log("URL changed. Re-fetching data...");
    // slight delay to let LeetCode render
    setTimeout(sendProblemDataToBackground, 1000); 
  }
}).observe(document, {subtree: true, childList: true});

// ✅ 3. Listen for "Manual Fetch" command from Popup
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "manualFetch") {
        console.log("Manual fetch triggered by popup.");
        sendProblemDataToBackground().then(() => {
            sendResponse({status: "success"});
        });
        return true; // Keep channel open for async response
    }
});