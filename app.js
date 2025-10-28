// === Atelier PPNC - Script principal ===

// === Variables globales ===
let currentPage = "atelier";
let historique = {
  production: JSON.parse(localStorage.getItem("prodData") || "[]"),
  arrets: JSON.parse(localStorage.getItem("arretsData") || "[]"),
  organisation: JSON.parse(localStorage.getItem("orgData") || "[]"),
  personnel: JSON.parse(localStorage.getItem("persData") || "[]")
};
let currentCalc = "";

// === Initialisation ===
document.addEventListener("DOMContentLoaded", () => {
  updateDateTime();
  setInterval(updateDateTime, 1000);
  generateLigneButtons();
  updateHistorique();
  drawAtelierChart();
  registerSW();
});

// === Affichage date, heure, équipe ===
function updateDateTime() {
  const now = new Date();
  const week = getWeekNumber(now);
  const teams = [
    { name: "M", start: 5, end: 13 },
    { name: "AM", start: 13, end: 21 },
    { name: "N", start: 21, end: 5 }
  ];
  const hour = now.getHours();
  const team =
    hour >= 5 && hour < 13
      ? "M"
      : hour >= 13 && hour < 21
      ? "AM"
      : "N";

  document.getElementById("dateTimeDisplay").textContent =
    now.toLocaleString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit"
    });

  document.getElementById("weekDisplay").textContent =
    `Semaine ${week} - Équipe ${team}`;
}

function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

// === Navigation ===
function openPage(pageId) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(pageId).classList.add("active");
  currentPage = pageId;
  if (pageId === "atelier") drawAtelierChart();
}

// === Génération des boutons de lignes ===
function generateLigneButtons() {
  const lignes = [
    "Râpé", "T2", "RT", "OMORI", "T1",
    "Sticks", "Emballage", "Dés", "Filets", "Prédécoupés"
  ];
  const container = document.getElementById("ligneButtons");
  container.innerHTML = "";
  lignes.forEach(nom => {
    const btn = document.createElement("button");
    btn.textContent = nom;
    btn.onclick = () => openLigne(nom);
    container.appendChild(btn);
  });
}

// === Page Ligne ===
function openLigne(nom) {
  const container = document.getElementById("ligneContainer");
  const key = `ligne_${nom}`;
  const saved = JSON.parse(localStorage.getItem(key) || "{}");

  container.innerHTML = `
    <h2>${nom}</h2>
    <label>Heure de début :</label>
    <input type="time" id="heureDebut" value="${saved.heureDebut || ""}" />
    <label>Heure de fin :</label>
    <input type="time" id="heureFin" value="${saved.heureFin || ""}" />
    <label>Quantité réalisée :</label>
    <input type="number" id="quantite" value="${saved.quantite || ""}" />
    <label>Quantité restante :</label>
    <input type="number" id="quantiteRestante" value="${saved.quantiteRestante || ""}" oninput="updateFinEstimee('${nom}')" />
    <label>Cadence manuelle :</label>
    <input type="number" id="cadenceManuelle" value="${saved.cadenceManuelle || ""}" oninput="updateFinEstimee('${nom}')" />
    <p id="finEstimee"></p>
    <button onclick="saveLigne('${nom}')">💾 Enregistrer</button>
    <button onclick="remiseCadence('${nom}')">🔄 Remise à zéro cadence</button>
    <canvas id="graph_${nom}" height="200"></canvas>
  `;

  scrollToForm();
  drawLigneChart(nom);
}

function scrollToForm() {
  window.scrollTo({ top: document.getElementById("ligneContainer").offsetTop, behavior: "smooth" });
}

// === Calculs ===
function saveLigne(nom) {
  const heureDebut = document.getElementById("heureDebut").value;
  const heureFin = document.getElementById("heureFin").value;
  const quantite = parseFloat(document.getElementById("quantite").value) || 0;
  const quantiteRestante = parseFloat(document.getElementById("quantiteRestante").value) || 0;
  const cadenceManuelle = parseFloat(document.getElementById("cadenceManuelle").value) || null;

  const t1 = heureDebut.split(":");
  const t2 = heureFin.split(":");
  const debut = parseInt(t1[0]) + parseInt(t1[1] || 0) / 60;
  const fin = parseInt(t2[0]) + parseInt(t2[1] || 0) / 60;
  const duree = fin >= debut ? fin - debut : fin + 24 - debut;

  const cadence = duree > 0 ? quantite / duree : 0;
  const heureEstimee =
    cadence > 0
      ? (quantiteRestante / (cadenceManuelle || cadence)).toFixed(2)
      : 0;

  const item = {
    nom,
    heureDebut,
    heureFin,
    quantite,
    quantiteRestante,
    cadence: cadenceManuelle || cadence,
    tempsRestant: heureEstimee,
    date: new Date().toLocaleString("fr-FR")
  };

  historique.production.push(item);
  localStorage.setItem("prodData", JSON.stringify(historique.production));
  localStorage.setItem(`ligne_${nom}`, JSON.stringify(item));
  updateHistorique();
  drawLigneChart(nom);
  alert("✅ Enregistrement effectué !");
}

