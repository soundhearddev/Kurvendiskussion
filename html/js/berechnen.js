// ============================================================================
// FUNKTIONSANALYSE-RECHNER
// ============================================================================
// Dieser Code ermöglicht die Analyse mathematischer Funktionen:
// 1. Kurvendiskussion - Mathematische Analyse (Nullstellen, Extrema, etc.)
// ============================================================================

// ----------------------------------------------------------------------------
// DOM-ELEMENTE
// ----------------------------------------------------------------------------
const elements = {
    fxInput: document.getElementById('fx'),
    loading: document.getElementById('loading'),
    output: document.getElementById('output'),
    calcBtn: document.getElementById('calc-btn'),
    resetBtn: document.getElementById('reset-btn'),
    modeRadios: document.querySelectorAll('input[name="mode"]')
};

// ----------------------------------------------------------------------------
// KONSTANTEN UND KONFIGURATION
// ----------------------------------------------------------------------------
const CONFIG = {
    // Graph-Einstellungen (noch nicht implementiert. Für zukünftige Erweiterungen)
    GRAPH: {
        DEFAULT_X_MIN: -10,
        DEFAULT_X_MAX: 10,
        POINT_COUNT: 200,
        STEP_SIZE: 0.1
    },
    
    // Validierung der Funktionseingabe (erlaubte Zeichen, Länge)
    VALIDATION: {
        ALLOWED_CHARS: /^[0-9x\s\+\-\*\/\^\(\)\.\,sincotan]*$/i,
        MAX_LENGTH: 200
    },
    
    // Numerische Berechnungen (Einstellungen für Genauigkeit)
    NUMERICAL: {
        EPSILON: 0.001,           // Genauigkeit für numerische Ableitungen
        TOLERANCE: 0.0001,        // Toleranz für Nullstellensuche
        ZERO_THRESHOLD: 0.001,    // Schwellwert für Nullstellen
        DERIVATIVE_THRESHOLD: 0.05 // Schwellwert für kritische Punkte
    }
};

// ----------------------------------------------------------------------------
// EINGABE-VALIDIERUNG
// ----------------------------------------------------------------------------

/**
 * Validiert die eingegebene mathematische Funktion
 * @param {string} input - Die zu validierende Eingabe
 * @returns {boolean} - true wenn gültig, false sonst
 */
function validateFunction(input) { 
    if (!input || input.trim().length === 0) {
        return false;
    }
    
    if (input.length > CONFIG.VALIDATION.MAX_LENGTH) {
        return false;
    }
    
    // Prüfe auf erlaubte Zeichen
    if (!CONFIG.VALIDATION.ALLOWED_CHARS.test(input)) {
        return false;
    }
    
    // Prüfe auf ausgeglichene Klammern
    const openBrackets = (input.match(/\(/g) || []).length;
    const closeBrackets = (input.match(/\)/g) || []).length;
    if (openBrackets !== closeBrackets) {
        return false;
    }
    
    return true;
}

/**
 * Bereinigt und normalisiert die Funktionseingabe
 * @param {string} input - Die Roheingabe
 * @returns {string} - Die bereinigte Funktion
 */
// macht die funktion halt besser verarbeitbar
// entfernt leerzeichen, ersetzt ** durch ^, ersetzt , durch . und macht alles klein
// z.B. "  Sin(x)  +  2,5  " -> "sin(x)+2.5"
function cleanFunction(input) {
    return input
        .replace(/\s+/g, '')
        .replace(/\*\*/g, '^')
        .replace(/,/g, '.')
        .toLowerCase();
}

/**
 * Analysiert und validiert die Funktionseingabe
 * @param {string} input - Die Benutzereingabe
 * @returns {Object} - Objekt mit Validierungsergebnis und bereinigter Funktion
 */
// kombiniert die funktionen cleanFunction und validateFunction und gibt ein objekt zurück
function parseFunction(input) {
    const cleaned = cleanFunction(input);
    const isValid = validateFunction(cleaned);
    
    return {
        original: input,
        cleaned: cleaned,
        isValid: isValid,
        error: isValid ? null : 'Ungültige Funktion'
    };
}

// ----------------------------------------------------------------------------
// MATHEMATISCHE BERECHNUNGEN
// ----------------------------------------------------------------------------

/**
 * Evaluiert die Funktion für einen gegebenen x-Wert
 * @param {string} func - Die mathematische Funktion (mit 'x' als Variable)
 * @param {number} x - Der x-Wert
 * @returns {number|null} - Der y-Wert oder null bei Fehler
 */
