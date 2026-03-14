declare global {
  var isEmergencyMode: boolean;
  var inConnectionRetry: boolean;
  var lastIntegrityCheck: {
    status: string;
    lastChecked: string | null;
    issues: string[];
  } | null;
  var db: unknown;
  var io: import('socket.io').Server | undefined;
}
export {};
