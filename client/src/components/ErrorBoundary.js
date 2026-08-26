import React from 'react'

class ErrorBoundary extends React.Component {
    state = { hasError: false }

    static getDerivedStateFromError() {
        return { hasError: true }
    }

    componentDidCatch(error, errorInfo) {
        if (process.env.NODE_ENV !== 'production') {
            console.error('UI render error:', error, errorInfo)
        }
    }

    handleReload = () => {
        window.location.reload()
    }

    render() {
        if (!this.state.hasError) return this.props.children

        return (
            <main role="alert" style={{ maxWidth: 640, margin: '5rem auto', padding: 24, textAlign: 'center' }}>
                <h1>אירעה שגיאה בטעינת המסך</h1>
                <p>אפשר לנסות לטעון מחדש את האפליקציה.</p>
                <button type="button" onClick={this.handleReload}>טען מחדש</button>
            </main>
        )
    }
}

export default ErrorBoundary
