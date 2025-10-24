/* ===============================
   SYNTHÈSE ATELIER PPNC - SCRIPT COMPLET
   Version finale intégrale
=============================== */

const LIGNES = [
  "Râpé", "T2", "RT", "Omori", "T1",
  "Sticks", "Emballage", "Dés", "Filets", "Prédécoupés"
];

let currentSection = "atelier";
let currentLine = "Râpé";

// === UTILITAIRES ===
function qs(sel) { return document.querySelector(sel); }
function qsa(sel) { return document.querySelectorAll(sel); }
function getNowStr() { return new Date().toLocaleString("fr-FR"); }

// === STOCKAGE LOCAL ===
function saveData(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}
function loadData(key, def = []) {
  const d = localStorage.getItem(key);
  return d ? JSON.parse(d) : def;
}

// === NAVIGATION ENTRE SECTIONS ===
function showSection(id) {
  qsa(".section").forEach(s => s.classList.remove("active"));
  qs(`#section-${id}`).classList.add("active");
  currentSection = id;
}

// === HORLOGE ET ÉQUIPE ===
function updateClockAndTeam() {
  const now = new Date();
  const heure = now.getHours();
  let equipe = "";
  if (heure >= 5 && heure < 13) equipe = "M (5h-13h)";
  else if (heure >= 13 && heure < 21) equipe = "AM (13h-21h)";
  else equipe = "N (21h-5h)";
  qs("#clock").textContent = now.toLocaleTimeString("fr-FR");
  qs("#team-label").textContent = `Équipe ${equipe}`;
}
setInterval(updateClockAndTeam, 1000);

// === CALCUL DE CADENCE ET FIN ESTIMÉE ===
function calculerCadence(quantite, debut, fin) {
  if (!quantite || !debut || !fin) return 0;
  const [hd, md] = debut.split(":").map(Number);
  const [hf, mf] = fin.split(":").map(Number);
  let diff = (hf * 60 + mf) - (hd * 60 + md);
  if (diff <= 0) diff += 24 * 60;
  const heures = diff / 60;
  return heures ? (quantite / heures).toFixed(1) : 0;
}

function calculerFinEstimee(qteRestante, cadence) {
  if (!qteRestante || !cadence) return "--";
  const heures = qteRestante / cadence;
  const now = new Date();
  now.setHours(now.getHours() + heures);
  return now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

// === INITIALISATION DES HEURES ===
function remplirHeures(select) {
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 5) {
      const opt = document.createElement("option");
      opt.value = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      opt.textContent = opt.value;
      select.appendChild(opt);
    }
  }
}
remplirHeures(qs("#prod-start"));
remplirHeures(qs("#prod-end"));

// === PRODUCTION ===
function loadProdHistory(line) {
  const data = loadData(`prod-${line}`);
  const zone = qs("#prod-history");
  zone.innerHTML = "";
  data.forEach((r, i) => {
    const div = document.createElement("div");
    div.innerHTML = `<b>${r.date}</b> — ${r.quantite} colis, cadence ${r.cadence}/h, fin estimée ${r.finEstimee || "--"} 
    <button class="btn secondary" onclick="supprimerProd('${line}',${i})">🗑</button>`;
    zone.appendChild(div);
  });
}
function supprimerProd(line, i) {
  const data = loadData(`prod-${line}`);
  data.splice(i, 1);
  saveData(`prod-${line}`, data);
  loadProdHistory(line);
}

qs("#prod-save").addEventListener("click", () => {
  const line = currentLine;
  const qte = Number(qs("#prod-qty").value);
  const rest = Number(qs("#prod-rest").value);
  const hd = qs("#prod-start").value;
  const hf = qs("#prod-end").value;
  const cadAuto = Number(calculerCadence(qte, hd, hf));
  const cadMan = Number(qs("#prod-manual").value);
  const cadence = cadMan || cadAuto;
  const finEstimee = calculerFinEstimee(rest, cadence);
  const rec = {
    date: getNowStr(),
    quantite: qte,
    reste: rest,
    debut: hd,
    fin: hf,
    cadence,
    finEstimee
  };
  const data = loadData(`prod-${line}`);
  data.push(rec);
  saveData(`prod-${line}`, data);
  loadProdHistory(line);
  qs("#prod-qty").value = "";
  qs("#prod-rest").value = "";
  qs("#prod-manual").value = "";
  qs("#prod-cadence").value = cadence;
  qs("#prod-finish").value = finEstimee;
});

qs("#prod-rest").addEventListener("input", () => {
  const rest = Number(qs("#prod-rest").value);
  const cadence = Number(qs("#prod-manual").value || qs("#prod-cadence").value);
  qs("#prod-finish").value = calculerFinEstimee(rest, cadence);
});

qs("#prod-reset").addEventListener("click", () => {
  qs("#prod-qty").value = "";
  qs("#prod-rest").value = "";
  qs("#prod-manual").value = "";
  qs("#prod-cadence").value = "";
  qs("#prod-finish").value = "";
});

// === CHANGEMENT DE LIGNE ===
function setCurrentLine(l) {
  currentLine = l;
  qs("#current-line").textContent = `Ligne ${l}`;
  showSection("production");
  loadProdHistory(l);
}

// === ARRÊTS ===
function loadArrets() {
  const data = loadData("arrets");
  const list = qs("#arret-list");
  list.innerHTML = "";
  data.forEach((r) => {
    const div = document.createElement("div");
    div.textContent = `${r.date} — ${r.ligne} (${r.type}, ${r.duree} min) : ${r.comment}`;
    list.appendChild(div);
  });
}
qs("#arret-save").addEventListener("click", () => {
  const rec = {
    date: getNowStr(),
    ligne: qs("#arret-ligne").value,
    type: qs("#arret-type").value,
    duree: Number(qs("#arret-duree").value),
    comment: qs("#arret-comment").value
  };
  const data = loadData("arrets");
  data.push(rec);
  saveData("arrets", data);
  loadArrets();
  ["arret-duree","arret-comment"].forEach(id=>qs(`#${id}`).value="");
});

