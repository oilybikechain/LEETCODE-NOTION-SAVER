let problemData = null;

async function getNotionCredentials() {
  const { notionApiKey, notionDatabaseId } = await browser.storage.local.get(["notionApiKey", "notionDatabaseId"]);
  if (!notionApiKey || !notionDatabaseId) return null;
  return { notionApiKey, notionDatabaseId };
}

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 1. DATA RECEIVER
  if (message.action === "problemData") {
    problemData = message.data;
    sendResponse({ status: "success" });
  }

  // 2. FETCH REVIEW LIST (Updated)
  if (message.action === "fetchReviewList") {
    const mode = message.mode || "recent"; // 'recent' or 'all'

    getNotionCredentials().then(creds => {
        if (!creds) { 
            sendResponse({ status: "error", error: "Missing Credentials" }); 
            return; 
        }
        
        fetchReviewCandidates(creds, mode)
            .then(list => sendResponse({ status: "success", data: list }))
            .catch(err => sendResponse({ status: "error", error: err.message }));
    });
    return true; 
  }

  // 3. SAVE TO NOTION
  if (message.action === "saveToNotion") {
    if (!problemData) { sendResponse({ status: "error", error: "No data" }); return true; }
    
    getNotionCredentials().then(creds => {
        if(!creds) { sendResponse({status:"error", error:"Missing Credentials"}); return; }
        
        const formattedData = {
           Done: message.data.correct,
           "Question": problemData["Question"],
           "QuestionLink": problemData["QuestionLink"],
           "Tag": problemData.tags || [],
           "Level": problemData.difficulty,
           "My expertise": message.data.difficulty || problemData.difficulty,
           "Language": message.data.language || "plain text",
           "Alternative methods": message.data.alternativeMethods || "",
           "Remarks": message.data.remarks || "",
           "Solution link": problemData.Solution || "",
           "Worth reviewing?": message.data.worthReviewing || false,
           CodeContent: problemData.code || ""
        };

        addEntryToNotionDatabase(formattedData, creds.notionApiKey, creds.notionDatabaseId)
           .then(res => sendResponse(res))
           .catch(err => sendResponse({status:"error", error: err.message}));
    });
    return true;
  }

  // 4. VALIDATE
  if (message.action === "validateNotion") {
      const { apiKey, dbId } = message.data;
      fetch(`https://api.notion.com/v1/databases/${dbId}`, {
          method: "GET",
          headers: { "Authorization": `Bearer ${apiKey}`, "Notion-Version": "2022-06-28" }
      }).then(async response => {
          if (response.ok) sendResponse({ status: "success" });
          else {
              const err = await response.json();
              sendResponse({ status: "error", error: err.message || "Invalid Credentials" });
          }
      }).catch(() => sendResponse({ status: "error", error: "Network Error" }));
      return true; 
  }
});

// ============================================
// LOGIC: FETCH & DEDUPLICATE REVIEWS
// ============================================

async function fetchReviewCandidates({ notionApiKey, notionDatabaseId }, mode) {
    let hasMore = true;
    let startCursor = undefined;
    let allResults = [];
    
    // Safety break for "All" mode to prevent infinite loops (cap at 10 requests / 1000 items)
    let requestsMade = 0;
    const maxRequests = (mode === "recent") ? 1 : 10; 

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

    // Deduplication Logic (Latest Entry Wins)
    const uniqueProblems = new Set();
    const reviewList = [];

    // Since we sorted by DESCENDING time, the first time we see a Problem Title, 
    // it IS the latest entry.
    for(const page of allResults) {
        const titleProp = page.properties["Question"];
        const title = titleProp?.title?.[0]?.plain_text;
        
        if(!title) continue;

        // If we've already seen this problem, this current 'page' is an OLDER entry.
        // We skip it because the newer entry (already processed) dictates the current status.
        if(uniqueProblems.has(title)) continue;
        
        uniqueProblems.add(title);
        
        const isWorthReviewing = page.properties["Worth reviewing?"]?.checkbox === true;

        // If the LATEST entry says "Worth Reviewing", add it to the list.
        if(isWorthReviewing) {
            reviewList.push({
                title: title,
                url: page.properties["Question Link"]?.url || "",
                difficulty: page.properties["Level"]?.select?.name || "Unknown",
                lastPracticed: page.created_time
            });
        }
    }
    return reviewList;
}

// ... [addEntryToNotionDatabase remains unchanged] ...
async function addEntryToNotionDatabase(data, notionApiKey, databaseId) {
  const url = "https://api.notion.com/v1/pages";
  
  const childrenBlocks = [];
  if (data.CodeContent) {
      let notionLang = data.Language.toLowerCase().replace("++", "pp").replace("#", "sharp");
      const validLangs = ["javascript", "java", "python", "cpp", "csharp", "go", "ruby", "scala", "swift", "typescript", "sql", "html", "css", "plain text", "dart", "kotlin", "php"];
      if (!validLangs.includes(notionLang)) {
          if (notionLang === "c++") notionLang = "cpp";
          else if (notionLang === "python3") notionLang = "python";
          else notionLang = "plain text";
      }
      childrenBlocks.push({
          object: "block",
          type: "code",
          code: {
              language: notionLang,
              rich_text: [{ text: { content: data.CodeContent.substring(0, 2000) } }] 
          }
      });
  }

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
          },
          children: childrenBlocks 
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