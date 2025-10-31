
const fxInput = document.getElementById('fx');
const loading = document.getElementById('loading');
const output = document.getElementById('output');
const calcBtn = document.getElementById('calc-btn');
const resetBtn = document.getElementById('reset-btn');

function showLoading(show){
  loading.style.display = show ? 'flex' : 'none';
}

function safeEval(expr, x){
  // Sehr vereinfachte, etwas sichere Auswertung:
  // Erlaubte Zeichen: Zahlen, x, +-*/().^, sin cos tan, Math functions via mapping
  // Ersetzt ^ durch ** für JS
  const allowed = /^[0-9+\-*/().\s,xA-Za-z^%]*$/;
  if(!allowed.test(expr)) throw new Error('Ungültige Zeichen in Ausdruck.');
  const replaced = expr.replace(/\^/g,'**').replace(/sqrt\(/g,'Math.sqrt(');
  // erlaubte functions
  const safe = replaced
    .replace(/\bsin\(/g,'Math.sin(')
    .replace(/\bcos\(/g,'Math.cos(')
    .replace(/\btan\(/g,'Math.tan(')
    .replace(/\blog\(/g,'Math.log(')
    .replace(/\bexp\(/g,'Math.exp(')
    .replace(/\babs\(/g,'Math.abs(');
  // eslint-disable-next-line no-new-func
  const fn = new Function('x','return ' + safe + ';');
  return Number(fn(x));
}

function drawPlaceholderGraph(expr){
  // Erstelle Canvas und zeichne Kurve (Platzhalter)
  const canvas = document.createElement('canvas');
  canvas.width = 700;
  canvas.height = 280;
  canvas.style.maxWidth = '100%';
  const ctx = canvas.getContext('2d');
  // Hintergrund
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  // Achsen
  ctx.strokeStyle = '#e6eef0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0,canvas.height/2);
  ctx.lineTo(canvas.width,canvas.height/2);
  ctx.moveTo(canvas.width/2,0);
  ctx.lineTo(canvas.width/2,canvas.height);
  ctx.stroke();
  // Kurve (probieren x von -10..10)
  ctx.strokeStyle = '#0ea5a4';
  ctx.lineWidth = 2;
  ctx.beginPath();
  const samples = 600;
  let first=true;
  for(let i=0;i<=samples;i++){
    const t = i / samples;
    const x = -10 + t * 20;
    let y;
    try{
      y = safeEval(expr, x);
      if(!isFinite(y) || isNaN(y)) y = 0;
    } catch(e){
      y = 0;
    }
    // map x -> pixel
    const px = (i / samples) * canvas.width;
    // map y to pixel using a simple scale
    const scale = 15; // größe der y-skala
    const py = canvas.height/2 - y*scale;
    if(first){ ctx.moveTo(px,py); first=false; } else ctx.lineTo(px,py);
  }
  ctx.stroke();
  return canvas;
}

calcBtn.addEventListener('click', async ()=>{
  output.style.display='none';
  const expr = fxInput.value.trim();
  if(!expr){ alert('Bitte gib zuerst eine Funktion ein.'); fxInput.focus(); return; }
  showLoading(true);
  calcBtn.disabled = true;
  resetBtn.disabled = true;

  // Simuliere Rechenzeit
  await new Promise(r => setTimeout(r, 800));

  const mode = document.querySelector('input[name="mode"]:checked').value;
  output.innerHTML = '';
  if(mode === 'graph'){
    try{
      const canvas = drawPlaceholderGraph(expr);
      output.appendChild(canvas);
    } catch(e){
      output.textContent = 'Fehler beim Zeichnen: ' + e.message;
    }
  } else {
    // einfache "Kurvendiskussion" demo: Werte und numerische Ableitung bei x=1
    try {
      const x0 = 1;
      const y0 = safeEval(expr, x0);
      const h = 1e-5;
      const y1 = safeEval(expr, x0 + h);
      const deriv = (y1 - y0)/h;
      const ul = document.createElement('div');
      ul.innerHTML = `<strong>Auswertung (Demo)</strong>
        <div>f(${x0}) ≈ ${Number(y0.toFixed(6))}</div>
        <div>f'(${x0}) ≈ ${Number(deriv.toFixed(6))}</div>
        <div style="margin-top:8px;font-size:13px;color:#6b7280">Hinweis: Dies ist ein vereinfachtes Demo-Ergebnis.</div>`;
      output.appendChild(ul);
    } catch(e){
      output.textContent = 'Fehler bei Auswertung: ' + e.message;
    }
  }

  showLoading(false);
  output.style.display = 'block';
  calcBtn.disabled = false;
  resetBtn.disabled = false;
});

resetBtn.addEventListener('click', ()=>{
  fxInput.value = '';
  output.style.display = 'none';
  showLoading(false);
  fxInput.focus();
});


document.getElementById("berechnen").addEventListener("click", () => {
  // Beim Klicken wird einfach die Ergebnis-Box eingeblendet
  document.getElementById("ausgabe").style.display = "block";
});