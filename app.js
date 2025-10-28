// === VARIABLES GLOBALES ===
let currentPage = 'atelier';
let data = JSON.parse(localStorage.getItem('atelierData')) || {
  production: {},
  arrets: [],
  consignes: [],
  personnel: []
};

// === GESTION DES PAGES ===
function openPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');
  currentPage = pageId;
  if (pageId === 'atelier') renderAtelier();
}

// === AFFICHAGE DATE, HEURE, SEMAINE, ÉQUIPE ===
function updateDateTime() {
  const now = new Date();
  const days = ["dimanche","lundi","mardi","mercredi","jeudi","vendredi","samedi"];
  const week = getWeekNumber(now);
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = (now - start) + ((start.getTimezoneOffset() - now.getTimezoneOffset()) * 60000);
  const quantieme = Math.floor(diff / 86400000);

  const heures = now.getHours().toString().padStart(2,"0");
  const minutes = now.getMinutes().toString().padStart(2,"0");

  // Détermination de l’équipe
  let equipe = "N";
  if (heures >= 5 && heures < 13) equipe = "M";
  else if (heures >= 13 && heures < 21) equipe = "S";

  document.getElementById("dateTimeDisplay").innerText = 
    `${days[now.getDay()]} ${now.toLocaleDateString()} ${heures}:${minutes}`;
  document.getElementById("weekDisplay").innerText = 
    `Semaine ${week} | Équipe ${equipe} | Jour ${quantieme}`;
}

function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
}
setInterval(updateDateTime, 1000);
updateDateTime();

// === SÉLECTION DE LIGNE ===
function selectLine(line) {
  const container = document.getElementById("ligneContainer");
  container.innerHTML = `
    <h2>Ligne ${line}</h2>
    <form id="prodForm">
      <label>Heure début :</label>
      <input type="time" id="startTime" />

      <label>Heure fin :</label>
      <input type="time" id="endTime" />

      <label>Quantité produite :</label>
      <input type="number" id="produite" placeholder="Quantité..." />

      <label>Quantité restante :</label>
      <input type="number" id="restante" placeholder="Restant..." />

      <label>Cadence manuelle (colis/h) :</label>
      <input type="number" id="cadenceManuelle" placeholder="Cadence..." />

      <div class="estimation">
        <strong>Fin estimée :</strong> <span id="finEstimee">--</span>
      </div>

      <button type="button" onclick="saveProduction('${line}')">💾 Enregistrer</button>
      <button type="button" onclick="resetForm()">♻️ Remise à zéro</button>
    </form>

    <h3>Historique</h3>
    <ul id="historique${line}"></ul>
  `;
  renderHistorique(line);
}

// === CALCUL DU TEMPS ESTIMÉ ===
function calculFinEstimee(line) {
  const start = document.getElementById('startTime').value;
  const end = document.getElementById('endTime').value;
  const produite = parseFloat(document.getElementById('produite').value) || 0;
  const restante = parseFloat(document.getElementById('restante').value) || 0;
  const cadenceManuelle = parseFloat(document.getElementById('cadenceManuelle').value) || 0;

  let cadence = 0, tempsRestant = 0;
  if (start && end && produite > 0) {
    const [h1,m1] = start.split(':').map(Number);
    const [h2,m2] = end.split(':').map(Number);
    const diff = ((h2*60+m2)-(h1*60+m1))/60;
    cadence = produite / diff;
  } else if (cadenceManuelle > 0) {
    cadence = cadenceManuelle;
  }

  if (restante > 0 && cadence > 0) {
    tempsRestant = restante / cadence;
  }

  const finEl = document.getElementById('finEstimee');
  if (tempsRestant > 0) {
    const now = new Date();
    now.setMinutes(now.getMinutes() + tempsRestant * 60);
    finEl.innerText = `${now.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} (~${tempsRestant.toFixed(2)}h)`;
  } else {
    finEl.innerText = "--";
  }
}

// === ENREGISTREMENT PRODUCTION ===
function saveProduction(line) {
  const start = document.getElementById('startTime').value;
  const end = document.getElementById('endTime').value;
  const produite = document.getElementById('produite').value;
  const restante = document.getElementById('restante').value;
  const cadenceManuelle = document.getElementById('cadenceManuelle').value;
  const fin = document.getElementById('finEstimee').innerText;
  const equipe = document.getElementById('weekDisplay').innerText.split('|')[1].trim();

  if (!data.production[line]) data.production[line] = [];
  data.production[line].push({
    date: new Date().toLocaleString(),
    start, end, produite, restante, cadenceManuelle, fin, equipe
  });

  localStorage.setItem('atelierData', JSON.stringify(data));
  renderHistorique(line);
  renderAtelier();
}

// === RENDER HISTORIQUE ===
function renderHistorique(line) {
  const ul = document.getElementById('historique' + line);
  if (!ul || !data.production[line]) return;
  ul.innerHTML = data.production[line].map(e =>
    `<li>${e.date} — ${e.start}→${e.end} | Q=${e.produite} | Rest=${e.restante} | Fin=${e.fin}</li>`
  ).join('');
}

