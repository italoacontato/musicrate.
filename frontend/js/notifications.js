
// ========================================
// MUSICRATE — SISTEMA DE NOTIFICAÇÕES
// ========================================

import { supabase } from "./supabase.js";

console.log("Sistema de notificações iniciado!");

// ========================================
// ELEMENTOS DO HTML
// ========================================

const notificationMenu = document.getElementById("notification-menu");
const notificationToggle = document.getElementById("notification-toggle");
const notificationCount = document.getElementById("notification-count");
const notificationDropdown = document.getElementById("notification-dropdown");
const notificationList = document.getElementById("notification-list");

let currentUserId = null;

let notificationsChannel = null;
let realtimeUserId = null;



// ========================================
// MARCAR NOTIFICAÇÕES COMO LIDAS
// ========================================

async function markNotificationsAsRead() {
    if (!currentUserId) return;

    const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("recipient_id", currentUserId)
        .eq("is_read", false);

    if (error) {
        console.error(
            "Erro ao marcar notificações como lidas:",
            error.message
        );
        return;
    }

    // Remover destaque das notificações
    document.querySelectorAll(".notification-item.unread")
        .forEach(item => {
            item.classList.remove("unread");
        });

    // Atualizar contador
    if (notificationCount) {
        notificationCount.textContent = "0";
        notificationCount.hidden = true;
    }
}


// ========================================
// ABRIR E FECHAR PAINEL
// ========================================

function closeNotifications() {
    if (!notificationDropdown || !notificationToggle) return;

    notificationDropdown.hidden = true;
    notificationToggle.setAttribute("aria-expanded", "false");
}


if (notificationToggle && notificationDropdown) {
    notificationToggle.addEventListener("click", async () => {
        const isOpen = !notificationDropdown.hidden;

        notificationDropdown.hidden = isOpen;

        notificationToggle.setAttribute(
            "aria-expanded",
            String(!isOpen)
        );

        // Marcar notificações como lidas ao abrir o painel
        if (!isOpen) {
            await markNotificationsAsRead();
        }
    });
}


document.addEventListener("click", (event) => {
    if (
        notificationMenu &&
        !notificationMenu.contains(event.target)
    ) {
        closeNotifications();
    }
});

// ========================================
// FORMATAR DATA
// ========================================

function formatNotificationDate(date) {
    return new Date(date).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
    });
}

// ========================================
// ATUALIZAR CONTADOR
// ========================================

function updateNotificationCount(notifications) {
    if (!notificationCount) return;

    const unreadCount = notifications.filter(
        notification => !notification.is_read
    ).length;

    notificationCount.textContent =
        unreadCount > 99 ? "99+" : unreadCount;

    notificationCount.hidden = unreadCount === 0;
}



// ========================================
// ABRIR CONTEÚDO DA NOTIFICAÇÃO
// ========================================

async function openNotificationTarget(notification) {

    if (!notification.target_id || !notification.target_type) {
        console.error("Notificação sem conteúdo de destino:", notification);
        return;
    }

    let postId = notification.target_id;
    let commentId = null;

    // Publicações, comentários e respostas
    if (
        notification.target_type === "comment" ||
        notification.target_type === "reply"
    ) {

        commentId = notification.target_id;

        // Descobrir a publicação à qual o comentário pertence
        const { data: comment, error } = await supabase
            .from("post_comments")
            .select("post_id")
            .eq("id", commentId)
            .maybeSingle();

        if (error) {
            console.error("Erro ao localizar comentário:", error);
            alert("Não foi possível localizar o conteúdo desta notificação.");
            return;
        }

        if (!comment) {
            alert("Este comentário não está mais disponível.");
            return;
        }

        postId = comment.post_id;
    }

    // Montar endereço da página da comunidade
    const destination = new URL("../pages/comunidade.html", import.meta.url);

    destination.searchParams.set("post", postId);

    if (commentId) {
        destination.searchParams.set("comment", commentId);
    }

    window.location.href = destination.href;
}

// ========================================
// EXIBIR NOTIFICAÇÕES
// ========================================

