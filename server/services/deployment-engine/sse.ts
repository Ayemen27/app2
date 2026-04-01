import type { Response } from "express";

export const activeSSEClients = new Map<string, Response[]>();
export const globalSSEClients = new Set<Response>();

export function broadcastToClients(deploymentId: string, data: any) {
  const clients = activeSSEClients.get(deploymentId) || [];
  const dead: number[] = [];
  clients.forEach((res, idx) => {
    try {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch {
      dead.push(idx);
    }
  });
  dead.reverse().forEach(i => clients.splice(i, 1));
}

export function broadcastGlobalEvent(event: { type: string; deploymentId: string; data: any }) {
  const dead: Response[] = [];
  globalSSEClients.forEach(res => {
    try {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    } catch {
      dead.push(res);
    }
  });
  dead.forEach(r => globalSSEClients.delete(r));
}

export function registerGlobalSSEClient(res: Response) {
  globalSSEClients.add(res);
  res.on("close", () => globalSSEClients.delete(res));
}

export function addSSEClient(deploymentId: string, res: Response) {
  if (!activeSSEClients.has(deploymentId)) {
    activeSSEClients.set(deploymentId, []);
  }
  activeSSEClients.get(deploymentId)!.push(res);
  res.on("close", () => {
    const clients = activeSSEClients.get(deploymentId);
    if (clients) {
      const idx = clients.indexOf(res);
      if (idx !== -1) clients.splice(idx, 1);
      if (clients.length === 0) activeSSEClients.delete(deploymentId);
    }
  });
}
