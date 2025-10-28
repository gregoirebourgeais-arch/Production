/* =============================
   Atelier PPNC - Script principal
   ============================= */

// === INITIALISATION ===
document.addEventListener("DOMContentLoaded", () => {
  initDateTime();
  afficherEquipe();
  loadAllData();
  showPage("atelier");
  initCharts();
});

// === VARIABLES GLOBALES ===
let currentPage = "atelier";
let currentLigne = null;
let dataProduction = JSON.parse(localStorage.getItem("dataProduction")) || {};
let dataArrets = JSON.parse(localStorage.getItem("dataArrets")) || [];
let dataOrganisation = JSON.parse(localStorage.getItem("dataOrganisation")) || [];
let dataPersonnel = JSON.parse(localStorage.getItem("dataPersonnel")) || [];
let chartAtelier, chartLigne;

// === CHANGEMENT DE PAGE ===
function showPage(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  currentPage = id;
  if (id === "atelier") updateAtelierView();
  if (id === "arrets") displayArrets();
  if (id === "organisation") displayConsignes();
  if (id === "personnel") displayPersonnel();
}

// === MENU LATERAL ===
function toggleMenu() {
  const menu = document.getElementById("sidebar");
  menu.classList.toggle("open");
}

// === DATE, HEURE, SEMAINE, EQUIPE ===
function initDateTime() {
  setInterval(() => {
    const now = new Date();
    const options = { weekday: "long", day: "numeric", month: "long", year: "numeric" };
    const semaine = getWeekNumber(now);
    document.getElementById("datetime").textContent =
      now.toLocaleTimeString("fr-FR") + " - " + now.toLocaleDateString("fr-FR", options) + " (S" + semaine + ")";
  }, 1000);
}

function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return weekNo;
}

function afficherEquipe() {
  const now = new Date();
  const hour = now.getHours();
  let equipe = "";
  if (hour >= 5 && hour < 13) equipe = "M (5h-13h)";
  else if (hour >= 13 && hour < 21) equipe = "AM (13h-21h)";
  else equipe = "N (21h-5h)";
  document.getElementById("team").textContent = "Équipe : " + equipe;
}

// === SÉLECTION DE LIGNE ===
function selectLigne(nom) {
  currentLigne = nom;
  document.getElementById("nomLigne").textContent = "Ligne : " + nom;
  displayHistoriqueLigne();
  scrollToForm();
}

function scrollToForm() {
  const form = document.getElementById("ligneForm");
  form.scrollIntoView({ behavior: "smooth" });
}

// === ENREGISTREMENT PRODUCTION ===
function enregistrerProduction() {
  if (!currentLigne) return alert("Sélectionnez une ligne.");
  const debut = document.getElementById("heureDebut").value;
  const fin = document.getElementById("heureFin").value;
  const quantite = parseFloat(document.getElementById("quantite").value || 0);
  const restante = parseFloat(document.getElementById("quantiteRestante").value || 0);
  const cadenceManuelle = parseFloat(document.getElementById("cadenceManuelle").value || 0);
  const equipe = document.getElementById("team").textContent;

  if (!debut || !fin) return alert("Renseignez les heures de début et fin.");

  const diffHeure = (new Date("1970-01-01T" + fin) - new Date("1970-01-01T" + debut)) / 3600000;
  const cadenceAuto = diffHeure > 0 ? quantite / diffHeure : 0;
  const cadenceFinale = cadenceManuelle > 0 ? cadenceManuelle : cadenceAuto;

  const estimation = cadenceFinale > 0 && restante > 0 ? (restante / cadenceFinale) : 0;
  const finEstimee = new Date(Date.now() + estimation * 3600000);

  if (!dataProduction[currentLigne]) dataProduction[currentLigne] = [];
  dataProduction[currentLigne].push({
    date: new Date().toLocaleString("fr-FR"),
    debut, fin, quantite, restante, cadenceFinale, equipe
  });

  localStorage.setItem("dataProduction", JSON.stringify(dataProduction));
  displayHistoriqueLigne();
  updateAtelierView();
  initCharts();
  clearProductionFields();
  alert("✅ Enregistrement effectué !");
}

function effacerLigne() {
  if (!currentLigne) return;
  delete dataProduction[currentLigne];
  localStorage.setItem("dataProduction", JSON.stringify(dataProduction));
  displayHistoriqueLigne();
}

