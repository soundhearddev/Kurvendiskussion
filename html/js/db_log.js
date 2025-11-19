// ======================================================
// db_logger.js - Logger & Funktionsanalyse
// ======================================================

(function(global) {
    'use strict';

    // ==================== KONFIGURATION ====================
    const LOGGING_ENABLED = true; // true = Logs an Server schicken
    const DEBUG_MODE = true;      // true = Ausführliche Console-Logs

    const CONFIG = {
        GRAPH: {
            DEFAULT_X_MIN: -10,
            DEFAULT_X_MAX: 10,
            POINT_COUNT: 200,
            STEP_SIZE: 0.1
        },
        VALIDATION: {
            ALLOWED_CHARS: /^[0-9x\s\+\-\*\/\^\(\)\.\,sincotan]*$/i,
            MAX_LENGTH: 200
        },
        NUMERICAL: {
            EPSILON: 0.001,
            TOLERANCE: 0.0001,
            ZERO_THRESHOLD: 0.001,
            DERIVATIVE_THRESHOLD: 0.05
        }
    };

    // ==================== LOGGER ====================
    
    async function logToServer(level, message, context) {
        if (!LOGGING_ENABLED) return;
        
        try {
            const payload = {
                level: level,
                message: message,
                context: context || {},
                timestamp: new Date().toISOString()
            };

            if (DEBUG_MODE) {
                console.log('📤 Sende Log an Server:', payload);
            }

            const res = await fetch('php/logs.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                console.warn('⚠️ Logger: Server antwortete mit Status', res.status);
                return false;
            }

            const data = await res.json();
            if (DEBUG_MODE) {
                console.log('✅ Log erfolgreich gespeichert:', data);
            }
            return true;

        } catch (err) {
            console.error('❌ Logger: Fehler beim Senden', err);
            return false;
        }
    }

    const dbLogger = {
        info: (msg, ctx) => {
            console.log('ℹ️ [INFO]', msg, ctx || '');
            logToServer('info', msg, ctx);
        },
        warn: (msg, ctx) => {
            console.warn('⚠️ [WARN]', msg, ctx || '');
            logToServer('warn', msg, ctx);
        },
        error: (msg, ctx) => {
            console.error('❌ [ERROR]', msg, ctx || '');
            logToServer('error', msg, ctx);
        },
        debug: (msg, ctx) => {
            if (DEBUG_MODE) {
                console.log('🐛 [DEBUG]', msg, ctx || '');
            }
        }
    };

    // Logger global verfügbar machen
    global.dbLogger = dbLogger;

    // ==================== DOM ELEMENTE ====================
    
    const elements = {
        fxInput: document.getElementById('fx'),
        output: document.getElementById('output'),
        calcBtn: document.getElementById('calc-btn'),
        resetBtn: document.getElementById('reset-btn'),
        modeRadios: document.querySelectorAll('input[name="mode"]')
    };

    // ==================== VALIDIERUNG ====================
    
    function validateFunction(input) {
        if (!input || input.length === 0) {
            dbLogger.warn('Validation: Leere Eingabe');
            return false;
        }
        
        if (input.length > CONFIG.VALIDATION.MAX_LENGTH) {
            dbLogger.warn('Validation: Eingabe zu lang', { length: input.length });
            return false;
        }
        
        if (!CONFIG.VALIDATION.ALLOWED_CHARS.test(input)) {
            dbLogger.warn('Validation: Ungültige Zeichen', { input });
            return false;
        }
        
        // Klammer-Check
        const openBrackets = (input.match(/\(/g) || []).length;
        const closeBrackets = (input.match(/\)/g) || []).length;
        
        if (openBrackets !== closeBrackets) {
            dbLogger.warn('Validation: Klammern nicht ausgeglichen', { open: openBrackets, close: closeBrackets });
            return false;
        }
        
        return true;
    }

    // ==================== FUNKTIONS-PARSING ====================
    
    function cleanFunction(input) {
        return input
            .replace(/\s+/g, '')        // Leerzeichen entfernen
            .replace(/\*\*/g, '^')      // ** zu ^
            .replace(/,/g, '.')         // Komma zu Punkt
            .toLowerCase();
    }

    function parseFunction(input) {
        const cleaned = cleanFunction(input);
        const isValid = validateFunction(cleaned);
        
        const result = {
            original: input,
            cleaned: cleaned,
            isValid: isValid,
            error: isValid ? null : 'Ungültige Funktion'
        };
        
        dbLogger.debug('Funktion geparst', result);
        return result;
    }

    // ==================== FUNKTIONS-AUSWERTUNG ====================
    
    function evaluateFunction(func, x) {
        try {
            // Funktion für eval vorbereiten
            let evalStr = func
                .replace(/\^/g, '**')
                .replace(/sin/g, 'Math.sin')
                .replace(/cos/g, 'Math.cos')
                .replace(/tan/g, 'Math.tan')
                .replace(/x/g, `(${x})`);
            
            const result = eval(evalStr);
            
            // Prüfen auf gültige Zahl
            if (typeof result !== 'number' || !isFinite(result)) {
                return null;
            }
            
            return result;
            
        } catch (err) {
            dbLogger.debug('Fehler bei Auswertung', { x, error: err.message });
            return null;
        }
    }

    // ==================== ABLEITUNGEN ====================
    
    function calculateDerivative(func, x) {
        const h = CONFIG.NUMERICAL.EPSILON;
        const y1 = evaluateFunction(func, x + h);
        const y2 = evaluateFunction(func, x - h);
        
        if (y1 !== null && y2 !== null) {
            return (y1 - y2) / (2 * h);
        }
        return null;
    }

    function calculateSecondDerivative(func, x) {
        const h = CONFIG.NUMERICAL.EPSILON;
        const y0 = evaluateFunction(func, x);
        const y1 = evaluateFunction(func, x + h);
        const y2 = evaluateFunction(func, x - h);
        
        if (y0 !== null && y1 !== null && y2 !== null) {
            return (y1 - 2 * y0 + y2) / (h * h);
        }
        return null;
    }

    // ==================== NULLSTELLEN ====================
    
    function findZeros(func, xMin, xMax) {
        const zeros = [];
        const step = CONFIG.GRAPH.STEP_SIZE;
        
        for (let x = xMin; x < xMax; x += step) {
            const y1 = evaluateFunction(func, x);
            const y2 = evaluateFunction(func, x + step);
            
            if (y1 !== null && y2 !== null) {
                // Vorzeichenwechsel?
                if ((y1 < 0 && y2 > 0) || (y1 > 0 && y2 < 0)) {
                    // Newton-Verfahren zur Verfeinerung
                    let xZero = x + step / 2;
                    for (let i = 0; i < 10; i++) {
                        const fx = evaluateFunction(func, xZero);
                        const dx = calculateDerivative(func, xZero);
                        if (dx !== null && Math.abs(dx) > CONFIG.NUMERICAL.ZERO_THRESHOLD) {
                            xZero = xZero - fx / dx;
                        }
                    }
                    zeros.push({ x: Math.round(xZero * 1000) / 1000, y: 0 });
                }
            }
        }
        
        dbLogger.debug('Nullstellen gefunden', { count: zeros.length });
        return zeros;
    }

    // ==================== EXTREMA ====================
    
    function findExtrema(func, xMin, xMax) {
        const extrema = [];
        const step = CONFIG.GRAPH.STEP_SIZE;
        
        for (let x = xMin + step; x < xMax - step; x += step) {
            const d1 = calculateDerivative(func, x);
            const d2 = calculateSecondDerivative(func, x);
            
            if (d1 !== null && d2 !== null && Math.abs(d1) < CONFIG.NUMERICAL.DERIVATIVE_THRESHOLD) {
                const y = evaluateFunction(func, x);
                if (y !== null) {
                    extrema.push({
                        x: Math.round(x * 1000) / 1000,
                        y: Math.round(y * 1000) / 1000,
                        type: d2 > 0 ? 'Minimum' : 'Maximum'
                    });
                }
            }
        }
        
        dbLogger.debug('Extrema gefunden', { count: extrema.length });
        return extrema;
    }

    // ==================== WENDEPUNKTE ====================
    
    function findInflectionPoints(func, xMin, xMax) {
        const inflections = [];
        const step = CONFIG.GRAPH.STEP_SIZE;
        
        for (let x = xMin; x < xMax; x += step) {
            const d2_1 = calculateSecondDerivative(func, x);
            const d2_2 = calculateSecondDerivative(func, x + step);
            
            if (d2_1 !== null && d2_2 !== null) {
                // Vorzeichenwechsel in 2. Ableitung?
                if ((d2_1 < 0 && d2_2 > 0) || (d2_1 > 0 && d2_2 < 0)) {
                    const y = evaluateFunction(func, x);
                    if (y !== null) {
                        inflections.push({
                            x: Math.round(x * 1000) / 1000,
                            y: Math.round(y * 1000) / 1000
                        });
                    }
                }
            }
        }
        
        dbLogger.debug('Wendepunkte gefunden', { count: inflections.length });
        return inflections;
    }

    // ==================== KURVENDISKUSSION ====================
    
    async function performCurveAnalysis(parsed) {
        dbLogger.info('Starte Kurvendiskussion', { function: parsed.original });
        
        const xMin = CONFIG.GRAPH.DEFAULT_X_MIN;
        const xMax = CONFIG.GRAPH.DEFAULT_X_MAX;
        
        const analysis = {
            function: parsed.original,
            zeros: findZeros(parsed.cleaned, xMin, xMax),
            extrema: findExtrema(parsed.cleaned, xMin, xMax),
            inflections: findInflectionPoints(parsed.cleaned, xMin, xMax),
            timestamp: new Date().toISOString()
        };
        
        dbLogger.info('Kurvendiskussion abgeschlossen', {
            zeros: analysis.zeros.length,
            extrema: analysis.extrema.length,
            inflections: analysis.inflections.length
        });
        
        return analysis;
    }

    // ==================== ANZEIGE ====================
    
    function displayAnalysisData(data) {
        let html = '<div class="analysis-results">';
        html += `<h3>Funktion: ${data.function}</h3>`;
        
        // Nullstellen
        html += '<h4>Nullstellen:</h4>';
        if (data.zeros.length > 0) {
            html += '<ul>';
            data.zeros.forEach(z => {
                html += `<li>x = ${z.x}</li>`;
            });
            html += '</ul>';
        } else {
            html += '<p>Keine gefunden</p>';
        }
        
        // Extrema
        html += '<h4>Extrempunkte:</h4>';
        if (data.extrema.length > 0) {
            html += '<ul>';
            data.extrema.forEach(e => {
                html += `<li>${e.type}: (${e.x} | ${e.y})</li>`;
            });
            html += '</ul>';
        } else {
            html += '<p>Keine gefunden</p>';
        }
        
        // Wendepunkte
        html += '<h4>Wendepunkte:</h4>';
        if (data.inflections.length > 0) {
            html += '<ul>';
            data.inflections.forEach(i => {
                html += `<li>(${i.x} | ${i.y})</li>`;
            });
            html += '</ul>';
        } else {
            html += '<p>Keine gefunden</p>';
        }
        
        html += '</div>';
        
        elements.output.innerHTML = html;
        elements.output.style.display = 'block';
    }

    // ==================== EVENT-HANDLER ====================
    
    if (elements.calcBtn) {
        elements.calcBtn.addEventListener('click', async () => {
            dbLogger.info('Berechnung gestartet');
            
            const input = elements.fxInput.value;
            const parsed = parseFunction(input);
            
            if (!parsed.isValid) {
                elements.output.innerHTML = '<p class="error">❌ Ungültige Funktion</p>';
                elements.output.style.display = 'block';
                dbLogger.error('Ungültige Funktion', { input });
                return;
            }
            
            try {
                const analysisData = await performCurveAnalysis(parsed);
                displayAnalysisData(analysisData);
                dbLogger.info('Berechnung erfolgreich');
            } catch (err) {
                elements.output.innerHTML = '<p class="error">❌ Fehler bei der Berechnung</p>';
                dbLogger.error('Berechnungsfehler', { error: err.message });
            }
        });
    }
    
    if (elements.resetBtn) {
        elements.resetBtn.addEventListener('click', () => {
            elements.fxInput.value = '';
            elements.output.style.display = 'none';
            elements.fxInput.focus();
            dbLogger.info('Formular zurückgesetzt');
        });
    }

    // ==================== INIT ====================
    
    dbLogger.info('db_log.js geladen', { 
        debug: DEBUG_MODE, 
        logging: LOGGING_ENABLED 
    });

})(window);