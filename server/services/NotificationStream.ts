import { EventEmitter } from 'events';

export type NotificationStreamEvent = {
  kind: 'created' | 'updated' | 'deleted' | 'read' | 'mark-all-read';
  notificationId?: string;
  recipients: string[] | 'all';
  project_id?: string | null;
  type?: string;
  priority?: number;
  title?: string;
  at: string;
};

class NotificationStreamBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(0);
  }

  publish(evt: Omit<NotificationStreamEvent, 'at'>): void {
    const payload: NotificationStreamEvent = { ...evt, at: new Date().toISOString() };
    this.emit('event', payload);
  }
}

export const notificationStream = new NotificationStreamBus();
