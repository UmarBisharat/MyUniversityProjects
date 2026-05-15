let selectedOrderId = null;
let currentSubmitOrderId = null;

let allOrders = [];
let currentPage = 1;
let hasNextPage = false;

async function fetchOrders(page = 1) {
  const container = document.getElementById("ordersContainer");
  const token = localStorage.getItem("access_token");

  if (!token) return;

  if (page === 1) {
    container.innerHTML = "<div class='loading'>Loading...</div>";
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

    renderOrdersList();
    updateLoadMoreButton();

  } catch (err) {
    console.error("Error loading orders:", err);
    if (page === 1) {
      container.innerHTML = "<p style='color:#ef4444'>Failed to load orders.</p>";
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
  await fetchOrders(currentPage);

  btn.innerText = "Load More Orders";
  btn.disabled = false;
}

function renderOrdersList() {
  const container = document.getElementById("ordersContainer");
  container.innerHTML = "";

  if (allOrders.length === 0) {
    container.innerHTML = "<p style='color:#94a3b8; margin-top: 10px;'>No orders yet</p>";
    return;
  }

  allOrders.forEach(order => {
    const card = document.createElement("div");
    card.className = "order-card";

    const userRole = localStorage.getItem("userRole");
    const isClient = userRole === "client";
    const isFreelancer = userRole === "freelancer";

    const showReviewBtn = order.status === "Completed" && !order.has_review;
    const showProofUpload = isClient && (order.status === "Pending Payment" || order.status === "Payment Rejected");
    const showDeliverable = order.status === "Work Submitted" || order.status === "Payment Requested" || order.status === "Completed" || order.status === "Disputed";
    const showApproveDispute = isClient && order.status === "Work Submitted";
    const showRequestPayout = isFreelancer && order.status === "Payment Requested";

    card.innerHTML = `
      <div class="order-title">${order.shoot_type}</div>
      <div class="order-info">${isClient ? `Photographer: ${order.freelancer_name}` : `Client: ${order.client_name}`}</div>
      <div class="order-info">Booking ID: ${order.order_id}</div>
      <div class="order-info">Shoot Date: ${order.deadline}</div>
      <div class="order-info">Amount: PKR ${order.amount}</div>
      <div class="order-info">Transaction ID: ${order.transaction_id || 'N/A'}</div>
      <div class="status ${getStatusClass(order.status)}">${order.status}</div>

      ${order.status === "Confirmation Pending" ? `
        <div style="margin-top:10px; color:#facc15; font-size:0.9rem;">⏳ ${isClient ? 'Your payment will be verified shortly...' : 'Verify this payment proof to start the order'}</div>
        ${isFreelancer ? `
          <div style="margin-top:12px; border:1px solid #38bdf8; padding:10px; border-radius:8px;">
             <p style="font-size:13px; color:#38bdf8; margin-bottom:5px;">Client Receipt:</p>
             ${order.payment_proof ? `<img src="${order.payment_proof}" style="width:100px; height:60px; object-fit:cover; border-radius:4px; cursor:pointer;" onclick="window.open('${order.payment_proof}')">` : '<p>No Image</p>'}
             <button onclick="confirmClientPayment('${order.order_id}')" style="width:100%; margin-top:8px; padding:8px; background:#22c55e; color:white; border:none; border-radius:6px; cursor:pointer; font-weight:600;">Confirm Payment</button>
          </div>
        ` : ''}
      ` : ''}

      ${showProofUpload ? `
        <div style="margin-top:15px;">
          <button type="button" onclick="redirectToPayment('${order.order_id}')" style="background:#38bdf8; color:#020617; border:none; padding:10px 16px; border-radius:8px; font-weight:700; cursor:pointer; width:100%; display:flex; align-items:center; justify-content:center; gap:8px;">
            <i class="fas fa-credit-card"></i> Pay Now & Verify
          </button>
        </div>
      ` : ''}

      ${showDeliverable && order.work_submission_text ? `
        <div style="margin-top:12px; background:#0f2340; padding:12px; border-radius:8px; border:1px solid rgba(56,189,248,0.2);">
          <p style="color:#38bdf8; font-weight:600; margin-bottom:6px;">📦 ${isFreelancer ? 'Your Submission' : 'Photographer Submission'}</p>
          <p style="color:#cbd5e1;">${order.work_submission_text}</p>
          ${order.work_submission_link ? `<a href="${order.work_submission_link}" target="_blank" style="color:#38bdf8; word-break:break-all;">🔗 ${order.work_submission_link}</a>` : ''}
        </div>
      ` : ''}

      ${showApproveDispute ? `
        <div style="margin-top:12px; display:flex; flex-direction:column; gap:10px;">
          <div style="display:flex; gap:10px;">
            <button onclick="approveWork('${order.order_id}')" style="flex:1; padding:10px; background:#22c55e; border:none; border-radius:8px; color:white; font-weight:600; cursor:pointer;">
              Approve Work
            </button>
          </div>
          <button onclick="disputeOrder('${order.order_id}')" style="width:100%; padding:10px; background:#ef4444; border:none; border-radius:8px; color:white; font-weight:600; cursor:pointer;">
            ⚠️ Dispute
          </button>
        </div>
      ` : ''}

    <!--  ${order.status === "Revision Requested" && isFreelancer ? `
        <div style="margin-top:12px; background:rgba(234,179,8,0.1); padding:12px; border-radius:8px; border:1px dashed #eab308;">
          <p style="color:#eab308; font-weight:500; font-size:0.9rem; margin-bottom:8px;">Revision Requested! Please review the client's feedback and re-submit your work.</p>
          <button onclick="openSubmitWorkModal('${order.order_id}')" style="width:100%; padding:10px; background:#38bdf8; border:none; border-radius:8px; color:#020617; font-weight:700; cursor:pointer;">
            📤 Re-submit Work
          </button>
        </div>
      ` : ''} -->

      ${showRequestPayout ? `
        <div style="margin-top:12px; background:rgba(34,197,94,0.1); padding:12px; border-radius:8px; border:1px dashed #22c55e;">
          <p style="color:#22c55e; font-weight:500; font-size:0.9rem; margin-bottom:8px;">Work Approved!</p>
          <button onclick="releasePaymentRequest('${order.order_id}')" style="width:100%; padding:10px; background:#38bdf8; border:none; border-radius:8px; color:#020617; font-weight:700; cursor:pointer;">
            💰 Request Payout from Admin
          </button>
        </div>
      ` : ''}

      ${order.status === "Payment Requested" && isFreelancer ? `
        <div style="color:#facc15; margin-top:10px; font-weight:500; font-size:0.9rem;">⏳ Payout request sent. Admin will release funds shortly.</div>
      ` : ''}

      ${order.status === "Disputed" ? `
        <div style="color:#f97316; margin-top:10px; font-weight:600; background:rgba(249,115,22,0.1); padding:10px; border-radius:8px; border:1px solid #f97316;">
          ⚠️ Under Review — Admin is mediating this dispute.
          ${order.dispute_reason ? `<p style="color:#cbd5e1; font-weight:normal; margin-top:5px; font-size:0.9rem;">Reason: ${order.dispute_reason}</p>` : ''}
        </div>
      ` : ''}

      ${showReviewBtn ? `<button class="review-btn" onclick="openReviewModal('${order.id}')">Leave Review</button>` : ''}
      ${order.has_review ? `<div style="color:#22c55e; margin-top:10px; font-weight:600;"><i class="fas fa-check-circle"></i> Reviewed</div>` : ''}
    `;
    container.appendChild(card);
  });
}

function redirectToPayment(orderId) {
  window.location.href = `verifyPayment.html?orderId=${orderId}`;
}

/* ---- STATUS CLASS ---- */
function getStatusClass(status) {
  if (status === "Completed") return "delivered";
  if (["Active", "Work Submitted", "Payment Requested"].includes(status)) return "progress";
  if (["Payment Rejected", "Disputed", "Cancelled"].includes(status)) return "rejected";
  return "pending";
}

/* ---- CONFIRM PAYMENT (Freelancer) ---- */
async function confirmClientPayment(orderId) {
  showConfirmToast(
    "Check the payment in your bank account",
    async () => {
      const token = localStorage.getItem("access_token");
      try {
        const response = await fetch(`${window.CONFIG.API_BASE_URL}/api/orders/${orderId}/confirm_payment/`, {
          method: "PATCH",
          headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
        });
        if (response.ok) {
          showToast("Payment confirmed! Order is now Active.", "success");
          setTimeout(() => fetchOrders(1), 2000);
        } else {
          showToast("Failed to confirm payment.", "error");
        }
      } catch (err) {
        console.error(err);
        showToast("Error connecting to server.", "error");
      }
    }
  );
}

/* ---- REQUEST REVISION ---- 
async function requestRevision(orderId) {
  showConfirmToast(
    "Request a revision? The freelancer will need to re-submit their work.",
    async () => {
      const token = localStorage.getItem("access_token");
      try {
        const response = await fetch(`${window.CONFIG.API_BASE_URL}/api/orders/${orderId}/request_revision/`, {
          method: "PATCH",
          headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
        });
        if (response.ok) {
          showToast("Revision requested.", "success");
          setTimeout(() => renderOrders(), 2000);
        } else {
          const err = await response.json();
          showToast("Error: " + (err.error || JSON.stringify(err)), "error");
        }
      } catch (err) {
        console.error(err);
        showToast("Error connecting to server.", "error");
      }
    }
  );
}*/
/* ---- APPROVE WORK ---- */
async function approveWork(orderId) {
  showConfirmToast(
    "Approve this work?",
    async () => {
      const token = localStorage.getItem("access_token");
      try {
        const response = await fetch(`${window.CONFIG.API_BASE_URL}/api/orders/${orderId}/approve_work/`, {
          method: "PATCH",
          headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
        });
        if (response.ok) {
          showToast("Work approved successfully!", "success");
          setTimeout(() => fetchOrders(1), 2000);
        } else {
          showToast("Failed to approve work.", "error");
        }
      } catch (err) {
        console.error(err);
        showToast("Error connecting to server.", "error");
      }
    }
  );
}

/* ---- FREELANCER REQUEST PAYOUT ---- */
function releasePaymentRequest(orderId) {
  showToast("Payout request acknowledged.  Admin will release the funds to your account after final review.", "info");
}

/* ---- SUBMIT WORK MODAL ---- */
function openSubmitWorkModal(orderId) {
  currentSubmitOrderId = orderId;
  document.getElementById("submitText").value = "";
  document.getElementById("submitLink").value = "";
  document.getElementById("submitWorkModal").style.display = "flex";
}

function closeSubmitModal() {
  currentSubmitOrderId = null;
  document.getElementById("submitWorkModal").style.display = "none";
}

async function submitWork() {
  const token = localStorage.getItem("access_token");
  const text = document.getElementById("submitText").value.trim();
  const link = document.getElementById("submitLink").value.trim();

  if (!text && !link) {
    showToast("Please provide a description or a link.", "warning");
    return;
  }

  const btn = document.getElementById("submitWorkBtn");
  const originalBtnText = btn.innerText;
  btn.disabled = true;
  btn.innerText = "Submitting...";

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
      
      // Instant local tweak
      const order = allOrders.find(o => o.order_id === currentSubmitOrderId);
      if (order) {
          order.status = "Work Submitted";
          order.work_submission_text = text;
          order.work_submission_link = link;
      }
      renderOrdersList();
    } else {
      const err = await response.json();
      showToast("Error: " + JSON.stringify(err), "error");
    }
  } catch (err) {
    console.error(err);
    showToast("Failed to submit work.", "error");
  } finally {
    btn.disabled = false;
    btn.innerText = originalBtnText;
  }
}

