
"use strict";

/*
  NANCE authentication and admin verification dashboard.
  The Supabase publishable key is intended for browser clients.
  Never add a service-role key or database password here.
*/

const SUPABASE_URL = "https://mslqthzabgzxhbecboin.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_zV4dcgUxSntrNuznj24SzQ_VdY9uquj";

const db = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const roleNames = {
  client: "Client",
  editor: "Video editor",
  creator: "Creator / influencer",
  brand: "Brand / agency"
};

const verificationRoles = ["editor", "creator", "brand"];
let currentUser = null;
let profile = null;
let verificationRecords = [];
let activeRole = "client";
let signupMode = true;
let toastTimer;
let isNanceAdmin = false;
let adminVerifications = [];

const sampleTalent = [
  {name:"Arjun Mehta",role:"editor",title:"Motion-led video editor",skills:"After Effects · Reels · Ads",rate:1500,bio:"High-energy edits, expressive typography and clean motion systems."},
  {name:"Riya Shah",role:"creator",title:"Lifestyle creator",skills:"Lifestyle · Beauty · Short-form",rate:5000,bio:"Lifestyle storytelling and short-form content collaborations."},
  {name:"Dev Patel",role:"editor",title:"YouTube & storytelling editor",skills:"YouTube · Storytelling · Colour",rate:2500,bio:"Long-form storytelling, pacing, sound design and colour."}
];

const sampleProjects = [
  {id:"sample1",title:"Edit 8 short-form videos",category:"editing",description:"Turn existing footage into polished vertical reels with captions and clean pacing.",budget:12000,timeline:"10 days",sample:true},
  {id:"sample2",title:"Creator campaign for a new collection",category:"creator",description:"A small lifestyle brand is looking for creators for a product launch.",budget:18000,timeline:"3 weeks",sample:true},
  {id:"sample3",title:"Motion graphics for a fitness channel",category:"editing",description:"Animated text, simple diagrams and transitions for educational videos.",budget:8000,timeline:"1 week",sample:true}
];

function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 3600);
}

function money(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0
  }).format(Number(value) || 0);
}

function safeText(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  }[char]));
}

function openDialog(id) {
  const dialog = document.getElementById(id);
  if (dialog && !dialog.open) dialog.showModal();
}

function closeDialog(id) {
  const dialog = document.getElementById(id);
  if (dialog?.open) dialog.close();
}

function setMessage(selector, message, isError = false) {
  const el = $(selector);
  if (!el) return;
  el.textContent = message;
  el.style.color = isError ? "var(--danger)" : "var(--violet2)";
}

function renderTalent() {
  const query = ($("#talentSearch").value || "").toLowerCase().trim();
  const role = $("#talentRole").value;
  const filtered = sampleTalent.filter(person =>
    (role === "all" || person.role === role) &&
    `${person.name} ${person.title} ${person.skills}`.toLowerCase().includes(query)
  );

  $("#talentGrid").innerHTML = filtered.length ? filtered.map(person => `
    <article class="talent-card">
      <div class="talent-top">
        <div class="avatar">${safeText(person.name.split(" ").map(n => n[0]).join("").slice(0,2))}</div>
        <div><h3>${safeText(person.name)}</h3><p>${safeText(person.title)}</p></div>
      </div>
      <p>${safeText(person.bio)}</p>
      <div class="tag-row"><span class="tag">${safeText(roleNames[person.role])}</span><span class="tag">${safeText(person.skills)}</span></div>
      <div class="card-bottom-row"><strong>${money(person.rate)}+ / project</strong><button class="btn btn-outline" data-contact="${safeText(person.name)}">View profile</button></div>
    </article>`).join("") : `<p>No sample profiles match your search.</p>`;
}

