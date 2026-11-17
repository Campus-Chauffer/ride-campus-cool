// index.js creates the actual Server instance (it owns the HTTP server
// socket.io attaches to), but every socket.io event handling until now
// lived entirely inside index.js's own io.on('connection', ...) block --
// no controller had any way to reach `io` at all, since it's a local
// const there, never exported. That's the reason trip-status changes
// (accepted, arrived, started, completed) only ever reached the
// passenger's open app through its own 3-second poll: the driver's HTTP
// actions had no path to emit anything in real time. This tiny
// get/set singleton gives controllers that path without a circular
// require on index.js itself (index.js requires every route/controller
// before it constructs `io`, so they can't import it directly from there).
let io = null;

function setIO(instance) {
  io = instance;
}

function getIO() {
  return io;
}

module.exports = { setIO, getIO };
