import { Component, ReactNode } from "react";

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
};

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    hasError: false
  };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // Keep logs in console for dev visibility.
    // eslint-disable-next-line no-console
    console.error("Unhandled app error", error);
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="grid min-h-screen place-items-center bg-[#f1f5f9] px-4">
        <section className="w-full max-w-[560px] rounded-lg border border-[#eaecf0] bg-white p-6 text-center shadow-[0_10px_20px_rgba(148,163,184,0.2)]">
          <h1 className="text-2xl font-semibold text-[#242424]">Something went wrong</h1>
          <p className="mt-2 text-sm text-[#667085]">Please retry. If this keeps happening, reload the page.</p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              type="button"
              className="h-9 rounded-[4px] bg-[#1595d4] px-4 text-sm font-semibold text-white"
              onClick={this.handleRetry}
            >
              Retry
            </button>
            <button
              type="button"
              className="h-9 rounded-[4px] border border-[#d1d1d1] bg-white px-4 text-sm font-semibold text-[#344054]"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
          </div>
        </section>
      </main>
    );
  }
}