async function renderProjects() {
  const query = ($("#projectSearch").value || "").toLowerCase().trim();
  const category = $("#projectType").value;

  const grid = $("#projectGrid");
  grid.innerHTML = "<p>Loading projects...</p>";

  try {
    let request = db
      .from("projects")
      .select("*")
      .eq("status", "open")
      .order("created_at", { ascending: false });

    if (category && category !== "all") {
      request = request.eq("category", category);
    }

    const { data: projects, error } = await request;
    if (error) throw error;

    const filtered = (projects || []).filter((project) =>
      `${project.title || ""} ${project.description || ""}`
        .toLowerCase()
        .includes(query)
    );

    grid.innerHTML = filtered.length
      ? filtered.map((project) => `
          <article class="project-card">
            <div>
              <span class="tag">${safeText(
                project.category === "editing"
                  ? "Video editing"
                  : project.category === "creator"
                    ? "Creator campaign"
                    : project.category || "Project"
              )}</span>
              <h3>${safeText(project.title || "Untitled project")}</h3>
              <p>${safeText(project.description || "")}</p>
              <p class="small">${safeText(project.timeline || "Timeline flexible")}</p>
            </div>
            <div class="project-meta">
              <strong>${money(project.budget || 0)}</strong>
              <button class="btn btn-outline" data-project="${safeText(project.id)}">View project</button>
            </div>
          </article>
        `).join("")
      : "<p>No open projects found. Try another search.</p>";
  } catch (error) {
    console.error("Could not load projects:", error);
    grid.innerHTML = "<p>Projects couldn't load. Please refresh and try again.</p>";
  }
}

function showAuth(mode = "signup") {
  signupMode = mode === "signup";
  updateAuthMode();
  setMessage("#authMessage", "");
  openDialog("authDialog");
}

function updateAuthMode() {
  $("#authTitle").textContent = signupMode ? "Create your account" : "Welcome back";
  $("#authSubtitle").textContent = signupMode ? "One account. Your creative world." : "Log in to continue to NANCE.";
  $("#nameWrap").classList.toggle("hidden", !signupMode);
  $("#roleWrap").classList.toggle("hidden", !signupMode);
  $("#authName").required = signupMode;
  $("#authRole").required = signupMode;
  $("#authPassword").autocomplete = signupMode ? "new-password" : "current-password";
  $("#authSubmit").textContent = signupMode ? "Create account" : "Log in";
  $("#tabSignup").classList.toggle("active", signupMode);
  $("#tabLogin").classList.toggle("active", !signupMode);
}

async function fetchProfile() {
  if (!currentUser) return null;
  const {data, error} = await db
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .maybeSingle();

  if (error) throw error;
  profile = data;
  return profile;
}

async function fetchVerifications() {
  if (!currentUser) return [];
  const {data, error} = await db
    .from("role_verifications")
    .select("id,user_id,role,status,portfolio_url,social_links,applicant_notes,reviewer_notes,submitted_at,reviewed_at")
    .eq("user_id", currentUser.id);

  if (error) throw error;
  verificationRecords = data || [];
  return verificationRecords;
}

function verificationFor(role) {
  return verificationRecords.find(item => item.role === role);
}

function roleIsApproved(role) {
  if (role === "client") return true;
  return verificationFor(role)?.status === "approved";
}

function roleStatus(role) {
  if (role === "client") return "Client access";
  const item = verificationFor(role);
  if (!item) return "Not submitted";
  return ({
    pending:"Pending review",
    needs_changes:"More information requested",
    approved:"Verified",
    rejected:"Not approved"
  })[item.status] || item.status;
}

function statusClass(role) {
  const item = verificationFor(role);
  if (!item) return "";
  return item.status === "approved" ? "status-approved" :
    item.status === "rejected" ? "status-rejected" : "status-pending";
}

function availableRoles() {
  const roles = ["client"];
  verificationRoles.forEach(role => {
    if (verificationFor(role)) roles.push(role);
  });
  return [...new Set(roles)];
}

/* Admin-only review functions. Supabase RLS must enforce these permissions too. */
async function checkNanceAdmin() {
  isNanceAdmin = false;
  if (!currentUser) return false;

  const {data, error} = await db.rpc("is_nance_admin");
  if (error) {
    console.warn("Admin status check failed:", error.message);
    return false;
  }

  isNanceAdmin = data === true;
  return isNanceAdmin;
}

async function fetchAdminVerifications() {
  if (!currentUser || !isNanceAdmin) return [];

  const {data, error} = await db
    .from("role_verifications")
    .select("id,user_id,role,status,portfolio_url,social_links,applicant_notes,reviewer_notes,submitted_at,reviewed_at")
    .order("submitted_at", {ascending:false});

  if (error) throw error;
  adminVerifications = data || [];
  return adminVerifications;
}

