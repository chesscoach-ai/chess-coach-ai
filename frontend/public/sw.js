self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data
      ? event.data.json()
      : {};
  } catch {
    payload = {
      body: event.data?.text(),
    };
  }

  event.waitUntil(
    self.registration.showNotification(
      payload.title ||
        "Knightly · À toi de jouer",
      {
        body:
          payload.body ||
          "Ta mission du jour attend son prochain coup.",
        icon:
          payload.icon ||
          "/favicon.ico",
        badge:
          payload.badge ||
          "/favicon.ico",
        tag:
          payload.tag ||
          "daily-coach",
        renotify: true,
        vibrate: [90, 45, 90],
        data: {
          url: payload.url || "/",
          receivedAt: Date.now(),
        },
      },
    ),
  );
});

self.addEventListener("notificationclick", (event) => {
  const targetUrl = new URL(
    event.notification.data?.url || "/",
    self.location.origin,
  ).href;
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    }).then((windows) => {
      const existing = windows.find(
        (client) =>
          new URL(client.url).origin ===
          self.location.origin,
      );
      if (existing) {
        return existing
          .navigate(targetUrl)
          .then(() => existing.focus());
      }
      return self.clients.openWindow(
        targetUrl,
      );
    }),
  );
});
