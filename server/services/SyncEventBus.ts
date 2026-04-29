import { EventEmitter } from 'events';

export type SyncOp = 'upsert' | 'delete';

export interface SyncStreamEvent {
  op: SyncOp;
  table: string;
  id?: string;
  record?: Record<string, unknown>;
  user_id?: string;
  project_id?: string | null;
  scope?: 'all' | 'project' | 'user';
  emittedBy?: string;
  at: string;
}

class SyncEventBusImpl extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(0);
  }

  publish(evt: Omit<SyncStreamEvent, 'at'>): void {
    const payload: SyncStreamEvent = { ...evt, at: new Date().toISOString() };
    this.emit('event', payload);
  }
}

export const syncEventBus = new SyncEventBusImpl();
