
const navUserName = document.getElementById("navUserName");
navUserName.innerText = localStorage.getItem("userName") || "Freelancer";

let currentSubmitOrderId = null;

/* ---- OPEN / CLOSE SUBMIT MODAL ---- */
function openSubmitModal(orderId) {
  currentSubmitOrderId = orderId;
  document.getElementById("submitText").value = "";
  document.getElementById("submitLink").value = "";
  document.getElementById("submitWorkModal").style.display = "flex";
}

function closeSubmitModal() {
  currentSubmitOrderId = null;
  document.getElementById("submitWorkModal").style.display = "none";
}

/* ---- SUBMIT WORK ---- */
async function submitWork() {
  const token = localStorage.getItem("access_token");
  const text = document.getElementById("submitText").value.trim();
  const link = document.getElementById("submitLink").value.trim();

  if (!text && !link) {
    showToast("Please provide a description or a link.", "warning");
    return;
  }

  try {
    const response = await fetch(`${window.CONFIG.API_BASE_URL}/api/orders/${currentSubmitOrderId}/submit_work/`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ work_submission_text: text, work_submission_link: link })
    });

    if (response.ok) {
      closeSubmitModal();
      showToast("Work submitted! Waiting for client approval.", "success");
      fetchProjects(1);
    } else {
      const err = await response.json();
      showToast("Error: " + JSON.stringify(err), "error");
    }
  } catch (err) {
    console.error(err);
    showToast("Failed to submit work.", "error");
  }
}

let allOrders = [];
let currentPage = 1;
let hasNextPage = false;

/* ---- RENDER PROJECTS ---- */
async function fetchProjects(page = 1) {
  const container = document.getElementById("projectsContainer");
  const token = localStorage.getItem("access_token");

  if (!token) return;

  if (page === 1) {
    container.innerHTML = "<p class='loading'>Loading active projects...</p>";
  }

  try {
    const response = await fetch(`${window.CONFIG.API_BASE_URL}/api/orders/?page=${page}`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const data = await response.json();

    hasNextPage = !!data.next;
    const orders = data.results || [];

    if (page === 1) {
      allOrders = orders;
    } else {
      allOrders = [...allOrders, ...orders];
    }

    renderProjectsList();
    updateLoadMoreButton();

  } catch (err) {
    console.error("Error loading projects:", err);
    if (page === 1) {
      container.innerHTML = "<p class='empty'>Error loading projects.</p>";
    }
  }
}

function updateLoadMoreButton() {
  const container = document.getElementById("loadMoreContainer");
  if (container) {
    container.style.display = hasNextPage ? "block" : "none";
  }
}

async function loadMore() {
  const btn = document.getElementById("loadMoreBtn");
  btn.innerText = "Loading...";
  btn.disabled = true;

  currentPage++;
  await fetchProjects(currentPage);

  btn.innerText = "Load More Projects";
  btn.disabled = false;
}

function renderProjectsList() {
  const container = document.getElementById("projectsContainer");
  container.innerHTML = "";

  if (allOrders.length === 0) {
    container.innerHTML = "<p class='empty'>No projects yet</p>";
    return;
  }

  // Filter and group by status (maintaining existing logic)
  const active = allOrders.filter(o => o.status === "Active" || o.status === "Revision Requested");
  const submitted = allOrders.filter(o => o.status === "Work Submitted");
  const disputed = allOrders.filter(o => o.status === "Disputed");
  const pending = allOrders.filter(o => ["Confirmation Pending", "Payment Requested"].includes(o.status));
  const completed = allOrders.filter(o => ["Completed", "Payment Rejected", "Cancelled"].includes(o.status));

  // Render helper for cards
  const addCard = (project) => {
    const card = document.createElement("div");
    card.className = "project-card";
    card.innerHTML = `
      <h3>${project.shoot_type}</h3>
      <div class="project-info">Client: ${project.client_name}</div>
      <div class="project-info">Booking ID: ${project.order_id}</div>
      <div class="project-info">Amount: PKR ${project.amount}</div>
      <div class="project-info">Shoot Date: ${project.deadline}</div>
      <div class="status">${project.status === "Revision Requested" ? '<span style="color:#facc15;">🔄 Revision Requested</span>' : getStatusLabel(project.status)}</div>
     <div style="display:flex; gap:10px; margin-top:12px;">
    
    ${(project.status === "Active" || project.status === "Revision Requested") ? `
      <button 
        onclick="openSubmitModal('${project.order_id}')"
        style="
          flex:1;
          padding:10px;
          border:none;
          border-radius:10px;
          font-weight:600;
          cursor:pointer;
          background:linear-gradient(135deg,#22c55e,#16a34a);
          color:white;
          transition:all 0.25s ease;
        "
        onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 14px rgba(34,197,94,0.3)'"
        onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'"
      >
        Submit Work
      </button>
    ` : ''}

    <button 
      onclick="messageClient('${project.client_email}', '${project.client_name.replace(/'/g, "\\'")}')"
      style="
        flex:1;
        padding:10px;
        border:none;
        border-radius:10px;
        font-weight:600;
        cursor:pointer;
        background:linear-gradient(135deg,#38bdf8,#0ea5e9);
        color:#020617;
        transition:all 0.25s ease;
      "
      onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 14px rgba(56,189,248,0.3)'"
      onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'"
    >
      💬 Message
    </button>

  </div>
`;
    container.appendChild(card);
  };

  function getStatusLabel(status) {
    if (status === "Work Submitted") return '<span style="color:#38bdf8;">Work Submitted — Awaiting Approval</span>';
    if (status === "Disputed") return '<span style="color:#ef4444;">⚠️ Disputed — Under Admin Review</span>';
    if (["Confirmation Pending", "Payment Requested"].includes(status)) return `<span style="color:#facc15;">⏳ ${status}</span>`;
    if (["Completed", "Payment Rejected", "Cancelled"].includes(status)) return `<span style="color:${status === 'Completed' ? '#22c55e' : '#ef4444'};">${status === 'Completed' ? '✅' : '❌'} ${status}</span>`;
    return status;
  }

  // Render in groups
  active.forEach(addCard);
  submitted.forEach(addCard);
  disputed.forEach(addCard);
  pending.forEach(addCard);
  completed.forEach(addCard);
}

/* ---- MESSAGE CLIENT ---- */
function messageClient(email, name) {
  if (!email || email === "undefined") {
    showToast("Cannot initiate chat: Client email missing.", "error");
    return;
  }
  localStorage.setItem("activeChatUser", JSON.stringify({
    name: name,
    email: email,
    avatar: "https://i.pravatar.cc/150"
  }));
  window.location.href = "chat.html";
}

/* ---- NAV ---- */
function goDashboard() { window.location.href = "freelancerDashboard.html"; }
function goMessage() { window.location.href = "chat.html"; }
function goProjects() { window.location.href = "freelancerProjects.html"; }

fetchProjects(1);
