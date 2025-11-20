// ============================================================================
// FUNKTIONSANALYSE MIT DATABASE LOGGING
// ============================================================================

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

// ============================================================================
// HILFSFUNKTIONEN
// ============================================================================

const $ = id => document.getElementById(id);

const el = { 
    fx: $('fx'), 
    out: $('output'), 
    load: $('loading'), 
    calc: $('calc-btn'), 
    reset: $('reset-btn') 
};

const cfg = { 
    xMin: -10, 
    xMax: 10, 
    eps: 0.001, 
    tol: 0.0001, 
    maxLen: 200,
    allowedChars: /^[0-9x\s\+\-\*\/\^\(\)\.\,sincotan⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]*$/i
};

// ============================================================================
// SUPERSCRIPT → NORMALFORM
// ============================================================================

function replaceSuperscripts(s) {
    const map = {
        "⁰":"0","¹":"1","²":"2","³":"3","⁴":"4","⁵":"5",
        "⁶":"6","⁷":"7","⁸":"8","⁹":"9","⁺":"+","⁻":"-"
    };

    // Finde superscript-Folgen wie ³⁴⁵ oder ⁻² → mache daraus ^345 bzw. ^-2
    return s.replace(/([⁺⁻]?[⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g, match => {
        const normal = match.split("").map(ch => map[ch] || ch).join("");
        return "^" + normal;
    });
}

// ============================================================================
// CLEANING
// ============================================================================

function clean(s) {
    let out = s
        .replace(/\s+/g, '')     // Leerzeichen weg
        .replace(/\*\*/g, '^')   // ** → ^
        .replace(/,/g, '.')      // , → .
        .toLowerCase();

    // Unicode-Hochzahlen in Normalformat umwandeln
    out = replaceSuperscripts(out);

    return out;
}

// ============================================================================
// VALIDATION
// ============================================================================

function validate(s) {
    return (
        s &&
        s.length <= cfg.maxLen &&
        cfg.allowedChars.test(s) &&
        (s.match(/\(/g) || []).length === (s.match(/\)/g) || []).length
    );
}

// ============================================================================
// PARSER
// ============================================================================

function parse(s) {
    const cleaned = clean(s);
    const parsed = { 
        orig: s,
        clean: cleaned,
        valid: validate(cleaned)
    };

    dbLogger.debug('Funktion geparst', 'parse', 'validation', {
        original: s,
        cleaned: parsed.clean,
        valid: parsed.valid
    });

    return parsed;
}



// ============================================================================
// MULTIPLE FUNCTIONS HANDLING
// ============================================================================

const DEFAULT_COLORS = ['#007bff', '#28a745', '#dc3545', '#ffc107', '#6f42c1', '#20c997'];

// Get or create container for additional function rows
const funcsContainer = (() => {
    let c = document.getElementById('functions-container');
    if (c) return c;
    const wrapper = document.createElement('div');
    wrapper.id = 'functions-container';
    wrapper.className = 'functions-container';
    const inputWrapper = document.querySelector('.input-wrapper');
    if (inputWrapper?.parentNode) inputWrapper.parentNode.insertBefore(wrapper, inputWrapper.nextSibling);
    return wrapper;
})();

// Create new function input row
const createFunctionRow = (value = '', color = '') => {
    const row = document.createElement('div');
    row.className = 'func-row';

    const inp = document.createElement('input');
    inp.type = 'text';
    inp.className = 'fx-multi';
    inp.placeholder = 'z.B. 2*x^2 + 3*x - 5';
    inp.value = value;

    const col = document.createElement('input');
    col.type = 'color';
    col.className = 'fx-color';
    col.value = color || DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)];

    const rm = document.createElement('button');
    rm.type = 'button';
    rm.className = 'remove-func-btn';
    rm.innerText = 'Entfernen';
    rm.onclick = () => row.remove();

    row.append(inp, col, rm);
    return row;
};

// Add color picker to main input
(() => {
    const existing = document.getElementById('fx');
    if (!existing || document.getElementById('fx-color')) return;

    const color = document.createElement('input');
    color.type = 'color';
    color.id = 'fx-color';
    color.className = 'fx-color';
    color.value = DEFAULT_COLORS[0];
    existing.parentNode.appendChild(color);
})();

