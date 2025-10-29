// === INITIALISATION ===
const pages = document.querySelectorAll(".page");
let currentLigne = null;

// === AFFICHAGE DATE, HEURE, SEMAINE ET ÉQUIPE ===
function updateDateTime() {
  const now = new Date();
  const jours = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  const mois = ["jan", "fév", "mar", "avr", "mai", "jun", "jul", "aoû", "sep", "oct", "nov", "déc"];
  const semaine = Math.ceil((now.getDate() + 6 - now.getDay()) / 7);
  const quantieme = now.getDate();

  const heure = now.getHours();
  let equipe = "";
  if (heure >= 5 && heure < 13) equipe = "M";
  else if (heure >= 13 && heure < 21) equipe = "AM";
  else equipe = "N";

  const texte = `${jours[now.getDay()]} ${quantieme} ${mois[now.getMonth()]} ${now.getFullYear()} - ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} | S${semaine} | Équipe ${equipe}`;
  document.getElementById("dateTimeDisplay").textContent = texte;
}
setInterval(updateDateTime, 1000);
updateDateTime();

// === NAVIGATION ENTRE LES PAGES ===
function showPage(pageId) {
  pages.forEach(p => p.classList.remove("active"));
  document.getElementById(pageId).classList.add("active");
  if (pageId === "atelier") refreshAtelier();
}

// === SELECTION D’UNE LIGNE ===
function selectLigne(ligne) {
  currentLigne = ligne;
  document.getElementById("ligneTitle").textContent = `Ligne : ${ligne}`;
  showPage("production");
  loadLigneData(ligne);
}

// === PERSISTANCE DES DONNÉES PAR LIGNE ===
function saveLigneData(ligne, data) {
  localStorage.setItem(`production_${ligne}`, JSON.stringify(data));
}

function loadLigneData(ligne) {
  const data = JSON.parse(localStorage.getItem(`production_${ligne}`));
  if (data) {
    document.getElementById("heureDebut").value = data.heureDebut || "";
    document.getElementById("heureFin").value = data.heureFin || "";
    document.getElementById("quantiteProduite").value = data.quantiteProduite || "";
    document.getElementById("quantiteRestante").value = data.quantiteRestante || "";
    document.getElementById("cadenceManuelle").value = data.cadenceManuelle || "";
    document.getElementById("finEstimee").textContent = data.finEstimee || "--";
  }
}

// === CALCUL TEMPS RESTANT ===
function calculerTempsRestant() {
  const qRest = parseFloat(document.getElementById("quantiteRestante").value);
  const cadence = parseFloat(document.getElementById("cadenceManuelle").value);
  if (isNaN(qRest) || isNaN(cadence) || cadence <= 0) return "--";
  const heuresRestantes = qRest / cadence;
  const minutesRestantes = Math.round(heuresRestantes * 60);
  return `${minutesRestantes} min restantes`;
}

// Mise à jour instantanée du temps estimé
["quantiteRestante", "cadenceManuelle"].forEach(id => {
  document.getElementById(id).addEventListener("input", () => {
    document.getElementById("finEstimee").textContent = calculerTempsRestant();
  });
});

// === FORMULAIRE PRODUCTION ===
document.getElementById("productionForm").addEventListener("submit", e => {
  e.preventDefault();
  if (!currentLigne) return alert("Sélectionnez une ligne !");
  const record = {
    heureDebut: document.getElementById("heureDebut").value,
    heureFin: document.getElementById("heureFin").value,
    quantiteProduite: document.getElementById("quantiteProduite").value,
    quantiteRestante: document.getElementById("quantiteRestante").value,
    cadenceManuelle: document.getElementById("cadenceManuelle").value,
    finEstimee: document.getElementById("finEstimee").textContent,
    equipe: document.getElementById("dateTimeDisplay").textContent.split("Équipe ")[1]
  };

  const hist = JSON.parse(localStorage.getItem(`historique_${currentLigne}`)) || [];
  hist.push(record);
  localStorage.setItem(`historique_${currentLigne}`, JSON.stringify(hist));
  saveLigneData(currentLigne, record);
  renderHistorique(currentLigne);
  document.getElementById("productionForm").reset();
  document.getElementById("finEstimee").textContent = "--";
});

// === AFFICHAGE HISTORIQUE PRODUCTION ===
function renderHistorique(ligne) {
  const container = document.getElementById("historiqueProduction");
  container.innerHTML = "";
  const hist = JSON.parse(localStorage.getItem(`historique_${ligne}`)) || [];
  hist.forEach((r, i) => {
    const div = document.createElement("div");
    div.innerHTML = `<strong>${r.heureDebut} - ${r.heureFin}</strong> | ${r.quantiteProduite} colis | ${r.finEstimee} | ${r.equipe}`;
    const del = document.createElement("button");
    del.textContent = "🗑️";
    del.onclick = () => {
      hist.splice(i, 1);
      localStorage.setItem(`historique_${ligne}`, JSON.stringify(hist));
      renderHistorique(ligne);
    };
    div.appendChild(del);
    container.appendChild(div);
  });
}