// === RENDER PAGE ATELIER ===
function renderAtelier() {
  const ctx = document.getElementById("atelierChart").getContext("2d");
  const lines = Object.keys(data.production);
  const datasets = [];

  lines.forEach((l, i) => {
    const values = data.production[l].map(p => parseFloat(p.produite) || 0);
    datasets.push({
      label: l,
      data: values,
      fill: false,
      borderColor: `hsl(${i*40}, 80%, 50%)`,
      tension: 0.3
    });
  });

  if (window.mainChart) window.mainChart.destroy();
  window.mainChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: Array.from({length:10}, (_,i)=>i+1),
      datasets
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true }
      }
    }
  });

  // Historiques condensés
  document.getElementById("historiqueProduction").innerHTML =
    lines.map(l => `<li><strong>${l}</strong> (${data.production[l].length} enregistrements)</li>`).join('');
  document.getElementById("historiqueArrets").innerHTML =
    data.arrets.map(a => `<li>${a.date} - ${a.ligne} (${a.type}) ${a.commentaire}</li>`).join('');
  document.getElementById("historiqueOrganisation").innerHTML =
    data.consignes.map(c => `<li>${c.date} - ${c.texte} ${c.realisee ? '✅' : '⏳'}</li>`).join('');
  document.getElementById("historiquePersonnel").innerHTML =
    data.personnel.map(p => `<li>${p.date} - ${p.nom} (${p.role})</li>`).join('');
}

// === ARRÊTS ===
function saveArret() {
  const ligne = document.getElementById("arretLigne").value;
  const type = document.getElementById("arretType").value;
  const commentaire = document.getElementById("arretCommentaire").value;
  if (!ligne) return alert("Sélectionne une ligne");
  data.arrets.push({
    date: new Date().toLocaleString(),
    ligne, type, commentaire
  });
  localStorage.setItem("atelierData", JSON.stringify(data));
  renderAtelier();
  alert("Arrêt enregistré !");
}

// === ORGANISATION ===
function saveConsigne() {
  const texte = document.getElementById("nouvelleConsigne").value;
  const realisee = document.getElementById("consigneRealisee").checked;
  if (!texte) return alert("Saisis une consigne !");
  data.consignes.push({
    date: new Date().toLocaleString(),
    texte, realisee
  });
  localStorage.setItem("atelierData", JSON.stringify(data));
  renderAtelier();
  alert("Consigne enregistrée !");
}

// === PERSONNEL ===
function savePersonnel() {
  const nom = document.getElementById("personnelNom").value;
  const role = document.getElementById("personnelRole").value;
  if (!nom) return alert("Saisis un nom !");
  data.personnel.push({
    date: new Date().toLocaleString(),
    nom, role
  });
  localStorage.setItem("atelierData", JSON.stringify(data));
  renderAtelier();
  alert("Personnel enregistré !");
}

// === EXPORT EXCEL GLOBAL ===
function exportAllExcel() {
  const wb = XLSX.utils.book_new();

  const wsProd = XLSX.utils.json_to_sheet(Object.entries(data.production).flatMap(([l, arr]) =>
    arr.map(e => ({Ligne:l, ...e}))
  ));
  const wsArrets = XLSX.utils.json_to_sheet(data.arrets);
  const wsCons = XLSX.utils.json_to_sheet(data.consignes);
  const wsPers = XLSX.utils.json_to_sheet(data.personnel);

  XLSX.utils.book_append_sheet(wb, wsProd, "Production");
  XLSX.utils.book_append_sheet(wb, wsArrets, "Arrêts");
  XLSX.utils.book_append_sheet(wb, wsCons, "Consignes");
  XLSX.utils.book_append_sheet(wb, wsPers, "Personnel");

  XLSX.writeFile(wb, "Synthese_Atelier_PPNC.xlsx");
}

// === CALCULATRICE ===
function toggleCalculator() {
  const calc = document.getElementById("calculator");
  calc.classList.toggle("hidden");
}
function pressCalc(val) {
  document.getElementById("calcDisplay").value += val;
}
function calcClear() {
  document.getElementById("calcDisplay").value = "";
}
function calcEqual() {
  const display = document.getElementById("calcDisplay");
  try { display.value = eval(display.value); }
  catch { display.value = "Erreur"; }
}

// === DÉPLACEMENT DE L’ICÔNE CALCULATRICE ===
const icon = document.getElementById("calcIcon");
let offsetX, offsetY, isDown = false;
icon.addEventListener("mousedown", e => {isDown=true;offsetX=e.offsetX;offsetY=e.offsetY;});
icon.addEventListener("mouseup", ()=>isDown=false);
icon.addEventListener("mousemove", e=>{
  if(!isDown)return;
  icon.style.left = (e.pageX - offsetX) + "px";
  icon.style.top = (e.pageY - offsetY) + "px";
  icon.style.bottom = "auto"; icon.style.right = "auto";
});

// === RÉINITIALISATION FORM ===
function resetForm() {
  document.querySelectorAll("#prodForm input").forEach(i => i.value = "");
  document.getElementById("finEstimee").innerText = "--";
}