/* ---- DISPUTE ---- */
async function disputeOrder(orderId) {
  // Use a custom inline modal approach via a toast + prompt replacement
  const reason = prompt("Please briefly describe the issue (this will be reviewed by admin):");
  if (!reason || !reason.trim()) return;

  const token = localStorage.getItem("access_token");
  try {
    const response = await fetch(`${window.CONFIG.API_BASE_URL}/api/orders/${orderId}/dispute/`, {
      method: "PATCH",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ dispute_reason: reason.trim() })
    });
    if (response.ok) {
      showToast("Dispute raised.", "success");
      setTimeout(() => fetchOrders(1), 2000);
    } else {
      showToast("Failed to raise dispute.", "error");
    }
  } catch (err) {
    console.error(err);
    showToast("Error connecting to server.", "error");
  }
}

/* ---- REVIEW MODAL ---- */
function openReviewModal(dbId) {
  selectedOrderId = dbId;
  document.getElementById("reviewModal").style.display = "flex";
}

function closeReviewModal() {
  document.getElementById("reviewModal").style.display = "none";
  selectedOrderId = null;
  resetStars();
}

const stars = document.querySelectorAll(".star");
const ratingInput = document.getElementById("ratingInput");

stars.forEach((star, index) => {
  star.onclick = () => {
    ratingInput.value = index + 1;
    highlightStars(index);
  };
  star.onmouseover = () => highlightStars(index);
  star.onmouseout = () => highlightStars(ratingInput.value - 1);
});

