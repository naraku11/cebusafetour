import React from 'react';
import ErrorPage from '../pages/ErrorPage';

export default class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorPage
          code={500}
          title="Something Went Wrong"
          message="An unexpected error occurred. Please refresh the page or contact support."
        />
      );
    }
    return this.props.children;
  }
}
