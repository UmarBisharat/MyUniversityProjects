let allFreelancers = [];
let currentUserProfile = null;
let currentPage = 1;
let currentSearch = "";
let hasNextPage = false;

/* -------- LOAD PROFILES FROM API -------- */

async function fetchFreelancers(page = 1, search = "") {
  const grid = document.getElementById("freelancerGrid");
  if (page === 1 && grid) {
    grid.innerHTML = '<div class="loading"><i class="fa-solid fa-camera-retro fa-bounce"></i><span>Loading Photographers...</span></div>';
  }
  if (page === 1) await loadUserProfile();
  try {
    const token = localStorage.getItem("access_token");
    const headers = token ? { "Authorization": `Bearer ${token}` } : {};

    let url = `${window.CONFIG.API_BASE_URL}/api/profiles/?role=freelancer&page=${page}`;
    if (search) {
      url += `&search=${encodeURIComponent(search)}`;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error("API failed");

    const data = await response.json();
    hasNextPage = !!data.next;

    const formattedProfiles = data.results.map(p => {
      let workMedia = [];
      if (p.portfolio_media && p.portfolio_media.length) {
        p.portfolio_media.forEach(media => {
          workMedia.push({ type: media.media_type, url: media.file });
        });
      }
      return {
        ...p,
        userId: p.user_email,
        portfolio_link: p.portfolio_link || "",
        photography_types: Array.isArray(p.photography_types)
          ? p.photography_types.join(", ")
          : (p.photography_types || ""),
        workMedia
      };
    });

    if (page === 1) {
      allFreelancers = formattedProfiles;
    } else {
      allFreelancers = [...allFreelancers, ...formattedProfiles];
    }

    renderFreelancerCards();
    updateLoadMoreButton();

  } catch (err) {
    console.error("Failed to load profiles", err);
    const grid = document.getElementById("freelancerGrid");
    if (grid) grid.innerHTML = '<div class="loading"><i class="fa-solid fa-triangle-exclamation" style="color: #ef4444;"></i><span>Error loading Photographers.</span></div>';
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
  await fetchFreelancers(currentPage, currentSearch);

  btn.innerText = "Load More Photographers";
  btn.disabled = false;
}

async function renderFreelancers() {
  // This is the search function triggered by oninput
  const searchInput = document.getElementById("searchInput");
  if (!searchInput) return;

  currentSearch = searchInput.value.trim();
  currentPage = 1;

  const grid = document.getElementById("freelancerGrid");
  if (grid) grid.innerHTML = '<div class="loading"><i class="fa-solid fa-cloud-bolt fa-spin"></i><span>Searching...</span></div>';

  if (window.searchTimeout) clearTimeout(window.searchTimeout);

  window.searchTimeout = setTimeout(async () => {
    await fetchFreelancers(currentPage, currentSearch);
  }, 400);
}

function renderFreelancerCards() {
  const grid = document.getElementById("freelancerGrid");
  if (!grid) return;

  grid.innerHTML = "";

  if (allFreelancers.length === 0) {
    grid.innerHTML = '<div class="loading"><i class="fa-solid fa-camera-slash"></i><span>No Photographers found</span></div>';
    return;
  }

  allFreelancers.forEach(f => {
    const div = document.createElement("div");
    div.className = "card";

    const avgRating = f.avg_rating || 0;
    const reviewCount = f.reviews_count || 0;

    div.innerHTML = `
       <div class="card-header" onclick="viewFreelancerProfile('${f.userId}')">
         <img src="${f.profile_pic || 'default.jpg'}" 
              onerror="this.src='default.jpg'"
              class="profile-avatar"
              alt="${f.name}" />
         <div class="name">${f.name}</div>
       </div>
       <div class="skill">${f.photography_types || "Not specified"}</div>
       <div class="department" style="margin-bottom:8px;">${f.department || "not specified"}</div>
       <div class="price">Starting at PKR ${f.pricing ?? "Not specified"}</div>
       <div class="rating">
         ${generateStars(avgRating)}
         <span class="review-count">(${reviewCount} reviews)</span>
       </div>
       <div style="margin-top:5px; font-size:13px;">
          ${f.completion_rate != null ? `<span style="color:#22c55e;">✅ ${f.completion_rate}% Completion</span>` : ''}
          ${f.reputation_points != null ? `<span style="color:#fbbf24; margin-left:10px;">🏆 ${f.reputation_points} Pts</span>` : ''}
       </div>
       <div class="button-group">
         ${(currentUserProfile?.saved_freelancers || []).some(s => s.user_email === f.user_email) 
           ? `<button class="btn save" style="background:#475569; cursor:default;" disabled>Saved</button>`
           : `<button class="btn save" onclick="saveFreelancer('${f.name.replace(/'/g, "\\'")}','${f.user_email}','${f.profile_pic}')">Save</button>`
         }
         <button class="btn view-profile" 
  onclick="openPortfolio('${f.portfolio_link}')">
  View Portfolio
</button>
       </div>
       <button class="btn message-btn" onclick="messageFreelancer('${f.userId}')">Message</button>
    `;
    grid.appendChild(div);
  });
}
function openPortfolio(link) {
  if (!link) {
    showToast("No portfolio link provided.", "info");
    return;
  }

  // Fix missing http issue
  if (!link.startsWith("http")) {
    link = "https://" + link;
  }

  window.open(link, "_blank");
}
// Keep existing helper functions
async function saveFreelancer(name, email, profilePic) {
  const token = localStorage.getItem("access_token");
  if (!token) { showToast("Please login to save Photographers.", "warning"); return; }
  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/profiles/me/`, { headers: { "Authorization": `Bearer ${token}` } });
    const profile = await res.json();
    let saved = profile.saved_freelancers || [];
    if (saved.some(f => f.user_email === email)) { showToast("Photographer already saved", "info"); return; }
    saved.push({ name, user_email: email, profile_pic: profilePic });
    const patchRes = await fetch(`${window.CONFIG.API_BASE_URL}/api/profiles/me/`, {
      method: "PATCH", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ saved_freelancers: saved })
    });
    if (patchRes.ok) {
      showToast("Photographer saved!", "success");
      await loadUserProfile(); // Refresh local saved list
      renderFreelancerCards(); // Re-render to update button state
    }
  } catch (err) { showToast("Error saving Photographer", "error"); }
}

