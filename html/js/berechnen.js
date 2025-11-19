// ============================================================================
// FUNKTIONSANALYSE - VEREINFACHT
// ============================================================================

const $ = id => document.getElementById(id);
const el = { fx: $('fx'), out: $('output'), load: $('loading'), calc: $('calc-btn'), reset: $('reset-btn') };

// CONFIG
const cfg = { 
    xMin: -10, xMax: 10, eps: 0.001, tol: 0.0001, maxLen: 200,
    allowedChars: /^[0-9x\s\+\-\*\/\^\(\)\.\,sincotan]*$/i
};

// VALIDIERUNG & PARSING
const clean = s => s.replace(/\s+/g,'').replace(/\*\*/g,'^').replace(/,/g,'.').toLowerCase();
const validate = s => s && s.length<=cfg.maxLen && cfg.allowedChars.test(s) && (s.match(/\(/g)||[]).length===(s.match(/\)/g)||[]).length;
const parse = s => ({ orig: s, clean: clean(s), valid: validate(clean(s)) });

// FUNKTION AUSWERTEN
const evalF = (f, x) => {
    try {
        const expr = f.replace(/\^/g,'**').replace(/sin/g,'Math.sin').replace(/cos/g,'Math.cos').replace(/tan/g,'Math.tan').replace(/x/g,`(${x})`);
        const r = eval(expr);
        return isFinite(r) ? r : null;
    } catch { return null; }
};

// ABLEITUNGEN
const deriv1 = (f,x) => { const h=cfg.eps, y1=evalF(f,x+h), y2=evalF(f,x-h); return y1!==null&&y2!==null ? (y1-y2)/(2*h) : null; };
const deriv2 = (f,x) => { const h=cfg.eps, y0=evalF(f,x), y1=evalF(f,x+h), y2=evalF(f,x-h); return y0!==null&&y1!==null&&y2!==null ? (y1-2*y0+y2)/(h*h) : null; };

// NULLSTELLEN
const findZeros = (f, xMin, xMax) => {
    const zeros = [], step = 0.1;
    let prev = evalF(f, xMin);
    for (let x=xMin+step; x<=xMax; x+=step) {
        const y = evalF(f, x);
        if (y!==null && prev!==null && ((prev<0&&y>0)||(prev>0&&y<0))) {
            let z = x-step/2;
            for (let i=0; i<20; i++) { const fy=evalF(f,z), dy=deriv1(f,z); if(dy!==null&&Math.abs(dy)>0.001) z=z-fy/dy; }
            if(zeros.length===0 || Math.abs(z-zeros[zeros.length-1])>0.5) zeros.push(z);
        }
        prev = y;
    }
    return zeros;
};

// EXTREMA
const findExtrema = (f, xMin, xMax) => {
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
    return {maxs, mins};
};

// WENDEPUNKTE
const findWende = (f, xMin, xMax) => {
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
    return wende;
};

// ANALYSE
const analyze = async p => {
    const f=p.clean, zeros=findZeros(f,cfg.xMin,cfg.xMax), ext=findExtrema(f,cfg.xMin,cfg.xMax), wende=findWende(f,cfg.xMin,cfg.xMax);
    return { fn: p.orig, y0: evalF(f,0), zeros, maxs: ext.maxs, mins: ext.mins, wende };
};

// ANZEIGE
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
};

// GRAPH
const showGraph = p => {
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
    
    c.onmousedown = e => { drag=true; dx=e.offsetX; dy=e.offsetY; };
    c.onmouseup = c.onmouseleave = () => drag=false;
    c.onmousemove = e => { if(drag){ ox+=e.offsetX-dx; oy+=e.offsetY-dy; dx=e.offsetX; dy=e.offsetY; draw(); }};
    c.onwheel = e => { e.preventDefault(); const z=e.deltaY<0?1.1:0.9; sx*=z; sy*=z; draw(); };
    
    draw();
};

// EVENTS
el.calc.onclick = () => {
    el.load.style.display='flex'; el.out.style.display='none';
    const p=parse(el.fx.value);
    if(!p.valid){ el.out.innerHTML='<p class="error">❌ Ungültige Funktion</p>'; el.out.style.display='block'; el.load.style.display='none'; return; }
    const mode=document.querySelector('input[name="mode"]:checked')?.value||'analysis';
    setTimeout(()=>{ mode==='graph' ? showGraph(p) : analyze(p).then(showAnalysis); }, 300);
};

el.reset.onclick = () => { el.fx.value=''; el.out.style.display='none'; el.load.style.display='none'; el.fx.focus(); };
el.fx.onkeypress = e => { if(e.key==='Enter') el.calc.click(); };

document.addEventListener('DOMContentLoaded', ()=>el.fx.focus());