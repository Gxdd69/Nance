
(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const escapeHTML = (value = "") => String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));

  const storage = {
    get(key, fallback) {
      try {
        const value = localStorage.getItem("nance_" + key);
        return value ? JSON.parse(value) : fallback;
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem("nance_" + key, JSON.stringify(value));
      } catch {
        toast("Browser storage is unavailable. Your change may not be saved.", true);
      }
    }
  };

  const talent = [
    { id:"e1", name:"Aarav Mehta", role:"editor", title:"Video Editor & Motion Designer", initials:"AM", specialty:["Motion Graphics","Brand Films"], bio:"Cinematic edits, clean typography and motion-led storytelling for brands and creators.", rate:2500, unit:"project", featured:true },
    { id:"e2", name:"Riya Shah", role:"editor", title:"Short-Form Video Editor", initials:"RS", specialty:["Reels","Motion Graphics"], bio:"Fast-paced reels, sharp hooks, smooth transitions and engaging social-first edits.", rate:1200, unit:"reel", featured:true },
    { id:"c1", name:"Mira Kapoor", role:"creator", title:"Lifestyle & Fashion Creator", initials:"MK", specialty:["Lifestyle"], bio:"Lifestyle storytelling, fashion content and relatable brand integrations.", rate:8000, unit:"campaign", featured:true },
    { id:"e3", name:"Dev Patel", role:"editor", title:"YouTube & Documentary Editor", initials:"DP", specialty:["Brand Films"], bio:"Long-form storytelling, interviews, colour grading and polished final cuts.", rate:5000, unit:"video", featured:true },
    { id:"c2", name:"Ananya Desai", role:"creator", title:"Fitness & Wellness Creator", initials:"AD", specialty:["Fitness"], bio:"Fitness routines, wellness education and authentic product-led content.", rate:6000, unit:"campaign", featured:true },
    { id:"e4", name:"Kabir Joshi", role:"editor", title:"Reels & Social Media Editor", initials:"KJ", specialty:["Reels"], bio:"Social-first editing with subtitles, rhythm, punchy cuts and clear storytelling.", rate:1000, unit:"reel", featured:true }
  ];

  const initialProjects = [
    { id:"p1", title:"30 Instagram Reels for a Fitness Brand", category:"editing", categoryLabel:"VIDEO EDITING", description:"Looking for an editor for short fitness reels with clean subtitles, punchy cuts and simple motion graphics.", budget:18000, timeline:"Monthly", owner:"FitLife Studio", ownerType:"Brand", skills:["Reels","Subtitles","Motion Graphics"], featured:true, createdAt:1 },
    { id:"p2", title:"YouTube Video Editor Needed", category:"editing", categoryLabel:"VIDEO EDITING", description:"Need an editor for engaging 8–12 minute YouTube videos with B-roll, sound design and storytelling.", budget:5000, timeline:"Per video", owner:"Independent Creator", ownerType:"Creator", skills:["YouTube","B-roll","Sound design"], featured:true, createdAt:2 },
    { id:"p3", title:"Lifestyle Creator for Product Launch", category:"creator", categoryLabel:"CREATOR CAMPAIGN", description:"Seeking lifestyle creators for a product launch. Share your portfolio, audience profile and proposal.", budget:12000, timeline:"2 weeks", owner:"Studio North", ownerType:"Brand", skills:["Lifestyle","Instagram","UGC"], featured:true, createdAt:3 },
    { id:"p4", title:"Brand Intro Motion Graphics", category:"design", categoryLabel:"MOTION & DESIGN", description:"Create a polished 15-second brand intro with animated typography and a premium visual finish.", budget:7000, timeline:"1 week", owner:"NOVA Creative", ownerType:"Agency", skills:["Motion Graphics","Typography","After Effects"], featured:true, createdAt:4 }
  ];

  let projects = storage.get("projects", initialProjects);
  let proposals = storage.get("proposals", []);
  let applications = storage.get("applications", []);
  let talentFilter = "all";
  let projectFilter = "all";
  let activeRole = "client";

  const money = value => "₹" + Number(value || 0).toLocaleString("en-IN");

  function toast(message, isError = false) {
    const container = $("#toastContainer");
    if (!container) return;
    const node = document.createElement("div");
    node.className = "toast" + (isError ? " error" : "");
    node.textContent = message;
    container.appendChild(node);
    setTimeout(() => node.remove(), 3500);
  }

  function saveData() {
    storage.set("projects", projects);
    storage.set("proposals", proposals);
    storage.set("applications", applications);
  }

  function renderTalent() {
    const grid = $("#talentGrid");
    if (!grid) return;

    const query = ($("#talentSearch")?.value || "").trim().toLowerCase();
    const type = $("#talentType")?.value || "all";
    const specialty = $("#talentSpecialty")?.value || "all";

    const results = talent.filter(person => {
      const text = [person.name, person.title, person.bio, ...person.specialty].join(" ").toLowerCase();
      return (type === "all" || person.role === type)
        && (specialty === "all" || person.specialty.includes(specialty))
        && (!query || text.includes(query));
    });

    grid.innerHTML = results.length ? results.map(person => `
      <article class="talent-card">
        <div class="talent-top">
          <div class="talent-avatar ${person.role === "creator" ? "creator" : ""}">${escapeHTML(person.initials)}</div>
          <div class="talent-info">
            <h3>${escapeHTML(person.name)} <span class="verified">✦</span></h3>
            <p>${escapeHTML(person.title)}</p>
          </div>
        </div>
        <p class="talent-bio">${escapeHTML(person.bio)}</p>
        <div class="tag-list">${person.specialty.map(tag => `<span class="tag">${escapeHTML(tag)}</span>`).join("")}</div>
        <div class="talent-bottom">
          <div class="talent-rate">${money(person.rate)}<small>per ${escapeHTML(person.unit)}</small></div>
          <button class="btn btn-outline" data-action="contactTalent" data-id="${person.id}">View profile ↗</button>
        </div>
      </article>
    `).join("") : `<div class="empty-state"><strong>No matching talent yet</strong>Try a different search or filter.</div>`;
  }

  function renderProjects() {
    const grid = $("#projectsGrid");
    if (!grid) return;

    const query = ($("#projectSearch")?.value || "").trim().toLowerCase();
    const results = projects.filter(project => {
      const text = [project.title, project.description, project.owner, ...(project.skills || [])].join(" ").toLowerCase();
      return (projectFilter === "all" || project.category === projectFilter)
        && (!query || text.includes(query));
    });

    grid.innerHTML = results.length ? results.map(project => `
      <article class="project-card">
        <div class="project-card-top">
          <div>
            <span class="project-category">${escapeHTML(project.categoryLabel || project.category)}</span>
            <h3>${escapeHTML(project.title)}</h3>
          </div>
          <div class="project-budget">${money(project.budget)}<small>budget</small></div>
        </div>
        <p class="project-description">${escapeHTML(project.description)}</p>
        <div class="tag-list">${(project.skills || []).map(skill => `<span class="tag">${escapeHTML(skill)}</span>`).join("")}</div>
        <div class="project-meta"><span>◷ ${escapeHTML(project.timeline || "Flexible")}</span><span>◈ ${escapeHTML(project.ownerType || "Client")}</span></div>
        <div class="project-footer">
          <div class="project-owner">${escapeHTML(project.owner || "Independent client")}<small>Project owner</small></div>
          <button class="btn btn-primary" data-action="applyProject" data-id="${project.id}">View & apply ↗</button>
        </div>
      </article>
    `).join("") : `<div class="empty-state"><strong>No projects found</strong>Try another search, or be the first to post one.</div>`;
  }

  function openModal(content) {
    $("#modalContent").innerHTML = content;
    $("#modalBackdrop").hidden = false;
    document.body.style.overflow = "hidden";
    $("#modalClose").focus();
  }

  function closeModal() {
    $("#modalBackdrop").hidden = true;
    document.body.style.overflow = "";
  }

  function field(label, name, placeholder, type = "text", required = true) {
    return `<div class="form-field"><label for="${name}">${escapeHTML(label)}</label><input id="${name}" name="${name}" type="${type}" placeholder="${escapeHTML(placeholder)}" ${required ? "required" : ""}></div>`;
  }

  function selectField(label, name, options) {
    return `<div class="form-field"><label for="${name}">${escapeHTML(label)}</label><select id="${name}" name="${name}" required>${options.map(([value, text]) => `<option value="${escapeHTML(value)}">${escapeHTML(text)}</option>`).join("")}</select></div>`;
  }

  function showSignup() {
    openModal(`
      <div class="eyebrow">FIND YOUR PLACE</div>
      <h2 id="modalTitle">Welcome to <span class="gradient-text">NANCE.</span></h2>
      <p class="modal-intro">Choose how you'd like to get started. You can explore public listings without registering.</p>
      <div class="role-grid">
        <button class="role-option" data-role="client"><span class="role-emoji">🎯</span><strong>Hire talent</strong><small>Post projects and compare proposals.</small></button>
        <button class="role-option" data-role="editor"><span class="role-emoji">🎬</span><strong>Video editor</strong><small>Find projects and showcase your work.</small></button>
        <button class="role-option" data-role="creator"><span class="role-emoji">✦</span><strong>Creator</strong><small>Join campaigns and find collaborators.</small></button>
        <button class="role-option" data-role="brand"><span class="role-emoji">◈</span><strong>Brand / agency</strong><small>Discover talent and manage campaigns.</small></button>
      </div>
      <div class="demo-note">Prototype mode: this selection demonstrates the experience. Secure registration and account verification will be added with the backend.</div>
    `);
  }

  function showLogin() {
    openModal(`
      <div class="eyebrow">YOUR CREATIVE WORKSPACE</div>
      <h2 id="modalTitle">Welcome back.</h2>
      <p class="modal-intro">Choose a workspace to preview the NANCE experience.</p>
      <form id="loginForm">
        ${selectField("Open workspace", "loginRole", [
          ["client","Hire talent / Client"],["editor","Video editor"],["creator","Creator"],["brand","Brand / Agency"]
        ])}
        <button class="btn btn-primary form-submit" type="submit">Open demo workspace ↗</button>
      </form>
      <div class="demo-note">This is a local prototype, not a real sign-in. No password or personal information is needed.</div>
    `);
  }

  function showApplication(role) {
    const labels = {
      client: ["Hire talent","Tell us what you need and start organising your project."],
      editor: ["Apply as a video editor","Share your skills and portfolio for review."],
      creator: ["Apply as a creator","Introduce your content and audience."],
      brand: ["Register a brand / agency","Tell us about your business and creative needs."]
    };
    const [title, description] = labels[role] || labels.client;

    openModal(`
      <div class="eyebrow">NANCE COMMUNITY</div>
      <h2 id="modalTitle">${escapeHTML(title)}</h2>
      <p class="modal-intro">${escapeHTML(description)}</p>
      <form id="applicationForm" data-role="${escapeHTML(role)}">
        ${field("Your name","appName","Full name")}
        ${field("Email address","appEmail","you@example.com","email")}
        ${field(role === "brand" ? "Business name" : role === "editor" ? "Primary editing skill" : role === "creator" ? "Content niche" : "Project type","appDetail",role === "brand" ? "Business / agency" : role === "editor" ? "e.g. Reels, motion graphics" : role === "creator" ? "e.g. Lifestyle, fitness" : "e.g. Editing, design")}
        ${field(role === "client" ? "Approximate budget (₹)" : "Portfolio or social link","appLink",role === "client" ? "e.g. 5000" : "https://...",role === "client" ? "number" : "url",false)}
        <button class="btn btn-primary form-submit" type="submit">Submit demo application ↗</button>
      </form>
      <div class="demo-note">Demo only. This form saves an application in this browser. It does not submit to NANCE or create a verified account.</div>
    `);
  }

  function showProjectForm() {
    openModal(`
      <div class="eyebrow">CREATE AN OPPORTUNITY</div>
      <h2 id="modalTitle">Post a <span class="gradient-text">project.</span></h2>
      <p class="modal-intro">Be specific about the work, budget, and timeline to help the right people apply.</p>
      <form id="projectForm">
        ${field("Project title","projectTitle","e.g. Edit 10 Instagram reels")}
        ${selectField("Project category","projectCategory",[
          ["editing","Video editing"],["creator","Creator campaign"],["design","Motion & design"]
        ])}
        <div class="form-field"><label for="projectDescription">Project brief</label><textarea id="projectDescription" name="projectDescription" placeholder="Describe the work, style, deliverables and expectations..." required></textarea></div>
        ${field("Budget in ₹","projectBudget","e.g. 10000","number")}
        ${field("Timeline","projectTimeline","e.g. 7 days or monthly")}
        ${field("Your name or business","projectOwner","e.g. Independent client")}
        <button class="btn btn-primary form-submit" type="submit">Publish demo project ↗</button>
      </form>
      <div class="demo-note">Demo only: your listing will appear in this browser. Other people will not see it until a shared backend is connected.</div>
    `);
  }

  function showProject(projectId) {
    const project = projects.find(item => item.id === projectId);
    if (!project) return;

    openModal(`
      <div class="eyebrow">${escapeHTML(project.categoryLabel || project.category)}</div>
      <h2 id="modalTitle">${escapeHTML(project.title)}</h2>
      <p class="modal-intro">${escapeHTML(project.description)}</p>
      <div class="tag-list">${(project.skills || []).map(skill => `<span class="tag">${escapeHTML(skill)}</span>`).join("")}</div>
      <div class="demo-note">Budget: <strong>${money(project.budget)}</strong> · Timeline: ${escapeHTML(project.timeline || "Flexible")}<br>Posted by ${escapeHTML(project.owner || "Independent client")}.</div>
      <form id="proposalForm" data-project="${project.id}">
        <div class="form-field"><label for="proposalName">Your name</label><input id="proposalName" name="proposalName" placeholder="Your name" required></div>
        <div class="form-field"><label for="proposalRate">Your proposed price (₹)</label><input id="proposalRate" name="proposalRate" type="number" min="1" placeholder="Your quote" required></div>
        <div class="form-field"><label for="proposalTimeline">Delivery timeline</label><input id="proposalTimeline" name="proposalTimeline" placeholder="e.g. 5 days" required></div>
        <div class="form-field"><label for="proposalPortfolio">Portfolio link (optional)</label><input id="proposalPortfolio" name="proposalPortfolio" type="url" placeholder="https://..."></div>
        <div class="form-field"><label for="proposalMessage">Your proposal</label><textarea id="proposalMessage" name="proposalMessage" placeholder="Explain how you'd approach this project..." required></textarea></div>
        <button class="btn btn-primary form-submit" type="submit">Submit demo proposal ↗</button>
      </form>
      <div class="demo-note">This proposal is saved locally for demonstration. No message is sent to the project owner.</div>
    `);
  }

  function showTalent(personId) {
    const person = talent.find(item => item.id === personId);
    if (!person) return;

    openModal(`
      <div class="talent-top">
        <div class="talent-avatar ${person.role === "creator" ? "creator" : ""}">${escapeHTML(person.initials)}</div>
        <div class="talent-info"><h3 id="modalTitle">${escapeHTML(person.name)} <span class="verified">✦</span></h3><p>${escapeHTML(person.title)}</p></div>
      </div>
      <p class="modal-intro">${escapeHTML(person.bio)}</p>
      <div class="tag-list">${person.specialty.map(tag => `<span class="tag">${escapeHTML(tag)}</span>`).join("")}</div>
      <div class="demo-note">Illustrative profile · Rate example: <strong>${money(person.rate)} per ${escapeHTML(person.unit)}</strong></div>
      <button class="btn btn-primary form-submit" id="inviteTalent">Invite to a project ↗</button>
    `);

    $("#inviteTalent").addEventListener("click", () => {
      closeModal();
      showProjectForm();
      toast("Create a project brief to begin your invitation.");
    });
  }

  function handleRole(role) {
    activeRole = role;
    showApplication(role);
  }

  function handleAction(action, id) {
    switch (action) {
      case "signup": showSignup(); break;
      case "login": showLogin(); break;
      case "postProject": showProjectForm(); break;
      case "allTalent":
        $("#talentSearch").value = "";
        $("#talentType").value = "all";
        $("#talentSpecialty").value = "all";
        renderTalent();
        $("#discover").scrollIntoView({ behavior:"smooth" });
        break;
      case "allProjects":
        projectFilter = "all";
        $$(".tab").forEach(tab => tab.classList.toggle("active", tab.dataset.filter === "all"));
        $("#projectSearch").value = "";
        renderProjects();
        $("#projects").scrollIntoView({ behavior:"smooth" });
        break;
      case "applyProject": showProject(id); break;
      case "contactTalent": showTalent(id); break;
    }
  }

  document.addEventListener("click", event => {
    const actionButton = event.target.closest("[data-action]");
    if (actionButton) {
      handleAction(actionButton.dataset.action, actionButton.dataset.id);
      return;
    }

    const roleButton = event.target.closest("[data-role]");
    if (roleButton && roleButton.tagName === "BUTTON") {
      handleRole(roleButton.dataset.role);
      return;
    }

    const tab = event.target.closest(".tab");
    if (tab) {
      projectFilter = tab.dataset.filter;
      $$(".tab").forEach(item => item.classList.toggle("active", item === tab));
      renderProjects();
    }
  });

  $("#talentSearch").addEventListener("input", renderTalent);
  $("#talentType").addEventListener("change", renderTalent);
  $("#talentSpecialty").addEventListener("change", renderTalent);
  $("#projectSearch").addEventListener("input", renderProjects);

  $("#modalClose").addEventListener("click", closeModal);
  $("#modalBackdrop").addEventListener("click", event => {
    if (event.target === $("#modalBackdrop")) closeModal();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !$("#modalBackdrop").hidden) closeModal();
  });

  $("#mobileMenu").addEventListener("click", () => {
    $("#navLinks").classList.toggle("open");
  });

  $$("#navLinks a").forEach(link => {
    link.addEventListener("click", () => $("#navLinks").classList.remove("open"));
  });

  document.addEventListener("submit", event => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;

    if (form.id === "loginForm") {
      event.preventDefault();
      const role = $("#loginRole").value;
      closeModal();
      toast("Demo preview opened for: " + role + ". Real login is not connected yet.");
      handleRole(role);
    }

    if (form.id === "applicationForm") {
      event.preventDefault();
      const data = new FormData(form);
      const entry = {
        id: "a" + Date.now(),
        role: form.dataset.role,
        name: data.get("appName"),
        email: data.get("appEmail"),
        detail: data.get("appDetail"),
        link: data.get("appLink"),
        status: "Pending demo review",
        createdAt: new Date().toISOString()
      };
      const saved = storage.get("applications", []);
      saved.push(entry);
      storage.set("applications", saved);
      closeModal();
      toast("Demo application saved in this browser.");
    }

    if (form.id === "projectForm") {
      event.preventDefault();
      const data = new FormData(form);
      const category = data.get("projectCategory");
      const title = String(data.get("projectTitle") || "").trim();
      const description = String(data.get("projectDescription") || "").trim();
      const budget = Number(data.get("projectBudget"));
      const owner = String(data.get("projectOwner") || "").trim();

      if (!title || !description || !owner || !Number.isFinite(budget) || budget <= 0) {
        toast("Please complete all required fields with a valid budget.", true);
        return;
      }

      const labels = { editing:"VIDEO EDITING", creator:"CREATOR CAMPAIGN", design:"MOTION & DESIGN" };
      const project = {
        id: "p" + Date.now(),
        title,
        category,
        categoryLabel: labels[category] || category,
        description,
        budget,
        timeline: data.get("projectTimeline") || "Flexible",
        owner,
        ownerType: "Client",
        skills: category === "editing" ? ["Video editing"] : category === "creator" ? ["Creator campaign"] : ["Motion & design"],
        featured: false,
        createdAt: Date.now()
      };

      projects.unshift(project);
      saveData();
      renderProjects();
      closeModal();
      toast("Your demo project has been published in this browser.");
      $("#projects").scrollIntoView({ behavior:"smooth" });
    }

    if (form.id === "proposalForm") {
      event.preventDefault();
      const data = new FormData(form);
      const projectId = form.dataset.project;
      const project = projects.find(item => item.id === projectId);
      if (!project) {
        toast("This project could not be found.", true);
        return;
      }

      proposals.push({
        id: "pr" + Date.now(),
        projectId,
        projectTitle: project.title,
        name: data.get("proposalName"),
        rate: Number(data.get("proposalRate")),
        timeline: data.get("proposalTimeline"),
        portfolio: data.get("proposalPortfolio"),
        message: data.get("proposalMessage"),
        status: "Pending demo review",
        createdAt: new Date().toISOString()
      });

      saveData();
      closeModal();
      toast("Demo proposal saved in this browser. The owner hasn't been notified.");
    }
  });

  renderTalent();
  renderProjects();
})();
