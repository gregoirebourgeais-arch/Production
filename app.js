/* ----------------------------
   Atelier PPNC - Version complète marbre
   ---------------------------- */

/* --- VARIABLES GLOBALES --- */
let currentPage = 'menu';
let currentLine = '';
let allData = {
  production: JSON.parse(localStorage.getItem('production')) || {},
  arrets: JSON.parse(localStorage.getItem('arrets')) || [],
  organisation: JSON.parse(localStorage.getItem('organisation')) || [],
  personnel: JSON.parse(localStorage.getItem('personnel')) || []
};

/* --- INITIALISATION --- */
document.addEventListener("DOMContentLoaded", () => {
  initMenu();
  updateDateTime();
  setInterval(updateDateTime, 1000);
  setupCalculator();
  updateAtelierChart();
});

/* --- NAVIGATION ENTRE PAGES --- */
function openPage(pageId) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(pageId).classList.add("active");
  currentPage = pageId;

  if (pageId === 'atelier') updateAtelierView();
  if (pageId === 'production') generateLineButtons();
}

function backToMenu() {
  openPage('menu');
}

/* --- HORLOGE & INFOS JOUR --- */
function updateDateTime() {
  const now = new Date();
  const jours = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  const mois = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
  const semaine = getWeekNumber(now);
  const quantieme = now.getDate().toString().padStart(2, '0');
  const heure = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const jour = jours[now.getDay()];
  const moisNom = mois[now.getMonth()];
  const equipe = getEquipe(now);

  document.getElementById("topDateTime").textContent =
    `${jour} ${quantieme} ${moisNom} - ${heure} | Sem.${semaine} | Équipe ${equipe}`;
}

function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function getEquipe(date) {
  const h = date.getHours();
  if (h >= 5 && h < 13) return "M"; // Matin
  if (h >= 13 && h < 21) return "A"; // Après-midi
  return "N"; // Nuit
}

/* --- MENU DES LIGNES --- */
const lignes = ["Râpé", "T2", "RT", "OMORI", "T1", "Sticks", "Emballage", "Dés", "Filets", "Prédécoupés"];

function generateLineButtons() {
  const container = document.getElementById("lineButtons");
  container.innerHTML = "";
  lignes.forEach(l => {
    const btn = document.createElement("button");
    btn.className = "btn";
    btn.textContent = l;
    btn.onclick = () => openLine(l);
    container.appendChild(btn);
  });
}

function openLine(line) {
  currentLine = line;
  document.getElementById("lineTitle").textContent = `Ligne ${line}`;
  document.getElementById("lineSection").classList.remove("hidden");
  loadLineData();
}

/* --- PRODUCTION --- */
function saveProduction() {
  const start = document.getElementById("startTime").value;
  const end = document.getElementById("endTime").value;
  const qte = document.getElementById("quantityInput").value;
  const reste = document.getElementById("remainingInput").value;
  const cadenceMan = document.getElementById("manualCadence").value;

  if (!currentLine) return alert("Choisissez une ligne !");
  if (!start || !end) return alert("Indiquez les heures de début et fin.");

  const diffHeures = (new Date(`1970-01-01T${end}:00`) - new Date(`1970-01-01T${start}:00`)) / 3600000;
  const cadence = cadenceMan || (qte && diffHeures > 0 ? (qte / diffHeures).toFixed(1) : 0);
  const equipe = getEquipe(new Date());
  const date = new Date().toLocaleString();

  if (!allData.production[currentLine]) allData.production[currentLine] = [];
  allData.production[currentLine].push({ date, start, end, qte, reste, cadence, equipe });

  localStorage.setItem("production", JSON.stringify(allData.production));
  displayProductionHistory();
  clearInputs(['quantityInput','remainingInput','manualCadence']);
}

function loadLineData() {
  displayProductionHistory();
}

function displayProductionHistory() {
  const histDiv = document.getElementById("productionHistory");
  histDiv.innerHTML = "";
  const data = allData.production[currentLine] || [];
  if (data.length === 0) histDiv.innerHTML = "<p>Aucun enregistrement.</p>";
  data.slice().reverse().forEach(e => {
    const p = document.createElement("p");
    p.textContent = `[${e.date}] ${e.qte} u – Cadence ${e.cadence}/h – Équipe ${e.equipe}`;
    histDiv.appendChild(p);
  });
}

/* --- TEMPS ESTIMÉ --- */
function updateEstimation() {
  const reste = document.getElementById("remainingInput").value;
  const cadenceMan = document.getElementById("manualCadence").value;
  if (!reste) return;
  let cadence = parseFloat(cadenceMan);
  if (!cadence && currentLine && allData.production[currentLine]?.length) {
    cadence = parseFloat(allData.production[currentLine].slice(-1)[0].cadence);
  }
  const etaDiv = document.getElementById("estimationDisplay");
  if (!cadence || cadence <= 0) {
    etaDiv.textContent = "⏱️ Cadence insuffisante pour calculer le temps restant";
    return;
  }
  const heures = (reste / cadence).toFixed(2);
  const mins = Math.round(heures * 60);
  etaDiv.textContent = `⏳ Temps estimé restant : ${mins} minutes (~${heures} h)`;
}

/* --- ARRÊTS --- */
function saveArret() {
  const ligne = document.getElementById("arretLigne").value;
  const type = document.getElementById("arretType").value;
  const duree = document.getElementById("arretDuree").value;
  const com = document.getElementById("arretComment").value;
  if (!ligne || !type || !duree) return alert("Complétez tous les champs.");
  const date = new Date().toLocaleString();
  const equipe = getEquipe(new Date());
  allData.arrets.push({ date, ligne, type, duree, com, equipe });
  localStorage.setItem("arrets", JSON.stringify(allData.arrets));
  displayArrets();
  clearInputs(['arretLigne','arretType','arretDuree','arretComment']);
}

