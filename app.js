/* ==== VARIABLES GLOBALES ==== */
const lignes = ["Râpé", "T2", "RT", "OMORI T1", "Sticks", "Emballage", "Dés", "Filets", "Prédécoupés"];
let data = JSON.parse(localStorage.getItem("atelierData")) || {};
if (!data.lignes) data.lignes = {};
lignes.forEach(l => { if (!data.lignes[l]) data.lignes[l] = []; });
saveData();

/* ==== ENREGISTREMENT LOCAL ==== */
function saveData() {
  localStorage.setItem("atelierData", JSON.stringify(data));
}

/* ==== AFFICHAGE DES SECTIONS ==== */
function showSection(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  if (id === "atelier") drawAtelierChart();
}

/* ==== INITIALISATION DES LIGNES ==== */
const ligneButtons = document.getElementById("ligneButtons");
const ligneContainer = document.getElementById("ligneContainer");

lignes.forEach(ligne => {
  const btn = document.createElement("button");
  btn.textContent = ligne;
  btn.onclick = () => openLigne(ligne);
  ligneButtons.appendChild(btn);
});

/* ==== PAGE LIGNE ==== */
function openLigne(ligne) {
  ligneContainer.innerHTML = `
    <h3>${ligne}</h3>
    <form id="form-${ligne}" onsubmit="saveLigne(event, '${ligne}')">
      <label>Heure début :</label>
      <input type="time" id="debut-${ligne}" step="60">
      
      <label>Heure fin :</label>
      <input type="time" id="fin-${ligne}" step="60">

      <label>Quantité produite :</label>
      <input type="number" id="quantite-${ligne}" placeholder="Ex: 500" />

      <label>Quantité restante :</label>
      <input type="number" id="restant-${ligne}" placeholder="Ex: 300" oninput="estimerFin('${ligne}')" />

      <p id="estimation-${ligne}" class="estimation"></p>

      <button type="submit">💾 Enregistrer</button>
    </form>

    <h4>Historique</h4>
    <div id="historique-${ligne}"></div>
    <canvas id="chart-${ligne}"></canvas>
  `;
  showHistorique(ligne);
}

/* ==== SAUVEGARDE DE LIGNE ==== */
function saveLigne(e, ligne) {
  e.preventDefault();
  const debut = document.getElementById(`debut-${ligne}`).value;
  const fin = document.getElementById(`fin-${ligne}`).value;
  const quantite = parseFloat(document.getElementById(`quantite-${ligne}`).value) || 0;
  const restant = parseFloat(document.getElementById(`restant-${ligne}`).value) || 0;

  if (!debut || !fin) {
    alert("Merci de renseigner les heures de début et de fin.");
    return;
  }

  const duree = getMinutesDiff(debut, fin);
  const cadence = quantite && duree ? Math.round(quantite / (duree / 60)) : 0;

  const enreg = {
    date: new Date().toLocaleString(),
    debut,
    fin,
    quantite,
    restant,
    cadence
  };

  data.lignes[ligne].push(enreg);
  saveData();
  showHistorique(ligne);
  drawLigneChart(ligne);

  document.getElementById(`quantite-${ligne}`).value = "";
  document.getElementById(`restant-${ligne}`).value = "";
  document.getElementById(`estimation-${ligne}`).textContent = "";
}

/* ==== HISTORIQUE ==== */
function showHistorique(ligne) {
  const histDiv = document.getElementById(`historique-${ligne}`);
  if (!histDiv) return;
  const hist = data.lignes[ligne];
  if (hist.length === 0) {
    histDiv.innerHTML = "<p>Aucun enregistrement.</p>";
    return;
  }

  histDiv.innerHTML = `
    <table>
      <tr><th>Date</th><th>Début</th><th>Fin</th><th>Quantité</th><th>Cadence</th></tr>
      ${hist.map(r => `
        <tr>
          <td>${r.date}</td>
          <td>${r.debut}</td>
          <td>${r.fin}</td>
          <td>${r.quantite}</td>
          <td>${r.cadence}</td>
        </tr>`).join("")}
    </table>
  `;
}