// Add new function button handler
document.getElementById('spawn-new-func').onclick = (e) => {
    e.preventDefault();
    const row = createFunctionRow('', DEFAULT_COLORS[functionsCount() % DEFAULT_COLORS.length]);
    funcsContainer.appendChild(row);
    dbLogger.info('Neue Funktion hinzugefügt', 'spawn-new-func', 'ui');
};

// Collect all functions with colors
const functionsCount = () => document.querySelectorAll('.fx-multi').length + (document.getElementById('fx') ? 1 : 0);

const collectFunctions = () => {
    const list = [];
    const main = document.getElementById('fx');
    const mainColor = document.getElementById('fx-color')?.value || DEFAULT_COLORS[0];
    if (main?.value.trim()) list.push({ orig: main.value, color: mainColor });

    document.querySelectorAll('.func-row').forEach(row => {
        const inp = row.querySelector('.fx-multi');
        const col = row.querySelector('.fx-color');
        if (inp?.value.trim()) list.push({ orig: inp.value, color: col?.value || DEFAULT_COLORS[0] });
    });

    return list;
};

// Display combined analysis results
const showAnalysesCombined = (results) => {
    let out = '<div class="analysis-multi"><h2>Kurvendiskussion (Mehrfach)</h2>';
    results.forEach((d, idx) => {
        out += `<div class="analysis-container" style="border-left:6px solid ${d.color};padding-left:8px;margin-bottom:12px;">`;
        out += `<h3>f${idx + 1}(x) = ${d.fn}</h3>`;
        out += `<p><strong>f(0):</strong> ${fmt(d.y0)}</p>`;
        out += `<p><strong>Nullstellen:</strong> ${d.zeros.length ? d.zeros.map(z => fmt(z)).join(', ') : 'Keine'}</p>`;
        out += `<p><strong>Hochpunkte:</strong> ${d.maxs.length ? d.maxs.map(m => `(${fmt(m.x)}, ${fmt(m.y)})`).join(', ') : 'Keine'}</p>`;
        out += `<p><strong>Tiefpunkte:</strong> ${d.mins.length ? d.mins.map(m => `(${fmt(m.x)}, ${fmt(m.y)})`).join(', ') : 'Keine'}</p>`;
        out += `<p><strong>Wendepunkte:</strong> ${d.wende.length ? d.wende.map(w => `(${fmt(w.x)}, ${fmt(w.y)})`).join(', ') : 'Keine'}</p>`;
        out += `</div>`;
    });
    out += '</div>';
    el.out.innerHTML = out;
    el.out.style.display = 'block';
    el.load.style.display = 'none';
    dbLogger.info('Mehrfach-Analysen angezeigt', 'showAnalysesCombined', 'display', { count: results.length });
};

