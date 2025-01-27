// Add event listener for the "Save" button
document.getElementById('save-button').addEventListener('click', async () => {
    const notes = document.getElementById('notes').value.trim();
    const tags = document.getElementById('tags').value.trim();
    
    // Send message to the background script to handle the save action
    const response = await browser.runtime.sendMessage({
      action: 'saveProblemToNotion',
      notes,
      tags
    });
  
    if (response && response.status === 'success') {
      alert('Problem saved to Notion!');
    } else {
      alert('Failed to save the problem. Please try again.');
    }
  });
  