// evaluiert die funktion func an der stelle x (also berechnet f(x))
function evaluateFunction(func, x) {
    try {
        // Ersetze mathematische Funktionen durch JavaScript-Äquivalente (damit die eval-Funktion sie versteht)
        let expression = func
            .replace(/\^/g, '**')
            .replace(/sin/g, 'Math.sin')
            .replace(/cos/g, 'Math.cos')
            .replace(/tan/g, 'Math.tan')
            .replace(/x/g, `(${x})`);

        // Evaluiere den Ausdruck 
        const result = eval(expression);
        
        // Prüfe auf ungültige Ergebnisse 
        if (!isFinite(result)) {
            return null; // Vermeide unendliche oder nicht definierte Werte
        }
        
        return result;
    } catch (error) {
        return null; // Bei Fehlern während der Auswertung
    }
}

/**
 * Berechnet die erste Ableitung numerisch
 * @param {string} func - Die Funktion
 * @param {number} x - Der x-Wert
 * @returns {number|null} - Die Ableitung an der Stelle x
 */
// zentrale differenzenformel zur berechnung der ersten ableitung
function calculateDerivative(func, x) {
    const h = CONFIG.NUMERICAL.EPSILON;
    const y1 = evaluateFunction(func, x + h);
    const y2 = evaluateFunction(func, x - h);
    
    // also wenn eine der beiden auswertungen fehlschlägt, gib null zurück (also nochmal sicherheit)
    if (y1 === null || y2 === null) {
        return null;
    }
    
    // Zentrale Differenzenformel: f'(x) ≈ [f(x+h) - f(x-h)] / (2h) 
    return (y1 - y2) / (2 * h);
}

/**
 * Berechnet die zweite Ableitung numerisch
 * @param {string} func - Die Funktion
 * @param {number} x - Der x-Wert
 * @returns {number|null} - Die zweite Ableitung an der Stelle x
 */
// zentrale differenzenformel zur berechnung der zweiten ableitung (also die ableitung der ableitung... besser gesagt die krümmung)
function calculateSecondDerivative(func, x) {
    const h = CONFIG.NUMERICAL.EPSILON;
    const y0 = evaluateFunction(func, x);
    const y1 = evaluateFunction(func, x + h);
    const y2 = evaluateFunction(func, x - h);
    
    if (y0 === null || y1 === null || y2 === null) {
        return null;
    }
    
    // Zweite Ableitung: f''(x) ≈ [f(x+h) - 2f(x) + f(x-h)] / h²
    // (also wie stark sich die erste ableitung ändert)
    return (y1 - 2 * y0 + y2) / (h * h);
}

// ----------------------------------------------------------------------------
// KURVENDISKUSSION - HAUPTANALYSE
// ----------------------------------------------------------------------------
// hier werden alle wichtigen eigenschaften der funktion berechnet
// wie nullstellen, extremstellen (maxima und minima) und wendepunkte
// ----------------------------------------------------------------------------
/**
 * Findet Nullstellen der Funktion im gegebenen Bereich
 * @param {string} func - Die Funktion
 * @param {number} xMin - Minimaler x-Wert
 * @param {number} xMax - Maximaler x-Wert
 * @returns {Array} - liste von Nullstellen
 */

function findZeros(func, xMin, xMax) {
    const zeros = [];
    const step = 0.1;
    
    // Prüfe zuerst ob f(xMin) selbst eine Nullstelle ist
    const yMin = evaluateFunction(func, xMin);
    if (yMin !== null && Math.abs(yMin) < CONFIG.NUMERICAL.ZERO_THRESHOLD) {
        zeros.push(xMin);
    }
    
    let prevY = yMin;
    let prevX = xMin;
    
    for (let x = xMin + step; x <= xMax; x += step) {
        const y = evaluateFunction(func, x);
        
        if (y === null) {
            prevY = y;
            prevX = x;
            continue;
        }
        
        // Prüfe ob y selbst nahe null ist
        if (Math.abs(y) < CONFIG.NUMERICAL.ZERO_THRESHOLD) {
            // Prüfe ob nicht zu nahe an letzter Nullstelle
            if (zeros.length === 0 || Math.abs(x - zeros[zeros.length - 1]) > 0.5) {
                zeros.push(x);
            }
        }
        // Vorzeichenwechsel erkannt
        else if (prevY !== null && (prevY < 0 && y > 0) || (prevY > 0 && y < 0)) {
            const zero = bisection(func, prevX, x);
            if (zero !== null) {
                // Prüfe ob nicht zu nahe an letzter Nullstelle
                if (zeros.length === 0 || Math.abs(zero - zeros[zeros.length - 1]) > 0.5) {
                    zeros.push(zero);
                }
            }
        }
        
        prevY = y;
        prevX = x;
    }
    
    return zeros;
}

