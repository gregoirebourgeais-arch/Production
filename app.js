// === 🌐 INITIALISATION ===
document.addEventListener("DOMContentLoaded", () => {
  showPage("atelier");
  initProductionLines();
  loadStoredData();
  updateGlobalChart();
  scheduleAutoExport();
});

// === 🧭 NAVIGATION ENTRE PAGES ===
function showPage(pageId) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(pageId).classList.add("active");
}

// === 🧀 INITIALISATION DES LIGNES DE PRODUCTION ===
const lignes = [
  "Râpé", "T2", "RT", "OMORI", "Sticks",
  "Emballage", "Dés", "Filets", "Prédécoupés"
];

function initProductionLines() {
  const container = document.getElementById("productionLines");
  container.innerHTML = "";
  lignes.forEach(ligne => {
    const div = document.createElement("div");
    div.className = "ligne-card";
    div.innerHTML = `
      <h3>${ligne}</h3>
      <form onsubmit="saveProduction(event, '${ligne}')">
        <label>Heure début :</label>
        <input type="time" id="${ligne}_debut" required>
        <label>Heure fin :</label>
        <input type="time" id="${ligne}_fin" required>
        <label>Quantité produite :</label>
        <input type="number" id="${ligne}_quantite" placeholder="colis" required>
        <label>Quantité restante :</label>
        <input type="number" id="${ligne}_restant" placeholder="colis restants">
        <label>Arrêts (min) :</label>
        <input type="number" id="${ligne}_arret" placeholder="min d'arrêt">
        <label>Commentaire :</label>
        <input type="text" id="${ligne}_commentaire" placeholder="Commentaire...">
        <p id="${ligne}_cadence">Cadence : 0 colis/h</p>
        <p id="${ligne}_finEstimee">Fin estimée : -</p>
        <button type="submit">Enregistrer</button>
        <button type="button" onclick="remiseLigne('${ligne}')">🔄 Remise à zéro</button>
      </form>
      <canvas id="${ligne}_chart"></canvas>
      <div id="${ligne}_historique"></div>
    `;
    container.appendChild(div);
  });
}

// === 💾 SAUVEGARDE DES DONNÉES ===
function saveProduction(e, ligne) {
  e.preventDefault();
  const debut = document.getElementById(`${ligne}_debut`).value;
  const fin = document.getElementById(`${ligne}_fin`).value;
  const quantite = parseInt(document.getElementById(`${ligne}_quantite`).value || 0);
  const restant = parseInt(document.getElementById(`${ligne}_restant`).value || 0);
  const arret = parseInt(document.getElementById(`${ligne}_arret`).value || 0);
  const commentaire = document.getElementById(`${ligne}_commentaire`).value;

  const cadence = calculCadence(debut, fin, quantite, arret);
  const finEstimee = calculFinEstimee(restant, cadence);

  const entry = {
    date: new Date().toLocaleString("fr-FR"),
    debut, fin, quantite, restant, arret, commentaire, cadence, finEstimee
  };

  let data = JSON.parse(localStorage.getItem(ligne)) || [];
  data.push(entry);
  localStorage.setItem(ligne, JSON.stringify(data));

  afficherHistorique(ligne);
  updateGlobalChart();
  clearFields(ligne);
}

// === 📈 CALCULS AUTOMATIQUES ===
function calculCadence(debut, fin, quantite, arret) {
  if (!debut || !fin || quantite <= 0) return 0;
  const [h1, m1] = debut.split(":").map(Number);
  const [h2, m2] = fin.split(":").map(Number);
  let duree = (h2 * 60 + m2) - (h1 * 60 + m1) - (arret || 0);
  if (duree <= 0) duree += 24 * 60;
  return Math.round((quantite / duree) * 60);
}

