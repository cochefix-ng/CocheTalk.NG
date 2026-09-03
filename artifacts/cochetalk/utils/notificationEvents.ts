import {
  createNotificationEvent,
  type NotificationEventRequest,
} from '@workspace/api-client-react';

export function emitNotificationEvent(event: NotificationEventRequest) {
  void createNotificationEvent(event).catch(() => {
    // Notification delivery must not interrupt a local mutation. The server
    // remains the source of truth for eligibility and delivery status.
  });
}
