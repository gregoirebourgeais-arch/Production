/* app.js - Atelier PPNC (version "marbre" complète)
 - Persistance: localStorage keys: atelier_history, production_history, arrets_history, consignes_history, personnel_history, settings
 - Graphique atelier: Chart.js line per line (cadence evolution)
 - Export: XLSX, filename timestamped
 - Calculator: open/close and draggable, insert result into focused numeric field
*/

// -------------------- CONFIG --------------------
const LINES = ["Râpé","T2","RT","OMORI","T1","Sticks","Emballage","Dés","Filets","Prédécoupés"];
const STORAGE_KEYS = {
  production: "ppnc_production_history",
  arrets: "ppnc_arrets_history",
  consignes: "ppnc_consignes_history",
  personnel: "ppnc_personnel_history",
  settings: "ppnc_settings"
};
let currentLine = LINES[0];
let currentTeam = "M"; // default - could be dynamic or selectable

// -------------------- BOOT --------------------
document.addEventListener("DOMContentLoaded",()=>{
  initUI();
  renderMeta();
  loadLineButtons();
  populateLineSelectors();
  restorePageState();
  renderAllHistories();
  initChart();
  attachCalculator();
  // default to Atelier page
  openPage('atelier', true);
  // refresh meta every minute
  setInterval(renderMeta, 60*1000);
});

// -------------------- META (date / heure / quantième / semaine / équipe) --------------------
function renderMeta(){
  const now = new Date();
  const options = {weekday:'long', day:'2-digit', month:'long', hour:'2-digit', minute:'2-digit'};
  const weekNr = getWeekNumber(now);
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(),0,0))/86400000);
  document.getElementById('metaLine').textContent = `${now.toLocaleDateString('fr-FR', {weekday:'long'})} ${now.toLocaleDateString('fr-FR')} | ${now.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} | Jour ${dayOfYear} | Semaine ${weekNr} | Équipe ${currentTeam}`;
}
function getWeekNumber(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(),0,1));
  return Math.ceil((((date - yearStart) / 86400000) + 1)/7);
}

// -------------------- UI / PAGES --------------------
function initUI(){
  // line buttons container
  const lineDiv = document.getElementById('lineButtons');
  LINES.forEach(l=>{
    const b=document.createElement('button');
    b.className='lineBtn';
    b.textContent = l;
    b.onclick = ()=> openLine(l);
    lineDiv.appendChild(b);
  });
  // calculator open button
  document.getElementById('calcOpenBtn').addEventListener('click', toggleCalculator);
}
function openPage(pageId, silent=false){
  document.querySelectorAll('.page').forEach(p=>{
    p.classList.add('hidden');
  });
  const page = document.getElementById(pageId);
  if(page) page.classList.remove('hidden');
  // if production and no line selected, open first line
  if(pageId === 'production' && !silent) {
    openLine(currentLine);
  }
  // if navigating to Atelier re-render chart
  if(pageId === 'atelier') {
    updateAtelierChart();
    renderAllHistories();
  }
  // Save last page in settings
  const s = loadSettings(); s.lastPage = pageId; saveSettings(s);
}
function restorePageState(){
  const s = loadSettings();
  if(s.lastPage) openPage(s.lastPage, true);
}
function loadLineButtons(){
  // Ensure the line top buttons (for quick navigation) exist above (we already created)
}
function openLine(line){
  currentLine = line;
  // navigate to production page and populate form
  openPage('production', true);
  document.getElementById('productionLineTitle').textContent = `Ligne ${line}`;
  // populate fields from last unfinished record if exists
  const prodHist = loadHistory(STORAGE_KEYS.production) || [];
  const last = prodHist.slice().reverse().find(r => r.line === line && !r.savedEnd); // unfinished pattern (if used)
  // reset form
  clearProductionForm();
  // set current line title and focus
  document.getElementById('productionLineTitle').textContent = `Ligne ${line}`;
  // ensure selectors show line
  setSelectValueById('arretLine', line);
  setSelectValueById('consigneLine', line);
  setSelectValueById('personnelLine', line);
  updateProductionHistoryList();
  updateAtelierChart();
  // scroll to form on mobile
  document.getElementById('productionFormCard').scrollIntoView({behavior:'smooth'});
}

