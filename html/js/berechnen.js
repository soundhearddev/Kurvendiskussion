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
    xMin: -10, xMax: 10, eps: 0.001, tol: 0.0001, maxLen: 200,
    allowedChars: /^[0-9x\s\+\-\*\/\^\(\)\.\,sincotan]*$/i
};

// ============================================================================
// VALIDIERUNG & PARSING
// ============================================================================

const clean = s => s.replace(/\s+/g,'').replace(/\*\*/g,'^').replace(/,/g,'.').toLowerCase();
const validate = s => s && s.length<=cfg.maxLen && cfg.allowedChars.test(s) && (s.match(/\(/g)||[]).length===(s.match(/\)/g)||[]).length;
const parse = s => {
    const parsed = { orig: s, clean: clean(s), valid: validate(clean(s)) };
    
    // Logging: Funktion geparst
    dbLogger.debug('Funktion geparst', 'parse', 'validation', {
        original: s,
        cleaned: parsed.clean,
        valid: parsed.valid
    });
    
    return parsed;
};





// ============================================================================
// MEHRERE FUNKTIONEN HANDLING
// ============================================================================

// Container für zusätzliche Funktionszeilen anlegen (falls noch nicht vorhanden)
const funcsContainer = (() => {
    let c = document.getElementById('functions-container');
    if (c) return c;
    const wrapper = document.createElement('div');
    wrapper.id = 'functions-container';
    wrapper.className = 'functions-container';
    // füge direkt nach dem vorhandenen Input-Wrapper ein
    const inputWrapper = document.querySelector('.input-wrapper');
    if (inputWrapper && inputWrapper.parentNode) inputWrapper.parentNode.insertBefore(wrapper, inputWrapper.nextSibling);
    return wrapper;
})();

// Farbpalette für Standardfarben
const defaultColors = ['#007bff', '#28a745', '#dc3545', '#ffc107', '#6f42c1', '#20c997'];

// Hilfsfunktion: neue Funktions-Zeile erstellen (input + color + remove)
const createFunctionRow = (value = '', color = '') => {
    const row = document.createElement('div');
    row.className = 'func-row';

    const inp = document.createElement('input');
    inp.type = 'text';
    inp.className = 'fx-multi';
    inp.placeholder = 'z.B. 2*x^2 + 3*x - 5';
    inp.value = value;
    inp.setAttribute('aria-label', 'Weitere Funktion eingeben');

    const col = document.createElement('input');
    col.type = 'color';
    col.className = 'fx-color';
    col.value = color || defaultColors[Math.floor(Math.random()*defaultColors.length)];
    col.title = 'Farbe für diesen Graphen';

    const rm = document.createElement('button');
    rm.type = 'button';
    rm.className = 'remove-func-btn';
    rm.innerText = 'Entfernen';
    rm.onclick = () => { row.remove(); };

    row.appendChild(inp);
    row.appendChild(col);
    row.appendChild(rm);
    return row;
};

// Die vorhandene einzige Input-Zeile (`#fx`) mit einer Farbwahl erweitern, falls noch nicht passiert
(() => {
    const existing = document.getElementById('fx');
    if (!existing) return;
    if (document.getElementById('fx-color')) return; // bereits erweitert

    const color = document.createElement('input');
    color.type = 'color';
    color.id = 'fx-color';
    color.className = 'fx-color';
    color.value = defaultColors[0];
    color.title = 'Farbe für diesen Graphen';

    const parent = existing.parentNode;
    parent.appendChild(color);
})();

// Klick-Handler: neue Eingabezeile erzeugen
document.getElementById('spawn-new-func').onclick = (e) => {
    e.preventDefault();
    const row = createFunctionRow('', defaultColors[functionsCount() % defaultColors.length]);
    funcsContainer.appendChild(row);
    dbLogger.info('Neue Funktion hinzugefügt', 'spawn-new-func', 'ui');
};

// Hilfsfunktionen zum Sammeln aller Funktionen + Farben
const functionsCount = () => {
    return document.querySelectorAll('.fx-multi').length + (document.getElementById('fx') ? 1 : 0);
};

const collectFunctions = () => {
    const list = [];
    // Erstes (Haupt-)Input
    const main = document.getElementById('fx');
    const mainColor = document.getElementById('fx-color')?.value || defaultColors[0];
    if (main && main.value.trim() !== '') list.push({orig: main.value, color: mainColor});

    // Zusätzliche Inputs
    document.querySelectorAll('.func-row').forEach(row => {
        const inp = row.querySelector('.fx-multi');
        const col = row.querySelector('.fx-color');
        if (inp && inp.value.trim() !== '') list.push({orig: inp.value, color: col?.value || defaultColors[0]});
    });

    return list;
};

