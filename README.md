    te a new Database in your workspace where the problems will be saved.

Step 3: Configure the Extension

    Open the extension by clicking on the extension icon.
    Navigate to the Settings Tab and input the following:
        Notion API Key: Paste your generated Notion API key here.
        Notion Database ID: Copy the Database ID of your Notion database and paste it here.
    Click Save Settings to store your Notion credentials.
    After saving, you will see your credentials displayed under Saved Settings.

Step 4: Save LeetCode Problems

    Navigate to a completed LeetCode problem page.
    Open the extension and go to the Save Problem tab.
    Enter the following details:
        Perceived difficulty: Select the difficulty level of the problem (Easy, Medium, Hard).
        Alternative methods: Describe any alternative methods you used.
        Remarks: Add any additional comments.
        Solved?: Check if you completed the problem.
        Worth Reviewing?: Check if you want to revisit the problem.
    Click Save to Notion to log the problem in your Notion database.

3. How the Extension Works in Depth
Background Script

The background script listens for messages from the popup to interact with the Notion API. It processes the data entered in the extension and sends it to the Notion database.

Here’s how the communication works:

    Popup to Background Communication:
        When the user clicks Save to Notion, the popup script collects the problem's metadata (e.g., difficulty, alternative methods, etc.) and sends it to the background script via a message (saveToNotion).
    Background to Notion API:
        The background script fetches the Notion API Key and Database ID from the browser's local storage.
        It then formats the problem data and sends a POST request to the Notion API to add the problem details to the specified database.
    API Response Handling:
        If the data is successfully saved, the background script sends a success message back to the popup.
        If an error occurs (e.g., incorrect API key, database issues, rate-limiting), the background script sends an error message, and the popup updates the user interface with an appropriate message.

Notion API Integration

The Notion API is used to add a new page to a database with the problem's details. The database properties in Notion are configured to include:

    Title: The problem’s name.
    Tags: Any tags associated with the problem (e.g., algorithm, data structure).
    Difficulty Level: The perceived difficulty of the problem.
    Remarks: User comments or notes.
    Solution Link: A link to your solution or reference.
    Review Status: Whether the problem should be reviewed again.

Error Handling and Retry Logic

The background script has built-in error handling and retry logic for handling potential issues with the Notion API:

    Authentication Errors: If the Notion API key is incorrect, the user is notified to re-check the credentials.
    Rate Limiting: If the Notion API returns a rate limit error (HTTP 429), the background script waits for a specified period before retrying.
    Network Errors: If the request fails due to a network error, the user is notified and retry attempts are made.

Settings Management

The extension saves your Notion API Key and Database ID securely in the browser’s local storage. This ensures you don’t have to input your credentials every time you use the extension. Additionally, saved settings are displayed in the Settings Tab so you can always review or update them.
Contributing

If you’d like to contribute to this project, feel free to fork the repository and submit pull requests for any improvements or fixes. You can also open issues to suggest new features or report bugs.