// === ORGANISATION ===
function loadOrg() {
  const data = loadData("organisation");
  const list = qs("#org-list");
  list.innerHTML = "";
  data.forEach((r, i) => {
    const div = document.createElement("div");
    div.innerHTML = `<b>${r.ligne}</b> — ${r.consigne} 
      <input type="checkbox" ${r.done ? "checked" : ""} onchange="validerConsigne(${i}, this.checked)"> ✅`;
    list.appendChild(div);
  });
}
function validerConsigne(i, done) {
  const data = loadData("organisation");
  data[i].done = done;
  saveData("organisation", data);
  loadOrg();
}
qs("#org-save").addEventListener("click", () => {
  const rec = {
    date: getNowStr(),
    ligne: qs("#org-ligne").value,
    consigne: qs("#org-consigne").value,
    done: qs("#org-done").checked
  };
  const data = loadData("organisation");
  data.push(rec);
  saveData("organisation", data);
  loadOrg();
  qs("#org-consigne").value = "";
  qs("#org-done").checked = false;
});

// === PERSONNEL ===
function loadPersonnel() {
  const data = loadData("personnel");
  const list = qs("#perso-list");
  list.innerHTML = "";
  data.forEach((r) => {
    const div = document.createElement("div");
    div.textContent = `${r.date} — ${r.nom} (${r.motif}) : ${r.comment}`;
    list.appendChild(div);
  });
}
qs("#perso-save").addEventListener("click", () => {
  const rec = {
    date: getNowStr(),
    nom: qs("#perso-nom").value,
    motif: qs("#perso-motif").value,
    comment: qs("#perso-comment").value
  };
  const data = loadData("personnel");
  data.push(rec);
  saveData("personnel", data);
  loadPersonnel();
  ["perso-nom","perso-comment"].forEach(id=>qs(`#${id}`).value="");
  qs("#perso-motif").value = "";
});

// === GRAPHIQUES ===
function renderGlobalChart() {
  const ctx = qs("#globalChart");
  if (!ctx) return;
  const totals = LIGNES.map(l => {
    const data = loadData(`prod-${l}`);
    return data.reduce((a,b)=>a+Number(b.quantite||0),0);
  });
  new Chart(ctx, {
    type: "bar",
    data: {
      labels: LIGNES,
      datasets: [{
        label: "Quantité totale (colis)",
        data: totals,
        backgroundColor: "#007bffaa"
      }]
    },
    options: {
      scales: { y: { beginAtZero: true } }
    }
  });
}

// === EXPORT EXCEL GLOBAL ===
function exportGlobalExcel() {
  const wb = XLSX.utils.book_new();
  const wsData = [["Type","Date","Ligne","Infos"]];
  LIGNES.forEach(l => {
    const prod = loadData(`prod-${l}`);
    prod.forEach(r => wsData.push(["Production",r.date,l,`${r.quantite} colis, cadence ${r.cadence}`]));
  });
  loadData("arrets").forEach(r => wsData.push(["Arrêt",r.date,r.ligne,`${r.type}, ${r.duree} min`]));
  loadData("organisation").forEach(r => wsData.push(["Organisation",r.date,r.ligne,r.consigne]));
  loadData("personnel").forEach(r => wsData.push(["Personnel",r.date,"",`${r.nom} (${r.motif}) : ${r.comment}`]));
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  XLSX.utils.book_append_sheet(wb, ws, "Synthèse Atelier");
  XLSX.writeFile(wb, `Synthese_Atelier_${new Date().toISOString().slice(0,10)}.xlsx`);
}

// === CALCULATRICE ===
function initCalc() {
  const btnCalc = qs("#calc-toggle");
  const calc = qs("#calc-float");
  const screen = qs("#calc-screen");
  const grid = qs("#calc-buttons");
  const buttons = ["7","8","9","/","4","5","6","*","1","2","3","-","0",".","=","+"];
  buttons.forEach(t=>{
    const b=document.createElement("button");
    b.textContent=t;
    b.onclick=()=>{
      if(t==="="){
        try{screen.textContent=eval(screen.textContent);}catch{screen.textContent="Erreur";}
      } else screen.textContent+=t;
    };
    grid.appendChild(b);
  });
  btnCalc.onclick=()=>calc.style.display="flex";
  qs("#calc-close").onclick=()=>calc.style.display="none";
}

// === NAVIGATION ===
function initNav() {
  qs("#nav-atelier").onclick=()=>{
    showSection("atelier");
    renderGlobalChart();
    loadArrets();
  };
  qs("#nav-arrets").onclick=()=>{ showSection("arrets"); loadArrets(); };
  qs("#nav-organisation").onclick=()=>{ showSection("organisation"); loadOrg(); };
  qs("#nav-personnel").onclick=()=>{ showSection("personnel"); loadPersonnel(); };
}

// === INITIALISATION ===
function initAll() {
  updateClockAndTeam();
  initNav();
  initCalc();
  LIGNES.forEach(l=>{
    const btn=document.createElement("button");
    btn.textContent=l;
    btn.className="btn secondary";
    btn.onclick=()=>setCurrentLine(l);
    qs(".main-nav").appendChild(btn);
  });
  renderGlobalChart();
  loadArrets();
  loadOrg();
  loadPersonnel();
}

document.addEventListener("DOMContentLoaded", initAll);