function displayArrets() {
  const div = document.getElementById("arretHistorique");
  div.innerHTML = "";
  allData.arrets.slice().reverse().forEach(a => {
    const p = document.createElement("p");
    p.textContent = `[${a.date}] ${a.ligne} – ${a.type} – ${a.duree} min (${a.equipe})`;
    div.appendChild(p);
  });
}

/* --- ORGANISATION --- */
function saveConsigne() {
  const txt = document.getElementById("consigneInput").value;
  if (!txt.trim()) return;
  const date = new Date().toLocaleString();
  allData.organisation.push({ date, txt, valide: false });
  localStorage.setItem("organisation", JSON.stringify(allData.organisation));
  displayConsignes();
  clearInputs(['consigneInput']);
}

function displayConsignes() {
  const div = document.getElementById("consignesList");
  div.innerHTML = "";
  allData.organisation.slice().reverse().forEach((c, i) => {
    const row = document.createElement("p");
    const chk = document.createElement("input");
    chk.type = "checkbox";
    chk.checked = c.valide;
    chk.onchange = () => {
      allData.organisation[i].valide = chk.checked;
      localStorage.setItem("organisation", JSON.stringify(allData.organisation));
    };
    row.appendChild(chk);
    row.append(` ${c.date} – ${c.txt}`);
    div.appendChild(row);
  });
}

/* --- PERSONNEL --- */
function savePersonnel() {
  const nom = document.getElementById("persoNom").value;
  const motif = document.getElementById("persoMotif").value;
  const com = document.getElementById("persoComment").value;
  if (!nom) return;
  const date = new Date().toLocaleString();
  const equipe = getEquipe(new Date());
  allData.personnel.push({ date, nom, motif, com, equipe });
  localStorage.setItem("personnel", JSON.stringify(allData.personnel));
  displayPersonnel();
  clearInputs(['persoNom','persoMotif','persoComment']);
}

function displayPersonnel() {
  const div = document.getElementById("personnelHistorique");
  div.innerHTML = "";
  allData.personnel.slice().reverse().forEach(p => {
    const line = document.createElement("p");
    line.textContent = `[${p.date}] ${p.nom} – ${p.motif} (${p.com}) – ${p.equipe}`;
    div.appendChild(line);
  });
}

/* --- ATELIER (GRAPHIQUE + HISTORIQUE) --- */
let atelierChart;

function updateAtelierView() {
  displayAtelierHistorique();
  updateAtelierChart();
}

function displayAtelierHistorique() {
  const hist = document.getElementById("atelierHistorique");
  hist.innerHTML = "";
  lignes.forEach(l => {
    const data = allData.production[l] || [];
    if (data.length) {
      const last = data[data.length - 1];
      const p = document.createElement("p");
      p.textContent = `${l} → ${last.qte} u à ${last.cadence}/h (Équipe ${last.equipe})`;
      hist.appendChild(p);
    }
  });
}

function updateAtelierChart() {
  const ctx = document.getElementById("atelierChart").getContext("2d");
  if (atelierChart) atelierChart.destroy();

  const datasets = lignes.map((l, i) => {
    const data = allData.production[l]?.map(p => p.cadence) || [];
    return {
      label: l,
      data,
      borderColor: `hsl(${i * 36}, 70%, 45%)`,
      fill: false,
      tension: 0.3
    };
  });

  atelierChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: Array.from({ length: 10 }, (_, i) => i + 1),
      datasets
    },
    options: {
      responsive: true,
      plugins: { legend: { position: "bottom" } },
      scales: { y: { beginAtZero: true, title: { display: true, text: "Cadence (colis/h)" } } }
    }
  });
}

/* --- EXPORT EXCEL --- */
function exportAllData() {
  const wb = XLSX.utils.book_new();
  const now = new Date().toISOString().replace(/[:.]/g, "-");

  const prod = [];
  for (const line in allData.production) {
    allData.production[line].forEach(p => prod.push({ Ligne: line, ...p }));
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(prod), "Production");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(allData.arrets), "Arrêts");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(allData.organisation), "Organisation");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(allData.personnel), "Personnel");
  XLSX.writeFile(wb, `Atelier_PPNC_${now}.xlsx`);
}

/* --- OUTILS --- */
function clearInputs(ids) {
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
}

/* --- CALCULATRICE FLOTTANTE --- */
function setupCalculator() {
  const toggle = document.getElementById("calcToggle");
  const calc = document.getElementById("calculator");
  const display = document.getElementById("calcDisplay");
  const buttons = calc.querySelectorAll("button");
  let expr = "";

  toggle.addEventListener("click", () => calc.classList.toggle("hidden"));
  let offsetX, offsetY, isDragging = false;

  calc.addEventListener("mousedown", e => {
    isDragging = true;
    offsetX = e.clientX - calc.getBoundingClientRect().left;
    offsetY = e.clientY - calc.getBoundingClientRect().top;
  });
  document.addEventListener("mouseup", () => isDragging = false);
  document.addEventListener("mousemove", e => {
    if (isDragging) {
      calc.style.right = "auto";
      calc.style.left = `${e.clientX - offsetX}px`;
      calc.style.top = `${e.clientY - offsetY}px`;
    }
  });

  buttons.forEach(b => {
    b.addEventListener("click", () => {
      const val = b.textContent;
      if (val === "C") expr = "";
      else if (val === "←") expr = expr.slice(0, -1);
      else if (val === "=") {
        try { expr = eval(expr).toString(); } catch { expr = "Erreur"; }
      } else expr += val;
      display.value = expr;
    });
  });
}
