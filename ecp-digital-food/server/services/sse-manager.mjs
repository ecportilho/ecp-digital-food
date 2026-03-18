// Map<paymentId, Set<ServerResponse>>
const connections = new Map();

export function addConnection(paymentId, res) {
  if (!connections.has(paymentId)) connections.set(paymentId, new Set());
  connections.get(paymentId).add(res);
}

export function removeConnection(paymentId, res) {
  const set = connections.get(paymentId);
  if (set) {
    set.delete(res);
    if (set.size === 0) connections.delete(paymentId);
  }
}

export function emit(paymentId, eventName, data) {
  const set = connections.get(paymentId);
  if (!set) return;
  const message = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of set) {
    try {
      res.write(message);
    } catch {
      removeConnection(paymentId, res);
    }
  }
}

export function closeAll(paymentId) {
  const set = connections.get(paymentId);
  if (!set) return;
  for (const res of set) {
    try {
      res.end();
    } catch {
      // ignore
    }
  }
  connections.delete(paymentId);
}
