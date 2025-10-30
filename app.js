// ---- VARIABLES GLOBALES ----
let currentPage = "atelier";
let lignes = ["Râpé", "T2", "RT", "OMORI", "T1", "Sticks", "Emballage", "Dés", "Filets", "Prédécoupés"];
let productionData = {};
let arretsData = [];
let organisationData = [];
let personnelData = [];

// ---- INITIALISATION ----
document.addEventListener("DOMContentLoaded", () => {
  initDateDisplay();
  initNavigation();
  initProduction();
  initCalculatrice();
  initArrets();
  initOrganisation();
  initPersonnel();
  loadData();
  updateAtelierGraph();
  document.getElementById("exportGlobal").addEventListener("click", exportGlobalExcel);
});

// ---- AFFICHAGE DATE / HEURE / ÉQUIPE ----
function initDateDisplay() {
  const dateDiv = document.getElementById("dateDisplay");
  function refreshTime() {
    const now = new Date();
    const weekNumber = getWeekNumber(now);
    const team = getTeam(now);
    const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
    const display = now.toLocaleDateString("fr-FR", { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
    const time = now.toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit' });
    dateDiv.innerHTML = `${display} - ${time}<br>Quantième ${dayOfYear} | S${weekNumber} | Équipe ${team}`;
  }
  setInterval(refreshTime, 1000);
  refreshTime();
}

function getWeekNumber(date) {
  const temp = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date - temp) / (24 * 60 * 60 * 1000));
  return Math.ceil((days + temp.getDay() + 1) / 7);
}

function getTeam(date) {
  const h = date.getHours();
  if (h >= 5 && h < 13) return "M";
  if (h >= 13 && h < 21) return "AM";
  return "N";
}

// ---- NAVIGATION ----
function initNavigation() {
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => showPage(btn.getAttribute("onclick").match(/'(.+)'/)[1]));
  });
}

function showPage(page) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(page).classList.add("active");
  currentPage = page;
  if (page === "atelier") updateAtelierGraph();
}

// ---- PRODUCTION ----
function initProduction() {
  const container = document.getElementById("lignesContainer");
  const btns = document.getElementById("ligneButtons");

  lignes.forEach(ligne => {
    const btn = document.createElement("button");
    btn.textContent = ligne;
    btn.addEventListener("click", () => {
      document.querySelectorAll(".ligne-card").forEach(card => card.classList.remove("active"));
      document.getElementById(`card-${ligne}`).classList.add("active");
      document.getElementById(`card-${ligne}`).scrollIntoView({ behavior: "smooth" });
    });
    btns.appendChild(btn);

    const card = document.createElement("div");
    card.className = "ligne-card";
    card.id = `card-${ligne}`;
    card.innerHTML = `
      <h3>${ligne}</h3>
      <label>Quantité produite :</label><input type="number" id="qte-${ligne}" />
      <label>Quantité restante :</label><input type="number" id="rest-${ligne}" />
      <label>Cadence manuelle (colis/h) :</label><input type="number" id="cad-${ligne}" />
      <div id="result-${ligne}" class="result">Temps restant estimé : -</div>
      <button onclick="enregistrer('${ligne}')">💾 Enregistrer</button>
      <canvas id="chart-${ligne}" height="100"></canvas>
    `;
    container.appendChild(card);
  });
}

function enregistrer(ligne) {
  const qte = parseFloat(document.getElementById(`qte-${ligne}`).value) || 0;
  const rest = parseFloat(document.getElementById(`rest-${ligne}`).value) || 0;
  const cad = parseFloat(document.getElementById(`cad-${ligne}`).value) || 0;
  const team = getTeam(new Date());
  const now = new Date().toLocaleString("fr-FR");
  const tempsRestant = cad > 0 && rest > 0 ? (rest / cad * 60).toFixed(1) : "-";

  if (!productionData[ligne]) productionData[ligne] = [];
  productionData[ligne].push({ qte, rest, cad, tempsRestant, team, now });

  saveData();
  updateAtelierGraph();

  // Efface les champs après sauvegarde
  document.getElementById(`qte-${ligne}`).value = "";
  document.getElementById(`rest-${ligne}`).value = "";
  document.getElementById(`cad-${ligne}`).value = "";

  alert(`Ligne ${ligne} enregistrée avec succès.`);
}

// ---- CALCUL TEMPS RESTANT ----
document.addEventListener("input", e => {
  if (e.target.id.startsWith("rest-") || e.target.id.startsWith("cad-")) {
    const ligne = e.target.id.split("-")[1];
    const rest = parseFloat(document.getElementById(`rest-${ligne}`).value) || 0;
    const cad = parseFloat(document.getElementById(`cad-${ligne}`).value) || 0;
    const tempsRestant = cad > 0 && rest > 0 ? (rest / cad * 60).toFixed(1) : "-";
    document.getElementById(`result-${ligne}`).textContent = `Temps restant estimé : ${tempsRestant} min`;
  }
});

// ---- ARRETS ----
function initArrets() {
  document.getElementById("saveArret").addEventListener("click", () => {
    const ligne = document.getElementById("arretLigne").value;
    const type = document.getElementById("arretType").value;
    const duree = document.getElementById("arretDuree").value;
    const com = document.getElementById("arretCommentaire").value;
    if (!ligne || !type || !duree) return alert("Champs incomplets !");
    const record = { ligne, type, duree, com, date: new Date().toLocaleString("fr-FR") };
    arretsData.push(record);
    saveData();
    updateArrets();
    document.getElementById("arretLigne").value = "";
    document.getElementById("arretType").value = "";
    document.getElementById("arretDuree").value = "";
    document.getElementById("arretCommentaire").value = "";
  });
  updateArrets();
}
function updateArrets() {
  const hist = document.getElementById("arretsHistorique");
  hist.innerHTML = arretsData.map(a =>
    `<div>🔧 [${a.ligne}] ${a.type} - ${a.duree} min (${a.date})<br>${a.com || ""}</div>`
  ).join("");
}