// -------------------- UTIL --------------------
function loadHistory(key){
  const raw = localStorage.getItem(key);
  if(!raw) return [];
  try{ return JSON.parse(raw); } catch(e){ return []; }
}
function saveHistory(key, arr){
  localStorage.setItem(key, JSON.stringify(arr));
}
function loadSettings(){
  const raw = localStorage.getItem(STORAGE_KEYS.settings);
  if(!raw) return {};
  try{ return JSON.parse(raw); } catch(e){ return {}; }
}
function saveSettings(obj){
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(obj));
}
function setSelectValueById(id, value){
  const s = document.getElementById(id);
  if(!s) return;
  for(let i=0;i<s.options.length;i++){
    if(s.options[i].value === value){ s.selectedIndex = i; return; }
  }
}

// -------------------- PRODUCTION SAVE / HISTORY --------------------
function saveProduction(){
  const line = currentLine;
  const start = document.getElementById('startTime').value;
  const end = document.getElementById('endTime').value;
  const qty = Number(document.getElementById('qtyProduced').value || 0);
  const remainingRaw = document.getElementById('qtyRemaining').value;
  const remaining = remainingRaw === "" ? null : Number(remainingRaw);
  const manualCad = Number(document.getElementById('manualCadence').value || 0);

  // compute cadence: prefer manual if >0, else calculate from history/time
  let cadence = 0;
  if(manualCad && manualCad>0) cadence = manualCad;
  else cadence = estimateCadenceFromHistory(line);

  // compute estimated finish (time remaining) using cadence and remaining if present
  let timeRemainingStr = "--:--";
  if(remaining !== null && cadence > 0){
    const hours = remaining / cadence;
    timeRemainingStr = formatHoursToHHMM(hours);
  } else if (end && start){
    // if both times filled compute diff
    timeRemainingStr = computeRemainingFromTimes(start,end);
  } else if (remaining !== null && cadence === 0){
    timeRemainingStr = "—";
  }

  const rec = {
    ts: new Date().toISOString(),
    line,
    start,
    end,
    quantiteProduite: qty,
    quantiteRestante: remaining,
    cadence: cadence,
    timeRemaining: timeRemainingStr,
    team: currentTeam
  };
  const hist = loadHistory(STORAGE_KEYS.production);
  hist.push(rec);
  saveHistory(STORAGE_KEYS.production, hist);

  // Clear form immediately (persistence shown via history)
  clearProductionForm();

  // show updated lists
  updateProductionHistoryList();
  renderAllHistories();
  updateAtelierChart();

  // show brief confirmation
  alert(`Production enregistrée (${line}) — cadence ${cadence} colis/h — fin estimée ${timeRemainingStr}`);
}

function clearProductionForm(){
  document.getElementById('startTime').value = "";
  document.getElementById('endTime').value = "";
  document.getElementById('qtyProduced').value = "";
  document.getElementById('qtyRemaining').value = "";
  document.getElementById('manualCadence').value = "";
  document.getElementById('cadenceCalc').textContent = "0";
  document.getElementById('timeRemaining').textContent = "--:--";
}

function cancelProduction(){
  clearProductionForm();
  // optionally go back to Atelier
  openPage('atelier');
}

function resetProduction(){
  if(confirm("Remettre la ligne actuelle à zéro (cela n'efface pas l'historique) ?")){
    clearProductionForm();
  }
}

function updateProductionHistoryList(){
  const hist = loadHistory(STORAGE_KEYS.production).filter(h=>h.line===currentLine);
  const node = document.getElementById('productionHistoryList');
  if(hist.length===0){ node.innerHTML = "<em>Aucun enregistrement</em>"; return;}
  node.innerHTML = '';
  hist.slice().reverse().forEach(r=>{
    const div = document.createElement('div');
    div.className='history-item';
    div.textContent = `${formatShortTS(r.ts)} — ${r.start || '--'} → ${r.end || '--'} | Q=${r.quantiteProduite || 0} | Rest=${r.quantiteRestante!==null? r.quantiteRestante:'-'} | Cad=${r.cadence} | Fin ~ ${r.timeRemaining} (${r.team})`;
    node.appendChild(div);
  });
}

