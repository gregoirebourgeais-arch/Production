// === GESTION DES PAGES ===
function openPage(pageId) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(pageId).classList.add("active");
  if (pageId === "atelier") updateAtelier();
  saveLastPage(pageId);
}

function saveLastPage(pageId) {
  localStorage.setItem("lastPage", pageId);
}

window.addEventListener("load", () => {
  const last = localStorage.getItem("lastPage");
  if (last) openPage(last);
  else openPage("atelier");
  loadAllData();
});

// === VARIABLES ===
let data = {
  lignes: {},
  arrets: [],
  consignes: [],
  personnel: []
};

// === FONCTIONS LIGNES ===
function openLigne(nomLigne) {
  const container = document.getElementById("ligneFormContainer");
  container.innerHTML = `
    <h3>${nomLigne}</h3>
    <form id="form-${nomLigne}">
      <label>Heure début :</label>
      <input type="time" id="debut-${nomLigne}" step="60" />
      <label>Heure fin :</label>
      <input type="time" id="fin-${nomLigne}" step="60" />

      <label>Quantité produite :</label>
      <input type="number" id="qte-${nomLigne}" placeholder="Quantité" oninput="saveTemp('${nomLigne}')" />

      <label>Quantité restante :</label>
      <input type="number" id="rest-${nomLigne}" placeholder="Quantité restante" oninput="estimerFin('${nomLigne}')" />

      <p id="cadence-${nomLigne}" class="info"></p>
      <p id="estimation-${nomLigne}" class="info"></p>

      <label>Cadence manuelle (colis/h) :</label>
      <input type="number" id="cadMan-${nomLigne}" placeholder="Modifier cadence manuelle" />

      <button type="button" onclick="enregistrerLigne('${nomLigne}')">Enregistrer</button>
      <button type="button" onclick="supprimerDernier('${nomLigne}')">Annuler dernier</button>
      <button type="button" onclick="resetLigne('${nomLigne}')">Remise à zéro</button>

      <canvas id="graph-${nomLigne}" height="150"></canvas>
    </form>
  `;
  if (!data.lignes[nomLigne]) data.lignes[nomLigne] = [];
  chargerTemp(nomLigne);
  afficherGraphiqueLigne(nomLigne);
  container.scrollIntoView({ behavior: "smooth" });
}

function saveTemp(ligne) {
  const q = document.getElementById(`qte-${ligne}`).value;
  const r = document.getElementById(`rest-${ligne}`).value;
  localStorage.setItem(`temp_${ligne}`, JSON.stringify({ q, r }));
}

function chargerTemp(ligne) {
  const temp = JSON.parse(localStorage.getItem(`temp_${ligne}`));
  if (temp) {
    if (temp.q) document.getElementById(`qte-${ligne}`).value = temp.q;
    if (temp.r) document.getElementById(`rest-${ligne}`).value = temp.r;
  }
}

// === ESTIMATION + CADENCE ===
function estimerFin(ligne) {
  const rest = Number(document.getElementById(`rest-${ligne}`).value);
  const cadMan = Number(document.getElementById(`cadMan-${ligne}`).value);
  const records = data.lignes[ligne] || [];
  const cadAuto = records.length
    ? records.reduce((a, b) => a + b.cadence, 0) / records.length
    : 0;
  const cadence = cadMan || cadAuto;
  const elEst = document.getElementById(`estimation-${ligne}`);

  if (rest && cadence > 0) {
    const heures = rest / cadence;
    const minutes = Math.round(heures * 60);
    elEst.textContent = `⏱ Temps restant estimé : ${minutes} min (à ${cadence.toFixed(1)} colis/h)`;
  } else {
    elEst.textContent = "";
  }
}

