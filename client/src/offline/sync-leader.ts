const CHANNEL_NAME = 'binarjoin-sync-leader';
const HEARTBEAT_INTERVAL = 3000;
const HEARTBEAT_TIMEOUT = 6000;
const ELECTION_DELAY = 1000;

type LeaderMessage =
  | { type: 'heartbeat'; tabId: string; timestamp: number }
  | { type: 'claim'; tabId: string; timestamp: number }
  | { type: 'release'; tabId: string };

let channel: BroadcastChannel | null = null;
let tabId: string = '';
let isLeader = false;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let watchdogTimer: ReturnType<typeof setInterval> | null = null;
let lastLeaderHeartbeat = 0;
let currentLeaderId = '';
let leaderChangeCallbacks: Array<(isLeader: boolean) => void> = [];

function generateTabId(): string {
  return `tab-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

function broadcast(msg: LeaderMessage) {
  try {
    channel?.postMessage(msg);
  } catch {
  }
}

function startHeartbeat() {
  stopHeartbeat();
  heartbeatTimer = setInterval(() => {
    if (isLeader) {
      broadcast({ type: 'heartbeat', tabId, timestamp: Date.now() });
    }
  }, HEARTBEAT_INTERVAL);
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

function becomeLeader() {
  if (isLeader) return;
  isLeader = true;
  currentLeaderId = tabId;
  lastLeaderHeartbeat = Date.now();
  broadcast({ type: 'claim', tabId, timestamp: Date.now() });
  startHeartbeat();
  console.log(`[SyncLeader] Tab ${tabId} became leader`);
  leaderChangeCallbacks.forEach(cb => cb(true));
}

function resignLeadership() {
  if (!isLeader) return;
  isLeader = false;
  stopHeartbeat();
  broadcast({ type: 'release', tabId });
  console.log(`[SyncLeader] Tab ${tabId} resigned leadership`);
  leaderChangeCallbacks.forEach(cb => cb(false));
}

function handleMessage(msg: LeaderMessage) {
  if (msg.tabId === tabId) return;

  switch (msg.type) {
    case 'heartbeat':
      if (msg.tabId === currentLeaderId || !isLeader) {
        lastLeaderHeartbeat = msg.timestamp;
        currentLeaderId = msg.tabId;
        if (isLeader) {
          isLeader = false;
          stopHeartbeat();
          leaderChangeCallbacks.forEach(cb => cb(false));
        }
      } else if (isLeader && msg.tabId < tabId) {
        resignLeadership();
        currentLeaderId = msg.tabId;
        lastLeaderHeartbeat = msg.timestamp;
      }
      break;

    case 'claim':
      if (isLeader) {
        if (msg.tabId < tabId) {
          resignLeadership();
          currentLeaderId = msg.tabId;
          lastLeaderHeartbeat = msg.timestamp;
        }
      } else {
        currentLeaderId = msg.tabId;
        lastLeaderHeartbeat = msg.timestamp;
      }
      break;

    case 'release':
      if (msg.tabId === currentLeaderId) {
        currentLeaderId = '';
        lastLeaderHeartbeat = 0;
        setTimeout(() => tryClaimLeadership(), Math.random() * ELECTION_DELAY);
      }
      break;
  }
}

function tryClaimLeadership() {
  if (isLeader) return;
  if (currentLeaderId && (Date.now() - lastLeaderHeartbeat) < HEARTBEAT_TIMEOUT) return;
  becomeLeader();
}

function startWatchdog() {
  stopWatchdog();
  watchdogTimer = setInterval(() => {
    if (isLeader) return;
    if (!currentLeaderId || (Date.now() - lastLeaderHeartbeat) > HEARTBEAT_TIMEOUT) {
      console.log(`[SyncLeader] Leader timeout detected, attempting election`);
      tryClaimLeadership();
    }
  }, HEARTBEAT_TIMEOUT);
}

function stopWatchdog() {
  if (watchdogTimer) {
    clearInterval(watchdogTimer);
    watchdogTimer = null;
  }
}

const LS_LEADER_KEY = 'binarjoin-sync-leader-lock';
const LS_LEASE_TTL = 8000;

function tryLocalStorageLease(): boolean {
  try {
    const raw = localStorage.getItem(LS_LEADER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.tabId !== tabId && (Date.now() - parsed.timestamp) < LS_LEASE_TTL) {
        return false;
      }
    }
    localStorage.setItem(LS_LEADER_KEY, JSON.stringify({ tabId, timestamp: Date.now() }));
    return true;
  } catch {
    return true;
  }
}

function startLocalStorageHeartbeat() {
  stopHeartbeat();
  heartbeatTimer = setInterval(() => {
    if (isLeader) {
      try {
        localStorage.setItem(LS_LEADER_KEY, JSON.stringify({ tabId, timestamp: Date.now() }));
      } catch {}
    }
  }, HEARTBEAT_INTERVAL);
}

function startLocalStorageWatchdog() {
  stopWatchdog();
  watchdogTimer = setInterval(() => {
    if (isLeader) return;
    try {
      const raw = localStorage.getItem(LS_LEADER_KEY);
      if (!raw || (Date.now() - JSON.parse(raw).timestamp) > LS_LEASE_TTL) {
        if (tryLocalStorageLease()) {
          isLeader = true;
          startLocalStorageHeartbeat();
          leaderChangeCallbacks.forEach(cb => cb(true));
        }
      }
    } catch {}
  }, HEARTBEAT_TIMEOUT);
}

export function initLeaderElection(): void {
  if (typeof window === 'undefined') {
    isLeader = true;
    leaderChangeCallbacks.forEach(cb => cb(true));
    return;
  }

  tabId = generateTabId();

  if (typeof BroadcastChannel === 'undefined') {
    if (tryLocalStorageLease()) {
      isLeader = true;
      startLocalStorageHeartbeat();
    }
    startLocalStorageWatchdog();
    window.addEventListener('beforeunload', () => {
      if (isLeader) {
        try { localStorage.removeItem(LS_LEADER_KEY); } catch {}
      }
    });
    leaderChangeCallbacks.forEach(cb => cb(isLeader));
    return;
  }

  try {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (event) => handleMessage(event.data as LeaderMessage);
  } catch {
    isLeader = true;
    leaderChangeCallbacks.forEach(cb => cb(true));
    return;
  }

  window.addEventListener('beforeunload', () => {
    if (isLeader) {
      resignLeadership();
    }
    destroyLeaderElection();
  });

  startWatchdog();

  setTimeout(() => tryClaimLeadership(), Math.random() * ELECTION_DELAY);
}

export function destroyLeaderElection(): void {
  stopHeartbeat();
  stopWatchdog();
  try {
    channel?.close();
  } catch {
  }
  channel = null;
}

export function isCurrentTabLeader(): boolean {
  return isLeader;
}

export function onLeaderChange(callback: (isLeader: boolean) => void): () => void {
  leaderChangeCallbacks.push(callback);
  return () => {
    leaderChangeCallbacks = leaderChangeCallbacks.filter(cb => cb !== callback);
  };
}

export function getTabId(): string {
  return tabId;
}