function calculFinEstimee(restant, cadence) {
  if (!restant || cadence <= 0) return "-";
  const minutesRestantes = Math.round((restant / cadence) * 60);
  const fin = new Date(Date.now() + minutesRestantes * 60000);
  return fin.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

// === 🧹 REMISE À ZÉRO D'UNE LIGNE ===
function remiseLigne(ligne) {
  localStorage.removeItem(ligne);
  afficherHistorique(ligne);
  updateGlobalChart();
}

// === 🧾 HISTORIQUE ===
function afficherHistorique(ligne) {
  const historiqueDiv = document.getElementById(`${ligne}_historique`);
  const data = JSON.parse(localStorage.getItem(ligne)) || [];
  if (data.length === 0) {
    historiqueDiv.innerHTML = "<p>Aucun enregistrement</p>";
    return;
  }
  historiqueDiv.innerHTML = `
    <table>
      <tr><th>Date</th><th>Quantité</th><th>Cadence</th><th>Fin estimée</th><th>🗑️</th></tr>
      ${data.map((d, i) => `
        <tr>
          <td>${d.date}</td>
          <td>${d.quantite}</td>
          <td>${d.cadence}</td>
          <td>${d.finEstimee}</td>
          <td><button onclick="supprimerLigne('${ligne}', ${i})">❌</button></td>
        </tr>`).join("")}
    </table>
  `;
  updateLineChart(ligne, data);
}

function supprimerLigne(ligne, index) {
  let data = JSON.parse(localStorage.getItem(ligne)) || [];
  data.splice(index, 1);
  localStorage.setItem(ligne, JSON.stringify(data));
  afficherHistorique(ligne);
  updateGlobalChart();
}

function clearFields(ligne) {
  document.querySelectorAll(`#productionLines form input`).forEach(input => input.value = "");
}

// === 🧮 CALCULATRICE ===
let calcOpen = false;
function toggleCalculator() {
  calcOpen = !calcOpen;
  document.getElementById("calculator").style.display = calcOpen ? "block" : "none";
}
function calcInput(v) {
  document.getElementById("calcDisplay").value += v;
}
function calcCalculate() {
  try {
    document.getElementById("calcDisplay").value = eval(document.getElementById("calcDisplay").value);
  } catch {
    document.getElementById("calcDisplay").value = "Erreur";
  }
}

// === 📊 GRAPHIQUES ===
let globalChart;
function updateGlobalChart() {
  const ctx = document.getElementById("globalChart").getContext("2d");
  const labels = lignes;
  const quantities = lignes.map(l => {
    const data = JSON.parse(localStorage.getItem(l)) || [];
    return data.reduce((a, b) => a + (b.quantite || 0), 0);
  });
  if (globalChart) globalChart.destroy();
  globalChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Quantités produites",
        data: quantities,
        backgroundColor: "#007bff88",
        borderColor: "#003366",
        borderWidth: 1
      }]
    },
    options: { responsive: true, scales: { y: { beginAtZero: true } } }
  });
}

function updateLineChart(ligne, data) {
  const ctx = document.getElementById(`${ligne}_chart`);
  if (!ctx) return;
  const labels = data.map(d => d.date.split(",")[1]);
  const values = data.map(d => d.cadence);
  new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: `Cadence ${ligne}`,
        data: values,
        borderColor: "#007bff",
        backgroundColor: "#007bff55",
        fill: true
      }]
    },
    options: { responsive: true, plugins: { legend: { display: false } } }
  });
}

// === 💾 AUTRES SECTIONS (ARRÊTS, ORGANISATION, PERSONNEL) ===
function saveArret(e) {
  e.preventDefault();
  const ligne = document.getElementById("arretLigne").value;
  const type = document.getElementById("arretType").value;
  const duree = document.getElementById("arretDuree").value;
  const commentaire = document.getElementById("arretCommentaire").value;
  const data = JSON.parse(localStorage.getItem("arrets")) || [];
  data.push({ ligne, type, duree, commentaire, date: new Date().toLocaleString("fr-FR") });
  localStorage.setItem("arrets", JSON.stringify(data));
  afficherArrets();
  e.target.reset();
}

function afficherArrets() {
  const div = document.getElementById("arretHistorique");
  const data = JSON.parse(localStorage.getItem("arrets")) || [];
  if (data.length === 0) {
    div.innerHTML = "<p>Aucun arrêt enregistré</p>";
    return;
  }
  div.innerHTML = `
    <table>
      <tr><th>Date</th><th>Ligne</th><th>Type</th><th>Durée (min)</th><th>Commentaire</th></tr>
      ${data.map(a => `<tr>
        <td>${a.date}</td><td>${a.ligne}</td><td>${a.type}</td>
        <td>${a.duree}</td><td>${a.commentaire}</td>
      </tr>`).join("")}
    </table>`;
}