// Render multiple function graphs
const showGraphMultiple = (funcs) => {
    const startTime = performance.now();
    dbLogger.info('Multi-Graph-Renderer gestartet', 'showGraphMultiple', 'graph', { count: funcs.length });

    el.out.innerHTML = '<canvas id="c" width="900" height="600"></canvas>';
    el.out.style.display = 'block';
    el.load.style.display = 'none';

    const c = document.getElementById('c');
    const ctx = c.getContext('2d');
    let sx = 40, sy = 40, ox = 0, oy = 0, drag = false, dx = 0, dy = 0;
    const toX = x => c.width / 2 + x * sx + ox;
    const toY = y => c.height / 2 - y * sy + oy;
    const fromX = px => (px - c.width / 2 - ox) / sx;

    const draw = () => {
        ctx.clearRect(0, 0, c.width, c.height);
        
        // Grid
        ctx.strokeStyle = '#f0f0f0';
        ctx.lineWidth = 1;
        for (let i = -40; i <= 40; i++) {
            ctx.beginPath();
            ctx.moveTo(toX(i), 0);
            ctx.lineTo(toX(i), c.height);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, toY(i));
            ctx.lineTo(c.width, toY(i));
            ctx.stroke();
        }
        
        // Axes
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, toY(0));
        ctx.lineTo(c.width, toY(0));
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(toX(0), 0);
        ctx.lineTo(toX(0), c.height);
        ctx.stroke();
        
        // Numbers
        ctx.fillStyle = '#000';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        for (let i = -10; i <= 10; i++) if (i !== 0) ctx.fillText(i, toX(i), toY(0) + 15);
        ctx.textAlign = 'right';
        for (let i = -10; i <= 10; i++) if (i !== 0) ctx.fillText(i, toX(0) - 5, toY(i) + 4);

        // Draw functions
        funcs.forEach((fObj, idx) => {
            ctx.strokeStyle = fObj.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
            ctx.lineWidth = 2;
            ctx.beginPath();
            let first = true;
            for (let px = 0; px <= c.width; px++) {
                const x = fromX(px), y = evalF(fObj.clean, x);
                if (y === null || !isFinite(y)) { first = true; continue; }
                const py = toY(y);
                if (py < -1000 || py > c.height + 1000) { first = true; continue; }
                first ? (ctx.moveTo(px, py), first = false) : ctx.lineTo(px, py);
            }
            ctx.stroke();
        });

        // Legend
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        funcs.forEach((fObj, idx) => {
            const x = 10, y = 20 + idx * 18;
            ctx.fillStyle = fObj.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
            ctx.fillRect(x, y - 10, 12, 12);
            ctx.fillStyle = '#000';
            ctx.fillText(`f${idx + 1}(x) = ${fObj.orig}`, x + 18, y);
        });
    };

    c.onmousedown = e => { drag = true; dx = e.offsetX; dy = e.offsetY; };
    c.onmouseup = c.onmouseleave = () => drag = false;
    c.onmousemove = e => { if (drag) { ox += e.offsetX - dx; oy += e.offsetY - dy; dx = e.offsetX; dy = e.offsetY; draw(); } };
    c.onwheel = e => { e.preventDefault(); const z = e.deltaY < 0 ? 1.1 : 0.9; sx *= z; sy *= z; draw(); };

    draw();

    const duration = performance.now() - startTime;
    dbLogger.info('Multi-Graph gerendert', 'showGraphMultiple', 'graph', { duration_ms: duration.toFixed(2), canvas_size: `${c.width}x${c.height}`, count: funcs.length });
};

// Handle multiple functions calculation
el.calc.addEventListener('click', async (ev) => {
    const collected = collectFunctions();
    if (collected.length <= 1) return;

    ev.stopImmediatePropagation();
    ev.preventDefault();

    el.load.style.display = 'flex';
    el.out.style.display = 'none';

    const mode = document.querySelector('input[name="mode"]:checked')?.value || 'analysis';

    dbLogger.info('Berechnung (Mehrfach) gestartet', 'calc.multi', mode, { count: collected.length });

    const parsedList = collected.map(c => ({ ...parse(c.orig), color: c.color, orig: c.orig }));

    const invalid = parsedList.filter(p => !p.valid);
    if (invalid.length) {
        el.out.innerHTML = `<p class="error">❌ Mindestens eine Funktion ungültig: ${invalid.map(i => i.orig).join(', ')}</p>`;
        el.out.style.display = 'block';
        el.load.style.display = 'none';
        dbLogger.warning('Ungültige Funktionen in Mehrfach-Berechnung', 'calc.multi', 'validation', { invalid: invalid.map(i => i.orig) });
        return;
    }

    if (mode === 'graph') {
        showGraphMultiple(parsedList.map(p => ({ orig: p.orig, clean: p.clean, color: p.color })));
    } else {
        const results = await Promise.all(parsedList.map(p => analyze(p).then(r => ({ ...r, color: p.color }))));
        showAnalysesCombined(results);
    }
}, true);

// ============================================================================
// FUNCTION EVALUATION
// ============================================================================

/**
 * gibt an was es braucht und was es zurückgibt
 * @param {string} f - Function string (e.g., "2*x^2 + 3*x - 5")
 * @param {number} x - The x value to evaluate at
 * @returns {number|null} - The result or null if evaluation failed
 */
const evalF = (f, x) => {
    try {
        // Replace mathematical notation with JavaScript equivalents
        let expr = f
            .replace(/\^/g, '**')           // x^2 → x**2
            .replace(/sin/g, 'Math.sin')    // sin → Math.sin
            .replace(/cos/g, 'Math.cos')    // cos → Math.cos
            .replace(/tan/g, 'Math.tan')    // tan → Math.tan
            .replace(/x/g, `(${x})`);       // x → (value)

        // Evaluate the expression
        const result = eval(expr);

        // Return result only if it's a valid finite number
        return isFinite(result) ? result : null;

    } catch (err) {
        dbLogger.error('Fehler bei Funktionsauswertung', 'evalF', 'calculation', {
            function: f,
            x: x,
            error: err.message
        });
        return null;
    }
};

