/******************************************
 * APPLICATION SYNTHÈSE ATELIER PPNC vFinale
 ******************************************/

// 🧭 Gestion de navigation entre les pages
function afficherPage(pageId) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(pageId).classList.add("active");
  localStorage.setItem("pageActive", pageId);
}

// Restaurer la dernière page active
window.addEventListener("load", () => {
  const pageActive = localStorage.getItem("pageActive") || "atelier";
  afficherPage(pageActive);
  chargerTout();
});

// 🧩 Données principales
let lignes = ["Râpé", "T2", "RT", "OMORI T1", "Sticks", "Emballage", "Dés", "Filets", "Prédécoupés"];
let historiques = JSON.parse(localStorage.getItem("historiques")) || {};
let arrets = JSON.parse(localStorage.getItem("arrets")) || [];
let consignes = JSON.parse(localStorage.getItem("consignes")) || [];
let personnel = JSON.parse(localStorage.getItem("personnel")) || [];

// Créer l’objet d’historique par ligne s’il n’existe pas
lignes.forEach(l => {
  if (!historiques[l]) historiques[l] = [];
});

// 🧮 Ouvrir une ligne
function ouvrirLigne(nom) {
  let ligne = prompt(`Saisie pour la ligne ${nom}\nQuantité produite :`);
  if (ligne === null || ligne.trim() === "") return;
  const qty = parseFloat(ligne);
  const debut = prompt("Heure de début (HH:MM)", "08:00");
  const fin = prompt("Heure de fin (HH:MM)", "10:00");

  if (!debut || !fin) return alert("⚠️ Heures invalides !");
  const [hd, md] = debut.split(":").map(Number);
  const [hf, mf] = fin.split(":").map(Number);
  let diff = ((hf * 60 + mf) - (hd * 60 + md)) / 60;
  if (diff <= 0) diff += 24;
  const cadence = (qty / diff).toFixed(1);

  const reste = prompt("Quantité restante :", "0") || 0;
  const estimationHeures = reste / cadence;
  const estimationFin = new Date();
  estimationFin.setHours(estimationFin.getHours() + estimationHeures);
  const estimationTxt = estimationFin.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const data = {
    ligne: nom,
    debut, fin, qty, cadence,
    reste, estimation: estimationTxt,
    date: new Date().toLocaleDateString(),
    heure: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  };

  historiques[nom].push(data);
  localStorage.setItem("historiques", JSON.stringify(historiques));
  alert(`✅ Enregistré\nCadence : ${cadence} colis/h\nFin estimée : ${estimationTxt}`);
  afficherGraphAtelier();
}

// 🧾 Charger tout (au lancement)
function chargerTout() {
  afficherGraphAtelier();
  afficherArrets();
  afficherConsignes();
  afficherPersonnel();
}

// 📉 Graphique général (Atelier)
function afficherGraphAtelier() {
  const ctx = document.getElementById("graphAtelier");
  if (!ctx) return;

  const labels = lignes;
  const data = lignes.map(l => {
    const total = historiques[l].reduce((s, r) => s + (parseFloat(r.qty) || 0), 0);
    return total;
  });

  if (window.graphAtelierInstance) window.graphAtelierInstance.destroy();

  window.graphAtelierInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Production (colis)",
        data,
        backgroundColor: "#1a73e8"
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        title: { display: true, text: "Production totale par ligne" }
      },
      scales: {
        y: { beginAtZero: true, ticks: { color: "#333" } },
        x: { ticks: { color: "#333" } }
      }
    }
  });
}

// 🛠️ ARRÊTS
function ajouterArret() {
  const ligne = document.getElementById("ligneSelect").value;
  const type = document.getElementById("typeArret").value;
  const duree = parseFloat(document.getElementById("dureeArret").value);
  if (!ligne || !type || isNaN(duree)) return alert("⚠️ Complétez tous les champs d'arrêt.");

  arrets.push({
    ligne, type, duree,
    date: new Date().toLocaleDateString(),
    heure: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  });
  localStorage.setItem("arrets", JSON.stringify(arrets));
  document.getElementById("dureeArret").value = "";
  afficherArrets();
}

