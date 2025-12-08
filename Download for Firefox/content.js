console.log("LeetNotion Content script loaded!");

let modalExists = false;
let pollingInterval = null;

function getProblemSlug() {
  const match = window.location.pathname.match(/\/problems\/([^/]+)/);
  return match ? match[1] : null;
}

function getCodeFromEditor() {
  const codeLines = document.querySelectorAll('.view-lines .view-line');
  if (!codeLines || codeLines.length === 0) return "";
  return Array.from(codeLines).map(line => line.innerText.replace(/\u00a0/g, ' ')).join('\n');
}

function detectLanguage() {
  const buttons = document.querySelectorAll('button');
  const languages = ["C++", "Java", "Python", "Python3", "C", "C#", "JavaScript", "TypeScript", "Go", "Rust", "Swift", "Kotlin", "PHP", "SQL", "Ruby", "Dart", "Scala"];
  for (let button of buttons) {
    const text = button.innerText.trim();
    if (languages.includes(text)) return text;
  }
  return null;
}

async function fetchSiteData() {
  const problemSlug = getProblemSlug();
  if (!problemSlug) return null;

  const descriptionUrl = `https://leetcode.com/problems/${problemSlug}/description/`;
  const scrapedCode = getCodeFromEditor();
  const detectedLang = detectLanguage();

  const graphqlQuery = {
    query: `
      query questionData($titleSlug: String!) {
        question(titleSlug: $titleSlug) {
          title   
          difficulty 
          topicTags { name }
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
    if (!data.data || !data.data.question) return null;

    return {
      QuestionLink: descriptionUrl,
      Question: data.data.question.title,
      difficulty: data.data.question.difficulty,
      tags: data.data.question.topicTags.map(tag => tag.name),
      Solution: window.location.href,
      detectedLanguage: detectedLang,
      code: scrapedCode
    };

  } catch (error) {
    console.error("Error fetching data:", error);
    return null;
  }
}

// Helper to create elements with classes/attributes
function createEl(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text) el.textContent = text;
    return el;
}

async function createInPageModal() {
  if (modalExists) return;

  const { autoDetect } = await browser.storage.local.get("autoDetect");
  if (autoDetect === false) return; 

  modalExists = true;
  const problemData = await fetchSiteData();
  
  if (!problemData) {
      modalExists = false;
      return;
  }

  const modalContainer = document.createElement("div");
  modalContainer.id = "leetnotion-modal-container";
  const shadow = modalContainer.attachShadow({ mode: 'open' });

  // CSS (Content is safe)
  const style = document.createElement('style');
  style.textContent = `
    :host { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .modal-card {
      position: fixed; bottom: 20px; right: 20px; width: 340px;
      background-color: #1e1e1e; color: #e0e0e0;
      border: 1px solid #444; border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.5);
      z-index: 100000; padding: 16px;
      animation: slideIn 0.3s ease-out;
      box-sizing: border-box;
    }
    @keyframes slideIn { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
    .title-group { max-width: 280px; }
    .title { font-weight: 800; font-size: 15px; color: #fff; margin-bottom: 4px; display: block; }
    .badges { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
    .badge { font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 700; text-transform: uppercase; background: #333; color: #aaa; }
    .badge.Easy { color: #4caf50; background: rgba(76,175,80,0.15); }
    .badge.Medium { color: #ff9800; background: rgba(255,152,0,0.15); }
    .badge.Hard { color: #f44336; background: rgba(244,67,54,0.15); }
    .tag { font-size: 10px; background: #2d2d2d; border: 1px solid #444; padding: 1px 5px; border-radius: 4px; color: #a0a0a0; }

    .close-btn { background: none; border: none; color: #666; font-size: 18px; cursor: pointer; padding: 0; line-height: 1; }
    .close-btn:hover { color: #fff; }

    .row { display: flex; gap: 10px; margin-bottom: 12px; }
    .group { flex: 1; }
    label { display: block; font-size: 10px; font-weight: 700; color: #a0a0a0; margin-bottom: 4px; text-transform: uppercase; }
    
    select, textarea, input[type="text"] {
      width: 100%; padding: 8px; border-radius: 6px;
      border: 1px solid #444; background: #2d2d2d;
      color: #fff; font-size: 12px; outline: none;
      box-sizing: border-box; font-family: inherit;
    }
    select:focus, textarea:focus { border-color: #66bb6a; }

    .dots { display: flex; gap: 8px; margin-top: 2px; }
    .dot {
      width: 24px; height: 24px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 10px; font-weight: bold; cursor: pointer;
      border: 1px solid #444; color: #888; transition: 0.2s;
    }
    .dot:hover { border-color: #fff; color: #fff; }
    .dot.selected { color: #fff; border: none; transform: scale(1.1); }
    .dot.easy.selected { background: #4caf50; }
    .dot.medium.selected { background: #ff9800; }
    .dot.hard.selected { background: #f44336; }

    .toggles { display: flex; gap: 15px; margin-bottom: 12px; }
    .check-wrap { display: flex; align-items: center; gap: 6px; cursor: pointer; }
    .check-wrap label { margin: 0; text-transform: none; color: #e0e0e0; font-size: 12px; font-weight: 400; cursor: pointer;}
    input[type="checkbox"] { accent-color: #66bb6a; cursor: pointer; }

    .action-row { display: flex; gap: 8px; }
    .save-btn {
      flex: 2; padding: 10px; border: none; border-radius: 6px;
      background: #66bb6a; color: #1e1e1e; font-weight: 700; cursor: pointer;
      font-size: 13px; transition: background 0.2s;
    }
    .save-btn:hover { background: #81c784; }
    .save-btn:disabled { opacity: 0.7; cursor: not-allowed; }

    .cancel-btn {
      flex: 1; padding: 10px; border: 1px solid #444; border-radius: 6px;
      background: #2d2d2d; color: #e0e0e0; font-weight: 600; cursor: pointer;
      font-size: 13px; transition: background 0.2s;
    }
    .cancel-btn:hover { background: #3d3d3d; }
    .status { text-align: center; margin-top: 8px; font-size: 11px; min-height: 15px; }
  `;

  // --- BUILD DOM MANUALLY (No innerHTML) ---
  const card = createEl('div', 'modal-card');

  // HEADER
  const header = createEl('div', 'header');
  const titleGroup = createEl('div', 'title-group');
  const title = createEl('span', 'title', `✅ ${problemData.Question}`);
  
  const badges = createEl('div', 'badges');
  const diffBadge = createEl('span', `badge ${problemData.difficulty}`, problemData.difficulty);
  badges.appendChild(diffBadge);
  
  // Tags
  problemData.tags.slice(0, 3).forEach(t => {
      badges.appendChild(createEl('span', 'tag', t));
  });

  titleGroup.appendChild(title);
  titleGroup.appendChild(badges);
  header.appendChild(titleGroup);

  const closeBtn = createEl('button', 'close-btn', '×');
  closeBtn.title = "Close";
  header.appendChild(closeBtn);
  card.appendChild(header);

  // ROW 1: Lang & Diff
  const row1 = createEl('div', 'row');
  
  const groupLang = createEl('div', 'group');
  groupLang.appendChild(createEl('label', '', 'LANGUAGE'));
  const langSelect = document.createElement('select');
  langSelect.id = 'lang-select';
  ["Python", "Java", "C++", "JavaScript", "TypeScript", "Go", "SQL", "Unknown"].forEach(l => {
      const opt = document.createElement('option');
      opt.value = l; opt.textContent = l;
      langSelect.appendChild(opt);
  });
  groupLang.appendChild(langSelect);
  row1.appendChild(groupLang);

  const groupDiff = createEl('div', 'group');
  groupDiff.appendChild(createEl('label', '', 'PERCEIVED DIFFICULTY'));
  const dotsContainer = createEl('div', 'dots');
  const dotE = createEl('div', 'dot easy', 'E'); dotE.dataset.val = 'Easy';
  const dotM = createEl('div', 'dot medium', 'M'); dotM.dataset.val = 'Medium';
  const dotH = createEl('div', 'dot hard', 'H'); dotH.dataset.val = 'Hard';
  dotsContainer.appendChild(dotE); dotsContainer.appendChild(dotM); dotsContainer.appendChild(dotH);
  groupDiff.appendChild(dotsContainer);
  const diffInput = document.createElement('input'); 
  diffInput.type = 'hidden'; diffInput.id = 'selected-diff'; diffInput.value = problemData.difficulty;
  groupDiff.appendChild(diffInput);
  row1.appendChild(groupDiff);
  card.appendChild(row1);

  // ROW 2: Approach
  const groupApp = createEl('div', 'group');
  groupApp.style.marginBottom = '12px';
  groupApp.appendChild(createEl('label', '', 'ALTERNATIVE APPROACHES'));
  const approachArea = document.createElement('textarea');
  approachArea.id = 'approach'; approachArea.rows = 2; 
  approachArea.placeholder = "Describe other methods...";
  groupApp.appendChild(approachArea);
  card.appendChild(groupApp);

  // ROW 3: Remarks
  const groupRem = createEl('div', 'group');
  groupRem.style.marginBottom = '12px';
  groupRem.appendChild(createEl('label', '', 'REMARKS'));
  const remarkArea = document.createElement('textarea');
  remarkArea.id = 'remarks'; remarkArea.rows = 1; 
  remarkArea.placeholder = "Edge cases, notes...";
  groupRem.appendChild(remarkArea);
  card.appendChild(groupRem);

  // ROW 4: Toggles
  const toggles = createEl('div', 'toggles');
  
  const checkSolved = createEl('div', 'check-wrap');
  const inputSolved = document.createElement('input'); 
  inputSolved.type = 'checkbox'; inputSolved.id = 'solved'; inputSolved.checked = true;
  const labelSolved = createEl('label', '', 'Solved'); labelSolved.htmlFor = 'solved';
  checkSolved.appendChild(inputSolved); checkSolved.appendChild(labelSolved);
  
  const checkReview = createEl('div', 'check-wrap');
  const inputReview = document.createElement('input'); 
  inputReview.type = 'checkbox'; inputReview.id = 'review';
  const labelReview = createEl('label', '', 'Worth Reviewing'); labelReview.htmlFor = 'review';
  checkReview.appendChild(inputReview); checkReview.appendChild(labelReview);

  toggles.appendChild(checkSolved); toggles.appendChild(checkReview);
  card.appendChild(toggles);

  // ACTIONS
  const actions = createEl('div', 'action-row');
  const cancelBtn = createEl('button', 'cancel-btn', 'Cancel');
  const saveBtn = createEl('button', 'save-btn', 'Save to Notion');
  actions.appendChild(cancelBtn); actions.appendChild(saveBtn);
  card.appendChild(actions);

  const statusDiv = createEl('div', 'status');
  card.appendChild(statusDiv);

  shadow.appendChild(style);
  shadow.appendChild(card);
  document.body.appendChild(modalContainer);

  // --- LOGIC ---
  if (problemData.detectedLanguage) {
      let found = false;
      for (let opt of langSelect.options) {
          if (opt.value.toLowerCase() === problemData.detectedLanguage.toLowerCase()) {
              langSelect.value = opt.value; found = true; break;
          }
      }
      if (!found) {
          const opt = document.createElement('option');
          opt.value = problemData.detectedLanguage;
          opt.textContent = problemData.detectedLanguage;
          langSelect.add(opt);
          langSelect.value = problemData.detectedLanguage;
      }
  }

  const dots = [dotE, dotM, dotH];
  // Pre-select
  const initialDot = dots.find(d => d.dataset.val === problemData.difficulty);
  if(initialDot) initialDot.classList.add('selected');

  dots.forEach(dot => {
    dot.addEventListener('click', (e) => {
      e.preventDefault();
      dots.forEach(d => d.classList.remove('selected'));
      dot.classList.add('selected');
      diffInput.value = dot.dataset.val;
    });
  });

  const closeModal = (e) => {
      if (e) e.preventDefault();
      modalContainer.remove(); 
      modalExists = false; 
  };
  
  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);

  saveBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    saveBtn.textContent = "Saving...";
    saveBtn.disabled = true;

    const payload = {
      difficulty: diffInput.value,
      language: langSelect.value,
      alternativeMethods: approachArea.value || "None",
      remarks: remarkArea.value || "None",
      correct: inputSolved.checked,
      worthReviewing: inputReview.checked,
      code: problemData.code
    };

    await browser.runtime.sendMessage({ action: 'problemData', data: problemData });
    
    browser.runtime.sendMessage({ action: "saveToNotion", data: payload })
      .then(response => {
        if (response.status === "success") {
          statusDiv.textContent = "✅ Saved Successfully!";
          statusDiv.style.color = "#81c995";
          setTimeout(closeModal, 1500);
        } else {
          statusDiv.textContent = "❌ " + response.error;
          statusDiv.style.color = "#f28b82";
          saveBtn.textContent = "Save to Notion";
          saveBtn.disabled = false;
        }
      });
  });
}

function isSubmissionAccepted() {
  const statusHeaders = document.querySelectorAll('[data-e2e-locator="submission-result-accepted-header"], div, span');
  for (let el of statusHeaders) {
      if (el.innerText.trim() === "Accepted") {
          if (el.offsetParent !== null) return true;
      }
  }
  const greenText = document.querySelector('.text-green-s, .text-green-500');
  if (greenText && greenText.innerText.includes("Accepted")) return true;
  return false;
}

function startResultWatcher() {
  if (pollingInterval) clearInterval(pollingInterval);
  let attempts = 0;
  const maxAttempts = 20; 
  
  pollingInterval = setInterval(() => {
    attempts++;
    if (isSubmissionAccepted()) {
      clearInterval(pollingInterval);
      createInPageModal();
    } else if (attempts >= maxAttempts) {
      clearInterval(pollingInterval);
    }
  }, 500);
}

document.addEventListener('click', (event) => {
  const target = event.target;
  const btn = target.closest('button');
  if (btn) {
    const isSubmit = btn.getAttribute('data-e2e-locator') === 'console-submit-button' || 
                     btn.textContent.includes('Submit');
    if (isSubmit) {
      setTimeout(startResultWatcher, 200);
    }
  }
});

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "manualFetch") {
    fetchSiteData().then(data => {
      if (data) {
        browser.runtime.sendMessage({ action: 'problemData', data: data });
        sendResponse({ status: "success" });
      } else {
        sendResponse({ status: "error" });
      }
    });
    return true; 
  }
});