import { Component, ReactNode } from "react";
import { Link } from "react-router-dom";
import { t } from "i18n";

type Props = { children: ReactNode };
type State = { hasError: boolean; generation: number };

/**
 * Route-level fence so a render crash cannot empty `#root`.
 * Plain HTML — no MUI / MD2. Copy from the i18n dictionary.
 * Retry remounts the failed route tree (`generation` key).
 */
class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, generation: 0 };

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  handleRetry = () => {
    this.setState((prev) => ({ hasError: false, generation: prev.generation + 1 }));
  };

  render() {
    if (!this.state.hasError) {
      return <div key={this.state.generation}>{this.props.children}</div>;
    }

    return (
      <div role="alert" style={{ padding: 24, fontFamily: "Manrope, system-ui, sans-serif" }}>
        <p>{t("error.title")}</p>
        <p>
          <button type="button" onClick={this.handleRetry}>
            {t("error.retry")}
          </button>
        </p>
        <p>
          <Link to="/dashboards/live-fleet-map">{t("nav.home")}</Link>
        </p>
      </div>
    );
  }
}

export default ErrorBoundary;