function highlightStars(index) {
  stars.forEach((s, i) => {
    if (i <= index) s.classList.add("active");
    else s.classList.remove("active");
  });
}

function resetStars() {
  ratingInput.value = 0;
  highlightStars(-1);
  document.getElementById("reviewText").value = "";
}

async function submitReview() {
  const rating = ratingInput.value;
  const reviewText = document.getElementById("reviewText").value.trim();
  const token = localStorage.getItem("access_token");

  if (rating == 0 || !reviewText || !selectedOrderId) {
    showToast("Please provide a rating and review.", "warning");
    return;
  }

  const btn = document.getElementById("submitReviewBtn");
  const originalBtnText = btn.innerText;
  btn.disabled = true;
  btn.innerText = "Submitting...";

  try {
    const response = await fetch(`${window.CONFIG.API_BASE_URL}/api/reviews/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        order: selectedOrderId,
        rating: rating,
        review_text: reviewText
      })
    });

    if (response.ok) {
      closeReviewModal();
      showToast("Review submitted successfully!", "success");
      
      // Update local state instead of 2sec wait
      const orderIdNum = Number(selectedOrderId);
      const order = allOrders.find(o => o.id === orderIdNum || o.order_id === selectedOrderId);
      if (order) order.has_review = true;
      renderOrdersList();
      
    } else {
      const err = await response.json();
      showToast("Error: " + JSON.stringify(err), "error");
    }
  } catch (err) {
    console.error(err);
    showToast("Failed to submit review.", "error");
  } finally {
    btn.disabled = false;
    btn.innerText = originalBtnText;
  }
}

/* ---- NAV ---- */
function goDashboard() { window.location.href = "clientDashboard.html"; }
function goBrowse() { window.location.href = "browseTalent.html"; }
function goMessages() { window.location.href = "chat.html"; }
function goProfile() { window.location.href = "clientProfileView.html"; }

fetchOrders(1);