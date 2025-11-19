// Einfacher Logger fürs Backend (kein JSON)
function logToServer(level, message, func = "", input = "") {
    const data = new URLSearchParams();
    data.append("level", level);
    data.append("message", message);
    data.append("function", func);
    data.append("input", input);

    fetch("http://localhost/php/logs.php", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: data
    }).catch(err => console.error("Log failed:", err));
}

// Beispiel: Log beim Laden
document.addEventListener("DOMContentLoaded", () => {
    logToServer("info", "Seite geladen");
});