// -------------------- ARRETS --------------------
function saveArret(){
  const line = document.getElementById('arretLine').value || currentLine;
  const type = document.getElementById('arretType').value;
  const duree = Number(document.getElementById('arretDuree').value || 0);
  const comment = document.getElementById('arretComment').value || '';
  const rec = { ts:new Date().toISOString(), line, type, duree, comment, team:currentTeam };
  const hist = loadHistory(STORAGE_KEYS.arrets);
  hist.push(rec);
  saveHistory(STORAGE_KEYS.arrets, hist);
  // clear form
  document.getElementById('arretDuree').value='';
  document.getElementById('arretComment').value='';
  updateArretsHistory();
  renderAllHistories();
  alert('Arrêt enregistré');
}
function updateArretsHistory(){
  const hist = loadHistory(STORAGE_KEYS.arrets);
  const node = document.getElementById('arretsHistoryList');
  if(!node) return;
  if(hist.length===0){ node.innerHTML="<em>Aucun arrêt</em>"; return; }
  node.innerHTML='';
  hist.slice().reverse().forEach(r=>{
    const d=document.createElement('div'); d.className='history-item';
    d.textContent = `${formatShortTS(r.ts)} | ${r.line} | ${r.type} | ${r.duree} min | ${r.comment || ''} (${r.team})`;
    node.appendChild(d);
  });
}

// -------------------- CONSIGNES --------------------
function saveConsigne(){
  const texte = document.getElementById('consigneText').value || '';
  const valide = document.getElementById('consigneValide').checked;
  const line = document.getElementById('consigneLine').value || currentLine;
  if(!texte.trim()){ alert("Renseigne la consigne avant d'enregistrer."); return; }
  const rec = { ts:new Date().toISOString(), line, texte, valide, team:currentTeam };
  const hist = loadHistory(STORAGE_KEYS.consignes);
  hist.push(rec); saveHistory(STORAGE_KEYS.consignes, hist);
  document.getElementById('consigneText').value='';
  document.getElementById('consigneValide').checked=false;
  updateConsignesHistory();
  renderAllHistories();
  alert('Consigne enregistrée');
}
function updateConsignesHistory(){
  const hist = loadHistory(STORAGE_KEYS.consignes);
  const node = document.getElementById('consignesHistoryList');
  if(!node) return;
  if(hist.length===0){ node.innerHTML="<em>Aucune consigne</em>"; return; }
  node.innerHTML='';
  hist.slice().reverse().forEach(r=>{
    const d=document.createElement('div'); d.className='history-item';
    d.innerHTML = `<strong>${formatShortTS(r.ts)}</strong> — ${r.line} — ${r.texte} ${r.valide? '✅':''} (${r.team})`;
    node.appendChild(d);
  });
}

// -------------------- PERSONNEL --------------------
function savePersonnel(){
  const texte = document.getElementById('personnelText').value || '';
  const line = document.getElementById('personnelLine').value || currentLine;
  if(!texte.trim()){ alert("Renseigne le champ avant d'enregistrer."); return; }
  const rec = { ts:new Date().toISOString(), line, texte, team:currentTeam };
  const hist = loadHistory(STORAGE_KEYS.personnel);
  hist.push(rec); saveHistory(STORAGE_KEYS.personnel, hist);
  document.getElementById('personnelText').value='';
  updatePersonnelHistory();
  renderAllHistories();
  alert('Information personnel enregistrée');
}
function updatePersonnelHistory(){
  const node = document.getElementById('personnelHistoryList');
  const hist = loadHistory(STORAGE_KEYS.personnel);
  if(!node) return;
  if(hist.length===0){ node.innerHTML="<em>Aucun enregistrement</em>"; return; }
  node.innerHTML='';
  hist.slice().reverse().forEach(r=>{
    const d=document.createElement('div'); d.className='history-item';
    d.textContent = `${formatShortTS(r.ts)} | ${r.line} | ${r.texte} (${r.team})`;
    node.appendChild(d);
  });
}

