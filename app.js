// Normalise schema-shaped public records (see _src/data) into the fields the UI uses.
(function(){const ML={gold:"Gold",silver:"Silver",platinum:"Platinum",palladium:"Palladium",yellow_metal:"Yellow metal",white_metal:"White metal",base_metal:"Base metal",gold_plated:"Gold-plated",silver_plated:"Silver-plated",steel:"Steel",other:"Other"};
 window.METAL_LABEL=ML;
 PRODUCTS.forEach(p=>{p.id=p.sku;p.name=p.title.website;p.priceGbp=p.price.gbp;const pr=p.price;p.price=pr.gbp;p.priceObj=pr;p.category=p._site.category||"Other";const mo=p.metal;p.metalSrc=mo.metal;p.metalLabelFull=[mo.carat_label,mo.colour&&!['gold_plated','steel'].includes(mo.metal)&&mo.metal=='gold'?mo.colour:'',(mo.carat_label||mo.colour?(ML[mo.metal]||"").toLowerCase():ML[mo.metal])].filter(Boolean).join(' ')+(mo.fineness_ppt?' ('+mo.fineness_ppt+')':'');p.metal=p._site.metal_group;p.metalFamilyLabel=p._site.metal_family_label;p.isSample=p._site.sample;
  p.gender=p._site.audience;p.engagement=p._site.engagement;p.sold=p.status=="sold";p.reserved=p.status=="reserved";p.buyable=p._site.purchasable;p.eraLabel=p.era?p.era.label:"";});
})();
(function(){const byId=id=>PRODUCTS.find(p=>p.id==id);window.__byId=byId;})();
(function(){const byId=window.__byId;
const B=(window.SITE&&SITE.BRAND)||"Trovanni";
document.querySelectorAll(".brand").forEach(e=>e.textContent=B);
if(B!=="Trovanni"){document.title=document.title.replace(/Trovanni/g,B);document.querySelectorAll(".logo").forEach(e=>{e.textContent=B;e.setAttribute("aria-label",B+" home")});}
(function(){const i=(B.trim()[0]||"B").toUpperCase(),l=document.querySelector("link[rel=icon]");if(l&&B!=="Trovanni")l.href="data:image/svg+xml,"+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#161411"/><text x="32" y="45" text-anchor="middle" font-family="Georgia,serif" font-size="40" fill="#f3eee4">${i}</text></svg>`);})();
const gbp=p=>"£"+p.toLocaleString("en-GB");const fmt=p=>gbp(p)+" · sample";
const KEY="bn_basket";
// ---- Ring configurator (schema v5 product_type configurable_ring). All prices come from the data; nothing priced in code. ----
const CFG=p=>p&&p._site&&p._site.configurable?p.configurable:null;
const O=p=>CFG(p).options;
const findM=(p,c)=>O(p).metal.find(x=>x.code==c),findK=(p,k)=>O(p).centre_carat.find(x=>+x.centre_carat==+k),findS=(p,c)=>O(p).stone_type.find(x=>x.code==c);
// Price rule (schema v5): base + metal + carat[stone_type] + stone_type
const cfgPrice=(p,o)=>{const c=CFG(p);return c.base_price_gbp+findM(p,o.metal).price_adjustment_gbp+findK(p,o.carat).price_adjustment_gbp[o.stone]+findS(p,o.stone).price_adjustment_gbp;};
const cfgExcluded=(p,o)=>(CFG(p).excluded_combinations||[]).some(x=>(x.metal=="*"||x.metal==null||x.metal==o.metal)&&(x.centre_carat=="*"||x.centre_carat==null||+x.centre_carat==+o.carat)&&(x.stone_type=="*"||x.stone_type==null||x.stone_type==o.stone));
const cfgOk=(p,o)=>!!(o&&findM(p,o.metal)&&findM(p,o.metal).available!==false&&findK(p,o.carat)&&findS(p,o.stone)&&!cfgExcluded(p,o)&&(!O(p).ring_size_uk||O(p).ring_size_uk.includes(o.size)));
const cfgCombos=p=>{const r=[];O(p).metal.filter(m=>m.available!==false).forEach(m=>O(p).centre_carat.forEach(k=>O(p).stone_type.forEach(s=>{const o={metal:m.code,carat:+k.centre_carat,stone:s.code};if(!cfgExcluded(p,o))r.push(o);})));return r;};
const cfgFrom=p=>Math.min(...cfgCombos(p).map(o=>cfgPrice(p,o)));
const cfgDef=p=>{const d=CFG(p).default_selection;return {metal:d.metal,carat:+d.centre_carat,stone:d.stone_type,size:""};};
const stoneLabel=s=>s.public_name+(s.code=="moissanite"?" (a diamond simulant)":"");
const ct=k=>(+k).toFixed(1)+"ct";
const cfgText=(p,o)=>[findM(p,o.metal).label,ct(o.carat)+" "+stoneLabel(findS(p,o.stone)),o.size?"UK size "+o.size:""].filter(Boolean).join(" · ");
const cfgLead=(p,o)=>{const l=CFG(p).lead_time,x=o?findM(p,o.metal).lead_time_extra_working_days||0:0;return `${l.working_days_min+x}–${l.working_days_max+x} working days${l.is_estimate?" (estimate)":""}${l.includes_uk_hallmarking?", including UK hallmarking":""}`;};
const lineKey=x=>x.id+(x.opts?"|"+x.opts.metal+"|"+x.opts.carat+"|"+x.opts.stone+"|"+(x.opts.size||""):"");
const linePrice=x=>{const p=byId(x.id);return p?(CFG(p)&&x.opts?cfgPrice(p,x.opts):p.price):0;};
const lineName=x=>{const p=byId(x.id);return p?esc0(p.name)+(CFG(p)&&x.opts?`<br><small class="opts">${esc0(cfgText(p,x.opts))}</small>`:"")+(p._site.price_unapproved?' <span class="sample">Preview: price awaiting Tom\'s approval</span>':""):"";};
const esc0=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const UNAPPROVED='<span class="sample unappr">Preview: price awaiting Tom\'s approval</span>';
const get=()=>JSON.parse(localStorage.getItem(KEY)||"[]");
const set=b=>{localStorage.setItem(KEY,JSON.stringify(b));count();};
function count(){const c=get().reduce((a,x)=>a+x.q,0);document.querySelectorAll(".bcount").forEach(e=>e.textContent=c);}
count();
const t=document.querySelector(".navtoggle");if(t)t.onclick=e=>{e.stopPropagation();const o=document.body.classList.toggle("navopen");t.setAttribute("aria-expanded",o);};
document.addEventListener("click",e=>{if(!e.target.closest(".menupanel"))document.body.classList.remove("navopen")});
const st=document.querySelector(".searchtoggle");if(st)st.onclick=()=>{document.body.classList.toggle("searchopen");const i=document.querySelector(".search input");i&&i.focus();};
const ft=document.querySelector(".filtertoggle");if(ft)ft.onclick=()=>{const o=document.body.classList.toggle("filters-open");ft.setAttribute("aria-expanded",o);ft.querySelector("span").textContent=o?"−":"+";};

function card(p){return `<a class="card${p.sold?" is-sold":""}" href="product.html?id=${p.id}">${CFG(p)&&p.photos&&p.photos[0]&&p.photos[0].exists?`<div class="ph cimg"><img src="images/products/${esc0(p.photos[0].src.split("/").pop())}" alt="${esc0(p.photos[0].alt)}" loading="lazy"></div>`:`<div class="ph ph-${p.metal}"><span>Image placeholder</span></div>`}
<div class="cinfo">${p._site.price_unapproved?UNAPPROVED:""}${p._site.image_pending?'<small class="imgpend">Image pending: final photo to follow</small>':""}${p.isSample?'<span class="sample">Sample listing</span>':""}${p.sold?'<span class="sold">Sold</span>':p.reserved?'<span class="sold res">Reserved</span>':""}<small>${p.category} · ${CFG(p)?"Made to order":p.metalFamilyLabel}${p.engagement?(CFG(p)?" · laboratory-grown diamond or moissanite":" · laboratory-grown diamond"):""}</small><h3>${p.name}</h3><b>${CFG(p)?"From "+gbp(cfgFrom(p)):fmt(p.price)}</b></div></a>`;}
window.addToBasket=(id,opts)=>{const pp=byId(id);if(!pp||!pp.buyable)return;const msg=document.querySelector(".addmsg");if(CFG(pp)){opts=opts||cfgDef(pp);if(O(pp).ring_size_uk&&!opts.size)return void(msg&&(msg.textContent="Please choose your ring size."));if(!cfgOk(pp,opts))return void(msg&&(msg.textContent="That combination isn't available. Please choose another."));opts={metal:opts.metal,carat:+opts.carat,stone:opts.stone,size:opts.size};}else opts=undefined;
 const b=get(),k=lineKey({id,opts});const f=b.find(x=>lineKey(x)==k);if(f&&!pp.engagement)return void(msg&&(msg.textContent="Already in your basket: this is a one-of-one piece."));f?f.q++:b.push(opts?{id,q:1,opts}:{id,q:1});set(b);if(msg)msg.textContent="Added to your basket ✓"+(opts?" ("+cfgText(pp,opts)+")":"");};
document.querySelectorAll("[data-grid]").forEach(g=>{
 const k=g.dataset.grid;let l=PRODUCTS;
 if(k=="featured")l=["Chains","Bracelets","Watches","Earrings"].map(c=>PRODUCTS.find(p=>p.category==c&&p.buyable)).filter(Boolean);
 if(k=="men")l=PRODUCTS.filter(p=>p.gender!="women");
 if(k=="women")l=PRODUCTS.filter(p=>p.gender!="men");
 if(k=="engagement")l=PRODUCTS.filter(p=>p.engagement);
 g.innerHTML=l.map(card).join("");});
const sg=document.getElementById("shopgrid");
if(sg){const q=new URLSearchParams(location.search);
 const fc=document.getElementById("fcats"),fm=document.getElementById("fmetals");
 const qc=(q.get("cat")||"").toLowerCase();fc.innerHTML=CATS.map(c=>`<label><input type=checkbox value="${c}" ${qc==c.toLowerCase()?"checked":""}> ${c}</label>`).join("");
 fm.innerHTML=METAL_GROUPS.map(([v,l])=>`<label><input type=checkbox value="${v}"> ${l}</label>`).join("");const fo=document.getElementById("fother");fo.innerHTML=OTHER_METALS.map(([v,l])=>`<label><input type=checkbox value="${v}"> ${l}</label>`).join("");if(!OTHER_METALS.length)document.getElementById("fothermetals").style.display="none";
 const gsel=document.getElementById("fgender");if(q.get("gender"))gsel.value=q.get("gender");
 if(q.get("metal")){const qm=q.get("metal").toLowerCase();document.querySelectorAll("#fmetals input,#fother input").forEach(i=>{i.checked=i.value==qm;if(i.checked&&i.closest("details"))i.closest("details").open=true;});}
 const fq=document.getElementById("fq");fq.value=q.get("q")||"";
 function run(){const cs=[...fc.querySelectorAll(":checked")].map(i=>i.value),ms=[...document.querySelectorAll("#fmetals :checked,#fother :checked")].map(i=>i.value);
  const mn=+document.getElementById("fmin").value||0,mx=+document.getElementById("fmax").value||1e9,gd=gsel.value;
  const qs=fq.value.trim().toLowerCase();const l=PRODUCTS.filter(p=>(!qs||(p.name+" "+p.category+" "+p.metal+" "+p.metalFamilyLabel+" "+p.eraLabel).toLowerCase().includes(qs))&&(!cs.length||cs.includes(p.category))&&(!ms.length||ms.includes(p.metal))&&p.price>=mn&&p.price<=mx&&(!gd||p.gender==gd||p.gender=="unisex"));
  sg.innerHTML=l.length?l.map(card).join(""):"<p>No placeholder products match these filters.</p>";
  document.getElementById("fcount").textContent=l.length+(window.BUILD_MODE=="preview"?" sample items":" items");}
 document.getElementById("filters").addEventListener("input",run);
 document.getElementById("freset").onclick=()=>{document.getElementById("filters").reset();setTimeout(run)};run();}
const pd=document.getElementById("product");
const HS={uk_hallmarked:"UK hallmarked",convention_hallmarked:"Convention hallmarked",exempt_under_weight:"Exempt from hallmarking: under exemption weight",exempt_pre_1950:"Exempt from hallmarking: pre-1950 (evidence held)",unhallmarked_described_as_non_precious:"Unhallmarked: described as non-precious metal",not_applicable:"Not applicable (not precious metal)"};
const EB={hallmark_date_letter:"Hallmark date letter",maker_archive_or_serial:"Maker's archive / serial number",auction_catalogue:"Auction catalogue",original_receipt_or_papers:"Original receipt or papers",style_and_construction_estimate:"Estimate from style and construction",not_applicable_new:"Newly made"};
const OR={natural:"Natural",laboratory_grown:"Laboratory-grown",simulant:"Simulant",treated_natural:"Treated natural",unknown_untested:"Untested (origin unknown)"};
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const row=(k,v)=>v===undefined||v===null||v===""?"":`<tr><th>${k}</th><td>${v}</td></tr>`;
const pid=new URLSearchParams(location.search).get("id");if(pd&&!byId(pid)){pd.innerHTML='<div><h1>Item not found</h1><p>This piece isn\'t available. It may have sold. <a href="shop.html">Browse the shop</a>.</p></div>';}
else if(pd){const p=byId(pid);
 const mm=p.measurements_mm?Object.entries(p.measurements_mm).map(([k,v])=>`${k.replace(/_/g," ")}: ${v} mm`).join(", "):"";
 const h=p.hallmark||{};const hl=[h.sponsor_mark&&"Sponsor's mark "+esc(h.sponsor_mark),h.fineness_mark&&"Fineness "+esc(h.fineness_mark),h.assay_office&&esc(h.assay_office)+" assay office",h.date_letter&&"Date letter "+esc(h.date_letter)+(h.date_letter_year?" ("+h.date_letter_year+")":""),h.convention_mark&&"Convention mark",...(h.other_marks||[]).map(esc)].filter(Boolean).join(" · ");
 const precious=["gold","silver","platinum","palladium"].includes(p.metalSrc);
 const stones=(p.stones||[]).map(s=>`${s.count?s.count+" × ":""}${esc(s.type)} <b>(${OR[s.origin]})</b>${s.approx_carat?", approx. "+s.approx_carat+"ct":""}${s.cut_shape?", "+esc(s.cut_shape):""}`).join("<br>")||"None";
 const lg=p.lab_grown;const w=p.watch;
 const photos=(p.photos||[]).slice().sort((a,b)=>(a.order||0)-(b.order||0));
 const IMG="images/products/";const tile=(ph,big)=>ph&&ph.exists?`<img class="${big?"big":""}" src="${IMG}${esc(ph.src.split("/").pop())}" alt="${esc(ph.alt)}" loading="lazy">`:`<div class="ph ${big?"big":""} ph-${p.metal}" title="${ph?esc(ph.src):""}"><span>${ph?String(ph.order).padStart(2,"0")+" · "+esc(ph.type):"Photo"}${big?" placeholder":""}</span></div>`;
 pd.innerHTML=`<div class="gallery">${tile(photos[0],true)}<div class="thumbs">${photos.slice(1,12).map(ph=>tile(ph)).join("")}</div>
 ${lg?'<p class="note">Images show a sample of this design; your ring is made to order.</p>':""}${p._site.image_pending?'<p class="note imgpend">Image pending: this supplier image will be replaced with a final photo.</p>':""}</div>
 <div class="pinfo">${p._site.price_unapproved?UNAPPROVED:""}${p.isSample?'<span class="sample">Sample listing · fake values</span>':""}${p.sold?'<span class="sold">Sold</span>':p.reserved?'<span class="sold res">Reserved</span>':""}<small>${p.category} · ${CFG(p)?"made to order in your choice of metal":esc(p.metalLabelFull)}</small><h1>${esc(p.name)}</h1>
 ${CFG(p)?cfgForm(p):`<p class="price">${p.sold?'<s>'+fmt(p.price)+'</s> Sold':fmt(p.price)}</p>`}
 ${p.story?`<p>${esc(p.story)}</p>`:""}
 ${CFG(p)?`${p.channel_copy&&p.channel_copy.website_description?`<p>${esc(p.channel_copy.website_description)}</p>`:""}<div class="lgbox"><b>Made to order</b><table>${row("Lead time",`<span id="cfglead">${cfgLead(p,cfgDef(p))}</span>`)}${row("Hallmarking",`<span id="cfghall"></span>`)}${row("Laboratory-grown diamond","Comes with an independent grading report ("+O(p).stone_type.filter(s=>s.code=="laboratory_grown_diamond").map(s=>s.certificate.labs.join(" or ")).join("")+"), issued for your stone")}${row("Moissanite","A diamond simulant: a different gemstone, not a diamond")}${row("Returns","14-day returns on standard options")}</table></div>`:lg?`<div class="lgbox"><b>Laboratory-grown diamond</b><table>${row("Grading report",esc(lg.certificate.lab)+" report no. "+esc(lg.certificate.report_number))}${row("Carat",lg.four_cs.carat.toFixed(2)+"ct")}${row("Colour",esc(lg.four_cs.colour))}${row("Clarity",esc(lg.four_cs.clarity))}${row("Cut",esc(lg.four_cs.cut||"Not graded"))}${row("Shape",esc(lg.four_cs.shape))}${row("Growth method",esc(lg.certificate.growth_method))}${row("Setting",esc(lg.setting_style))}
   ${row("Made to order",`Made for you: dispatched in ${lg.made_to_order.lead_time_working_days_min}–${lg.made_to_order.lead_time_working_days_max} working days${lg.made_to_order.includes_hallmarking_time?" (includes hallmarking)":""}`)}${row("Sizes",(lg.available_sizes_uk||[]).join(", "))}</table></div>`:""}
 <table>
 ${row("Era",esc(p.eraLabel)+(p.era&&p.era.is_estimate?" (estimated)":""))}${row("Era evidence",p.era?EB[p.era.evidence_basis]:"")}
 ${row("Maker",p.maker?esc(p.maker.name):"")}
 ${row("Condition",`<b>${esc(p.condition.grade)}</b>${p.condition.notes?" · "+esc(p.condition.notes):""} <a href="shipping.html#grades">grading guide</a>`)}
 ${CFG(p)?"":row("Metal",esc(p.metalLabelFull))+row("Metal family",esc(p.metalFamilyLabel))}${row("Hallmark status",esc(p.hallmark_status_public||HS[h.status]))}${row("Hallmark details",hl)}
 ${row("Weight",p.weight_g!=null?p.weight_g.toFixed(2)+" g":"")}${row("Measurements",mm)}
 ${row("Ring size",p.ring_size?"UK "+esc(p.ring_size.uk)+(p.ring_size.resizable?" · resizable"+(p.ring_size.resize_notes?" ("+esc(p.ring_size.resize_notes)+")":""):" · not resizable"):"")}
 ${row("Chain",p.chain?`${p.chain.length_cm}cm / ${p.chain.length_in}in, ${p.chain.width_mm}mm, ${esc(p.chain.link_style)}, ${esc(p.chain.clasp)}`:"")}
 ${CFG(p)?"":row("Stones",stones)}${CFG(p)?"":row("Repairs / alterations",(p.repairs_alterations||[]).length?p.repairs_alterations.map(esc).join("; "):"None known")}
 ${w?row("Movement",esc(w.movement)+(w.calibre?", "+esc(w.calibre):""))+row("Case",esc(w.case_material)+", "+w.case_diameter_mm+" mm (excl. crown)")+row("Dial",esc(w.dial))+row("Service history",esc(w.service_history.status))+row("Running",w.running.is_running?"Yes ("+esc(w.running.test_method.replace(/_/g," "))+")":"No")+row("Box / papers",(w.box?"Box":"No box")+" · "+(w.papers?"papers":"no papers"))+row("Water resistance",esc(w.water_resistance)):""}
 </table>
 ${p.buyable?`<button class="btn" onclick="addToBasket('${p.id}',window.__cfgSel)">Add to basket</button> <a class="btn alt" href="basket.html">View basket</a>`:`<button class="btn" disabled>${p.sold?"Sold":"Reserved"}</button> <a class="btn alt" href="shop.html">Browse similar</a>`}<p class="addmsg note"></p>
 ${p.returns_exempt_personalised?'<div class="returns personal"><b>Personalised / made to your specification.</b> '+(p.personalisation_summary_public?esc(p.personalisation_summary_public)+". ":"")+'Because this ring is made to the buyer\'s own specification, the 14-day change-of-mind returns right does not apply. Your statutory rights for faulty or not-as-described items are unaffected. <a href="shipping.html#returns">Returns policy</a>.</div>':`<div class="returns"><b>14-day returns.</b> Change your mind within 14 days of delivery and send it back for a refund. ${lg?"Standard-size made-to-order rings are covered too. ":""}[Return postage: to be confirmed]. <a href="shipping.html#returns">Full returns policy</a>.</div>`}
 ${precious?'<div class="dn"><b>Hallmarking.</b> We display the official Dealer\'s Notice explaining UK hallmarks. <a href="dealers-notice.html">View the Dealer\'s Notice</a>.</div>':""}
 ${p.isSample?'<p class="note">Sample listing: all details are fictional.</p>':""}</div>`;}
if(pd&&byId(pid)&&CFG(byId(pid)))cfgWire(byId(pid));
function cfgForm(p){const o=O(p),d=cfgDef(p);const rad=(n,v,l,ck)=>`<label class="opt"><input type=radio name="${n}" value="${esc0(v)}" ${ck?"checked":""}> <span>${esc0(l)}</span></label>`;
 return `<form class="cfg" id="cfg" onsubmit="return false"><p class="price" id="cfgprice" aria-live="polite"></p><p class="note">From ${gbp(cfgFrom(p))} · price updates as you choose</p>
 <fieldset><legend>Metal</legend>${o.metal.filter(m=>m.available!==false).map(m=>rad("metal",m.code,m.label,m.code==d.metal)).join("")}</fieldset>
 <fieldset><legend>Centre stone</legend>${o.stone_type.map(s=>rad("stone",s.code,stoneLabel(s),s.code==d.stone)).join("")}</fieldset>
 <fieldset><legend>Centre-stone carat</legend>${o.centre_carat.map(k=>rad("carat",+k.centre_carat,ct(k.centre_carat),+k.centre_carat==d.carat)).join("")}</fieldset>
 ${o.ring_size_uk?`<fieldset><legend>Ring size (UK)</legend><select name="size" aria-label="Ring size (UK)"><option value="">Choose size</option>${o.ring_size_uk.map(z=>`<option>${esc0(z)}</option>`).join("")}</select></fieldset>`:""}
 <p class="cfgsum note" id="cfgsum"></p><p class="note cfgx" id="cfgx"></p></form>`;}
function cfgWire(p){const f=document.getElementById("cfg");document.body.classList.add("ring-page");document.querySelectorAll(".vtag").forEach(e=>e.remove());
 const HR={uk_hallmark_required:"UK hallmarked before dispatch",uk_hallmark_required_if_over_exemption_weight:"UK hallmarked if over the exemption weight"};
 const sel=()=>({metal:f.metal.value,carat:+f.carat.value,stone:f.stone.value,size:f.size?f.size.value:""});
 const upd=()=>{const o=sel();
  // disable any option that would make an excluded combination with the other current choices
  const why=[];[["metal",v=>({...o,metal:v})],["carat",v=>({...o,carat:+v})],["stone",v=>({...o,stone:v})]].forEach(([n,mk])=>f.querySelectorAll(`input[name=${n}]`).forEach(i=>{const x=cfgExcluded(p,mk(i.value));i.disabled=x;i.closest("label").classList.toggle("off",x);}));
  if(cfgExcluded(p,o)){const c=cfgCombos(p).find(c=>c.metal==o.metal&&c.stone==o.stone)||cfgCombos(p)[0];f.querySelector(`input[name=carat][value="${c.carat}"]`).checked=true;return upd();}
  const g={};(CFG(p).excluded_combinations||[]).filter(x=>x.metal==o.metal||+x.centre_carat==o.carat).forEach(x=>{const m=findM(p,x.metal);if(m)(g[m.label]=g[m.label]||[]).push(ct(x.centre_carat));});
  const ex=Object.entries(g).map(([m,k])=>m+" isn't available with "+k.join(" or ")+" centre stones");
  window.__cfgSel=o;document.getElementById("cfgprice").textContent=gbp(cfgPrice(p,o));document.getElementById("cfgsum").textContent="Your ring: "+cfgText(p,o);
  document.getElementById("cfgx").textContent=[...new Set(ex)].filter(Boolean).join(". ")+(ex.length?" (to be confirmed with our workshop).":"");
  document.getElementById("cfglead").textContent=cfgLead(p,o);const h=findM(p,o.metal).hallmark||{};document.getElementById("cfghall").textContent=HR[h.requirement]||"";};
 f.addEventListener("change",upd);upd();}
const bk=document.getElementById("basket");
function rb(){let b=get();const nb=b.filter(x=>{const p=byId(x.id);return p&&p.buyable&&(!CFG(p)||cfgOk(p,x.opts))});if(nb.length!=b.length){set(nb);b=nb;}if(!b.length){bk.innerHTML="<p>Your basket is empty. <a href='shop.html'>Browse the shop</a>.</p>";return;}
 let tot=0;bk.innerHTML="<table class=btable>"+b.map(x=>{const p=byId(x.id);if(!p)return"";const lp=linePrice(x);tot+=lp*x.q;const k=esc0(lineKey(x));
 return `<tr><td>${lineName(x)}</td><td><input type=number min=1 value=${x.q} data-key="${k}" class=qty aria-label="Quantity"></td><td>${(byId(x.id)&&CFG(byId(x.id))?gbp:fmt)(lp*x.q)}</td><td><button data-rm="${k}">Remove</button></td></tr>`}).join("")+
 `</table><p class=total>Subtotal: ${fmt(tot)}</p><p class=note>Shipping chosen at checkout.</p><a class="btn" href="checkout.html">Go to mock checkout</a>`;
 bk.querySelectorAll(".qty").forEach(i=>i.onchange=()=>{const b=get();b.find(x=>lineKey(x)==i.dataset.key).q=Math.max(1,+i.value);set(b);rb();});
 bk.querySelectorAll("[data-rm]").forEach(r=>r.onclick=()=>{set(get().filter(x=>lineKey(x)!=r.dataset.rm));rb();});}
if(bk)rb();
const co=document.getElementById("checkout");
if(co){const PAY=SITE.payments,b=get();let sub=0;b.forEach(x=>{sub+=linePrice(x)*x.q});
 document.getElementById("shipopts").innerHTML=SITE.shipping.map((s,i)=>`<label class=opt><input type=radio name=ship value="${s.id}" ${i?"":"checked"}> ${s.label} <b>${s.price?gbp(s.price):"Free"}</b></label>`).join("");
 const lines=document.getElementById("colines");
 function upd(){const s=SITE.shipping.find(x=>x.id==co.ship.value);lines.innerHTML=b.map(x=>{return byId(x.id)?`<div class=row><span>${lineName(x)} × ${x.q}</span><span>${gbp(linePrice(x)*x.q)}</span></div>`:""}).join("")+`<div class=row><span>Shipping</span><span>${s.price?gbp(s.price):"Free"}</span></div><div class="row total"><span>Total (sample)</span><span>${gbp(sub+s.price)}</span></div>`;return sub+s.price;}
 co.addEventListener("change",upd);upd();
 if(!b.length)lines.innerHTML="<p>Your basket is empty.</p>";
 // ---- Payment stubs. Real integration goes here (see README.md) ----
 const handlers={
  stripe:o=>{ /* LIVE: redirect to SITE.payments.stripe.paymentLinks[id] or a server-created Checkout Session. */ return Promise.resolve({provider:"Stripe (test mode mock)",ref:"TEST-ST-"+Date.now().toString(36)}); },
  paypal:o=>{ /* LIVE: load PayPal JS SDK with SITE.payments.paypal.clientId and render buttons; capture server-side. */ return Promise.resolve({provider:"PayPal (sandbox mock)",ref:"TEST-PP-"+Date.now().toString(36)}); }};
 co.onsubmit=e=>{e.preventDefault();if(!b.length)return;const tot=upd();
  handlers[co.pay.value]({total:tot,currency:"GBP",items:b}).then(r=>{
   localStorage.setItem("bn_lastorder",JSON.stringify({...r,total:tot,items:b.map(x=>({...x,unit_gbp:linePrice(x)})),name:co.fullname.value,ship:co.ship.value}));localStorage.removeItem(KEY);location.href="order-confirmation.html";});};}
const oc=document.getElementById("confirm");
if(oc){const o=JSON.parse(localStorage.getItem("bn_lastorder")||"null");
 oc.innerHTML=o?`<p>Thanks${o.name?", "+o.name:""}. This is a <b>mock confirmation</b>: no payment was taken and no order exists.</p><table><tr><th>Mock reference</th><td>${o.ref}</td></tr><tr><th>Paid via</th><td>${o.provider}</td></tr><tr><th>Total</th><td>${gbp(o.total)} (sample)</td></tr></table>`+o.items.map(x=>byId(x.id)?`<p>${lineName(x)} × ${x.q}</p>`:"").join(""):"<p>No mock order found.</p>";}
const cf=document.getElementById("contactform");if(cf)cf.onsubmit=e=>{e.preventDefault();cf.innerHTML="<p class=mock>Prototype only: this form doesn't send anything yet.</p>";};
})();
