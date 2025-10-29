// ===== Atelier PPNC - Application complète =====

// --- VARIABLES GLOBALES ---
const pages = document.querySelectorAll(".page");
const dateTimeDisplay = document.getElementById("dateTimeDisplay");
const lignes = ["Râpé", "T2", "RT", "OMORI T1", "Sticks", "Emballage", "Dés", "Filets", "Prédécoupés"];
let historiqueProduction = JSON.parse(localStorage.getItem("historiqueProduction")) || [];
let historiqueArrets = JSON.parse(localStorage.getItem("historiqueArrets")) || [];
let historiqueConsignes = JSON.parse(localStorage.getItem("historiqueConsignes")) || [];
let historiquePersonnel = JSON.parse(localStorage.getItem("historiquePersonnel")) || [];

// --- PAGE NAVIGATION ---
function showPage(id) {
  pages.forEach(p => p.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  if (id === "atelier") majGraphique();
}

// --- DATE / HEURE / ÉQUIPE ---
function updateDateTime() {
  const now = new Date();
  const semaine = getWeekNumber(now);
  const jourAnnee = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
  const heures = now.getHours();
  let equipe = "N";
  if (heures >= 5 && heures < 13) equipe = "M";
  else if (heures >= 13 && heures < 21) equipe = "S";
  else equipe = "N";
  const dateStr = now.toLocaleString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
  dateTimeDisplay.innerHTML = `${dateStr} | Jour ${jourAnnee} - Sem.${semaine} | Équipe ${equipe}`;
}
setInterval(updateDateTime, 1000);
updateDateTime();

function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

// --- CALCUL FIN ESTIMÉE ---
function calculerFinEstimee() {
  const debut = document.getElementById("heureDebut").value;
  const fin = document.getElementById("heureFin").value;
  const qteProduite = parseFloat(document.getElementById("quantiteProduite").value) || 0;
  const qteRestante = parseFloat(document.getElementById("quantiteRestante").value) || 0;
  const cadenceManuelle = parseFloat(document.getElementById("cadenceManuelle").value) || 0;
  const sortie = document.getElementById("finEstimee");

  if (!debut || (!qteRestante && !cadenceManuelle)) {
    sortie.textContent = "--";
    return;
  }

  const [h, m] = debut.split(":").map(Number);
  let dateDebut = new Date();
  dateDebut.setHours(h, m, 0, 0);

  let cadence = cadenceManuelle;
  if (!cadence) {
    const [hf, mf] = fin ? fin.split(":").map(Number) : [h + 1, m];
    let diffHeures = ((hf * 60 + mf) - (h * 60 + m)) / 60;
    if (diffHeures <= 0) diffHeures += 24;
    cadence = qteProduite / diffHeures;
  }

  if (cadence > 0 && qteRestante > 0) {
    const tempsRestantHeures = qteRestante / cadence;
    const finEstimee = new Date(dateDebut.getTime() + tempsRestantHeures * 3600000);
    sortie.textContent = finEstimee.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) +
      ` (reste ${tempsRestantHeures.toFixed(1)} h)`;
  } else sortie.textContent = "--";
}

// --- ENREGISTREMENT PRODUCTION ---
document.getElementById("productionForm").addEventListener("submit", e => {
  e.preventDefault();
  const data = {
    ligne: document.getElementById("ligneTitle").textContent,
    debut: document.getElementById("heureDebut").value,
    fin: document.getElementById("heureFin").value,
    quantiteProduite: document.getElementById("quantiteProduite").value,
    quantiteRestante: document.getElementById("quantiteRestante").value,
    cadenceManuelle: document.getElementById("cadenceManuelle").value,
    finEstimee: document.getElementById("finEstimee").textContent,
    date: new Date().toLocaleString("fr-FR")
  };
  historiqueProduction.push(data);
  localStorage.setItem("historiqueProduction", JSON.stringify(historiqueProduction));
  afficherHistoriqueProduction();
  e.target.reset();
  document.getElementById("finEstimee").textContent = "--";
});

