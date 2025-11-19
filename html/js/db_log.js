// Minimaler Logger: reduziert und spezifisch für Logging
(function (global) {
    const LOGGING_ENABLED = false; // setze auf true um server-logging zu aktivieren

    async function logToServer(level, message, context) {
        if (!LOGGING_ENABLED) return;
        try {
            const payload = { level, message, context: context || {}, timestamp: new Date().toISOString() };
            const res = await fetch('/php/logs.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) console.warn('Logger: server returned', res.status);
        } catch (err) {
            console.warn('Logger: send failed', err);
        }
    }

    const dbLogger = {
        info: (msg, ctx) => { console.log('[INFO]', msg, ctx); logToServer('info', msg, ctx); },
        warn: (msg, ctx) => { console.warn('[WARN]', msg, ctx); logToServer('warn', msg, ctx); },
        error: (msg, ctx) => { console.error('[ERROR]', msg, ctx); logToServer('error', msg, ctx); }
    };

    // Exponiere globalen Logger und beende Datei – keine Duplikate von berechnen.js
    global.dbLogger = dbLogger;
})(window);
