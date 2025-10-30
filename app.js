// -------- Date / Heure / Semaine / Quantième --------
function updateDateTime() {
  const now = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const weekNumber = Math.ceil((((now - new Date(now.getFullYear(), 0, 1)) / 86400000) + now.getDay() + 1) / 7);
  const dayOfYear = Math.ceil((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
  document.getElementById("datetime").textContent = 
    `${now.toLocaleDateString('fr-FR', options)} | ${now.toLocaleTimeString()} | S${weekNumber} | Jour ${dayOfYear}`;
}
setInterval(updateDateTime, 1000);
updateDateTime();

// -------- Navigation --------
function showSection(id) {
  document.querySelectorAll("main section").forEach(sec => sec.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  if (id === "atelier") afficherAtelier();
}

// -------- Variables globales --------
let dataProduction = JSON.parse(localStorage.getItem("dataProduction")) || [];
let dataArrets = JSON.parse(localStorage.getItem("dataArrets")) || [];
let dataOrganisation = JSON.parse(localStorage.getItem("dataOrganisation")) || [];
let dataPersonnel = JSON.parse(localStorage.getItem("dataPersonnel")) || [];

// -------- Calcul Temps Restant --------
document.getElementById("quantiteRestante").addEventListener("input", calculTempsRestant);
document.getElementById("cadence").addEventListener("input", calculTempsRestant);

function calculTempsRestant() {
  const qte = parseFloat(document.getElementById("quantiteRestante").value);
  const cad = parseFloat(document.getElementById("cadence").value);
  if (!isNaN(qte) && !isNaN(cad) && cad > 0) {
    const tempsHeures = qte / cad;
    const heures = Math.floor(tempsHeures);
    const minutes = Math.round((tempsHeures - heures) * 60);
    document.getElementById("tempsRestant").textContent = `⏱ Temps restant estimé : ${heures}h ${minutes}min`;
  } else {
    document.getElementById("tempsRestant").textContent = "";
  }
}

// -------- Enregistrements --------
function enregistrerProduction() {
  const ligne = document.getElementById("ligne").value;
  const qte = document.getElementById("quantiteRestante").value;
  const cad = document.getElementById("cadence").value;
  const date = new Date().toLocaleString();

  if (!qte || !cad) return alert("Remplir tous les champs !");
  
  dataProduction.push({ ligne, qte, cad, date });
  localStorage.setItem("dataProduction", JSON.stringify(dataProduction));

  afficherHistorique("production", dataProduction, "historiqueProduction");
  viderChamps(["quantiteRestante", "cadence"]);
  alert("Production enregistrée !");
}

function enregistrerArret() {
  const ligne = document.getElementById("ligneArret").value;
  const type = document.getElementById("typeArret").value;
  const duree = document.getElementById("dureeArret").value;
  const commentaire = document.getElementById("commentaireArret").value;
  const date = new Date().toLocaleString();

  if (!duree) return alert("Durée obligatoire !");
  dataArrets.push({ ligne, type, duree, commentaire, date });
  localStorage.setItem("dataArrets", JSON.stringify(dataArrets));

  afficherHistorique("arrets", dataArrets, "historiqueArrets");
  viderChamps(["dureeArret", "commentaireArret"]);
}

function enregistrerConsigne() {
  const texte = document.getElementById("consigneTexte").value;
  const date = new Date().toLocaleString();
  if (!texte) return;
  dataOrganisation.push({ texte, valide: false, date });
  localStorage.setItem("dataOrganisation", JSON.stringify(dataOrganisation));
  afficherHistorique("organisation", dataOrganisation, "historiqueOrganisation");
  viderChamps(["consigneTexte"]);
}

function enregistrerPersonnel() {
  const nom = document.getElementById("nomPersonnel").value;
  const motif = document.getElementById("motifPersonnel").value;
  const com = document.getElementById("commentairePersonnel").value;
  const date = new Date().toLocaleString();
  if (!nom || !motif) return;
  dataPersonnel.push({ nom, motif, com, date });
  localStorage.setItem("dataPersonnel", JSON.stringify(dataPersonnel));
  afficherHistorique("personnel", dataPersonnel, "historiquePersonnel");
  viderChamps(["nomPersonnel", "motifPersonnel", "commentairePersonnel"]);
}

// -------- Affichage Historique --------
function afficherHistorique(type, data, id) {
  const container = document.getElementById(id);
  container.innerHTML = "";
  data.forEach((item, index) => {
    const div = document.createElement("div");
    div.className = "record";
    if (type === "production")
      div.innerHTML = `<b>${item.ligne}</b> - ${item.qte} unités à ${item.cad} colis/h <i>${item.date}</i>`;
    if (type === "arrets")
      div.innerHTML = `<b>${item.ligne}</b> - ${item.type} : ${item.duree} min (${item.commentaire}) <i>${item.date}</i>`;
    if (type === "organisation")
      div.innerHTML = `${item.texte} <i>${item.date}</i> 
        <button onclick="validerConsigne(${index})">✅</button>`;
    if (type === "personnel")
      div.innerHTML = `${item.nom} - ${item.motif} (${item.com}) <i>${item.date}</i>`;
    container.appendChild(div);
  });
}

function validerConsigne(i) {
  dataOrganisation[i].valide = true;
  localStorage.setItem("dataOrganisation", JSON.stringify(dataOrganisation));
  afficherHistorique("organisation", dataOrganisation, "historiqueOrganisation");
}

// -------- Effacement champs --------
function viderChamps(ids) {
  ids.forEach(id => document.getElementById(id).value = "");
}

// -------- Affichage Atelier --------
function afficherAtelier() {
  afficherHistorique("production", dataProduction, "historiqueAtelier");
  afficherGraphique();
}

// -------- Graphique --------
function afficherGraphique() {
  const ctx = document.getElementById("productionChart").getContext("2d");
  const lignes = [...new Set(dataProduction.map(d => d.ligne))];
  const couleurs = [
    "#007bff","#ff6384","#36a2eb","#ffce56","#4bc0c0",
    "#9966ff","#ff9f40","#66bb6a","#8e24aa","#d32f2f"
  ];

  const datasets = lignes.map((ligne, i) => {
    const points = dataProduction.filter(d => d.ligne === ligne).map((d, j) => ({ x: j + 1, y: d.cad }));
    return { label: ligne, data: points, borderColor: couleurs[i], fill: false, tension: 0.3 };
  });

  new Chart(ctx, {
    type: "line",
    data: { datasets },
    options: {
      responsive: true,
      plugins: { legend: { position: "bottom" } },
      scales: {
        x: { title: { display: true, text: "Enregistrements" } },
        y: { title: { display: true, text: "Cadence (colis/h)" } }
      }
    }
  });
}

// -------- Export Excel --------
function exportExcel() {
  const wb = XLSX.utils.book_new();

  const sh1 = XLSX.utils.json_to_sheet(dataProduction);
  const sh2 = XLSX.utils.json_to_sheet(dataArrets);
  const sh3 = XLSX.utils.json_to_sheet(dataOrganisation);
  const sh4 = XLSX.utils.json_to_sheet(dataPersonnel);

  XLSX.utils.book_append_sheet(wb, sh1, "Production");
  XLSX.utils.book_append_sheet(wb, sh2, "Arrets");
  XLSX.utils.book_append_sheet(wb, sh3, "Organisation");
  XLSX.utils.book_append_sheet(wb, sh4, "Personnel");

  const nomFichier = `Atelier_PPNC_${new Date().toLocaleString().replace(/[/:]/g, "-")}.xlsx`;
  XLSX.writeFile(wb, nomFichier);
}

// -------- Initialisation Historique --------
window.onload = () => {
  afficherHistorique("production", dataProduction, "historiqueProduction");
  afficherHistorique("arrets", dataArrets, "historiqueArrets");
  afficherHistorique("organisation", dataOrganisation, "historiqueOrganisation");
  afficherHistorique("personnel", dataPersonnel, "historiquePersonnel");
};
