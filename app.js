// === Horloge ===
function updateDateTime() {
  const now = new Date();
  const options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  };
  document.getElementById("currentDateTime").textContent =
    now.toLocaleDateString("fr-FR", options);
}
setInterval(updateDateTime, 1000);
updateDateTime();

// === Pages ===
function showPage(pageId) {
  document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
  document.getElementById(pageId).classList.add("active");
  document.querySelectorAll(".nav-btn").forEach((btn) => btn.classList.remove("active"));
  document
    .querySelector(`.nav-btn[onclick="showPage('${pageId}')"]`)
    ?.classList.add("active");
}

// === Données locales ===
const lignes = [
  "Râpé",
  "T2",
  "RT",
  "Omori",
  "T1",
  "Sticks",
  "Emballage",
  "Dés",
  "Filets",
  "Prédécoupés",
];

// === Création dynamique des blocs lignes ===
const lignesContainer = document.getElementById("lignesContainer");
if (lignesContainer) {
  lignes.forEach((ligne) => {
    const bloc = document.createElement("div");
    bloc.className = "ligne-bloc";
    bloc.innerHTML = `
      <h3>${ligne}</h3>
      <label>Heure début :</label>
      <input type="time" id="debut-${ligne}">
      <label>Heure fin :</label>
      <input type="time" id="fin-${ligne}">
      <label>Quantité produite :</label>
      <input type="number" id="qte-${ligne}" placeholder="Quantité...">
      <label>Quantité restante :</label>
      <input type="number" id="restant-${ligne}" placeholder="Restant...">
      <label>Cadence manuelle (colis/h) :</label>
      <input type="number" id="cadenceMan-${ligne}" placeholder="Saisir cadence...">
      <p>⏱ Cadence moyenne : <span id="cadMoy-${ligne}">0</span> colis/h</p>
      <p>⏰ Fin estimée : <span id="finEstimee-${ligne}">-</span></p>
      <button onclick="enregistrerLigne('${ligne}')">Enregistrer</button>
    `;
    lignesContainer.appendChild(bloc);
  });
}

// === Persistance et calculs ===
let historiqueProduction = JSON.parse(localStorage.getItem("historiqueProduction")) || [];
let historiqueArrets = JSON.parse(localStorage.getItem("historiqueArrets")) || [];
let historiqueConsignes = JSON.parse(localStorage.getItem("historiqueConsignes")) || [];
let historiquePersonnel = JSON.parse(localStorage.getItem("historiquePersonnel")) || [];

function enregistrerLigne(ligne) {
  const debut = document.getElementById(`debut-${ligne}`).value;
  const fin = document.getElementById(`fin-${ligne}`).value;
  const qte = parseFloat(document.getElementById(`qte-${ligne}`).value);
  const restant = parseFloat(document.getElementById(`restant-${ligne}`).value);
  const cadenceMan = parseFloat(document.getElementById(`cadenceMan-${ligne}`).value);

  if (!debut || !fin || isNaN(qte) || isNaN(restant)) {
    alert("Veuillez remplir toutes les informations nécessaires.");
    return;
  }

  const [dh, dm] = debut.split(":").map(Number);
  const [fh, fm] = fin.split(":").map(Number);
  let duree = (fh * 60 + fm) - (dh * 60 + dm);
  if (duree <= 0) duree += 24 * 60;
  const heures = duree / 60;

  const cadenceCalc = qte / heures;
  document.getElementById(`cadMoy-${ligne}`).textContent = cadenceCalc.toFixed(2);

  let finEstimee = "-";
  if (!isNaN(restant) && (cadenceMan || cadenceCalc)) {
    const cadRef = cadenceMan || cadenceCalc;
    const minutesRestantes = (restant / cadRef) * 60;
    const finDate = new Date();
    finDate.setMinutes(finDate.getMinutes() + minutesRestantes);
    finEstimee = finDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    document.getElementById(`finEstimee-${ligne}`).textContent = finEstimee;
  }

  const entry = {
    date: new Date().toLocaleString("fr-FR"),
    ligne,
    debut,
    fin,
    qte,
    restant,
    cadence: cadenceCalc.toFixed(2),
    finEstimee,
  };
  historiqueProduction.push(entry);
  localStorage.setItem("historiqueProduction", JSON.stringify(historiqueProduction));
  afficherHistoriqueProduction();

  document.getElementById(`qte-${ligne}`).value = "";
  document.getElementById(`restant-${ligne}`).value = "";
  document.getElementById(`cadenceMan-${ligne}`).value = "";
}

