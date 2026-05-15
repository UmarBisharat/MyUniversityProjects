document.addEventListener("DOMContentLoaded", () => {
  initDashboard();
  if (sessionStorage.getItem('jobPosted')) {
    showToast("Job posted successfully!", "success");
    sessionStorage.removeItem('jobPosted');
  }
});

function initDashboard() {
  loadClientProfile();
  updateClientStats();
  renderMyPosts();
  checkAdminAccess();
}

async function safeFetch(url, options = {}) {
  try {
    const res = await fetch(url, options);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Request failed");
    }

    return await res.json();
  } catch (err) {
    console.error(err);
    showToast(err.message || "Network error", "error");
    return null;
  }
}

async function loadClientProfile() {
  const token = localStorage.getItem("access_token");
  if (!token) return;

  const data = await safeFetch(`${window.CONFIG.API_BASE_URL}/api/profiles/me/`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!data) return;

  document.getElementById("clientName").innerText = data.name || "Client";
  document.getElementById("navName").innerText = data.name || "Client";
  document.getElementById("savedCount").innerText = data.saved_freelancers?.length || 0;

  renderSavedFreelancers(data.saved_freelancers || []);

  const unreadEl = document.getElementById("unreadMessages");
  if (unreadEl) unreadEl.innerText = data.unread_messages_count || 0;

  const banner = document.getElementById("verifyBanner");
  if (banner) banner.style.display = data.is_verified ? "none" : "block";

  // --- Profile Completeness Check ---
  const isProfileIncomplete = !data.name || !data.project_type || !data.budget_range;
  const container = document.getElementById("incompletedProfile");

  if (isProfileIncomplete && container) {
    container.innerHTML = `
      <div style="background: #be123c; color: white; text-align: center; padding: 15px; font-weight: 600; position: fixed; top: ${data.is_verified ? '70px' : '110px'}; left: 0; width: 100%; z-index: 997; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <i class="fas fa-user-edit"></i> Your profile is incomplete! 
        <a href="createClientProfile.html" style="color: #cbd5f5; text-decoration: underline; margin-left: 10px;">Complete it now</a> 
        to start posting jobs and hiring photographers.
      </div>
    `;
    // Adjust container padding to prevent overlapping
    document.querySelector(".container").style.paddingTop = data.is_verified ? "130px" : "180px";
  }
}

async function updateClientStats() {
  const token = localStorage.getItem("access_token");
  if (!token) return;

  const data = await safeFetch(`${window.CONFIG.API_BASE_URL}/api/orders/`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!data) return;

  const orders = data.results || data;

  let active = 0;
  let spent = 0;

  orders.forEach(order => {
    spent += Number(order.amount) || 0;
    if (!["Completed", "Cancelled"].includes(order.status)) active++;
  });

  document.getElementById("activeOrders").innerText = active;
  document.getElementById("spentAmount").innerText = "PKR " + spent.toLocaleString();

  const convos = await safeFetch(`${window.CONFIG.API_BASE_URL}/api/conversations/`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (convos) {
    document.getElementById("messageCount").innerText = convos.length;
  }
}

async function removeFreelancer(freelancerEmail) {
  const token = localStorage.getItem("access_token");
  if (!token) return;

  const profile = await safeFetch(`${window.CONFIG.API_BASE_URL}/api/profiles/me/`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!profile) return;

  const updatedSaved = (profile.saved_freelancers || [])
    .filter(f => f.user_email !== freelancerEmail);

  const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/profiles/me/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ saved_freelancers: updatedSaved })
  });

  if (res.ok) {
    showToast("Removed successfully", "success");
    initDashboard();
  } else {
    showToast("Failed to remove photographer.", "error");
  }
}

function renderSavedFreelancers(saved) {
  const container = document.getElementById("savedFreelancers");
  if (!container) return;

  container.innerHTML = "";
  if (saved.length === 0) {
    container.innerHTML = "<p style='color:#94a3b8'>No photographer saved yet</p>";
    return;
  }

  saved.forEach((f) => {
    const div = document.createElement("div");

    div.innerHTML = `
      <img src="${f.profile_pic || 'default.jpg'}" 
           onerror="this.src='default.jpg'">
      <span>${f.name}</span>
      <button onclick="removeFreelancer('${f.user_email}')" style="background:#ef4444; color:white; border:none; padding:5px 10px; border-radius:6px; cursor:pointer;">Remove</button>
    `;
    container.appendChild(div);
  });
}

