// === Données globales ===
const pages = document.querySelectorAll(".page");
const navButtons = document.querySelectorAll("nav.menu button");
const infos = document.getElementById("infos");
const exportBtn = document.getElementById("exportBtn");
const openCalc = document.getElementById("openCalc");
const calcWrapper = document.getElementById("calcWrapper");
const closeCalc = document.getElementById("closeCalc");
const calcButtons = document.getElementById("calcButtons");
const calcDisplay = document.getElementById("calcDisplay");

let data = JSON.parse(localStorage.getItem("atelierData")) || {
  production: [],
  arrets: [],
  organisation: [],
  personnel: []
};

// === Navigation ===
navButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const target = btn.getAttribute("data-target");
    pages.forEach(p => p.classList.remove("active"));
    document.getElementById(target).classList.add("active");
    if (target === "atelier") majGraphique();
  });
});

// === Infos en-tête ===
function majInfos() {
  const now = new Date();
  const semaine = Math.ceil(((now - new Date(now.getFullYear(), 0, 1)) / 86400000 + now.getDay() + 1) / 7);
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const quantieme = Math.floor((now - startOfYear) / (1000 * 60 * 60 * 24));
  const heure = now.toTimeString().slice(0, 5);
  const equipe = heure < "13:00" ? "M" : heure < "21:00" ? "S" : "N";
  infos.textContent = `${now.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })} | Jour ${quantieme} | Semaine ${semaine} | Équipe ${equipe}`;
}
setInterval(majInfos, 1000);
majInfos();

// === Sélection ligne Production ===
const ligneForm = document.getElementById("ligneForm");
document.querySelectorAll(".ligneBtn").forEach(btn => {
  btn.addEventListener("click", () => {
    const ligne = btn.dataset.ligne;
    ligneForm.innerHTML = `
      <h3>Ligne ${ligne}</h3>
      <label>Heure début : <input id="heureDebut" type="time"></label><br>
      <label>Heure fin : <input id="heureFin" type="time"></label><br>
      <label>Quantité produite : <input id="qteProduite" type="number"></label><br>
      <label>Quantité restante : <input id="qteRestante" type="number"></label><br>
      <label>Cadence manuelle : <input id="cadenceManuelle" type="number"></label><br>
      <div id="finEstimee">Fin estimée : --:--</div>
      <button id="enregistrerProd">Enregistrer</button>
    `;

    document.getElementById("enregistrerProd").addEventListener("click", () => {
      const debut = document.getElementById("heureDebut").value;
      const fin = document.getElementById("heureFin").value;
      const qteProduite = +document.getElementById("qteProduite").value || 0;
      const qteRestante = +document.getElementById("qteRestante").value || 0;
      const cadence = +document.getElementById("cadenceManuelle").value || (qteProduite && debut && fin
        ? qteProduite / ((new Date(`1970-01-01T${fin}`) - new Date(`1970-01-01T${debut}`)) / 3600000)
        : 0);

      let tempsRestant = "--:--";
      if (cadence && qteRestante) {
        const heures = qteRestante / cadence;
        const h = Math.floor(heures);
        const m = Math.round((heures - h) * 60);
        tempsRestant = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
      }
      document.getElementById("finEstimee").textContent = `Temps restant : ${tempsRestant}`;

      const enreg = { ligne, debut, fin, qteProduite, qteRestante, cadence, tempsRestant, date: new Date().toLocaleString("fr-FR") };
      data.production.push(enreg);
      localStorage.setItem("atelierData", JSON.stringify(data));
      afficherHistoriqueGlobal();
    });
  });
});

// === Arrêts ===
document.getElementById("enregistrerArret").addEventListener("click", () => {
  const enreg = {
    ligne: document.getElementById("ligneArret").value,
    type: document.getElementById("typeArret").value,
    duree: document.getElementById("dureeArret").value,
    commentaire: document.getElementById("commentaireArret").value,
    date: new Date().toLocaleString("fr-FR")
  };
  data.arrets.push(enreg);
  localStorage.setItem("atelierData", JSON.stringify(data));
  afficherHistoriqueGlobal();
});