/* ==== CALCUL D'ESTIMATION AUTOMATIQUE ==== */
function estimerFin(ligne) {
  const restant = parseFloat(document.getElementById(`restant-${ligne}`).value);
  const hist = data.lignes[ligne];
  if (hist.length === 0 || isNaN(restant)) return;

  const moyenneCadence = Math.round(hist.reduce((s, x) => s + x.cadence, 0) / hist.length);
  if (!moyenneCadence || moyenneCadence === 0) return;

  const tempsRestant = restant / moyenneCadence * 60; // minutes
  const heures = Math.floor(tempsRestant / 60);
  const minutes = Math.round(tempsRestant % 60);

  document.getElementById(`estimation-${ligne}`).textContent = `⏱️ Temps restant estimé : ${heures}h ${minutes}min`;
}

/* ==== CALCUL DU TEMPS ==== */
function getMinutesDiff(start, end) {
  const [h1, m1] = start.split(":").map(Number);
  const [h2, m2] = end.split(":").map(Number);
  const t1 = h1 * 60 + m1;
  const t2 = h2 * 60 + m2;
  return t2 >= t1 ? t2 - t1 : (24 * 60 - t1 + t2);
}

/* ==== GRAPHIQUE PAR LIGNE ==== */
function drawLigneChart(ligne) {
  const canvas = document.getElementById(`chart-${ligne}`);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const hist = data.lignes[ligne];
  if (hist.length === 0) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }

  new Chart(ctx, {
    type: "line",
    data: {
      labels: hist.map(r => r.date.split(",")[1]),
      datasets: [{
        label: "Cadence (colis/h)",
        data: hist.map(r => r.cadence),
        borderColor: "#007acc",
        backgroundColor: "rgba(0,153,255,0.2)",
        tension: 0.3
      }]
    },
    options: { responsive: true, plugins: { legend: { display: false } } }
  });
}

/* ==== GRAPHIQUE ATELIER ==== */
function drawAtelierChart() {
  const ctx = document.getElementById("atelierChart").getContext("2d");
  const datasets = lignes.map(l => {
    const hist = data.lignes[l];
    return {
      label: l,
      data: hist.map(x => x.cadence),
      borderColor: randomColor(),
      fill: false,
      tension: 0.3
    };
  });

  new Chart(ctx, {
    type: "line",
    data: { labels: getGlobalLabels(), datasets },
    options: { responsive: true, plugins: { legend: { position: "bottom" } } }
  });
}

function getGlobalLabels() {
  const allDates = [];
  lignes.forEach(l => {
    data.lignes[l].forEach(x => {
      const d = x.date.split(",")[1];
      if (!allDates.includes(d)) allDates.push(d);
    });
  });
  return allDates;
}

function randomColor() {
  const r = Math.floor(Math.random() * 255);
  const g = Math.floor(Math.random() * 255);
  const b = Math.floor(Math.random() * 255);
  return `rgb(${r},${g},${b})`;
}

/* ==== GESTION DES ARRÊTS ==== */
function saveArret(e) {
  e.preventDefault();
  const ligne = document.getElementById("arretLigne").value;
  const type = document.getElementById("arretType").value;
  const duree = parseInt(document.getElementById("arretDuree").value);
  const commentaire = document.getElementById("arretCommentaire").value;

  if (!data.arrets) data.arrets = [];
  data.arrets.push({
    date: new Date().toLocaleString(),
    ligne, type, duree, commentaire
  });
  saveData();
  showArrets();
  e.target.reset();
}

function showArrets() {
  const div = document.getElementById("arretHistorique");
  if (!data.arrets || data.arrets.length === 0) {
    div.innerHTML = "<p>Aucun arrêt enregistré.</p>";
    return;
  }
  div.innerHTML = `
    <table>
      <tr><th>Date</th><th>Ligne</th><th>Type</th><th>Durée (min)</th><th>Commentaire</th></tr>
      ${data.arrets.map(a => `
        <tr>
          <td>${a.date}</td>
          <td>${a.ligne}</td>
          <td>${a.type}</td>
          <td>${a.duree}</td>
          <td>${a.commentaire}</td>
        </tr>`).join("")}
    </table>`;
}

