let activeConversationId = null;
let activeChatUser = JSON.parse(localStorage.getItem("activeChatUser")) || null;
let lastMessageCount = 0;
let lastConversationCount = 0;

const loggedInUserEmail = localStorage.getItem("loggedInUser");
const token = localStorage.getItem("access_token");

/* -------- FETCH CONVERSATIONS -------- */
async function loadConversations() {
  if (!token) return;
  // Initial render for empty/placeholder state if nothing selected
  if (!activeChatUser && !activeConversationId) {
    renderChat([]);
  } else {
    const list = document.getElementById("conversationList");
    if (list && list.children.length === 0) {
      list.innerHTML = `
            <div class="loading-container" style="padding:20px;">
              <div class="loader"></div>
              <p style="font-size:0.8rem;">Loading chats...</p>
            </div>
          `;
    }
  }
  try {
    const response = await fetch(`${window.CONFIG.API_BASE_URL}/api/conversations/`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const convos = await response.json();

    // Auto-select conversation if we came from Browse Talent
    let found = false;
    if (activeChatUser) {
      const existing = convos.find(c => {
        if (activeChatUser.email) {
          const targetEmail = activeChatUser.email.toLowerCase();
          return c.participants.some(p => (p.user_email || "").toLowerCase() === targetEmail);
        } else if (activeChatUser.name) {
          return c.name === activeChatUser.name;
        }
        return false;
      });
      if (existing) {
        activeConversationId = existing.id;
        found = true;
        // Refresh details if it's a group chat
        if (existing.name && !activeChatUser.email) {
          activeChatUser.name = existing.name;
          activeChatUser.avatar = "https://res.cloudinary.com/dwhdzsexh/image/upload/v1/media/profiles/group-chat-icon.png";
        }
      } else if (activeChatUser.email) {
        // Virtual conversation for new recipient
        convos.unshift({
          id: null, // Indicates virtual
          participants: [
            { user_email: loggedInUserEmail, name: "Me", is_me: true },
            { user_email: activeChatUser.email, name: activeChatUser.name, profile_pic: activeChatUser.avatar, is_me: false }
          ],
          messages: []
        });
        activeConversationId = null;
      }
    }

    // SMART UPDATE: Only render if count changed
    if (convos.length !== lastConversationCount) {
      lastConversationCount = convos.length;
      renderConversations(convos);
    }

    if (found || (activeChatUser && activeConversationId === null)) {
      const currentConvo = convos.find(c => (c.id === activeConversationId) || (c.id === null && activeChatUser));
      if (currentConvo && currentConvo.messages.length !== lastMessageCount) {
        lastMessageCount = currentConvo.messages.length;
        renderChat(currentConvo.messages);
      }
    }

  } catch (err) {
    console.error("Error fetching conversations:", err);
  }
}

function renderConversations(convos) {
  const list = document.getElementById("conversationList");
  list.innerHTML = "";

  if (convos.length === 0) {
    list.innerHTML = `
      <div style="text-align:center; padding:20px; color:#94a3b8; font-size:0.9rem;">
        No messages yet.<br>Start a chat from Browse Talent!
      </div>
    `;
    return;
  }

  convos.forEach(convo => {
    // Identify the other participant using the is_me flag from the API
    const other = convo.participants.find(p => !p.is_me);
    const displayUser = other || convo.participants[0];
    if (!displayUser) return;

    const div = document.createElement("div");
    div.className = "conversation";
    if (activeConversationId === convo.id && (convo.id !== null || activeChatUser)) div.classList.add("active");

    const img = document.createElement("img");
    img.src = convo.name ? "https://res.cloudinary.com/dwhdzsexh/image/upload/v1/media/profiles/group-chat-icon.png" : (displayUser.profile_pic || "https://i.pravatar.cc/150");
    img.onerror = function() { this.src = 'https://i.pravatar.cc/150'; };

    const span = document.createElement("span");
    span.innerText = (convo.name && convo.name.trim()) ? convo.name : displayUser.name;
    if (convo.id === null) span.innerText += " (New)";

    div.appendChild(img);
    div.appendChild(span);

    div.onclick = () => {
      activeConversationId = convo.id;
      if (convo.name) {
        activeChatUser = {
          name: convo.name,
          avatar: "https://res.cloudinary.com/dwhdzsexh/image/upload/v1/media/profiles/group-chat-icon.png",
          email: null // Not a single user
        };
      } else {
        activeChatUser = {
          name: displayUser.name,
          avatar: displayUser.profile_pic || "https://i.pravatar.cc/150",
          email: displayUser.user_email
        };
      }
      localStorage.setItem("activeChatUser", JSON.stringify(activeChatUser));
      lastMessageCount = 0;
      renderedMessageIds.clear(); // Reset surgical tracker

      // Show loading spinner in chat box
      document.getElementById("chatBox").innerHTML = `
        <div class="loading-container">
          <div class="loader"></div>
          <p>Loading messages...</p>
        </div>
      `;

      renderChat(convo.messages || []);
      renderConversations(convos);
    };

    list.appendChild(div);
  });
}

let renderedMessageIds = new Set();

/* -------- RENDER CHAT -------- */
function renderChat(messages) {
  const chatBox = document.getElementById("chatBox");
  const nameEl = document.getElementById("chatName");
  const avatarEl = document.getElementById("chatAvatar");
  const header = document.querySelector(".chat-header");
  const inputArea = document.querySelector(".chat-input");

  // Case 1: No chat selected
  if (!activeChatUser && !activeConversationId) {
    if (header) header.style.display = "none";
    if (inputArea) inputArea.style.display = "none";
    chatBox.innerHTML = `
      <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#94a3b8;">
        <div style="font-size:3rem; margin-bottom:10px;">💬</div>
        <p>Select a conversation to start messaging</p>
      </div>
    `;
    return;
  }

  // Case 2: Chat selected, show UI
  if (header) header.style.display = "flex";
  if (inputArea) inputArea.style.display = "flex";

  const orderBtn = document.querySelector(".order-btn");
  const userRole = localStorage.getItem("userRole");

  if (activeChatUser) {
    if (nameEl.innerText !== activeChatUser.name) {
      nameEl.innerText = activeChatUser.name;
    }
    const newAvatar = activeChatUser.avatar || 'https://i.pravatar.cc/150';
    if (avatarEl.getAttribute('data-src') !== newAvatar) {
      avatarEl.src = newAvatar;
      avatarEl.setAttribute('data-src', newAvatar);
      avatarEl.onerror = function () { this.src = 'https://i.pravatar.cc/150'; };
    }

    // Hide Place Order button for mediation chats, admins, or freelancers
    if (orderBtn) {
      const isMediation = activeChatUser.name && activeChatUser.name.includes("Dispute Mediation");
      if (isMediation || userRole === "admin" || userRole === "freelancer") {
        orderBtn.style.display = "none";
      } else {
        orderBtn.style.display = "block";
      }
    }
  }

  // Case 3: Empty messages (New Chat)
  if (messages.length === 0) {
    chatBox.innerHTML = `
        <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#94a3b8; opacity:0.6;">
          <p>No messages yet. Say hello!</p>
        </div>
      `;
    renderedMessageIds.clear();
    return;
  }

  // Surgical append
  // IMPORTANT: Clear loader/placeholder if we have real messages to show
  if (messages.length > 0 && (chatBox.querySelector(".loading-container") || chatBox.querySelector("p"))) {
    chatBox.innerHTML = "";
  }

  let hasNew = false;
  messages.forEach(m => {
    if (renderedMessageIds.has(m.id)) return;
    renderedMessageIds.add(m.id);
    hasNew = true;

    const isMe = m.is_me;
    const senderClass = isMe ? 'me' : 'other';

    const div = document.createElement("div");
    div.className = `msg ${senderClass}`;
    div.innerHTML = `
      <div style="font-size: 0.7rem; color: #94a3b8; margin-bottom: 2px;">${isMe ? 'Me' : m.sender_name}</div>
      ${m.text}
      <div class="time">${new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
    `;
    chatBox.appendChild(div);
  });

  if (hasNew) {
    chatBox.scrollTop = chatBox.scrollHeight;
  }
}

/* -------- FETCH MESSAGES POLLING -------- */
async function pollMessages() {
  if (!activeConversationId || !token) return;
  try {
    const response = await fetch(`${window.CONFIG.API_BASE_URL}/api/messages/?conversation=${activeConversationId}`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const messages = await response.json();

    // We always pass to renderChat, which now handles diffing
    renderChat(messages);
  } catch (err) {
    console.error("Polling error:", err);
  }
}


/* -------- SEND MESSAGE -------- */
async function sendMessage() {
  const input = document.getElementById("msgInput");
  const text = input.value.trim();
  if (!text || !token) return;

  // 1. If no active conversation, create it first
  if (!activeConversationId && activeChatUser) {
    try {
      const convoRes = await fetch(`${window.CONFIG.API_BASE_URL}/api/conversations/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          participant_emails: [loggedInUserEmail, activeChatUser.email]
        })
      });
      const newConvo = await convoRes.json();
      activeConversationId = newConvo.id;
      loadConversations();
    } catch (err) {
      console.error("Failed to create conversation:", err);
      return;
    }
  }

  if (!activeConversationId) return;

  const payload = {
    conversation: activeConversationId,
    text: text
  };

  // Optimistic clearing of input and scrolling
  input.value = "";

  try {
    const response = await fetch(`${window.CONFIG.API_BASE_URL}/api/messages/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      // Immediately poll to show sent message
      pollMessages();
    } else {
      showToast("Failed to send message.", "error");
      input.value = text;
    }
  } catch (err) {
    console.error("Send error:", err);
    showToast("Network error. Try again.", "error");
    input.value = text;
  }
}

document.addEventListener("DOMContentLoaded", function () {
  const userRole = localStorage.getItem("userRole");
  const navLinks = document.getElementById("navLinks");
  if (navLinks) {
    if (userRole === "freelancer") {
      navLinks.innerHTML = `
        <a href="freelancerDashboard.html">Dashboard</a>
        <a href="browseJob.html">Browse Jobs</a>
        <a href="profile-view.html">Profile</a>
      `;
    } else {
      navLinks.innerHTML = `
        <a href="clientDashboard.html">Dashboard</a>
        <a href="browseTalent.html">Browse Talent</a>
        <a href="clientProfileView.html">Profile</a>
      `;
    }
  }

  const input = document.getElementById("msgInput");
  if (input) {
    input.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        sendMessage();
      }
    });
  }

  // Immediately show header if we have an active chat from session
  if (activeChatUser || activeConversationId) {
    document.getElementById("chatBox").innerHTML = `
        <div class="loading-container">
          <div class="loader"></div>
          <p>Loading messages...</p>
        </div>
      `;
    renderChat([]); // Loads header
  }

  loadConversations();
  setInterval(loadConversations, 15000);
  setInterval(pollMessages, 5000);
});

function placeOrder() {
  window.location.href = "placeOrder.html";
}
