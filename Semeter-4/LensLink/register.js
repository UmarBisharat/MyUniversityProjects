let cooldownInterval = null;

// ── SESSION PERSISTENCE ───────────────────────────────────────────────────
// function saveState() {
//     sessionStorage.setItem("reg", JSON.stringify({
//         role: document.getElementById("role")?.value || "",
//         email: document.getElementById("email")?.value || "",
//         otp: document.getElementById("otp")?.value || "",
//         step: currentStep()
//     }));
// }

// function restoreState() {
//     const raw = sessionStorage.getItem("reg");
//     if (!raw) return;
//     const s = JSON.parse(raw);

//     if (s.role) { const el = document.getElementById("role"); if (el) el.value = s.role; }
//     if (s.email) { const el = document.getElementById("email"); if (el) el.value = s.email; }
//     if (s.otp) { const el = document.getElementById("otp"); if (el) el.value = s.otp; }

//     if (s.step && s.step !== 1) goToStep(s.step, false);

//     // Restore cooldown if still running
//     const end = parseInt(sessionStorage.getItem("reg_cd"));
//     if (end) {
//         const left = Math.ceil((end - Date.now()) / 1000);
//         if (left > 0) startCooldown(left);
//         else sessionStorage.removeItem("reg_cd");
//     }

//     // Update OTP subtext
//     if (s.email) {
//         const sub = document.getElementById("otpSubtext");
//         if (sub) sub.textContent = `We sent a code to ${s.email}`;
//     }
// }

function currentStep() {
    for (let i = 1; i <= 3; i++) {
        if (document.getElementById(`step${i}`)?.classList.contains("active")) return i;
    }
    return 1;
}

// ── STEP NAVIGATION ───────────────────────────────────────────────────────
function goToStep(n, save = true) {
    for (let i = 1; i <= 3; i++) {
        const step = document.getElementById(`step${i}`);
        const node = document.getElementById(`node${i}`);
        step.classList.remove("active");
        node.classList.remove("active", "done");
        if (i < n) {
            node.classList.add("done");
            document.getElementById(`circle${i}`).innerHTML = "✓";
            if (i <= 2) document.getElementById(`line${i}`).classList.add("done");
        } else if (i === n) {
            node.classList.add("active");
        }
    }
    document.getElementById(`step${n}`).classList.add("active");
    if (save) saveState();
}

function goBack(n) { goToStep(n); }

// ── STEP 1 → 2 ───────────────────────────────────────────────────────────
async function goToVerify() {
    const role = document.getElementById("role").value;
    const email = document.getElementById("email").value.trim();
    const msg = document.getElementById("msg1");
    const btn = document.getElementById("btn1");

    if (!role) { showMsg(msg, "Please select a role.", "error"); return; }
    if (!email) { showMsg(msg, "Please enter your email.", "error"); return; }
    if (!email.includes("@")) { showMsg(msg, "Enter a valid email address.", "error"); return; }
    if (!(email.endsWith("@students.muet.edu.pk") || email.endsWith("@faculty.muet.edu.pk"))) { showMsg(msg, "Enter a valid MUET email address.", "error"); return; }
    setLoading(btn, true, "Checking...");

    try {
        const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/check-email/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email })
        });

        if (res.ok) {
            hideMsg(msg);
            document.getElementById("otpSubtext").textContent = `Enter the code we send to ${email}`;
            goToStep(2);
        } else {
            const data = await res.json();
            showMsg(msg, data.error || "Email already exists.", "error");
        }
    } catch {
        showMsg(msg, "Cannot reach server.", "error");
    } finally {
        setLoading(btn, false, "Continue");
    }
}

// ── OTP SEND ──────────────────────────────────────────────────────────────
async function sendOTP() {
    const email = document.getElementById("email").value.trim();
    const msg = document.getElementById("msg2");

    showMsg(msg, "Sending code…", "info");

    try {
        const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/send-otp/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email })
        });

        if (res.ok) {
            showMsg(msg, "Code sent! Check your inbox.", "success");
            startCooldown(30);
        } else {
            const data = await res.json();
            showMsg(msg, data.error || "Failed to send code.", "error");
        }
    } catch {
        showMsg(msg, "Cannot reach server.", "error");
    }
}

