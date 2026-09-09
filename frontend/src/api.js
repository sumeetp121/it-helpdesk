async function request(url, options = {}) {
    const response = await fetch(url, {
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {}),
        },
        ...options,
    });

    const text = await response.text();

    let data = null;

    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = text;
    }

    if (!response.ok) {
        throw new Error(
            data?.detail ||
            data?.error ||
            `Request failed (${response.status})`
        );
    }

    return data;
}


export const api = {

    /* =========================
       USERS
    ========================= */

    getUsers: () =>
        request("/api/users"),

    createUser: (user) =>
        request("/api/users", {
            method: "POST",
            body: JSON.stringify(user),
        }),

    updateUser: (id, user) =>
        request(`/api/users/${id}`, {
            method: "PUT",
            body: JSON.stringify(user),
        }),

    deleteUser: (id) =>
        request(`/api/users/${id}`, {
            method: "DELETE",
        }),


    /* =========================
       TICKETS
    ========================= */

    getTickets: () =>
        request("/api/tickets"),

    createTicket: (ticket) =>
        request("/api/tickets", {
            method: "POST",
            body: JSON.stringify(ticket),
        }),

    updateTicket: (id, ticket) =>
        request(`/api/tickets/${id}`, {
            method: "PUT",
            body: JSON.stringify(ticket),
        }),

    deleteTicket: (id) =>
        request(`/api/tickets/${id}`, {
            method: "DELETE",
        }),


    /* =========================
       NOTIFICATIONS
    ========================= */

    getNotifications: () =>
        request("/api/notifications"),

    updateNotification: (id, notification) =>
        request(`/api/notifications/${id}`, {
            method: "PUT",
            body: JSON.stringify(notification),
        }),
};