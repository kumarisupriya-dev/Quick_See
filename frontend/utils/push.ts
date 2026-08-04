import {createClient} from "./supabase/client";

function urlBase64ToUint8Array(base64String: string) {
    const padding = "=".repeat((4 - (base64String.length %4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export async function subscribeToNotifications() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        console.warn("Push notifications are not supported in this browser.");
        return false;
    }

    try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
            throw new Error("Notification permission was denied by the user.");
        }
        const registration = await navigator.serviceWorker.register("/sw.js");
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
            throw new Error("Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY in environment variables.");
        }
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
        const supabase = createClient();
        const {data: {user}} = await supabase.auth.getUser();
        if (!user) throw new Error("No authenticated user found.");

        const {error} = await supabase
            .from("push_subscriptions")
            .upsert({
                user_id: user.id,
                subscription_json: subscription.toJSON(),
            }, {onConflict: "user_id"});

        if (error) throw error;
        return true;
    } catch (err: any) {
        console.error("Push subscription registration failed:", err);
        throw err;
    }
}

export async function getNotificationPermissionState() {
    if (!("Notification" in window)) return "unsupported";
    return Notification.permission;
}