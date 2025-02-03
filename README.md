# LeetNotion Sync - GitHub README

## 1. What the Extension Does

**LeetNotion Sync** is a browser extension that allows you to easily save your completed LeetCode problems to a Notion database template provided. It integrates with your Notion workspace, enabling you to store problem details such as difficulty, alternative solutions, remarks, and whether the problem is worth reviewing. 

This tool aims to simplify your LeetCode journey by automatically creating an organized log of all your solved problems, offering you a quick and easy way to track your progress, solutions, and areas that need further review.

### Key Features:
- **Save completed LeetCode problems** to a Notion database.
- **Track progress** with custom tags, difficulty levels, and remarks.
- **Automatic syncing** with your Notion workspace through the Notion API.
- **Customizable settings** to store and manage your Notion API key and Database ID.
  
---

## 2. How to Setup the API and Use the Extension

### Step 1: Install the Extension
- Install the extension to your browser (currently supports Firefox).


### Step 2: Add the Leetcode question tracking database to your Notion account
- Get the template from here 
- 
  
### Step 2: Obtain Notion API Key and Database ID
- Create a **Notion Integration** by following the [Notion API Documentation](https://developers.notion.com/docs/getting-started).
- Generate a **Notion API Key** and add the [**Database template**]() to your workspace where the problems will be saved.
- Add your Notion integration into your connections by pressing the 3 dots next to the star and share icons -> connections -> name of your connection
  
### Step 3: Configure the Extension
1. Open the extension by clicking on the extension icon.
2. Navigate to the **Settings Tab** and input the following:
    - **Notion API Key**: Paste your generated Notion API key here.
    - **Notion Database ID**: Copy the Database ID of your Notion database and paste it here.
3. Click **Save Settings** to store your Notion credentials.
4. After saving, you will see your credentials displayed under **Saved Settings**.

### Step 4: Save LeetCode Problems
1. Navigate to a completed LeetCode problem page.
2. Open the extension and go to the **Save Problem** tab.
3. Enter the following details:
    - **Perceived difficulty**: Select the difficulty level of the problem (Easy, Medium, Hard).
    - **Alternative methods**: Describe any alternative methods you used.
    - **Remarks**: Add any additional comments.
    - **Solved?**: Check if you completed the problem.
    - **Worth Reviewing?**: Check if you want to revisit the problem.
4. Click **Save to Notion** to log the problem in your Notion database.

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