// ============================================================================
// DERIVATIVES (ABLEITUNGEN)
// ============================================================================

/**
 * Calculates the first derivative of a function at point x using central difference
 * Formula: f'(x) ≈ (f(x+h) - f(x-h)) / (2h)
 * @param {string} f - Function string
 * @param {number} x - Point to evaluate derivative at
 * @returns {number|null} - First derivative value or null if calculation failed
 */
const deriv1 = (f, x) => {
    const h = cfg.eps;
    const y1 = evalF(f, x + h);
    const y2 = evalF(f, x - h);
    
    if (y1 === null || y2 === null) return null;
    
    return (y1 - y2) / (2 * h);
};

/**
 * Calculates the second derivative of a function at point x
 * Formula: f''(x) ≈ (f(x+h) - 2f(x) + f(x-h)) / h²
 * @param {string} f - Function string
 * @param {number} x - Point to evaluate second derivative at
 * @returns {number|null} - Second derivative value or null if calculation failed
 */
const deriv2 = (f, x) => {
    const h = cfg.eps;
    const y0 = evalF(f, x);
    const y1 = evalF(f, x + h);
    const y2 = evalF(f, x - h);
    
    if (y0 === null || y1 === null || y2 === null) return null;
    
    return (y1 - 2 * y0 + y2) / (h * h);
};

// ============================================================================
// ZEROS (NULLSTELLEN)
// ============================================================================

/**
 * Finds all zeros (roots) of a function in the given interval using sign changes
 * and Newton's method for refinement
 * @param {string} f - Function string
 * @param {number} xMin - Start of search interval
 * @param {number} xMax - End of search interval
 * @returns {number[]} - Array of x-coordinates where f(x) = 0
 */
const findZeros = (f, xMin, xMax) => {
    const startTime = performance.now();
    const zeros = [];
    const step = 0.1;
    const minDistance = 0.5; // Minimum distance between zeros to avoid duplicates
    const newtonIterations = 20;
    
    let previousY = evalF(f, xMin);
    
    // Scan through interval looking for sign changes
    for (let x = xMin + step; x <= xMax; x += step) {
        const currentY = evalF(f, x);
        
        // Check for sign change (indicates a zero crossing)
        if (currentY !== null && previousY !== null) {
            const hasSignChange = (previousY < 0 && currentY > 0) || (previousY > 0 && currentY < 0);
            
            if (hasSignChange) {
                // Refine zero using Newton's method
                let zero = x - step / 2; // Start at midpoint
                
                for (let i = 0; i < newtonIterations; i++) {
                    const fy = evalF(f, zero);
                    const dy = deriv1(f, zero);
                    
                    if (dy !== null && Math.abs(dy) > 0.001) {
                        zero = zero - fy / dy; // Newton's method: x_new = x - f(x)/f'(x)
                    }
                }
                
                // Add zero if it's not too close to an existing one
                const isDuplicate = zeros.some(existingZero => Math.abs(zero - existingZero) < minDistance);
                if (!isDuplicate) {
                    zeros.push(zero);
                }
            }
        }
        
        previousY = currentY;
    }
    
    const duration = performance.now() - startTime;
    
    dbLogger.info(`${zeros.length} Nullstellen gefunden`, 'findZeros', 'analysis', {
        function: f,
        count: zeros.length,
        zeros: zeros.map(z => z.toFixed(4)),
        duration_ms: duration.toFixed(2)
    });
    
    return zeros;
};
// ============================================================================
// EXTREMA (HOCH- UND TIEFPUNKTE)
// ============================================================================

/**
 * Finds all local maxima and minima of a function in the given interval
 * Uses first derivative (f'(x) ≈ 0) and second derivative test (f''(x) < 0 for max, > 0 for min)
 * @param {string} f - Function string
 * @param {number} xMin - Start of search interval
 * @param {number} xMax - End of search interval
 * @returns {{maxs: Array<{x: number, y: number}>, mins: Array<{x: number, y: number}>}} - Arrays of maxima and minima points
 */
