// ---------- VARIABLES GLOBALES ----------
let currentPage = "atelier";
let historiqueData = JSON.parse(localStorage.getItem("historiqueData")) || {};
let arretsData = JSON.parse(localStorage.getItem("arretsData")) || [];
let consignesData = JSON.parse(localStorage.getItem("consignesData")) || [];
let personnelData = JSON.parse(localStorage.getItem("personnelData")) || [];
let charts = {};
let calcInput = "";

// ---------- INITIALISATION ----------
window.onload = () => {
  initDateTime();
  initPages();
  generateForms();
  initCharts();
  loadHistoriques();
};

// ---------- AFFICHAGE DATE + HEURE + ÉQUIPE ----------
function initDateTime() {
  const dateTimeDisplay = document.getElementById("dateTimeDisplay");
  setInterval(() => {
    const now = new Date();
    const week = getWeekNumber(now);
    const hours = now.getHours();
    const team =
      hours >= 5 && hours < 13
        ? "Équipe M"
        : hours >= 13 && hours < 21
        ? "Équipe AM"
        : "Équipe N";
    dateTimeDisplay.textContent = `${now.toLocaleString()} | Semaine ${week} | ${team}`;
  }, 1000);
}

function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

// ---------- GÉNÉRATION DES FORMULAIRES ----------
const lignes = [
  "rapé", "t2", "rt", "omori", "sticks",
  "emballage", "dés", "filets", "prédécoupés"
];

function generateForms() {
  lignes.forEach((ligne) => {
    const container = document.getElementById(`form-${ligne}`);
    container.innerHTML = `
      <label>Heure début :</label>
      <input type="time" id="debut-${ligne}" />
      <label>Heure fin :</label>
      <input type="time" id="fin-${ligne}" />
      <label>Quantité produite :</label>
      <input type="number" id="quantite-${ligne}" placeholder="Qté produite..." />
      <label>Quantité restante :</label>
      <input type="number" id="restant-${ligne}" placeholder="Qté restante..." oninput="updateEstimation('${ligne}')" />
      <label>Commentaires :</label>
      <textarea id="comment-${ligne}" placeholder="Observations..."></textarea>

      <div class="cadence">
        <p>Cadence instantanée : <span id="cadence-${ligne}">0</span> colis/h</p>
        <p>Fin estimée : <span id="finEstimee-${ligne}">--:--</span></p>
      </div>

      <button onclick="enregistrer('${ligne}')">💾 Enregistrer</button>
      <button onclick="annulerDernier('${ligne}')">↩️ Annuler dernier</button>
      <button onclick="resetLigne('${ligne}')">🔄 Remise à zéro</button>
      <button onclick="exportHistorique('${ligne}')">📊 Export Excel</button>

      <div id="historique-${ligne}"></div>
    `;
  });
}

