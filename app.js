// -------------------------
// NAVIGATION ENTRE PAGES
// -------------------------
function openPage(pageId) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(pageId).classList.add("active");
  if (pageId === "atelier") majGraphiqueAtelier();
}

// -------------------------
// STOCKAGE LOCAL
// -------------------------
const STORAGE_KEY = "atelierPPNC";
let data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
  production: {},
  arrets: [],
  consignes: [],
  personnel: []
};

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// -------------------------
// PAGE PRODUCTION
// -------------------------
function openLigne(nom) {
  const container = document.getElementById("ligneFormContainer");
  container.innerHTML = `
    <h3>${nom}</h3>
    <form id="form${nom}">
      <label>Heure de début :</label>
      <input type="time" id="debut${nom}" required>
      
      <label>Heure de fin :</label>
      <input type="time" id="fin${nom}" required>

      <label>Quantité réalisée :</label>
      <input type="number" id="qte${nom}" placeholder="Colis réalisés">

      <label>Quantité restante :</label>
      <input type="number" id="reste${nom}" placeholder="Colis restants" oninput="calculerFin('${nom}')">

      <p id="finEstimee${nom}" class="info"></p>

      <label>Cadence (colis/h) :</label>
      <input type="number" id="cadence${nom}" readonly>

      <button type="button" onclick="enregistrerLigne('${nom}')">Enregistrer</button>
      <button type="button" onclick="supprimerDernier('${nom}')">Annuler dernier enregistrement</button>
      <h4>Historique ${nom}</h4>
      <table id="table${nom}">
        <thead><tr><th>Début</th><th>Fin</th><th>Qté</th><th>Cadence</th></tr></thead>
        <tbody></tbody>
      </table>
    </form>
  `;
  majTableau(nom);
}

// -------------------------
// CALCULS AUTOMATIQUES
// -------------------------
function calculerCadence(nom) {
  const debut = document.getElementById(`debut${nom}`).value;
  const fin = document.getElementById(`fin${nom}`).value;
  const qte = parseFloat(document.getElementById(`qte${nom}`).value);
  if (!debut || !fin || !qte) return 0;

  const t1 = new Date(`1970-01-01T${debut}:00`);
  const t2 = new Date(`1970-01-01T${fin}:00`);
  let diffH = (t2 - t1) / 3600000;
  if (diffH <= 0) diffH += 24;

  const cadence = qte / diffH;
  document.getElementById(`cadence${nom}`).value = cadence.toFixed(2);
  return cadence;
}

function calculerFin(nom) {
  const reste = parseFloat(document.getElementById(`reste${nom}`).value);
  const cadence = parseFloat(document.getElementById(`cadence${nom}`).value);
  const finEl = document.getElementById(`finEstimee${nom}`);
  if (reste && cadence) {
    const heures = reste / cadence;
    const heuresTotales = Math.floor(heures);
    const minutes = Math.round((heures - heuresTotales) * 60);
    finEl.textContent = `⏱ Temps restant estimé : ${heuresTotales} h ${minutes} min`;
  } else {
    finEl.textContent = "";
  }
}

// -------------------------
// ENREGISTREMENT DES LIGNES
// -------------------------
function enregistrerLigne(nom) {
  const debut = document.getElementById(`debut${nom}`).value;
  const fin = document.getElementById(`fin${nom}`).value;
  const qte = parseFloat(document.getElementById(`qte${nom}`).value);
  const cadence = calculerCadence(nom);
  const maintenant = new Date().toLocaleString("fr-FR");

  if (!debut || !fin || !qte) {
    alert("Veuillez remplir tous les champs !");
    return;
  }

  if (!data.production[nom]) data.production[nom] = [];
  data.production[nom].push({ debut, fin, qte, cadence, date: maintenant });
  saveData();
  majTableau(nom);
  document.getElementById(`form${nom}`).reset();
}

function majTableau(nom) {
  const tbody = document.querySelector(`#table${nom} tbody`);
  if (!tbody) return;
  tbody.innerHTML = "";
  (data.production[nom] || []).forEach(r => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${r.debut}</td><td>${r.fin}</td><td>${r.qte}</td><td>${r.cadence.toFixed(2)}</td>`;
    tbody.appendChild(tr);
  });
}

function supprimerDernier(nom) {
  if (data.production[nom] && data.production[nom].length > 0) {
    data.production[nom].pop();
    saveData();
    majTableau(nom);
  }
}

// -------------------------
// PAGE ARRETS
// -------------------------
function enregistrerArret() {
  const ligne = document.getElementById("ligneArret").value;
  const type = document.getElementById("typeArret").value;
  const duree = parseFloat(document.getElementById("dureeArret").value);
  const comment = document.getElementById("commentArret").value;

  if (!ligne || !duree) return alert("Veuillez remplir tous les champs !");
  data.arrets.push({ ligne, type, duree, comment });
  saveData();
  majArrets();
  document.getElementById("formArret").reset();
}

function majArrets() {
  const tbody = document.querySelector("#tableArrets tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  data.arrets.forEach(a => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${a.ligne}</td><td>${a.type}</td><td>${a.duree}</td><td>${a.comment}</td>`;
    tbody.appendChild(tr);
  });
  majTableArretsAtelier();
}

