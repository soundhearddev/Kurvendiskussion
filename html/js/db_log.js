// ======================================================
// db_logger.js - Funktionsanalyse & Logging
// ======================================================

(function(global){

    const LOGGING_ENABLED = true; // true = Logs an /log.php schicken

    async function logToServer(level, message, context){
        if(!LOGGING_ENABLED) return;
        try{
            const payload = {
                level,
                message,
                context: context || {},
                timestamp: new Date().toISOString()
            };

            const res = await fetch('php/logs.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if(!res.ok) console.warn('Logger: server returned', res.status);
        } catch(err){
            console.warn('Logger: send failed', err);
        }
    }

    const dbLogger = {
        info: (msg, ctx) => { console.log('[INFO]', msg, ctx); logToServer('info', msg, ctx); },
        warn: (msg, ctx) => { console.warn('[WARN]', msg, ctx); logToServer('warn', msg, ctx); },
        error: (msg, ctx) => { console.error('[ERROR]', msg, ctx); logToServer('error', msg, ctx); },
        _getQueue: () => [] // optional
    };

    global.dbLogger = dbLogger;

    // =========================
    // Funktionsanalyse-Code
    // =========================

    const elements = {
        fxInput: document.getElementById('fx'),
        output: document.getElementById('output'),
        calcBtn: document.getElementById('calc-btn'),
        resetBtn: document.getElementById('reset-btn'),
        modeRadios: document.querySelectorAll('input[name="mode"]')
    };

    const CONFIG = {
        GRAPH: { DEFAULT_X_MIN: -10, DEFAULT_X_MAX: 10, POINT_COUNT: 200, STEP_SIZE: 0.1 },
        VALIDATION: { ALLOWED_CHARS: /^[0-9x\s\+\-\*\/\^\(\)\.\,sincotan]*$/i, MAX_LENGTH: 200 },
        NUMERICAL: { EPSILON:0.001, TOLERANCE:0.0001, ZERO_THRESHOLD:0.001, DERIVATIVE_THRESHOLD:0.05 },
        LOGGING_ENABLED: LOGGING_ENABLED
    };

    function validateFunction(input){
        if(!input || input.length>CONFIG.VALIDATION.MAX_LENGTH) return false;
        if(!CONFIG.VALIDATION.ALLOWED_CHARS.test(input)) return false;
        return (input.match(/\(/g)||[]).length === (input.match(/\)/g)||[]).length;
    }

    function cleanFunction(input){ return input.replace(/\s+/g,'').replace(/\*\*/g,'^').replace(/,/g,'.').toLowerCase(); }
    function parseFunction(input){ const c=cleanFunction(input); return { original: input, cleaned:c, isValid: validateFunction(c), error: validateFunction(c)?null:'Ungültige Funktion' }; }
    function evaluateFunction(func, x){ try{ return eval(func.replace(/\^/g,'**').replace(/sin/g,'Math.sin').replace(/cos/g,'Math.cos').replace(/tan/g,'Math.tan').replace(/x/g,`(${x})`)); } catch{ return null; } }
    function calculateDerivative(func,x){ const h=CONFIG.NUMERICAL.EPSILON, y1=evaluateFunction(func,x+h),y2=evaluateFunction(func,x-h); return y1!==null && y2!==null?(y1-y2)/(2*h):null; }
    function calculateSecondDerivative(func,x){ const h=CONFIG.NUMERICAL.EPSILON, y0=evaluateFunction(func,x),y1=evaluateFunction(func,x+h),y2=evaluateFunction(func,x-h); return y0!==null && y1!==null && y2!==null?(y1-2*y0+y2)/(h*h):null; }

    // ... hier kannst du alle deine Funktionen wie findZeros, findExtrema, findInflectionPoints, performCurveAnalysis etc. einfügen

    // =========================
    // Event-Handler
    // =========================

    elements.calcBtn.addEventListener('click', async () => {
        const parsed = parseFunction(elements.fxInput.value);
        if(!parsed.isValid){ elements.output.innerHTML='<p>Ungültige Funktion</p>'; return; }

        const analysisData = await performCurveAnalysis(parsed); // Log inside
        displayAnalysisData(analysisData);                        // Zeigt Ergebnisse
        dbLogger.info('Kurvendiskussion durchgeführt', {input: parsed.original});
    });

    elements.resetBtn.addEventListener('click', ()=>{
        elements.fxInput.value='';
        elements.output.style.display='none';
        elements.fxInput.focus();
    });

})(window);