function renderNotifications(notifications, profiles) {
    if (!notificationList) return;

    notificationList.replaceChildren();

    if (notifications.length === 0) {
        const emptyMessage = document.createElement("p");

        emptyMessage.className = "notification-empty";
        emptyMessage.textContent = "Você ainda não tem notificações.";

        notificationList.appendChild(emptyMessage);
        return;
    }

    notifications.forEach(notification => {
        const profile = profiles.find(
            item => item.id === notification.actor_id
        );

        const actorName =
            profile?.username ||
            profile?.full_name ||
            "Alguém";

        const activityText = {
            publication: "curtiu sua publicação.",
            comment: "curtiu seu comentário.",
            reply: "curtiu sua resposta."
        };

        const item = document.createElement("div");

        item.className = "notification-item";


        // Permitir interação com a notificação
        item.setAttribute("role", "button");
        item.setAttribute("tabindex", "0");
        item.style.cursor = "pointer";

        // Abrir conteúdo ao clicar
        item.addEventListener("click", () => {
            openNotificationTarget(notification);
        });

        // Permitir abrir usando Enter ou Espaço
        item.addEventListener("keydown", (event) => {

            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openNotificationTarget(notification);
            }

        });


        if (!notification.is_read) {
            item.classList.add("unread");
        }

        const icon = document.createElement("i");
        icon.className = "bi bi-heart-fill";
        icon.setAttribute("aria-hidden", "true");

        const content = document.createElement("div");

        content.className = "notification-content";

        const message = document.createElement("p");

        const actor = document.createElement("strong");
        actor.textContent = actorName;

        message.appendChild(actor);
        message.appendChild(
            document.createTextNode(
                " " + (
                    activityText[notification.target_type] ||
                    "interagiu com seu conteúdo."
                )
            )
        );

        const date = document.createElement("span");
        date.className = "notification-date";
        date.textContent = formatNotificationDate(
            notification.created_at
        );

        content.appendChild(message);
        content.appendChild(date);

        item.appendChild(icon);
        item.appendChild(content);

        notificationList.appendChild(item);
    });
}

// ========================================
// BUSCAR NOTIFICAÇÕES
// ========================================

async function loadNotifications() {
    if (!currentUserId) return;

    if (notificationList) {
        notificationList.textContent = "Carregando notificações...";
    }

    const { data: notifications, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("recipient_id", currentUserId)
        .order("created_at", { ascending: false })
        .limit(30);

    if (error) {
        console.error("Erro ao carregar notificações:", error.message);

        if (notificationList) {
            notificationList.textContent =
                "Não foi possível carregar as notificações.";
        }

        return;
    }

    const actorIds = [
        ...new Set(notifications.map(item => item.actor_id))
    ];

    let profiles = [];

    if (actorIds.length > 0) {
        const { data, error: profileError } = await supabase
            .from("profiles")
            .select("id, username, full_name")
            .in("id", actorIds);

        if (profileError) {
            console.error(
                "Erro ao carregar perfis:",
                profileError.message
            );
        } else {
            profiles = data || [];
        }
    }

    renderNotifications(notifications, profiles);
    updateNotificationCount(notifications);
}

// ========================================
// CONTROLE DE SESSÃO
// ========================================


async function updateNotificationSession(session) {
    if (!notificationMenu) return;

    const loggedIn = Boolean(session);

    notificationMenu.hidden = !loggedIn;

    if (!loggedIn) {
        currentUserId = null;
        realtimeUserId = null;

        closeNotifications();

        if (notificationsChannel) {
            await supabase.removeChannel(notificationsChannel);
            notificationsChannel = null;
        }

        if (notificationCount) {
            notificationCount.hidden = true;
            notificationCount.textContent = "0";
        }

        if (notificationList) {
            notificationList.textContent =
                "Entre na sua conta para ver as notificações.";
        }

        return;
    }

    currentUserId = session.user.id;

    await loadNotifications();

    await setupNotificationsRealtime(currentUserId);
}


// ========================================
// ATUALIZAÇÃO EM TEMPO REAL
// ========================================

async function setupNotificationsRealtime(userId) {

    // Evitar criar canais duplicados
    if (
        notificationsChannel &&
        realtimeUserId === userId
    ) {
        return;
    }

    // Remover canal anterior, se existir
    if (notificationsChannel) {
        await supabase.removeChannel(notificationsChannel);
        notificationsChannel = null;
    }

    realtimeUserId = userId;

    notificationsChannel = supabase
        .channel(`notifications-${userId}`)
        .on(
            "postgres_changes",
            {
                event: "INSERT",
                schema: "public",
                table: "notifications",
                filter: `recipient_id=eq.${userId}`
            },
            () => {
                console.log("Nova notificação recebida!");

                loadNotifications();
            }
        )
        .subscribe((status) => {
            console.log(
                "Status do Realtime:",
                status
            );
        });
}


// ========================================
// VERIFICAR SESSÃO
// ========================================

async function checkNotificationSession() {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
        console.error(
            "Erro ao verificar sessão:",
            error.message
        );
        return;
    }

    await updateNotificationSession(data.session);
}

checkNotificationSession();

supabase.auth.onAuthStateChange((_event, session) => {
    updateNotificationSession(session);
});