function saveConsigne(e) {
  e.preventDefault();
  const txt = document.getElementById("consigneText").value;
  const data = JSON.parse(localStorage.getItem("consignes")) || [];
  data.push({ txt, date: new Date().toLocaleString("fr-FR"), valide: false });
  localStorage.setItem("consignes", JSON.stringify(data));
  afficherConsignes();
  e.target.reset();
}

function afficherConsignes() {
  const div = document.getElementById("consignesListe");
  const data = JSON.parse(localStorage.getItem("consignes")) || [];
  if (data.length === 0) {
    div.innerHTML = "<p>Aucune consigne</p>";
    return;
  }
  div.innerHTML = data.map((c, i) => `
    <div class="consigne">
      <input type="checkbox" ${c.valide ? "checked" : ""} onchange="toggleConsigne(${i})">
      ${c.txt} <small>(${c.date})</small>
    </div>
  `).join("");
}

function toggleConsigne(i) {
  const data = JSON.parse(localStorage.getItem("consignes")) || [];
  data[i].valide = !data[i].valide;
  localStorage.setItem("consignes", JSON.stringify(data));
  afficherConsignes();
}

function savePersonnel(e) {
  e.preventDefault();
  const nom = document.getElementById("personnelNom").value;
  const motif = document.getElementById("personnelMotif").value;
  const commentaire = document.getElementById("personnelCommentaire").value;
  const data = JSON.parse(localStorage.getItem("personnel")) || [];
  data.push({ nom, motif, commentaire, date: new Date().toLocaleString("fr-FR") });
  localStorage.setItem("personnel", JSON.stringify(data));
  afficherPersonnel();
  e.target.reset();
}

function afficherPersonnel() {
  const div = document.getElementById("personnelHistorique");
  const data = JSON.parse(localStorage.getItem("personnel")) || [];
  if (data.length === 0) {
    div.innerHTML = "<p>Aucun enregistrement</p>";
    return;
  }
  div.innerHTML = `
    <table>
      <tr><th>Date</th><th>Nom</th><th>Motif</th><th>Commentaire</th></tr>
      ${data.map(p => `<tr><td>${p.date}</td><td>${p.nom}</td><td>${p.motif}</td><td>${p.commentaire}</td></tr>`).join("")}
    </table>`;
}

// === 💾 CHARGEMENT INITIAL ===
function loadStoredData() {
  lignes.forEach(l => afficherHistorique(l));
  afficherArrets();
  afficherConsignes();
  afficherPersonnel();
}

// === 🕐 EXPORT AUTOMATIQUE ===
function scheduleAutoExport() {
  setInterval(() => {
    const hour = new Date().getHours();
    if ([5, 13, 21].includes(hour)) {
      if (confirm("Fin d’équipe : exporter les données ?")) exportGlobalExcel();
    }
  }, 3600000); // Vérifie chaque heure
}

// === 📤 EXPORT GLOBAL EXCEL ===
function exportGlobalExcel() {
  let csv = "Section;Date;Ligne;Quantité;Cadence;Fin estimée;Type;Durée;Commentaire;Nom;Motif\n";
  lignes.forEach(l => {
    const prod = JSON.parse(localStorage.getItem(l)) || [];
    prod.forEach(d => csv += `Production;${d.date};${l};${d.quantite};${d.cadence};${d.finEstimee};;;;;\n`);
  });
  const arr = JSON.parse(localStorage.getItem("arrets")) || [];
  arr.forEach(a => csv += `Arrêt;${a.date};${a.ligne};;;${a.type};${a.duree};${a.commentaire};;;\n`);
  const per = JSON.parse(localStorage.getItem("personnel")) || [];
  per.forEach(p => csv += `Personnel;${p.date};;;;;;;${p.nom};${p.motif};${p.commentaire}\n`);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `Synthese_Atelier_${new Date().toISOString().slice(0, 16)}.csv`;
  a.click();
    }
