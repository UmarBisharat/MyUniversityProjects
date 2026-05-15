// placeOrder.js — handles order creation only.
// After success, redirects to verifyPayment.html?orderId=...

let createdOrderId = null;
let createdOrderAmount = null;

function getToken() {
  return localStorage.getItem("access_token");
}

async function confirmOrder() {
  const shootType = document.getElementById("shootType").value.trim();
  const location = document.getElementById("location").value.trim();
  const deadline = document.getElementById("deadline").value;
  const amount = document.getElementById("amount").value.trim();

  if (!shootType || !location || !deadline || !amount) {
    return showToast("Please fill all fields.", "warning");
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (new Date(deadline) < today) {
    return showToast("Deadline cannot be in the past.", "warning");
  }

  const token = getToken();
  if (!token) return showToast("Please login first.", "error");

  const freelancer = JSON.parse(localStorage.getItem("activeChatUser") || "{}");
  if (!freelancer.email) {
    return showToast("Start a chat with a photographer first.", "warning");
  }

  const btn = document.getElementById("confirmBtn");
  btn.disabled = true;
  btn.innerText = "Creating...";

  try {
    const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/orders/`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        shoot_type: shootType,
        location: location,
        deadline: deadline,
        amount: amount,
        freelancer_email_input: freelancer.email
      })
    });

    if (!res.ok) throw await res.json();

    const data = await res.json();
    createdOrderId = data.order_id;
    createdOrderAmount = data.amount;

    // Persistent success state across reloads
    sessionStorage.setItem("last_placed_id", createdOrderId);
    sessionStorage.setItem("last_placed_amount", createdOrderAmount);

    // Show success island with order ID
    document.getElementById("orderIdDisplay").innerText = createdOrderId;
    document.getElementById("successIsland").classList.add("visible");
  } catch (err) {
    console.error(err);
    showToast(err.detail || "Failed to place order.", "error");
  } finally {
    btn.disabled = false;
    btn.innerText = "Confirm Order";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const savedId = sessionStorage.getItem("last_placed_id");
  const savedAmount = sessionStorage.getItem("last_placed_amount");

  if (savedId && savedAmount) {
    createdOrderId = savedId;
    createdOrderAmount = savedAmount;
    document.getElementById("orderIdDisplay").innerText = createdOrderId;
    document.getElementById("successIsland").classList.add("visible");
  }
});

function goToPayment() {
  if (!createdOrderId) return showToast("Order ID missing.", "error");
  sessionStorage.removeItem("last_placed_id");
  sessionStorage.removeItem("last_placed_amount");
  window.location.href = `verifyPayment.html?orderId=${createdOrderId}&amount=${createdOrderAmount}`;
}

function goDashboard() {
  sessionStorage.removeItem("last_placed_id");
  sessionStorage.removeItem("last_placed_amount");
  window.location.replace("clientDashboard.html");
}