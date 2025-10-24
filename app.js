/* =========================
   Utilitaires
========================= */
const LIGNES = ["Râpé","T2","RT","Omori","T1","Sticks","Emballage","Dés","Filets","Prédécoupés"];
const TEAM_SLOTS = [
  {code:"M", start:"05:00", end:"13:00"},
  {code:"AM", start:"13:00", end:"21:00"},
  {code:"N", start:"21:00", end:"05:00"} // chevauche minuit
];

// parse "HH:MM" en minutes depuis minuit
function timeToMin(hhmm) {
  if (!hhmm || !/^\d{2}:\d{2}$/.test(hhmm)) return null;
  const [h,m] = hhmm.split(":").map(n=>parseInt(n,10));
  return h*60 + m;
}
// format minutes depuis minuit → "HH:MM"
function minToTime(min) {
  min = ((min%1440)+1440)%1440; // wrap jour
  const h = Math.floor(min/60);
  const m = min%60;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
}
// durée en minutes, gère passage minuit (start peut être > end)
function spanMinutes(start, end) {
  if (start==null || end==null) return null;
  let d = end - start;
  if (d < 0) d += 1440;
  return d;
}
// convertit saisie "1,5" → 1.5
function num(val) {
  if (val==null) return NaN;
  const n = String(val).replace(",",".");
  return parseFloat(n);
}
// arrondi 2 décimales
const r2 = n => Math.round(n*100)/100;

/* =========================
   Etat / Stockage
========================= */
const KEY_PROD = "ppnc_prod";          // historiques production par ligne
const KEY_DRAFT = "ppnc_draft";        // brouillons par ligne (persistance jusqu’à save)
const KEY_ORG = "ppnc_org";            // consignes [{id, line, text, done, ts}]
const KEY_STOPS = "ppnc_stops";        // arrêts si besoin plus tard

const state = {
  currentLine: LIGNES[0],
  drafts: load(KEY_DRAFT, {}),        // { [ligne]: {start,end,qty,rest,manual} }
  prod: load(KEY_PROD, {}),           // { [ligne]: [ {ts,start,end,qty,rest,cadenceCalc,finishEst} ] }
  org: load(KEY_ORG, [])              // array
};

