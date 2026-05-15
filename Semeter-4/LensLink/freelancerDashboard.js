document.addEventListener("DOMContentLoaded", () => {
    console.log(sessionStorage.getItem('profileSuccess'));
    sessionStorage.removeItem('profileSuccess');

    const userName = localStorage.getItem("userName") || "Photographer";
    const navUserName = document.getElementById("navUserName");
    const profileNav = document.getElementById("profileNav");
    const messagesNav = document.getElementById("messagesNav");

    navUserName.innerText = userName;

    const goProfile = () => window.location.href = "profile-view.html";

    if (navUserName) navUserName.addEventListener("click", goProfile);
    if (profileNav) profileNav.addEventListener("click", goProfile);

    if (messagesNav) {
        messagesNav.addEventListener("click", () => {
            window.location.href = "chat.html";
        });
    }

    document.getElementById("unreadMessages").innerText = 0;

    /* IMPORTANT: render dashboard after DOM ready */
    loadFreelancerProfile();
    updateDashboardStats();
    fetchVerificationRequests(1);
    checkAdminAccess();
});

async function loadFreelancerProfile() {
    const email = localStorage.getItem("loggedInUser");
    const token = localStorage.getItem("access_token");
    if (!email || !token) return;

    try {
        const response = await fetch(`${window.CONFIG.API_BASE_URL}/api/profiles/me/`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await response.json();
        if (response.ok) {
            document.getElementById("navUserName").innerText = data.name || "Photographer";
            const unreadEl = document.getElementById("unreadMessages");
            if (unreadEl) unreadEl.innerText = data.unread_messages_count || 0;

            const earningEl = document.getElementById("totalEarnings");
            if (earningEl) earningEl.innerText = "Rs " + (data.total_earnings || 0);

            // Toggle verification banner
            const banner = document.getElementById("verifyBanner");
            if (banner) banner.style.display = data.is_verified ? "none" : "block";
        }

    } catch (err) {
        console.error(err);
    }
}

async function updateDashboardStats() {
    const token = localStorage.getItem("access_token");
    const userEmail = localStorage.getItem("loggedInUser");

    if (!token) return;

    try {
        const response = await fetch(`${window.CONFIG.API_BASE_URL}/api/orders/?email=${userEmail}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            const orders = data.results || data;
            let pending = 0;
            let ongoing = 0;

            orders.forEach(order => {
                if (order.status === "Confirmation Pending") {
                    pending++;
                }
                if (order.status === "Active" || order.status === "Work Submitted" || order.status === "Revision Requested") {
                    ongoing++;
                }
            });

            const pendingEl = document.getElementById("pendingProjects");
            const ongoingEl = document.getElementById("ongoingProjects");
            const earningEl = document.getElementById("totalEarnings");

            if (pendingEl) pendingEl.innerText = pending;
            if (ongoingEl) ongoingEl.innerText = ongoing;
        }
    } catch (err) {
        console.error("Error fetching stats:", err);
    }
}

let allRequests = [];
let currentRequestPage = 1;
let hasNextRequestPage = false;

async function fetchVerificationRequests(page = 1) {
    const container = document.getElementById("verificationContainer");
    const token = localStorage.getItem("access_token");
    const userEmail = localStorage.getItem("loggedInUser");

    if (!token) {
        container.innerHTML = "<p style='color:#9ca3af; font-size:1rem;'>Please login.</p>";
        return;
    }

    if (page === 1) {
        container.innerHTML = "<p style='color:#9ca3af; font-size:1rem;'>Loading requests...</p>";
    }

    try {
        const response = await fetch(`${window.CONFIG.API_BASE_URL}/api/orders/?email=${userEmail}&page=${page}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            const orders = data.results || data;
            
            hasNextRequestPage = !!data.next;
            
            if (page === 1) {
                allRequests = orders;
            } else {
                allRequests = [...allRequests, ...orders];
            }

            renderRequestsList();
            updateLoadMoreButton();
        } else {
            if (page === 1) container.innerHTML = "<p style='color:#ef4444; font-size:1rem;'>Failed to load requests.</p>";
        }
    } catch (err) {
        console.error(err);
        if (page === 1) container.innerHTML = "<p style='color:#ef4444; font-size:1rem;'>Error loading requests.</p>";
    }
}

function updateLoadMoreButton() {
    const container = document.getElementById("loadMoreContainer");
    if (container) {
        container.style.display = hasNextRequestPage ? "block" : "none";
    }
}

async function loadMoreRequests() {
    const btn = document.getElementById("loadMoreBtn");
    btn.innerText = "Loading...";
    btn.disabled = true;

    currentRequestPage++;
    await fetchVerificationRequests(currentRequestPage);

    btn.innerText = "Load More Requests";
    btn.disabled = false;
}

function renderRequestsList() {
    const container = document.getElementById("verificationContainer");
    container.innerHTML = "";

    const orders = allRequests;

    // Filter logic preserved from original
    const paymentPending = orders.filter(o =>
        o.status === "Confirmation Pending" ||
        o.status === "Payment Rejected"
    );

    if (paymentPending.length === 0) {
        container.innerHTML = "<p style='color:#9ca3af; font-size:1rem;'>No pending requests</p>";
        return;
    }

    // --- Payment Verification Cards ---
    paymentPending.forEach(order => {
        const div = document.createElement("div");
        div.className = "verification-card";
        div.innerHTML = `
      <h3>${order.project_name || 'Project'}</h3>
      <p><strong>Client:</strong> ${order.client_name || "Client"}</p>
      <p><strong>Order ID:</strong> ${order.order_id}</p>
      <p><strong>Amount:</strong> PKR ${order.amount}</p>
      <p><strong>Transaction ID:</strong> ${order.transaction_id || 'N/A'}</p>
      <div class="verify-buttons">
       ${order.status === "Payment Rejected"
                ? '<span style="color:#ef4444;font-weight:bold;">Payment Rejected</span>'
                : `<button class="confirm-btn" onclick="confirmPayment('${order.order_id}', this)">Confirm Payment</button>
         <button class="reject-btn" onclick="rejectPayment('${order.order_id}', this)">Reject</button>`
            }
      </div>
      `;
        container.appendChild(div);
    });

}

async function togglePaymentStatus(orderId, newStatus, btn) {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    let originalText = "";
    if (btn) {
        originalText = btn.innerText;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    }

    try {
        const response = await fetch(`${window.CONFIG.API_BASE_URL}/api/orders/${orderId}/`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ status: newStatus })
        });

        if (response.ok) {
            console.log("success")
            loadFreelancerProfile(); // Reload profile to get updated earnings
            
            // Local state tweak
            const order = allRequests.find(o => o.order_id === orderId);
            if (order) order.status = newStatus;
            renderRequestsList();

            updateDashboardStats();
        } else {
            showToast(`Failed to update to ${newStatus}`, "error");
        }
    } catch (err) {
        console.error(err);
        showToast("Error updating order status.", "error");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerText = originalText;
        }
    }
}

// confirm payment
function confirmPayment(orderId, btn) {
    togglePaymentStatus(orderId, "Active", btn);
}

// reject payment
function rejectPayment(orderId, btn) {
    togglePaymentStatus(orderId, "Payment Rejected", btn);
}

fetchVerificationRequests(1);

function goBrowseJob() {
    window.location.href = "browseJob.html";
}
function goProjects() {
    window.location.href = "freelancerProjects.html";
}
function goMessage() {
    window.location.href = "chat.html";
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
