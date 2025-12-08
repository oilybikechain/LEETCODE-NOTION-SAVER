let problemData = null;

async function getNotionCredentials() {
  const { notionApiKey, notionDatabaseId } = await browser.storage.local.get(["notionApiKey", "notionDatabaseId"]);
  
  if (!notionApiKey || !notionDatabaseId) {
    return null;
  }
  return { notionApiKey, notionDatabaseId };
}

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 1. DATA RECEIVER
  if (message.action === "problemData") {
    problemData = message.data;
    sendResponse({ status: "success" });
  }

  // 2. FETCH DASHBOARD (Unsolved + Review)
  if (message.action === "fetchReviewList") {
    const mode = message.mode || "recent"; 

    getNotionCredentials().then(creds => {
        if (!creds) { 
            sendResponse({ status: "error", error: "Missing Credentials" }); 
            return; 
        }
        
        fetchDashboardData(creds, mode)
            .then(data => sendResponse({ status: "success", data: data }))
            .catch(err => sendResponse({ status: "error", error: err.message }));
    });
    return true; 
  }

  // 3. SAVE TO NOTION
  if (message.action === "saveToNotion") {
    if (!problemData) { 
      sendResponse({ status: "error", error: "No data available. Refresh page." }); 
      return true; 
    }
    
    getNotionCredentials().then(creds => {
        if(!creds) { 
            sendResponse({status:"error", error:"Missing Credentials"}); 
            return; 
        }
        
        // Defaults are handled in popup.js, but we provide fallbacks here just in case
        const formattedData = {
           Done: message.data.correct,
           "Question": problemData["Question"],
           "QuestionLink": problemData["QuestionLink"],
           "Tag": problemData.tags || [],
           "Level": problemData.difficulty,
           "My expertise": message.data.difficulty || problemData.difficulty, 
           "Language": message.data.language || "Python",
           "Alternative methods": message.data.alternativeMethods || "None",
           "Remarks": message.data.remarks || "None",
           "Solution link": problemData.Solution || "",
           "Worth reviewing?": message.data.worthReviewing || false,
           CodeContent: message.data.code || problemData.code || ""
        };

        addEntryToNotionDatabase(formattedData, creds.notionApiKey, creds.notionDatabaseId)
           .then(res => sendResponse(res))
           .catch(err => sendResponse({status:"error", error: err.message}));
    });
    return true;
  }

  // 4. VALIDATE CREDENTIALS
  if (message.action === "validateNotion") {
      const { apiKey, dbId } = message.data;
      fetch(`https://api.notion.com/v1/databases/${dbId}`, {
          method: "GET",
          headers: {
              "Authorization": `Bearer ${apiKey}`,
              "Notion-Version": "2022-06-28"
          }
      })
      .then(async response => {
          if (response.ok) {
              sendResponse({ status: "success" });
          } else {
              const err = await response.json();
              sendResponse({ status: "error", error: err.message || "Invalid Credentials" });
          }
      })
      .catch(error => {
          sendResponse({ status: "error", error: "Network Error" });
      });
      return true; 
  }
});

// ============================================
// LOGIC: FETCH DASHBOARD DATA
// ============================================

async function fetchDashboardData({ notionApiKey, notionDatabaseId }, mode) {
    let hasMore = true;
    let startCursor = undefined;
    let allResults = [];
    
    // "Recent" = 1 page (100 items), "All" = up to 20 pages
    let requestsMade = 0;
    const maxRequests = (mode === "recent") ? 1 : 20; 

    while (hasMore && requestsMade < maxRequests) {
        const response = await fetch(`https://api.notion.com/v1/databases/${notionDatabaseId}/query`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${notionApiKey}`,
                "Notion-Version": "2022-06-28",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                sorts: [{ timestamp: "created_time", direction: "descending" }], 
                page_size: 100,
                start_cursor: startCursor
            })
        });

        const data = await response.json();
        if(!response.ok) throw new Error(data.message || "Failed to fetch from Notion");

        allResults = allResults.concat(data.results);
        
        hasMore = data.has_more;
        startCursor = data.next_cursor;
        requestsMade++;
    }

    // Deduplication & Categorization
    const uniqueProblems = new Set();
    const unsolvedList = [];
    const reviewList = [];

    for(const page of allResults) {
        const titleProp = page.properties["Question"];
        const title = titleProp?.title?.[0]?.plain_text;
        
        if(!title) continue;

        // Skip if already processed (Latest entry wins)
        if(uniqueProblems.has(title)) continue;
        uniqueProblems.add(title);
        
        const isDone = page.properties["Done"]?.checkbox === true;
        const isWorthReviewing = page.properties["Worth reviewing?"]?.checkbox === true;

        const item = {
            title: title,
            url: page.properties["Question Link"]?.url || "",
            difficulty: page.properties["Level"]?.select?.name || "Unknown",
            lastPracticed: page.created_time
        };

        if (!isDone) {
            unsolvedList.push(item);
        } else if (isWorthReviewing) {
            reviewList.push(item);
        }
    }
    
    return { unsolved: unsolvedList, review: reviewList };
}

// ============================================
// LOGIC: ADD ENTRY (No Code Block)
// ============================================

async function addEntryToNotionDatabase(data, notionApiKey, databaseId) {
  const url = "https://api.notion.com/v1/pages";
  
  try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${notionApiKey}`,
          "Content-Type": "application/json",
          "Notion-Version": "2022-06-28",
        },
        body: JSON.stringify({
          parent: { database_id: databaseId },
          properties: {
            "Question": { title: [{ text: { content: data["Question"] } }] },
            "Question Link": { url: data["QuestionLink"] },
            "Done": { checkbox: data.Done },
            "Tag": { multi_select: data.Tag.map(tag => ({ name: tag })) },
            "Level": { select: { name: data.Level } },
            "My Expertise": { select: { name: data["My expertise"] } },
            "Language": { select: { name: data.Language } },
            "Alternative Method": { multi_select: data["Alternative methods"] ? data["Alternative methods"].split(",").map(s => ({ name: s.trim() })).filter(x => x.name) : [] },
            "Remarks": { rich_text: [{ text: { content: data.Remarks } }] },
            "My Solution Link": { url: data["Solution link"] },
            "Worth reviewing?": { checkbox: data["Worth reviewing?"] },
          }
        }),
      });

      if (!response.ok) {
          const err = await response.json();
          throw new Error(err.message);
      }
      return { status: "success" };

  } catch (error) {
      throw error;
  }
}