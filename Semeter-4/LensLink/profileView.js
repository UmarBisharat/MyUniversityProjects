

let profile = {};

async function initialize() {
  const urlParams = new URLSearchParams(window.location.search);
  let email = urlParams.get("email");
  const loggedInEmail = localStorage.getItem("loggedInUser");
  const token = localStorage.getItem("access_token");

  // For personal data, use /me/ fallback
  if (!email) {
    try {
      const response = await fetch(`${window.CONFIG.API_BASE_URL}/api/profiles/me/`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!response.ok) {
        window.location.href = "login.html";
        return;
      }
      profile = await response.json();
      loadProfile();
      return;
    } catch (err) {
      console.error("Initialization error:", err);
      // Only redirect if it's genuinely an auth or vital fetch error
      // This avoids redirecting on UI crashes inside loadProfile()
      return;
    }
  }

  // Hide edit button and delete button if viewing someone else's profile
  if (email !== loggedInEmail) {
    const editBtn = document.getElementById("editBtn");
    if (editBtn) editBtn.style.display = "none";
    const deleteBtn = document.querySelector(".delete-btn");
    if (deleteBtn) deleteBtn.style.display = "none";
  }


  try {
    const response = await fetch(`${window.CONFIG.API_BASE_URL}/api/profiles/${email}/`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    profile = await response.json();
    loadProfile();
  } catch (err) {
    console.error(err);
  }
}

/* ================= LOAD PROFILE ================= */

function loadProfile() {

document.getElementById("nameText").innerText =
  profile?.name || "Unnamed Photographer";


  // Reputation stats
  const reputationEl = document.getElementById("reputationStats");
  if (reputationEl) {
    const rating = profile?.avg_rating;
    const rate = profile?.completion_rate;
    const reviewsCount = profile?.reviews_count || 0;
    const points = profile?.reputation_points || 0;

    reputationEl.innerHTML = `
      <div style="display:flex; flex-wrap:wrap; gap:15px; align-items:center;">
        ${rating !== null && rating !== undefined
        ? `<span style="color:#facc15; font-size:1.1rem; font-weight:bold;">★ ${rating} <small style="color:#94a3b8; font-weight:normal;">(${reviewsCount} reviews)</small></span>`
        : `<span style="color:#475569;">No ratings yet</span>`}
        
        ${rate !== null && rate !== undefined
        ? `<span style="color:#22c55e;">✅ ${rate}% Completion</span>`
        : ''}

        <span style="color:#fbbf24; font-weight:bold;">🏆 ${points} Points</span>
      </div>
    `;
  }


/* ===== BASIC INFO ===== */

document.getElementById("departmentText").innerText =
  profile?.department || "Not specified";

document.getElementById("bioText").innerText =
  profile?.bio || "No bio added";

document.getElementById("experienceText").innerText =
  profile?.experience_level || "Not specified";

document.getElementById("locationText").innerText =
  profile?.location || "Not specified";

document.getElementById("portfolioText").innerHTML =
  profile?.portfolio_link
    ? `<a href="${profile.portfolio_link}" target="_blank" style="color:#38bdf8;">View Portfolio</a>`
    : "No link added";

document.getElementById("pricingText").innerText =
  profile?.pricing ? `Rs ${profile.pricing}` : "Not specified";

document.getElementById("bankText").innerText =
  profile?.bank_account || "Not provided";


  /* ===== PROFILE PIC ===== */
  const profilePicEl = document.getElementById("profilePic");
  if (profilePicEl) {
    profilePicEl.src = profile?.profile_pic || 'default.jpg';
    profilePicEl.onerror = function () { this.src = 'default.jpg'; };
  }



  // Check for completeness
  const loggedInEmail = localStorage.getItem("loggedInUser");
  const urlParams = new URLSearchParams(window.location.search);
  const viewingEmail = urlParams.get("email");

  const role = (profile.role || "").toLowerCase();
  const isAppCompleted = 
  profile?.name &&
  profile?.bio &&
  profile?.photography_types &&
  profile?.experience_level &&
  profile?.location &&
  profile?.pricing;


  if (!isAppCompleted && (!viewingEmail || viewingEmail === loggedInEmail)) {
    const container = document.getElementById("incompletedProfile");
    if (container) {
      container.innerHTML = `
        <div class="incomplete-alert-container">
          <div class="incomplete-alert-message">
            <div class="incomplete-alert-icon">⚡</div>
            <div class="incomplete-alert-text">
              Your profile is incomplete! 
              <span>Complete it now to unlock all features like job postings and talent reach.</span>
            </div>
          </div>
          <button class="complete-now-btn" onclick="redirectToCompletion()">Complete Now</button>
        </div>
      `;
    }
  } else {
    const container = document.getElementById("incompletedProfile");
    if (container) container.innerHTML = "";
  }
}

function redirectToCompletion() {
  const role = localStorage.getItem("userRole");
  if (role === "freelancer") {
    window.location.href = "createProfile.html";
  } else {
    window.location.href = "createClientProfile.html";
  }
}


/* ================= EDIT MODE ================= */

function toggleEdit() {
  document.getElementById("editBtn").classList.add("hidden");
  document.getElementById("saveBtn").classList.remove("hidden");

  document.getElementById("nameText").innerHTML =
  `<input id="editName" value="${profile.name || ""}">`;

document.getElementById("headlineText").innerHTML =
  `<input id="editType" value="${profile.photography_types || ""}">`;

document.getElementById("departmentText").innerHTML =
  `<input id="editDepartment" value="${profile.department || ""}">`;

document.getElementById("bioText").innerHTML =
  `<textarea id="editBio">${profile.bio || ""}</textarea>`;

document.getElementById("experienceText").innerHTML =
  `<input id="editExperience" value="${profile.experience_level || ""}">`;

document.getElementById("locationText").innerHTML =
  `<input id="editLocation" value="${profile.location || ""}">`;

document.getElementById("portfolioText").innerHTML =
  `<input id="editPortfolio" value="${profile.portfolio_link || ""}">`;

document.getElementById("pricingText").innerHTML =
  `<input id="editPricing" value="${profile.pricing || ""}">`;

document.getElementById("bankText").innerHTML =
  `<input id="editBank" value="${profile.bank_account || ""}">`;

  // --- PHOTO EDITING LOGIC ---
  const picEl = document.getElementById("profilePic");
  picEl.style.cursor = "pointer";
  picEl.title = "Click to change photo";

  picEl.onclick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        window.pendingProfilePic = file;
        const reader = new FileReader();
        reader.onload = (re) => { picEl.src = re.target.result; };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };
}



