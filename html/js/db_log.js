/**
 * Database Logger
 * Sendet Logs an PHP-Backend zur Speicherung in MariaDB
 */

class DatabaseLogger {
    constructor(endpoint = 'php/logs.php') {
        this.endpoint = endpoint;
        this.queue = [];
        this.isProcessing = false;
        this.retryAttempts = 3;
        this.retryDelay = 1000; // ms
    }

    /**
     * Log an das Backend senden
     */
    async log(level, message, functionName = '', mode = '') {
        const logEntry = {
            level: level.toLowerCase(),
            message: String(message),
            function: functionName || '',
            mode: mode || '',
            timestamp: new Date().toISOString()
        };

        try {
            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(logEntry)
            });

            const result = await response.json();

            if (!response.ok) {
                console.error('Log-Fehler:', result.error || 'Unbekannter Fehler');
                // Bei Fehler in Queue speichern für Retry
                this.addToQueue(logEntry);
                return false;
            }

            console.log('✓ Log gespeichert:', result);
            return true;

        } catch (error) {
            console.error('Netzwerkfehler beim Logging:', error);
            this.addToQueue(logEntry);
            return false;
        }
    }

    /**
     * Helper-Methoden für verschiedene Log-Level
     */
    debug(message, functionName = '', mode = '') {
        return this.log('debug', message, functionName, mode);
    }

    info(message, functionName = '', mode = '') {
        return this.log('info', message, functionName, mode);
    }

    warning(message, functionName = '', mode = '') {
        return this.log('warning', message, functionName, mode);
    }

    error(message, functionName = '', mode = '') {
        return this.log('error', message, functionName, mode);
    }

    critical(message, functionName = '', mode = '') {
        return this.log('critical', message, functionName, mode);
    }

    /**
     * Fehlgeschlagene Logs in Queue
     */
    addToQueue(logEntry) {
        this.queue.push({
            entry: logEntry,
            attempts: 0,
            addedAt: Date.now()
        });

        // Automatisch Queue verarbeiten
        if (!this.isProcessing) {
            this.processQueue();
        }
    }

    /**
     * Queue abarbeiten mit Retry-Logik
     */
    async processQueue() {
        if (this.isProcessing || this.queue.length === 0) {
            return;
        }

        this.isProcessing = true;

        while (this.queue.length > 0) {
            const item = this.queue[0];

            // Max Versuche erreicht?
            if (item.attempts >= this.retryAttempts) {
                console.warn('Log verworfen nach max. Versuchen:', item.entry);
                this.queue.shift();
                continue;
            }

            // Zu alt? (älter als 5 Minuten)
            if (Date.now() - item.addedAt > 300000) {
                console.warn('Log verworfen (zu alt):', item.entry);
                this.queue.shift();
                continue;
            }

            try {
                const response = await fetch(this.endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(item.entry)
                });

                if (response.ok) {
                    console.log('✓ Queue-Log gespeichert:', item.entry.message);
                    this.queue.shift();
                } else {
                    item.attempts++;
                    await this.sleep(this.retryDelay * item.attempts);
                }
            } catch (error) {
                item.attempts++;
                await this.sleep(this.retryDelay * item.attempts);
            }
        }

        this.isProcessing = false;
    }

    /**
     * Helper: Warten
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Queue-Status abfragen
     */
    getQueueStatus() {
        return {
            pending: this.queue.length,
            isProcessing: this.isProcessing
        };
    }
}

// Globale Logger-Instanz erstellen
const dbLogger = new DatabaseLogger();

// Seitenlade-Event loggen
window.addEventListener('DOMContentLoaded', () => {
    dbLogger.info('Seite geladen', 'DOMContentLoaded', 'page_load');
});

// Fehler automatisch loggen
window.addEventListener('error', (event) => {
    dbLogger.error(
        `Fehler: ${event.message} in ${event.filename}:${event.lineno}`,
        'window.onerror',
        'global_error'
    );
});

// Unhandled Promise Rejections loggen
window.addEventListener('unhandledrejection', (event) => {
    dbLogger.error(
        `Unhandled Promise Rejection: ${event.reason}`,
        'unhandledrejection',
        'promise_error'
    );
});

// Export für Module (falls benötigt)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DatabaseLogger;
}