function afficherArrets() {
  const zone = document.getElementById("historiqueArrets");
  if (!zone) return;
  zone.innerHTML = "";
  arrets.forEach(a => {
    const div = document.createElement("div");
    div.className = "ligne-arret";
    div.textContent = `${a.date} ${a.heure} — ${a.ligne} : ${a.type} (${a.duree} min)`;
    zone.appendChild(div);
  });
}

// 📋 CONSIGNES
function ajouterConsigne() {
  const texte = document.getElementById("consigneTexte").value.trim();
  if (!texte) return alert("Saisissez une consigne.");
  consignes.push({ texte, date: new Date().toLocaleString(), realise: false });
  localStorage.setItem("consignes", JSON.stringify(consignes));
  document.getElementById("consigneTexte").value = "";
  afficherConsignes();
}

function afficherConsignes() {
  const zone = document.getElementById("historiqueConsignes");
  if (!zone) return;
  zone.innerHTML = "";
  consignes.forEach((c, i) => {
    const div = document.createElement("div");
    div.className = c.realise ? "consigne realise" : "consigne";
    div.innerHTML = `
      <input type="checkbox" ${c.realise ? "checked" : ""} onchange="toggleConsigne(${i})">
      ${c.texte} <span>(${c.date})</span>`;
    zone.appendChild(div);
  });
}

function toggleConsigne(i) {
  consignes[i].realise = !consignes[i].realise;
  localStorage.setItem("consignes", JSON.stringify(consignes));
  afficherConsignes();
}

// 👥 PERSONNEL
function ajouterPersonnel() {
  const nom = document.getElementById("nomPerso").value.trim();
  const motif = document.getElementById("motifPerso").value;
  const com = document.getElementById("commentairePerso").value.trim();
  if (!nom || !motif) return alert("⚠️ Complétez nom et motif.");

  personnel.push({
    nom, motif, com,
    date: new Date().toLocaleDateString(),
    heure: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  });
  localStorage.setItem("personnel", JSON.stringify(personnel));
  document.getElementById("nomPerso").value = "";
  document.getElementById("motifPerso").value = "";
  document.getElementById("commentairePerso").value = "";
  afficherPersonnel();
}

function afficherPersonnel() {
  const zone = document.getElementById("historiquePersonnel");
  if (!zone) return;
  zone.innerHTML = "";
  personnel.forEach(p => {
    const div = document.createElement("div");
    div.className = "ligne-personnel";
    div.textContent = `${p.date} ${p.heure} — ${p.nom} : ${p.motif} (${p.com})`;
    zone.appendChild(div);
  });
}

// 📊 EXPORT GLOBAL EXCEL (présentable)
function exporterExcelGlobal() {
  const lignesData = Object.entries(historiques).map(([l, h]) => h.map(r => ({
    Ligne: l, Début: r.debut, Fin: r.fin, Quantité: r.qty, Cadence: r.cadence,
    Reste: r.reste, Estimation: r.estimation, Date: r.date, Heure: r.heure
  }))).flat();

  const wb = XLSX.utils.book_new();
  const ws1 = XLSX.utils.json_to_sheet(lignesData);
  XLSX.utils.book_append_sheet(wb, ws1, "Production");

  const ws2 = XLSX.utils.json_to_sheet(arrets);
  XLSX.utils.book_append_sheet(wb, ws2, "Arrêts");

  const ws3 = XLSX.utils.json_to_sheet(consignes);
  XLSX.utils.book_append_sheet(wb, ws3, "Consignes");

  const ws4 = XLSX.utils.json_to_sheet(personnel);
  XLSX.utils.book_append_sheet(wb, ws4, "Personnel");

  XLSX.writeFile(wb, `Synthese_Atelier_${new Date().toISOString().slice(0, 10)}.xlsx`);
    }
