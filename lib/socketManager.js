// Socket.io manager - singleton instance
let io = null;

export function setIO(ioInstance) {
  io = ioInstance;
}

export function getIO() {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
}

export function hasIO() {
  return io !== null;
}