import { Component, type ErrorInfo, type ReactNode } from 'react'
import { ErrorState } from '@/components/ui/Feedback'

type Props = { children: ReactNode }
type State = { hasError: boolean; message: string }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || 'Unexpected application error' }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('UI error boundary', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6">
          <ErrorState
            title="Application error"
            message={this.state.message}
            onRetry={() => this.setState({ hasError: false, message: '' })}
          />
        </div>
      )
    }
    return this.props.children
  }
}
