# LeetNotion Sync - GitHub README

## 1. What the Extension Does

**LeetNotion Sync** is a browser extension that allows you to easily save your completed LeetCode problems to a [Notion database template](https://spark-pilot-41d.notion.site/18fcc053f74480edac78df0c4bc2cf06?v=18fcc053f744815091b1000cf0d2c330&pvs=4). It integrates with your Notion workspace, enabling you to store problem details such as difficulty, alternative solutions, remarks, and whether the problem is worth reviewing. 

This tool aims to simplify your LeetCode journey by automatically creating an organized log of all your solved problems via an extension, offering you a quick and easy way to track your progress without needing to manually open the notion page.

![database image](docs/images/template.png)

![interface](docs/images/interface.png)

### Key Features:
- **Save completed LeetCode problems** to a Notion database.
- **Track progress** with custom tags, difficulty levels, and remarks.
- **Automatic syncing** with your Notion workspace through the Notion API.
- **Customizable settings** to store and manage your Notion API key and Database ID.
  
---


### Step 1: Install the Extension
- Install the extension to your browser (use firefox manifest v3 for firefox).
- For chrome download the whole download for chrome folder
   - Go to chrome://extensions/ in your browser
   - under my extensions click load unpacked and select the downloaded folder
- For firefox download the whole download for firefox manifest v3 folder
   - Go to about:debugging#/runtime/this-firefox
   - click load temporary add on and select the manifest.json file
  
### Step 2: Obtain Notion API Key and Database ID
- Create a **Notion Integration** by going to your profiles [integrations page](https://www.notion.so/profile/integrations), clicking new integration, inputting the correct associated workspace, inputting type as internal and saving. You do not need to change any of the settings, just copy the **Notion API Key**.
- Add the [**Database template**](https://spark-pilot-41d.notion.site/18fcc053f74480edac78df0c4bc2cf06?v=18fcc053f744815091b1000cf0d2c330&pvs=4) to your workspace where the problems will be saved.
- Ensure you are viewing your notion database, not the page, and add your Notion integration to your database by pressing the 3 dots next to the star and share icons -> connections -> name of your connection.
  
### Step 3: Configure the Extension
1. Open the extension by clicking on the extension icon.
2. Navigate to the **Settings Tab** and input the following:
    - **Notion API Key**: Paste your generated Notion API key here.
    - **Notion Database ID**: Copy the Database ID of your Notion database and paste it here. It is found in this section of the url https://www.notion.so/{NOTIONDATABASEID}?v=
3. Click **Save Settings** to store your Notion credentials.
4. After saving, you will see your credentials displayed under **Saved Settings**.

### Step 4: Save LeetCode Problems
1. Navigate to a completed LeetCode problem page, ensure that you are currently viewing your inputted submission e.g. your url is https://leetcode.com/problems/{problem name}/submissions/{submission code}/ 
2. Open the extension and go to the **Save Problem** tab.
3. Enter the following details:
    - **Perceived difficulty**: Select the difficulty level of the problem (Easy, Medium, Hard).
    - **Alternative methods**: Describe any alternative methods you could have used.
    - **Remarks**: Add any additional comments.
    - **Solved?**: Check if you completed the problem.
    - **Worth Reviewing?**: Check if you want to revisit the problem.
4. Click **Save to Notion** to log the problem in your Notion database.
5. Wait until successfully saved to notion appears
    - Sometimes you may need to refresh the page

---

## 3. How the Extension Works in Depth

### Background Script

The background script listens for messages from the popup to interact with the Notion API. It processes the data entered in the extension and sends it to the Notion database. 

Here’s how the communication works:
1. **Popup to Background Communication**:
   - When the user clicks **Save to Notion**, the popup script collects the problem's metadata (e.g., difficulty, alternative methods, etc.) and sends it to the background script via a message (`saveToNotion`).
2. **Background to Notion API**:
   - The background script fetches the **Notion API Key** and **Database ID** from the browser's local storage.
   - It then formats the problem data and sends a **POST request** to the Notion API to add the problem details to the specified database.
3. **API Response Handling**:
   - If the data is successfully saved, the background script sends a success message back to the popup.
   - If an error occurs (e.g., incorrect API key, database issues, rate-limiting), the background script sends an error message, and the popup updates the user interface with an appropriate message.

### Notion API Integration

The Notion API is used to add a **new page** to a database with the problem's details. The database properties in Notion are configured to include:
- **Title**: The problem’s name.
- **Tags**: Any tags associated with the problem (e.g., algorithm, data structure).
- **Difficulty Level**: The perceived difficulty of the problem.
- **Remarks**: User comments or notes.
- **Solution Link**: A link to your solution or reference.
- **Review Status**: Whether the problem should be reviewed again.

### Error Handling and Retry Logic

The background script has built-in error handling and retry logic for handling potential issues with the Notion API:
- **Authentication Errors**: If the Notion API key is incorrect, the user is notified to re-check the credentials.
- **Rate Limiting**: If the Notion API returns a rate limit error (HTTP 429), the background script waits for a specified period before retrying.
- **Network Errors**: If the request fails due to a network error, the user is notified and retry attempts are made.

### Settings Management

The extension saves your **Notion API Key** and **Database ID** securely in the browser’s local storage. This ensures you don’t have to input your credentials every time you use the extension. Additionally, saved settings are displayed in the **Settings Tab** so you can always review or update them. 

---

## Contributing

If you’d like to contribute to this project, feel free to fork the repository and submit pull requests for any improvements or fixes. You can also open issues to suggest new features or report bugs.