// ---- ORGANISATION ----
function initOrganisation() {
  document.getElementById("saveConsigne").addEventListener("click", () => {
    const texte = document.getElementById("consigneTexte").value.trim();
    if (!texte) return alert("Consigne vide !");
    const record = { texte, valide: false, date: new Date().toLocaleString("fr-FR") };
    organisationData.push(record);
    saveData();
    updateOrganisation();
    document.getElementById("consigneTexte").value = "";
  });
  updateOrganisation();
}
function updateOrganisation() {
  const hist = document.getElementById("organisationHistorique");
  hist.innerHTML = organisationData.map((c, i) =>
    `<div>
      📝 ${c.texte} (${c.date})
      <input type="checkbox" ${c.valide ? "checked" : ""} onchange="toggleConsigne(${i})" /> Validé
    </div>`
  ).join("");
}
function toggleConsigne(i) {
  organisationData[i].valide = !organisationData[i].valide;
  saveData();
  updateOrganisation();
}

// ---- PERSONNEL ----
function initPersonnel() {
  document.getElementById("savePersonnel").addEventListener("click", () => {
    const nom = document.getElementById("persNom").value;
    const motif = document.getElementById("persMotif").value;
    const com = document.getElementById("persCommentaire").value;
    if (!nom || !motif) return alert("Champs incomplets !");
    personnelData.push({ nom, motif, com, date: new Date().toLocaleString("fr-FR") });
    saveData();
    updatePersonnel();
    document.getElementById("persNom").value = "";
    document.getElementById("persMotif").value = "";
    document.getElementById("persCommentaire").value = "";
  });
  updatePersonnel();
}
function updatePersonnel() {
  const hist = document.getElementById("personnelHistorique");
  hist.innerHTML = personnelData.map(p =>
    `<div>👷 ${p.nom} - ${p.motif} (${p.date})<br>${p.com || ""}</div>`
  ).join("");
}

// ---- GRAPHIQUE ATELIER ----
let atelierChart;
function updateAtelierGraph() {
  const ctx = document.getElementById("atelierChart").getContext("2d");
  if (atelierChart) atelierChart.destroy();

  const datasets = lignes.map(ligne => {
    const data = (productionData[ligne] || []).map(r => r.qte);
    return {
      label: ligne,
      data,
      fill: false,
      borderColor: randomColor(),
      tension: 0.3
    };
  });

  atelierChart = new Chart(ctx, {
    type: "line",
    data: { labels: Array(10).fill(""), datasets },
    options: { responsive: true, plugins: { legend: { position: "bottom" } } }
  });
}
function randomColor() {
  return `hsl(${Math.floor(Math.random() * 360)}, 70%, 55%)`;
}

// ---- CALCULATRICE ----
function initCalculatrice() {
  const calc = document.getElementById("calculator");
  const btn = document.getElementById("calcButton");
  const screen = document.getElementById("calcScreen");
  btn.addEventListener("click", () => calc.classList.toggle("hidden"));
  document.getElementById("closeCalc").addEventListener("click", () => calc.classList.add("hidden"));
  document.querySelectorAll(".calc-btn").forEach(b => {
    b.addEventListener("click", () => {
      const v = b.textContent;
      if (v === "C") screen.value = "";
      else if (v === "=") {
        try { screen.value = eval(screen.value); } catch { screen.value = "Err"; }
      } else screen.value += v;
    });
  });
}

// ---- SAUVEGARDE ----
function saveData() {
  localStorage.setItem("productionData", JSON.stringify(productionData));
  localStorage.setItem("arretsData", JSON.stringify(arretsData));
  localStorage.setItem("organisationData", JSON.stringify(organisationData));
  localStorage.setItem("personnelData", JSON.stringify(personnelData));
}
function loadData() {
  productionData = JSON.parse(localStorage.getItem("productionData") || "{}");
  arretsData = JSON.parse(localStorage.getItem("arretsData") || "[]");
  organisationData = JSON.parse(localStorage.getItem("organisationData") || "[]");
  personnelData = JSON.parse(localStorage.getItem("personnelData") || "[]");
  updateArrets();
  updateOrganisation();
  updatePersonnel();
}

// ---- EXPORT EXCEL ----
function exportGlobalExcel() {
  const wb = XLSX.utils.book_new();
  const now = new Date();
  const timestamp = now.toLocaleString("fr-FR").replace(/[/:, ]/g, "_");

  const wsProd = XLSX.utils.json_to_sheet(flattenProduction());
  XLSX.utils.book_append_sheet(wb, wsProd, "Production");

  const wsArr = XLSX.utils.json_to_sheet(arretsData);
  XLSX.utils.book_append_sheet(wb, wsArr, "Arrêts");

  const wsOrg = XLSX.utils.json_to_sheet(organisationData);
  XLSX.utils.book_append_sheet(wb, wsOrg, "Organisation");

  const wsPers = XLSX.utils.json_to_sheet(personnelData);
  XLSX.utils.book_append_sheet(wb, wsPers, "Personnel");

  XLSX.writeFile(wb, `Atelier_PPNC_${timestamp}.xlsx`);
}
function flattenProduction() {
  const arr = [];
  for (let ligne in productionData) {
    productionData[ligne].forEach(r => arr.push({ Ligne: ligne, ...r }));
  }
  return arr;
}
