import { Component, ReactNode } from "react";
import { Link } from "react-router-dom";
import { t } from "i18n";

type Props = { children: ReactNode };
type State = { hasError: boolean };

/**
 * Route-level fence so a render crash cannot empty `#root`.
 * Plain HTML — no MUI / MD2. Copy from the i18n dictionary.
 */
class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
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