/**
 * Bisektionsverfahren zur präzisen Nullstellenbestimmung
 * @param {string} func - Die Funktion
 * @param {number} a - Linke Intervallgrenze
 * @param {number} b - Rechte Intervallgrenze
 * @returns {number|null} - Die Nullstelle oder null
 */
function bisection(func, a, b) {
    let fa = evaluateFunction(func, a);
    let fb = evaluateFunction(func, b);
    
    if (fa === null || fb === null) return null;
    
    const maxIterations = 50;
    
    for (let i = 0; i < maxIterations; i++) {
        const c = (a + b) / 2;
        const fc = evaluateFunction(func, c);
        
        if (fc === null) return null;
        
        if (Math.abs(fc) < CONFIG.NUMERICAL.TOLERANCE) {
            return c;
        }
        
        if (Math.sign(fc) === Math.sign(fa)) {
            a = c;
            fa = fc;
        } else {
            b = c;
            fb = fc;
        }
        
        if (Math.abs(b - a) < CONFIG.NUMERICAL.TOLERANCE) {
            return (a + b) / 2;
        }
    }
    
    return (a + b) / 2;
}

/**
 * Findet Extremstellen (Maxima und Minima)
 * @param {string} func - Die Funktion
 * @param {number} xMin - Minimaler x-Wert
 * @param {number} xMax - Maximaler x-Wert
 * @returns {Object} - Objekt mit Maxima und Minima
 */
function findExtrema(func, xMin, xMax) {
    const extrema = { maxima: [], minima: [] };
    const step = 0.2;
    
    for (let x = xMin; x <= xMax; x += step) {
        const derivative = calculateDerivative(func, x);
        
        if (derivative === null) continue;
        
        // Prüfe ob erste Ableitung nahe null (kritischer Punkt)
        if (Math.abs(derivative) < CONFIG.NUMERICAL.DERIVATIVE_THRESHOLD) {
            const secondDerivative = calculateSecondDerivative(func, x);
            
            if (secondDerivative === null) continue;
            
            const y = evaluateFunction(func, x);
            if (y === null) continue;
            
            // Klassifiziere mit zweiter Ableitung
            if (secondDerivative > 0.1) {
                // Minimum - prüfe ob nicht zu nahe an bestehendem
                if (extrema.minima.length === 0 || 
                    Math.abs(x - extrema.minima[extrema.minima.length - 1].x) > 1.0) {
                    extrema.minima.push({ x: x, y: y });
                }
            } else if (secondDerivative < -0.1) {
                // Maximum - prüfe ob nicht zu nahe an bestehendem
                if (extrema.maxima.length === 0 || 
                    Math.abs(x - extrema.maxima[extrema.maxima.length - 1].x) > 1.0) {
                    extrema.maxima.push({ x: x, y: y });
                }
            }
        }
    }
    
    return extrema;
}

/**
 * Findet Wendepunkte der Funktion
 * @param {string} func - Die Funktion
 * @param {number} xMin - Minimaler x-Wert
 * @param {number} xMax - Maximaler x-Wert
 * @returns {Array} - Array von Wendepunkten
 */
function findInflectionPoints(func, xMin, xMax) {
    const inflectionPoints = [];
    const step = 0.2;
    
    let prevSecondDerivative = calculateSecondDerivative(func, xMin);
    let prevX = xMin;
    
    for (let x = xMin + step; x <= xMax; x += step) {
        const secondDerivative = calculateSecondDerivative(func, x);
        
        if (secondDerivative === null || prevSecondDerivative === null) {
            prevSecondDerivative = secondDerivative;
            prevX = x;
            continue;
        }
        
        // Vorzeichenwechsel der zweiten Ableitung
        if ((prevSecondDerivative < -0.1 && secondDerivative > 0.1) ||
            (prevSecondDerivative > 0.1 && secondDerivative < -0.1)) {
            
            const y = evaluateFunction(func, x);
            if (y !== null) {
                // Prüfe ob nicht zu nahe an bestehendem Wendepunkt
                if (inflectionPoints.length === 0 || 
                    Math.abs(x - inflectionPoints[inflectionPoints.length - 1].x) > 1.0) {
                    inflectionPoints.push({ x: x, y: y });
                }
            }
        }
        
        prevSecondDerivative = secondDerivative;
        prevX = x;
    }
    
    return inflectionPoints;
}

