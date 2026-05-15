let currentTab = 'disputes';
let orders = [];
let profiles = [];

let ordersPage = 1;
let usersPage = 1;
let hasNextOrders = false;
let hasNextUsers = false;
let userSearchQuery = "";
let searchTimeout = null;

const ORDERS_URL = `${window.CONFIG.API_BASE_URL}/api/orders/`;
const PROFILES_URL = `${window.CONFIG.API_BASE_URL}/api/profiles/`;

async function fetchData(page = 1, append = false) {
    const token = localStorage.getItem("access_token");
    if (!token) {
        window.location.href = "login.html";
        return;
    }

    try {
        if (currentTab === 'users') {
            const url = `${PROFILES_URL}?search=${userSearchQuery}&page=${page}`;
            const response = await fetch(url, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await response.json();
            const results = data.results || data;
            
            hasNextUsers = !!data.next;
            usersPage = page;
            
            if (append) {
                profiles = [...profiles, ...results];
            } else {
                profiles = results;
            }
            renderUsers();
        } else {
            // Disputes tab
            const url = `${ORDERS_URL}?status=Disputed&page=${page}`;
            const response = await fetch(url, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await response.json();
            const results = data.results || data;

            hasNextOrders = !!data.next;
            ordersPage = page;

            if (append) {
                orders = [...orders, ...results];
            } else {
                orders = results;
            }
            renderOrders();
        }
        updateLoadMoreButton();
    } catch (err) {
        console.error("Failed to fetch data:", err);
        document.getElementById("content").innerHTML = "<div class='empty-state'>Failed to load data. Are you an admin?</div>";
    }
}

function switchTab(tab) {
    currentTab = tab;
    
    // Toggle Search UI
    const searchCont = document.getElementById("userSearchContainer");
    if (searchCont) searchCont.style.display = (tab === 'users') ? "block" : "none";
    
    // Reset state
    if (tab === 'users') {
        usersPage = 1;
        profiles = [];
    } else {
        ordersPage = 1;
        orders = [];
    }

    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    // Find the clicked tab element or use class matching
    const tabElements = document.querySelectorAll('.tab');
    tabElements.forEach(el => {
        if (el.innerText.toLowerCase().includes(tab.toLowerCase())) {
            el.classList.add('active');
        }
    });

    fetchData(1, false);
}

function updateLoadMoreButton() {
    const container = document.getElementById("loadMoreContainer");
    if (!container) return;
    const hasNext = (currentTab === 'users') ? hasNextUsers : hasNextOrders;
    container.style.display = hasNext ? "block" : "none";
}

async function loadMore() {
    const btn = document.getElementById("loadMoreBtn");
    btn.innerText = "Loading...";
    btn.disabled = true;

    if (currentTab === 'users') {
        await fetchData(usersPage + 1, true);
    } else {
        await fetchData(ordersPage + 1, true);
    }

    btn.innerText = "Load More";
    btn.disabled = false;
}

// User Search logic
document.getElementById("userSearchInput")?.addEventListener("input", (e) => {
    clearTimeout(searchTimeout);
    userSearchQuery = e.target.value;
    searchTimeout = setTimeout(() => {
        usersPage = 1;
        fetchData(1, false);
    }, 400);
});

function renderOrders() {
    const container = document.getElementById("content");
    container.innerHTML = "";

    // EXTRA SECURITY: Even if API filters, we ensure only Disputed show up here
    let filtered = orders.filter(o => o.status === 'Disputed'); 

    if (filtered.length === 0) {
        container.innerHTML = `<div class="empty-state">No disputed orders found.</div>`;
        return;
    }

    filtered.forEach(order => {
        const card = document.createElement("div");
        card.className = "card";
        
        card.innerHTML = `
            <div class="card-header">
                <div class="card-title">${order.project_name}</div>
                <div class="badge badge-dispute">${order.status}</div>
            </div>
            
            <div class="info-row">
                <div class="info-item">Client: <b>${order.client_name}</b></div>
                <div class="info-item">Photographer: <b>${order.freelancer_name}</b></div>
                <div class="info-item">Amount: <b>PKR ${order.amount}</b></div>
            </div>

            <div class="info-row">
                <div class="info-item">Transaction ID: <b>${order.transaction_id || 'None'}</b></div>
                <div class="info-item">Deadline: <b>${order.deadline}</b></div>
            </div>

            <div style="background: rgba(239, 68, 68, 0.05); padding: 12px; border-radius: 8px; border: 1px solid rgba(239, 68, 68, 0.2);">
                <p style="color: #ef4444; font-weight: 600; font-size: 0.9rem;">⚠️ DISPUTE REASON</p>
                <p style="font-size: 0.95rem; margin-top: 5px;">${order.dispute_reason || 'No reason provided'}</p>
            </div>

            ${order.payment_proof ? `
                <div>
                    <p style="color: #94a3b8; font-size: 0.85rem; margin-bottom: 5px;">Payment Proof Screenshot:</p>
                    <img src="${order.payment_proof}" class="proof-img" onclick="viewImage('${order.payment_proof}')">
                </div>
            ` : ''}

            <div class="actions">
                <button class="btn btn-primary" onclick="resolveDispute('${order.order_id}', 'mutual_cancel')">Mutual Cancel</button>
                <button class="btn btn-secondary" style="background: #22c55e; color: white;" onclick="setAsActive('${order.order_id}')">Set as Active</button>
                <button class="btn btn-secondary" style="background: #8b5cf6;" onclick="startMediationChat('${order.order_id}')">💬 Start Mediation Chat</button>
            </div>
        `;
        container.appendChild(card);
    });
}

async function setAsActive(orderId) {
    if (!confirm("Are you sure you want to mark this dispute as Active?")) return;
    const token = localStorage.getItem("access_token");
    try {
        const response = await fetch(`${ORDERS_URL}${orderId}/`, {
            method: "PATCH",
            headers: { 
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ status: "Active" })
        });
        if (response.ok) {
            showToast("Order is now Active.", "success");
            fetchData(1, false);
        } else {
            showToast("Failed to update status.", "error");
        }
    } catch (err) {
        console.error(err);
    }
}

function renderUsers() {
    const container = document.getElementById("content");
    container.innerHTML = "";

    if (profiles.length === 0) {
        container.innerHTML = `<div class="empty-state">No users matching your search.</div>`;
        return;
    }

    profiles.forEach(profile => {
        const card = document.createElement("div");
        card.className = "card";
        
        card.innerHTML = `
            <div class="card-header">
                <div class="card-title">${profile.name} (${profile.role})</div>
                <div class="badge ${profile.is_banned ? 'badge-dispute' : ''}">${profile.is_banned ? 'BANNED' : 'ACTIVE'}</div>
            </div>
            
            <div class="info-row">
                <div class="info-item">Email: <b>${profile.user_email}</b></div>
                <div class="info-item">Verified: <b>${profile.is_verified ? 'Yes' : 'No'}</b></div>
                <div class="info-item">Points: <b>${profile.reputation_points}</b></div>
            </div>

            <div class="actions">
                <button class="btn ${profile.is_banned ? 'btn-primary' : 'btn-danger'}" onclick="toggleBan('${profile.user_email}')">
                    ${profile.is_banned ? 'Unban User' : 'Ban User'}
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

// Action functions
async function startMediationChat(orderId) {
    const token = localStorage.getItem("access_token");
    try {
        const response = await fetch(`${ORDERS_URL}${orderId}/create_mediation_chat/`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
        });
        if (response.ok) {
            const convo = await response.json();
            const mediationUser = {
                name: convo.name,
                avatar: "https://res.cloudinary.com/dwhdzsexh/image/upload/v1/media/profiles/group-chat-icon.png",
                email: null,
                isGroup: true
            };
            localStorage.setItem("activeChatUser", JSON.stringify(mediationUser));
            window.location.href = "chat.html";
        }
    } catch (err) { console.error(err); }
}

async function toggleBan(email) {
    const token = localStorage.getItem("access_token");
    try {
        const response = await fetch(`${PROFILES_URL}${email}/toggle_ban/`, {
            method: "PATCH",
            headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
        });
        if (response.ok) {
            showToast("User status updated.", "success");
            fetchData(1, false);
        }
    } catch (err) { console.error(err); }
}

async function resolveDispute(orderId, resolution) {
    const notes = prompt("Enter resolution notes for the parties:");
    if (notes === null) return;
    const token = localStorage.getItem("access_token");
    try {
        const response = await fetch(`${ORDERS_URL}${orderId}/resolve_dispute/`, {
            method: "PATCH",
            headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ resolution, resolution_notes: notes })
        });
        if (response.ok) {
            showToast("Dispute resolved.", "success");
            fetchData(1, false);
        }
    } catch (err) { console.error(err); }
}

function viewImage(src) {
    document.getElementById("modalImg").src = src;
    document.getElementById("imgModal").style.display = "flex";
}

// Initial fetch
fetchData(1, false);
