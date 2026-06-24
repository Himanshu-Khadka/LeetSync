const button = document.getElementById("test-button");
const statusText = document.getElementById("status");

button.addEventListener("click", () => {
  statusText.textContent = "Button clicked. Extension is working.";
});