// --- AFFICHAGE HISTORIQUE PRODUCTION ---
function afficherHistoriqueProduction() {
  const div = document.getElementById("historiqueProduction");
  div.innerHTML = "<h3>Historique Production</h3>";
  historiqueProduction.slice(-10).reverse().forEach(item => {
    div.innerHTML += `<div><b>${item.ligne}</b> : ${item.quantiteProduite} colis – ${item.finEstimee}<br><i>${item.date}</i></div>`;
  });
}
afficherHistoriqueProduction();

// --- RESET FORMULAIRE ---
function resetForm() {
  document.getElementById("productionForm").reset();
  document.getElementById("finEstimee").textContent = "--";
}

// --- GRAPHIQUE ATELIER ---
let chartAtelier;
function majGraphique() {
  const ctx = document.getElementById("atelierChart").getContext("2d");
  const donnees = {};
  lignes.forEach(l => donnees[l] = []);
  historiqueProduction.forEach(item => {
    if (!donnees[item.ligne]) donnees[item.ligne] = [];
    donnees[item.ligne].push({
      x: new Date(item.date),
      y: parseFloat(item.quantiteProduite) || 0
    });
  });

  if (chartAtelier) chartAtelier.destroy();
  chartAtelier = new Chart(ctx, {
    type: "line",
    data: {
      datasets: lignes.map((l, i) => ({
        label: l,
        data: donnees[l],
        borderColor: `hsl(${i * 40}, 70%, 45%)`,
        tension: 0.3,
        borderWidth: 2,
        fill: false
      }))
    },
    options: {
      scales: {
        x: { type: "time", time: { unit: "hour" }, title: { display: true, text: "Date / Heure" } },
        y: { beginAtZero: true, title: { display: true, text: "Quantités (colis)" } }
      },
      plugins: { legend: { position: "bottom" } }
    }
  });
}
// ===== SUITE APP.JS =====

// --- CALCULATRICE FLOTTANTE ---
const calcBtn = document.getElementById("calcToggle");
const calcPanel = document.getElementById("calcPanel");
const calcDisplay = document.getElementById("calcDisplay");
const calcButtons = document.getElementById("calcButtons");
let calcOpen = false;

const calcLayout = [
  "7", "8", "9", "/",
  "4", "5", "6", "*",
  "1", "2", "3", "-",
  "0", ".", "=", "+"
];

calcButtons.innerHTML = calcLayout
  .map(b => `<button class="btn-calc" data-val="${b}">${b}</button>`)
  .join("") + `<button class="btn-calc" data-val="C">C</button>`;

calcButtons.addEventListener("click", e => {
  if (!e.target.matches(".btn-calc")) return;
  const val = e.target.dataset.val;
  if (val === "=") {
    try { calcDisplay.value = eval(calcDisplay.value); } catch { calcDisplay.value = "Erreur"; }
  } else if (val === "C") {
    calcDisplay.value = "";
  } else {
    calcDisplay.value += val;
  }
});

calcBtn.addEventListener("click", () => {
  calcOpen = !calcOpen;
  calcPanel.classList.toggle("hidden", !calcOpen);
});

// --- HISTORIQUE ARRÊTS ---
document.getElementById("arretForm").addEventListener("submit", e => {
  e.preventDefault();
  const data = {
    ligne: e.target.ligneArret.value,
    type: e.target.typeArret.value,
    duree: e.target.dureeArret.value,
    commentaire: e.target.commentaireArret.value,
    date: new Date().toLocaleString("fr-FR")
  };
  historiqueArrets.push(data);
  localStorage.setItem("historiqueArrets", JSON.stringify(historiqueArrets));
  afficherHistoriqueArrets();
  e.target.reset();
});

function afficherHistoriqueArrets() {
  const div = document.getElementById("historiqueArrets");
  div.innerHTML = "<h3>Historique Arrêts</h3>";
  historiqueArrets.slice(-10).reverse().forEach(a => {
    div.innerHTML += `<div><b>${a.ligne}</b> (${a.type}) - ${a.duree} min<br><i>${a.commentaire}</i><br>${a.date}</div>`;
  });
}
afficherHistoriqueArrets();