function renderAdminPanel() {
  if (!isNanceAdmin) return "";

  return `
    <section class="workspace-box admin-panel" aria-labelledby="adminHeading">
      <div class="admin-heading-row">
        <div><span class="eyebrow">NANCE CONTROL ROOM</span><h3 id="adminHeading">Verification approvals</h3></div>
        <button class="btn btn-outline" id="refreshAdminQueue" type="button">Refresh queue</button>
      </div>
      <p class="small muted">Admin access is verified by Supabase. Decisions are saved to the verification record.</p>
      <div id="adminQueue" aria-live="polite"><p>Loading verification requests…</p></div>
      <p class="form-note" id="adminMessage" role="status"></p>
    </section>`;
}

async function loadAdminQueue() {
  const queue = $("#adminQueue");
  const message = $("#adminMessage");
  if (!isNanceAdmin || !queue) return;

  queue.innerHTML = "<p>Loading verification requests…</p>";
  if (message) message.textContent = "";

  try {
    const rows = await fetchAdminVerifications();
    if (!rows.length) {
      queue.innerHTML = "<p>No verification requests yet. New applications will appear here.</p>";
      return;
    }

    queue.innerHTML = rows.map(item => `
      <article class="admin-request">
        <div class="admin-request-top">
          <div>
            <span class="tag">${safeText(roleNames[item.role] || item.role)}</span>
            <h4>${safeText(item.status || "unknown status")}</h4>
          </div>
          <span class="small muted">Submitted: ${safeText(item.submitted_at ? new Date(item.submitted_at).toLocaleString() : "Unknown")}</span>
        </div>
        <p><strong>Applicant user ID:</strong><br><code>${safeText(item.user_id)}</code></p>
        <p><strong>Portfolio:</strong> ${item.portfolio_url ? `<a href="${safeText(item.portfolio_url)}" target="_blank" rel="noopener noreferrer">${safeText(item.portfolio_url)}</a>` : "Not provided"}</p>
        <p><strong>Social links / evidence:</strong></p>
        ${Array.isArray(item.social_links) && item.social_links.length ? `<ul>${item.social_links.map(link => `<li><a href="${safeText(link)}" target="_blank" rel="noopener noreferrer">${safeText(link)}</a></li>`).join("")}</ul>` : "<p>None provided.</p>"}
        <p><strong>Applicant notes:</strong><br>${safeText(item.applicant_notes || "None provided.")}</p>
        ${item.reviewer_notes ? `<p><strong>Previous reviewer notes:</strong><br>${safeText(item.reviewer_notes)}</p>` : ""}
        ${item.status === "pending" || item.status === "needs_changes" ? `
          <div class="admin-actions">
            <button class="btn btn-primary" type="button" data-review-id="${safeText(item.id)}" data-review-status="approved">Approve</button>
            <button class="btn btn-outline" type="button" data-review-id="${safeText(item.id)}" data-review-status="needs_changes">Request changes</button>
            <button class="btn btn-ghost admin-reject" type="button" data-review-id="${safeText(item.id)}" data-review-status="rejected">Reject</button>
          </div>` : `
          <p class="small">Reviewed: ${safeText(item.reviewed_at ? new Date(item.reviewed_at).toLocaleString() : "Not recorded")}</p>`}
      </article>
    `).join("");
  } catch (error) {
    console.error("Could not load admin verification queue:", error);
    queue.innerHTML = "<p>Could not load applications. Check the admin review RLS policy and browser console.</p>";
    if (message) message.textContent = error.message || "Could not load verification requests.";
  }
}

async function reviewVerification(id, status) {
  if (!currentUser || !isNanceAdmin) {
    toast("Admin access is required for this action.");
    return;
  }

  if (!["approved", "rejected", "needs_changes"].includes(status)) return;

  let reviewerNotes = "";
  if (status === "rejected" || status === "needs_changes") {
    reviewerNotes = prompt(
      status === "rejected"
        ? "Reason for rejection (required):"
        : "What should the applicant change? (required)"
    )?.trim() || "";

    if (!reviewerNotes) {
      toast("Please enter a note for the applicant.");
      return;
    }
  } else {
    reviewerNotes = prompt("Optional note for the applicant:")?.trim() || "";
  }

  const message = $("#adminMessage");
  if (message) message.textContent = "Saving review decision…";

  try {
    const {error} = await db
      .from("role_verifications")
      .update({
        status,
        reviewer_notes: reviewerNotes || null,
        reviewed_by: currentUser.id,
        reviewed_at: new Date().toISOString()
      })
      .eq("id", id);

    if (error) throw error;

    if (message) message.textContent = "Decision saved.";
    toast("Verification decision saved.");
    await loadAdminQueue();
    await fetchVerifications();
    renderWorkspaceContent();
  } catch (error) {
    console.error("Could not save verification decision:", error);
    if (message) message.textContent = error.message || "Could not save this decision. Check the admin review RLS policy.";
    toast("The decision could not be saved.");
  }
}

