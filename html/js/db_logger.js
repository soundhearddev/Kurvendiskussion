
// Database Logger
class DatabaseLogger {
    constructor(endpoint = '../php/logs.php') {
        this.endpoint = endpoint;
        this.queue = [];
        this.isProcessing = false;
    }

    async log(level, message, functionName = '', mode = '', context = {}) {
        const logEntry = {
            level: level.toLowerCase(),
            message: String(message),
            function: functionName || '',
            mode: mode || '',
            context: JSON.stringify(context),
            timestamp: new Date().toISOString()
        };

        try {
            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(logEntry)
            });

            if (!response.ok) {
                console.error('Log-Fehler:', response.status);
                return false;
            }

            return true;
        } catch (error) {
            console.error('Logging-Fehler:', error);
            return false;
        }
    }

    debug(msg, fn='', mode='', ctx={}) { return this.log('debug', msg, fn, mode, ctx); }
    info(msg, fn='', mode='', ctx={}) { return this.log('info', msg, fn, mode, ctx); }
    warning(msg, fn='', mode='', ctx={}) { return this.log('warning', msg, fn, mode, ctx); }
    error(msg, fn='', mode='', ctx={}) { return this.log('error', msg, fn, mode, ctx); }
}

const dbLogger = new DatabaseLogger();



document.addEventListener('DOMContentLoaded', () => {
    el.fx.focus();
    
    dbLogger.info('Seite geladen', 'DOMContentLoaded', 'page_load', {
        userAgent: navigator.userAgent,
        language: navigator.language,
        screenSize: `${screen.width}x${screen.height}`
    });
});

// Globale Error-Handler
window.addEventListener('error', (event) => {
    dbLogger.error('Globaler Fehler', 'window.error', 'error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
    });
});

window.addEventListener('unhandledrejection', (event) => {
    dbLogger.error('Unhandled Promise Rejection', 'unhandledrejection', 'error', {
        reason: event.reason
    });
});