/* ==== CONSIGNES ==== */
function saveConsigne(e) {
  e.preventDefault();
  const texte = document.getElementById("consigneTexte").value;
  if (!data.consignes) data.consignes = [];
  data.consignes.push({ texte, date: new Date().toLocaleString(), valide: false });
  saveData();
  showConsignes();
  e.target.reset();
}

function toggleConsigne(i) {
  data.consignes[i].valide = !data.consignes[i].valide;
  saveData();
  showConsignes();
}

function showConsignes() {
  const div = document.getElementById("consigneHistorique");
  if (!data.consignes || data.consignes.length === 0) {
    div.innerHTML = "<p>Aucune consigne enregistrée.</p>";
    return;
  }
  div.innerHTML = `
    <table>
      <tr><th>Date</th><th>Consigne</th><th>Validée</th></tr>
      ${data.consignes.map((c, i) => `
        <tr class="${c.valide ? "consigne-validee" : ""}">
          <td>${c.date}</td>
          <td>${c.texte}</td>
          <td><input type="checkbox" ${c.valide ? "checked" : ""} onchange="toggleConsigne(${i})"></td>
        </tr>`).join("")}
    </table>`;
}

/* ==== PERSONNEL ==== */
function savePersonnel(e) {
  e.preventDefault();
  const nom = document.getElementById("persoNom").value;
  const motif = document.getElementById("persoMotif").value;
  const commentaire = document.getElementById("persoCommentaire").value;

  if (!data.personnel) data.personnel = [];
  data.personnel.push({
    date: new Date().toLocaleString(),
    nom, motif, commentaire
  });
  saveData();
  showPersonnel();
  e.target.reset();
}

function showPersonnel() {
  const div = document.getElementById("personnelHistorique");
  if (!data.personnel || data.personnel.length === 0) {
    div.innerHTML = "<p>Aucune donnée personnel.</p>";
    return;
  }
  div.innerHTML = `
    <table>
      <tr><th>Date</th><th>Nom</th><th>Motif</th><th>Commentaire</th></tr>
      ${data.personnel.map(p => `
        <tr>
          <td>${p.date}</td><td>${p.nom}</td><td>${p.motif}</td><td>${p.commentaire}</td>
        </tr>`).join("")}
    </table>`;
}

/* ==== EXPORT GLOBAL ==== */
function exportGlobalExcel() {
  const rows = [];
  rows.push(["Section", "Date", "Ligne", "Détail 1", "Détail 2", "Détail 3", "Détail 4"]);

  lignes.forEach(l => {
    data.lignes[l].forEach(x => {
      rows.push(["Production", x.date, l, x.debut, x.fin, x.quantite, x.cadence]);
    });
  });

  if (data.arrets)
    data.arrets.forEach(a => rows.push(["Arrêts", a.date, a.ligne, a.type, `${a.duree}min`, a.commentaire]));

  if (data.consignes)
    data.consignes.forEach(c => rows.push(["Organisation", c.date, "", c.texte, c.valide ? "Validée" : ""]));

  if (data.personnel)
    data.personnel.forEach(p => rows.push(["Personnel", p.date, p.nom, p.motif, p.commentaire]));

  let csv = rows.map(r => r.join(";")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Atelier_PPNC_${new Date().toLocaleDateString().replace(/\//g, "-")}.csv`;
  a.click();
}

/* ==== CALCULATRICE ==== */
const calcButtons = ["7","8","9","/","4","5","6","*","1","2","3","-","0",".","=","+"];
const calcDiv = document.getElementById("calcButtons");
calcButtons.forEach(b => {
  const btn = document.createElement("button");
  btn.textContent = b;
  btn.onclick = () => calcPress(b);
  calcDiv.appendChild(btn);
});
let calcBuffer = "";
function calcPress(val) {
  const display = document.getElementById("calcDisplay");
  if (val === "=") {
    try { calcBuffer = eval(calcBuffer).toString(); }
    catch { calcBuffer = "Erreur"; }
  } else {
    calcBuffer += val;
  }
  display.value = calcBuffer;
}
function toggleCalculator() {
  document.getElementById("calculator").classList.toggle("hidden");
}

/* ==== CHARGEMENT INITIAL ==== */
showSection("atelier");
showArrets();
showConsignes();
showPersonnel();