async function loadWorkspace() {
  if (!currentUser) return;

  try {
    await Promise.all([fetchProfile(), fetchVerifications()]);
    await checkNanceAdmin();

    $("#welcomeTitle").textContent = `Welcome, ${profile?.full_name || currentUser.email?.split("@")[0] || "there"}.`;
    $("#accountEmail").textContent = currentUser.email || "";
    $("#activeRole").innerHTML = availableRoles().map(role =>
      `<option value="${role}">${safeText(roleNames[role])}</option>`
    ).join("");

    if (!availableRoles().includes(activeRole)) activeRole = "client";
    $("#activeRole").value = activeRole;
    $("#activeStatus").textContent = roleStatus(activeRole);
    $("#activeStatus").className = `status-pill ${statusClass(activeRole)}`;
    renderWorkspaceContent();

    $("#loginBtn").classList.add("hidden");
    $("#signupBtn").classList.add("hidden");
    $("#heroSignup").classList.add("hidden");
    $("#bottomSignup").classList.add("hidden");
    $("#accountBtn").classList.remove("hidden");
  } catch (error) {
    console.error(error);
    toast("Could not load your profile. Check your database policies.");
  }
}

function renderWorkspaceContent() {
  const role = activeRole;
  const approved = roleIsApproved(role);
  const item = verificationFor(role);
  let html = "";

  html += `<div class="workspace-box"><h3>${safeText(roleNames[role])}</h3><p class="${statusClass(role)}">${safeText(roleStatus(role))}</p></div>`;

  if (role !== "client") {
    if (!item || item.status === "rejected" || item.status === "needs_changes") {
      html += `<div class="workspace-box"><h3>${item ? "Update your verification" : "Verify this role"}</h3><p>${item?.status === "rejected" ? "Your previous request was not approved. Contact NANCE support before resubmitting." : item?.status === "needs_changes" ? "NANCE needs more information. Review the feedback and update your submission." : "Complete your role profile and submit it for manual review."}</p><button class="btn btn-primary" id="openVerification">${item?.status === "needs_changes" ? "Update submission" : "Apply for verification"}</button></div>`;
    } else if (item.status === "pending") {
      html += `<div class="workspace-box"><h3>Verification in progress</h3><p>Your ${safeText(roleNames[role])} role is awaiting review. You can edit your profile while you wait, but you cannot apply to opportunities in this role yet.</p></div>`;
    } else {
      html += `<div class="workspace-box"><h3>You're verified</h3><p>This role is approved. You can use eligible role-specific features. Applications will be checked by the database as well as the interface.</p></div>`;
    }
  }

  html += `<div class="workspace-box"><h3>Your profile</h3><p>${safeText(profile?.bio || "Add a bio, portfolio link, social links, skills and rate to complete your profile.")}</p><p class="small">Portfolio: ${safeText(profile?.portfolio_url || "Not added")}</p><button class="btn btn-outline" id="completeProfile">Edit ${safeText(roleNames[role].toLowerCase())} profile</button></div>`;

  if (role === "client" || approved) {
    html += `<div class="workspace-box"><h3>${role === "client" ? "Find creative talent" : "Eligible opportunities"}</h3><p>${role === "client" ? "Post a project and review proposals from talent." : "Your role is approved. The next step is connecting project discovery and proposals to the database."}</p><button class="btn btn-primary" id="openProject">${role === "client" ? "Post a project" : "Explore projects"}</button></div>`;
  } else {
    html += `<div class="workspace-box"><h3>Applications are locked</h3><p>You'll be able to apply as ${safeText(roleNames[role].toLowerCase())} once NANCE approves this role. Approval for another role does not unlock this one.</p></div>`;
  }

  html += `<div class="workspace-box"><h3>Roles under this account</h3><p>${availableRoles().map(r => `${safeText(roleNames[r])}: ${safeText(roleStatus(r))}`).join("<br>")}</p><p class="small">You can add another role without creating another account. Each role has its own verification status.</p><button class="btn btn-outline" id="addRole">Add another role</button></div>`;

  if (isNanceAdmin) html += renderAdminPanel();

  $("#workspaceContent").innerHTML = html;

  $("#openVerification")?.addEventListener("click", openVerificationForm);
  $("#completeProfile")?.addEventListener("click", openProfileForm);
  $("#openProject")?.addEventListener("click", () => {
    if (role === "client") openDialog("projectDialog");
    else toast("Project discovery and proposals will be connected after the role and profile foundation.");
  });
  $("#addRole")?.addEventListener("click", addRole);
  $("#refreshAdminQueue")?.addEventListener("click", loadAdminQueue);

  if (isNanceAdmin) {
    loadAdminQueue();
  }

function addRole() {
  const choices = verificationRoles.filter(role => !verificationFor(role));
  if (!choices.length) {
    toast("You already have a verification request for each professional role.");
    return;
  }
  const choice = prompt(`Which role do you want to add?\n${choices.map((role,i) => `${i+1}. ${roleNames[role]}`).join("\n")}\nEnter the number.`);
  const index = Number(choice) - 1;
  if (!Number.isInteger(index) || index < 0 || index >= choices.length) return;
  activeRole = choices[index];
  openVerificationForm();
}

function openVerificationForm() {
  const existing = verificationFor(activeRole);
  $("#verifyTitle").textContent = `Verify ${roleNames[activeRole]}`;
  $("#verifyPortfolio").value = profile?.portfolio_url || existing?.portfolio_url || "";
  const links = Array.isArray(existing?.social_links) ? existing.social_links : [];
  $("#verifyLinks").value = links.join("\n");
  $("#verifyNotes").value = existing?.applicant_notes || "";
  setMessage("#verifyMessage", "");
  openDialog("verifyDialog");
}

function openProfileForm() {
  $("#profileName").value = profile?.full_name || "";
  $("#profileBio").value = profile?.bio || "";
  $("#profilePortfolio").value = profile?.portfolio_url || "";
  $("#profileLinks").value = Array.isArray(profile?.social_links) ? profile.social_links.join("\n") : "";
  $("#profileSkills").value = profile?.skills || "";
  $("#profileRate").value = profile?.rate ?? "";
  setMessage("#profileMessage", "");
  openDialog("profileDialog");
}

function parseLinks(text) {
  return text.split(/\n|,/).map(value => value.trim()).filter(Boolean).slice(0,20);
}

function validHttpUrl(value) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  const email = $("#authEmail").value.trim();
  const password = $("#authPassword").value;
  const button = $("#authSubmit");
  button.disabled = true;
  setMessage("#authMessage", signupMode ? "Creating your account…" : "Logging you in…");

  try {
    if (signupMode) {
      const fullName = $("#authName").value.trim();
      const role = $("#authRole").value;

      const {data, error} = await db.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {full_name: fullName}
        }
      });
      if (error) throw error;

      if (data.user && data.session) {
        currentUser = data.user;
        await createInitialRole(role);
        await loadWorkspace();
        closeDialog("authDialog");
        openDialog("workspaceDialog");
        toast("Account created. Welcome to NANCE!");
      } else {
        setMessage("#authMessage", "Check your email to confirm your account. Then log in here.");
        $("#authForm").reset();
        signupMode = false;
        updateAuthMode();
      }
    } else {
      const {data, error} = await db.auth.signInWithPassword({email,password});
      if (error) throw error;
      currentUser = data.user;
      activeRole = "client";
      await loadWorkspace();
      closeDialog("authDialog");
      openDialog("workspaceDialog");
      toast("You're logged in.");
    }
  } catch (error) {
    console.error(error);
    setMessage("#authMessage", error.message || "Authentication failed.", true);
  } finally {
    button.disabled = false;
  }
}