/**
 * Führt eine vollständige Kurvendiskussion durch
 * @param {Object} parsedFunction - Das geparste Funktionsobjekt
 * @returns {Object} - Objekt mit allen Analyseergebnissen
 */
async function performCurveAnalysis(parsedFunction) {
    const func = parsedFunction.cleaned;
    const xMin = CONFIG.GRAPH.DEFAULT_X_MIN;
    const xMax = CONFIG.GRAPH.DEFAULT_X_MAX;

    // Berechne alle relevanten Eigenschaften
    const zeros = findZeros(func, xMin, xMax);
    const extrema = findExtrema(func, xMin, xMax);
    const inflectionPoints = findInflectionPoints(func, xMin, xMax);

    // Berechne y-Achsenabschnitt
    const yIntercept = evaluateFunction(func, 0);

    const analysisData = {
        function: parsedFunction.original,
        cleanedFunction: func,
        domain: "ℝ (alle reellen Zahlen)",
        yIntercept: yIntercept,
        zeros: zeros,
        maxima: extrema.maxima,
        minima: extrema.minima,
        inflectionPoints: inflectionPoints
    };

    // -------------------------
    // Log in die Datenbank
    // -------------------------
    try {
        await fetch('/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                level: 'info',
                message: 'Kurvendiskussion durchgeführt',
                context: {
                    functionInput: parsedFunction.original,
                    zeros: zeros,
                    maxima: extrema.maxima,
                    minima: extrema.minima,
                    yIntercept: yIntercept
                }
            })
        });
    } catch (err) {
        console.error('Log konnte nicht gespeichert werden:', err);
    }

    return analysisData;
}


// ----------------------------------------------------------------------------
// GRAPHENDARSTELLUNG - DATENVORBEREITUNG
// ----------------------------------------------------------------------------

/**
 * Generiert Datenpunkte für die Graphendarstellung
 * @param {Object} parsedFunction - Das geparste Funktionsobjekt
 * @returns {Object} - Objekt mit Graphendaten
 */
function prepareGraphData(parsedFunction) {
    const func = parsedFunction.cleaned;
    const xMin = CONFIG.GRAPH.DEFAULT_X_MIN;
    const xMax = CONFIG.GRAPH.DEFAULT_X_MAX;
    const pointCount = CONFIG.GRAPH.POINT_COUNT;
    
    const dataPoints = [];
    const step = (xMax - xMin) / pointCount;
    
    for (let x = xMin; x <= xMax; x += step) {
        const y = evaluateFunction(func, x);
        if (y !== null) {
            dataPoints.push({ x: x, y: y });
        }
    }
    
    return {
        function: parsedFunction.original,
        cleanedFunction: func,
        xRange: [xMin, xMax],
        dataPoints: dataPoints
    };
}

// ----------------------------------------------------------------------------
// AUSGABE UND DARSTELLUNG
// ----------------------------------------------------------------------------

/**
 * Formatiert eine Zahl für die Anzeige (2 Dezimalstellen)
 * @param {number} num - Die zu formatierende Zahl
 * @returns {string} - Formatierte Zahl
 */
// function formatNumber(num) {
//     return num.toFixed(2);
// }

/**
 * Zeigt die Ergebnisse der Kurvendiskussion an
 * @param {Object} analysisData - Die Analysedaten
 */
