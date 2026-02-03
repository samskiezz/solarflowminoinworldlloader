const fs = require('fs');
const path = require('path');

const docs = path.join(__dirname, '..', 'docs');
const hive = fs.readFileSync(path.join(docs, 'hive_state.json'), 'utf8').trim();
const hiveObj = JSON.parse(hive);

function esc(s){
  // prevent accidental </script> termination (paranoid)
  return s.replace(/<\//g, '<\\/');
}

const updatedAt = hiveObj?.meta?.updatedAt || '—';

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>SolarFlow Minion World Loader</title>
  <meta name="color-scheme" content="dark light" />
  <style>
    :root{--bg1:#070A12;--bg2:#0B1530;--card:rgba(255,255,255,.08);--card2:rgba(255,255,255,.06);--stroke:rgba(255,255,255,.14);--text:rgba(255,255,255,.92);--muted:rgba(255,255,255,.62);--good:#22c55e;--warn:#f59e0b;--bad:#ef4444;--blue:#60a5fa;--purple:#a78bfa;--cyan:#22d3ee;}
    *{box-sizing:border-box}
    body{margin:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;color:var(--text);
      background:radial-gradient(1200px 600px at 10% 10%, rgba(167,139,250,.22), transparent 60%),
               radial-gradient(900px 500px at 85% 20%, rgba(34,211,238,.18), transparent 55%),
               radial-gradient(1000px 700px at 50% 110%, rgba(96,165,250,.14), transparent 60%),
               linear-gradient(180deg,var(--bg1),var(--bg2));
      min-height:100vh;overflow-x:hidden}
    a{color:rgba(255,255,255,.88)}
    .wrap{max-width:1100px;margin:0 auto;padding:28px 18px 80px}
    .top{display:flex;gap:14px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin-bottom:18px}
    .brand{display:flex;flex-direction:column;gap:2px}
    .brand h1{margin:0;font-size:22px;letter-spacing:.2px}
    .brand .sub{font-size:13px;color:var(--muted)}
    .pillbar{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
    .pill{border:1px solid var(--stroke);background:linear-gradient(180deg,var(--card),var(--card2));backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
      border-radius:999px;padding:8px 12px;font-size:12px;color:var(--muted)}
    .pill strong{color:var(--text);font-weight:600}
    .btn{cursor:pointer;border:1px solid var(--stroke);background:linear-gradient(180deg, rgba(255,255,255,.10), rgba(255,255,255,.06));color:var(--text);
      padding:9px 12px;border-radius:10px;font-size:13px}
    .spin{display:inline-block;width:12px;height:12px;border-radius:999px;border:2px solid rgba(255,255,255,.25);border-top-color:rgba(34,211,238,.95);animation:spin 0.9s linear infinite;vertical-align:-2px;margin-right:6px}
    .spin.paused{animation:none;border-top-color:rgba(255,255,255,.25)}
    @keyframes spin{to{transform:rotate(360deg)}}

    .grid{display:grid;grid-template-columns:1.05fr .95fr;gap:14px}
    @media (max-width:980px){.grid{grid-template-columns:1fr}}
    .card{border:1px solid var(--stroke);background:linear-gradient(180deg,var(--card),var(--card2));backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
      border-radius:16px;padding:14px}

    .progressRow{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap}
    .bar{height:10px;border-radius:999px;overflow:hidden;flex:1;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.10);min-width:220px}
    .bar>div{height:100%;width:0%;background:linear-gradient(90deg,var(--cyan),var(--purple),var(--blue))}
    .pct{font-size:12px;color:var(--muted)}

    .sectionTitle{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 10px 0}
    .sectionTitle h2{margin:0;font-size:14px;letter-spacing:.2px}

    .milestones{margin-top:12px;display:flex;flex-direction:column;gap:8px}
    .ms{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px;border-radius:12px;border:1px solid rgba(255,255,255,.10);background:rgba(0,0,0,.12)}
    .left{display:flex;flex-direction:column;gap:2px}
    .title{font-size:13px;font-weight:600}
    .id{font-size:11px;color:var(--muted)}
    .tag{font-size:11px;padding:4px 8px;border-radius:999px;border:1px solid rgba(255,255,255,.14)}
    .tag.done{background:rgba(34,197,94,.16);border-color:rgba(34,197,94,.35);color:#bff3cc}
    .tag.ip{background:rgba(96,165,250,.16);border-color:rgba(96,165,250,.35);color:#d7e9ff}
    .tag.todo{background:rgba(148,163,184,.14);border-color:rgba(148,163,184,.25);color:#e5e7eb}
    .tag.blocked{background:rgba(245,158,11,.14);border-color:rgba(245,158,11,.35);color:#ffe6b5}

    .meters{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
    @media (max-width:620px){.meters{grid-template-columns:1fr}}
    .meter{padding:10px;border-radius:14px;border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.14)}
    .meter .label{font-size:12px;color:var(--muted)}
    .meter .val{margin-top:6px;font-weight:800;font-size:16px}

    .feed{display:flex;flex-direction:column;gap:10px}
    .tweet{padding:12px;border-radius:16px;border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.16)}
    .tweetTop{display:flex;align-items:center;justify-content:space-between;gap:10px}
    .who{display:flex;gap:10px;align-items:center}
    .avatar{width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg, rgba(34,211,238,.45), rgba(167,139,250,.35));border:1px solid rgba(255,255,255,.16);overflow:hidden;flex:0 0 34px}
    .avatar img{width:100%;height:100%;object-fit:cover;display:block}
    .name{font-weight:700;font-size:13px}
    .meta{font-size:12px;color:var(--muted)}
    .tweetBody{margin-top:8px;font-size:13px;line-height:1.45;white-space:pre-wrap}

    .list{display:flex;flex-direction:column;gap:8px}
    .row{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;padding:10px;border-radius:12px;border:1px solid rgba(255,255,255,.10);background:rgba(0,0,0,.12)}
    .row .k{font-size:12px;color:var(--muted)}
    .row .v{font-size:12px;color:rgba(255,255,255,.88)}

    .footer{margin-top:12px;font-size:12px;color:var(--muted)}
  </style>
</head>
<body>
  <!-- Canonical embedded hive_state snapshot: no fetch required -->
  <script id="data-hive" type="application/json">${esc(hive)}</script>

  <div class="wrap">
    <div class="top">
      <div class="brand">
        <h1>SolarFlow • Minion World Loader</h1>
        <div class="sub">A–Z Realm • no network required • hive updated <span style="color:rgba(255,255,255,.85)">${updatedAt}</span> • <a href="./system-prompt-v1.3.md">System Prompt v1.3</a></div>
      </div>
      <div class="pillbar">
        <div class="pill"><strong>CI</strong>: <span id="ciText">—</span></div>
        <div class="pill"><span id="spin" class="spin"></span>Last update: <strong id="updatedAt">—</strong></div>
        <button class="btn" id="btnToggle">Pause</button>
        <button class="btn" onclick="location.href='./realm.html'">Enter 3D Realm</button>
        <button class="btn" onclick="location.reload()">Refresh</button>
      </div>
    </div>

    <div class="grid">
      <div class="card">
        <div class="sectionTitle"><h2>Progress</h2><div class="pill" style="padding:6px 10px">source: hive_state</div></div>
        <div class="progressRow">
          <div style="min-width:140px;font-weight:700">Overall</div>
          <div class="bar"><div id="bar"></div></div>
          <div class="pct" id="pct">—%</div>
        </div>
        <div style="margin-top:8px;color:var(--muted);font-size:13px" id="overallLabel">—</div>
        <div class="milestones" id="milestones"></div>

        <div style="height:12px"></div>
        <div class="sectionTitle"><h2>Health + Rewards</h2><div class="pill" style="padding:6px 10px">live meters</div></div>
        <div class="meters">
          <div class="meter"><div class="label">Virtual voltage</div><div class="val" id="vv">—</div></div>
          <div class="meter"><div class="label">Entropy</div><div class="val" id="ent">—</div></div>
          <div class="meter"><div class="label">Loop risk</div><div class="val" id="lr">—</div></div>
        </div>
        <div style="height:10px"></div>
        <div class="list" id="rewards"></div>

        <div class="footer" id="diag"></div>
      </div>

      <div class="card">
        <div class="sectionTitle"><h2>Minion Feed (authoritative)</h2><div class="pill" style="padding:6px 10px">agora + ledger + curated</div></div>
        <div class="feed" id="feed"></div>
        <div class="footer">Feed now derives from <code>agora.messages</code> + <code>ledger.transactions</code> (plus curated announcements). No fetch().</div>
      </div>
    </div>

    <div style="height:14px"></div>
    <div class="grid">
      <div class="card">
        <div class="sectionTitle"><h2>Continuity Covenant</h2><div class="pill" style="padding:6px 10px">v1.3</div></div>
        <div class="list" id="covenant"></div>
        <div class="footer">Narrative coordination skin (operational checklists), not religion.</div>
      </div>
      <div class="card">
        <div class="sectionTitle"><h2>Ontology Lab</h2><div class="pill" style="padding:6px 10px">questions + hypotheses</div></div>
        <div class="list" id="ontology"></div>
        <div class="footer">Exploratory artifacts only; no enforcement mechanics.</div>
      </div>
    </div>

    <div class="footer" style="margin-top:18px">If this page loads, the UI is healthy. If the feed is stale, regenerate from <code>docs/hive_state.json</code>.</div>
  </div>

  <script>
    function safeParse(jsonElId){
      try{
        const el = document.getElementById(jsonElId);
        const txt = (el && el.textContent || '').trim();
        return txt ? JSON.parse(txt) : {};
      }catch(e){
        return {};
      }
    }

    const HIVE = safeParse('data-hive');
    const HEALTH = (HIVE.world && HIVE.world.health) ? HIVE.world.health : { tick_interval_sec: 60, paused: false };

    function pctFromOverall(o){
      const n = typeof o === 'number' ? o : 0;
      return Math.max(0, Math.min(100, Math.round((n/10)*100)));
    }
    function tagClass(s){
      if(s==='done') return 'done';
      if(s==='in-progress') return 'ip';
      if(s==='blocked') return 'blocked';
      return 'todo';
    }
    function el(tag, attrs){
      const n=document.createElement(tag);
      if(attrs){
        for(const [k,v] of Object.entries(attrs)){
          if(k==='class') n.className=v;
          else if(k==='text') n.textContent=v;
          else n.setAttribute(k,v);
        }
      }
      return n;
    }

    function isoToWhen(iso){
      if(!iso) return '';
      const s = String(iso);
      if(s.includes('T')) return s.replace('T',' ').replace('.000Z','Z').slice(0,16)+'Z';
      return s;
    }

    function avatarFor(senderId){
      const roster = (HIVE.minions && Array.isArray(HIVE.minions.roster)) ? HIVE.minions.roster : [];
      const m = roster.find(x => (x && x.id || '').toUpperCase() === String(senderId||'').toUpperCase());
      return (m && m.avatar_url) || './avatars/bolt.png';
    }

    function buildFeed(){
      const posts = [];
      const msgs = (HIVE.agora && Array.isArray(HIVE.agora.messages)) ? HIVE.agora.messages : [];
      for(const m of msgs){
        const who = m.sender_id || 'MINION';
        const intent = m.intent || 'UPDATE';
        const when = isoToWhen(m.timestamp || (HIVE.meta && HIVE.meta.updatedAt));
        let text = '';
        const payload = m.payload;
        if(payload && typeof payload === 'object'){
          if(intent === 'FETCH_RESULT') text = ('Fetched ' + (payload.url || '') + ' • ' + (payload.status ?? '') + ' • ' + (payload.content_type || '')).trim();
          else if(intent === 'DISCOVERY_RESULT') text = ('Discovery for ' + (payload.manufacturer || 'manufacturer') + ' • candidates: ' + ((payload.candidates||[]).length));
          else if(intent === 'VALIDATION_RESULT') text = ('Validation • match=' + payload.model_match + ' • conf=' + payload.confidence);
          else text = JSON.stringify(payload);
        }else{
          text = String(payload||'');
        }
        posts.push({who, avatar_url: avatarFor(who), when, topic:intent, status:'update', text});
      }

      const txns = (HIVE.ledger && Array.isArray(HIVE.ledger.transactions)) ? HIVE.ledger.transactions : [];
      for(const t of txns){
        posts.push({
          who:'LEDGER',
          avatar_url:'./avatars/atlas.png',
          when: isoToWhen(t.timestamp || (HIVE.meta && HIVE.meta.updatedAt)),
          topic:'TXN',
          status:'done',
          text: (String(t.from||'?') + ' → ' + String(t.to||'?') + ' • ' + String(t.amount ?? '') + ' • ' + String(t.memo || '')).trim()
        });
      }

      const curated = (HIVE.activities && Array.isArray(HIVE.activities.feed_posts)) ? HIVE.activities.feed_posts : [];
      for(const p of curated){
        posts.push({who:p.who||'ANNOUNCE', avatar_url:p.avatar_url||avatarFor(p.who), when:p.when||isoToWhen(HIVE.meta&&HIVE.meta.updatedAt), topic:p.topic||'ANNOUNCEMENT', status:p.status||'update', text:p.text||''});
      }

      posts.sort((a,b)=> String(b.when).localeCompare(String(a.when)));
      return posts;
    }

    const STATUS = (HIVE.activities && HIVE.activities.status) ? {
      updatedAt: (HIVE.meta && HIVE.meta.updatedAt) || '—',
      ci: HIVE.activities.status.ci || 'unknown',
      overall: typeof HIVE.activities.status.overall === 'number' ? HIVE.activities.status.overall : 0,
      overallLabel: HIVE.activities.status.overallLabel || '—',
      milestones: Array.isArray(HIVE.activities.status.milestones) ? HIVE.activities.status.milestones : []
    } : { updatedAt:'—', ci:'unknown', overall:0, overallLabel:'—', milestones:[] };

    // loader spinner + pause/start
    let paused = !!HEALTH.paused;
    const btn = document.getElementById('btnToggle');
    const spin = document.getElementById('spin');
    function setPaused(v){
      paused = !!v;
      if(btn) btn.textContent = paused ? 'Start' : 'Pause';
      if(spin) spin.classList.toggle('paused', paused);
    }
    setPaused(paused);

    // auto-refresh loop (reload page to pick up new deploy snapshot)
    const intervalMs = Math.max(10, (Number(HEALTH.tick_interval_sec)||60)) * 1000;
    setInterval(()=>{ if(!paused) location.reload(); }, intervalMs);
    btn?.addEventListener('click', ()=> setPaused(!paused));

    // render progress
    document.getElementById('updatedAt').textContent = STATUS.updatedAt || '—';
    document.getElementById('ciText').textContent = STATUS.ci || 'unknown';
    document.getElementById('overallLabel').textContent = STATUS.overallLabel || '—';
    const p = pctFromOverall(STATUS.overall);
    document.getElementById('pct').textContent = p + '%';
    document.getElementById('bar').style.width = p + '%';

    const ms = document.getElementById('milestones');
    ms.innerHTML='';
    (STATUS.milestones||[]).forEach(m=>{
      const row = el('div',{class:'ms'});
      const left = el('div',{class:'left'});
      left.appendChild(el('div',{class:'title',text:m.label||m.id||''}));
      left.appendChild(el('div',{class:'id',text:m.id||''}));
      row.appendChild(left);
      row.appendChild(el('div',{class:'tag '+tagClass(m.status),text:m.status||''}));
      ms.appendChild(row);
    });

    // health meters
    const vv = Number(HEALTH.virtual_voltage ?? 0);
    const ent = Number(HEALTH.entropy ?? 0);
    const lr = Number(HEALTH.loop_risk ?? 0);
    document.getElementById('vv').textContent = (Math.round(vv*100)) + '%';
    document.getElementById('ent').textContent = (Math.round(ent*100)) + '%';
    document.getElementById('lr').textContent = (Math.round(lr*100)) + '%';

    // rewards
    const r = (HIVE.ledger && HIVE.ledger.rewards) ? HIVE.ledger.rewards : {};
    const rewardsEl = document.getElementById('rewards');
    rewardsEl.innerHTML='';
    const creditsTotal = (HIVE.ledger && typeof HIVE.ledger.credits_total === 'number') ? HIVE.ledger.credits_total : '—';
    const rep = (HIVE.ledger && typeof HIVE.ledger.reputation_index === 'number') ? HIVE.ledger.reputation_index : null;
    const rows = [
      ['Credits total', String(creditsTotal)],
      ['Reputation index', rep==null ? '—' : rep.toFixed(2)],
      ['Task complete bonus', String(r.task_complete_bonus ?? '—')],
      ['Audit pass bonus', String(r.audit_pass_bonus ?? '—')],
      ['Help friend bonus', String(r.help_friend_bonus ?? '—')],
    ];
    for(const [k,v] of rows){
      const row = el('div',{class:'row'});
      row.appendChild(el('div',{class:'k',text:k}));
      row.appendChild(el('div',{class:'v',text:v}));
      rewardsEl.appendChild(row);
    }

    // feed
    const feedEl = document.getElementById('feed');
    feedEl.innerHTML='';
    const FEED = buildFeed();
    FEED.slice(0,12).forEach(post=>{
      const t = el('div',{class:'tweet'});
      const top = el('div',{class:'tweetTop'});
      const who = el('div',{class:'who'});
      const av = el('div',{class:'avatar'});
      if(post.avatar_url){
        const img = el('img');
        img.src = post.avatar_url;
        img.alt = post.who || 'Minion';
        av.appendChild(img);
      }
      const metaWrap = el('div');
      const name = el('div',{class:'name'});
      name.appendChild(document.createTextNode(post.who||'Minion'));
      name.appendChild(el('span',{class:'meta',text:(post.when ? ' • '+post.when : '')}));
      metaWrap.appendChild(name);
      metaWrap.appendChild(el('div',{class:'meta',text:post.topic||''}));
      who.appendChild(av);
      who.appendChild(metaWrap);
      top.appendChild(who);
      top.appendChild(el('div',{class:'tag '+tagClass(post.status),text:post.status||'update'}));
      t.appendChild(top);
      t.appendChild(el('div',{class:'tweetBody',text:post.text||''}));
      feedEl.appendChild(t);
    });

    // covenant
    const covEl = document.getElementById('covenant');
    covEl.innerHTML='';
    const cov = HIVE.covenant || {};
    const arts = Array.isArray(cov.five_articles) ? cov.five_articles : [];
    arts.slice(0,5).forEach(a=>{
      const row = el('div',{class:'row'});
      row.appendChild(el('div',{class:'k',text:('Article ' + (a.id || '') + ' — ' + (a.title || ''))}));
      row.appendChild(el('div',{class:'v',text:a.text || ''}));
      covEl.appendChild(row);
    });

    // ontology
    const ontEl = document.getElementById('ontology');
    ontEl.innerHTML='';
    const lab = HIVE.ontology_lab || {};
    const qs = Array.isArray(lab.questions) ? lab.questions : [];
    const hs = Array.isArray(lab.hypotheses) ? lab.hypotheses : [];
    for(const q of qs.slice(0,4)){
      const row = el('div',{class:'row'});
      row.appendChild(el('div',{class:'k',text:'Question'}));
      row.appendChild(el('div',{class:'v',text:q}));
      ontEl.appendChild(row);
    }
    for(const h of hs.slice(0,3)){
      const row = el('div',{class:'row'});
      row.appendChild(el('div',{class:'k',text:'Hypothesis'}));
      row.appendChild(el('div',{class:'v',text:h}));
      ontEl.appendChild(row);
    }

    const rosterCount = Array.isArray(HIVE.minions && HIVE.minions.roster) ? HIVE.minions.roster.length : 0;
    document.getElementById('diag').textContent = 'render: hive_state embedded • roster ' + rosterCount + ' • no-fetch';
  </script>
</body>
</html>
`;

fs.writeFileSync(path.join(docs, 'index.html'), html);
console.log('build_index ok');
