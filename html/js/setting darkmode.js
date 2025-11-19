
// Sauberer Darkmode-Handler: prüft auf Vorhandensein des Buttons
const darkBtn = document.getElementById("darkmode");
if (darkBtn) {
  darkBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    darkBtn.textContent = document.body.classList.contains("dark") ? "☀️ Light Mode" : "🌙 Dark Mode";
  });
}