function startCooldown(seconds) {
    const btn = document.getElementById("sendOtpBtn");
    const label = document.getElementById("sendOtpLabel");
    const timer = document.getElementById("otpTimer");
    let left = seconds;

    sessionStorage.setItem("reg_cd", Date.now() + left * 1000);

    btn.disabled = true;
    label.style.display = "none";
    timer.style.display = "inline";
    timer.textContent = `${left}s`;

    if (cooldownInterval) clearInterval(cooldownInterval);

    cooldownInterval = setInterval(() => {
        left--;
        timer.textContent = `${left}s`;
        if (left <= 0) {
            clearInterval(cooldownInterval);
            sessionStorage.removeItem("reg_cd");
            btn.disabled = false;
            label.style.display = "inline";
            timer.style.display = "none";
        }
    }, 1000);
}

// ── OTP VERIFY ────────────────────────────────────────────────────────────
async function verifyOTP() {
    const email = document.getElementById("email").value.trim();
    const code = document.getElementById("otp").value.trim();
    const btn = document.getElementById("btn2");
    const msg = document.getElementById("msg2");

    if (!code) { showMsg(msg, "Enter the code first.", "error"); return; }

    setLoading(btn, true, "Verifying…");

    try {
        const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/verify-otp/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, code })
        });

        if (res.ok) {
            goToStep(3);
        } else {
            const data = await res.json();
            showMsg(msg, data.error || "Incorrect code. Try again.", "error");
            setLoading(btn, false, "Verify code");
        }
    } catch {
        showMsg(msg, "Cannot reach server.", "error");
        setLoading(btn, false, "Verify code");
    }
}

// ── CREATE ACCOUNT ────────────────────────────────────────────────────────
async function createAccount() {
    const email = document.getElementById("email").value.trim();
    const role = document.getElementById("role").value;
    const pass = document.getElementById("password").value;
    const confirm = document.getElementById("confirm").value;
    const btn = document.getElementById("btn3");
    const msg = document.getElementById("msg3");

    if (pass.length < 8) { showMsg(msg, "Password must be at least 8 characters.", "error"); return; }
    if (pass !== confirm) { showMsg(msg, "Passwords don't match.", "error"); return; }

    setLoading(btn, true, "Creating account…");

    try {
        const res = await fetch(`${window.CONFIG.API_BASE_URL}/api/register/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password: pass, role, name: email.split("@")[0] })
        });

        if (res.ok) {
            const data = await res.json();
            // Clear session
            sessionStorage.removeItem("reg");
            sessionStorage.removeItem("reg_cd");
            // Store auth
            localStorage.setItem("access_token", data.access);
            localStorage.setItem("refresh_token", data.refresh);
            localStorage.setItem("userRole", data.role);
            localStorage.setItem("userName", data.name);
            localStorage.setItem("loggedInUser", data.email);

            showMsg(msg, "Account created! Redirecting…", "success");
            // 
            if (role == "freelancer") {
                windows.location.assign("freelancerDashboard.html");
            } else {
                windows.location.assign("clientDashboard.html");
            }
        } else {
            const err = await res.json();
            showMsg(msg, Object.values(err).flat().join(" ") || "Registration failed.", "error");
            setLoading(btn, false, "Create account");
        }
    } catch {
        showMsg(msg, "Cannot reach server.", "error");
        setLoading(btn, false, "Create account");
    }

    if (role == "freelancer") {
        window.location.href = "createProfile.html";
    } else {
        window.location.href = "createClientProfile.html";
    }
}

// ── PASSWORD STRENGTH ─────────────────────────────────────────────────────
function checkStrength() {
    const v = document.getElementById("password").value;
    let score = 0;
    if (v.length >= 8) score++;
    if (/[A-Z]/.test(v)) score++;
    if (/[0-9]/.test(v)) score++;
    if (/[^A-Za-z0-9]/.test(v)) score++;
    const colors = ["#ff6b6b", "#fbbf24", "#4ade80", "#c8f135"];
    ["s1", "s2", "s3", "s4"].forEach((id, i) => {
        document.getElementById(id).style.background =
            i < score ? colors[score - 1] : "rgba(255,255,255,0.06)";
    });
}

// ── HELPERS ───────────────────────────────────────────────────────────────
function showMsg(el, text, type) {
    el.textContent = text;
    el.className = `form-msg show ${type}`;
}

function hideMsg(el) {
    el.className = "form-msg";
}

function setLoading(btn, loading, label) {
    btn.disabled = loading;
    btn.innerHTML = loading
        ? `<div class="spinner"></div> ${label}`
        : label;
}

// ── BOOT ──────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
    restoreState();
    // Autosave on any input change
    document.querySelectorAll("input, select").forEach(el => {
        el.addEventListener("input", saveState);
        el.addEventListener("change", saveState);
    });
});