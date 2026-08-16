const STORAGE_KEY = "gemini_ai_chat_conversations_v1";
const THEME_KEY = "gemini_ai_chat_theme_v1";

const messagesEl = document.getElementById("messages");
const welcomeEl = document.getElementById("welcome");
const conversationListEl = document.getElementById("conversationList");
const inputEl = document.getElementById("messageInput");
const formEl = document.getElementById("chatForm");
const sendBtn = document.getElementById("sendBtn");
const themeBtn = document.getElementById("themeBtn");
const clearChatBtn = document.getElementById("clearChatBtn");
const clearAllBtn = document.getElementById("clearAllBtn");
const newChatBtn = document.getElementById("newChatBtn");
const menuBtn = document.getElementById("menuBtn");
const closeSidebarBtn = document.getElementById("closeSidebarBtn");
const sidebar = document.getElementById("sidebar");
const toastEl = document.getElementById("toast");

let conversations = loadConversations();
let activeId = conversations[0]?.id || null;
let isSending = false;

if (!activeId) {
    createConversation();
}

applySavedTheme();
renderConversationList();
renderActiveConversation();
autoResize();

function loadConversations() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveConversations() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
}

function createConversation() {
    const conversation = {
        id: crypto.randomUUID(),
        title: "New conversation",
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
    };

    conversations.unshift(conversation);
    activeId = conversation.id;
    saveConversations();
    renderConversationList();
    renderActiveConversation();
}

function getActiveConversation() {
    return conversations.find(c => c.id === activeId);
}

function renderConversationList() {
    conversationListEl.innerHTML = "";

    conversations
        .slice()
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .forEach(conversation => {
            const row = document.createElement("div");
            row.className = "conversation-item" + (conversation.id === activeId ? " active" : "");

            const selectBtn = document.createElement("button");
            selectBtn.className = "conversation-select";
            selectBtn.textContent = conversation.title || "New conversation";
            selectBtn.title = conversation.title || "New conversation";
            selectBtn.addEventListener("click", () => {
                activeId = conversation.id;
                renderConversationList();
                renderActiveConversation();
                closeSidebar();
            });

            const deleteBtn = document.createElement("button");
            deleteBtn.className = "conversation-delete";
            deleteBtn.textContent = "×";
            deleteBtn.title = "Delete conversation";
            deleteBtn.addEventListener("click", (event) => {
                event.stopPropagation();
                deleteConversation(conversation.id);
            });

            row.append(selectBtn, deleteBtn);
            conversationListEl.appendChild(row);
        });
}

function renderActiveConversation() {
    const conversation = getActiveConversation();
    messagesEl.innerHTML = "";

    if (!conversation || conversation.messages.length === 0) {
        welcomeEl.style.display = "block";
        return;
    }

    welcomeEl.style.display = "none";

    conversation.messages.forEach(message => {
        addMessageToDOM(message.role, message.content, false);
    });

    scrollToBottom();
}

function addMessageToDOM(role, content, scroll = true) {
    const wrapper = document.createElement("div");
    wrapper.className = `message ${role}`;

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.textContent = role === "user" ? "You" : "✦";

    const contentWrap = document.createElement("div");
    contentWrap.className = "message-content";

    const roleLabel = document.createElement("div");
    roleLabel.className = "message-role";
    roleLabel.textContent = role === "user" ? "You" : "AI";

    const bubble = document.createElement("div");
    bubble.className = "bubble";

    if (role === "assistant") {
        bubble.innerHTML = renderMarkdown(content);
        enhanceCodeBlocks(bubble);
    } else {
        bubble.textContent = content;
    }

    contentWrap.append(roleLabel, bubble);
    wrapper.append(avatar, contentWrap);
    messagesEl.appendChild(wrapper);

    if (scroll) {
        scrollToBottom();
    }
}

function renderMarkdown(text) {
    if (typeof marked === "undefined") {
        return escapeHtml(text).replace(/\n/g, "<br>");
    }

    marked.setOptions({
        breaks: true,
        gfm: true
    });

    return marked.parse(text);
}

function enhanceCodeBlocks(container) {
    container.querySelectorAll("pre code").forEach(code => {
        if (window.hljs) {
            hljs.highlightElement(code);
        }

        const pre = code.parentElement;
        const wrapper = document.createElement("div");
        wrapper.className = "code-wrapper";

        const copyBtn = document.createElement("button");
        copyBtn.className = "copy-code";
        copyBtn.textContent = "Copy";

        copyBtn.addEventListener("click", async () => {
            try {
                await navigator.clipboard.writeText(code.innerText);
                copyBtn.textContent = "Copied!";
                setTimeout(() => copyBtn.textContent = "Copy", 1200);
            } catch {
                showToast("Could not copy code.");
            }
        });

        pre.parentNode.insertBefore(wrapper, pre);
        wrapper.append(pre, copyBtn);
    });
}

function escapeHtml(value) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