async function createInitialRole(role) {
  if (role === "client") return;
  const {error} = await db.from("role_verifications").insert({
    user_id: currentUser.id,
    role,
    status:"pending",
    applicant_notes:"Initial role request. Complete the role profile and verification details."
  });
  if (error && error.code !== "23505") throw error;
}

async function handleProfileSave(event) {
  event.preventDefault();
  if (!currentUser) return toast("Please log in first.");
  const fullName = $("#profileName").value.trim();
  const bio = $("#profileBio").value.trim();
  const portfolio = $("#profilePortfolio").value.trim();
  const links = parseLinks($("#profileLinks").value);
  const skills = $("#profileSkills").value.trim();
  const rateValue = $("#profileRate").value;
  const rate = rateValue === "" ? null : Number(rateValue);

  if (!validHttpUrl(portfolio) || links.some(link => !validHttpUrl(link))) {
    return setMessage("#profileMessage", "Use complete http:// or https:// URLs.", true);
  }

  setMessage("#profileMessage", "Saving profile…");
  try {
    const {error} = await db.from("profiles").upsert({
      id:currentUser.id,
      full_name:fullName,
      bio,
      portfolio_url:portfolio || null,
      social_links:links,
      skills,
      rate,
      updated_at:new Date().toISOString()
    }, {onConflict:"id"});
    if (error) throw error;
    await fetchProfile();
    setMessage("#profileMessage", "Profile saved.");
    await loadWorkspace();
    toast("Profile updated.");
    setTimeout(() => closeDialog("profileDialog"), 600);
  } catch (error) {
    console.error(error);
    setMessage("#profileMessage", error.message || "Could not save profile.", true);
  }
}

