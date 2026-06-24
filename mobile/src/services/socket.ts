import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'https://ride-campus-cool-production.up.railway.app';

class SocketService {
  private socket: Socket | null = null;

  connect() {
    if (this.socket?.connected) return;
    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
    });
    this.socket.on('connect', () => {});
    this.socket.on('disconnect', () => {});
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