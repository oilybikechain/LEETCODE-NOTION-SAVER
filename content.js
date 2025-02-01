console.log("Content script loaded!");

window.addEventListener('load', () => {
  console.log("Page is fully loaded!");
});

async function fetchDescriptionData() {
  const currentUrl = window.location.href;
  const problemSlug = currentUrl.split('/')[4]; // Extract "two-sum" from "/problems/two-sum/"

  const descriptionUrl = `https://leetcode.com/problems/${problemSlug}/description/`;

  try {
    const response = await fetch(descriptionUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'text/html',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch description page: ${response.status}`);
    }

    const htmlText = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');

    // Extract the description content ***THING TO CHANGE
    const tagElements = document.querySelectorAll('.no-underline.hover\\:text-current.relative.inline-flex.items-center.justify-center.text-caption.px-2.py-1.gap-1.rounded-full.bg-fill-secondary.text-text-secondary');
    const tags = Array.from(tagElements).map(tag => tag.innerText);
    const descriptionElement = doc.querySelector('.content__u3I1'); // Adjust selector
    const problemDescription = descriptionElement ? descriptionElement.innerText : 'Description not found'; //FIND OUT WHAT ?MEANS

    console.log('Description:', problemDescription); // Log the description
    console.log('Tags: ', tags)
    return problemDescription;
  } catch (error) {
    console.error('Error fetching description page:', error);
    return null;
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