// === INITIALISATION ===
document.addEventListener("DOMContentLoaded", () => {
  updateDateTime();
  setInterval(updateDateTime, 1000);
  loadHistoriqueGlobal();
});

// === HORLOGE ===
function updateDateTime() {
  const now = new Date();
  const options = { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" };
  document.getElementById("currentDateTime").textContent = now.toLocaleDateString("fr-FR", options);
}

// === NAVIGATION ===
function showPage(pageId) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(pageId).classList.add("active");

  document.querySelectorAll(".sidebar-nav button").forEach(btn => btn.classList.remove("active"));
  const activeBtn = [...document.querySelectorAll(".sidebar-nav button")].find(b => b.getAttribute("onclick")?.includes(pageId));
  if (activeBtn) activeBtn.classList.add("active");
}

function showLigne(nom) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  const page = document.getElementById("pageLigne");
  page.classList.add("active");
  document.getElementById("nomLigne").textContent = `Ligne ${nom}`;
  page.dataset.ligne = nom;
  loadHistoriqueLigne(nom);
}

// === CALCULS CADENCE ET FIN ESTIMÉE ===
function majFinEstimee() {
  const qte = parseFloat(document.getElementById("qteLigne").value) || 0;
  const restant = parseFloat(document.getElementById("restantLigne").value) || 0;
  const debut = document.getElementById("debutLigne").value;
  const fin = document.getElementById("finLigne").value;
  let cadence = 0;

  if (debut && fin && qte > 0) {
    const [h1, m1] = debut.split(":").map(Number);
    const [h2, m2] = fin.split(":").map(Number);
    let duree = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (duree <= 0) duree += 24 * 60;
    cadence = (qte / duree) * 60;
  }

  document.getElementById("cadenceMoy").textContent = cadence.toFixed(1);

  if (restant > 0 && cadence > 0) {
    const tempsRestantH = restant / cadence;
    const heures = Math.floor(tempsRestantH);
    const minutes = Math.round((tempsRestantH - heures) * 60);
    document.getElementById("finEstimee").textContent = `${heures}h ${minutes}min restantes`;
  } else {
    document.getElementById("finEstimee").textContent = "-";
  }
}

// === ENREGISTREMENT LIGNE ===
function enregistrerLigne() {
  const nom = document.getElementById("nomLigne").textContent.replace("Ligne ", "");
  const data = {
    date: new Date().toLocaleString("fr-FR"),
    debut: document.getElementById("debutLigne").value,
    fin: document.getElementById("finLigne").value,
    qte: parseFloat(document.getElementById("qteLigne").value) || 0,
    restant: parseFloat(document.getElementById("restantLigne").value) || 0,
    cadence: parseFloat(document.getElementById("cadenceMoy").textContent) || 0,
  };

  if (!data.qte && !data.restant) return alert("Veuillez saisir au moins une quantité.");

  let historique = JSON.parse(localStorage.getItem(`ligne_${nom}`)) || [];
  historique.push(data);
  localStorage.setItem(`ligne_${nom}`, JSON.stringify(historique));

  // Nettoyage des champs après enregistrement
  document.getElementById("qteLigne").value = "";
  document.getElementById("restantLigne").value = "";
  document.getElementById("cadenceMoy").textContent = "0";
  document.getElementById("finEstimee").textContent = "-";

  loadHistoriqueLigne(nom);
  alert("Enregistrement effectué ✅");
}

// === HISTORIQUE LIGNE ===
function loadHistoriqueLigne(nom) {
  const div = document.getElementById("historiqueLigne");
  const data = JSON.parse(localStorage.getItem(`ligne_${nom}`)) || [];
  if (data.length === 0) {
    div.innerHTML = "<p>Aucun enregistrement.</p>";
    return;
  }

  let html = `<table><tr><th>Date</th><th>Début</th><th>Fin</th><th>Qté</th><th>Restant</th><th>Cadence</th></tr>`;
  data.forEach(d => {
    html += `<tr>
      <td>${d.date}</td><td>${d.debut}</td><td>${d.fin}</td>
      <td>${d.qte}</td><td>${d.restant}</td><td>${d.cadence.toFixed(1)}</td>
    </tr>`;
  });
  html += "</table>";
  div.innerHTML = html;
}

// === ARRÊTS ===
function enregistrerArret() {
  const ligne = document.getElementById("ligneArret").value;
  const type = document.getElementById("typeArret").value;
  const motif = document.getElementById("motifArret").value.trim();
  if (!ligne || !motif) return alert("Veuillez renseigner la ligne et le motif.");

  const data = {
    date: new Date().toLocaleString("fr-FR"),
    ligne, type, motif
  };

  let hist = JSON.parse(localStorage.getItem("arrets")) || [];
  hist.push(data);
  localStorage.setItem("arrets", JSON.stringify(hist));

  document.getElementById("motifArret").value = "";
  loadHistoriqueArrets();
}

