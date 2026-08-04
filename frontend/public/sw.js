self.addEventListener("push", (event) => {
    if (!event.data) return;

    try {
        const data = event.data.json();
        const title = data.title || "Quick See Update";
        const options = {
            body: data.body || "Check your academic timeline for updates.",
            icon: "/favicon.ico",
            badge: "/favicon.ico",
            data: data.url || "/dashboard"
        };
        event.waitUntil(self.registration.showNotification(title, options));
    } catch (err) {
        const text = event.data.text();
        event.waitUntil(
            self.registration.showNotification("Quick See Update", {
                body: text,
                icon: "/favicon.ico",
                badge: "/favicon.ico",
                data: "/dashboard"
            })
        );
    }
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const urlToOpen = event.notification.data;

    event.waitUntil(
        clients.matchAll({type: "window", includeUncontrolled: true}).then((windowClients) => {
            for (let i = 0; i  < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url === urlToOpen && "focus" in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});