function enregistrerLigne(ligne) {
  const debut = document.getElementById(`debut-${ligne}`).value;
  const fin = document.getElementById(`fin-${ligne}`).value;
  const qte = Number(document.getElementById(`qte-${ligne}`).value);
  const cadMan = Number(document.getElementById(`cadMan-${ligne}`).value);

  if (!debut || !fin || !qte) return alert("Heure début, fin et quantité requises.");

  const t1 = new Date(`1970-01-01T${debut}:00`);
  const t2 = new Date(`1970-01-01T${fin}:00`);
  let diffH = (t2 - t1) / 3600000;
  if (diffH <= 0) diffH += 24;

  const cadence = cadMan || (qte / diffH);
  const rest = Number(document.getElementById(`rest-${ligne}`).value) || 0;
  const rec = { debut, fin, qte, cadence, rest, date: new Date().toLocaleString() };
  data.lignes[ligne].push(rec);
  saveData();

  document.getElementById(`qte-${ligne}`).value = "";
  document.getElementById(`rest-${ligne}`).value = "";
  localStorage.removeItem(`temp_${ligne}`);
  afficherGraphiqueLigne(ligne);
  alert("✅ Enregistrement effectué !");
}

function supprimerDernier(ligne) {
  if (data.lignes[ligne].length > 0) {
    data.lignes[ligne].pop();
    saveData();
    afficherGraphiqueLigne(ligne);
  }
}

function resetLigne(ligne) {
  if (confirm("Remettre à zéro les données de cette ligne ?")) {
    data.lignes[ligne] = [];
    saveData();
    afficherGraphiqueLigne(ligne);
  }
}

// === GRAPHIQUES ===
function afficherGraphiqueLigne(ligne) {
  const ctx = document.getElementById(`graph-${ligne}`);
  if (!ctx) return;
  const recs = data.lignes[ligne] || [];
  const labels = recs.map(r => r.date.split(",")[0]);
  const vals = recs.map(r => r.cadence);
  new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: `Cadence ${ligne}`,
        data: vals,
        borderColor: "#0082c8",
        tension: 0.3,
        fill: false
      }]
    },
    options: { responsive: true, scales: { y: { beginAtZero: true } } }
  });
}

function updateAtelier() {
  const ctx = document.getElementById("graphiqueAtelier");
  const lignes = Object.keys(data.lignes);
  const datasets = lignes.map(l => ({
    label: l,
    data: data.lignes[l].map(r => r.cadence),
    borderColor: getColor(l),
    fill: false,
    tension: 0.3
  }));
  const labels = data.lignes[lignes[0]]?.map(r => r.date.split(",")[0]) || [];
  new Chart(ctx, {
    type: "line",
    data: { labels, datasets },
    options: { responsive: true, plugins: { legend: { position: "bottom" } } }
  });
}

function getColor(l) {
  const couleurs = ["#0082c8","#00bfa5","#f44336","#ff9800","#9c27b0","#3f51b5","#009688","#795548","#607d8b"];
  const index = Math.abs(l.charCodeAt(0) + l.length) % couleurs.length;
  return couleurs[index];
}

// === ARRÊTS ===
function enregistrerArret() {
  const ligne = document.getElementById("arretLigne").value;
  const type = document.getElementById("arretType").value;
  const duree = document.getElementById("arretDuree").value;
  const comment = document.getElementById("arretComment").value;
  if (!ligne || !duree) return alert("Ligne et durée requises");
  data.arrets.push({ ligne, type, duree, comment });
  saveData();
  updateArrets();
  document.getElementById("formArrets").reset();
}

function updateArrets() {
  const tbody = document.querySelector("#tableArrets tbody");
  tbody.innerHTML = data.arrets
    .map(a => `<tr><td>${a.ligne}</td><td>${a.type}</td><td>${a.duree}</td><td>${a.comment}</td></tr>`)
    .join("");
}

// === ORGANISATION ===
function enregistrerConsigne() {
  const texte = document.getElementById("consigneTexte").value.trim();
  if (!texte) return;
  data.consignes.push({ texte, valide: false });
  saveData();
  updateConsignes();
  document.getElementById("consigneTexte").value = "";
}

