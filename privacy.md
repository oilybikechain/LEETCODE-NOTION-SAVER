# Privacy Policy for LeetNotion Sync

**Last Updated:** [Insert Today's Date]

**LeetNotion Sync** ("we", "our", or "the extension") is an open-source browser extension designed to help users save their LeetCode problem solutions to their personal Notion workspace.

We respect your privacy and are committed to protecting your personal data. This policy explains what information we collect, how we use it, and where it is stored.

## 1\. Data Collection and Usage

**We do not collect, store, or transmit your personal data to our own servers.** The extension operates entirely locally on your device and communicates directly with the third-party services you authorize.

### A. Information We Handle

To function correctly, the extension handles the following data:

  * **Notion Credentials:** Your Notion API Key and Database ID.
  * **LeetCode Content:** Problem titles, descriptions, difficulty levels, tags, and your solution code scraped from the active LeetCode tab.
  * **User Preferences:** Settings such as your preferred programming language, theme (light/dark), and auto-save preferences.

### B. How We Use This Data

  * **Notion Credentials** are used strictly to authenticate requests sent directly from your browser to the official Notion API (`https://api.notion.com`).
  * **LeetCode Content** is formatted and sent to your specific Notion database to create a log of your activity.
  * **User Preferences** are used to customize the extension's interface and default behaviors.

## 2\. Data Storage

  * **Local Storage:** All sensitive information (Notion API Key, Database ID) and preferences are stored locally in your browser's internal storage (`browser.storage.local`).
  * **No Remote Storage:** We (the developers of LeetNotion Sync) **do not** have access to your data. We do not operate a backend server, database, or analytics tracker. Your data never leaves your control except to be sent to Notion.

## 3\. Third-Party Services

This extension interacts with the following third-party services:

  * **Notion:** The extension sends data to Notion on your behalf. Please refer to [Notion's Privacy Policy](https://www.google.com/search?q=https://www.notion.so/Privacy-Policy-3468d120cf614d4c9014c09f6adc9091) to understand how they handle your data once it is stored in your workspace.
  * **LeetCode:** The extension reads data from the LeetCode web pages you visit.

## 4\. User Control

You have full control over your data:

  * **View/Edit Credentials:** You can view or update your stored API Key and Database ID at any time via the extension's Settings page.
  * **Delete Data:** You can remove all locally stored data by uninstalling the extension or clearing your browser's extension data.

## 5\. Changes to This Policy

We may update this Privacy Policy from time to time. If we make significant changes, we will notify users through the extension update notes or the repository page.

## 6\. Contact Us

If you have any questions about this Privacy Policy, please open an issue on our [GitHub Repository](https://github.com/oilybikechain/LEETCODE-NOTION-SAVER).