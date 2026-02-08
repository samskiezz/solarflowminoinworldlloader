console.log("SolarFlow bundle loaded");

function qs(sel){ return document.querySelector(sel); }

async function getJSON(url){
  const r = await fetch(url, { headers: { "Accept":"application/json" } });
  if(!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

async function boot(){
  // Example: show server health in console
  try {
    const health = await getJSON('/health');
    console.log('Health:', health);
  } catch (e) {
    console.warn('Health check failed:', e.message);
  }

  // WebSocket live updates
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const ws = new WebSocket(`${proto}://${location.host}`);

  ws.onopen = () => console.log('WS connected');
  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data);
      console.log('WS:', msg);

      // If you want to show something on page:
      const el = qs('#live-status');
      if (el && msg.type === 'system_status') {
        el.textContent = `Status: ${msg.status} @ ${msg.timestamp}`;
      }
    } catch {}
  };
  ws.onclose = () => console.log('WS disconnected');
}

document.addEventListener('DOMContentLoaded', boot);