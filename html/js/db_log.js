// client-side logger: sendet Logs an den Node/Express-Logserver
// Verwendung: window.dbLogger.log('info', 'Nachricht', {key: 'value'})
(function(global){
  const LOG_PATH = '/log'; // relativ; Apache sollte /log an den Node-Server proxien
  const MAX_QUEUE = 200;
  const RETRY_DELAY_MS = 2000;

  let queue = [];
  let sending = false;

  function enqueue(entry){
    if(queue.length >= MAX_QUEUE) queue.shift();
    queue.push(entry);
    triggerSend();
  }

  async function triggerSend(){
    if(sending) return;
    if(queue.length === 0) return;
    sending = true;

    while(queue.length){
      const item = queue[0];
      try{
        const res = await fetch(LOG_PATH, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
          cache: 'no-store'
        });

        if(!res.ok){
          // Server antwortet mit Fehlercode -> stop & retry später
          console.warn('Logger: server error', res.status);
          await wait(RETRY_DELAY_MS);
          break;
        }

        // erfolgreich gesendet -> aus der Queue entfernen
        queue.shift();
      } catch(err){
        // Netzwerkfehler oder CORS/proxy problem
        console.warn('Logger: send failed, retrying', err && err.message);
        await wait(RETRY_DELAY_MS);
        break;
      }
    }

    sending = false;
  }

  function wait(ms){ return new Promise(r=>setTimeout(r, ms)); }

  function validatePayload(level, message, context){
    return {
      level: String(level || 'info'),
      message: message == null ? '' : String(message),
      context: context || null
    };
  }

  // öffentliche API
  const api = {
    log(level, message, context){
      const payload = validatePayload(level, message, context);
      // lokal in console spiegeln
      try{ console.log(`[${payload.level}]`, payload.message, payload.context); } catch(e){}
      enqueue(payload);
    },
    info(msg, ctx){ this.log('info', msg, ctx); },
    warn(msg, ctx){ this.log('warn', msg, ctx); },
    error(msg, ctx){ this.log('error', msg, ctx); },
    _getQueue(){ return queue.slice(); } // debug
  };

  // attach
  global.dbLogger = api;

  // versuche beim Laden, vorhandene Warteschlange zu senden
  window.addEventListener('load', () => setTimeout(triggerSend, 100));

})(window);