function loadHistoriqueArrets() {
  const div1 = document.getElementById("historiqueArrets");
  const div2 = document.getElementById("historiqueArrets2");
  const data = JSON.parse(localStorage.getItem("arrets")) || [];

  let html = `<table><tr><th>Date</th><th>Ligne</th><th>Type</th><th>Motif</th></tr>`;
  data.forEach(a => {
    html += `<tr><td>${a.date}</td><td>${a.ligne}</td><td>${a.type}</td><td>${a.motif}</td></tr>`;
  });
  html += "</table>";

  div1.innerHTML = html;
  div2.innerHTML = html;
}

// === CONSIGNES ===
function enregistrerConsigne() {
  const texte = document.getElementById("nouvelleConsigne").value.trim();
  const realisee = document.getElementById("consigneRealisee").checked;
  if (!texte) return alert("Veuillez saisir une consigne.");

  let hist = JSON.parse(localStorage.getItem("consignes")) || [];
  hist.push({ date: new Date().toLocaleString("fr-FR"), texte, realisee });
  localStorage.setItem("consignes", JSON.stringify(hist));

  document.getElementById("nouvelleConsigne").value = "";
  document.getElementById("consigneRealisee").checked = false;
  loadConsignes();
}

function loadConsignes() {
  const div = document.getElementById("historiqueConsignes");
  const data = JSON.parse(localStorage.getItem("consignes")) || [];
  let html = `<table><tr><th>Date</th><th>Consigne</th><th>Réalisée</th></tr>`;
  data.forEach(c => {
    html += `<tr><td>${c.date}</td><td>${c.texte}</td><td>${c.realisee ? "✅" : "❌"}</td></tr>`;
  });
  html += "</table>";
  div.innerHTML = html;
}

// === PERSONNEL ===
function enregistrerPersonnel() {
  const nom = document.getElementById("nomPersonnel").value.trim();
  const poste = document.getElementById("postePersonnel").value.trim();
  if (!nom) return alert("Veuillez renseigner le nom.");

  const data = { date: new Date().toLocaleString("fr-FR"), nom, poste };
  let hist = JSON.parse(localStorage.getItem("personnel")) || [];
  hist.push(data);
  localStorage.setItem("personnel", JSON.stringify(hist));

  document.getElementById("nomPersonnel").value = "";
  document.getElementById("postePersonnel").value = "";
  loadPersonnel();
}

function loadPersonnel() {
  const div = document.getElementById("historiquePersonnel");
  const data = JSON.parse(localStorage.getItem("personnel")) || [];
  let html = `<table><tr><th>Date</th><th>Nom</th><th>Poste</th></tr>`;
  data.forEach(p => {
    html += `<tr><td>${p.date}</td><td>${p.nom}</td><td>${p.poste}</td></tr>`;
  });
  html += "</table>";
  div.innerHTML = html;
}

// === EXPORT EXCEL ===
function exportExcel() {
  const wb = XLSX.utils.book_new();
  const data = {
    Production: collectAll("ligne_"),
    Arrêts: JSON.parse(localStorage.getItem("arrets")) || [],
    Organisation: JSON.parse(localStorage.getItem("consignes")) || [],
    Personnel: JSON.parse(localStorage.getItem("personnel")) || []
  };

  for (const [nom, arr] of Object.entries(data)) {
    const ws = XLSX.utils.json_to_sheet(arr);
    XLSX.utils.book_append_sheet(wb, ws, nom);
  }

  const nomFichier = `Synthese_PPNC_${new Date().toLocaleDateString("fr-FR").replace(/\//g, "-")}.xlsx`;
  XLSX.writeFile(wb, nomFichier);
}

function collectAll(prefix) {
  const res = [];
  for (let key in localStorage) {
    if (key.startsWith(prefix)) {
      const arr = JSON.parse(localStorage.getItem(key)) || [];
      arr.forEach(a => res.push({ ligne: key.replace(prefix, ""), ...a }));
    }
  }
  return res;
}

// === CALCULATRICE ===
function openCalculator() {
  const calc = document.getElementById("calculator");
  if (calc) calc.remove();
  else createCalculator();
}

function createCalculator() {
  const div = document.createElement("div");
  div.id = "calculator";
  div.innerHTML = `
    <input type="text" id="calcDisplay" readonly />
    <div class="calc-buttons">
      ${[7,8,9,"/"].map(b=>`<button onclick="calcPress('${b}')">${b}</button>`).join("")}
      ${[4,5,6,"*"].map(b=>`<button onclick="calcPress('${b}')">${b}</button>`).join("")}
      ${[1,2,3,"-"].map(b=>`<button onclick="calcPress('${b}')">${b}</button>`).join("")}
      ${[0,".","=","+"].map(b=>`<button onclick="calcPress('${b}')">${b}</button>`).join("")}
      <button onclick="closeCalc()">Fermer</button>
    </div>`;
  document.body.appendChild(div);
}

function calcPress(val) {
  const display = document.getElementById("calcDisplay");
  if (val === "=") {
    try { display.value = eval(display.value); } catch { display.value = "Erreur"; }
  } else display.value += val;
}

function closeCalc() {
  const calc = document.getElementById("calculator");
  if (calc) calc.remove();
}

// === HISTORIQUE GLOBAL (Atelier) ===
function loadHistoriqueGlobal() {
  loadHistoriqueArrets();
  loadConsignes();
  loadPersonnel();
}