function afficherHistoriqueProduction() {
  const cont = document.getElementById("historiqueProduction");
  if (!cont) return;
  cont.innerHTML = historiqueProduction
    .map(
      (h) =>
        `<div>[${h.date}] ${h.ligne} → ${h.debut}-${h.fin} | Q=${h.qte} | Rest=${h.restant} | Cad=${h.cadence} | Fin ~ ${h.finEstimee}</div>`
    )
    .join("");
}
afficherHistoriqueProduction();

// === Gestion des arrêts ===
function enregistrerArret() {
  const ligne = document.getElementById("ligneArret").value;
  const type = document.getElementById("typeArret").value;
  const motif = document.getElementById("motifArret").value;
  if (!ligne || !motif) {
    alert("Veuillez sélectionner une ligne et indiquer le motif.");
    return;
  }

  const entry = {
    date: new Date().toLocaleString("fr-FR"),
    ligne,
    type,
    motif,
  };
  historiqueArrets.push(entry);
  localStorage.setItem("historiqueArrets", JSON.stringify(historiqueArrets));
  afficherHistoriqueArrets();

  document.getElementById("motifArret").value = "";
}

function afficherHistoriqueArrets() {
  const cont = document.getElementById("historiqueArrets");
  if (!cont) return;
  cont.innerHTML = historiqueArrets
    .map((a) => `<div>[${a.date}] ${a.ligne} (${a.type}) — ${a.motif}</div>`)
    .join("");
}
afficherHistoriqueArrets();

// === Consignes ===
function enregistrerConsigne() {
  const texte = document.getElementById("nouvelleConsigne").value.trim();
  const realisee = document.getElementById("consigneRealisee").checked;
  if (!texte) return alert("Entrez une consigne.");
  const entry = {
    date: new Date().toLocaleString("fr-FR"),
    texte,
    realisee,
  };
  historiqueConsignes.push(entry);
  localStorage.setItem("historiqueConsignes", JSON.stringify(historiqueConsignes));
  afficherHistoriqueConsignes();
  document.getElementById("nouvelleConsigne").value = "";
  document.getElementById("consigneRealisee").checked = false;
}

function afficherHistoriqueConsignes() {
  const cont = document.getElementById("historiqueConsignes");
  if (!cont) return;
  cont.innerHTML = historiqueConsignes
    .map(
      (c) =>
        `<div>[${c.date}] ${c.texte} ${
          c.realisee ? "✅" : "⏳"
        }</div>`
    )
    .join("");
}
afficherHistoriqueConsignes();

// === Personnel ===
function enregistrerPersonnel() {
  const nom = document.getElementById("nomPersonnel").value.trim();
  const poste = document.getElementById("postePersonnel").value.trim();
  if (!nom || !poste) return alert("Renseignez nom et poste.");
  const entry = {
    date: new Date().toLocaleString("fr-FR"),
    nom,
    poste,
  };
  historiquePersonnel.push(entry);
  localStorage.setItem("historiquePersonnel", JSON.stringify(historiquePersonnel));
  afficherHistoriquePersonnel();
  document.getElementById("nomPersonnel").value = "";
  document.getElementById("postePersonnel").value = "";
}

function afficherHistoriquePersonnel() {
  const cont = document.getElementById("historiquePersonnel");
  if (!cont) return;
  cont.innerHTML = historiquePersonnel
    .map((p) => `<div>[${p.date}] ${p.nom} — ${p.poste}</div>`)
    .join("");
}
afficherHistoriquePersonnel();

// === Export Excel ===
function exportExcel() {
  const wb = XLSX.utils.book_new();
  const prod = XLSX.utils.json_to_sheet(historiqueProduction);
  const arrets = XLSX.utils.json_to_sheet(historiqueArrets);
  const consignes = XLSX.utils.json_to_sheet(historiqueConsignes);
  const personnel = XLSX.utils.json_to_sheet(historiquePersonnel);
  XLSX.utils.book_append_sheet(wb, prod, "Production");
  XLSX.utils.book_append_sheet(wb, arrets, "Arrêts");
  XLSX.utils.book_append_sheet(wb, consignes, "Consignes");
  XLSX.utils.book_append_sheet(wb, personnel, "Personnel");
  XLSX.writeFile(wb, "Synthese_Atelier_PPNC.xlsx");
}

// === Calculatrice (placeholder, minimal) ===
function openCalculator() {
  alert("Calculatrice à venir (optimisée).");
}

// === PWA ===
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("service-worker.js")
      .then(() => console.log("Service Worker enregistré."))
      .catch((e) => console.error("Erreur SW:", e));
  });
}
