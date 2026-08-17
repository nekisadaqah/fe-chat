export interface DebugLog {
  id: string;
  timestamp: string;
  type: 'API' | 'SignalR';
  direction: 'IN' | 'OUT' | 'EVENT';
  name: string;
  details: any;
}

let logs: DebugLog[] = [];
const subscribers = new Set<(logs: DebugLog[]) => void>();

export const debugLogger = {
  addLog(type: 'API' | 'SignalR', direction: 'IN' | 'OUT' | 'EVENT', name: string, details: any) {
    const newLog: DebugLog = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      type,
      direction,
      name,
      details
    };
    logs = [newLog, ...logs].slice(0, 100); // Limit to 100 entries
    subscribers.forEach(cb => cb(logs));
  },
  
  getLogs(): DebugLog[] {
    return logs;
  },
  
  subscribe(callback: (logs: DebugLog[]) => void): () => void {
    subscribers.add(callback);
    callback(logs); // Initial call
    return () => {
      subscribers.delete(callback);
    };
  },

  clear() {
    logs = [];
    subscribers.forEach(cb => cb(logs));
  }
};