async function sendMessage() {
    const message = inputEl.value.trim();

    if (!message || isSending) {
        return;
    }

    const conversation = getActiveConversation();
    if (!conversation) {
        createConversation();
    }

    const active = getActiveConversation();

    if (active.messages.length === 0) {
        active.title = message.length > 35 ? message.slice(0, 35) + "…" : message;
    }

    active.messages.push({
        role: "user",
        content: message
    });
    active.updatedAt = Date.now();

    inputEl.value = "";
    autoResize();
    welcomeEl.style.display = "none";

    addMessageToDOM("user", message);
    saveConversations();
    renderConversationList();

    showTyping();
    setSendingState(true);

    try {
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message,
                history: active.messages.slice(0, -1)
            })
        });

        const data = await response.json();

        removeTyping();

        if (!response.ok) {
            throw new Error(data.error || "Something went wrong.");
        }

        active.messages.push({
            role: "assistant",
            content: data.reply
        });
        active.updatedAt = Date.now();

        saveConversations();
        addMessageToDOM("assistant", data.reply);
        renderConversationList();

    } catch (error) {
        removeTyping();

        const errorText = `Sorry, I couldn't get a response right now.\n\n**Error:** ${error.message}`;
        addMessageToDOM("assistant", errorText);
        showToast("Request failed. Please try again.");
    } finally {
        setSendingState(false);
        inputEl.focus();
    }
}

function showTyping() {
    removeTyping();

    const wrapper = document.createElement("div");
    wrapper.className = "message assistant";
    wrapper.id = "typingMessage";

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.textContent = "✦";

    const contentWrap = document.createElement("div");
    contentWrap.className = "message-content";

    const roleLabel = document.createElement("div");
    roleLabel.className = "message-role";
    roleLabel.textContent = "AI";

    const bubble = document.createElement("div");
    bubble.className = "bubble";

    const typing = document.createElement("div");
    typing.className = "typing";
    typing.innerHTML = "<span></span><span></span><span></span>";

    bubble.appendChild(typing);
    contentWrap.append(roleLabel, bubble);
    wrapper.append(avatar, contentWrap);
    messagesEl.appendChild(wrapper);

    scrollToBottom();
}

function removeTyping() {
    document.getElementById("typingMessage")?.remove();
}

function setSendingState(sending) {
    isSending = sending;
    sendBtn.disabled = sending;
    inputEl.disabled = sending;
}

function deleteConversation(id) {
    conversations = conversations.filter(c => c.id !== id);

    if (conversations.length === 0) {
        createConversation();
        return;
    }

    if (activeId === id) {
        activeId = conversations[0].id;
    }

    saveConversations();
    renderConversationList();
    renderActiveConversation();
}

function clearCurrentChat() {
    const conversation = getActiveConversation();
    if (!conversation) return;

    if (conversation.messages.length === 0) {
        showToast("Current chat is already empty.");
        return;
    }

    if (!confirm("Clear messages from this conversation?")) {
        return;
    }

    conversation.messages = [];
    conversation.title = "New conversation";
    conversation.updatedAt = Date.now();

    saveConversations();
    renderConversationList();
    renderActiveConversation();
    showToast("Chat cleared.");
}

function clearAllConversations() {
    if (!conversations.length) return;

    if (!confirm("Delete all conversations? This cannot be undone.")) {
        return;
    }

    conversations = [];
    createConversation();
    showToast("All chats cleared.");
}

function applySavedTheme() {
    const theme = localStorage.getItem(THEME_KEY) || "light";
    document.body.classList.toggle("dark", theme === "dark");
    themeBtn.textContent = theme === "dark" ? "☀️" : "🌙";
}

function toggleTheme() {
    const dark = document.body.classList.toggle("dark");
    localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
    themeBtn.textContent = dark ? "☀️" : "🌙";
}

function scrollToBottom() {
    requestAnimationFrame(() => {
        const area = document.getElementById("chatArea");
        area.scrollTop = area.scrollHeight;
    });
}

function autoResize() {
    inputEl.style.height = "auto";
    inputEl.style.height = Math.min(inputEl.scrollHeight, 160) + "px";
}

function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.add("show");

    setTimeout(() => {
        toastEl.classList.remove("show");
    }, 2200);
}

function closeSidebar() {
    sidebar.classList.remove("open");
}

formEl.addEventListener("submit", event => {
    event.preventDefault();
    sendMessage();
});

inputEl.addEventListener("input", autoResize);

inputEl.addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
});

themeBtn.addEventListener("click", toggleTheme);
clearChatBtn.addEventListener("click", clearCurrentChat);
clearAllBtn.addEventListener("click", clearAllConversations);

newChatBtn.addEventListener("click", () => {
    createConversation();
    inputEl.focus();
    closeSidebar();
});

menuBtn.addEventListener("click", () => {
    sidebar.classList.add("open");
});

closeSidebarBtn.addEventListener("click", closeSidebar);

document.querySelectorAll(".suggestions button").forEach(button => {
    button.addEventListener("click", () => {
        inputEl.value = button.dataset.prompt;
        autoResize();
        inputEl.focus();
    });
});
