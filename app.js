// ============================
//  APP.JS – Atelier PPNC
// ============================

// ---------- Variables globales ----------
let currentPage = "atelier";
let selectedLine = null;
let storageKey = "atelierPPNCData";
let data = JSON.parse(localStorage.getItem(storageKey)) || {
  production: {},
  arrets: [],
  consignes: [],
  personnel: [],
};

// ---------- Initialisation ----------
document.addEventListener("DOMContentLoaded", () => {
  updateDateInfo();
  setInterval(updateDateInfo, 60000);
  openPage("atelier");
  buildCalculator();
  renderGlobalHist();
  buildAtelierChart();
});

// ---------- Mise à jour date / heure / équipe ----------
function updateDateInfo() {
  const now = new Date();
  const options = { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" };
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
  const weekNumber = getWeekNumber(now);
  const equipe = getEquipe(now);
  document.getElementById("dateInfo").innerText =
    `${now.toLocaleDateString("fr-FR", options)}\nJour ${dayOfYear} – Semaine ${weekNumber} – Équipe ${equipe}`;
}

function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return weekNo;
}

function getEquipe(date) {
  const h = date.getHours();
  if (h >= 5 && h < 13) return "M";
  if (h >= 13 && h < 21) return "S";
  return "N";
}

// ---------- Navigation ----------
function openPage(pageId) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(pageId).classList.add("active");
  currentPage = pageId;
  if (pageId === "atelier") buildAtelierChart();
  saveData();
}

// ---------- Sélection ligne ----------
function selectLine(line) {
  selectedLine = line;
  document.getElementById("productionForm").innerHTML = `
    <h3>Ligne ${line}</h3>
    <label>Heure de début :</label>
    <input type="time" id="debut${line}" />
    <label>Heure de fin :</label>
    <input type="time" id="fin${line}" />
    <label>Quantité produite :</label>
    <input type="number" id="qte${line}" />
    <label>Quantité restante :</label>
    <input type="number" id="rest${line}" />
    <label>Cadence manuelle (colis/h) :</label>
    <input type="number" id="cadence${line}" />
    <div class="finEstimee">Fin estimée : <span id="estime${line}">--</span></div>
    <button onclick="saveProduction('${line}')">💾 Enregistrer</button>
  `;
}

// ---------- Enregistrer Production ----------
function saveProduction(line) {
  const qte = parseFloat(document.getElementById(`qte${line}`).value) || 0;
  const rest = parseFloat(document.getElementById(`rest${line}`).value) || 0;
  const cadManuelle = parseFloat(document.getElementById(`cadence${line}`).value) || null;
  const debut = document.getElementById(`debut${line}`).value;
  const fin = document.getElementById(`fin${line}`).value;
  const now = new Date().toLocaleString("fr-FR");
  const equipe = getEquipe(new Date());

  // Calcul du temps estimé restant
  let tempsRestant = "--";
  if (cadManuelle && rest > 0) {
    const heures = rest / cadManuelle;
    const totalMin = Math.round(heures * 60);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    tempsRestant = `${h}h${m.toString().padStart(2, "0")}`;
  } else if (debut && fin && qte > 0) {
    const [hd, md] = debut.split(":").map(Number);
    const [hf, mf] = fin.split(":").map(Number);
    const diffH = hf - hd + (mf - md) / 60;
    const cadence = qte / diffH;
    const heures = rest / cadence;
    const totalMin = Math.round(heures * 60);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    tempsRestant = `${h}h${m.toString().padStart(2, "0")}`;
  }

  document.getElementById(`estime${line}`).textContent = tempsRestant;

  if (!data.production[line]) data.production[line] = [];
  data.production[line].push({ date: now, equipe, debut, fin, qte, rest, cadManuelle, tempsRestant });
  saveData();
  renderProductionHist();
  clearProductionInputs(line);
}

// ---------- Nettoyage formulaire production ----------
function clearProductionInputs(line) {
  document.getElementById(`qte${line}`).value = "";
  document.getElementById(`rest${line}`).value = "";
  document.getElementById(`cadence${line}`).value = "";
}

// ---------- Sauvegarde ----------
function saveData() {
  localStorage.setItem(storageKey, JSON.stringify(data));
}

// ---------- Historique production ----------
function renderProductionHist() {
  const div = document.getElementById("historiqueProduction");
  div.innerHTML = "";
  Object.keys(data.production).forEach(line => {
    data.production[line].forEach(rec => {
      const el = document.createElement("div");
      el.className = "record";
      el.textContent = `${rec.date} | ${line} | ${rec.qte} colis | Restant ${rec.rest} | Fin estimée ${rec.tempsRestant}`;
      div.appendChild(el);
    });
  });
}

// ---------- Sauvegarde Arrêt ----------
function saveArret() {
  const ligne = document.getElementById("ligneArret").value;
  const type = document.getElementById("typeArret").value;
  const duree = parseInt(document.getElementById("dureeArret").value);
  const commentaire = document.getElementById("commentaireArret").value;
  if (!ligne || !type || !duree) return alert("Champs manquants !");
  data.arrets.push({
    date: new Date().toLocaleString("fr-FR"),
    equipe: getEquipe(new Date()),
    ligne, type, duree, commentaire
  });
  saveData();
  renderGlobalHist();
  alert("Arrêt enregistré !");
  document.getElementById("dureeArret").value = "";
  document.getElementById("commentaireArret").value = "";
}