// Render-Funktion für mehrere Analysen (vereinigt die Einzel-Ausgabe)
const showAnalysesCombined = (results) => {
    let out = '<div class="analysis-multi">';
    out += `<h2>Kurvendiskussion (Mehrfach)</h2>`;
    results.forEach((d, idx) => {
        out += `<div class="analysis-container" style="border-left:6px solid ${d.color};padding-left:8px;margin-bottom:12px;">`;
        out += `<h3>f${idx+1}(x) = ${d.fn}</h3>`;
        out += `<p><strong>f(0):</strong> ${fmt(d.y0)}</p>`;
        out += `<p><strong>Nullstellen:</strong> ${d.zeros.length ? d.zeros.map(z=>fmt(z)).join(', ') : 'Keine'}</p>`;
        out += `<p><strong>Hochpunkte:</strong> ${d.maxs.length? d.maxs.map(m=>`(${fmt(m.x)}, ${fmt(m.y)})`).join(', '): 'Keine'}</p>`;
        out += `<p><strong>Tiefpunkte:</strong> ${d.mins.length? d.mins.map(m=>`(${fmt(m.x)}, ${fmt(m.y)})`).join(', '): 'Keine'}</p>`;
        out += `<p><strong>Wendepunkte:</strong> ${d.wende.length? d.wende.map(w=>`(${fmt(w.x)}, ${fmt(w.y)})`).join(', '): 'Keine'}</p>`;
        out += `</div>`;
    });
    out += '</div>';
    el.out.innerHTML = out;
    el.out.style.display = 'block';
    el.load.style.display = 'none';
    dbLogger.info('Mehrfach-Analysen angezeigt', 'showAnalysesCombined', 'display', {count: results.length});
};

// Multi-Graph-Renderer: zeichnet mehrere Funktionen mit Farben in ein Canvas
const showGraphMultiple = (funcs) => {
    const startTime = performance.now();
    dbLogger.info('Multi-Graph-Renderer gestartet', 'showGraphMultiple', 'graph', {count: funcs.length});

    el.out.innerHTML = '<canvas id="c" width="900" height="600"></canvas>';
    el.out.style.display = 'block';
    el.load.style.display = 'none';

    const c = $('c'), ctx = c.getContext('2d');
    let sx = 40, sy = 40, ox = 0, oy = 0, drag = false, dx = 0, dy = 0;
    const toX = x => c.width/2 + x*sx + ox;
    const toY = y => c.height/2 - y*sy + oy;
    const fromX = px => (px-c.width/2-ox)/sx;

    const draw = () => {
        ctx.clearRect(0,0,c.width,c.height);
        // Grid
        ctx.strokeStyle = '#f0f0f0'; ctx.lineWidth = 1;
        for(let i=-40;i<=40;i++){ ctx.beginPath(); ctx.moveTo(toX(i),0); ctx.lineTo(toX(i),c.height); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0,toY(i)); ctx.lineTo(c.width,toY(i)); ctx.stroke(); }
        // Axes
        ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0,toY(0)); ctx.lineTo(c.width,toY(0)); ctx.stroke(); ctx.beginPath(); ctx.moveTo(toX(0),0); ctx.lineTo(toX(0),c.height); ctx.stroke();
        // Numbers
        ctx.fillStyle='#000'; ctx.font='12px Arial'; ctx.textAlign='center';
        for(let i=-10;i<=10;i++) if(i!==0) ctx.fillText(i, toX(i), toY(0)+15);
        ctx.textAlign='right'; for(let i=-10;i<=10;i++) if(i!==0) ctx.fillText(i, toX(0)-5, toY(i)+4);

        // draw each function
        funcs.forEach((fObj, idx) => {
            const f = fObj.clean;
            ctx.strokeStyle = fObj.color || defaultColors[idx % defaultColors.length];
            ctx.lineWidth = 2;
            ctx.beginPath();
            let first = true;
            for(let px=0; px<=c.width; px++){
                const x = fromX(px), y = evalF(f, x);
                if(y===null||!isFinite(y)) { first = true; continue; }
                const py = toY(y);
                if(py<-1000||py>c.height+1000) { first = true; continue; }
                if(first){ ctx.moveTo(px,py); first=false; } else ctx.lineTo(px,py);
            }
            ctx.stroke();
        });

        // Legend
        ctx.font='12px Arial'; ctx.textAlign='left';
        funcs.forEach((fObj, idx) => {
            const x = 10, y = 20 + idx*18;
            ctx.fillStyle = fObj.color || defaultColors[idx % defaultColors.length];
            ctx.fillRect(x, y-10, 12, 12);
            ctx.fillStyle = '#000'; ctx.fillText(`f${idx+1}(x) = ${fObj.orig}`, x+18, y);
        });
    };

    // Interaction
    c.onmousedown = e => { drag=true; dx=e.offsetX; dy=e.offsetY; };
    c.onmouseup = c.onmouseleave = () => { drag=false; };
    c.onmousemove = e => { if(drag){ ox+=e.offsetX-dx; oy+=e.offsetY-dy; dx=e.offsetX; dy=e.offsetY; draw(); } };
    c.onwheel = e => { e.preventDefault(); const z = e.deltaY<0?1.1:0.9; sx*=z; sy*=z; draw(); };

    draw();

    const duration = performance.now() - startTime;
    dbLogger.info('Multi-Graph gerendert', 'showGraphMultiple', 'graph', {duration_ms: duration.toFixed(2), canvas_size: `${c.width}x${c.height}`, count: funcs.length});
};