function load(key, fallback){
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function save(key, value){
  localStorage.setItem(key, JSON.stringify(value));
}

/* =========================
   Sélection de ligne & UI
========================= */
function qs(sel){ return document.querySelector(sel); }
function qsa(sel){ return [...document.querySelectorAll(sel)]; }

function initNav() {
  // boutons lignes
  LIGNES.forEach(name => {
    const btn = document.getElementById(`btn-${name}`);
    if (btn) {
      btn.addEventListener("click", () => {
        setCurrentLine(name);
      });
    }
  });

  // liens sections
  const sections = ["atelier","arrets","organisation","personnel"];
  sections.forEach(sec=>{
    const el = document.getElementById(`nav-${sec}`);
    if (el) el.addEventListener("click", ()=>showSection(sec));
  });
}

function setCurrentLine(line){
  state.currentLine = line;
  // marquage visuel
  LIGNES.forEach(n=>{
    const b = document.getElementById(`btn-${n}`);
    if (b) b.classList.toggle("active", n===line);
  });
  // charger brouillon éventuel
  fillDraftFor(line);
  // scroll au formulaire ligne si besoin
  const anchor = qs("#form-ligne-anchor");
  if (anchor) anchor.scrollIntoView({behavior:"smooth", block:"start"});
}

function showSection(id){
  qsa(".section").forEach(s=>s.classList.add("hidden"));
  const sec = document.getElementById(`section-${id}`);
  if (sec) sec.classList.remove("hidden");
}

/* =========================
   Equipe actuelle (affichage en-tête)
========================= */
function computeTeamNow(){
  const now = new Date();
  const min = now.getHours()*60 + now.getMinutes();
  // slot N chevauche minuit => on teste spécifiquement
  const inSlot = (slot)=>{
    const s = timeToMin(slot.start);
    const e = timeToMin(slot.end);
    if (slot.code==="N") {
      return (min>=s || min<e);
    }
    return (min>=s && min<e);
  };
  const slot = TEAM_SLOTS.find(inSlot) || TEAM_SLOTS[0];
  const label = `${slot.code} (${slot.start}–${slot.end})`;
  const span = qs("#team-label");
  if (span) span.textContent = label;
}

/* =========================
   FORM PRODUCTION (par ligne)
========================= */
const elStart  = qs("#prod-start");
const elEnd    = qs("#prod-end");
const elQty    = qs("#prod-qty");
const elRest   = qs("#prod-rest");
const elMan    = qs("#prod-manual");
const elCad    = qs("#prod-cadence");
const elFin    = qs("#prod-finish");
const elSave   = qs("#prod-save");
const elReset  = qs("#prod-reset");
const elHist   = qs("#prod-history");

function hoursOptions(){
  // options toutes les minutes (00:00 -> 23:59)
  let opts = '<option value="">—</option>';
  for (let h=0; h<24; h++){
    for (let m=0; m<60; m++){
      opts += `<option value="${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}">
        ${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}
      </option>`;
    }
  }
  return opts;
}

function mountProdForm(){
  if (elStart && !elStart.dataset.filled) {
    elStart.innerHTML = hoursOptions();
    elEnd.innerHTML   = hoursOptions();
    elStart.dataset.filled = "1";
  }

  // listeners calcul en direct
  [elStart, elEnd, elQty].forEach(el => el && el.addEventListener("change", updateCadence));
  [elRest, elMan, elStart, elEnd].forEach(el => el && el.addEventListener("input", updateFinishEst));
  if (elMan) elMan.addEventListener("input", updateCadence);

  // boutons
  if (elSave) elSave.addEventListener("click", saveProduction);
  if (elReset) elReset.addEventListener("click", resetDraft);

  // sauvegarde brouillon à chaque frappe
  [elStart,elEnd,elQty,elRest,elMan].forEach(el=>{
    if (!el) return;
    el.addEventListener("input", saveDraftLive);
    el.addEventListener("change", saveDraftLive);
  });

  // remplir brouillon de la ligne active
  fillDraftFor(state.currentLine);
  // rafraîchir historique
  renderProdHistory();
}

function fillDraftFor(line){
  const d = state.drafts[line] || {};
  if (elStart) setSelectValue(elStart, d.start || "");
  if (elEnd)   setSelectValue(elEnd,   d.end   || "");
  if (elQty)   elQty.value  = d.qty   ?? "";
  if (elRest)  elRest.value = d.rest  ?? "";
  if (elMan)   elMan.value  = d.manual?? "";

  updateCadence();
  updateFinishEst();
}

function setSelectValue(select, value){
  if (!select) return;
  if ([...select.options].some(o=>o.value===value)) {
    select.value = value;
  } else {
    select.value = "";
  }
}

function saveDraftLive(){
  const L = state.currentLine;
  state.drafts[L] = {
    start: elStart?.value || "",
    end:   elEnd?.value || "",
    qty:   elQty?.value || "",
    rest:  elRest?.value || "",
    manual: elMan?.value || ""
  };
  save(KEY_DRAFT, state.drafts);
}

/* ----- Calcul cadence ----- */
function updateCadence(){
  if (!elCad) return;
  const manual = num(elMan?.value);
  if (!isNaN(manual) && manual>0){
    elCad.value = r2(manual) + " colis/h (manuel)";
    updateFinishEst();
    return;
  }

  const qty = num(elQty?.value);
  const s = timeToMin(elStart?.value);
  const e = timeToMin(elEnd?.value);
  const minutes = spanMinutes(s,e);
  if (isNaN(qty) || qty<=0 || minutes==null || minutes<=0){
    elCad.value = "";
    updateFinishEst();
    return;
  }
  const h = minutes/60;
  const cad = qty/h; // colis / h
  elCad.value = r2(cad) + " colis/h";
  updateFinishEst();
}

/* ----- Estimation de fin en direct ----- */
function getEffectiveCadence(){
  const manual = num(elMan?.value);
  if (!isNaN(manual) && manual>0) return manual;

  const txt = elCad?.value || "";
  const m = txt.match(/([\d.,]+)/);
  if (m) return num(m[1]);
  return NaN;
}

function updateFinishEst(){
  if (!elFin) return;
  const rest = num(elRest?.value);
  const cad = getEffectiveCadence();
  if (isNaN(rest) || rest<=0 || isNaN(cad) || cad<=0){
    elFin.value = "";
    return;
  }

  const minutesNeeded = Math.ceil(rest / cad * 60); // min
  const endRef = timeToMin(elEnd?.value);

  if (endRef!=null) {
    // on affiche une HEURE estimée
    const fin = minToTime(endRef + minutesNeeded);
    elFin.value = `~ ${fin}`;
  } else {
    // pas d'heure de fin fournie → on affiche un TEMPS restant
    const h = Math.floor(minutesNeeded/60);
    const m = minutesNeeded%60;
    elFin.value = `~ ${h>0? h+"h ":""}${String(m).padStart(2,"0")}min`;
  }
}

/* ----- Enregistrer production ----- */
function saveProduction(){
  const L = state.currentLine;
  const data = {
    ts: new Date().toISOString(),
    start: elStart?.value || "",
    end: elEnd?.value || "",
    qty: num(elQty?.value) || 0,
    rest: num(elRest?.value) || 0,
    cadenceCalc: getEffectiveCadence() || null,
    finishEst: elFin?.value || ""
  };

  if (!state.prod[L]) state.prod[L] = [];
  state.prod[L].unshift(data);
  save(KEY_PROD, state.prod);

  // purge brouillon de cette ligne + vider champs
  delete state.drafts[L];
  save(KEY_DRAFT, state.drafts);
  clearProdFields();

  renderProdHistory();
}

function clearProdFields(){
  if (elStart) elStart.value = "";
  if (elEnd)   elEnd.value   = "";
  if (elQty)   elQty.value   = "";
  if (elRest)  elRest.value  = "";
  if (elMan)   elMan.value   = "";
  if (elCad)   elCad.value   = "";
  if (elFin)   elFin.value   = "";
}

function resetDraft(){
  const L = state.currentLine;
  delete state.drafts[L];
  save(KEY_DRAFT, state.drafts);
  clearProdFields();
}

/* ----- Historique ----- */
function renderProdHistory(){
  if (!elHist) return;
  const L = state.currentLine;
  const arr = state.prod[L] || [];
  if (arr.length===0){
    elHist.innerHTML = `<div class="muted">Aucun enregistrement pour ${L}.</div>`;
    return;
  }
  elHist.innerHTML = arr.map((it,idx)=> {
    const d = new Date(it.ts);
    const stamp = d.toLocaleString();
    return `
      <div class="item">
        <div class="item-main">
          <div><strong>${stamp}</strong> — ${it.start||"—"} → ${it.end||"—"}</div>
          <div>Q=${it.qty||0} | Rest=${it.rest||0} | Cad=${it.cadenceCalc? r2(it.cadenceCalc):"—"} | Fin ${it.finishEst||"—"}</div>
        </div>
        <button class="icon danger" data-del="${idx}" title="Supprimer">🗑️</button>
      </div>
    `;
  }).join("");

  elHist.querySelectorAll("button[data-del]").forEach(btn=>{
    btn.addEventListener("click", (e)=>{
      const i = parseInt(btn.dataset.del,10);
      if (confirm("Supprimer cet enregistrement ?")){
        state.prod[L].splice(i,1);
        save(KEY_PROD, state.prod);
        renderProdHistory();
      }
    });
  });
}

/* =========================
   CONSIGNES (par ligne)
========================= */
const orgLigne = qs("#org-ligne");
const orgConsigne = qs("#org-consigne");
const orgDone = qs("#org-done");
const orgSave = qs("#org-save");
const orgList = qs("#org-list");

function mountOrganisation(){
  if (orgSave) orgSave.addEventListener("click", saveConsigne);
  renderConsignes();
}

function saveConsigne(){
  const line = orgLigne?.value || LIGNES[0];
  const text = (orgConsigne?.value || "").trim();
  const done = !!orgDone?.checked;
  if (!text) return;

  const item = {
    id: crypto.randomUUID(),
    line, text, done,
    ts: new Date().toISOString()
  };
  state.org.unshift(item);
  save(KEY_ORG, state.org);

  // vider champs
  if (orgConsigne) orgConsigne.value = "";
  if (orgDone) orgDone.checked = false;

  renderConsignes();
}

function renderConsignes(){
  if (!orgList) return;
  if (state.org.length===0){
    orgList.innerHTML = `<div class="muted">Aucune consigne.</div>`;
    return;
  }
  orgList.innerHTML = state.org.map(it=>{
    const d = new Date(it.ts).toLocaleString();
    const chk = it.done ? "checked" : "";
    const badge = it.done ? "✅" : "⏳";
    return `
      <div class="item">
        <div class="item-main">
          <div><strong>${d}</strong> — <em>${it.line}</em> ${badge}</div>
          <div>${escapeHtml(it.text)}</div>
        </div>
        <label class="switch" title="Marquer réalisée pour ${it.line}">
          <input type="checkbox" data-id="${it.id}" ${chk}/>
          <span></span>
        </label>
      </div>
    `;
  }).join("");

  orgList.querySelectorAll('input[type="checkbox"][data-id]').forEach(chk=>{
    chk.addEventListener("change", ()=>{
      const id = chk.dataset.id;
      const it = state.org.find(x=>x.id===id);
      if (!it) return;
      it.done = chk.checked;
      save(KEY_ORG, state.org);
      renderConsignes();
    });
  });
}

function escapeHtml(s){
  return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

/* =========================
   BOOT (version corrigée)
========================= */
function tickHeader(){
  const h = qs("#header-clock");
  if (h) {
    const now = new Date();
    const d = now.toLocaleDateString("fr-FR",{weekday:"long", day:"2-digit", month:"long", year:"numeric"});
    const t = now.toLocaleTimeString("fr-FR",{hour:"2-digit", minute:"2-digit", second:"2-digit"});
    h.textContent = `${d} — ${t}`;
  }
  computeTeamNow();
}
setInterval(tickHeader, 1000);

// >>> VERSION FIXEE : assure l’attachement des boutons à chaque rechargement
function initAll(){
  initNav();                // boutons menu & lignes
  setCurrentLine(LIGNES[0]);
  mountProdForm();          // formulaire prod
  mountOrganisation();      // page consignes
  tickHeader();             // horloge & équipe
}

// Exécution dès que le DOM est prêt (y compris après actualisation)
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAll);
} else {
  initAll();
}

// Réattache tout si l’utilisateur revient sur la page (visibilité restaurée)
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    initAll();
  }
});
});
