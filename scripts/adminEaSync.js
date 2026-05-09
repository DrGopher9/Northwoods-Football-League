// scripts/adminEaSync.js
// Minimal admin UI wiring to capture EA code and trigger sync
(function(){
  const codeForm = document.getElementById('ea-code-form');
  const codeInput = document.getElementById('ea-code-input');
  const leagueInput = document.getElementById('ea-league-input');
  const exchangeBtn = document.getElementById('ea-exchange-btn');
  const syncBtn = document.getElementById('ea-sync-btn');
  const out = document.getElementById('ea-sync-output');

  function log(msg){ if(out) out.textContent = msg; }

  function extractCode(val){
    if(!val) return '';
    const m = String(val).match(/[?&]code=([^&]+)/);
    return m ? decodeURIComponent(m[1]) : val.trim();
  }

  if (exchangeBtn) {
    exchangeBtn.addEventListener('click', async (e)=>{
      e.preventDefault();
      const leagueId = (leagueInput && leagueInput.value.trim()) || 'nwfl';
      const raw = codeInput && codeInput.value.trim();
      const code = extractCode(raw);
      if(!code){ return log('Please paste the code or the full http://127.0.0.1/success?code=... URL'); }
      log('Exchanging code for token...');
      try{
        const r = await fetch(`/api/ea/exchange?leagueId=${encodeURIComponent(leagueId)}`, {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ code })
        });
        const j = await r.json();
        if(!r.ok){ throw new Error(j.error || 'Failed'); }
        log('Token saved. You can Run Sync now.');
      }catch(err){
        log('Exchange failed: ' + err.message);
      }
    });
  }

  if (syncBtn) {
    syncBtn.addEventListener('click', async (e)=>{
      e.preventDefault();
      const leagueId = (leagueInput && leagueInput.value.trim()) || 'nwfl';
      log('Syncing...');
      try{
        const r = await fetch(`/api/ea/sync?leagueId=${encodeURIComponent(leagueId)}`);
        const j = await r.json();
        if(!r.ok){ throw new Error(j.error || 'Failed'); }
        log('Sync done: ' + JSON.stringify(j.imported));
      }catch(err){
        log('Sync failed: ' + err.message);
      }
    });
  }
})();