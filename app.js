// === INITIALISATION ===
document.addEventListener("DOMContentLoaded", () => {
  updateDateInfo();
  loadAllData();
  initCalculator();
  drawAtelierChart();
  setInterval(updateDateInfo, 60000);
});

// === DATE / HEURE / ÉQUIPE ===
function updateDateInfo() {
  const now = new Date();
  const day = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const hours = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const week = getWeekNumber(now);
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
  const team = getTeam(now);
  document.getElementById('dateInfo').innerText =
    `${day} à ${hours}\nJour ${dayOfYear} – Semaine ${week} – Équipe ${team}`;
}

function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function getTeam(now) {
  const hour = now.getHours();
  if (hour >= 5 && hour < 13) return "M";
  if (hour >= 13 && hour < 21) return "S";
  return "N";
}

// === NAVIGATION ===
function openPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if (id === 'atelier') drawAtelierChart();
}

// === PRODUCTION ===
let selectedLine = null;

function selectLine(line) {
  selectedLine = line;
  const div = document.getElementById('productionForm');
  div.innerHTML = `
    <div class="card">
      <h3>Ligne ${line}</h3>
      <label>Heure de début :</label>
      <input type="time" id="startTime">
      <label>Heure de fin :</label>
      <input type="time" id="endTime">
      <label>Quantité produite :</label>
      <input type="number" id="qteProd">
      <label>Quantité restante :</label>
      <input type="number" id="qteRest">
      <label>Cadence manuelle (colis/h) :</label>
      <input type="number" id="cadenceManuelle">
      <div class="card" style="background:#eef3ff; text-align:center;">
        Fin estimée : <strong id="finEstimee">--</strong>
      </div>
      <button onclick="enregistrerProduction()">💾 Enregistrer</button>
      <button onclick="resetProduction()">♻️ Remise à zéro</button>
    </div>`;
  
  // Ajout calcul auto temps restant
  ["qteRest", "cadenceManuelle"].forEach(id => {
    document.getElementById(id).addEventListener("input", updateFinEstimee);
  });
}

function updateFinEstimee() {
  const rest = parseFloat(document.getElementById("qteRest").value) || 0;
  const cadence = parseFloat(document.getElementById("cadenceManuelle").value) || 0;
  if (rest > 0 && cadence > 0) {
    const heures = rest / cadence;
    const fin = new Date();
    fin.setHours(fin.getHours() + heures);
    const heureFin = fin.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    document.getElementById("finEstimee").innerText = `${heureFin} (${heures.toFixed(2)} h restantes)`;
  } else {
    document.getElementById("finEstimee").innerText = "--";
  }
}

function enregistrerProduction() {
  const data = {
    ligne: selectedLine,
    debut: document.getElementById("startTime").value,
    fin: document.getElementById("endTime").value,
    qteProd: document.getElementById("qteProd").value,
    qteRest: document.getElementById("qteRest").value,
    cadence: document.getElementById("cadenceManuelle").value,
    equipe: getTeam(new Date()),
    date: new Date().toLocaleString("fr-FR")
  };

  if (!data.ligne) return alert("Sélectionnez une ligne !");
  const list = JSON.parse(localStorage.getItem("production")) || [];
  list.push(data);
  localStorage.setItem("production", JSON.stringify(list));

  loadProductionHistorique();
  resetProduction();
}

function resetProduction() {
  document.getElementById("productionForm").querySelectorAll("input").forEach(el => el.value = "");
  document.getElementById("finEstimee").innerText = "--";
}

function loadProductionHistorique() {
  const div = document.getElementById("historiqueProduction");
  const list = JSON.parse(localStorage.getItem("production")) || [];
  div.innerHTML = list.slice(-10).reverse().map(x =>
    `<div class="historique-item">${x.date} - ${x.ligne} : ${x.qteProd} produits, ${x.qteRest} restants, cadence ${x.cadence}/h, équipe ${x.equipe}</div>`
  ).join("");
  updateAtelierHistoriques();
}

// === ARRÊTS ===
function saveArret() {
  const ligne = document.getElementById("ligneArret").value;
  const type = document.getElementById("typeArret").value;
  const duree = document.getElementById("dureeArret").value;
  const commentaire = document.getElementById("commentaireArret").value;
  if (!ligne || !type || !duree) return alert("Veuillez remplir tous les champs.");

  const data = { ligne, type, duree, commentaire, date: new Date().toLocaleString("fr-FR"), equipe: getTeam(new Date()) };
  const list = JSON.parse(localStorage.getItem("arrets")) || [];
  list.push(data);
  localStorage.setItem("arrets", JSON.stringify(list));

  loadArrets();
  ["ligneArret","typeArret","dureeArret","commentaireArret"].forEach(id => document.getElementById(id).value = "");
}

function loadArrets() {
  const div = document.getElementById("historiqueArrets");
  const list = JSON.parse(localStorage.getItem("arrets")) || [];
  div.innerHTML = list.slice(-10).reverse().map(x =>
    `<div class="historique-item">${x.date} - ${x.ligne} (${x.type}) ${x.duree} min — ${x.commentaire || ""} (${x.equipe})</div>`
  ).join("");
  updateAtelierHistoriques();
}