async function handleVerificationSubmit(event) {
  event.preventDefault();
  if (!currentUser || !verificationRoles.includes(activeRole)) return;
  const portfolio = $("#verifyPortfolio").value.trim();
  const links = parseLinks($("#verifyLinks").value);
  const notes = $("#verifyNotes").value.trim();

  if (!validHttpUrl(portfolio) || links.some(link => !validHttpUrl(link))) {
    return setMessage("#verifyMessage", "Use complete http:// or https:// URLs.", true);
  }

  const existing = verificationFor(activeRole);
  if (existing?.status === "rejected") {
    return setMessage("#verifyMessage", "This request was rejected. Contact NANCE support before reapplying.", true);
  }

  setMessage("#verifyMessage", "Submitting for review…");
  try {
    const payload = {
      user_id:currentUser.id,
      role:activeRole,
      status:"pending",
      portfolio_url:portfolio || null,
      social_links:links,
      applicant_notes:notes,
      reviewer_notes:null,
      reviewed_by:null,
      reviewed_at:null,
      submitted_at:new Date().toISOString()
    };

    let result;
    if (existing?.status === "needs_changes") {
      result = await db.from("role_verifications").update({
        portfolio_url:payload.portfolio_url,
        social_links:payload.social_links,
        applicant_notes:payload.applicant_notes,
        status:"pending",
        reviewer_notes:null,
        reviewed_by:null,
        reviewed_at:null,
        submitted_at:payload.submitted_at
      }).eq("id",existing.id).select().single();
    } else if (existing) {
      return setMessage("#verifyMessage", "A request for this role already exists.", true);
    } else {
      result = await db.from("role_verifications").insert(payload).select().single();
    }
    if (result.error) throw result.error;
    await fetchVerifications();
    await loadWorkspace();
    setMessage("#verifyMessage", "Submitted. NANCE will review this role separately.");
    toast("Verification request submitted.");
    setTimeout(() => closeDialog("verifyDialog"), 900);
  } catch (error) {
    console.error(error);
    setMessage("#verifyMessage", error.message || "Submission failed. Check your database policies.", true);
  }
}

async function handleProjectSubmit(event) {
  event.preventDefault();
  if (!currentUser) {
    closeDialog("projectDialog");
    showAuth("signup");
    return;
  }

  const title = $("#projectTitle").value.trim();
  const category = $("#projectCategory").value;
  const description = $("#projectDescription").value.trim();
  const budget = Number($("#projectBudget").value);
  const timeline = $("#projectTimeline").value.trim();

  setMessage("#projectMessage", "Publishing…");
  try {
    const {error} = await db.from("projects").insert({
      owner_id:currentUser.id,
      owner_role:"client",
      title, category, description,
      budget,
      timeline:timeline || null,
      status:"open"
    });
    if (error) throw error;
    setMessage("#projectMessage", "Project published.");
    $("#projectForm").reset();
    toast("Project published to NANCE.");
    setTimeout(() => closeDialog("projectDialog"), 700);
  } catch (error) {
    console.error(error);
    setMessage("#projectMessage", error.message || "Could not publish project.", true);
  }
}

