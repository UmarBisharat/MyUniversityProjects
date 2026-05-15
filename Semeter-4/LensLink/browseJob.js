const container = document.getElementById("jobsContainer");
let allJobs = []; 
let appliedJobIds = new Set();
let currentPage = 1;
let currentSearch = "";
let hasNextPage = false;

async function loadAppliedJobs() {
    try {
        const token = localStorage.getItem("access_token");
        if (!token) return;
        const response = await fetch(`${window.CONFIG.API_BASE_URL}/api/applications/`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (response.ok) {
            const data = await response.json();
            // Handle paginated or non-paginated applications
            const apps = data.results || data; 
            appliedJobIds = new Set(apps.map(app => app.job));
        }
    } catch (err) {
        console.error("Error loading applied jobs:", err);
    }
}

async function fetchJobs(page = 1, search = "") {
    try {
        const token = localStorage.getItem("access_token");
        const headers = token ? { "Authorization": `Bearer ${token}` } : {};
        
        let url = `${window.CONFIG.API_BASE_URL}/api/jobs/?status=Open&page=${page}`;
        if (search) {
            url += `&search=${encodeURIComponent(search)}`;
        }

        const response = await fetch(url, { headers: headers });

        if (response.ok) {
            const data = await response.json();
            hasNextPage = !!data.next;
            
            const apiJobs = data.results.map(job => ({
    id: job.id,
    title: job.title,
    location: job.location || "N/A",   // ✅ NEW
    deadline: job.deadline,
    stipend: job.stipend,
    client: job.client_name || "Client",
    client_email: job.client_email,
    profile: job.client_profile_pic || "https://i.pravatar.cc/40"
}));

            if (page === 1) {
                allJobs = apiJobs;
            } else {
                allJobs = [...allJobs, ...apiJobs];
            }

            renderJobs();
            updateLoadMoreButton();
        }
    } catch (err) {
        console.error("Failed to load jobs from API.", err);
        container.innerHTML = "<p style='text-align:center; color: #ef4444;'>Error loading jobs. Please try again.</p>";
    }
}

function renderJobs() {
    container.innerHTML = "";
    if (allJobs.length === 0) {
        container.innerHTML = "<p style='text-align:center;'>No jobs found.</p>";
        return;
    }

    allJobs.forEach(job => {
        let card = document.createElement("div");
        card.className = "job-card";
        const isApplied = appliedJobIds.has(job.id);
const formattedDate = job.deadline 
  ? new Date(job.deadline).toLocaleDateString() 
  : "N/A";
        card.innerHTML = `
<div class="job-header">
    <img src="${job.profile || 'https://i.pravatar.cc/40'}">
    <strong>${job.client || "Client"}</strong>
</div>

<div class="job-title">${job.title}</div>
<div class="job-info">Location: ${job.location}</div>
<div class="job-info">Event Date: ${formattedDate}</div>
<div class="job-info">Budget: Rs ${Number(job.stipend || 0).toLocaleString()}</div>

<div class="buttons">
    <button class="apply" ${isApplied ? 'disabled style="background:#22c55e; color:white;"' : ''}>
        ${isApplied ? 'Applied' : 'Apply'}
    </button>
    <button class="message">Message</button>
</div>
`;

        const applyBtn = card.querySelector(".apply");
        const msgBtn = card.querySelector(".message");

        applyBtn.addEventListener("click", () => showMessageCard(job));
        msgBtn.addEventListener("click", () => messageClient(job));

        container.appendChild(card);
    });
}

function updateLoadMoreButton() {
    const loadMoreContainer = document.getElementById("loadMoreContainer");
    if (loadMoreContainer) {
        loadMoreContainer.style.display = hasNextPage ? "block" : "none";
    }
}

async function loadMore() {
    const btn = document.getElementById("loadMoreBtn");
    const originalText = btn.innerText;
    btn.innerText = "Loading...";
    btn.disabled = true;

    currentPage++;
    await fetchJobs(currentPage, currentSearch);

    btn.innerText = originalText;
    btn.disabled = false;
}

async function displayJobs() {
    container.innerHTML = "<p style='text-align:center;'>Loading open jobs...</p>";
    await loadUserProfile();
    await loadAppliedJobs();
    await fetchJobs(1, "");
}

async function loadUserProfile() {
    const token = localStorage.getItem("access_token");
    if (!token) {
        // Fallback to local storage if API fails or not logged in
        const userName = localStorage.getItem("userName") || "Photgrapher";
        document.getElementById("navUserName").innerText = userName;
        return;
    }
    try {
        const response = await fetch(`${window.CONFIG.API_BASE_URL}/api/profiles/me/`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (response.ok) {
            const data = await response.json();
            document.getElementById("navUserName").innerText = data.name || "Photographer";
        }
    } catch (err) {
        console.error("Error loading user profile:", err);
    }
}

// Reuse existing message functions
async function messageClient(job) {
    if (!job.client_email) {
        showToast("Cannot initiate chat: Client email missing.", "error");
        return;
    }
    localStorage.setItem("activeChatUser", JSON.stringify({
        name: job.client,
        email: job.client_email,
        avatar: job.profile || "https://i.pravatar.cc/150"
    }));
    window.location.href = "chat.html";
}

function showMessageCard(job) {
    const overlay = document.createElement("div");
    overlay.className = "overlay";

    const card = document.createElement("div");
    card.className = "island-card";

    card.innerHTML = `
        <div class="island-title">Apply for ${job.title}</div>
        <div class="island-subtitle">to <b>${job.client}</b></div>
        <textarea id="messageInput" class="island-textarea" placeholder="Briefly explain why you're a good fit"></textarea>
        <div class="island-actions">
            <button id="cancelBtn" class="btn-island btn-cancel">Cancel</button>
            <button id="sendBtn" class="btn-island btn-send">Send Application</button>
        </div>
    `;

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    card.querySelector("#cancelBtn").onclick = () => document.body.removeChild(overlay);
    card.querySelector("#sendBtn").onclick = async () => {
        const message = document.getElementById("messageInput").value.trim();
        const token = localStorage.getItem("access_token");
        if (!message) { showToast("Please enter a message", "warning"); return; }

        const sendBtn = card.querySelector("#sendBtn");
        sendBtn.innerText = "Sending...";
        sendBtn.disabled = true;

        try {
            const response = await fetch(`${window.CONFIG.API_BASE_URL}/api/applications/`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({ job: job.id, cover_letter: message })
            });

            if (response.ok) {
                appliedJobIds.add(job.id);
                document.body.removeChild(overlay);
                showToast("Application sent successfully!", "success");
                renderJobs(); 
            } else {
                showToast("Failed to send application. Maybe you already applied?", "error");
                sendBtn.innerText = "Send Application";
                sendBtn.disabled = false;
            }
        } catch (err) {
            showToast("Error sending application.", "error");
            sendBtn.innerText = "Send Application";
            sendBtn.disabled = false;
        }
    };
}

function goDashboard() { window.location.href = "freelancerDashboard.html"; }
function goBrowse() { window.location.href = "browseJob.html"; }
function goProjects() { window.location.href = "freelancerProjects.html"; }
function goMessage() { window.location.href = "chat.html"; }

function logout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("loggedInUser");
    localStorage.removeItem("role");
    localStorage.removeItem("userName");
    window.location.href = "login.html";
}

displayJobs();