// === Organisation ===
document.getElementById("ajouterConsigne").addEventListener("click", () => {
  const texte = document.getElementById("consigneTexte").value.trim();
  if (!texte) return;
  const enreg = { texte, valide: false, date: new Date().toLocaleString("fr-FR") };
  data.organisation.push(enreg);
  localStorage.setItem("atelierData", JSON.stringify(data));
  document.getElementById("consigneTexte").value = "";
  afficherConsignes();
});

function afficherConsignes() {
  const liste = document.getElementById("listeConsignes");
  liste.innerHTML = "";
  data.organisation.forEach((c, i) => {
    const li = document.createElement("li");
    li.textContent = `${c.texte} (${c.date})`;
    if (!c.valide) {
      const btn = document.createElement("button");
      btn.textContent = "Valider";
      btn.onclick = () => {
        c.valide = true;
        localStorage.setItem("atelierData", JSON.stringify(data));
        afficherConsignes();
        afficherHistoriqueGlobal();
      };
      li.appendChild(btn);
    } else {
      li.style.textDecoration = "line-through";
    }
    liste.appendChild(li);
  });
}
afficherConsignes();

// === Personnel ===
document.getElementById("ajouterPersonnel").addEventListener("click", () => {
  const nom = document.getElementById("nomPersonnel").value;
  const motif = document.getElementById("motifPersonnel").value;
  const com = document.getElementById("commentairePersonnel").value;
  const enreg = { nom, motif, commentaire: com, date: new Date().toLocaleString("fr-FR") };
  data.personnel.push(enreg);
  localStorage.setItem("atelierData", JSON.stringify(data));
  afficherHistoriqueGlobal();
});

// === Historique global ===
function afficherHistoriqueGlobal() {
  const hist = document.getElementById("historiqueGlobal");
  hist.innerHTML = "<h3>Historique global</h3>";
  ["production", "arrets", "organisation", "personnel"].forEach(cat => {
    if (data[cat].length) {
      const div = document.createElement("div");
      div.innerHTML = `<strong>${cat.toUpperCase()}</strong><br>${data[cat].map(e => JSON.stringify(e)).join("<br>")}`;
      hist.appendChild(div);
    }
  });
  majGraphique();
}
afficherHistoriqueGlobal();

// === Graphique Atelier ===
let chart;
function majGraphique() {
  const ctx = document.getElementById("atelierChart");
  const lignes = ["Râpé", "T2", "RT", "OMORI", "T1", "Sticks", "Emballage", "Dés", "Filets", "Prédécoupés"];
  const dataset = lignes.map(ligne => {
    const enregs = data.production.filter(e => e.ligne === ligne);
    return {
      label: ligne,
      data: enregs.map(e => e.cadence),
      borderWidth: 2,
      fill: false
    };
  });
  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: "line",
    data: { labels: data.production.map(e => e.date), datasets: dataset },
    options: { responsive: true, plugins: { legend: { position: "bottom" } } }
  });
}

// === Export Excel ===
exportBtn.addEventListener("click", () => {
  const wb = XLSX.utils.book_new();
  Object.keys(data).forEach(cat => {
    const ws = XLSX.utils.json_to_sheet(data[cat]);
    XLSX.utils.book_append_sheet(wb, ws, cat);
  });
  const heure = new Date().toLocaleTimeString("fr-FR").replace(/:/g, "-");
  XLSX.writeFile(wb, `Atelier_PPNC_${heure}.xlsx`);
});

// === Calculatrice ===
const touches = ["7","8","9","/","4","5","6","*","1","2","3","-","0",".","=","+"];
touches.forEach(t => {
  const b = document.createElement("button");
  b.textContent = t;
  b.onclick = () => {
    if (t === "=") calcDisplay.value = eval(calcDisplay.value || "0");
    else calcDisplay.value += t;
  };
  calcButtons.appendChild(b);
});
openCalc.addEventListener("click", () => calcWrapper.classList.toggle("hidden"));
closeCalc.addEventListener("click", () => calcWrapper.classList.add("hidden"));