// Interceptiere Klick auf "Berechnen" per capture-Listener und verarbeite Mehrfach-Funktionen.
// Wir benutzen capture + stopImmediatePropagation, damit der vorhandene onclick-Handler nicht zusätzlich läuft.
el.calc.addEventListener('click', async (ev) => {
    // Nur intercepten, wenn es zusätzliche fx-inputs gibt oder die user mehrere eingaben gemacht hat
    const collected = collectFunctions();
    if (collected.length <= 1) return; // keine Mehrfach-Funktionen → Original handler weiterlaufen lassen

    // stoppe andere Handler (inkl. später gesetzte el.calc.onclick)
    ev.stopImmediatePropagation();
    ev.preventDefault();

    el.load.style.display='flex';
    el.out.style.display='none';

    const mode = document.querySelector('input[name="mode"]:checked')?.value || 'analysis';

    dbLogger.info('Berechnung (Mehrfach) gestartet', 'calc.multi', mode, {count: collected.length});

    // parse alle Funktionen
    const parsedList = collected.map(c => ({ ...parse(c.orig), color: c.color, orig: c.orig }));

    // Prüfe Validität
    const invalid = parsedList.filter(p => !p.valid);
    if (invalid.length) {
        el.out.innerHTML = `<p class="error">❌ Mindestens eine Funktion ungültig: ${invalid.map(i=>i.orig).join(', ')}</p>`;
        el.out.style.display='block';
        el.load.style.display='none';
        dbLogger.warning('Ungültige Funktionen in Mehrfach-Berechnung', 'calc.multi', 'validation', {invalid: invalid.map(i=>i.orig)});
        return;
    }

    if (mode === 'graph') {
        // für Graphen brauchen wir die sauberen Ausdrücke
        const funcs = parsedList.map(p=>({ orig: p.orig, clean: p.clean, color: p.color }));
        showGraphMultiple(funcs);
    } else {
        // Analyse: parallel ausführen und zusammen anzeigen
        const promises = parsedList.map(p=>analyze(p).then(r=>({ ...r, color: p.color })));
        const results = await Promise.all(promises);
        showAnalysesCombined(results);
    }

}, true);

// ============================================================================
// FUNKTION AUSWERTEN
// ============================================================================