// --- HISTORIQUE CONSIGNES ---
document.getElementById("consigneForm").addEventListener("submit", e => {
  e.preventDefault();
  const data = {
    texte: e.target.texteConsigne.value,
    valide: document.getElementById("valideConsigne").checked,
    date: new Date().toLocaleString("fr-FR")
  };
  historiqueConsignes.push(data);
  localStorage.setItem("historiqueConsignes", JSON.stringify(historiqueConsignes));
  afficherHistoriqueConsignes();
  e.target.reset();
});

function afficherHistoriqueConsignes() {
  const div = document.getElementById("historiqueConsignes");
  div.innerHTML = "<h3>Historique Organisation</h3>";
  historiqueConsignes.slice(-10).reverse().forEach(c => {
    div.innerHTML += `<div>${c.valide ? "✅" : "⏳"} ${c.texte}<br><i>${c.date}</i></div>`;
  });
}
afficherHistoriqueConsignes();

// --- HISTORIQUE PERSONNEL ---
document.getElementById("personnelForm").addEventListener("submit", e => {
  e.preventDefault();
  const data = {
    nom: e.target.nomPersonnel.value,
    motif: e.target.motifPersonnel.value,
    commentaire: e.target.commentairePersonnel.value,
    date: new Date().toLocaleString("fr-FR")
  };
  historiquePersonnel.push(data);
  localStorage.setItem("historiquePersonnel", JSON.stringify(historiquePersonnel));
  afficherHistoriquePersonnel();
  e.target.reset();
});

function afficherHistoriquePersonnel() {
  const div = document.getElementById("historiquePersonnel");
  div.innerHTML = "<h3>Historique Personnel</h3>";
  historiquePersonnel.slice(-10).reverse().forEach(p => {
    div.innerHTML += `<div><b>${p.nom}</b> (${p.motif})<br><i>${p.commentaire}</i><br>${p.date}</div>`;
  });
}
afficherHistoriquePersonnel();

// --- EXPORT EXCEL GLOBAL ---
function exportAllToExcel() {
  const wb = XLSX.utils.book_new();

  const sheetProd = XLSX.utils.json_to_sheet(historiqueProduction);
  const sheetArrets = XLSX.utils.json_to_sheet(historiqueArrets);
  const sheetOrg = XLSX.utils.json_to_sheet(historiqueConsignes);
  const sheetPers = XLSX.utils.json_to_sheet(historiquePersonnel);

  XLSX.utils.book_append_sheet(wb, sheetProd, "Production");
  XLSX.utils.book_append_sheet(wb, sheetArrets, "Arrêts");
  XLSX.utils.book_append_sheet(wb, sheetOrg, "Organisation");
  XLSX.utils.book_append_sheet(wb, sheetPers, "Personnel");

  XLSX.writeFile(wb, "Synthese_Atelier_PPNC.xlsx");
}

// --- PERSISTENCE COMPLÈTE (autosave toutes les 30s) ---
setInterval(() => {
  localStorage.setItem("historiqueProduction", JSON.stringify(historiqueProduction));
  localStorage.setItem("historiqueArrets", JSON.stringify(historiqueArrets));
  localStorage.setItem("historiqueConsignes", JSON.stringify(historiqueConsignes));
  localStorage.setItem("historiquePersonnel", JSON.stringify(historiquePersonnel));
}, 30000);

// --- AUTO-AFFICHAGE HISTORIQUES SUR PAGE ATELIER ---
function afficherHistoriqueAtelier() {
  const div = document.getElementById("historiqueAtelier");
  div.innerHTML = `
    <h3>Historique global</h3>
    <h4>Production</h4>${historiqueProduction.slice(-3).map(i => `<div>${i.ligne}: ${i.quantiteProduite} colis</div>`).join("")}
    <h4>Arrêts</h4>${historiqueArrets.slice(-3).map(i => `<div>${i.ligne}: ${i.type} ${i.duree}min</div>`).join("")}
    <h4>Consignes</h4>${historiqueConsignes.slice(-3).map(i => `<div>${i.valide ? "✅" : "⏳"} ${i.texte}</div>`).join("")}
    <h4>Personnel</h4>${historiquePersonnel.slice(-3).map(i => `<div>${i.nom}: ${i.motif}</div>`).join("")}
  `;
}
setInterval(afficherHistoriqueAtelier, 5000);
afficherHistoriqueAtelier();
