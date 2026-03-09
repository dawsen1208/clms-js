/**
 * Error Boundary Component
 * Catches JavaScript errors in their child component tree and displays a fallback UI.
 */
import { Component } from 'react';
import { Alert, Button } from 'antd';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError() {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      return (
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <Alert
            message="Component Rendering Error"
            description={
              <div>
                <p>Sorry, an error occurred while rendering this component.</p>
                <p>Error details: {this.state.error?.toString()}</p>
                <Button type="primary" onClick={this.handleReset} style={{ marginTop: '16px' }}>
                  Retry
                </Button>
              </div>
            }
            type="error"
            showIcon
          />
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
