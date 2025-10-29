// === INFOS EN-TÊTE ===
function majInfos() {
  const now = new Date();
  const semaine = Math.ceil((now.getDate() - now.getDay() + 10) / 7);
  const quantieme = now.getDate();
  const heures = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  let equipe = "";
  if (heures >= 5 && heures < 13) equipe = "M";
  else if (heures >= 13 && heures < 21) equipe = "AM";
  else equipe = "N";
  document.getElementById("infos").innerHTML =
    `📅 ${now.toLocaleDateString()} (${quantieme}) - ⏰ ${heures}:${minutes} - S${semaine} - Équipe ${equipe}`;
}
setInterval(majInfos, 1000);
majInfos();

// === NAVIGATION ===
const pages = document.querySelectorAll(".page");
const menuBtns = document.querySelectorAll(".menu button");
menuBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    pages.forEach((p) => p.classList.remove("active"));
    document.getElementById(btn.dataset.target).classList.add("active");
  });
});

// === FORMULAIRES LIGNES ===
const ligneForm = document.getElementById("ligneForm");
const lignesBtns = document.querySelectorAll(".ligneBtn");
let ligneActuelle = "";

lignesBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    ligneActuelle = btn.dataset.ligne;
    afficherFormulaireLigne(ligneActuelle);
    ligneForm.scrollIntoView({ behavior: "smooth" });
  });
});

function afficherFormulaireLigne(nom) {
  ligneForm.innerHTML = `
    <h3>Ligne ${nom}</h3>
    <label>Heure début : <input type="time" id="hDebut"></label><br>
    <label>Heure fin : <input type="time" id="hFin"></label><br>
    <label>Quantité produite : <input type="number" id="qte"></label><br>
    <label>Quantité restante : <input type="number" id="reste"></label><br>
    <label>Arrêts (min) : <input type="number" id="arret"></label><br>
    <label>Commentaire : <textarea id="comment"></textarea></label><br>
    <label>Cadence manuelle : <input type="number" id="cadManuelle"></label><br>
    <button id="enregistrerLigne">Enregistrer</button>
    <button id="supprimerLigne">Supprimer dernière</button>
    <p id="cadenceAff"></p>
    <p id="finEstimee"></p>
    <div id="historiqueLigne"></div>
  `;

  chargerDerniereSaisie(nom);
  document.getElementById("enregistrerLigne").onclick = () => enregistrerLigne(nom);
  document.getElementById("supprimerLigne").onclick = () => supprimerDerniere(nom);
}

function chargerDerniereSaisie(nom) {
  const sauvegarde = localStorage.getItem("ligne_" + nom);
  if (sauvegarde) {
    const data = JSON.parse(sauvegarde);
    document.getElementById("qte").value = data.qte || "";
    document.getElementById("reste").value = data.reste || "";
    document.getElementById("hDebut").value = data.hDebut || "";
    document.getElementById("hFin").value = data.hFin || "";
    document.getElementById("arret").value = data.arret || "";
    document.getElementById("comment").value = data.comment || "";
  }
}

