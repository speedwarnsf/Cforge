import React, { Component, ErrorInfo, ReactNode, useCallback, useState } from "react";
import { AlertTriangle, RefreshCw, Home, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /** Compact inline error for per-component boundaries */
  compact?: boolean;
  /** Label for screen readers */
  label?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("❌ Error caught by boundary:", error, errorInfo);
    this.setState({ errorInfo });

    if (process.env.NODE_ENV === 'production') {
      console.error('Production error:', { error: error.message, componentStack: errorInfo.componentStack });
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = () => {
    this.handleReset();
    window.location.href = '/';
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    // Compact inline error for component-level boundaries
    if (this.props.compact) {
      return (
        <div 
          className="p-4 bg-red-950/50 border border-red-800/50 rounded-lg text-center"
          role="alert"
          aria-label={`Error in ${this.props.label || 'component'}`}
        >
          <AlertTriangle className="w-5 h-5 text-red-400 mx-auto mb-2" aria-hidden="true" />
          <p className="text-sm text-red-300 mb-2">Something went wrong</p>
          <Button
            onClick={this.handleReset}
            size="sm"
            variant="outline"
            className="text-xs border-red-700 text-red-300 hover:bg-red-900"
          >
            <RefreshCw className="w-3 h-3 mr-1" aria-hidden="true" />
            Retry
          </Button>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4" role="alert">
        <div className="max-w-md w-full space-y-6">
          <Alert className="border-red-500 bg-red-50 dark:bg-red-950">
            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" aria-hidden="true" />
            <AlertTitle className="text-red-800 dark:text-red-300">
              Something went wrong
            </AlertTitle>
            <AlertDescription className="text-red-700 dark:text-red-400 mt-2">
              ConceptForge encountered an unexpected error. This has been logged and our team will investigate.
            </AlertDescription>
          </Alert>

          <div className="flex gap-3">
            <Button 
              onClick={this.handleReset}
              className="flex-1"
              variant="outline"
              aria-label="Try loading the page again"
            >
              <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" />
              Try Again
            </Button>
            <Button 
              onClick={this.handleGoHome}
              className="flex-1"
              aria-label="Go to the home page"
            >
              <Home className="w-4 h-4 mr-2" aria-hidden="true" />
              Go Home
            </Button>
          </div>

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="bg-slate-800 text-white p-4 rounded-md text-sm">
              <summary className="cursor-pointer mb-2 font-semibold">
                Error Details (Development)
              </summary>
              <div className="space-y-2">
                <div>
                  <strong>Error:</strong> {this.state.error.message}
                </div>
                <div>
                  <strong>Stack:</strong>
                  <pre className="mt-1 whitespace-pre-wrap text-xs">
                    {this.state.error.stack}
                  </pre>
                </div>
                {this.state.errorInfo && (
                  <div>
                    <strong>Component Stack:</strong>
                    <pre className="mt-1 whitespace-pre-wrap text-xs">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          )}
        </div>
      </div>
    );
  }
}

/** Inline error display for API/async errors in functional components */
export function ApiErrorDisplay({ 
  error, 
  onRetry, 
  message = "Failed to load data" 
}: { 
  error: Error | string | null; 
  onRetry?: () => void;
  message?: string;
}) {
  if (!error) return null;
  
  const isNetworkError = error instanceof Error && 
    (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('Failed to fetch'));

  return (
    <div 
      className="p-4 bg-red-950/30 border border-red-800/40 rounded-lg"
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start gap-3">
        {isNetworkError ? (
          <WifiOff className="w-5 h-5 text-red-400 mt-0.5 shrink-0" aria-hidden="true" />
        ) : (
          <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" aria-hidden="true" />
        )}
        <div className="flex-1">
          <p className="text-sm font-medium text-red-300">{message}</p>
          <p className="text-xs text-red-400/80 mt-1">
            {isNetworkError 
              ? "Check your internet connection and try again." 
              : typeof error === 'string' ? error : error.message}
          </p>
        </div>
        {onRetry && (
          <Button
            onClick={onRetry}
            size="sm"
            variant="outline"
            className="text-xs shrink-0 border-red-700 text-red-300 hover:bg-red-900/50"
          >
            <RefreshCw className="w-3 h-3 mr-1" aria-hidden="true" />
            Retry
          </Button>
        )}
      </div>
    </div>
  );
}

export default ErrorBoundary;