// -------------------- GLOBAL HISTORIES (page Atelier) --------------------
function renderAllHistories(){
  // production + arrets + consignes + personnel summary
  const p = loadHistory(STORAGE_KEYS.production);
  const a = loadHistory(STORAGE_KEYS.arrets);
  const c = loadHistory(STORAGE_KEYS.consignes);
  const pe = loadHistory(STORAGE_KEYS.personnel);
  const list = document.getElementById('globalHistoryList');
  const arr = [];
  p.slice().reverse().slice(0,6).forEach(r=> arr.push(`${formatShortTS(r.ts)} | P ${r.line} Q=${r.quantiteProduite} Rest=${r.quantiteRestante!==null? r.quantiteRestante:'-'} (${r.team})`));
  a.slice().reverse().slice(0,4).forEach(r=> arr.push(`${formatShortTS(r.ts)} | A ${r.line} ${r.type} ${r.duree}min`));
  c.slice().reverse().slice(0,4).forEach(r=> arr.push(`${formatShortTS(r.ts)} | C ${r.line} ${r.texte}`));
  pe.slice().reverse().slice(0,4).forEach(r=> arr.push(`${formatShortTS(r.ts)} | S ${r.line} ${r.texte}`));
  if(arr.length===0){ list.innerHTML="<em>Aucun enregistrement</em>"; return;}
  list.innerHTML='';
  arr.forEach(t=>{
    const d=document.createElement('div'); d.className='history-item'; d.textContent=t; list.appendChild(d);
  });
}

// -------------------- HELPERS --------------------
function formatShortTS(iso){
  const d = new Date(iso);
  return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
}
function formatHoursToHHMM(hoursFloat){
  if(!isFinite(hoursFloat)) return "--:--";
  const totalMin = Math.round(hoursFloat*60);
  const hh = Math.floor(totalMin/60);
  const mm = totalMin%60;
  return `${hh.toString().padStart(2,'0')}:${mm.toString().padStart(2,'0')}`;
}
function computeRemainingFromTimes(startStr,endStr){
  try{
    if(!startStr || !endStr) return "--:--";
    const sParts = startStr.split(':').map(Number);
    const eParts = endStr.split(':').map(Number);
    const now = new Date();
    const s = new Date(now.getFullYear(),now.getMonth(),now.getDate(),sParts[0],sParts[1]);
    const e = new Date(now.getFullYear(),now.getMonth(),now.getDate(),eParts[0],eParts[1]);
    let diff = (e - new Date()); // time until end
    if(diff < 0) diff = 0;
    const mm = Math.round(diff/60000);
    const hh = Math.floor(mm/60);
    const m = mm%60;
    return `${hh.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`;
  }catch(e){ return "--:--"; }
}

// -------------------- CADENCE ESTIMATE (from history) --------------------
function estimateCadenceFromHistory(line){
  // use last N records to compute average cadence (colis/h)
  const hist = loadHistory(STORAGE_KEYS.production).filter(h=>h.line===line && (h.quantiteProduite>0));
  if(hist.length===0) return 0;
  // compute cadence per record when start/end present
  const cadences=[];
  for(let r of hist.slice(-10)){ // last 10
    if(r.start && r.end){
      const partsS=r.start.split(':').map(Number);
      const partsE=r.end.split(':').map(Number);
      const d = new Date(), s=new Date(d.getFullYear(),d.getMonth(),d.getDate(),partsS[0],partsS[1]);
      const e=new Date(d.getFullYear(),d.getMonth(),d.getDate(),partsE[0],partsE[1]);
      let h = (e - s)/3600000; if(h<=0) continue;
      cadences.push(r.quantiteProduite / h);
    } else if (r.cadence && r.cadence>0) cadences.push(r.cadence);
  }
  if(cadences.length===0) return 0;
  const avg = cadences.reduce((a,b)=>a+b,0)/cadences.length;
  return Math.round(avg*100)/100;
}

