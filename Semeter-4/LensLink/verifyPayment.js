// verifyPayment.js — standalone payment verification flow.
const params = new URLSearchParams(window.location.search);
const ORDER_ID = params.get("orderId");
let orderAmount = params.get("amount") || null;

function getToken() {
    return localStorage.getItem("access_token");
}

// ── BOOT ──────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
    if (!ORDER_ID) {
        showToast("No order ID found. Redirecting...", "error");
        setTimeout(() => window.location.replace("order.html"), 2000);
        return;
    }

    // Populate order ID in both steps
    document.getElementById("orderIdDisplay").innerText = ORDER_ID;
    document.getElementById("orderIdDisplay2").innerText = ORDER_ID;

    // Check if we just submitted this order (to persist success message across reloads)
    if (sessionStorage.getItem("submitted_" + ORDER_ID) === "true") {
        document.getElementById("successIsland").classList.add("visible");
    }

    // If amount wasn't in URL (coming from order.html), fetch it from API
    if (!orderAmount) {
        await fetchOrderDetails();
    } else {
        document.getElementById("amountDisplay").innerText = Number(orderAmount).toLocaleString();
    }

    await fetchBankDetails();
});

async function fetchOrderDetails() {
    const token = getToken();
    if (!token) return;

    try {
        const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/orders/${ORDER_ID}/`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!res.ok) throw new Error();
        const data = await res.json();

        orderAmount = data.amount;
        document.getElementById("amountDisplay").innerText = Number(data.amount).toLocaleString();
    } catch {
        document.getElementById("amountDisplay").innerText = "—";
        showToast("Could not fetch order amount.", "warning");
    }
}

async function fetchBankDetails() {
    try {
        const token = getToken();
        if (!token) return;

        const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/orders/${ORDER_ID}/bank_details/`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!res.ok) throw new Error();
        const data = await res.json();

        // Populate bank information
        const bankNum = data.bank_account || "Contact admin for bank details";
        const accName = data.account_name || "Contact admin for account name";

        document.getElementById("bankNumberDisplay").innerHTML = `<strong>${bankNum}</strong>`;
        document.getElementById("accountNameDisplay").innerHTML = `<strong>${accName}</strong>`;
    } catch (err) {
        console.error("Fetch bank details error:", err);
        document.getElementById("bankNumberDisplay").innerText = "Contact admin for bank details";
        document.getElementById("accountNameDisplay").innerText = "Contact admin for account name";
    }
}

// ── STEP NAVIGATION ───────────────────────────────────────────────────────────

function goToVerify() {
    document.getElementById("step1").classList.remove("active");
    document.getElementById("step2").classList.add("active");
}

function goBackToDetails() {
    document.getElementById("step2").classList.remove("active");
    document.getElementById("step1").classList.add("active");
}

// ── SCREENSHOT PREVIEW ────────────────────────────────────────────────────────

// Removed previewScreenshot

// ── SUBMIT PAYMENT PROOF ─────────────────────────────────────────────────────

async function submitPayment() {
    const txn = document.getElementById("transactionId").value.trim();

    if (!txn) return showToast("Please enter a transaction ID.", "warning");

    const token = getToken();
    if (!token) return showToast("Please login first.", "error");

    const btn = document.getElementById("submitBtn");
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right:8px;"></i>Submitting...';

    const formData = new FormData();
    formData.append("transaction_id", txn);

    try {
        const res = await fetch(
            `${window.CONFIG.API_BASE_URL}/api/orders/${ORDER_ID}/submit_payment/`,
            {
                method: "PATCH",
                headers: { "Authorization": `Bearer ${token}` },
                body: formData
            }
        );

        if (!res.ok) throw await res.json();

        // Save success state before showing island (in case of immediate reload)
        sessionStorage.setItem("submitted_" + ORDER_ID, "true");
        document.getElementById("successIsland").classList.add("visible");

    } catch (err) {
        console.error(err);
        showToast(err.detail || "Failed to submit payment proof.", "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane" style="margin-right:8px;"></i>Submit Verification';
    }
}

// ── NAVIGATION ────────────────────────────────────────────────────────────────

function goOrders() {
    sessionStorage.removeItem("submitted_" + ORDER_ID);
    window.location.href = "order.html";
}

function goDashboard() {
    sessionStorage.removeItem("submitted_" + ORDER_ID);
    window.location.replace("clientDashboard.html");
}