const findExtrema = (f, xMin, xMax) => {
    const startTime = performance.now();
    const maxs = [];
    const mins = [];
    const step = 0.2;
    const firstDerivThreshold = 0.05; // f'(x) close to zero
    const secondDerivThreshold = 0.1; // f''(x) significant enough
    const minDistance = 1; // Minimum distance between extrema to avoid duplicates
    
    for (let x = xMin; x <= xMax; x += step) {
        const firstDeriv = deriv1(f, x);
        const secondDeriv = deriv2(f, x);
        
        // Check if first derivative is close to zero (critical point)
        if (firstDeriv === null || Math.abs(firstDeriv) >= firstDerivThreshold) continue;
        if (secondDeriv === null) continue;
        
        const y = evalF(f, x);
        if (y === null) continue;
        
        // Second derivative test
        const isMinimum = secondDeriv > secondDerivThreshold;
        const isMaximum = secondDeriv < -secondDerivThreshold;
        
        // Add minimum if it's far enough from previous ones
        if (isMinimum) {
            const isDuplicate = mins.some(min => Math.abs(x - min.x) < minDistance);
            if (!isDuplicate) {
                mins.push({ x, y });
            }
        }
        
        // Add maximum if it's far enough from previous ones
        if (isMaximum) {
            const isDuplicate = maxs.some(max => Math.abs(x - max.x) < minDistance);
            if (!isDuplicate) {
                maxs.push({ x, y });
            }
        }
    }
    
    const duration = performance.now() - startTime;
    
    dbLogger.info(`${maxs.length} Hochpunkte, ${mins.length} Tiefpunkte gefunden`, 'findExtrema', 'analysis', {
        function: f,
        maxima: maxs.length,
        minima: mins.length,
        maxPoints: maxs.map(m => `(${m.x.toFixed(2)}, ${m.y.toFixed(2)})`),
        minPoints: mins.map(m => `(${m.x.toFixed(2)}, ${m.y.toFixed(2)})`),
        duration_ms: duration.toFixed(2)
    });
    
    return { maxs, mins };
};

// ============================================================================
// INFLECTION POINTS (WENDEPUNKTE)
// ============================================================================

/**
 * Finds all inflection points of a function in the given interval
 * Uses sign changes in the second derivative (f''(x) changes from + to - or - to +)
 * @param {string} f - Function string
 * @param {number} xMin - Start of search interval
 * @param {number} xMax - End of search interval
 * @returns {Array<{x: number, y: number}>} - Array of inflection points
 */
const findWende = (f, xMin, xMax) => {
    const startTime = performance.now();
    const wende = [];
    const step = 0.2;
    const secondDerivThreshold = 0.1; // f''(x) significant enough to detect sign change
    const minDistance = 1; // Minimum distance between inflection points to avoid duplicates
    
    let previousSecondDeriv = deriv2(f, xMin);
    
    // Scan through interval looking for sign changes in second derivative
    for (let x = xMin + step; x <= xMax; x += step) {
        const currentSecondDeriv = deriv2(f, x);
        
        if (previousSecondDeriv === null || currentSecondDeriv === null) {
            previousSecondDeriv = currentSecondDeriv;
            continue;
        }
        
        // Check for sign change in second derivative (indicates inflection point)
        const hasSignChange = 
            (previousSecondDeriv < -secondDerivThreshold && currentSecondDeriv > secondDerivThreshold) ||
            (previousSecondDeriv > secondDerivThreshold && currentSecondDeriv < -secondDerivThreshold);
        
        if (hasSignChange) {
            const y = evalF(f, x);
            
            if (y !== null) {
                // Add inflection point if it's far enough from previous ones
                const isDuplicate = wende.some(w => Math.abs(x - w.x) < minDistance);
                if (!isDuplicate) {
                    wende.push({ x, y });
                }
            }
        }
        
        previousSecondDeriv = currentSecondDeriv;
    }
    
    const duration = performance.now() - startTime;
    
    dbLogger.info(`${wende.length} Wendepunkte gefunden`, 'findWende', 'analysis', {
        function: f,
        count: wende.length,
        points: wende.map(w => `(${w.x.toFixed(2)}, ${w.y.toFixed(2)})`),
        duration_ms: duration.toFixed(2)
    });
    
    return wende;
};




// ============================================================================
// ANALYSIS FUNCTION
// ============================================================================

