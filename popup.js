document.addEventListener("DOMContentLoaded", () => {
  const difficultyBoxes = document.querySelectorAll(".difficulty-box");
  const selectedDifficulty = document.getElementById("selected-difficulty");

  // Add click event listener to each difficulty box
  difficultyBoxes.forEach(box => {
    box.addEventListener("click", () => {
      // Remove "selected" class from all boxes
      difficultyBoxes.forEach(b => b.classList.remove("selected"));
      
      // Add "selected" class to the clicked box
      box.classList.add("selected");

      // Store selected value
      selectedDifficulty.value = box.getAttribute("data-value");
    });
  });

  // Save button event listener
  document.getElementById("save-btn").addEventListener("click", async () => {
    // Collect all user inputs
    const data = {
      difficulty: selectedDifficulty.value,
      alternativeMethods: document.getElementById("alternative-methods").value,
      remarks: document.getElementById("remarks").value,
      correct: document.getElementById("correct").checked,
      worthReviewing: document.getElementById("worth-reviewing").checked,
    };
    console.log("Selected Difficulty:", selectedDifficulty.value);
    console.log("Alternative Methids:", data.alternativeMethods);
    console.log("remarks:", data.remarks);
    console.log("correct:", data.correct);
    console.log("worthReviewing:", data.worthReviewing);
    // Send data to the background script
    try {
      const response = await browser.runtime.sendMessage({
        action: "saveToNotion",
        data: data,
      });
      console.log("Response from background script:", response);
      alert("Problem saved to Notion successfully!");
    } catch (error) {
      console.error("Error sending data to background script:", error);
      alert("Failed to save problem to Notion.");
    }
  });
});