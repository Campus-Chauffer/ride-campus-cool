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

  // Lets the driver's screen share the route it already fetched from
  // Directions instead of the passenger independently calling the same
  // endpoint for the identical route — halves the Directions API calls for
  // every ride leg.
  sendRoute(rideId: number, coordinates: { latitude: number; longitude: number }[], durationMinutes: number | null, durationText: string | null) {
    this.socket?.emit('driver:route', { rideId, coordinates, durationMinutes, durationText });
  }

  onDriverRoute(callback: (data: { coordinates: { latitude: number; longitude: number }[]; durationMinutes: number | null; durationText: string | null }) => void) {
    this.socket?.on('ride:driver_route', callback);
  }

  offDriverRoute() {
    this.socket?.off('ride:driver_route');
  }
}

export default new SocketService();