async function logout() {
  const {error} = await db.auth.signOut();
  if (error) return toast(error.message);
  currentUser = null;
  profile = null;
  verificationRecords = [];
  adminVerifications = [];
  isNanceAdmin = false;
  activeRole = "client";
  $("#accountBtn").classList.add("hidden");
  $("#loginBtn").classList.remove("hidden");
  $("#signupBtn").classList.remove("hidden");
  $("#heroSignup").classList.remove("hidden");
  $("#bottomSignup").classList.remove("hidden");
  closeDialog("workspaceDialog");
  toast("You've logged out.");
}

async function restoreSession() {
  try {
    const {data, error} = await db.auth.getSession();
    if (error) throw error;
    currentUser = data.session?.user || null;
    if (currentUser) await loadWorkspace();
  } catch (error) {
    console.error(error);
    toast("Couldn't restore your session.");
  }
}

function bindEvents() {
  $("#loginBtn").addEventListener("click", () => showAuth("login"));
  $("#signupBtn").addEventListener("click", () => showAuth("signup"));
  $("#heroSignup").addEventListener("click", () => showAuth("signup"));
  $("#bottomSignup").addEventListener("click", () => showAuth("signup"));
  $("#accountBtn").addEventListener("click", async () => {
    if (currentUser) {
      await loadWorkspace();
      openDialog("workspaceDialog");
    } else showAuth("login");
  });
  $("#postProjectBtn").addEventListener("click", () => {
    if (!currentUser) return showAuth("signup");
    openDialog("projectDialog");
  });
  $("#tabSignup").addEventListener("click", () => {signupMode=true;updateAuthMode();setMessage("#authMessage","");});
  $("#tabLogin").addEventListener("click", () => {signupMode=false;updateAuthMode();setMessage("#authMessage","");});
  $("#authForm").addEventListener("submit", handleAuthSubmit);
  $("#profileForm").addEventListener("submit", handleProfileSave);
  $("#verifyForm").addEventListener("submit", handleVerificationSubmit);
  $("#projectForm").addEventListener("submit", handleProjectSubmit);
  $("#editProfileBtn").addEventListener("click", openProfileForm);
  $("#logoutBtn").addEventListener("click", logout);
  $("#activeRole").addEventListener("change", event => {
    activeRole = event.target.value;
    $("#activeStatus").textContent = roleStatus(activeRole);
    $("#activeStatus").className = `status-pill ${statusClass(activeRole)}`;
    renderWorkspaceContent();
  });

  $("#talentSearch").addEventListener("input", renderTalent);
  $("#talentRole").addEventListener("change", renderTalent);
  $("#projectSearch").addEventListener("input", renderProjects);
  $("#projectType").addEventListener("change", renderProjects);

  document.addEventListener("click", event => {
    const close = event.target.closest("[data-close]");
    if (close) closeDialog(close.dataset.close);

    const contact = event.target.closest("[data-contact]");
    if (contact) toast(`${contact.dataset.contact} is a sample profile. Live messaging will be added later.`);

    const project = event.target.closest("[data-project]");
    if (project) {
      const selected = sampleProjects.find(p => p.id === project.dataset.project);
      if (selected) toast(`${selected.title} is a sample listing. Sign in to use live project features.`);
    }

    const reviewButton = event.target.closest("[data-review-id]");
    if (reviewButton) {
      reviewVerification(reviewButton.dataset.reviewId, reviewButton.dataset.reviewStatus);
    }
  });

  db.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user || null;
    if (!currentUser) {
      isNanceAdmin = false;
      adminVerifications = [];
      $("#accountBtn").classList.add("hidden");
      $("#loginBtn").classList.remove("hidden");
      $("#signupBtn").classList.remove("hidden");
      $("#heroSignup").classList.remove("hidden");
      $("#bottomSignup").classList.remove("hidden");
    }
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  $("#year").textContent = new Date().getFullYear();
  bindEvents();
  renderTalent();
  renderProjects();
  updateAuthMode();
  await restoreSession();
});
}
