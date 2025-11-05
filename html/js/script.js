
const fxInput = document.getElementById('fx');
const loading = document.getElementById('loading');
const output = document.getElementById('output');
const calcBtn = document.getElementById('calc-btn');
const resetBtn = document.getElementById('reset-btn');

// Funktion zur Validierung der Eingabe
function validateFunction(input) {
    // Erlaubte mathematische Ausdrücke und Operatoren
    const validChars = /^[0-9x\s\+\-\*\/\^\(\)\.\,\sin\scos\stan]*$/;
    return validChars.test(input);
}

// Funktion zum Parsen der Eingabe
function parseFunction(input) {
    try {
        // Bereinige die Eingabe
        const cleanInput = input.replace(/\s+/g, '')
                              .replace(/\*\*/g, '^')
                              .toLowerCase();
        
        return {
            originalFunction: input,
            cleanFunction: cleanInput,
            isValid: validateFunction(cleanInput)
        };
    } catch (error) {
        return {
            originalFunction: input,
            cleanFunction: '',
            isValid: false,
            error: error.message
        };
    }
}

// Event Handler für Berechnungsbutton
calcBtn.addEventListener('click', () => {
    const functionInput = fxInput.value;
    showLoading(true);
    
    // Parse die Funktion
    const parsedFunction = parseFunction(functionInput);
    
    if (!parsedFunction.isValid) {
        output.innerHTML = '<div class="error">Ungültige Funktion. Bitte überprüfen Sie Ihre Eingabe.</div>';
        output.style.display = 'block';
        showLoading(false);
        return;
    }

    // Hole den ausgewählten Modus
    const mode = document.querySelector('input[name="mode"]:checked').value;
    
    if (mode === 'graph') {
        prepareGraphData(parsedFunction);
    } else {
        prepareAnalysisData(parsedFunction);
    }
});

// Funktion zur Vorbereitung der Graphendaten
function prepareGraphData(parsedFunction) {
    // Hier würden später die x-y Koordinaten berechnet
    const graphData = {
        function: parsedFunction.cleanFunction,
        xRange: [-10, 10], // Standard x-Bereich
        pointCount: 100    // Anzahl der zu berechnenden Punkte
    };
    
    displayGraphData(graphData);
}

// Funktion zur Vorbereitung der Analysedaten
function prepareAnalysisData(parsedFunction) {
    // Hier würden später die Analysedaten berechnet
    const analysisData = {
        function: parsedFunction.cleanFunction,
        domain: "ℝ", // Standardmäßig alle reellen Zahlen
        type: "Noch nicht berechnet"
    };
    
    displayAnalysisData(analysisData);
}

// Funktion zum Anzeigen der Graphendaten
function displayGraphData(data) {
    output.innerHTML = `
        <h2>Graphendarstellung</h2>
        <p>Funktion: f(x) = ${data.function}</p>
        <p>X-Bereich: [${data.xRange[0]}, ${data.xRange[1]}]</p>
        <div id="graph-container">
            <!-- Hier würde später der Graph gezeichnet -->
            <p>Graph wird vorbereitet...</p>
        </div>
    `;
    output.style.display = 'block';
    showLoading(false);
}

// Funktion zum Anzeigen der Analysedaten
function displayAnalysisData(data) {
    output.innerHTML = `
        <h2>Kurvendiskussion</h2>
        <p>Funktion: f(x) = ${data.function}</p>
        <p>Definitionsbereich: ${data.domain}</p>
        <p>Funktionstyp: ${data.type}</p>
    `;
    output.style.display = 'block';
    showLoading(false);
}

// Event Handler für Moduswechsel
document.getElementById('calc-opt').addEventListener('change', (e) => {
    const mode = e.target.value;
    if (mode === 'graph') {
        console.log('Graph-Modus ausgewählt');
    }
});

// Funktion zum Anzeigen/Verbergen des Ladezustands
function showLoading(show) {
    loading.style.display = show ? 'flex' : 'none';
}

// Event Handler für Reset-Button
resetBtn.addEventListener('click', () => {
    fxInput.value = '';
    output.style.display = 'none';
    showLoading(false);
    fxInput.focus();
});