function majTableArretsAtelier() {
  const tbody = document.querySelector("#tableArretsAtelier tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  data.arrets.forEach(a => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${a.ligne}</td><td>${a.type}</td><td>${a.duree}</td>`;
    tbody.appendChild(tr);
  });
}

// -------------------------
// PAGE ORGANISATION
// -------------------------
function ajouterConsigne() {
  const texte = document.getElementById("texteConsigne").value;
  if (!texte) return;
  data.consignes.push({ texte, valide: false });
  saveData();
  majConsignes();
  document.getElementById("formConsigne").reset();
}

function majConsignes() {
  const tbody = document.querySelector("#tableConsignes tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  data.consignes.forEach((c, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${c.texte}</td>
      <td><input type="checkbox" ${c.valide ? "checked" : ""} onchange="validerConsigne(${i})"></td>
    `;
    tbody.appendChild(tr);
  });
}

function validerConsigne(i) {
  data.consignes[i].valide = !data.consignes[i].valide;
  saveData();
}

// -------------------------
// PAGE PERSONNEL
// -------------------------
function enregistrerPersonnel() {
  const nom = document.getElementById("nomPersonnel").value;
  const motif = document.getElementById("motifPersonnel").value;
  const comment = document.getElementById("commentPersonnel").value;

  if (!nom) return alert("Nom requis !");
  data.personnel.push({ nom, motif, comment });
  saveData();
  majPersonnel();
  document.getElementById("formPersonnel").reset();
}

function majPersonnel() {
  const tbody = document.querySelector("#tablePersonnel tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  data.personnel.forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${p.nom}</td><td>${p.motif}</td><td>${p.comment}</td>`;
    tbody.appendChild(tr);
  });
}

// -------------------------
// GRAPHIQUE ATELIER
// -------------------------
let atelierChart;

function majGraphiqueAtelier() {
  const ctx = document.getElementById("atelierChart");
  if (!ctx) return;
  const labels = [];
  const datasets = [];

  Object.keys(data.production).forEach(ligne => {
    const records = data.production[ligne];
    if (records && records.length > 0) {
      const cadences = records.map(r => r.cadence);
      const heures = records.map((r, i) => i + 1);
      datasets.push({
        label: ligne,
        data: cadences,
        borderColor: getRandomColor(),
        fill: false,
        tension: 0.2
      });
      labels.push(...heures);
    }
  });

  if (atelierChart) atelierChart.destroy();
  atelierChart = new Chart(ctx, {
    type: "line",
    data: { labels: [...new Set(labels)], datasets },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "bottom" },
        title: { display: true, text: "Évolution des cadences" }
      }
    }
  });
}

function getRandomColor() {
  return `hsl(${Math.random() * 360}, 70%, 50%)`;
}

// -------------------------
// EXPORT EXCEL
// -------------------------
function exportExcel() {
  let content = "=== Atelier PPNC ===\n\n";
  Object.keys(data.production).forEach(ligne => {
    content += `\nLigne ${ligne}\nDébut\tFin\tQté\tCadence\n`;
    (data.production[ligne] || []).forEach(r => {
      content += `${r.debut}\t${r.fin}\t${r.qte}\t${r.cadence.toFixed(2)}\n`;
    });
  });
  content += "\n== Arrêts ==\nLigne\tType\tDurée\tCommentaire\n";
  data.arrets.forEach(a => (content += `${a.ligne}\t${a.type}\t${a.duree}\t${a.comment}\n`));
  content += "\n== Consignes ==\nConsigne\tValidée\n";
  data.consignes.forEach(c => (content += `${c.texte}\t${c.valide ? "Oui" : "Non"}\n`));
  content += "\n== Personnel ==\nNom\tMotif\tCommentaire\n";
  data.personnel.forEach(p => (content += `${p.nom}\t${p.motif}\t${p.comment}\n`));

  const blob = new Blob([content], { type: "application/vnd.ms-excel" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `Atelier_PPNC_${new Date().toLocaleString("fr-FR").replace(/[/: ]/g, "_")}.xls`;
  a.click();
}

// -------------------------
// CALCULATRICE FLOTTANTE
// -------------------------
const calc = document.createElement("div");
calc.id = "calculator";
calc.innerHTML = `
  <div class="calc-display" id="calcDisplay"></div>
  <div>
    ${[7,8,9,"/",4,5,6,"*",1,2,3,"-",0,".","=","+"].map(v => 
      `<button class='calc-button' onclick='pressCalc("${v}")'>${v}</button>`).join("")}
    <button class='calc-button' onclick='clearCalc()'>C</button>
  </div>`;
document.body.appendChild(calc);

let calcVal = "";
function pressCalc(v) {
  if (v === "=") {
    try { calcVal = eval(calcVal).toString(); }
    catch { calcVal = "Err"; }
  } else {
    calcVal += v;
  }
  document.getElementById("calcDisplay").textContent = calcVal;
}
function clearCalc() { calcVal = ""; document.getElementById("calcDisplay").textContent = ""; }

document.addEventListener("keydown", e => {
  if (e.key === "c" && e.ctrlKey) {
    calc.style.display = calc.style.display === "flex" ? "none" : "flex";
  }
});

// Initialisation
window.onload = () => {
  majArrets();
  majConsignes();
  majPersonnel();
};
