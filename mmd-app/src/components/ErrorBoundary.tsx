import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[9999] bg-black/90 text-red-500 p-8 overflow-auto font-mono">
          <h1 className="text-2xl font-bold mb-4">💥 Application Crash</h1>
          <div className="bg-neutral-900 p-4 rounded border border-red-900 mb-4">
            <h2 className="text-xl mb-2">{this.state.error?.toString()}</h2>
            <details className="whitespace-pre-wrap text-sm text-neutral-400">
              <summary className="cursor-pointer hover:text-white mb-2">Show Stack Trace</summary>
              {this.state.errorInfo?.componentStack}
            </details>
          </div>
          <button 
            onClick={() => {
              localStorage.clear(); // Option to clear state if corrupt
              window.location.reload();
            }}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded mr-4"
          >
            Clear Cache & Reload
          </button>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded"
          >
            Just Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