// === FORMULAIRE ARRETS ===
document.getElementById("arretForm").addEventListener("submit", e => {
  e.preventDefault();
  const record = {
    ligne: document.getElementById("ligneArret").value,
    type: document.getElementById("typeArret").value,
    duree: document.getElementById("dureeArret").value,
    commentaire: document.getElementById("commentaireArret").value
  };
  const hist = JSON.parse(localStorage.getItem("arrets")) || [];
  hist.push(record);
  localStorage.setItem("arrets", JSON.stringify(hist));
  renderArrets();
  e.target.reset();
});
function renderArrets() {
  const hist = JSON.parse(localStorage.getItem("arrets")) || [];
  const div = document.getElementById("historiqueArrets");
  div.innerHTML = hist.map(r => `<div><b>${r.ligne}</b> | ${r.type} | ${r.duree} min | ${r.commentaire}</div>`).join("");
}
renderArrets();

// === FORMULAIRE ORGANISATION ===
document.getElementById("consigneForm").addEventListener("submit", e => {
  e.preventDefault();
  const consigne = {
    texte: document.getElementById("texteConsigne").value,
    valide: document.getElementById("valideConsigne").checked
  };
  const hist = JSON.parse(localStorage.getItem("consignes")) || [];
  hist.push(consigne);
  localStorage.setItem("consignes", JSON.stringify(hist));
  renderConsignes();
  e.target.reset();
});
function renderConsignes() {
  const hist = JSON.parse(localStorage.getItem("consignes")) || [];
  const div = document.getElementById("historiqueConsignes");
  div.innerHTML = hist.map(r =>
    `<div>${r.texte} ${r.valide ? "✅" : "⏳"}</div>`).join("");
}
renderConsignes();

// === FORMULAIRE PERSONNEL ===
document.getElementById("personnelForm").addEventListener("submit", e => {
  e.preventDefault();
  const p = {
    nom: document.getElementById("nomPersonnel").value,
    motif: document.getElementById("motifPersonnel").value,
    commentaire: document.getElementById("commentairePersonnel").value
  };
  const hist = JSON.parse(localStorage.getItem("personnel")) || [];
  hist.push(p);
  localStorage.setItem("personnel", JSON.stringify(hist));
  renderPersonnel();
  e.target.reset();
});
function renderPersonnel() {
  const hist = JSON.parse(localStorage.getItem("personnel")) || [];
  const div = document.getElementById("historiquePersonnel");
  div.innerHTML = hist.map(p =>
    `<div><b>${p.nom}</b> - ${p.motif} - ${p.commentaire}</div>`).join("");
}
renderPersonnel();

// === PAGE ATELIER : HISTORIQUES + GRAPHIQUE ===
function refreshAtelier() {
  const div = document.getElementById("historiqueAtelier");
  div.innerHTML = "<h3>Historique global</h3>";

  const allLines = ["Râpé","T2","RT","OMORI T1","Sticks","Emballage","Dés","Filets","Prédécoupés"];
  allLines.forEach(ligne => {
    const hist = JSON.parse(localStorage.getItem(`historique_${ligne}`)) || [];
    if (hist.length) {
      div.innerHTML += `<h4>${ligne}</h4>` +
        hist.map(r => `<div>${r.heureDebut}-${r.heureFin} | ${r.quantiteProduite} colis | ${r.finEstimee}</div>`).join("");
    }
  });

  const ctx = document.getElementById("atelierChart").getContext("2d");
  const datasets = allLines.map(ligne => {
    const hist = JSON.parse(localStorage.getItem(`historique_${ligne}`)) || [];
    return {
      label: ligne,
      data: hist.map((r, i) => r.quantiteProduite || 0),
      borderWidth: 2,
      borderColor: `hsl(${Math.random() * 360}, 70%, 45%)`,
      fill: false
    };
  });

  new Chart(ctx, {
    type: "line",
    data: {
      labels: ["1","2","3","4","5","6"],
      datasets
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "bottom" }
      },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

// === EXPORT EXCEL MULTI-ONGLETS ===
function exportAllToExcel() {
  const wb = XLSX.utils.book_new();
  const addSheet = (key, title) => {
    const data = JSON.parse(localStorage.getItem(key)) || [];
    if (data.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), title);
  };
  const allLines = ["Râpé","T2","RT","OMORI T1","Sticks","Emballage","Dés","Filets","Prédécoupés"];
  allLines.forEach(l => addSheet(`historique_${l}`, l));
  addSheet("arrets", "Arrêts");
  addSheet("consignes", "Organisation");
  addSheet("personnel", "Personnel");
  XLSX.writeFile(wb, "Atelier_PPNC.xlsx");
}

// === CALCULATRICE ===
const calcBtn = document.getElementById("calcToggle");
const calcPanel = document.getElementById("calcPanel");
const calcDisplay = document.getElementById("calcDisplay");
const calcButtons = document.getElementById("calcButtons");

calcBtn.addEventListener("click", () => {
  calcPanel.classList.toggle("visible");
});

const buttons = [
  "7","8","9","/","4","5","6","*",
  "1","2","3","-","0",".","=","+"
];
buttons.forEach(b => {
  const btn = document.createElement("button");
  btn.textContent = b;
  btn.onclick = () => {
    if (b === "=") calcDisplay.value = eval(calcDisplay.value || 0);
    else calcDisplay.value += b;
  };
  calcButtons.appendChild(btn);
});

// === REMISE A ZERO ===
function resetForm() {
  document.getElementById("productionForm").reset();
  document.getElementById("finEstimee").textContent = "--";
                                                  }