// === ORGANISATION ===
function saveConsigne() {
  const texte = document.getElementById("consigneTexte").value;
  const realisee = document.getElementById("consigneRealisee").checked;
  if (!texte) return alert("Renseignez une consigne !");
  const data = { texte, realisee, date: new Date().toLocaleString("fr-FR"), equipe: getTeam(new Date()) };
  const list = JSON.parse(localStorage.getItem("consignes")) || [];
  list.push(data);
  localStorage.setItem("consignes", JSON.stringify(list));

  loadConsignes();
  document.getElementById("consigneTexte").value = "";
  document.getElementById("consigneRealisee").checked = false;
}

function loadConsignes() {
  const div = document.getElementById("historiqueConsignes");
  const list = JSON.parse(localStorage.getItem("consignes")) || [];
  div.innerHTML = list.slice(-10).reverse().map(x =>
    `<div class="historique-item">${x.date} — ${x.texte} ${x.realisee ? "✅" : "❌"} (${x.equipe})</div>`
  ).join("");
  updateAtelierHistoriques();
}

// === PERSONNEL ===
function savePersonnel() {
  const nom = document.getElementById("nomPersonnel").value;
  const poste = document.getElementById("postePersonnel").value;
  if (!nom || !poste) return alert("Complétez les champs !");
  const data = { nom, poste, date: new Date().toLocaleString("fr-FR"), equipe: getTeam(new Date()) };
  const list = JSON.parse(localStorage.getItem("personnel")) || [];
  list.push(data);
  localStorage.setItem("personnel", JSON.stringify(list));

  loadPersonnel();
  document.getElementById("nomPersonnel").value = "";
  document.getElementById("postePersonnel").value = "";
}

function loadPersonnel() {
  const div = document.getElementById("historiquePersonnel");
  const list = JSON.parse(localStorage.getItem("personnel")) || [];
  div.innerHTML = list.slice(-10).reverse().map(x =>
    `<div class="historique-item">${x.date} — ${x.nom} (${x.poste}) — ${x.equipe}</div>`
  ).join("");
  updateAtelierHistoriques();
}

// === ATELIER (vue globale + graphiques) ===
function updateAtelierHistoriques() {
  const prod = JSON.parse(localStorage.getItem("production")) || [];
  const arrets = JSON.parse(localStorage.getItem("arrets")) || [];
  const cons = JSON.parse(localStorage.getItem("consignes")) || [];
  const pers = JSON.parse(localStorage.getItem("personnel")) || [];

  const div = document.getElementById("atelierHistoriques");
  div.innerHTML = `
    <h3>Dernières entrées</h3>
    <div>${prod.slice(-3).map(x => `<div class='historique-item'>Prod ${x.ligne} : ${x.qteProd}</div>`).join("")}</div>
    <div>${arrets.slice(-3).map(x => `<div class='historique-item'>Arrêt ${x.ligne} : ${x.duree} min</div>`).join("")}</div>
    <div>${cons.slice(-2).map(x => `<div class='historique-item'>Consigne : ${x.texte}</div>`).join("")}</div>
    <div>${pers.slice(-2).map(x => `<div class='historique-item'>Pers : ${x.nom}</div>`).join("")}</div>
  `;
  drawAtelierChart();
}

function drawAtelierChart() {
  const prod = JSON.parse(localStorage.getItem("production")) || [];
  const ctx = document.getElementById("atelierChart");
  if (!ctx) return;
  const lignes = ["Râpé","T2","RT","OMORI","T1","Sticks","Emballage","Dés","Filets","Prédécoupés"];
  const data = lignes.map(l => {
    const total = prod.filter(x => x.ligne === l).reduce((a,b)=>a+parseFloat(b.qteProd||0),0);
    return total;
  });

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: lignes,
      datasets: [{
        label: "Production cumulée (colis)",
        data: data,
        fill: false,
        borderColor: '#007bff',
        tension: 0.2
      }]
    },
    options: {
      scales: { y: { beginAtZero: true } }
    }
  });
}

// === EXPORT EXCEL ===
function exportToExcel() {
  const wb = XLSX.utils.book_new();
  const sections = ["production","arrets","consignes","personnel"];
  sections.forEach(s => {
    const data = JSON.parse(localStorage.getItem(s)) || [];
    if (data.length) {
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, s);
    }
  });
  XLSX.writeFile(wb, "Synthese_Atelier_PPNC.xlsx");
}

// === CALCULATRICE ===
function initCalculator() {
  const keys = [
    "7","8","9","/","4","5","6","*","1","2","3","-","0",".","=","+","C"
  ];
  const grid = document.getElementById("calcKeys");
  grid.innerHTML = keys.map(k => `<button>${k}</button>`).join("");
  grid.querySelectorAll("button").forEach(b => b.addEventListener("click", e => calcInput(e.target.innerText)));
}

function toggleCalculator() {
  const calc = document.getElementById("calculator");
  calc.classList.toggle("hidden");
}

function calcInput(val) {
  const display = document.getElementById("calcDisplay");
  if (val === "=") display.value = eval(display.value || 0);
  else if (val === "C") display.value = "";
  else display.value += val;
}

// === CHARGEMENT INITIAL ===
function loadAllData() {
  loadProductionHistorique();
  loadArrets();
  loadConsignes();
  loadPersonnel();
    }