function displayAnalysisData(analysisData) {
    let html = `
        <div class="analysis-container">
            <h2>Kurvendiskussion</h2>
            
            <div class="analysis-section">
                <h3>Funktion</h3>
                <p class="function-display">f(x) = ${analysisData.function}</p>
            </div>
            
            <div class="analysis-section">
                <h3>Definitionsbereich</h3>
                <p>D = ${analysisData.domain}</p>
            </div>
    `;
    
    // Y-Achsenabschnitt
    if (analysisData.yIntercept !== null) {
        html += `
            <div class="analysis-section">
                <h3>Y-Achsenabschnitt</h3>
                <p>f(0) = ${formatNumber(analysisData.yIntercept)}</p>
                <p class="detail">Punkt: (0, ${formatNumber(analysisData.yIntercept)})</p>
            </div>
        `;
    }
    
    // Nullstellen
    html += `
        <div class="analysis-section">
            <h3>Nullstellen</h3>
    `;
    if (analysisData.zeros.length > 0) {
        html += '<ul class="results-list">';
        analysisData.zeros.forEach((zero, index) => {
            html += `<li>x<sub>${index + 1}</sub> = ${formatNumber(zero)} → f(${formatNumber(zero)}) ≈ 0</li>`;
        });
        html += '</ul>';
    } else {
        html += '<p class="no-results">Keine Nullstellen im Bereich [-10, 10] gefunden</p>';
    }
    html += '</div>';
    
    // Extremstellen
    html += '<div class="analysis-section"><h3>Extremstellen</h3>';
    
    // Maxima
    if (analysisData.maxima.length > 0) {
        html += '<h4>Hochpunkte (Maxima)</h4><ul class="results-list">';
        analysisData.maxima.forEach((max, index) => {
            html += `<li>H<sub>${index + 1}</sub>(${formatNumber(max.x)} | ${formatNumber(max.y)})</li>`;
        });
        html += '</ul>';
    }
    
    // Minima
    if (analysisData.minima.length > 0) {
        html += '<h4>Tiefpunkte (Minima)</h4><ul class="results-list">';
        analysisData.minima.forEach((min, index) => {
            html += `<li>T<sub>${index + 1}</sub>(${formatNumber(min.x)} | ${formatNumber(min.y)})</li>`;
        });
        html += '</ul>';
    }
    
    if (analysisData.maxima.length === 0 && analysisData.minima.length === 0) {
        html += '<p class="no-results">Keine Extremstellen im Bereich gefunden</p>';
    }
    html += '</div>';
    
    // Wendepunkte
    html += `
        <div class="analysis-section">
            <h3>Wendepunkte</h3>
    `;
    if (analysisData.inflectionPoints.length > 0) {
        html += '<ul class="results-list">';
        analysisData.inflectionPoints.forEach((point, index) => {
            html += `<li>W<sub>${index + 1}</sub>(${formatNumber(point.x)} | ${formatNumber(point.y)})</li>`;
        });
        html += '</ul>';
    } else {
        html += '<p class="no-results">Keine Wendepunkte im Bereich gefunden</p>';
    }
    html += '</div>';
    
    html += '</div>';
    
    elements.output.innerHTML = html;
    elements.output.style.display = 'block';
    showLoading(false);
}

/**
 * Zeigt die Graphendaten an
 * @param {Object} graphData - Die Graphendaten
 */







