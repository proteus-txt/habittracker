(() => {
  const STORAGE_KEY = "my-habits-tracker-v1";
  const $ = (id) => document.getElementById(id);
  const todayKey = (date = new Date()) => {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  };
  const dateOffset = (offset) => { const d = new Date(); d.setDate(d.getDate()+offset); return d; };
  const formatDate = (date) => new Intl.DateTimeFormat("uk-UA", {weekday:"long", day:"numeric", month:"long"}).format(date);
  const esc = (str) => String(str).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const uid = () => (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const starterHabits = [
    {id:uid(),name:"Випити склянку води",emoji:"💧",color:"#61d6b2",completions:[]},
    {id:uid(),name:"Прочитати 10 хвилин",emoji:"📚",color:"#a78bfa",completions:[]},
    {id:uid(),name:"Рухатися хоча б 15 хв",emoji:"🏃",color:"#f6bd60",completions:[]}
  ];
  let state = loadState();
  let editingId = null, chosenEmoji = "✦", chosenColor = "#a78bfa", toastTimer;
  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.habits)) return parsed;
      }
    } catch(e) { console.warn("Не вдалося прочитати локальні дані", e); }
    return {habits:starterHabits};
  }
  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch(e) { showToast("Не вдалося зберегти дані на пристрої"); }
  }
  function isDone(habit, key=todayKey()) { return habit.completions.includes(key); }
  function streak(habit) {
    let n=0, d=new Date();
    if (!isDone(habit,todayKey())) d.setDate(d.getDate()-1);
    for (let i=0;i<3650;i++) {
      if (habit.completions.includes(todayKey(d))) { n++; d.setDate(d.getDate()-1); }
      else break;
    }
    return n;
  }
  function render() {
    const now = new Date(), key = todayKey();
    $("todayLabel").textContent = formatDate(now).toLocaleUpperCase("uk-UA");
    $("dateTitle").textContent = "Твій день — твій темп.";
    $("dayNumber").textContent = now.getDate();
    $("monthShort").textContent = new Intl.DateTimeFormat("uk-UA",{month:"short"}).format(now).replace(".","").toUpperCase();
    const done = state.habits.filter(h=>isDone(h,key)).length;
    const total = state.habits.length;
    const pct = total ? Math.round(done/total*100) : 0;
    $("progressPercent").textContent = pct;
    $("progressBar").style.width = `${pct}%`;
    $("doneCount").textContent = `${done} із ${total} виконано`;
    $("remainingCount").textContent = total ? (done===total ? "Усе виконано ✨" : `Залишилось ${total-done}`) : "Додай першу звичку";
    $("progressCaption").textContent = pct===100 && total ? "Чудово! Ти зробив це сьогодні." : pct>=50 ? "Гарний темп. Продовжуй!" : "Маленький крок теж рахується.";
    const list = $("habitsList");
    if (!total) {
      list.innerHTML = `<div class="empty-state"><div class="empty-symbol">✳</div><h3>Почни з однієї звички</h3><p>Не потрібно змінювати все одразу. Додай маленьку дію, яку хочеш повторювати щодня.</p></div>`;
    } else {
      list.innerHTML = state.habits.map(h=>{
        const complete = isDone(h,key), s=streak(h);
        return `<article class="habit-card ${complete?"completed":""}" data-id="${esc(h.id)}">
          <div class="habit-icon" style="--habit-color:${esc(h.color)}">${esc(h.emoji)}</div>
          <div class="habit-main"><div class="habit-name">${esc(h.name)}</div><div class="habit-meta">${s?`<span class="streak-dot">✦</span><span>${s} ${s===1?"день":"дн."} поспіль</span>`:"<span>Крок за кроком</span>"}</div></div>
          <button class="check-button" data-action="toggle" data-id="${esc(h.id)}" aria-label="${complete?"Скасувати виконання":"Позначити виконаною"}">${complete?"✓":"✓"}</button>
        </article>`;
      }).join("");
    }
    const week = Array.from({length:7},(_,i)=>dateOffset(i-6));
    const weekCount = week.reduce((sum,d)=>sum+state.habits.reduce((n,h)=>n+(h.completions.includes(todayKey(d))?1:0),0),0);
    $("weekTotal").innerHTML = `${weekCount} <small>разів</small>`;
    $("bestStreak").innerHTML = `${Math.max(0,...state.habits.map(streak))} <small>днів</small>`;
    const max = Math.max(1,...week.map(d=>state.habits.reduce((n,h)=>n+(h.completions.includes(todayKey(d))?1:0),0)));
    $("weeklyChart").innerHTML = week.map(d=>{
      const n=state.habits.reduce((sum,h)=>sum+(h.completions.includes(todayKey(d))?1:0),0);
      const height=n===0?0:Math.max(5,n/max*100);
      const day=new Intl.DateTimeFormat("uk-UA",{weekday:"short"}).format(d).replace(".","");
      return `<div class="chart-day"><span class="bar-count">${n||""}</span><div class="bar-track"><div class="bar-fill" style="height:${height}%"></div></div><span class="bar-label">${day}</span></div>`;
    }).join("");
  }
  function showToast(message) {
    const el=$("toast"); el.textContent=message; el.classList.add("show");
    clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove("show"),2400);
  }
  function openAdd() {
    editingId=null; chosenEmoji="✦"; chosenColor="#a78bfa";
    $("dialogTitle").textContent="Додати звичку"; $("habitName").value="";
    $("deleteHabitBtn").classList.add("hidden"); updateChoices();
    $("habitDialog").showModal(); setTimeout(()=>$("habitName").focus(),100);
  }
  function openEdit(id) {
    const h=state.habits.find(x=>x.id===id); if(!h)return;
    editingId=id; chosenEmoji=h.emoji; chosenColor=h.color;
    $("dialogTitle").textContent="Редагувати звичку"; $("habitName").value=h.name;
    $("deleteHabitBtn").classList.remove("hidden"); updateChoices(); $("habitDialog").showModal();
  }
  function updateChoices() {
    document.querySelectorAll(".emoji-choice").forEach(b=>b.classList.toggle("selected",b.dataset.emoji===chosenEmoji));
    document.querySelectorAll(".color-choice").forEach(b=>b.classList.toggle("selected",b.dataset.color===chosenColor));
  }
  $("addHabitBtn").addEventListener("click",openAdd);
  $("closeDialog").addEventListener("click",()=>$("habitDialog").close());
  $("iconChoices").addEventListener("click",e=>{const b=e.target.closest("[data-emoji]");if(b){chosenEmoji=b.dataset.emoji;updateChoices();}});
  $("colorChoices").addEventListener("click",e=>{const b=e.target.closest("[data-color]");if(b){chosenColor=b.dataset.color;updateChoices();}});
  $("habitForm").addEventListener("submit",e=>{
    e.preventDefault(); const name=$("habitName").value.trim(); if(!name)return;
    if(editingId) {const h=state.habits.find(x=>x.id===editingId); if(h)Object.assign(h,{name,emoji:chosenEmoji,color:chosenColor});}
    else state.habits.push({id:uid(),name,emoji:chosenEmoji,color:chosenColor,completions:[]});
    saveState(); $("habitDialog").close(); render(); showToast(editingId?"Звичку оновлено":"Звичку додано");
  });
  $("deleteHabitBtn").addEventListener("click",()=>{
    if(!editingId)return;
    if(confirm("Видалити цю звичку та її історію виконання?")) {
      state.habits=state.habits.filter(h=>h.id!==editingId); saveState(); $("habitDialog").close(); render(); showToast("Звичку видалено");
    }
  });
  $("habitsList").addEventListener("click",e=>{
    const btn=e.target.closest("[data-action='toggle']");
    if(btn){const h=state.habits.find(x=>x.id===btn.dataset.id);if(!h)return;const key=todayKey();h.completions=h.completions||[];h.completions=isDone(h,key)?h.completions.filter(x=>x!==key):[...h.completions,key];saveState();render();return;}
    const card=e.target.closest(".habit-card"); if(card)openEdit(card.dataset.id);
  });
  $("exportBtn").addEventListener("click",()=>{
    const blob=new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),...state},null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`zvychky-backup-${todayKey()}.json`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);showToast("Резервну копію підготовлено");
  });
  $("exportBtn").addEventListener("contextmenu",e=>{e.preventDefault();$("importDialog").showModal();});
  $("closeImportDialog").addEventListener("click",()=>$("importDialog").close());
  $("importForm").addEventListener("submit",async e=>{
    e.preventDefault();const file=$("importFile").files[0];if(!file)return;
    try{const parsed=JSON.parse(await file.text());if(!parsed||!Array.isArray(parsed.habits))throw new Error("bad");if(!confirm("Замінити поточні дані вмістом резервної копії?"))return;state={habits:parsed.habits.map(h=>({...h,completions:Array.isArray(h.completions)?h.completions:[]}))};saveState();render();$("importDialog").close();showToast("Дані відновлено");}
    catch(err){showToast("Це не схоже на резервну копію трекера");}
  });
  // Довге натискання на кнопку експорту відкриває імпорт на сенсорних екранах.
  let holdTimer;
  $("exportBtn").addEventListener("touchstart",()=>{holdTimer=setTimeout(()=>$("importDialog").showModal(),700)},{passive:true});
  ["touchend","touchmove","touchcancel"].forEach(evt=>$("exportBtn").addEventListener(evt,()=>clearTimeout(holdTimer),{passive:true}));
  if("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
  }
  render();
})();