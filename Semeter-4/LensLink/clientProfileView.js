
async function loadProfile(){
  const email = localStorage.getItem("loggedInUser");
  const token = localStorage.getItem("access_token");

  if(!email || !token) {
      window.location.href = "login.html";
      return;
  }

  try {
      const response = await fetch(`${window.CONFIG.API_BASE_URL}/api/profiles/me/`, {
          headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await response.json();

      if(!response.ok){
        showToast("Profile not found.", "error");
        window.location.href = "createClientProfile.html";
        return;
      }

      // Display data
      document.getElementById("profileName").innerText = data.name || "Client Name";
      document.getElementById("companyName").innerText = data.company_name || "Not Specified";
      document.getElementById("contactEmail").innerText = data.user_email || email;
      document.getElementById("projectType").innerText = data.project_type || "No preference set";
      document.getElementById("budgetRange").innerText = data.budget_range ? `Rs ${data.budget_range}` : "Open Budget";

      const loggedInEmail = localStorage.getItem("loggedInUser");
      const urlParams = new URLSearchParams(window.location.search);
      const viewingEmail = urlParams.get("email");
      
      let isAppCompleted = false;
      
      if(data.project_type && data.budget_range){
        isAppCompleted = true;
      }

      if (!isAppCompleted && (!viewingEmail || viewingEmail === loggedInEmail)) {
        const container = document.getElementById("incompletedProfile");
        if (container) {
          container.innerHTML = `
            <div class="incomplete-alert-container">
              <div class="incomplete-alert-message">
                <div class="incomplete-alert-icon">⚡</div>
                <div class="incomplete-alert-text">
                  Your profile is incomplete! 
                  <span>Complete it now to unlock all features</span>
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

      if (data.profile_pic) {
          document.getElementById("profileImage").src = data.profile_pic;
      }
      
      // Cleanup UI state
      document.getElementById("profileCard").classList.remove("editing");
      document.getElementById("editBtn").classList.remove("hidden");
      document.getElementById("cancelBtn").classList.add("hidden");
      document.getElementById("saveBtn").classList.add("hidden");

      // Store locally for quick access
      localStorage.setItem("clientProfile", JSON.stringify(data));
      window.currentProfileData = data;
  } catch (err) {
      console.error(err);
  }
}

function editProfile() {
  const data = window.currentProfileData || {};

  document.getElementById("profileCard").classList.add("editing");
  document.getElementById("editBtn").classList.add("hidden");
  document.getElementById("cancelBtn").classList.remove("hidden");
  document.getElementById("saveBtn").classList.remove("hidden");

  // Transform fields into inputs
  document.getElementById("profileName").innerHTML =
    `<input id="editClientName" value="${data.name || ""}" placeholder="Full Name">`;

  document.getElementById("companyName").innerHTML =
    `<input id="editCompanyName" value="${data.company_name || ""}" placeholder="Company Name">`;

  document.getElementById("projectType").innerHTML =
    `<input id="editProjectType" value="${data.project_type || ""}" placeholder="e.g. wedding, Product">`;

  document.getElementById("budgetRange").innerHTML =
    `<input id="editBudgetRange" value="${data.budget_range || ""}" placeholder="e.g. 50k - 100k">`;

  // Image upload trigger
  document.getElementById("profileImage").onclick = () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = (e) => {
          const file = e.target.files[0];
          if(file) {
              const reader = new FileReader();
              reader.onload = (re) => {
                  document.getElementById("profileImage").src = re.target.result;
                  window.pendingImage = file;
              };
              reader.readAsDataURL(file);
          }
      };
      input.click();
  };
}

async function saveProfile() {
  const email = localStorage.getItem("loggedInUser");
  const token = localStorage.getItem("access_token");

  const formData = new FormData();
  formData.append("name", document.getElementById("editClientName").value.trim());
  formData.append("company_name", document.getElementById("editCompanyName").value.trim());
  formData.append("project_type", document.getElementById("editProjectType").value.trim());
  formData.append("budget_range", document.getElementById("editBudgetRange").value.trim());

  if(window.pendingImage) {
      formData.append("profile_pic", window.pendingImage);
  }

  try {
      const saveBtn = document.getElementById("saveBtn");
      saveBtn.innerText = "Saving...";
      saveBtn.disabled = true;

      const response = await fetch(`${window.CONFIG.API_BASE_URL}/api/profiles/me/`, {
          method: "PATCH",
          headers: { "Authorization": `Bearer ${token}` },
          body: formData
      });

      if (response.ok) {
          window.pendingImage = null;
          saveBtn.innerText = "Save Changes";
          saveBtn.disabled = false;
          loadProfile();
      } else {
          showToast("Failed to update profile.", "error");
          saveBtn.innerText = "Save Changes";
          saveBtn.disabled = false;
      }
  } catch (err) {
      console.error(err);
      showToast("Error saving profile.", "error");
  }
}
function redirectToCompletion() {
  const role = localStorage.getItem("userRole");
  console.log(role);
  if (role === "freelancer") {
    window.location.href = "createProfile.html";
  } else {
    window.location.href = "createClientProfile.html";
  }
}


function goDashboard(){ window.location.href = "clientDashboard.html"; }
function goBrowse(){ window.location.href = "browseTalent.html"; }
function goMessages(){ window.location.href = "chat.html"; }

loadProfile();