async function messageFreelancer(userId) {
  const freelancer = allFreelancers.find(f => f.userId === userId);
  if (!freelancer) return;
  localStorage.setItem("activeChatUser", JSON.stringify({
    name: freelancer.name, email: freelancer.user_email,
    avatar: freelancer.profile_pic || "https://i.pravatar.cc/150"
  }));
  window.location.href = "chat.html";
}

function generateStars(rating) {
  let starsHTML = "";
  for (let i = 1; i <= 5; i++) {
    starsHTML += (i <= Math.floor(rating)) ? "★" : "<span>★</span>";
  }
  return starsHTML;
}

/* -------- WORK GALLERY LOGIC -------- */
// const workModal = document.getElementById("workModal");
// const mediaContainer = document.getElementById("mediaContainer");
// let currentMedia = [];
// let currentIndex = 0;

// function openWorkGallery(mediaArray){
//   if(!mediaArray || mediaArray.length === 0){ showToast("No work uploaded yet.", "info"); return; }
//   currentMedia = mediaArray; currentIndex = 0; showMedia();
//   workModal.style.display = "flex";
// }

// function showMedia(){
//   const item = currentMedia[currentIndex];
//   mediaContainer.innerHTML = "";
//   if(item.type === "image"){
//     const img = document.createElement("img"); img.src = item.url; img.className = "work-image";
//     mediaContainer.appendChild(img);
//   } else {
//     const video = document.createElement("video"); video.src = item.url; video.controls = true;
//     video.muted=true; video.autoplay = true; video.className = "work-image";
//     mediaContainer.appendChild(video);
//   }
// }

// document.querySelector(".work-next").onclick = () => { currentIndex = (currentIndex + 1) % currentMedia.length; showMedia(); };
// document.querySelector(".work-prev").onclick = () => { currentIndex = (currentIndex - 1 + currentMedia.length) % currentMedia.length; showMedia(); };
// document.querySelector(".work-close").onclick = () => workModal.style.display = "none";
// workModal.onclick = (e)=> { if(e.target === workModal) workModal.style.display = "none"; };

function goHome() { window.location.href = "index.html"; }
function viewFreelancerProfile(email) { window.location.href = `profile-view.html?email=${email}`; }
function goDashboard() { window.location.href = "clientDashboard.html"; }
function goProfile() { window.location.href = "clientProfileView.html"; }
function goMessage() { window.location.href = "chat.html"; }

async function loadUserProfile() {
  const token = localStorage.getItem("access_token");
  if (!token) {
    const userName = localStorage.getItem("userName") || "Client";
    document.getElementById("navUserName").innerText = userName;
    return;
  }
  try {
    const response = await fetch(`${window.CONFIG.API_BASE_URL}/api/profiles/me/`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (response.ok) {
      currentUserProfile = await response.json();
      document.getElementById("navUserName").innerText = currentUserProfile.name || "Client";
    }
  } catch (err) {
    console.error("Error loading user profile:", err);
  }
}

function logout() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("loggedInUser");
  localStorage.removeItem("role");
  localStorage.removeItem("userName");
  window.location.href = "login.html";
}

fetchFreelancers(1, "");

