// successIsland.js

function showSuccessIsland(message = "Profile Updated Successfully!") {
    // Create the element if it doesn't exist
    let island = document.getElementById('successIsland');
    if (!island) {
        island = document.createElement('div');
        island.id = 'successIsland';
        island.className = 'success-island';
        island.innerHTML = `
            <div class="icon-circle">
                <i class="fa-solid fa-check"></i>
            </div>
            <div class="message">${message}</div>
        `;
        document.body.appendChild(island);
    }

    // Trigger animation
    setTimeout(() => {
        island.classList.add('show');
    }, 100);

    // Auto hide after 4 seconds
    setTimeout(() => {
        island.classList.remove('show');
    }, 4000);
}

// The "Trick": Check sessionStorage on load
document.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem('profileSuccess') === 'true') {
        showSuccessIsland();
        sessionStorage.removeItem('profileSuccess');
    }
});
