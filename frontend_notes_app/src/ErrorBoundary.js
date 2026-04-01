import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // 更新 state 以便下一次渲染将显示回退 UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // 你也可以在这里将错误报告给一个错误报告服务
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ error, errorInfo });
    try {
      fetch('http://localhost:8000/client-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: String(error?.message || error),
          stack: String(error?.stack || ''),
          componentStack: String(errorInfo?.componentStack || ''),
          url: window.location.href,
          userAgent: navigator.userAgent,
        }),
      }).catch(() => {});
    } catch (e) {}
  }

  render() {
    if (this.state.hasError) {
      // 你可以渲染任何自定义的备用 UI
      return (
        <div style={{ padding: '20px', border: '1px solid red', margin: '20px', backgroundColor: '#ffe6e6' }}>
          <h2>出错了！</h2>
          <p>很抱歉，应用程序中发生了错误。</p>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