async function renderMyPosts() {
  const container = document.getElementById("myPosts");
  const token = localStorage.getItem("access_token");

  if (!token) {
    container.innerHTML = "<p style='color:#94a3b8'>Please login.</p>";
    return;
  }

  container.innerHTML = "<p style='color:#94a3b8'>Loading...</p>";

  const data = await safeFetch(`${window.CONFIG.API_BASE_URL}/api/jobs/?my_jobs=true`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!data) {
    container.innerHTML = "<p style='color:#ef4444'>Failed to load.</p>";
    return;
  }

  const jobs = data.results || data;

  container.innerHTML = "";

  if (jobs.length === 0) {
    container.innerHTML = "<p style='color:#94a3b8'>No jobs posted yet</p>";
    return;
  }

  jobs.forEach(job => {
    const div = document.createElement("div");
    div.className = "job-item";

    const statusStyle = job.status === 'Completed' ? '#22c55e' : '#38bdf8';

    div.innerHTML = `
      <div class="job-title">${job.title}</div>
      <div class="job-info"><i class="fa-solid fa-location-dot"></i> ${job.location || 'Not specified'}</div>
      ${job.skills_required && job.skills_required.length > 0 ? `<div class="job-info">Skills: ${job.skills_required.join(", ")}</div>` : ''}
      <div class="job-info">Event Date: ${job.deadline}</div>
      <div class="job-info">Budget: PKR ${job.stipend}</div>
      <div class="job-info" style="margin-top: 5px;">Status: <span style="color:${statusStyle}">${job.status}</span></div>

      <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:10px;">
          <button class="response-btn" onclick="seeResponses('${job.id}')">See Responses</button>
          ${job.status !== 'Completed' ? `<button class="complete-btn" style="background:#22c55e; color:white; border:none; padding:8px 14px; border-radius:8px; cursor:pointer;" onclick="markJobCompleted('${job.id}')">Mark Completed</button>` : ''}
          <button class="delete-btn" onclick="deletePost('${job.id}')">Delete Post</button>
      </div>
    `;

    container.appendChild(div);
  });
}

async function markJobCompleted(jobId) {
  const token = localStorage.getItem("access_token");
  if (!token) return;

  showConfirmToast(
    "Mark this job as completed? It will be hidden from active listings.",
    async () => {
      try {
        const response = await fetch(`${window.CONFIG.API_BASE_URL}/api/jobs/${jobId}/mark_completed/`, {
          method: "PATCH",
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (response.ok) {
          showToast("Job marked as completed!", "success");
          setTimeout(() => initDashboard(), 500);
        } else {
          showToast("Failed to update job status.", "error");
        }
      } catch (err) {
        console.error(err);
        showToast("Error connecting to server.", "error");
      }
    }
  );
}

async function deletePost(jobId) {
  const token = localStorage.getItem("access_token");
  if (!token) return;

  showConfirmToast(
    "Delete this job post? This cannot be undone.",
    async () => {
      try {
        const response = await fetch(`${window.CONFIG.API_BASE_URL}/api/jobs/${jobId}/`, {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (response.ok) {
          showToast("Job deleted successfully", "success");
          setTimeout(() => initDashboard(), 500);
        } else {
          showToast("Failed to delete job.", "error");
        }
      } catch (err) {
        showToast("Error connecting to server.", "error");
        console.error(err);
      }
    }
  );
}

function seeResponses(jobId) {
  localStorage.setItem("selectedJobId", jobId);
  window.location.href = "jobResponses.html";
}

function checkAdminAccess() {
  const isStaff = localStorage.getItem("isStaff") === "true";
  if (isStaff) {
    const navLinks = document.getElementById("navLinks");
    if (navLinks) {
      const adminLi = document.createElement("li");
      adminLi.innerHTML = `Admin Panel <i class="fa-solid fa-gauge-high" style="color:#facc15; margin-left:5px;"></i>`;
      adminLi.onclick = () => window.location.href = "adminDashboard.html";
      adminLi.style.transition = "0.3s";
      adminLi.onmouseover = () => adminLi.style.opacity = "0.8";
      adminLi.onmouseout = () => adminLi.style.opacity = "1";
      adminLi.style.color = "#facc15";
      adminLi.style.fontWeight = "bold";
      navLinks.appendChild(adminLi);
    }
  }
}

function logout() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("isStaff");
  window.location.replace("login.html");
}

function goBrowse() { window.location.replace("browseTalent.html"); }
function goProfile() { window.location.replace("clientProfileView.html"); }
function goMessages() { window.location.replace("chat.html"); }
function goOrders() { window.location.replace("order.html"); }
function goPostJob() { window.location.replace("postJob.html"); }  