// -------------------- CHART (Atelier) --------------------
let atelierChart=null;
function initChart(){
  const ctx = document.getElementById('atelierChart').getContext('2d');
  atelierChart = new Chart(ctx, {
    type:'line',
    data:{ labels:[], datasets: [] },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      plugins:{
        legend:{display:true, position:'bottom'}
      },
      scales:{
        x:{ display:true, title:{display:false} },
        y:{ display:true, title:{display:true, text:'Cadence (colis/h)'} }
      }
    }
  });
  updateAtelierChart();
}
function updateAtelierChart(){
  if(!atelierChart) return;
  // Prepare dataset: for each line, build time series of cadence (minutes or timestamps)
  const hist = loadHistory(STORAGE_KEYS.production);
  // group by rounded time slots (e.g. hour:minute) and by line
  const seriesByLine = {};
  const labelsSet = new Set();
  hist.forEach(r=>{
    const t = new Date(r.ts);
    // bucket key: hour:minute -> prefer hh:mm
    const key = `${t.getHours().toString().padStart(2,'0')}:${t.getMinutes().toString().padStart(2,'0')}`;
    labelsSet.add(key);
    if(!seriesByLine[r.line]) seriesByLine[r.line] = {};
    // cadence available in record or estimate
    const cad = r.cadence || estimateCadenceFromHistory(r.line) || 0;
    seriesByLine[r.line][key] = cad;
  });
  const labels = Array.from(labelsSet).sort();
  const colors = paletteFor(LINES.length);
  const datasets = [];
  LINES.forEach((ln,i)=>{
    const data = labels.map(lbl => {
      const v = seriesByLine[ln] && seriesByLine[ln][lbl] ? seriesByLine[ln][lbl] : null;
      return v;
    });
    datasets.push({
      label: ln,
      data,
      borderColor: colors[i],
      backgroundColor: colors[i],
      tension:0.3,
      spanGaps: true,
      fill:false,
      pointRadius:4
    });
  });
  atelierChart.data.labels = labels;
  atelierChart.data.datasets = datasets;
  atelierChart.update();
}
function paletteFor(n){
  const palette = ['#a44',' #8a2be2','#5b9bd5','#00a596','#f39c12','#2b8cbe','#ff6b6b','#7b68ee','#4db6ac','#8e44ad'];
  // fallback distinct colors
  return LINES.map((_,i)=> palette[i % palette.length] || randomColor());
}
function randomColor(){ return '#'+Math.floor(Math.random()*16777215).toString(16); }

// -------------------- EXPORT XLSX --------------------
function exportAll(){
  const prod = loadHistory(STORAGE_KEYS.production);
  const ar = loadHistory(STORAGE_KEYS.arrets);
  const cons = loadHistory(STORAGE_KEYS.consignes);
  const pers = loadHistory(STORAGE_KEYS.personnel);

  const wb = XLSX.utils.book_new();

  // Production sheet
  const prodData = prod.map(r=>({
    Date: r.ts, Ligne: r.line, Debut: r.start, Fin: r.end,
    QuantiteProduite: r.quantiteProduite, QuantiteRestante: r.quantiteRestante,
    Cadence: r.cadence, FinEstimee: r.timeRemaining, Equipe: r.team
  }));
  const ws1 = XLSX.utils.json_to_sheet(prodData);
  XLSX.utils.book_append_sheet(wb, ws1, 'Production');

  // Arrets
  const arData = ar.map(r=>({Date:r.ts, Ligne:r.line, Type:r.type, DureeMin:r.duree, Comment:r.comment, Equipe:r.team}));
  const ws2 = XLSX.utils.json_to_sheet(arData);
  XLSX.utils.book_append_sheet(wb, ws2, 'Arrêts');

  // Consignes
  const consData = cons.map(r=>({Date:r.ts, Ligne:r.line, Texte:r.texte, Valide:r.valide ? 'Oui': 'Non', Equipe:r.team}));
  const ws3 = XLSX.utils.json_to_sheet(consData);
  XLSX.utils.book_append_sheet(wb, ws3, 'Consignes');

  // Personnel
  const persData = pers.map(r=>({Date:r.ts, Ligne:r.line, Texte:r.texte, Equipe:r.team}));
  const ws4 = XLSX.utils.json_to_sheet(persData);
  XLSX.utils.book_append_sheet(wb, ws4, 'Personnel');

  const now = new Date();
  const stamp = `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2,'0')}-${now.getDate().toString().padStart(2,'0')}_${now.getHours().toString().padStart(2,'0')}${now.getMinutes().toString().padStart(2,'0')}`;
  const filename = `AtelierPPNC_export_${stamp}.xlsx`;
  XLSX.writeFile(wb, filename);
  alert(`Export réalisé: ${filename}`);
}

// -------------------- INIT SELECTORS --------------------
function populateLineSelectors(){
  ['arretLine','consigneLine','personnelLine'].forEach(id=>{
    const sel = document.getElementById(id);
    if(!sel) return;
    sel.innerHTML = '';
    