/**
 * Performs complete curve analysis on a function
 * Finds zeros, extrema, inflection points, and y-intercept
 * @param {Object} p - Parsed function object
 * @param {string} p.orig - Original function string
 * @param {string} p.clean - Cleaned function string for evaluation
 * @returns {Promise<Object>} - Analysis results object
 */
const analyze = async (p) => {
    const startTime = performance.now();
    
    dbLogger.info('Analyse gestartet', 'analyze', 'calculation', {
        function: p.orig
    });
    
    // Calculate y-intercept (f(0))
    const y0 = evalF(p.clean, 0);
    
    // Find zeros in interval [-10, 10]
    const zeros = findZeros(p.clean, -10, 10);
    
    // Find extrema (maxima and minima) in interval [-10, 10]
    const { maxs, mins } = findExtrema(p.clean, -10, 10);
    
    // Find inflection points in interval [-10, 10]
    const wende = findWende(p.clean, -10, 10);
    
    const duration = performance.now() - startTime;
    
    dbLogger.info('Analyse abgeschlossen', 'analyze', 'calculation', {
        function: p.orig,
        duration_ms: duration.toFixed(2),
        zeros_count: zeros.length,
        maxima_count: maxs.length,
        minima_count: mins.length,
        inflection_count: wende.length
    });
    
    return {
        fn: p.orig,
        y0,
        zeros,
        maxs,
        mins,
        wende
    };
};









// ============================================================================
// DISPLAY FORMATTING
// ============================================================================

/**
 * Formats a number for display, handling null/infinite values
 * @param {number|null} n - Number to format
 * @returns {string} - Formatted number string or 'n/a' if invalid
 */
const fmt = n => {
    if (n === null || !isFinite(n)) return 'n/a';
    return n.toFixed(2);
};

// ============================================================================
// ANALYSIS RESULTS DISPLAY
// ============================================================================

/**
 * Displays the complete curve analysis results in the output container
 * @param {Object} d - Analysis data object
 * @param {string} d.fn - Function string
 * @param {number} d.y0 - Y-intercept value
 * @param {number[]} d.zeros - Array of zeros
 * @param {Array<{x: number, y: number}>} d.maxs - Array of maxima points
 * @param {Array<{x: number, y: number}>} d.mins - Array of minima points
 * @param {Array<{x: number, y: number}>} d.wende - Array of inflection points
 */
const showAnalysis = (d) => {
    let html = `<div class="analysis-container">`;
    html += `<h2>Kurvendiskussion</h2>`;
    html += `<h3>f(x) = ${d.fn}</h3>`;
    
    // Y-intercept
    html += `<h4>Y-Achse:</h4>`;
    html += `<p>f(0) = ${fmt(d.y0)}</p>`;
    
    // Zeros (Nullstellen)
    html += `<h4>Nullstellen:</h4>`;
    if (d.zeros.length) {
        html += `<ul>`;
        html += d.zeros.map((z, i) => `<li>x<sub>${i + 1}</sub> = ${fmt(z)}</li>`).join('');
        html += `</ul>`;
    } else {
        html += '<p>Keine</p>';
    }
    
    // Maxima (Hochpunkte)
    html += `<h4>Hochpunkte:</h4>`;
    if (d.maxs.length) {
        html += `<ul>`;
        html += d.maxs.map((m, i) => `<li>H<sub>${i + 1}</sub>(${fmt(m.x)} | ${fmt(m.y)})</li>`).join('');
        html += `</ul>`;
    } else {
        html += '<p>Keine</p>';
    }
    
    // Minima (Tiefpunkte)
    html += `<h4>Tiefpunkte:</h4>`;
    if (d.mins.length) {
        html += `<ul>`;
        html += d.mins.map((m, i) => `<li>T<sub>${i + 1}</sub>(${fmt(m.x)} | ${fmt(m.y)})</li>`).join('');
        html += `</ul>`;
    } else {
        html += '<p>Keine</p>';
    }
    
    // Inflection points (Wendepunkte)
    html += `<h4>Wendepunkte:</h4>`;
    if (d.wende.length) {
        html += `<ul>`;
        html += d.wende.map((w, i) => `<li>W<sub>${i + 1}</sub>(${fmt(w.x)} | ${fmt(w.y)})</li>`).join('');
        html += `</ul>`;
    } else {
        html += '<p>Keine</p>';
    }
    
    html += '</div>';
    
    el.out.innerHTML = html;
    el.out.style.display = 'block';
    el.load.style.display = 'none';
    
    dbLogger.info('Ergebnisse angezeigt', 'showAnalysis', 'display', {
        function: d.fn
    });
};

