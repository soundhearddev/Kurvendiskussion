// ======================================================
// db_log.js - Logger für Funktionsanalyse
// ======================================================

const Logger = (() => {

    // Server-URL anpassen
    const LOG_URL = "php/logs.php";

    // Standard-Log-Funktion
    async function log(level, message, func = "", mode = "") {
        if (!level) level = "info";
        if (!message) message = "";

        const payload = {
            level,
            message,
            function: func,
            mode,
            timestamp: new Date().toISOString()
        };

        try {
            const res = await fetch(LOG_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                console.warn("Logger: Server antwortete mit Status", res.status);
            }

            return await res.json().catch(() => null);

        } catch (err) {
            console.error("Logger Fehler:", err);
            return null;
        }
    }

    // Shortcut-Funktionen für gängige Levels
    const info = (message, func = "", mode = "") => log("info", message, func, mode);
    const warn = (message, func = "", mode = "") => log("warn", message, func, mode);
    const error = (message, func = "", mode = "") => log("error", message, func, mode);
    const debug = (message, func = "", mode = "") => log("debug", message, func, mode);

    return { log, info, warn, error, debug };
})();

// ==================== AUTOMATISCHES LOGGEN BEIM LADEN ====================
document.addEventListener("DOMContentLoaded", () => {
    const fxInput = document.getElementById("fx")?.value || "";
    const mode = document.querySelector('input[name="mode"]:checked')?.value || "";
    Logger.info("Seite geladen", fxInput, mode);
});
