
const darkBtn = document.getElementById("darkmode");

// Darkmode aktivieren / deaktivieren
darkBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark");

  // Button Text wechseln
  if (document.body.classList.contains("dark")) {
    darkBtn.textContent = "☀️ Light Mode";
  } else {
    darkBtn.textContent = "🌙 Dark Mode";
  }
});