// ---------- Sauvegarde Consigne ----------
function saveConsigne() {
  const texte = document.getElementById("consigneTexte").value;
  const realisee = document.getElementById("consigneRealisee").checked;
  if (!texte) return alert("Consigne vide !");
  data.consignes.push({
    date: new Date().toLocaleString("fr-FR"),
    equipe: getEquipe(new Date()),
    texte,
    realisee
  });
  saveData();
  renderGlobalHist();
  document.getElementById("consigneTexte").value = "";
  document.getElementById("consigneRealisee").checked = false;
}

// ---------- Sauvegarde Personnel ----------
function savePersonnel() {
  const nom = document.getElementById("nomPersonnel").value;
  const poste = document.getElementById("postePersonnel").value;
  if (!nom || !poste) return alert("Champs vides !");
  data.personnel.push({
    date: new Date().toLocaleString("fr-FR"),
    equipe: getEquipe(new Date()),
    nom, poste
  });
  saveData();
  renderGlobalHist();
  document.getElementById("nomPersonnel").value = "";
  document.getElementById("postePersonnel").value = "";
}

// ---------- Historique global ----------
function renderGlobalHist() {
  document.getElementById("histProduction").innerHTML = formatHist(data.production);
  document.getElementById("histArrets").innerHTML = data.arrets.map(a => `${a.date} | ${a.ligne} | ${a.type} ${a.duree}min`).join("<br>");
  document.getElementById("histConsignes").innerHTML = data.consignes.map(c => `${c.date} | ${c.texte} ${c.realisee ? "✅" : "⏳"}`).join("<br>");
  document.getElementById("histPersonnel").innerHTML = data.personnel.map(p => `${p.date} | ${p.nom} - ${p.poste}`).join("<br>");
}

function formatHist(production) {
  let html = "";
  Object.entries(production).forEach(([line, recs]) => {
    recs.forEach(r => {
      html += `${r.date} | ${line} | ${r.qte} colis | ${r.tempsRestant}<br>`;
    });
  });
  return html || "Aucun enregistrement";
}

// ---------- Graphique multi-lignes ----------
let atelierChart;
function buildAtelierChart() {
  const ctx = document.getElementById("atelierChart");
  const labels = Object.keys(data.production);
  const datasets = labels.map(line => ({
    label: line,
    data: data.production[line].map(r => r.qte),
    borderColor: getRandomColor(),
    borderWidth: 2,
    fill: false,
    tension: 0.3
  }));

  if (atelierChart) atelierChart.destroy();
  atelierChart = new Chart(ctx, {
    type: "line",
    data: { labels, datasets },
    options: { responsive: true, plugins: { legend: { position: "bottom" } } }
  });
}

function getRandomColor() {
  return `hsl(${Math.random() * 360}, 70%, 55%)`;
}

// ---------- Export Excel ----------
function exportToExcel() {
  const wb = XLSX.utils.book_new();

  // Production
  const prodSheet = [];
  Object.entries(data.production).forEach(([line, recs]) => {
    recs.forEach(r => prodSheet.push({
      Ligne: line, Date: r.date, Équipe: r.equipe,
      Début: r.debut, Fin: r.fin,
      Quantité: r.qte, Restant: r.rest,
      Cadence: r.cadManuelle, Fin_estimée: r.tempsRestant
    }));
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(prodSheet), "Production");

  // Arrêts
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.arrets), "Arrêts");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.consignes), "Consignes");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.personnel), "Personnel");

  XLSX.writeFile(wb, "Synthese_Atelier_PPNC.xlsx");
}

// ---------- Calculatrice ----------
function toggleCalculator() {
  document.getElementById("calculator").classList.toggle("hidden");
}

function buildCalculator() {
  const keys = ["7","8","9","/","4","5","6","*","1","2","3","-","0",".","=","+"];
  const container = document.getElementById("calcKeys");
  container.innerHTML = "";
  keys.forEach(k => {
    const btn = document.createElement("button");
    btn.textContent = k;
    btn.onclick = () => handleCalcInput(k);
    container.appendChild(btn);
  });
}

function handleCalcInput(k) {
  const disp = document.getElementById("calcDisplay");
  if (k === "=") {
    try { disp.value = eval(disp.value); } catch { disp.value = "Erreur"; }
  } else disp.value += k;
}

// ---------- Draggable calculatrice ----------
const calc = document.getElementById("calculator");
calc?.addEventListener("dragstart", e => {
  const rect = calc.getBoundingClientRect();
  e.dataTransfer.setData("text/plain", `${e.clientX - rect.left},${e.clientY - rect.top}`);
});
document.addEventListener("dragover", e => e.preventDefault());
document.addEventListener("drop", e => {
  e.preventDefault();
  const dataPos = e.dataTransfer.getData("text/plain").split(",");
  calc.style.left = `${e.clientX - parseInt(dataPos[0])}px`;
  calc.style.top = `${e.clientY - parseInt(dataPos[1])}px`;
});
