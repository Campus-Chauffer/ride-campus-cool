import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'https://ride-campus-cool-production.up.railway.app';

class SocketService {
  private socket: Socket | null = null;

  connect() {
    if (this.socket?.connected) return;
    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity, // keep trying forever
      reconnectionDelay: 2000,        // wait 2s before retrying
      reconnectionDelayMax: 10000,    // max 10s between retries
      timeout: 10000,
    });
    this.socket.on('connect', () => {
      console.log('Socket connected');
    });
    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });
    this.socket.on('reconnect', (attempt) => {
      console.log('Socket reconnected after', attempt, 'attempts');
    });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  joinRide(rideId: number) {
    this.socket?.emit('ride:join', rideId);
  }

  sendLocation(rideId: number, latitude: number, longitude: number, heading: number = 0) {
    this.socket?.emit('driver:location', { rideId, latitude, longitude, heading });
  }

  onDriverLocation(callback: (data: { latitude: number; longitude: number; heading: number }) => void) {
    this.socket?.on('ride:driver_location', callback);
  }

  offDriverLocation() {
    this.socket?.off('ride:driver_location');
  }
}

export default new SocketService();