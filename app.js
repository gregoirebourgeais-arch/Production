// === GESTION TEMPS ET EN-TÊTE ===
function updateDateTime() {
  const now = new Date();

  const jours = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
  const jourNom = jours[now.getDay()];
  const jour = String(now.getDate()).padStart(2, "0");
  const moisNom = now.toLocaleString("fr-FR", { month: "long" });
  const annee = now.getFullYear();
  const heure = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");

  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const diff = (now - startOfYear + (startOfYear.getTimezoneOffset() - now.getTimezoneOffset()) * 60000);
  const dayOfYear = Math.floor(diff / 86400000) + 1;
  const weekNumber = Math.ceil(dayOfYear / 7);

  let equipe = "M";
  if (heure >= 13 && heure < 21) equipe = "AM";
  else if (heure >= 21 || heure < 5) equipe = "N";

  const topText = `${jourNom} ${jour} ${moisNom} ${annee} — ${heure}:${minute} | Jour ${dayOfYear} | S${weekNumber} | Équipe ${equipe}`;
  document.getElementById("topDateTime").textContent = topText;
}
setInterval(updateDateTime, 1000);
updateDateTime();


// === NAVIGATION ENTRE PAGES ===
function openPage(id) {
  document.querySelectorAll(".page").forEach(p => p.style.display = "none");
  document.getElementById(id).style.display = "block";
  window.scrollTo(0, 0);
}

function openLigne(nom) {
  document.querySelectorAll(".page").forEach(p => p.style.display = "none");
  document.getElementById("pageLigne").style.display = "block";
  document.getElementById("titreLigne").textContent = `Ligne ${nom}`;
  document.getElementById("pageLigne").dataset.ligne = nom;
  loadHistoriqueLigne(nom);
  remplirHeures();
}


// === GESTION HEURES DEBUT/FIN ===
function remplirHeures() {
  const selectDebut = document.getElementById("heureDebut");
  const selectFin = document.getElementById("heureFin");
  selectDebut.innerHTML = "";
  selectFin.innerHTML = "";
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 5) {
      const val = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      const opt1 = document.createElement("option");
      opt1.value = val; opt1.textContent = val;
      const opt2 = opt1.cloneNode(true);
      selectDebut.appendChild(opt1);
      selectFin.appendChild(opt2);
    }
  }
}


// === ENREGISTREMENT PRODUCTION ===
function enregistrerLigne() {
  const ligne = document.getElementById("pageLigne").dataset.ligne;
  const qteProduite = Number(document.getElementById("quantiteProduite").value);
  const qteRestante = Number(document.getElementById("quantiteRestante").value);
  const cadenceManuelle = Number(document.getElementById("cadenceManuelle").value);
  const hDebut = document.getElementById("heureDebut").value;
  const hFin = document.getElementById("heureFin").value;

  if (!hDebut || !hFin || isNaN(qteProduite) || isNaN(qteRestante)) {
    alert("Merci de remplir tous les champs correctement.");
    return;
  }

  const heureDebut = convertirHeure(hDebut);
  const heureFin = convertirHeure(hFin);
  const dureeH = (heureFin - heureDebut) / 3600000;
  const cadence = cadenceManuelle || (dureeH > 0 ? qteProduite / dureeH : 0);

  const etaMinutes = qteRestante / (cadence > 0 ? cadence / 60 : 1);
  const dateFinEstimee = new Date(Date.now() + etaMinutes * 60000);
  const hFinEst = dateFinEstimee.toTimeString().slice(0, 5);
  document.getElementById("eta").textContent = hFinEst;

  const dateStr = new Date().toLocaleString("fr-FR");
  const ligneData = JSON.parse(localStorage.getItem(ligne) || "[]");
  ligneData.unshift({
    date: dateStr,
    ligne,
    qteProduite,
    qteRestante,
    cadence: cadence.toFixed(1),
    hDebut,
    hFin,
    finEstimee: hFinEst
  });
  localStorage.setItem(ligne, JSON.stringify(ligneData));

  afficherHistorique(ligne);

  // Effacer les champs
  document.getElementById("quantiteProduite").value = "";
  document.getElementById("quantiteRestante").value = "";
  document.getElementById("cadenceManuelle").value = "";
}

function convertirHeure(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const now = new Date();
  now.setHours(h, m, 0, 0);
  return now.getTime();
}


// === HISTORIQUE ===
function afficherHistorique(ligne) {
  const histDiv = document.getElementById("historiqueLigne");
  const data = JSON.parse(localStorage.getItem(ligne) || "[]");
  histDiv.innerHTML = data.map(d => `
    <div class="historique-item">
      <strong>${d.date}</strong> | ${d.ligne} : ${d.qteProduite} prod, ${d.qteRestante} rest, ${d.cadence} c/h
    </div>
  `).join("");
  majGlobal();
}

function loadHistoriqueLigne(ligne) {
  afficherHistorique(ligne);
}

function majGlobal() {
  const allKeys = ["RAPE","T2","RT","OMORI","T1","STICKS","EMBALLAGE","DES","FILETS","PREDECOUPES"];
  let global = [];
  allKeys.forEach(k => {
    const data = JSON.parse(localStorage.getItem(k) || "[]");
    global = global.concat(data.map(d => ({ ligne: k, cadence: d.cadence })));
  });
  const hist = document.getElementById("historiqueGlobal");
  hist.innerHTML = global.slice(0,10).map(e => `
    <div>${e.ligne} — ${e.cadence} c/h</div>
  `).join("");
  afficherCourbes(global);
}


// === GRAPHIQUE ===
let chart;
function afficherCourbes(globalData) {
  const ctx = document.getElementById("atelierChart").getContext("2d");
  if (chart) chart.destroy();

  const lignes = [...new Set(globalData.map(d => d.ligne))];
  const moyennes = lignes.map(l => {
    const vals = globalData.filter(d => d.ligne === l).map(d => Number(d.cadence));
    return vals.length ? (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1) : 0;
  });

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: lignes,
      datasets: [{
        label: "Cadence moyenne (colis/h)",
        data: moyennes,
        fill: false,
        borderColor: "#007bff",
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      scales: { y: { beginAtZero: true } }
    }
  });
}


// === CALCULATRICE ===
let calcBuffer = "";
document.getElementById("calcToggle").addEventListener("click", () => {
  document.getElementById("calculator").classList.toggle("hidden");
});
function appendCalc(val){ calcBuffer += val; document.getElementById("calcDisplay").value = calcBuffer; }
function calculate(){ try{ calcBuffer = eval(calcBuffer).toString(); document.getElementById("calcDisplay").value = calcBuffer; }catch{ calcBuffer=""; document.getElementById("calcDisplay").value="Erreur"; } }
function clearCalc(){ calcBuffer=""; document.getElementById("calcDisplay").value=""; }
function closeCalc(){ document.getElementById("calculator").classList.add("hidden"); }