function enregistrerLigne(nom) {
  const qte = Number(document.getElementById("qte").value);
  const reste = Number(document.getElementById("reste").value);
  const hDebut = document.getElementById("hDebut").value;
  const hFin = document.getElementById("hFin").value;
  const arret = Number(document.getElementById("arret").value);
  const comment = document.getElementById("comment").value;
  const cadManuelle = Number(document.getElementById("cadManuelle").value);
  const now = new Date();
  const equipe = document.getElementById("infos").textContent.match(/Équipe ([MAN]+)/)[1];

  if (!hDebut || !hFin || !qte) {
    alert("Veuillez remplir au moins les champs Heure début, Heure fin et Quantité produite.");
    return;
  }

  // Calcul de cadence
  const [hdH, hdM] = hDebut.split(":").map(Number);
  const [hfH, hfM] = hFin.split(":").map(Number);
  const debutMin = hdH * 60 + hdM;
  let finMin = hfH * 60 + hfM;
  if (finMin < debutMin) finMin += 24 * 60;
  const duree = finMin - debutMin - arret;
  const cadence = cadManuelle || (duree > 0 ? (qte / duree) * 60 : 0);
  const finEstimeeMin = reste > 0 && cadence > 0 ? (reste / cadence) * 60 : 0;
  const heuresRestantes = Math.floor(finEstimeeMin / 60);
  const minutesRestantes = Math.round(finEstimeeMin % 60);
  const finEstimeeTxt = reste
    ? `⏳ Temps restant estimé : ${heuresRestantes}h ${minutesRestantes}min`
    : "";

  document.getElementById("cadenceAff").innerText = `⚙️ Cadence : ${cadence.toFixed(2)} colis/h`;
  document.getElementById("finEstimee").innerText = finEstimeeTxt;

  const enregistrement = {
    qte,
    reste,
    hDebut,
    hFin,
    arret,
    comment,
    cadence,
    equipe,
    date: now.toLocaleString(),
  };

  // Historique
  const histCle = "historique_" + nom;
  const hist = JSON.parse(localStorage.getItem(histCle) || "[]");
  hist.push(enregistrement);
  localStorage.setItem(histCle, JSON.stringify(hist));
  localStorage.setItem("ligne_" + nom, JSON.stringify(enregistrement));
  afficherHistoriqueLigne(nom);
  effacerChampsLigne();
}

function afficherHistoriqueLigne(nom) {
  const histCle = "historique_" + nom;
  const hist = JSON.parse(localStorage.getItem(histCle) || "[]");
  const cont = document.getElementById("historiqueLigne");
  cont.innerHTML = "<h4>Historique :</h4>";
  hist.slice().reverse().forEach((r, i) => {
    cont.innerHTML += `<div>• ${r.date} — ${r.qte} colis — ${r.cadence.toFixed(
      2
    )} c/h — ${r.equipe}</div>`;
  });
}

