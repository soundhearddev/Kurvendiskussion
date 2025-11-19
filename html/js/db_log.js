// Einfacher Logger
(function(global){
  const LOG_URL = '/php/logs.php';
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
    if(sending || queue.length===0) return;
    sending = true;

    while(queue.length){
      const item = queue[0];
      try{
        console.debug('Logger sending', item);
        const res = await fetch(LOG_URL, {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify(item),
          cache: 'no-store'
        });

        if(!res.ok){
          console.warn('Logger server error', res.status);
          await wait(RETRY_DELAY_MS);
          break;
        }

        console.debug('Logger sent', item);
        queue.shift();
      } catch(err){
        console.error('Logger send failed', err);
        await wait(RETRY_DELAY_MS);
        break;
      }
    }

    sending = false;
  }

  function wait(ms){ return new Promise(r=>setTimeout(r, ms)); }

  const api = {
    log(level, message, context){
      const payload = {level: level||'info', message: message||'', context: context||null};
      console.log(`[${payload.level}]`, payload.message, payload.context);
      enqueue(payload);
    },
    info(msg, ctx){ this.log('info', msg, ctx); },
    warn(msg, ctx){ this.log('warn', msg, ctx); },
    error(msg, ctx){ this.log('error', msg, ctx); },
    _getQueue(){ return queue.slice(); }
  };

  global.dbLogger = api;
  window.addEventListener('load', () => setTimeout(triggerSend, 100));
})(window);
