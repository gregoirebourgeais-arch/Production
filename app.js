// ----------------------
// Initialisation générale
// ----------------------
document.addEventListener("DOMContentLoaded", () => {
  afficherDateHeure();
  setInterval(afficherDateHeure, 60000);
  initialiserFormulaires();
  initialiserCalculatrice();
  afficherPage("atelier");
  chargerHistorique();
});

// ----------------------
// Date / heure / semaine
// ----------------------
function afficherDateHeure() {
  const maintenant = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const numeroSemaine = getWeekNumber(maintenant);
  document.getElementById("dateHeure").textContent =
    `${maintenant.toLocaleDateString("fr-FR", options)} — S${numeroSemaine}`;
}

function getWeekNumber(date) {
  const onejan = new Date(date.getFullYear(), 0, 1);
  const millisecsInDay = 86400000;
  return Math.ceil(((date - onejan) / millisecsInDay + onejan.getDay() + 1) / 7);
}

// ----------------------
// Navigation entre pages
// ----------------------
function afficherPage(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  const page = document.getElementById(id);
  if (page) page.classList.add("active");
}

// ----------------------
// Initialisation des formulaires
// ----------------------
function initialiserFormulaires() {
  document.querySelectorAll(".form-ligne").forEach(div => {
    const ligne = div.dataset.ligne;
    div.innerHTML = `
      <form onsubmit="enregistrerLigne(event, '${ligne}')">
        <label>Quantité produite :</label>
        <input type="number" id="quantite_${ligne}" required>

        <label>Quantité restante :</label>
        <input type="number" id="restant_${ligne}" oninput="calculerFinEstimee('${ligne}')">

        <label>Cadence manuelle :</label>
        <input type="number" id="cadence_${ligne}" placeholder="Saisir cadence...">

        <p id="fin_${ligne}" class="tempsFin"></p>

        <button type="submit">Enregistrer</button>
      </form>
      <div id="historique_${ligne}"></div>
    `;
  });

  // Formulaires secondaires
  document.getElementById("formArrets").addEventListener("submit", enregistrerArret);
  document.getElementById("formOrganisation").addEventListener("submit", enregistrerOrganisation);
  document.getElementById("formPersonnel").addEventListener("submit", enregistrerPersonnel);
}

// ----------------------
// Calcul du temps estimé restant
// ----------------------
function calculerFinEstimee(ligne) {
  const restant = parseFloat(document.getElementById(`restant_${ligne}`).value);
  const cadence = parseFloat(document.getElementById(`cadence_${ligne}`).value);
  const affichage = document.getElementById(`fin_${ligne}`);

  if (!isNaN(restant) && (cadence > 0)) {
    const minutesRestantes = (restant / cadence) * 60;
    const fin = new Date(Date.now() + minutesRestantes * 60000);
    affichage.textContent = `Temps estimé restant : ${minutesRestantes.toFixed(1)} min (${fin.toLocaleTimeString("fr-FR")})`;
  } else {
    affichage.textContent = "";
  }
}

// ----------------------
// Enregistrements
// ----------------------
function enregistrerLigne(e, ligne) {
  e.preventDefault();
  const qte = document.getElementById(`quantite_${ligne}`).value;
  const restant = document.getElementById(`restant_${ligne}`).value;
  const cadence = document.getElementById(`cadence_${ligne}`).value;
  const date = new Date().toLocaleString("fr-FR");

  const data = { ligne, qte, restant, cadence, date };
  const historique = JSON.parse(localStorage.getItem("production")) || [];
  historique.push(data);
  localStorage.setItem("production", JSON.stringify(historique));

  afficherHistoriqueLigne(ligne);
  majGraphiqueAtelier();
  e.target.reset(); // Efface le formulaire
  document.getElementById(`fin_${ligne}`).textContent = "";
}

function enregistrerArret(e) {
  e.preventDefault();
  const ligne = document.getElementById("ligneArret").value;
  const motif = document.getElementById("motifArret").value;
  const commentaire = document.getElementById("commentaireArret").value;
  const date = new Date().toLocaleString("fr-FR");

  const data = { ligne, motif, commentaire, date };
  const historique = JSON.parse(localStorage.getItem("arrets")) || [];
  historique.push(data);
  localStorage.setItem("arrets", JSON.stringify(historique));

  afficherHistoriqueArrets();
  e.target.reset();
}

function enregistrerOrganisation(e) {
  e.preventDefault();
  const texte = document.getElementById("texteConsigne").value;
  const date = new Date().toLocaleString("fr-FR");
  const data = { texte, date, valide: false };

  const historique = JSON.parse(localStorage.getItem("organisation")) || [];
  historique.push(data);
  localStorage.setItem("organisation", JSON.stringify(historique));

  afficherHistoriqueOrganisation();
  e.target.reset();
}

function enregistrerPersonnel(e) {
  e.preventDefault();
  const nom = document.getElementById("nomPersonnel").value;
  const motif = document.getElementById("motifPersonnel").value;
  const commentaire = document.getElementById("commentairePersonnel").value;
  const date = new Date().toLocaleString("fr-FR");

  const data = { nom, motif, commentaire, date };
  const historique = JSON.parse(localStorage.getItem("personnel")) || [];
  historique.push(data);
  localStorage.setItem("personnel", JSON.stringify(historique));

  afficherHistoriquePersonnel();
  e.target.reset();
}

