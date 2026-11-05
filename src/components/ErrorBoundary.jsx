import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Model Town Board Error Boundary caught error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-slate-900 border border-rose-500/50 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-8 h-8 shrink-0" />
              <h1 className="text-lg font-black tracking-tight">Model Town Board Application Alert</h1>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              An unexpected error occurred while rendering the simulator:
            </p>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] text-rose-300 break-words max-h-48 overflow-y-auto">
              {this.state.error?.message || String(this.state.error)}
            </div>
            <button
              onClick={this.handleReload}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-950"
            >
              <RotateCcw className="w-4 h-4" />
              Reload Simulator
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
