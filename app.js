// === INITIALISATION ===
document.addEventListener("DOMContentLoaded", () => {
  updateDateTime();
  setInterval(updateDateTime, 1000);

  // Navigation
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => showPage(btn.dataset.page));
  });

  // Clonage dynamique des pages lignes
  const lignes = ["T2","RT","Omori","T1","Sticks","Emballage","Dés","Filets","Prédécoupés"];
  const ref = document.getElementById("rapé");
  lignes.forEach(nom => {
    const clone = ref.cloneNode(true);
    clone.id = nom.toLowerCase();
    clone.querySelector("h2").textContent = `Ligne ${nom}`;
    clone.querySelector(".bloc-ligne").dataset.ligne = nom;
    document.getElementById("content").appendChild(clone);
  });

  // Gestion événements
  document.querySelectorAll(".btn-enregistrer").forEach(b => b.addEventListener("click", saveLigne));
  document.getElementById("exportExcel").addEventListener("click", exportExcel);
  document.getElementById("saveArret").addEventListener("click", saveArret);
  document.getElementById("saveConsigne").addEventListener("click", saveConsigne);
  document.getElementById("savePersonnel").addEventListener("click", savePersonnel);

  // Données initiales
  loadAll();
});

// === DATE ET HEURE ===
function updateDateTime() {
  const now = new Date();
  document.getElementById("dateTime").textContent = now.toLocaleString("fr-FR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
}

// === NAVIGATION ===
function showPage(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

// === LIGNES ===
function saveLigne(e) {
  const bloc = e.target.closest(".bloc-ligne");
  const ligne = bloc.dataset.ligne;
  const debut = bloc.querySelector(".heure-debut").value;
  const fin = bloc.querySelector(".heure-fin").value;
  const qte = parseFloat(bloc.querySelector(".quantite-realisee").value) || 0;
  const restant = parseFloat(bloc.querySelector(".quantite-restante").value) || 0;
  const cadenceManu = parseFloat(bloc.querySelector(".cadence-manuelle").value) || 0;
  let cadenceCalc = 0;

  if (debut && fin && qte > 0) {
    const [h1,m1] = debut.split(":").map(Number);
    const [h2,m2] = fin.split(":").map(Number);
    let diff = (h2*60+m2)-(h1*60+m1);
    if (diff<=0) diff+=1440;
    cadenceCalc = (qte/diff)*60;
  } else if (cadenceManu>0) {
    cadenceCalc = cadenceManu;
  }

  bloc.querySelector(".cadence-calculee").textContent = cadenceCalc.toFixed(1);

  // Temps restant
  if (restant>0 && cadenceCalc>0) {
    const tempsH = restant/cadenceCalc;
    const h = Math.floor(tempsH);
    const m = Math.round((tempsH-h)*60);
    bloc.querySelector(".fin-estimee").textContent = `${h}h ${m}min restantes`;
  }

  const data = {
    date: new Date().toLocaleString("fr-FR"),
    debut, fin, qte, restant,
    cadence: cadenceCalc
  };
  const hist = JSON.parse(localStorage.getItem("ligne_"+ligne))||[];
  hist.push(data);
  localStorage.setItem("ligne_"+ligne,JSON.stringify(hist));
  afficherHistoriqueLigne(bloc,ligne);
  bloc.querySelectorAll("input").forEach(i=>i.value="");
}

function afficherHistoriqueLigne(bloc,ligne) {
  const hist = JSON.parse(localStorage.getItem("ligne_"+ligne))||[];
  const ul = bloc.parentElement.querySelector(".historique-ligne");
  ul.innerHTML = hist.map(h=>`<li>${h.date} — ${h.qte} colis — ${h.cadence.toFixed(1)} c/h</li>`).join("")||"<li>Aucun enregistrement</li>";

  // Graphe
  const ctx = bloc.parentElement.querySelector(".graph-ligne");
  if(!ctx) return;
  const labels = hist.map(h=>h.date.split(" ")[1]);
  const data = hist.map(h=>h.cadence);
  new Chart(ctx, {
    type: "line",
    data: { labels, datasets:[{ label:"Cadence", data, borderColor:"#0078d7", tension:0.3, fill:false }] },
    options:{ responsive:true, plugins:{legend:{display:false}} }
  });
}

// === ARRÊTS ===
function saveArret(){
  const ligne=document.getElementById("arret-ligne").value;
  const type=document.getElementById("arret-type").value;
  const com=document.getElementById("arret-commentaire").value.trim();
  if(!ligne||!type||!com) return alert("Renseignez tous les champs.");
  const hist=JSON.parse(localStorage.getItem("arrets"))||[];
  hist.push({date:new Date().toLocaleString("fr-FR"),ligne,type,com});
  localStorage.setItem("arrets",JSON.stringify(hist));
  document.getElementById("arret-commentaire").value="";
  afficherArrets();
}
function afficherArrets(){
  const data=JSON.parse(localStorage.getItem("arrets"))||[];
  const ul=document.getElementById("historiqueArrets");
  ul.innerHTML=data.map(a=>`<li>${a.date} — ${a.ligne} (${a.type}) : ${a.com}</li>`).join("")||"<li>Aucun arrêt</li>";
}

// === CONSIGNES ===
function saveConsigne(){
  const txt=document.getElementById("nouvelleConsigne").value.trim();
  const real=document.getElementById("consigneRealisee").checked;
  if(!txt) return alert("Saisissez une consigne.");
  const hist=JSON.parse(localStorage.getItem("consignes"))||[];
  hist.push({date:new Date().toLocaleString("fr-FR"),txt,real});
  localStorage.setItem("consignes",JSON.stringify(hist));
  document.getElementById("nouvelleConsigne").value="";
  document.getElementById("consigneRealisee").checked=false;
  afficherConsignes();
}
function afficherConsignes(){
  const hist=JSON.parse(localStorage.getItem("consignes"))||[];
  const ul=document.getElementById("historiqueConsignes");
  ul.innerHTML=hist.map(c=>`<li>${c.date} — ${c.txt} ${c.real?"✅":"❌"}</li>`).join("")||"<li>Aucune consigne</li>";
}

// === PERSONNEL ===
function savePersonnel(){
  const nom=document.getElementById("nomPersonnel").value.trim();
  const motif=document.getElementById("motifPersonnel").value.trim();
  const com=document.getElementById("commentairePersonnel").value.trim();
  if(!nom||!motif) return alert("Complétez les champs Nom et Motif.");
  const hist=JSON.parse(localStorage.getItem("personnel"))||[];
  hist.push({date:new Date().toLocaleString("fr-FR"),nom,motif,com});
  localStorage.setItem("personnel",JSON.stringify(hist));
  document.getElementById("nomPersonnel").value="";
  document.getElementById("motifPersonnel").value="";
  document.getElementById("commentairePersonnel").value="";
  afficherPersonnel();
}
function afficherPersonnel(){
  const hist=JSON.parse(localStorage.getItem("personnel"))||[];
  const ul=document.getElementById("historiquePersonnel");
  ul.innerHTML=hist.map(p=>`<li>${p.date} — ${p.nom} (${p.motif}) : ${p.com}</li>`).join("")||"<li>Aucun enregistrement</li>";
}

// === EXPORT EXCEL ===
function exportExcel(){
  const wb=XLSX.utils.book_new();
  const all={
    Production:collect("ligne_"),
    Arrets:JSON.parse(localStorage.getItem("arrets"))||[],
    Consignes:JSON.parse(localStorage.getItem("consignes"))||[],
    Personnel:JSON.parse(localStorage.getItem("personnel"))||[]
  };
  for(const [n,arr] of Object.entries(all)){
    const ws=XLSX.utils.json_to_sheet(arr);
    XLSX.utils.book_append_sheet(wb,ws,n);
  }
  XLSX.writeFile(wb,`Atelier_PPNC_${new Date().toLocaleDateString("fr-FR").replace(/\//g,"-")}.xlsx`);
}
function collect(prefix){
  const all=[];
  for(const k in localStorage){
    if(k.startsWith(prefix)){
      const arr=JSON.parse(localStorage.getItem(k))||[];
      arr.forEach(a=>all.push({ligne:k.replace(prefix,""),...a}));
    }
  }
  return all;
}

// === PAGE ATELIER ===
function afficherAtelier(){
  const ctx=document.getElementById("atelierChart");
  if(!ctx) return;
  const datasets=[];
  const couleurs=["#0078d7","#00a2ff","#0094d8","#0082c3","#006bb0","#005fa3","#004c99","#003f8a","#002d72","#0069a5"];
  const lignes=["Râpé","T2","RT","Omori","T1","Sticks","Emballage","Dés","Filets","Prédécoupés"];
  lignes.forEach((l,i)=>{
    const data=JSON.parse(localStorage.getItem("ligne_"+l))||[];
    const labels=data.map(d=>d.date.split(" ")[1]);
    const valeurs=data.map(d=>d.cadence);
    datasets.push({label:l,data:valeurs,borderColor:couleurs[i],fill:false,tension:0.3});
  });
  new Chart(ctx,{type:"line",data:{labels:[],datasets},options:{responsive:true,plugins:{legend:{position:"bottom"}}}});
}

// === INITIALISATION DES HISTORIQUES ===
function loadAll(){
  afficherArrets();
  afficherConsignes();
  afficherPersonnel();
  afficherAtelier();
}
