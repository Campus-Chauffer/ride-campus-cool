import { Component } from 'react';
import { AlertTriangle } from 'lucide-react';

// Last line of defense against an uncaught render crash (malformed API
// response, a bug in a new page) turning the whole dashboard into a blank
// white screen with no way back short of knowing to hard-refresh.
export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Admin dashboard crashed:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={22} className="text-red-400" />
          </div>
          <h1 className="text-white font-semibold text-lg mb-1.5">Something went wrong</h1>
          <p className="text-gray-500 text-sm mb-5">
            This page ran into an unexpected error. Reloading usually fixes it.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-yellow-400 text-gray-900 font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-yellow-300 transition"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
