
(function(){
  async function loadJSON(url){
    const r=await fetch(url,{cache:"no-store"});
    const d=await r.json();
    if(!r.ok || d.success===false) throw new Error(d.error||"Request failed");
    return d;
  }
  const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));

  async function init(){
    const oldHeader=document.querySelector("header");
    const oldSearch=document.querySelector(".search-section");
    const oldFooter=document.querySelector("footer");

    // Prevent duplicate shells.
    if(oldHeader && oldHeader.closest(".ml-shell")) return;

    const shell=document.createElement("div");
    shell.className="ml-shell";
    shell.innerHTML=`
      <header class="ml-top-header">
        <div class="ml-header-main">
          <div class="ml-container ml-header-inner">
            <div>
              <div class="ml-logo">मैथिली समाचार</div>
              <div class="ml-tagline">मैथिली भाषामे नवीनतम समाचार</div>
            </div>
          </div>
        </div>
        <nav class="ml-nav">
          <button class="ml-menu-toggle" id="mlMenuToggle" aria-expanded="false">☰ मेनू</button>
          <div class="ml-container ml-nav-inner" id="mlCategoryNav">
            <a href="/" class="ml-nav-link active">सभ समाचार</a>
            <span style="padding:10px 15px;color:#ddd">श्रेणी लोड भ' रहल अछि...</span>
          </div>
        </nav>
      </header>
      <section class="ml-search">
        <div class="ml-container">
          <form class="ml-search-row" id="mlSearchForm">
            <input id="mlSearchInput" placeholder="समाचार ताकू..." aria-label="समाचार ताकू">
            <button type="submit">ताकू</button>
          </form>
        </div>
      </section>
      <footer class="ml-footer">
        <div class="ml-container ml-footer-grid">
          <section>
            <img id="mlFooterLogo" class="ml-footer-logo" alt="लोगो">
            <h3 id="mlFooterName">मैथिली समाचार</h3>
            <h3>हमर विषय मे</h3>
            <p id="mlFooterAbout">मैथिली भाषामे ताजा आ विश्वसनीय समाचार।</p>
          </section>
          <section>
            <h3>महत्वपूर्ण लिंक</h3>
            <a href="/about">हमर विषय मे</a>
            <a href="/contact">सम्पर्क करू</a>
            <a href="/privacy-policy">गोपनीयता नीति</a>
            <a href="/terms">नियम आ शर्त</a>
          </section>
          <section>
            <h3>सामाजिक साइट</h3>
            <div id="mlSocialLinks"><span style="color:#aaa;font-size:13px">सामाजिक लिंक</span></div>
          </section>
        </div>
        <div class="ml-footer-bottom" id="mlCopyright">© 2026 मैथिली समाचार</div>
      </footer>`;

    // Replace old header/search/footer, leaving main content untouched.
    if(oldHeader) oldHeader.replaceWith(shell.querySelector(".ml-top-header"));
    else document.body.prepend(shell.querySelector(".ml-top-header"));
    if(oldSearch) oldSearch.replaceWith(shell.querySelector(".ml-search"));
    else {
      const main=document.querySelector("main");
      if(main) main.parentNode.insertBefore(shell.querySelector(".ml-search"),main);
    }
    if(oldFooter) oldFooter.replaceWith(shell.querySelector(".ml-footer"));
    else document.body.appendChild(shell.querySelector(".ml-footer"));

    const nav=document.getElementById("mlCategoryNav");
    try{
      const d=await loadJSON("/api/categories?status=active");
      const cats=(d.categories||[])
        .filter(c=>Number(c.menu_visible ?? c.show_in_menu ?? 1)===1)
        .sort((a,b)=>Number(a.menu_order||0)-Number(b.menu_order||0));
      nav.innerHTML="";
      const home=document.createElement("a");
      home.href="/";home.className="ml-nav-link";
      home.textContent="सभ समाचार";
      if(location.pathname==="/" || location.pathname==="/index.html") home.classList.add("active");
      nav.appendChild(home);

      cats.filter(c=>!c.parent_id || Number(c.parent_id)===0).forEach(c=>{
        if(!c.slug) return;
        const kids=cats.filter(x=>Number(x.parent_id||0)===Number(c.id))
          .sort((a,b)=>Number(a.menu_order||0)-Number(b.menu_order||0));
        const g=document.createElement("div");g.className="ml-nav-group";
        const a=document.createElement("a");a.href="/category/"+encodeURIComponent(c.slug);a.className="ml-nav-link";
        a.textContent=c.name||"श्रेणी";
        if(kids.length){a.innerHTML=esc(c.name)+" <span>▾</span>";}
        if(location.pathname.replace(/\/+$/,"")==="/category/"+c.slug) a.classList.add("active");
        g.appendChild(a);
        if(kids.length){
          const sub=document.createElement("div");sub.className="ml-submenu";
          kids.forEach(x=>{
            if(!x.slug)return;
            const sa=document.createElement("a");sa.href="/category/"+encodeURIComponent(x.slug);sa.textContent=x.name||"उप-श्रेणी";
            sub.appendChild(sa);
          });
          g.appendChild(sub);
          a.addEventListener("click",e=>{
            if(window.innerWidth<=600){e.preventDefault();g.classList.toggle("open");}
          });
        }
        nav.appendChild(g);
      });
    }catch(e){
      nav.innerHTML='<a href="/" class="ml-nav-link active">सभ समाचार</a>';
      console.error("MithilaLive menu load:",e);
    }

    const toggle=document.getElementById("mlMenuToggle");
    toggle?.addEventListener("click",()=>{
      nav.classList.toggle("mobile-open");
      toggle.setAttribute("aria-expanded",String(nav.classList.contains("mobile-open")));
    });
    document.getElementById("mlSearchForm")?.addEventListener("submit",e=>{
      e.preventDefault();
      const q=document.getElementById("mlSearchInput").value.trim();
      if(q) location.href="/?search="+encodeURIComponent(q);
    });

    try{
      const d=await loadJSON("/api/settings"),s=d.settings||{};
      if(s.site_name)document.getElementById("mlFooterName").textContent=s.site_name;
      if(s.footer_about)document.getElementById("mlFooterAbout").textContent=s.footer_about;
      if(s.logo_url){
        const l=document.getElementById("mlFooterLogo");l.src=s.logo_url;l.style.display="block";
      }
      if(s.footer_copyright||s.copyright)document.getElementById("mlCopyright").textContent=s.footer_copyright||s.copyright;
      const social=document.getElementById("mlSocialLinks");
      if(Array.isArray(s.social_links) && s.social_links.length){
        social.innerHTML=s.social_links.map(x=>`<a href="${esc(x.url||"#")}" target="_blank" rel="noopener">${esc(x.name||"Social")}</a>`).join("");
      }
    }catch(e){console.warn("MithilaLive footer settings:",e)}
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();