/* ================= SAVE PROFILE ================= */

async function saveProfile() {
  const email = localStorage.getItem("loggedInUser");
  const token = localStorage.getItem("access_token");

  const formData = new FormData();
  formData.append("name", document.getElementById("editName").value.trim());
formData.append("photography_types", document.getElementById("editType").value.trim());
formData.append("department", document.getElementById("editDepartment").value.trim());
formData.append("bio", document.getElementById("editBio").value.trim());
formData.append("experience_level", document.getElementById("editExperience").value.trim());
formData.append("location", document.getElementById("editLocation").value.trim());
formData.append("portfolio_link", document.getElementById("editPortfolio").value.trim());
formData.append("pricing", document.getElementById("editPricing").value.trim());
formData.append("bank_account", document.getElementById("editBank").value.trim());
  
if (window.pendingProfilePic) {
    formData.append("profile_pic", window.pendingProfilePic);
  }

  try {
    const response = await fetch(`${window.CONFIG.API_BASE_URL}/api/profiles/me/`, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${token}`
      },
      body: formData
    });

    if (response.ok) {
      profile = await response.json();
      window.pendingProfilePic = null;
      if (document.getElementById("profilePic")) {
        document.getElementById("profilePic").onclick = null;
        document.getElementById("profilePic").style.cursor = "default";
      }
      document.getElementById("saveBtn").classList.add("hidden");
      document.getElementById("editBtn").classList.remove("hidden");
      showSuccessIsland("Profile updated successfully!");
      loadProfile();
    } else {
      showToast("Failed to update profile.", "error");
    }
  } catch (err) {
    console.error(err);
  }
}



/* ================= NAV ================= */

function goDashboard() {
  const role = localStorage.getItem("userRole");
  window.location.href = role === "freelancer" ? "freelancerDashboard.html" : "clientDashboard.html";
}
function goMessage() {
  const role = localStorage.getItem("userRole");
  window.location.href = "chat.html";
}
function goProjects() {
  const role = localStorage.getItem("userRole");
  window.location.href = role === "freelancer" ? "freelancerProjects.html" : "order.html";
}

async function deleteAccount() {
  const email = localStorage.getItem("loggedInUser");
  const token = localStorage.getItem("access_token");

  if (!confirm("CRITICAL: Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently removed.")) {
    return;
  }

  try {
    const response = await fetch(`${window.CONFIG.API_BASE_URL}/api/profiles/me/`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (response.ok) {
      showToast("Your account has been successfully deleted.", "success");
      localStorage.clear();
      window.location.href = "index.html";
    } else {
      showToast("Failed to delete account. Please try again.", "error");
    }
  } catch (err) {
    console.error(err);
    showToast("An error occurred during deletion.", "error");
  }
}


initialize();