function annulerDernier() {
  if (!currentLigne || !dataProduction[currentLigne]) return;
  dataProduction[currentLigne].pop();
  localStorage.setItem("dataProduction", JSON.stringify(dataProduction));
  displayHistoriqueLigne();
}

function clearProductionFields() {
  document.getElementById("quantite").value = "";
  document.getElementById("quantiteRestante").value = "";
  document.getElementById("cadenceManuelle").value = "";
}

// === HISTORIQUE LIGNE ===
function displayHistoriqueLigne() {
  const container = document.getElementById("historiqueLigne");
  container.innerHTML = "";
  if (!currentLigne || !dataProduction[currentLigne]) return;

  dataProduction[currentLigne].forEach((r, i) => {
    const div = document.createElement("div");
    div.innerHTML = `${r.date} — <b>${r.quantite} colis</b> (${r.debut} → ${r.fin}) - ${r.cadenceFinale.toFixed(1)} c/h 
      [${r.equipe}] <button onclick="supprimerLigne('${currentLigne}', ${i})">❌</button>`;
    container.appendChild(div);
  });
}

function supprimerLigne(ligne, index) {
  dataProduction[ligne].splice(index, 1);
  localStorage.setItem("dataProduction", JSON.stringify(dataProduction));
  displayHistoriqueLigne();
  updateAtelierView();
}

// === CALCUL CADENCE & ESTIMATION ===
function updateEstimation() {
  const quantite = parseFloat(document.getElementById("quantite").value || 0);
  const restante = parseFloat(document.getElementById("quantiteRestante").value || 0);
  const debut = document.getElementById("heureDebut").value;
  const fin = document.getElementById("heureFin").value;

  if (!debut || !fin) return;

  const diffHeure = (new Date("1970-01-01T" + fin) - new Date("1970-01-01T" + debut)) / 3600000;
  const cadence = diffHeure > 0 ? quantite / diffHeure : 0;

  const est = cadence > 0 && restante > 0 ? restante / cadence : 0;
  const estHeure = est.toFixed(2);
  document.getElementById("finEstimee").textContent = "⏱️ Temps restant estimé : " + estHeure + " h";
  document.getElementById("cadenceAffichage").textContent = "⚙️ Cadence : " + cadence.toFixed(1) + " colis/h";
}

// === CALCULATRICE ===
let calcVisible = false;
function toggleCalc() {
  const calc = document.getElementById("calculator");
  calcVisible = !calcVisible;
  calc.classList.toggle("hidden", !calcVisible);
}

function appendCalc(val) {
  document.getElementById("calcDisplay").value += val;
}
function calcClear() {
  document.getElementById("calcDisplay").value = "";
}
function calcEqual() {
  const val = document.getElementById("calcDisplay").value;
  try {
    document.getElementById("calcDisplay").value = eval(val);
  } catch {
    document.getElementById("calcDisplay").value = "Erreur";
  }
}

// === ARRETS ===
function enregistrerArret() {
  const ligne = document.getElementById("arretLigne").value;
  const type = document.getElementById("arretType").value;
  const duree = document.getElementById("arretDuree").value;
  const commentaire = document.getElementById("arretCommentaire").value;
  const equipe = document.getElementById("team").textContent;
  if (!ligne || !duree) return alert("Renseignez la ligne et la durée.");

  dataArrets.push({ ligne, type, duree, commentaire, equipe, date: new Date().toLocaleString("fr-FR") });
  localStorage.setItem("dataArrets", JSON.stringify(dataArrets));
  displayArrets();
  document.getElementById("arretCommentaire").value = "";
  document.getElementById("arretDuree").value = "";
}

function displayArrets() {
  const hist = document.getElementById("historiqueArrets");
  hist.innerHTML = "";
  dataArrets.forEach(a => {
    const div = document.createElement("div");
    div.textContent = `${a.date} - ${a.ligne} (${a.type}) : ${a.duree} min [${a.equipe}] ${a.commentaire}`;
    hist.appendChild(div);
  });
}

// === ORGANISATION ===
function ajouterConsigne() {
  const txt = document.getElementById("consigneTexte").value.trim();
  if (!txt) return;
  dataOrganisation.push({ texte: txt, valide: false, date: new Date().toLocaleString("fr-FR") });
  localStorage.setItem("dataOrganisation", JSON.stringify(dataOrganisation));
  document.getElementById("consigneTexte").value = "";
  displayConsignes();
}

