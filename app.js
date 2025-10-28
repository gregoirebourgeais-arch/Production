// === Atelier PPNC - Script complet version marbre améliorée ===

// ----------- MISE À JOUR HEURE / DATE / ÉQUIPE -----------
function majHorloge() {
  const now = new Date();
  const date = now.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  const heure = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const week = Math.ceil(((now - new Date(now.getFullYear(), 0, 1)) / 86400000 + now.getDay() + 1) / 7);
  const day = now.getDate();

  // Détermination équipe
  const h = now.getHours();
  let equipe = "";
  if (h >= 5 && h < 13) equipe = "M";
  else if (h >= 13 && h < 21) equipe = "A";
  else equipe = "N";

  document.getElementById("date").textContent = date;
  document.getElementById("semaine").textContent = "Semaine " + week;
  document.getElementById("equipe").textContent = "Équipe " + equipe;
  document.getElementById("heure").textContent = heure;
}
setInterval(majHorloge, 1000);
majHorloge();

// ----------- NAVIGATION ENTRE PAGES -----------
function ouvrirPage(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ----------- DONNÉES / PERSISTANCE -----------
let data = JSON.parse(localStorage.getItem("atelierData")) || {
  production: [],
  arrets: [],
  organisation: [],
  personnel: []
};

function sauvegarder() {
  localStorage.setItem("atelierData", JSON.stringify(data));
}

// ----------- CALCUL CADENCE + ESTIMATION -----------
function calculerCadence(debut, fin, quantite) {
  if (!debut || !fin || !quantite) return 0;
  const h1 = new Date("1970-01-01T" + debut + ":00");
  const h2 = new Date("1970-01-01T" + fin + ":00");
  const diffH = (h2 - h1) / 3600000;
  return diffH > 0 ? (quantite / diffH).toFixed(1) : 0;
}

function estimerFin(quantiteRestante, cadence) {
  if (!quantiteRestante || !cadence) return "";
  const heures = (quantiteRestante / cadence).toFixed(2);
  const h = Math.floor(heures);
  const m = Math.round((heures - h) * 60);
  return `${h}h ${m}min restantes`;
}

// ----------- FORMULAIRES PRODUCTION (10 lignes) -----------
const lignes = ["râpé","t2","rt","omori","t1","sticks","emballage","dés","filets","prédécoupé"];
lignes.forEach(ligne => {
  const section = document.getElementById(ligne);
  if (section) {
    section.innerHTML += `
      <form onsubmit="enregistrerProduction(event, '${ligne}')">
        <label>Heure début :</label><input type="time" id="debut-${ligne}" required>
        <label>Heure fin :</label><input type="time" id="fin-${ligne}" required>
        <label>Quantité produite :</label><input type="number" id="quantite-${ligne}" required>
        <label>Quantité restante :</label><input type="number" id="restante-${ligne}" placeholder="facultatif" oninput="majEstimation('${ligne}')">
        <label>Cadence manuelle :</label><input type="number" id="cadenceManuelle-${ligne}" placeholder="optionnel" oninput="majEstimation('${ligne}')">
        <div id="estimation-${ligne}" class="estimation"></div>
        <button type="submit">Enregistrer</button>
      </form>
      <div id="historique-${ligne}" class="historique"></div>
    `;
  }
});

function majEstimation(ligne) {
  const restante = parseFloat(document.getElementById(`restante-${ligne}`).value);
  const cadenceManuelle = parseFloat(document.getElementById(`cadenceManuelle-${ligne}`).value);
  const estimation = estimerFin(restante, cadenceManuelle || 0);
  document.getElementById(`estimation-${ligne}`).textContent = estimation;
}

function enregistrerProduction(e, ligne) {
  e.preventDefault();
  const debut = document.getElementById(`debut-${ligne}`).value;
  const fin = document.getElementById(`fin-${ligne}`).value;
  const qte = parseFloat(document.getElementById(`quantite-${ligne}`).value);
  const qteRestante = parseFloat(document.getElementById(`restante-${ligne}`).value || 0);
  const cadenceManuelle = parseFloat(document.getElementById(`cadenceManuelle-${ligne}`).value || 0);
  const cadence = cadenceManuelle || calculerCadence(debut, fin, qte);
  const estimation = estimerFin(qteRestante, cadence);
  const now = new Date();
  const equipe = document.getElementById("equipe").textContent;

  const enreg = { date: now.toLocaleString(), ligne, debut, fin, qte, qteRestante, cadence, estimation, equipe };
  data.production.push(enreg);
  sauvegarder();
  afficherHistorique(ligne);
  e.target.reset();
  document.getElementById(`estimation-${ligne}`).textContent = "";
}

function afficherHistorique(ligne) {
  const div = document.getElementById(`historique-${ligne}`);
  div.innerHTML = "<h3>Historique</h3>";
  data.production.filter(d => d.ligne === ligne)
    .slice(-10)
    .reverse()
    .forEach(d => {
      div.innerHTML += `<div>🕓 ${d.date} | Qte: ${d.qte} | Cad: ${d.cadence}/h | ${d.estimation}</div>`;
    });
}
lignes.forEach(afficherHistorique);

// ----------- ARRÊTS -----------
function enregistrerArret() {
  const ligne = document.getElementById("ligneArret").value;
  const type = document.getElementById("typeArret").value;
  const temps = document.getElementById("tempsArret").value;
  const com = document.getElementById("commentArret").value;
  if (!ligne || !temps) return;
  const equipe = document.getElementById("equipe").textContent;
  const now = new Date();
  data.arrets.push({ date: now.toLocaleString(), ligne, type, temps, com, equipe });
  sauvegarder();
  document.getElementById("formArret").reset();
  afficherArrets();
}

function afficherArrets() {
  const hist = document.getElementById("historiqueArrets");
  hist.innerHTML = "<h3>Historique des arrêts</h3>";
  data.arrets.slice(-15).reverse().forEach(a => {
    hist.innerHTML += `<div>🔧 ${a.date} | ${a.ligne} | ${a.type} ${a.temps}min | ${a.com || ""}</div>`;
  });
}
afficherArrets();

// ----------- ORGANISATION / CONSIGNES -----------
function enregistrerConsigne() {
  const texte = document.getElementById("texteConsigne").value;
  if (!texte) return;
  const equipe = document.getElementById("equipe").textContent;
  const now = new Date();
  data.organisation.push({ date: now.toLocaleString(), texte, valide: false, equipe });
  sauvegarder();
  document.getElementById("formOrganisation").reset();
  afficherConsignes();
}

function afficherConsignes() {
  const div = document.getElementById("historiqueOrganisation");
  div.innerHTML = "<h3>Consignes</h3>";
  data.organisation.slice(-15).reverse().forEach((c, i) => {
    div.innerHTML += `<div><input type="checkbox" onchange="validerConsigne(${i})" ${c.valide ? "checked" : ""}> ${c.texte} (${c.equipe})</div>`;
  });
}

function validerConsigne(i) {
  data.organisation[i].valide = !data.organisation[i].valide;
  sauvegarder();
  afficherConsignes();
}
afficherConsignes();

// ----------- PERSONNEL -----------
function enregistrerPersonnel() {
  const nom = document.getElementById("nomPersonnel").value;
  const motif = document.getElementById("motifPersonnel").value;
  const com = document.getElementById("commentPersonnel").value;
  if (!nom) return;
  const equipe = document.getElementById("equipe").textContent;
  const now = new Date();
  data.personnel.push({ date: now.toLocaleString(), nom, motif, com, equipe });
  sauvegarder();
  document.getElementById("formPersonnel").reset();
  afficherPersonnel();
}

function afficherPersonnel() {
  const div = document.getElementById("historiquePersonnel");
  div.innerHTML = "<h3>Historique du personnel</h3>";
  data.personnel.slice(-15).reverse().forEach(p => {
    div.innerHTML += `<div>👤 ${p.date} | ${p.nom} - ${p.motif} (${p.equipe}) ${p.com || ""}</div>`;
  });
}
afficherPersonnel();

// ----------- GRAPHIQUE ATELIER -----------
const ctx = document.getElementById("graphiqueAtelier").getContext("2d");
const chart = new Chart(ctx, {
  type: 'line',
  data: { labels: [], datasets: [] },
  options: { responsive: true, scales: { y: { beginAtZero: true } } }
});

function majGraphique() {
  const lignesUniques = [...new Set(data.production.map(p => p.ligne))];
  const datasets = lignesUniques.map(ligne => {
    const points = data.production.filter(p => p.ligne === ligne);
    return {
      label: ligne,
      data: points.map(p => p.cadence),
      borderColor: "#" + Math.floor(Math.random()*16777215).toString(16),
      fill: false
    };
  });
  chart.data.labels = data.production.map(p => p.date).slice(-10);
  chart.data.datasets = datasets;
  chart.update();
}
majGraphique();

// ----------- EXPORT EXCEL MULTI-ONGLETS -----------
function exporterExcel() {
  const wb = XLSX.utils.book_new();
  const prod = XLSX.utils.json_to_sheet(data.production);
  const arr = XLSX.utils.json_to_sheet(data.arrets);
  const org = XLSX.utils.json_to_sheet(data.organisation);
  const pers = XLSX.utils.json_to_sheet(data.personnel);
  XLSX.utils.book_append_sheet(wb, prod, "Production");
  XLSX.utils.book_append_sheet(wb, arr, "Arrêts");
  XLSX.utils.book_append_sheet(wb, org, "Organisation");
  XLSX.utils.book_append_sheet(wb, pers, "Personnel");
  XLSX.writeFile(wb, "Atelier_PPNC.xlsx");
}

// ----------- CALCULATRICE FLOTTANTE -----------
const calc = document.getElementById("calculatrice");
const calcRes = document.getElementById("calcResultat");
const calcBoutons = document.getElementById("calcBoutons");
const boutons = ["7","8","9","/","4","5","6","*","1","2","3","-","0",".","=","C"];
calcBoutons.innerHTML = boutons.map(b=>`<button>${b}</button>`).join("");

calcBoutons.addEventListener("click", e=>{
  if(e.target.tagName!=="BUTTON") return;
  const val=e.target.textContent;
  if(val==="C") calcRes.value="";
  else if(val==="=") {
    try { calcRes.value=eval(calcRes.value); } catch { calcRes.value="Err"; }
  } else calcRes.value+=val;
});

calc.addEventListener("mousedown", dragStart);
let offsetX, offsetY;
function dragStart(e) {
  offsetX = e.clientX - calc.offsetLeft;
  offsetY = e.clientY - calc.offsetTop;
  document.addEventListener("mousemove", dragMove);
  document.addEventListener("mouseup", dragEnd);
}
function dragMove(e) {
  calc.style.left = e.clientX - offsetX + "px";
  calc.style.top = e.clientY - offsetY + "px";
}
function dragEnd() {
  document.removeEventListener("mousemove", dragMove);
  document.removeEventListener("mouseup", dragEnd);
      }