// ----------------------
// Historique affichage
// ----------------------
function chargerHistorique() {
  ["Râpé","T2","RT","OMORI","T1","Sticks","Emballage","Dés","Filets","Prédécoupés"].forEach(ligne => {
    afficherHistoriqueLigne(ligne);
  });
  afficherHistoriqueArrets();
  afficherHistoriqueOrganisation();
  afficherHistoriquePersonnel();
  majGraphiqueAtelier();
}

function afficherHistoriqueLigne(ligne) {
  const historique = JSON.parse(localStorage.getItem("production")) || [];
  const filtre = historique.filter(item => item.ligne === ligne);
  const div = document.getElementById(`historique_${ligne}`);
  div.innerHTML = filtre.map(e => `<p>${e.date} - Qte ${e.qte}, Restant ${e.restant}, Cadence ${e.cadence}</p>`).join("") || "<p>Aucune donnée</p>";
}

function afficherHistoriqueArrets() {
  const data = JSON.parse(localStorage.getItem("arrets")) || [];
  const div = document.getElementById("historiqueArrets");
  div.innerHTML = data.map(e => `<p>[${e.ligne}] ${e.date} - ${e.motif} (${e.commentaire})</p>`).join("") || "<p>Aucun arrêt</p>";
}

function afficherHistoriqueOrganisation() {
  const data = JSON.parse(localStorage.getItem("organisation")) || [];
  const div = document.getElementById("historiqueOrganisation");
  div.innerHTML = data.map((e,i) =>
    `<p>${e.date} - ${e.texte} 
    <button onclick="validerConsigne(${i})" ${e.valide ? "disabled" : ""}>
      ${e.valide ? "✅" : "Valider"}
    </button></p>`
  ).join("") || "<p>Aucune consigne</p>";
}

function afficherHistoriquePersonnel() {
  const data = JSON.parse(localStorage.getItem("personnel")) || [];
  const div = document.getElementById("historiquePersonnel");
  div.innerHTML = data.map(e => `<p>${e.date} - ${e.nom} : ${e.motif} (${e.commentaire})</p>`).join("") || "<p>Aucun enregistrement</p>";
}

function validerConsigne(index) {
  const data = JSON.parse(localStorage.getItem("organisation")) || [];
  data[index].valide = true;
  localStorage.setItem("organisation", JSON.stringify(data));
  afficherHistoriqueOrganisation();
}

// ----------------------
// Graphique en courbes
// ----------------------
let chartAtelier = null;
function majGraphiqueAtelier() {
  const ctx = document.getElementById("graphiqueAtelier").getContext("2d");
  const data = JSON.parse(localStorage.getItem("production")) || [];

  const lignes = ["Râpé","T2","RT","OMORI","T1","Sticks","Emballage","Dés","Filets","Prédécoupés"];
  const datasets = lignes.map(l => {
    const points = data.filter(e => e.ligne === l).map((e,i) => ({ x: i+1, y: parseFloat(e.qte) || 0 }));
    return {
      label: l,
      data: points,
      fill: false,
      borderColor: `hsl(${Math.random()*360},70%,50%)`,
      tension: 0.3
    };
  });

  if (chartAtelier) chartAtelier.destroy();
  chartAtelier = new Chart(ctx, {
    type: "line",
    data: { datasets },
    options: {
      responsive: true,
      plugins: { legend: { position: "bottom" } },
      scales: {
        x: { title: { display: true, text: "Enregistrements" } },
        y: { title: { display: true, text: "Quantités" } }
      }
    }
  });
}

// ----------------------
// Calculatrice mobile
// ----------------------
function initialiserCalculatrice() {
  const calc = document.getElementById("calculatrice");
  const close = document.getElementById("closeCalc");
  const buttonsDiv = document.getElementById("calcButtons");
  const display = document.getElementById("calcDisplay");
  const symbols = ["7","8","9","/","4","5","6","*","1","2","3","-","0",".","=","+","C"];

  symbols.forEach(sym => {
    const btn = document.createElement("button");
    btn.textContent = sym;
    btn.onclick = () => {
      if (sym === "C") display.value = "";
      else if (sym === "=") display.value = eval(display.value || "0");
      else display.value += sym;
    };
    buttonsDiv.appendChild(btn);
  });

  // bouton flottant
  const bouton = document.createElement("button");
  bouton.textContent = "🧮";
  bouton.style.position = "fixed";
  bouton.style.bottom = "20px";
  bouton.style.left = "20px";
  bouton.style.background = "#007bff";
  bouton.style.color = "white";
  bouton.style.border = "none";
  bouton.style.borderRadius = "50%";
  bouton.style.width = "60px";
  bouton.style.height = "60px";
  bouton.style.fontSize = "24px";
  bouton.style.boxShadow = "0 4px 10px rgba(0,0,0,0.3)";
  bouton.onclick = () => calc.classList.toggle("active");
  document.body.appendChild(bouton);

  close.onclick = () => calc.classList.remove("active");
                          }