function updateFinEstimee(nom) {
  const qRest = parseFloat(document.getElementById("quantiteRestante").value) || 0;
  const qTot = parseFloat(document.getElementById("quantite").value) || 0;
  const c = parseFloat(document.getElementById("cadenceManuelle").value) || (qTot > 0 ? qTot / 1 : 0);
  const res = c > 0 ? (qRest / c).toFixed(2) : "N/A";
  document.getElementById("finEstimee").textContent = `⏳ Temps restant estimé : ${res} h`;
}

function remiseCadence(nom) {
  localStorage.removeItem(`ligne_${nom}`);
  alert("Remise à zéro de la ligne !");
  openLigne(nom);
}

// === Arrêts ===
function saveArret() {
  const ligne = document.getElementById("arretLigne").value;
  const type = document.getElementById("arretType").value;
  const commentaire = document.getElementById("arretCommentaire").value;
  if (!ligne) return alert("Sélectionnez une ligne !");
  const item = { ligne, type, commentaire, date: new Date().toLocaleString("fr-FR") };
  historique.arrets.push(item);
  localStorage.setItem("arretsData", JSON.stringify(historique.arrets));
  updateHistorique();
  alert("✅ Arrêt enregistré !");
}

// === Organisation ===
function saveConsigne() {
  const texte = document.getElementById("nouvelleConsigne").value;
  const realisee = document.getElementById("consigneRealisee").checked;
  if (!texte) return alert("Consigne vide !");
  const item = { texte, realisee, date: new Date().toLocaleString("fr-FR") };
  historique.organisation.push(item);
  localStorage.setItem("orgData", JSON.stringify(historique.organisation));
  updateHistorique();
  alert("✅ Consigne enregistrée !");
}

// === Personnel ===
function savePersonnel() {
  const nom = document.getElementById("personnelNom").value;
  const role = document.getElementById("personnelRole").value;
  const comment = document.getElementById("personnelComment").value;
  if (!nom) return alert("Nom manquant !");
  const item = { nom, role, comment, date: new Date().toLocaleString("fr-FR") };
  historique.personnel.push(item);
  localStorage.setItem("persData", JSON.stringify(historique.personnel));
  updateHistorique();
  alert("✅ Enregistrement personnel effectué !");
}

// === Historique & Graphiques ===
function updateHistorique() {
  ["production", "arrets", "organisation", "personnel"].forEach(key => {
    const container = document.getElementById("historique" + key.charAt(0).toUpperCase() + key.slice(1));
    if (container) {
      container.innerHTML = historique[key]
        .map(e => `<li>${Object.values(e).join(" - ")}</li>`)
        .join("");
    }
  });
}

function drawAtelierChart() {
  const ctx = document.getElementById("atelierChart");
  if (!ctx) return;
  const data = {};
  historique.production.forEach(p => {
    data[p.nom] = (data[p.nom] || 0) + p.quantite;
  });
  new Chart(ctx, {
    type: "bar",
    data: {
      labels: Object.keys(data),
      datasets: [{
        label: "Quantité totale par ligne",
        data: Object.values(data),
        backgroundColor: "#007bff"
      }]
    }
  });
}

function drawLigneChart(nom) {
  const ctx = document.getElementById(`graph_${nom}`);
  if (!ctx) return;
  const data = historique.production.filter(p => p.nom === nom);
  new Chart(ctx, {
    type: "line",
    data: {
      labels: data.map(d => d.date.split(" ")[1]),
      datasets: [{
        label: `Cadence ${nom} (colis/h)`,
        data: data.map(d => d.cadence),
        borderColor: "#007bff",
        fill: false
      }]
    }
  });
}

// === Export Excel ===
function exportAllExcel() {
  const wb = XLSX.utils.book_new();
  Object.entries(historique).forEach(([nom, data]) => {
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, nom);
  });
  XLSX.writeFile(wb, "Atelier_PPNC.xlsx");
}

// === Calculatrice ===
function toggleCalculator() {
  document.getElementById("calculator").classList.toggle("hidden");
}

function pressCalc(val) {
  currentCalc += val;
  document.getElementById("calcDisplay").value = currentCalc;
}

function calcEqual() {
  try {
    currentCalc = eval(currentCalc).toString();
    document.getElementById("calcDisplay").value = currentCalc;
  } catch {
    document.getElementById("calcDisplay").value = "Erreur";
  }
}

function calcClear() {
  currentCalc = "";
  document.getElementById("calcDisplay").value = "";
}

// === PWA Service Worker ===
function registerSW() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js").then(() =>
      console.log("Service Worker enregistré")
    );
  }
    }