function displayConsignes() {
  const list = document.getElementById("listeConsignes");
  list.innerHTML = "";
  dataOrganisation.forEach((c, i) => {
    const div = document.createElement("div");
    div.innerHTML = `<input type="checkbox" ${c.valide ? "checked" : ""} onchange="toggleConsigne(${i})">
      ${c.texte} (${c.date})`;
    list.appendChild(div);
  });
}

function toggleConsigne(i) {
  dataOrganisation[i].valide = !dataOrganisation[i].valide;
  localStorage.setItem("dataOrganisation", JSON.stringify(dataOrganisation));
}

// === PERSONNEL ===
function enregistrerPersonnel() {
  const nom = document.getElementById("persoNom").value.trim();
  const motif = document.getElementById("persoMotif").value;
  const commentaire = document.getElementById("persoCommentaire").value;
  const equipe = document.getElementById("team").textContent;
  if (!nom) return alert("Renseignez un nom.");
  dataPersonnel.push({ nom, motif, commentaire, equipe, date: new Date().toLocaleString("fr-FR") });
  localStorage.setItem("dataPersonnel", JSON.stringify(dataPersonnel));
  document.getElementById("persoNom").value = "";
  document.getElementById("persoCommentaire").value = "";
  displayPersonnel();
}

function displayPersonnel() {
  const hist = document.getElementById("historiquePersonnel");
  hist.innerHTML = "";
  dataPersonnel.forEach(p => {
    const div = document.createElement("div");
    div.textContent = `${p.date} - ${p.nom} (${p.motif}) : ${p.commentaire} [${p.equipe}]`;
    hist.appendChild(div);
  });
}

// === CHARTS ===
function initCharts() {
  const atelierCtx = document.getElementById("atelierChart");
  if (chartAtelier) chartAtelier.destroy();
  const lignes = Object.keys(dataProduction);
  const couleurs = ["#0072ce", "#00b5ad", "#f39c12", "#c0392b", "#9b59b6", "#16a085", "#e74c3c", "#2c3e50", "#27ae60", "#2980b9"];
  const datasets = lignes.map((l, i) => ({
    label: l,
    borderColor: couleurs[i % couleurs.length],
    fill: false,
    data: dataProduction[l].map((x, j) => ({ x: j + 1, y: x.cadenceFinale }))
  }));

  chartAtelier = new Chart(atelierCtx, {
    type: "line",
    data: { datasets },
    options: {
      responsive: true,
      plugins: { legend: { position: "bottom" } },
      scales: {
        x: { title: { display: true, text: "Enregistrements" } },
        y: { title: { display: true, text: "Cadence (colis/h)" } }
      }
    }
  });
}

// === EXPORT EXCEL ===
function exportExcel() {
  const wb = XLSX.utils.book_new();

  const wsProd = XLSX.utils.json_to_sheet(Object.entries(dataProduction).flatMap(([ligne, arr]) => arr.map(r => ({ Ligne: ligne, ...r }))));
  const wsArrets = XLSX.utils.json_to_sheet(dataArrets);
  const wsOrg = XLSX.utils.json_to_sheet(dataOrganisation);
  const wsPerso = XLSX.utils.json_to_sheet(dataPersonnel);

  XLSX.utils.book_append_sheet(wb, wsProd, "Production");
  XLSX.utils.book_append_sheet(wb, wsArrets, "Arrets");
  XLSX.utils.book_append_sheet(wb, wsOrg, "Organisation");
  XLSX.utils.book_append_sheet(wb, wsPerso, "Personnel");

  const now = new Date();
  const nomFichier = `Atelier_PPNC_${now.toLocaleDateString("fr-FR").replaceAll("/", "-")}_${now.getHours()}h${now.getMinutes()}.xlsx`;
  XLSX.writeFile(wb, nomFichier);
}

// === UTILITAIRES ===
function loadAllData() {
  displayArrets();
  displayConsignes();
  displayPersonnel();
  updateAtelierView();
}

function updateAtelierView() {
  const hist = document.getElementById("atelierHistorique");
  hist.innerHTML = "";
  Object.keys(dataProduction).forEach(ligne => {
    dataProduction[ligne].forEach(r => {
      const div = document.createElement("div");
      div.textContent = `${ligne} - ${r.date} : ${r.quantite} colis (${r.cadenceFinale.toFixed(1)} c/h)`;
      hist.appendChild(div);
    });
  });
}
