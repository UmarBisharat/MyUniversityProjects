document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("access_token");
    if (token) {
        const role = localStorage.getItem("userRole");
        const isStaff = localStorage.getItem("isStaff") === "true";
        if (isStaff) window.location.href = "adminDashboard.html";
        else if (role === "freelancer") window.location.href = "freelancerDashboard.html";
        else window.location.href = "clientDashboard.html";
    }
});

function clearError() {
  document.getElementById("loginEmail").classList.remove("input-error");
  document.getElementById("loginPassword").classList.remove("input-error");
  const err = document.getElementById("loginError");
  err.innerText = "";
  err.className = "error-msg";
}

async function login() {
  const btn = document.getElementById("loginBtn");
  const email = document.getElementById("loginEmail");
  const password = document.getElementById("loginPassword");
  const error = document.getElementById("loginError");

  clearError();

  if (!email.value) {
    error.innerText = "Please enter your email.";
    email.classList.add("input-error");
    return;
  }

  btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Signing in…';
  btn.disabled = true;

  try {
    const response = await fetch(`${window.CONFIG.API_BASE_URL}/api/token/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.value, password: password.value })
    });

    if (response.ok) {
      const data = await response.json();
      localStorage.setItem("access_token", data.access);
      localStorage.setItem("refresh_token", data.refresh);
      localStorage.setItem("userRole", data.role);
      localStorage.setItem("userName", data.name);
      localStorage.setItem("loggedInUser", data.email);
      localStorage.setItem("isStaff", data.is_staff);
      localStorage.removeItem("activeChatUser");

      error.className = "error-msg success";
      error.innerText = "Login successful! Redirecting…";

      setTimeout(() => {
        if (data.is_staff) window.location.href = "adminDashboard.html";
        else if (data.role === "freelancer") window.location.href = "freelancerDashboard.html";
        else window.location.href = "clientDashboard.html";
      }, 900);
    } else {
      error.innerText = "Invalid email or password.";
      email.classList.add("input-error");
      password.classList.add("input-error");
      btn.innerHTML = '<i class="fa fa-arrow-right-to-bracket"></i> Sign In';
      btn.disabled = false;
    }
  } catch (err) {
    error.innerText = "Cannot connect to server. Is the backend running?";
    btn.innerHTML = '<i class="fa fa-arrow-right-to-bracket"></i> Sign In';
    btn.disabled = false;
  }
}