function toggleConsigne(i) {
  data.consignes[i].valide = !data.consignes[i].valide;
  saveData();
  updateConsignes();
}

function updateConsignes() {
  const tbody = document.querySelector("#tableConsignes tbody");
  tbody.innerHTML = data.consignes.map((c, i) => `
    <tr>
      <td>${c.texte}</td>
      <td>${c.valide ? "✅" : "❌"}</td>
      <td><button onclick="toggleConsigne(${i})">${c.valide ? "Annuler" : "Valider"}</button></td>
    </tr>`).join("");
}

// === PERSONNEL ===
function enregistrerPersonnel() {
  const nom = document.getElementById("persNom").value;
  const motif = document.getElementById("persMotif").value;
  const comment = document.getElementById("persComment").value;
  if (!nom) return alert("Nom requis");
  data.personnel.push({ nom, motif, comment });
  saveData();
  updatePersonnel();
  document.getElementById("formPersonnel").reset();
}

function updatePersonnel() {
  const tbody = document.querySelector("#tablePersonnel tbody");
  tbody.innerHTML = data.personnel.map(p =>
    `<tr><td>${p.nom}</td><td>${p.motif}</td><td>${p.comment}</td></tr>`
  ).join("");
}

// === STOCKAGE LOCAL ===
function saveData() {
  localStorage.setItem("atelier_data", JSON.stringify(data));
}
function loadAllData() {
  const d = JSON.parse(localStorage.getItem("atelier_data"));
  if (d) data = d;
  updateArrets(); updateConsignes(); updatePersonnel();
}

// === EXPORT EXCEL ===
function exportExcel() {
  let contenu = [["=== Production ==="]];
  for (let l in data.lignes) {
    contenu.push([l,"Début","Fin","Quantité","Cadence","Restant"]);
    data.lignes[l].forEach(r =>
      contenu.push(["",r.debut,r.fin,r.qte,r.cadence.toFixed(1),r.rest])
    );
  }
  contenu.push([""],["=== Arrêts ==="]);
  data.arrets.forEach(a => contenu.push([a.ligne,a.type,a.duree,a.comment]));
  contenu.push([""],["=== Consignes ==="]);
  data.consignes.forEach(c => contenu.push([c.texte,c.valide?"Validée":"Non"]));
  contenu.push([""],["=== Personnel ==="]);
  data.personnel.forEach(p => contenu.push([p.nom,p.motif,p.comment]));

  const ws = XLSX.utils.aoa_to_sheet(contenu);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Rapport Atelier");
  XLSX.writeFile(wb, `Atelier_PPNC_${new Date().toLocaleString().replace(/[/:]/g,"-")}.xlsx`);
}

// === CALCULATRICE FLOTTANTE ===
let calcExpression = "";
function toggleCalc() { document.querySelector(".calculator").classList.toggle("active"); }
function press(val) {
  calcExpression += val;
  document.getElementById("calc-display").innerText = calcExpression;
}
function calculate() {
  try {
    calcExpression = eval(calcExpression).toString();
    document.getElementById("calc-display").innerText = calcExpression;
  } catch {
    calcExpression = ""; document.getElementById("calc-display").innerText = "Erreur";
  }
}
function clearCalc() {
  calcExpression = "";
  document.getElementById("calc-display").innerText = "";
}

// === Déplacement Calculatrice ===
const calc = document.querySelector(".calculator");
let offsetX, offsetY, isDown = false;
calc.addEventListener("mousedown", e => {
  isDown = true;
  offsetX = calc.offsetLeft - e.clientX;
  offsetY = calc.offsetTop - e.clientY;
});
document.addEventListener("mouseup", () => isDown = false);
document.addEventListener("mousemove", e => {
  if (isDown) {
    calc.style.left = e.clientX + offsetX + "px";
    calc.style.top = e.clientY + offsetY + "px";
  }
});
