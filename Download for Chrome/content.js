console.log("Content script loaded!");

window.addEventListener('load', () => {
  console.log("Page is fully loaded!");
});

async function fetchSiteData() {
  const currentUrl = window.location.href;
  const problemSlug = currentUrl.split('/')[4];
  const descriptionUrl = `https://leetcode.com/problems/${problemSlug}/description/`;
  console.log("Description Page URL:", descriptionUrl);

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
      titleSlug: problemSlug,
    },
  };

  try {
    const response = await fetch("https://leetcode.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(graphqlQuery),
    });

    const data = await response.json();
    console.log("Fetched Data:", data);

    const problemTitle = data.data.question.title;
    const difficulty = data.data.question.difficulty;
    const tags = data.data.question.topicTags.map(tag => tag.name);

    console.log("Problem Title:", problemTitle);
    console.log("Difficulty:", difficulty);
    console.log("Tags:", tags);

    return {
      QuestionLink: descriptionUrl,
      Question: problemTitle,
      difficulty: difficulty,
      tags: tags,
      Solution: currentUrl,
    };

  } catch (error) {
    console.error("Error fetching problem data:", error);
    return null;
  }
}

async function sendProblemDataToBackground() {
  const problemData = await fetchSiteData();

  chrome.runtime.sendMessage({ // Use chrome.runtime
    action: 'problemData',
    data: problemData,
  }).then((response) => {
    console.log('Data sent successfully:', response);
  }).catch((error) => {
    console.error('Error sending data:', error);
  });
}

window.addEventListener('load', () => {
  sendProblemDataToBackground();
});