// ============================================================================
// GRAPH RENDERING
// ============================================================================

/**
 * Renders an interactive graph of the function on a canvas
 * Supports panning (drag) and zooming (mouse wheel)
 * @param {Object} p - Parsed function object
 * @param {string} p.orig - Original function string
 * @param {string} p.clean - Cleaned function string for evaluation
 */
const showGraph = (p) => {
    const startTime = performance.now();
    
    dbLogger.info('Graphendarstellung gestartet', 'showGraph', 'graph', {
        function: p.orig
    });
    
    // Setup canvas
    el.out.innerHTML = '<canvas id="c" width="800" height="600"></canvas>';
    el.out.style.display = 'block';
    el.load.style.display = 'none';
    
    const canvas = document.getElementById('c');
    const ctx = canvas.getContext('2d');
    const func = p.clean;
    
    // Canvas state
    let scaleX = 40;        // Pixels per unit on X-axis
    let scaleY = 40;        // Pixels per unit on Y-axis
    let offsetX = 0;        // Pan offset X
    let offsetY = 0;        // Pan offset Y
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    
    // Interaction tracking
    let zoomCount = 0;
    let panCount = 0;
    
    // Coordinate transformations
    const toCanvasX = x => canvas.width / 2 + x * scaleX + offsetX;
    const toCanvasY = y => canvas.height / 2 - y * scaleY + offsetY;
    const fromCanvasX = px => (px - canvas.width / 2 - offsetX) / scaleX;
    
    /**
     * Main drawing function - renders grid, axes, labels, and function curve
     */
    const draw = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw grid
        ctx.strokeStyle = '#f0f0f0';
        ctx.lineWidth = 1;
        for (let i = -200; i <= 200; i++) {
            // Vertical lines
            ctx.beginPath();
            ctx.moveTo(toCanvasX(i), 0);
            ctx.lineTo(toCanvasX(i), canvas.height);
            ctx.stroke();
            
            // Horizontal lines
            ctx.beginPath();
            ctx.moveTo(0, toCanvasY(i));
            ctx.lineTo(canvas.width, toCanvasY(i));
            ctx.stroke();
        }
        
        // Draw axes
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        
        // X-axis
        ctx.beginPath();
        ctx.moveTo(0, toCanvasY(0));
        ctx.lineTo(canvas.width, toCanvasY(0));
        ctx.stroke();
        
        // Y-axis
        ctx.beginPath();
        ctx.moveTo(toCanvasX(0), 0);
        ctx.lineTo(toCanvasX(0), canvas.height);
        ctx.stroke();
        
        // Draw X-axis numbers
        ctx.fillStyle = '#000';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        for (let i = -10; i <= 10; i++) {
            if (i !== 0) {
                ctx.fillText(i, toCanvasX(i), toCanvasY(0) + 15);
            }
        }
        
        // Draw Y-axis numbers
        ctx.textAlign = 'right';
        for (let i = -10; i <= 10; i++) {
            if (i !== 0) {
                ctx.fillText(i, toCanvasX(0) - 5, toCanvasY(i) + 4);
            }
        }
        
        // Draw axis labels
        ctx.font = '14px Arial';
        ctx.fillStyle = '#000';
        ctx.fillText('x', canvas.width - 20, toCanvasY(0) - 10);
        ctx.fillText('y', toCanvasX(0) + 15, 20);
        
        // Draw function curve
        ctx.strokeStyle = '#007bff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        let isFirstPoint = true;
        for (let px = 0; px <= canvas.width; px++) {
            const x = fromCanvasX(px);
            const y = evalF(func, x);
            
            // Skip invalid points
            if (y === null || !isFinite(y)) continue;
            
            const py = toCanvasY(y);
            
            // Skip points far outside canvas
            if (py < -100 || py > canvas.height + 100) continue;
            
            if (isFirstPoint) {
                ctx.moveTo(px, py);
                isFirstPoint = false;
            } else {
                ctx.lineTo(px, py);
            }
        }
        ctx.stroke();
    };
    
    // Mouse interaction handlers
    canvas.onmousedown = (e) => {
        isDragging = true;
        dragStartX = e.offsetX;
        dragStartY = e.offsetY;
    };
    
    canvas.onmouseup = canvas.onmouseleave = () => {
        if (isDragging && panCount > 0) {
            dbLogger.debug('Graph verschoben', 'showGraph', 'interaction', {
                function: p.orig,
                offset_x: offsetX,
                offset_y: offsetY
            });
        }
        isDragging = false;
    };
    
    canvas.onmousemove = (e) => {
        if (isDragging) {
            offsetX += e.offsetX - dragStartX;
            offsetY += e.offsetY - dragStartY;
            dragStartX = e.offsetX;
            dragStartY = e.offsetY;
            panCount++;
            draw();
        }
    };
    
    canvas.onwheel = (e) => {
        e.preventDefault();
        
        const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
        scaleX *= zoomFactor;
        scaleY *= zoomFactor;
        zoomCount++;
        draw();
        
        // Log every 5th zoom action
        if (zoomCount % 5 === 0) {
            dbLogger.debug('Graph gezoomt', 'showGraph', 'interaction', {
                function: p.orig,
                scale_x: scaleX.toFixed(2),
                scale_y: scaleY.toFixed(2),
                zoom_count: zoomCount
            });
        }
    };
    
    // Initial draw
    draw();
    
    const duration = performance.now() - startTime;
    
    dbLogger.info('Graph gerendert', 'showGraph', 'graph', {
        function: p.orig,
        duration_ms: duration.toFixed(2),
        canvas_size: `${canvas.width}x${canvas.height}`
    });
};


