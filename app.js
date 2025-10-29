// -------------------------
// Atelier PPNC - Version Marbre Finale
// -------------------------

document.addEventListener("DOMContentLoaded", () => {
  const pages = document.querySelectorAll(".page");
  const dateTimeDisplay = document.getElementById("dateTimeDisplay");
  const ligneContainer = document.getElementById("ligneContainer");
  const lignes = ["Râpé", "T2", "RT", "OMORI T1", "Sticks", "Emballage", "Dés", "Filets", "Prédécoupés"];
  const historiqueAtelier = document.getElementById("historiqueAtelier");
  const atelierChart = document.getElementById("atelierChart");
  let chartInstance;

  // --- Navigation ---
  window.showPage = (id) => {
    pages.forEach((p) => p.classList.remove("active"));
    document.getElementById(id).classList.add("active");
    if (id === "atelier") majGraphiqueAtelier();
  };

  // --- Date / Heure / Semaine / Équipe ---
  const majHorloge = () => {
    const now = new Date();
    const semaine = Math.ceil((now.getDate() - now.getDay() + 10) / 7);
    const heures = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const jour = now.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
    const equipe = heures >= 21 || heures < 5 ? "N" : heures >= 13 ? "AM" : "M";
    dateTimeDisplay.textContent = `${jour} | ${heures}:${minutes} | Sem.${semaine} | Équipe ${equipe}`;
  };
  setInterval(majHorloge, 1000);
  majHorloge();

  // --- Création des boutons lignes ---
  lignes.forEach((nom) => {
    const btn = document.createElement("button");
    btn.textContent = nom;
    btn.onclick = () => ouvrirLigne(nom);
    ligneContainer.appendChild(btn);
  });

  // --- Données locales ---
  const data = JSON.parse(localStorage.getItem("atelierData") || "{}");

  function saveData() {
    localStorage.setItem("atelierData", JSON.stringify(data));
  }

  // --- Ouvrir une ligne ---
  function ouvrirLigne(ligne) {
    currentLigne = ligne;
    showPage("production");
    document.getElementById("ligneTitle").textContent = `Ligne ${ligne}`;
    majHistoriqueLigne();
  }

  // --- Calcul cadence et temps restant ---
  function calculerCadenceEtFin(debut, fin, quantite, restante, manuelle) {
    if (!debut || !fin || !quantite) return "";
    const diff = (new Date(`1970-01-01T${fin}:00`) - new Date(`1970-01-01T${debut}:00`)) / 60000;
    const cadence = manuelle > 0 ? manuelle : diff > 0 ? (quantite / diff) * 60 : 0;
    const tempsRestant = restante && cadence > 0 ? (restante / cadence).toFixed(2) : 0;
    return { cadence: cadence.toFixed(1), tempsRestant };
  }

  // --- Enregistrement production ---
  document.getElementById("productionForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const ligne = currentLigne;
    const debut = document.getElementById("heureDebut").value;
    const fin = document.getElementById("heureFin").value;
    const quantite = +document.getElementById("quantiteProduite").value;
    const restante = +document.getElementById("quantiteRestante").value;
    const manuelle = +document.getElementById("cadenceManuelle").value;

    const calc = calculerCadenceEtFin(debut, fin, quantite, restante, manuelle);
    const entry = {
      date: new Date().toLocaleString("fr-FR"),
      debut, fin, quantite, restante,
      cadence: calc.cadence,
      tempsRestant: calc.tempsRestant,
    };

    if (!data[ligne]) data[ligne] = [];
    data[ligne].push(entry);
    saveData();
    majHistoriqueLigne();
    document.getElementById("productionForm").reset();
  });

  function majHistoriqueLigne() {
    const container = document.getElementById("historiqueProduction");
    const ligne = currentLigne;
    container.innerHTML = "";
    if (!data[ligne]) return;
    data[ligne].forEach((item, i) => {
      const div = document.createElement("div");
      div.textContent = `${item.date} → ${item.quantite} colis | ${item.cadence} col/h | Temps restant: ${item.tempsRestant} h`;
      const suppr = document.createElement("button");
      suppr.textContent = "🗑️";
      suppr.onclick = () => {
        data[ligne].splice(i, 1);
        saveData();
        majHistoriqueLigne();
      };
      div.appendChild(suppr);
      container.appendChild(div);
    });
  }

  // --- Page Arrêts ---
  const formArret = document.getElementById("arretForm");
  const histArrets = document.getElementById("historiqueArrets");
  formArret.addEventListener("submit", (e) => {
    e.preventDefault();
    const ligne = formArret.ligneArret.value;
    const type = formArret.typeArret.value;
    const duree = +formArret.dureeArret.value;
    const com = formArret.commentaireArret.value;
    const entry = { ligne, type, duree, com, date: new Date().toLocaleString("fr-FR") };
    if (!data.arrets) data.arrets = [];
    data.arrets.push(entry);
    saveData();
    formArret.reset();
    majArrets();
  });

  function majArrets() {
    histArrets.innerHTML = "";
    if (!data.arrets) return;
    data.arrets.forEach((a) => {
      const div = document.createElement("div");
      div.textContent = `${a.date} | ${a.ligne} | ${a.type} | ${a.duree} min | ${a.com}`;
      histArrets.appendChild(div);
    });
  }

  // --- Organisation / Consignes ---
  const consForm = document.getElementById("consigneForm");
  const histCons = document.getElementById("historiqueConsignes");
  consForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const txt = consForm.texteConsigne.value;
    const entry = { txt, date: new Date().toLocaleString("fr-FR"), valid: false };
    if (!data.consignes) data.consignes = [];
    data.consignes.push(entry);
    saveData();
    consForm.reset();
    majConsignes();
  });

  function majConsignes() {
    histCons.innerHTML = "";
    if (!data.consignes) return;
    data.consignes.forEach((c, i) => {
      const div = document.createElement("div");
      div.innerHTML = `<b>${c.date}</b> - ${c.txt} ${
        c.valid ? "✅" : `<button onclick="validerConsigne(${i})">Valider</button>`
      }`;
      histCons.appendChild(div);
    });
  }
  window.validerConsigne = (i) => {
    data.consignes[i].valid = true;
    saveData();
    majConsignes();
  };

  // --- Personnel ---
  const persForm = document.getElementById("personnelForm");
  const histPers = document.getElementById("historiquePersonnel");
  persForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const nom = persForm.nomPersonnel.value;
    const motif = persForm.motifPersonnel.value;
    const com = persForm.commentairePersonnel.value;
    const entry = { nom, motif, com, date: new Date().toLocaleString("fr-FR") };
    if (!data.personnel) data.personnel = [];
    data.personnel.push(entry);
    saveData();
    persForm.reset();
    majPersonnel();
  });

  function majPersonnel() {
    histPers.innerHTML = "";
    if (!data.personnel) return;
    data.personnel.forEach((p) => {
      const div = document.createElement("div");
      div.textContent = `${p.date} | ${p.nom} : ${p.motif} (${p.com})`;
      histPers.appendChild(div);
    });
  }

  // --- Graphique Atelier ---
  function majGraphiqueAtelier() {
    if (chartInstance) chartInstance.destroy();
    const labels = lignes;
    const quantites = lignes.map((l) => (data[l] ? data[l].reduce((a, b) => a + +b.quantite, 0) : 0));
    chartInstance = new Chart(atelierChart, {
      type: "bar",
      data: { labels, datasets: [{ label: "Quantités produites", data: quantites, backgroundColor: "#007bff" }] },
      options: { responsive: true, scales: { y: { beginAtZero: true } } },
    });

    historiqueAtelier.innerHTML = "";
    lignes.forEach((l) => {
      if (data[l])
        historiqueAtelier.innerHTML += `<p><b>${l}</b> : ${data[l].length} enregistrements</p>`;
    });
  }

  // --- Export Excel multi-onglets ---
  window.exportAllToExcel = () => {
    const wb = XLSX.utils.book_new();

    const addSheet = (nom, arr) => {
      if (!arr || arr.length === 0) return;
      const ws = XLSX.utils.json_to_sheet(arr);
      XLSX.utils.book_append_sheet(wb, ws, nom);
    };

    lignes.forEach((l) => addSheet(l, data[l]));
    addSheet("Arrêts", data.arrets);
    addSheet("Consignes", data.consignes);
    addSheet("Personnel", data.personnel);

    XLSX.writeFile(wb, `Atelier_PPNC_${new Date().toLocaleDateString("fr-FR")}.xlsx`);
  };

// --- Calculatrice flottante ---
const calcToggle = document.getElementById("calcToggle");
const calcPanel = document.getElementById("calcPanel");
const calcDisplay = document.getElementById("calcDisplay");
const calcButtons = document.getElementById("calcButtons");
const calcKeys = ["7","8","9","/","4","5","6","*","1","2","3","-","0",".","=","+","C"];
let expression = "";

calcPanel.classList.add("hidden"); // 🔹 Fermée par défaut

calcKeys.forEach((k) => {
  const b = document.createElement("button");
  b.textContent = k;
  b.onclick = () => {
    if (k === "=") expression = eval(expression || 0).toString();
    else if (k === "C") expression = "";
    else expression += k;
    calcDisplay.value = expression;
  };
  calcButtons.appendChild(b);
});

calcToggle.onclick = () => {
  calcPanel.classList.toggle("hidden"); // 🔹 Ouvre ou ferme
};
  // --- Initialisation ---
  majArrets();
  majConsignes();
  majPersonnel();
  majGraphiqueAtelier();
});
