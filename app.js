// === INITIALISATION ===
document.addEventListener("DOMContentLoaded", () => {
  afficherDate();
  loadHistoriqueGlobal();
  initGraphique();
  autoExportOnShiftChange();
});

// === AFFICHAGE DATE, HEURE, SEMAINE, ÉQUIPE ===
function afficherDate() {
  const dateDisplay = document.getElementById("dateDisplay");
  setInterval(() => {
    const now = new Date();
    const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
    const semaine = Math.ceil(((now - new Date(now.getFullYear(), 0, 1)) / 86400000 + now.getDay() + 1) / 7);
    const quantieme = Math.ceil((now - new Date(now.getFullYear(), 0, 1)) / 86400000);
    const equipe = getEquipe(now.getHours());
    dateDisplay.textContent = `${now.toLocaleDateString("fr-FR", options)} — ${now.toLocaleTimeString("fr-FR", {hour: '2-digit', minute:'2-digit'})} — Sem. ${semaine} — Jour ${quantieme} — Équipe ${equipe}`;
  }, 1000);
}

function getEquipe(h) {
  if (h >= 5 && h < 13) return "M";
  if (h >= 13 && h < 21) return "AM";
  return "N";
}

// === NAVIGATION ENTRE LES PAGES ===
function openPage(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  window.scrollTo(0, 0);
}

// === CALCULATRICE ===
function toggleCalc() {
  const calc = document.getElementById("calcContainer");
  calc.classList.toggle("hidden");
}
function calcEval() {
  try {
    const input = document.getElementById("calcInput");
    input.value = eval(input.value);
  } catch {
    alert("Expression invalide");
  }
}

// === PERSISTANCE ET CALCULS PAR LIGNE ===
const lignes = ["Râpé", "T2", "RT", "T1", "Omori", "Sticks", "Emballage", "Dés", "Filets", "Prédécoupés"];
let data = JSON.parse(localStorage.getItem("atelierPPNC")) || { production: [], arrets: [], organisation: [], personnel: [] };

// Calcul du temps restant
function calculTempsRestant(cadence, qRestante) {
  if (!cadence || !qRestante) return "";
  const tempsHeures = qRestante / cadence;
  const minutes = Math.round(tempsHeures * 60);
  return `${minutes} min restantes`;
}

// Sauvegarde d’un enregistrement
function enregistrer(ligne, obj, type) {
  data[type].push({ ligne, ...obj, date: new Date().toLocaleString(), equipe: getEquipe(new Date().getHours()) });
  localStorage.setItem("atelierPPNC", JSON.stringify(data));
  alert("Enregistrement réussi !");
  loadHistoriqueGlobal();
}

// === HISTORIQUE GLOBAL (page Atelier) ===
function loadHistoriqueGlobal() {
  const div = document.getElementById("historiqueContent");
  if (!div) return;
  div.innerHTML = "";

  ["production", "arrets", "organisation", "personnel"].forEach(cat => {
    if (data[cat]?.length) {
      const bloc = document.createElement("div");
      bloc.innerHTML = `<h4>${cat.toUpperCase()}</h4>` + data[cat]
        .map(r => `<p><b>${r.ligne || ""}</b> — ${r.date} — ${r.equipe || ""}<br>${Object.entries(r)
        .filter(([k]) => !["ligne", "date", "equipe"].includes(k))
        .map(([k,v]) => `${k}: ${v}`).join(" | ")}</p>`).join("");
      div.appendChild(bloc);
    }
  });
}

// === GRAPHIQUE ATELIER ===
let chart;
function initGraphique() {
  const ctx = document.getElementById("atelierChart");
  if (!ctx) return;
  const couleurs = [
    "#1a68c7","#ff9800","#4caf50","#f44336","#9c27b0",
    "#009688","#3f51b5","#e91e63","#00bcd4","#8bc34a"
  ];

  const labels = Array.from({length: 10}, (_,i)=>`T${i+1}`);
  const datasets = lignes.map((nom, i) => ({
    label: nom,
    data: labels.map(()=>Math.round(Math.random()*100)),
    borderColor: couleurs[i],
    tension: 0.3,
    fill: false
  }));

  chart = new Chart(ctx, {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true,
      plugins: { legend: { position: "bottom" } },
      scales: { y: { beginAtZero: true, title: { display: true, text: "Cadence" } } }
    }
  });
}

// === EXPORT EXCEL ===
function exportExcel() {
  const wb = XLSX.utils.book_new();
  const all = [];

  ["production", "arrets", "organisation", "personnel"].forEach(cat => {
    if (data[cat].length) {
      all.push({cat, items: data[cat]});
    }
  });

  let rows = [];
  all.forEach(a => {
    rows.push([a.cat.toUpperCase()]);
    rows.push(Object.keys(a.items[0]));
    a.items.forEach(item => rows.push(Object.values(item)));
    rows.push([]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Atelier PPNC");

  const date = new Date();
  const fileName = `Atelier_PPNC_${date.getHours()}h${date.getMinutes()}_${date.getSeconds()}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

// === EXPORT AUTOMATIQUE À LA FIN D’ÉQUIPE ===
function autoExportOnShiftChange() {
  setInterval(() => {
    const now = new Date();
    const heure = now.getHours();
    const minute = now.getMinutes();
    if ((heure === 5 || heure === 13 || heure === 21) && minute === 0) {
      if (confirm("Fin d’équipe — exporter les données ?")) exportExcel();
    }
  }, 60000);
         }