function displayGraphData(graphData) {
    let html = `
        <div class="graph-container">
            <h2>Graphendarstellung</h2>
            
            <div class="graph-info">
                <p><strong>Funktion:</strong> f(x) = ${graphData.function}</p>
                <p><strong>X-Bereich:</strong> [${graphData.xRange[0]}, ${graphData.xRange[1]}]</p>
            </div>
            
            <div class="graph-view">
                <canvas id="graphCanvas" width="800" height="500"></canvas>
                <p class="graph-help">Benutzen Sie das Mausrad zum Zoomen und ziehen Sie zum Verschieben</p>
            </div>
        </div>
    `;
    
    elements.output.innerHTML = html;
    elements.output.style.display = 'block';
    showLoading(false);

    // Graph-Funktionalität initialisieren
    const canvas = document.getElementById('graphCanvas');
    const ctx = canvas.getContext('2d');

    let scaleX = 50, scaleY = 50, offsetX = 0, offsetY = 0;
    let isDragging = false, dragStart = {x:0, y:0};
    
    // Funktion zum Umrechnen der Koordinaten
    function toCanvasX(x){ return canvas.width/2 + x*scaleX + offsetX; }
    function toCanvasY(y){ return canvas.height/2 - y*scaleY + offsetY; }
    function toMathX(px){ return (px - canvas.width/2 - offsetX)/scaleX; }

    // Graph zeichnen
    function drawGraph(){
        ctx.clearRect(0,0,canvas.width,canvas.height);

        // Achsen zeichnen
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, toCanvasY(0));
        ctx.lineTo(canvas.width, toCanvasY(0));
        ctx.moveTo(toCanvasX(0), 0);
        ctx.lineTo(toCanvasX(0), canvas.height);
        ctx.stroke();

        // Gitterlinien
        ctx.strokeStyle = "#eee";
        ctx.lineWidth = 1;
        for(let i=-20; i<=20; i++){
            ctx.beginPath();
            ctx.moveTo(toCanvasX(i), 0);
            ctx.lineTo(toCanvasX(i), canvas.height);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, toCanvasY(i));
            ctx.lineTo(canvas.width, toCanvasY(i));
            ctx.stroke();
        }

        // Funktion zeichnen
        ctx.strokeStyle = "#007bff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        let first = true;
        for(let px=0; px<=canvas.width; px++){
            const x = toMathX(px);
            let y = evaluateFunction(graphData.cleanedFunction, x);
            if(y === null || !isFinite(y)) continue;
            const py = toCanvasY(y);
            if(first){ 
                ctx.moveTo(px,py); 
                first=false; 
            } else {
                ctx.lineTo(px,py);
            }
        }
        ctx.stroke();
    }

    // Event-Listener für Interaktivität
    canvas.addEventListener('mousedown', e => {
        isDragging = true;
        dragStart.x = e.offsetX;
        dragStart.y = e.offsetY;
    });

    canvas.addEventListener('mouseup', () => isDragging = false);
    canvas.addEventListener('mouseleave', () => isDragging = false);

    canvas.addEventListener('mousemove', e => {
        if(isDragging){
            offsetX += e.offsetX - dragStart.x;
            offsetY += e.offsetY - dragStart.y;
            dragStart.x = e.offsetX;
            dragStart.y = e.offsetY;
            drawGraph();
        }
    });

    canvas.addEventListener('wheel', e => {
        e.preventDefault();
        const zoom = e.deltaY < 0 ? 1.1 : 0.9;
        scaleX *= zoom;
        scaleY *= zoom;
        drawGraph();
    });

    // Initial zeichnen
    drawGraph();
}






/**
 * Zeigt oder verbirgt den Ladezustand
 * @param {boolean} show - true zum Anzeigen, false zum Verbergen
 */
function showLoading(show) {
    elements.loading.style.display = show ? 'flex' : 'none';
}

// ----------------------------------------------------------------------------
// EVENT-HANDLER
// ----------------------------------------------------------------------------

/**
 * Handler für den Berechnen-Button
 */
elements.calcBtn.addEventListener('click', () => {
    const functionInput = elements.fxInput.value;
    
    // Zeige Ladeanzeige
    showLoading(true);
    elements.output.style.display = 'none';
    
    // Parse und validiere die Funktion
    const parsedFunction = parseFunction(functionInput);
    
    if (!parsedFunction.isValid) {
        elements.output.innerHTML = `
            <div class="error-message">
                <h3>Fehler</h3>
                <p>Die eingegebene Funktion ist ungültig.</p>
                <p class="detail">Bitte überprüfen Sie Ihre Eingabe.</p>
                <p class="detail">Erlaubt sind: Zahlen, x, +, -, *, /, ^, (, ), sin, cos, tan</p>
            </div>
        `;
        elements.output.style.display = 'block';
        showLoading(false);
        return;
    }
    
    // Ermittle den ausgewählten Modus
    const selectedMode = document.querySelector('input[name="mode"]:checked');
    const mode = selectedMode ? selectedMode.value : 'analysis';
    
    // Verzögere die Berechnung um 300ms für bessere UX
    setTimeout(() => {
        if (mode === 'graph') {
            // Graph-Modus
            const graphData = prepareGraphData(parsedFunction);
            displayGraphData(graphData);
        } else {
            // Kurvendiskussion-Modus
            const analysisData = performCurveAnalysis(parsedFunction);
            displayAnalysisData(analysisData);
        }
    }, 300);
});






/**
 * Handler für den Reset-Button
 */
elements.resetBtn.addEventListener('click', () => {
    elements.fxInput.value = '';
    elements.output.style.display = 'none';
    showLoading(false);
    elements.fxInput.focus();
});

/**
 * Handler für Enter-Taste im Eingabefeld
 */
elements.fxInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        elements.calcBtn.click();
    }
});

// ----------------------------------------------------------------------------
// INITIALISIERUNG
// ----------------------------------------------------------------------------

// Setze Fokus auf Eingabefeld beim Laden
document.addEventListener('DOMContentLoaded', () => {
    elements.fxInput.focus();
    console.log('Funktionsanalyse-Rechner initialisiert');
});