function effacerChampsLigne() {
  ["qte", "reste", "arret", "comment", "cadManuelle"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
}

function supprimerDerniere(nom) {
  const histCle = "historique_" + nom;
  const hist = JSON.parse(localStorage.getItem(histCle) || "[]");
  hist.pop();
  localStorage.setItem(histCle, JSON.stringify(hist));
  afficherHistoriqueLigne(nom);
}

// === ARRÊTS ===
document.getElementById("enregistrerArret").addEventListener("click", () => {
  const ligne = document.getElementById("ligneArret").value;
  const type = document.getElementById("typeArret").value;
  const duree = Number(document.getElementById("dureeArret").value);
  const commentaire = document.getElementById("commentaireArret").value;
  if (!ligne || !type || !duree) return alert("Champs manquants.");
  const now = new Date().toLocaleString();
  const hist = JSON.parse(localStorage.getItem("arrets") || "[]");
  hist.push({ ligne, type, duree, commentaire, date: now });
  localStorage.setItem("arrets", JSON.stringify(hist));
  alert("Arrêt enregistré !");
  document.getElementById("dureeArret").value = "";
  document.getElementById("commentaireArret").value = "";
});

// === CONSIGNES ===
document.getElementById("ajouterConsigne").addEventListener("click", () => {
  const txt = document.getElementById("consigneTexte").value;
  if (!txt) return;
  const hist = JSON.parse(localStorage.getItem("consignes") || "[]");
  hist.push({ texte: txt, valide: false });
  localStorage.setItem("consignes", JSON.stringify(hist));
  document.getElementById("consigneTexte").value = "";
  afficherConsignes();
});

function afficherConsignes() {
  const cont = document.getElementById("listeConsignes");
  cont.innerHTML = "";
  const hist = JSON.parse(localStorage.getItem("consignes") || "[]");
  hist.forEach((c, i) => {
    cont.innerHTML += `
      <li>
        <input type="checkbox" ${c.valide ? "checked" : ""} onchange="validerConsigne(${i})">
        ${c.texte}
      </li>`;
  });
}

function validerConsigne(i) {
  const hist = JSON.parse(localStorage.getItem("consignes") || "[]");
  hist[i].valide = !hist[i].valide;
  localStorage.setItem("consignes", JSON.stringify(hist));
  afficherConsignes();
}
afficherConsignes();

// === PERSONNEL ===
document.getElementById("ajouterPersonnel").addEventListener("click", () => {
  const nom = document.getElementById("nomPersonnel").value;
  const motif = document.getElementById("motifPersonnel").value;
  const commentaire = document.getElementById("commentairePersonnel").value;
  if (!nom) return alert("Nom obligatoire !");
  const hist = JSON.parse(localStorage.getItem("personnel") || "[]");
  hist.push({ nom, motif, commentaire, date: new Date().toLocaleString() });
  localStorage.setItem("personnel", JSON.stringify(hist));
  document.getElementById("nomPersonnel").value = "";
  document.getElementById("commentairePersonnel").value = "";
  alert("Personnel ajouté !");
});

// === EXPORT GLOBAL ===
document.getElementById("exportBtn").addEventListener("click", () => {
  const allData = {};
  const lignes = ["Râpé","T2","RT","OMORI","T1","Sticks","Emballage","Dés","Filets","Prédécoupés"];
  allData["Production"] = lignes.flatMap(l =>
    JSON.parse(localStorage.getItem("historique_" + l) || "[]").map(e => ({ Ligne: l, ...e }))
  );
  allData["Arrêts"] = JSON.parse(localStorage.getItem("arrets") || "[]");
  allData["Consignes"] = JSON.parse(localStorage.getItem("consignes") || "[]");
  allData["Personnel"] = JSON.parse(localStorage.getItem("personnel") || "[]");

  const wb = XLSX.utils.book_new();
  for (let key in allData) {
    const ws = XLSX.utils.json_to_sheet(allData[key]);
    XLSX.utils.book_append_sheet(wb, ws, key);
  }
  const now = new Date().toISOString().replace(/[:.]/g, "-");
  XLSX.writeFile(wb, `Atelier_PPNC_${now}.xlsx`);
});

// === GRAPHIQUE ATELIER ===
function afficherGraphiqueAtelier() {
  const ctx = document.getElementById("atelierChart").getContext("2d");
  const lignes = ["Râpé","T2","RT","OMORI","T1","Sticks","Emballage","Dés","Filets","Prédécoupés"];
  const datasets = lignes.map((l, i) => {
    const hist = JSON.parse(localStorage.getItem("historique_" + l) || "[]");
    return {
      label: l,
      data: hist.map(h => h.cadence),
      borderColor: `hsl(${i * 36}, 80%, 50%)`,
      fill: false,
      tension: 0.3
    };
  });
  new Chart(ctx, {
    type: "line",
    data: { labels: Array.from({ length: 20 }, (_, i) => i + 1), datasets },
    options: { responsive: true, plugins: { legend: { position: "bottom" } } }
  });
}
afficherGraphiqueAtelier();

// === CALCULATRICE ===
const calcWrapper = document.getElementById("calcWrapper");
const openCalc = document.getElementById("openCalc");
const closeCalc = document.getElementById("closeCalc");
const calcDisplay = document.getElementById("calcDisplay");
const calcButtons = document.getElementById("calcButtons");
let calcInput = "";

openCalc.onclick = () => calcWrapper.classList.toggle("hidden");
closeCalc.onclick = () => calcWrapper.classList.add("hidden");

const btns = ["7","8","9","/","4","5","6","*","1","2","3","-","0",".","=","+"];
btns.forEach((b) => {
  const btn = document.createElement("button");
  btn.textContent = b;
  btn.onclick = () => {
    if (b === "=") {
      try { calcInput = eval(calcInput).toString(); }
      catch { calcInput = "Err"; }
    } else calcInput += b;
    calcDisplay.value = calcInput;
  };
  calcButtons.appendChild(btn);
});