// ============================================================================
// EVENT HANDLERS
// ============================================================================

/**
 * Calculate button click handler
 * Validates input, determines mode (graph/analysis), and executes calculation
 */
el.calc.onclick = () => {
    // Show loading state
    el.load.style.display = 'flex';
    el.out.style.display = 'none';
    
    // Parse and validate function input
    const parsed = parse(el.fx.value);
    
    if (!parsed.valid) {
        el.out.innerHTML = '<p class="error">❌ Ungültige Funktion</p>';
        el.out.style.display = 'block';
        el.load.style.display = 'none';
        
        dbLogger.warning('Ungültige Funktionseingabe', 'calc.onclick', 'validation', {
            input: el.fx.value,
            cleaned: parsed.clean
        });
        
        return;
    }
    
    // Determine calculation mode
    const mode = document.querySelector('input[name="mode"]:checked')?.value || 'analysis';
    
    dbLogger.info('Berechnung gestartet', 'calc.onclick', mode, {
        function: parsed.orig,
        mode: mode
    });
    
    // Execute calculation after short delay (allows UI to update)
    setTimeout(() => {
        if (mode === 'graph') {
            showGraph(parsed);
        } else {
            analyze(parsed).then(showAnalysis);
        }
    }, 300);
};

/**
 * Reset button click handler
 * Clears input and hides output
 */
el.reset.onclick = () => {
    el.fx.value = '';
    el.out.style.display = 'none';
    el.load.style.display = 'none';
    el.fx.focus();
    
    dbLogger.info('Eingabe zurückgesetzt', 'reset.onclick', 'user_action');
};

/**
 * Function input Enter key handler
 * Triggers calculation when Enter is pressed
 */
el.fx.onkeypress = (e) => {
    if (e.key === 'Enter') {
        dbLogger.debug('Enter-Taste gedrückt', 'fx.onkeypress', 'keyboard_shortcut');
        el.calc.click();
    }
};

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Page initialization after DOM is fully loaded
 * Sets focus and logs initial page state
 */
document.addEventListener('DOMContentLoaded', () => {
    el.fx.focus();
    
    dbLogger.info('Seite geladen', 'DOMContentLoaded', 'page_load', {
        userAgent: navigator.userAgent,
        language: navigator.language,
        screenSize: `${screen.width}x${screen.height}`
    });
});

// ============================================================================
// GLOBAL ERROR HANDLERS
// ============================================================================

/**
 * Global error handler for uncaught JavaScript errors
 */
window.addEventListener('error', (event) => {
    dbLogger.error('Globaler Fehler', 'window.error', 'error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
    });
});

/**
 * Global handler for unhandled Promise rejections
 */
window.addEventListener('unhandledrejection', (event) => {
    dbLogger.error('Unhandled Promise Rejection', 'unhandledrejection', 'error', {
        reason: event.reason
    });
});