const evalF = (f, x) => {
    try {
        const expr = f.replace(/\^/g,'**').replace(/sin/g,'Math.sin').replace(/cos/g,'Math.cos').replace(/tan/g,'Math.tan').replace(/x/g,`(${x})`);
        const r = eval(expr);
        return isFinite(r) ? r : null;
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
// ABLEITUNGEN
// ============================================================================

const deriv1 = (f,x) => { 
    const h=cfg.eps, y1=evalF(f,x+h), y2=evalF(f,x-h); 
    return y1!==null&&y2!==null ? (y1-y2)/(2*h) : null; 
};

const deriv2 = (f,x) => { 
    const h=cfg.eps, y0=evalF(f,x), y1=evalF(f,x+h), y2=evalF(f,x-h); 
    return y0!==null&&y1!==null&&y2!==null ? (y1-2*y0+y2)/(h*h) : null; 
};

// ============================================================================
// NULLSTELLEN
// ============================================================================

const findZeros = (f, xMin, xMax) => {
    const startTime = performance.now();
    const zeros = [], step = 0.1;
    let prev = evalF(f, xMin);
    
    for (let x=xMin+step; x<=xMax; x+=step) {
        const y = evalF(f, x);
        if (y!==null && prev!==null && ((prev<0&&y>0)||(prev>0&&y<0))) {
            let z = x-step/2;
            for (let i=0; i<20; i++) { 
                const fy=evalF(f,z), dy=deriv1(f,z); 
                if(dy!==null&&Math.abs(dy)>0.001) z=z-fy/dy; 
            }
            if(zeros.length===0 || Math.abs(z-zeros[zeros.length-1])>0.5) zeros.push(z);
        }
        prev = y;
    }
    
    const duration = performance.now() - startTime;
    
    // Logging: Nullstellen gefunden
    dbLogger.info(`${zeros.length} Nullstellen gefunden`, 'findZeros', 'analysis', {
        function: f,
        count: zeros.length,
        zeros: zeros.map(z => z.toFixed(4)),
        duration_ms: duration.toFixed(2)
    });
    
    return zeros;
};

// ============================================================================
// EXTREMA
// ============================================================================

const findExtrema = (f, xMin, xMax) => {
    const startTime = performance.now();
    const maxs=[], mins=[], step=0.2;
    
    for (let x=xMin; x<=xMax; x+=step) {
        const d1=deriv1(f,x), d2=deriv2(f,x);
        if (d1!==null && Math.abs(d1)<0.05 && d2!==null) {
            const y=evalF(f,x);
            if (y!==null) {
                if (d2>0.1 && (mins.length===0||Math.abs(x-mins[mins.length-1].x)>1)) mins.push({x,y});
                if (d2<-0.1 && (maxs.length===0||Math.abs(x-maxs[maxs.length-1].x)>1)) maxs.push({x,y});
            }
        }
    }
    
    const duration = performance.now() - startTime;
    
    // Logging: Extrema gefunden
    dbLogger.info(`${maxs.length} Hochpunkte, ${mins.length} Tiefpunkte gefunden`, 'findExtrema', 'analysis', {
        function: f,
        maxima: maxs.length,
        minima: mins.length,
        maxPoints: maxs.map(m => `(${m.x.toFixed(2)}, ${m.y.toFixed(2)})`),
        minPoints: mins.map(m => `(${m.x.toFixed(2)}, ${m.y.toFixed(2)})`),
        duration_ms: duration.toFixed(2)
    });
    
    return {maxs, mins};
};

// ============================================================================
// WENDEPUNKTE
// ============================================================================

const findWende = (f, xMin, xMax) => {
    const startTime = performance.now();
    const wende=[], step=0.2;
    let prev=deriv2(f,xMin);
    
    for (let x=xMin+step; x<=xMax; x+=step) {
        const d2=deriv2(f,x);
        if (prev!==null && d2!==null && ((prev<-0.1&&d2>0.1)||(prev>0.1&&d2<-0.1))) {
            const y=evalF(f,x);
            if (y!==null && (wende.length===0||Math.abs(x-wende[wende.length-1].x)>1)) wende.push({x,y});
        }
        prev=d2;
    }
    
    const duration = performance.now() - startTime;
    
    // Logging: Wendepunkte gefunden
    dbLogger.info(`${wende.length} Wendepunkte gefunden`, 'findWende', 'analysis', {
        function: f,
        count: wende.length,
        points: wende.map(w => `(${w.x.toFixed(2)}, ${w.y.toFixed(2)})`),
        duration_ms: duration.toFixed(2)
    });
    
    return wende;
};

// ============================================================================
// VOLLSTÄNDIGE ANALYSE
// ============================================================================

const analyze = async p => {
    const startTime = performance.now();
    
    dbLogger.info('Kurvendiskussion gestartet', 'analyze', 'analysis', {
        function: p.orig,
        cleaned: p.clean
    });
    
    const f=p.clean;
    const y0 = evalF(f,0);
    const zeros = findZeros(f, cfg.xMin, cfg.xMax);
    const ext = findExtrema(f, cfg.xMin, cfg.xMax);
    const wende = findWende(f, cfg.xMin, cfg.xMax);
    
    const duration = performance.now() - startTime;
    
    const result = { 
        fn: p.orig, 
        y0, 
        zeros, 
        maxs: ext.maxs, 
        mins: ext.mins, 
        wende 
    };
    
    // Logging: Vollständige Analyse abgeschlossen
    dbLogger.info('Kurvendiskussion abgeschlossen', 'analyze', 'analysis', {
        function: p.orig,
        duration_ms: duration.toFixed(2),
        y_intercept: y0 !== null ? y0.toFixed(4) : 'n/a',
        zeros_count: zeros.length,
        maxima_count: ext.maxs.length,
        minima_count: ext.mins.length,
        inflection_count: wende.length,
        summary: {
            zeros: zeros.map(z => z.toFixed(2)),
            maxima: ext.maxs.map(m => `(${m.x.toFixed(2)}, ${m.y.toFixed(2)})`),
            minima: ext.mins.map(m => `(${m.x.toFixed(2)}, ${m.y.toFixed(2)})`),
            inflection: wende.map(w => `(${w.x.toFixed(2)}, ${w.y.toFixed(2)})`)
        }
    });
    
    return result;
};

// ============================================================================
// ANZEIGE
// ============================================================================

const fmt = n => n===null||!isFinite(n) ? 'n/a' : n.toFixed(2);

const showAnalysis = d => {
    let h = `<div class="analysis-container"><h2>Kurvendiskussion</h2><h3>f(x) = ${d.fn}</h3>`;
    h += `<h4>Y-Achse:</h4><p>f(0) = ${fmt(d.y0)}</p>`;
    h += `<h4>Nullstellen:</h4>`;
    h += d.zeros.length ? `<ul>${d.zeros.map((z,i)=>`<li>x<sub>${i+1}</sub> = ${fmt(z)}</li>`).join('')}</ul>` : '<p>Keine</p>';
    h += `<h4>Hochpunkte:</h4>`;
    h += d.maxs.length ? `<ul>${d.maxs.map((m,i)=>`<li>H<sub>${i+1}</sub>(${fmt(m.x)} | ${fmt(m.y)})</li>`).join('')}</ul>` : '<p>Keine</p>';
    h += `<h4>Tiefpunkte:</h4>`;
    h += d.mins.length ? `<ul>${d.mins.map((m,i)=>`<li>T<sub>${i+1}</sub>(${fmt(m.x)} | ${fmt(m.y)})</li>`).join('')}</ul>` : '<p>Keine</p>';
    h += `<h4>Wendepunkte:</h4>`;
    h += d.wende.length ? `<ul>${d.wende.map((w,i)=>`<li>W<sub>${i+1}</sub>(${fmt(w.x)} | ${fmt(w.y)})</li>`).join('')}</ul>` : '<p>Keine</p>';
    h += '</div>';
    
    el.out.innerHTML = h;
    el.out.style.display = 'block';
    el.load.style.display = 'none';
    
    dbLogger.info('Ergebnisse angezeigt', 'showAnalysis', 'display', {
        function: d.fn
    });
};

// ============================================================================
// GRAPHENDARSTELLUNG
// ============================================================================

const showGraph = p => {
    const startTime = performance.now();
    
    dbLogger.info('Graphendarstellung gestartet', 'showGraph', 'graph', {
        function: p.orig
    });
    
    el.out.innerHTML = '<canvas id="c" width="800" height="600"></canvas>';
    el.out.style.display = 'block';
    el.load.style.display = 'none';
    
    const c=$('c'), ctx=c.getContext('2d'), f=p.clean;
    let sx=40, sy=40, ox=0, oy=0, drag=false, dx=0, dy=0;
    
    const toX = x => c.width/2 + x*sx + ox;
    const toY = y => c.height/2 - y*sy + oy;
    const fromX = px => (px-c.width/2-ox)/sx;
    
    const draw = () => {
        ctx.clearRect(0,0,c.width,c.height);
        
        // Grid
        ctx.strokeStyle='#f0f0f0'; ctx.lineWidth=1;
        for(let i=-20;i<=20;i++){
            ctx.beginPath(); ctx.moveTo(toX(i),0); ctx.lineTo(toX(i),c.height); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0,toY(i)); ctx.lineTo(c.width,toY(i)); ctx.stroke();
        }
        
        // Achsen
        ctx.strokeStyle='#000'; ctx.lineWidth=2;
        ctx.beginPath(); ctx.moveTo(0,toY(0)); ctx.lineTo(c.width,toY(0)); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(toX(0),0); ctx.lineTo(toX(0),c.height); ctx.stroke();
        
        // Zahlen X-Achse
        ctx.fillStyle='#000'; ctx.font='12px Arial'; ctx.textAlign='center';
        for(let i=-10;i<=10;i++) if(i!==0) ctx.fillText(i, toX(i), toY(0)+15);
        
        // Zahlen Y-Achse
        ctx.textAlign='right';
        for(let i=-10;i<=10;i++) if(i!==0) ctx.fillText(i, toX(0)-5, toY(i)+4);
        
        // Labels
        ctx.font='14px Arial'; ctx.fillStyle='#000';
        ctx.fillText('x', c.width-20, toY(0)-10);
        ctx.fillText('y', toX(0)+15, 20);
        
        // Funktion
        ctx.strokeStyle='#007bff'; ctx.lineWidth=3; ctx.beginPath();
        let first=true;
        for(let px=0; px<=c.width; px++){
            const x=fromX(px), y=evalF(f,x);
            if(y===null||!isFinite(y)) continue;
            const py=toY(y);
            if(py<-100||py>c.height+100) continue;
            first ? ctx.moveTo(px,py) : ctx.lineTo(px,py);
            first=false;
        }
        ctx.stroke();
    };
    
    let zoomCount = 0, panCount = 0;
    
    c.onmousedown = e => { drag=true; dx=e.offsetX; dy=e.offsetY; };
    c.onmouseup = c.onmouseleave = () => {
        if (drag && panCount > 0) {
            dbLogger.debug('Graph verschoben', 'showGraph', 'interaction', {
                function: p.orig,
                offset_x: ox,
                offset_y: oy
            });
        }
        drag=false; 
    };
    c.onmousemove = e => { 
        if(drag){ 
            ox+=e.offsetX-dx; 
            oy+=e.offsetY-dy; 
            dx=e.offsetX; 
            dy=e.offsetY; 
            panCount++;
            draw(); 
        }
    };
    c.onwheel = e => { 
        e.preventDefault(); 
        const z=e.deltaY<0?1.1:0.9; 
        sx*=z; 
        sy*=z; 
        zoomCount++;
        draw(); 
        
        if (zoomCount % 5 === 0) {
            dbLogger.debug('Graph gezoomt', 'showGraph', 'interaction', {
                function: p.orig,
                scale_x: sx.toFixed(2),
                scale_y: sy.toFixed(2),
                zoom_count: zoomCount
            });
        }
    };
    
    draw();
    
    const duration = performance.now() - startTime;
    
    dbLogger.info('Graph gerendert', 'showGraph', 'graph', {
        function: p.orig,
        duration_ms: duration.toFixed(2),
        canvas_size: `${c.width}x${c.height}`
    });
};

// ============================================================================
// EVENT HANDLER
// ============================================================================

el.calc.onclick = () => {
    el.load.style.display='flex'; 
    el.out.style.display='none';
    
    const p = parse(el.fx.value);
    
    if(!p.valid) { 
        el.out.innerHTML='<p class="error">❌ Ungültige Funktion</p>'; 
        el.out.style.display='block'; 
        el.load.style.display='none'; 
        
        dbLogger.warning('Ungültige Funktionseingabe', 'calc.onclick', 'validation', {
            input: el.fx.value,
            cleaned: p.clean
        });
        
        return; 
    }
    
    const mode = document.querySelector('input[name="mode"]:checked')?.value || 'analysis';
    
    dbLogger.info('Berechnung gestartet', 'calc.onclick', mode, {
        function: p.orig,
        mode: mode
    });
    
    setTimeout(() => { 
        mode === 'graph' ? showGraph(p) : analyze(p).then(showAnalysis); 
    }, 300);
};

el.reset.onclick = () => { 
    el.fx.value=''; 
    el.out.style.display='none'; 
    el.load.style.display='none'; 
    el.fx.focus(); 
    
    dbLogger.info('Eingabe zurückgesetzt', 'reset.onclick', 'user_action');
};

el.fx.onkeypress = e => { 
    if(e.key==='Enter') {
        dbLogger.debug('Enter-Taste gedrückt', 'fx.onkeypress', 'keyboard_shortcut');
        el.calc.click(); 
    }
};

// ============================================================================
// INITIALISIERUNG
// ============================================================================

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