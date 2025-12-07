let problemData = null;

// Function to get stored Notion API key and database ID directly
async function getNotionCredentials() {
  const { notionApiKey, notionDatabaseId } = await browser.storage.local.get(["notionApiKey", "notionDatabaseId"]);
  
  if (!notionApiKey || !notionDatabaseId) {
    console.error("Notion Credentials missing.");
    return null;
  }
  return { notionApiKey, notionDatabaseId };
}

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "problemData") {
    problemData = message.data;
    sendResponse({ status: "success" });
  }

  if (message.action === "saveToNotion") {
    if (!problemData) {
      sendResponse({ status: "error", error: "No problem data." });
      return true;
    }

    const finalCode = problemData.code || ""; 
    const language = message.data.language || problemData.detectedLanguage || "plain text";

    const formattedData = {
      Done: message.data.correct,
      "Question": problemData["Question"],
      "QuestionLink": problemData["QuestionLink"],
      "Tag": problemData.tags || [],
      "Level": problemData.difficulty,
      "My expertise": message.data.difficulty || problemData.difficulty,
      "Language": language,
      "Alternative methods": message.data.alternativeMethods || "",
      "Remarks": message.data.remarks || "",
      "Solution link": problemData.Solution || "",
      "Worth reviewing?": message.data.worthReviewing || false,
      CodeContent: finalCode 
    };

    getNotionCredentials().then(credentials => {
      if (!credentials) {
        sendResponse({ status: "error", error: "Missing API Credentials. Check Settings." });
        return;
      }
      addEntryToNotionDatabase(formattedData, credentials.notionApiKey, credentials.notionDatabaseId)
        .then(res => sendResponse(res))
        .catch(err => sendResponse({ status: "error", error: err.message }));
    });
    return true; 
  }
});

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