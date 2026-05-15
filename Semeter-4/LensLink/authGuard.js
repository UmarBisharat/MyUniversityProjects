// Auth Guard & Logout Logic

(function () {
    const token = localStorage.getItem("access_token");
    const currentPage = window.location.pathname.split("/").pop();

    // Pages that don't require authentication
    const publicPages = ["index.html", "login.html", "register.html", "", "index"];

    async function verifyToken() {
        if (!token) return false;
        try {
            const response = await fetch(`${window.CONFIG.API_BASE_URL}/api/token/verify/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token: token })
            });
            return response.ok;
        } catch (err) {
            console.error("Token verification failed", err);
            return false;
        }
    }

    async function checkAuth() {
        if (publicPages.includes(currentPage)) {
            // Optional: If logged in and on login page, redirect to dashboard
            if (token && (currentPage === "login.html" || currentPage === "signup.html")) {
                const isValid = await verifyToken();
                if (isValid) {
                    const role = localStorage.getItem("userRole");
                    window.location.href = role === "freelancer" ? "freelancerDashboard.html" : "clientDashboard.html";
                }
            }
            return;
        }

        if (!token) {
            window.location.href = "login.html";
            return;
        }

        const isValid = await verifyToken();
        if (!isValid) {
            showToast("Session expired. Please login again.", "error");
            logout();
        }
    }

    window.logout = function () {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("loggedInUser");
        localStorage.removeItem("userName");
        localStorage.removeItem("userRole");
        localStorage.removeItem("profileData");
        localStorage.removeItem("activeChatUser");
        localStorage.removeItem("isStaff"); // Also good to clear
        window.location.href = "index.html";
    };

    // Run check
    checkAuth();
})();