// ---------- CALCUL AUTOMATIQUE DE CADENCE + FIN ESTIMÉE ----------
function updateEstimation(ligne) {
  const qte = Number(document.getElementById(`quantite-${ligne}`).value);
  const qteRest = Number(document.getElementById(`restant-${ligne}`).value);
  const debut = document.getElementById(`debut-${ligne}`).value;
  const fin = document.getElementById(`fin-${ligne}`).value;

  if (debut && fin && qte > 0) {
    const start = new Date(`1970-01-01T${debut}:00`);
    const end = new Date(`1970-01-01T${fin}:00`);
    let diff = (end - start) / 3600000;
    if (diff < 0) diff += 24;
    const cadence = (qte / diff).toFixed(2);
    document.getElementById(`cadence-${ligne}`).textContent = cadence;

    if (cadence > 0 && qteRest > 0) {
      const timeToFinish = qteRest / cadence;
      const finEstimee = new Date(end.getTime() + timeToFinish * 3600000);
      document.getElementById(`finEstimee-${ligne}`).textContent =
        finEstimee.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
  }
}

// ---------- ENREGISTREMENT DES DONNÉES ----------
function enregistrer(ligne) {
  const debut = document.getElementById(`debut-${ligne}`).value;
  const fin = document.getElementById(`fin-${ligne}`).value;
  const quantite = Number(document.getElementById(`quantite-${ligne}`).value);
  const restant = Number(document.getElementById(`restant-${ligne}`).value);
  const comment = document.getElementById(`comment-${ligne}`).value;
  const cadence = document.getElementById(`cadence-${ligne}`).textContent;
  const finEstimee = document.getElementById(`finEstimee-${ligne}`).textContent;
  const date = new Date().toLocaleString();

  if (!historiqueData[ligne]) historiqueData[ligne] = [];
  historiqueData[ligne].push({
    date,
    debut,
    fin,
    quantite,
    restant,
    cadence,
    finEstimee,
    comment,
  });

  localStorage.setItem("historiqueData", JSON.stringify(historiqueData));
  afficherHistorique(ligne);
  updateChart(ligne);
  clearInputs(ligne);
}

function annulerDernier(ligne) {
  if (historiqueData[ligne] && historiqueData[ligne].length > 0) {
    historiqueData[ligne].pop();
    localStorage.setItem("historiqueData", JSON.stringify(historiqueData));
    afficherHistorique(ligne);
    updateChart(ligne);
  }
}

function clearInputs(ligne) {
  document.getElementById(`quantite-${ligne}`).value = "";
  document.getElementById(`restant-${ligne}`).value = "";
  document.getElementById(`comment-${ligne}`).value = "";
}

// ---------- HISTORIQUES ----------
function afficherHistorique(ligne) {
  const div = document.getElementById(`historique-${ligne}`);
  if (!div) return;
  const data = historiqueData[ligne] || [];
  div.innerHTML = data
    .map(
      (d, i) =>
        `<div><b>${d.date}</b> | Qté: ${d.quantite} | Cadence: ${d.cadence} | Fin estimée: ${d.finEstimee} <button onclick="supprimerLigne('${ligne}', ${i})">🗑️</button></div>`
    )
    .join("");
}

function supprimerLigne(ligne, index) {
  historiqueData[ligne].splice(index, 1);
  localStorage.setItem("historiqueData", JSON.stringify(historiqueData));
  afficherHistorique(ligne);
  updateChart(ligne);
}

function loadHistoriques() {
  lignes.forEach((l) => afficherHistorique(l));
  afficherArrets();
  afficherConsignes();
  afficherPersonnel();
}

// ---------- GRAPHIQUES ----------
function initCharts() {
  lignes.forEach((ligne) => {
    const ctx = document.getElementById(`chart-${ligne}`);
    if (ctx) {
      charts[ligne] = new Chart(ctx, {
        type: "line",
        data: {
          labels: [],
          datasets: [
            {
              label: "Cadence (colis/h)",
              data: [],
              borderColor: "#1a73e8",
              borderWidth: 2,
              fill: false,
            },
          ],
        },
        options: { responsive: true, maintainAspectRatio: false },
      });
    }
  });
}

function updateChart(ligne) {
  const data = historiqueData[ligne] || [];
  charts[ligne].data.labels = data.map((d) => d.date.split(" ")[1]);
  charts[ligne].data.datasets[0].data = data.map((d) => Number(d.cadence));
  charts[ligne].update();
}

// ---------- ARRÊTS ----------
function saveArret() {
  const ligne = document.getElementById("ligneArretSelect").value;
  const type = document.getElementById("typeArret").value;
  const duree = document.getElementById("dureeArret").value;
  const date = new Date().toLocaleString();

  arretsData.push({ ligne, type, duree, date });
  localStorage.setItem("arretsData", JSON.stringify(arretsData));
  afficherArrets();
}

function afficherArrets() {
  const div = document.getElementById("historiqueArrets");
  div.innerHTML = arretsData
    .map((a) => `<div>${a.date} | ${a.ligne} - ${a.type} : ${a.duree} min</div>`)
    .join("");
}

// ---------- ORGANISATION ----------
function saveConsigne() {
  const texte = document.getElementById("consigneTexte").value;
  const validee = document.getElementById("consigneValidee").checked;
  const date = new Date().toLocaleString();

  consignesData.push({ texte, validee, date });
  localStorage.setItem("consignesData", JSON.stringify(consignesData));
  afficherConsignes();
}

function afficherConsignes() {
  const div = document.getElementById("historiqueConsignes");
  div.innerHTML = consignesData
    .map(
      (c) =>
        `<div>${c.date} - ${c.texte} ${c.validee ? "✅" : "❌"}</div>`
    )
    .join("");
}

// ---------- PERSONNEL ----------
function savePersonnel() {
  const nom = document.getElementById("nomPers").value;
  const motif = document.getElementById("motifPers").value;
  const com = document.getElementById("commentairePers").value;
  const date = new Date().toLocaleString();

  personnelData.push({ nom, motif, com, date });
  localStorage.setItem("personnelData", JSON.stringify(personnelData));
  afficherPersonnel();
}

function afficherPersonnel() {
  const div = document.getElementById("historiquePersonnel");
  div.innerHTML = personnelData
    .map(
      (p) => `<div>${p.date} - ${p.nom} (${p.motif}) : ${p.com}</div>`
    )
    .join("");
}

// ---------- EXPORT EXCEL GLOBAL ----------
function exportExcelGlobal() {
  const wb = XLSX.utils.book_new();

  // 1. Données Production
  let allRows = [];
  for (const ligne in historiqueData) {
    historiqueData[ligne].forEach((entry) => {
      allRows.push({
        Ligne: ligne.toUpperCase(),
        Date: entry.date,
        "Heure Début": entry.debut,
        "Heure Fin": entry.fin,
        "Quantité Produite": entry.quantite,
        "Quantité Restante": entry.restant,
        Cadence: entry.cadence,
        "Fin Estimée": entry.finEstimee,
        Commentaire: entry.comment,
      });
    });
  }
  const wsProd = XLSX.utils.json_to_sheet(allRows);
  XLSX.utils.book_append_sheet(wb, wsProd, "Production");

  // 2. Arrêts
  const wsArrets = XLSX.utils.json_to_sheet(arretsData);
  XLSX.utils.book_append_sheet(wb, wsArrets, "Arrêts");

  // 3. Organisation
  const wsOrg = XLSX.utils.json_to_sheet(consignesData);
  XLSX.utils.book_append_sheet(wb, wsOrg, "Organisation");

  // 4. Personnel
  const wsPers = XLSX.utils.json_to_sheet(personnelData);
  XLSX.utils.book_append_sheet(wb, wsPers, "Personnel");

  const now = new Date();
  const fileName = `Synthese_Equipe_${now.toLocaleDateString()}_${now.getHours()}h.xlsx`;
  XLSX.writeFile(wb, fileName);
}

// ---------- CALCULATRICE ----------
function toggleCalculator() {
  document.getElementById("calculator").classList.toggle("hidden");
}

function press(val) {
  calcInput += val;
  document.getElementById("calcDisplay").value = calcInput;
}

function calculate() {
  try {
    calcInput = eval(calcInput).toString();
    document.getElementById("calcDisplay").value = calcInput;
  } catch {
    document.getElementById("calcDisplay").value = "Erreur";
  }
}

// ---------- NAVIGATION ----------
function showPage(id) {
  document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ---------- INIT PAGES ----------
function initPages() {
  showPage("atelier");
      }
