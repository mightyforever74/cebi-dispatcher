import { ChangeEvent, ClipboardEvent, FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";

import MDAlert from "components/MDAlert";
import MDBox from "components/MDBox";
import MDButton from "components/MDButton";
import MDInput from "components/MDInput";
import MDTypography from "components/MDTypography";
import { AUTH_API_URL } from "config/api";
import { useT, type TFunction } from "i18n";
import BasicLayout from "layouts/authentication/components/BasicLayout";

import bgImage from "assets/images/bg-sign-in-basic.jpeg";

type Step = 1 | 2;

interface AuthErrorBody {
  error?: string;
  ok?: boolean;
}

const RESEND_COOLDOWN_SEC = 60;
const SUCCESS_REDIRECT_MS = 2000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function extractOtpDigits(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 6);
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

async function parseJsonBody(response: Response): Promise<AuthErrorBody | null> {
  try {
    const body: unknown = await response.json();
    if (body !== null && typeof body === "object") {
      return body as AuthErrorBody;
    }
    return null;
  } catch {
    return null;
  }
}

function mapResetError(status: number, errorCode: string | undefined, t: TFunction): string {
  if (status === 429) {
    return t("forgot.tooManyRequests");
  }
  if (status === 400 && errorCode === "Invalid or expired code") {
    return t("forgot.invalidCode");
  }
  if (status === 400 && errorCode === "Too many attempts") {
    return t("forgot.tooManyAttempts");
  }
  return t("forgot.resetFailed");
}

function ForgotPassword(): JSX.Element {
  const navigate = useNavigate();
  const { t } = useT();

  const [step, setStep] = useState<Step>(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) {
      return undefined;
    }
    const timer = window.setTimeout(() => {
      setResendIn((current) => (current <= 1 ? 0 : current - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  useEffect(() => {
    if (!succeeded) {
      return undefined;
    }
    const timer = window.setTimeout(() => {
      navigate("/authentication/sign-in/basic");
    }, SUCCESS_REDIRECT_MS);
    return () => window.clearTimeout(timer);
  }, [succeeded, navigate]);

  const startCooldown = () => setResendIn(RESEND_COOLDOWN_SEC);

  const sendCode = async () => {
    setError(null);
    const normalized = normalizeEmail(email);
    if (!normalized || !EMAIL_PATTERN.test(normalized)) {
      setError(t("forgot.invalidEmail"));
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${AUTH_API_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalized }),
      });

      if (response.status === 429) {
        setError(t("forgot.tooManyRequests"));
        return;
      }

      // Enumeration-safe: 429 dışında her durumda adım 2.
      setEmail(normalized);
      setStep(2);
      startCooldown();
    } catch {
      setEmail(normalized);
      setStep(2);
      startCooldown();
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    if (resendIn > 0 || loading) {
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const response = await fetch(`${AUTH_API_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizeEmail(email) }),
      });

      if (response.status === 429) {
        setError(t("forgot.tooManyRequests"));
        return;
      }

      startCooldown();
    } catch {
      startCooldown();
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    setError(null);
    if (code.length !== 6) {
      setError(t("forgot.codeMustBe6"));
      return;
    }
    if (newPassword.length < 6) {
      setError(t("forgot.passwordMin"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t("forgot.passwordMismatch"));
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${AUTH_API_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizeEmail(email),
          code,
          newPassword,
        }),
      });

      if (response.ok) {
        setSucceeded(true);
        return;
      }

      const body = await parseJsonBody(response);
      setError(mapResetError(response.status, body?.error, t));
    } catch {
      setError(t("forgot.connectionFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (event: ChangeEvent<HTMLInputElement>) => {
    setCode(extractOtpDigits(event.target.value));
  };

  const handleOtpPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    setCode(extractOtpDigits(event.clipboardData.getData("text")));
  };

  const handleSubmit = (event: FormEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (succeeded) {
      return;
    }
    if (step === 1) {
      void sendCode();
      return;
    }
    void resetPassword();
  };

  return (
    <BasicLayout image={bgImage}>
      <Card>
        <MDBox
          variant="gradient"
          bgColor="info"
          borderRadius="lg"
          coloredShadow="info"
          mx={2}
          mt={-3}
          p={2}
          mb={1}
          textAlign="center"
        >
          <MDTypography variant="h4" fontWeight="medium" color="white" mt={1}>
            {t("forgot.title")}
          </MDTypography>
          <MDTypography display="block" variant="button" color="white" my={1}>
            {t("login.brand")}
          </MDTypography>
        </MDBox>
        <MDBox pt={4} pb={3} px={3}>
          {succeeded ? (
            <>
              <MDAlert color="success">{t("forgot.changed")}</MDAlert>
              <MDBox mt={3} mb={1}>
                <MDButton
                  variant="gradient"
                  color="info"
                  fullWidth
                  onClick={() => navigate("/authentication/sign-in/basic")}
                >
                  {t("forgot.backToSignIn")}
                </MDButton>
              </MDBox>
            </>
          ) : (
            <MDBox component="form" role="form" onSubmit={handleSubmit}>
              {step === 1 ? (
                <>
                  <MDBox mb={2}>
                    <MDInput
                      type="email"
                      label={t("login.email")}
                      fullWidth
                      value={email}
                      autoComplete="email"
                      onChange={(event: ChangeEvent<HTMLInputElement>) => {
                        setEmail(event.target.value);
                      }}
                    />
                  </MDBox>
                  <MDTypography variant="caption" color="text" display="block" mb={2}>
                    {t("forgot.hint")}
                  </MDTypography>
                  {error ? (
                    <MDBox mb={1}>
                      <MDTypography variant="caption" color="error">
                        {error}
                      </MDTypography>
                    </MDBox>
                  ) : null}
                  <MDBox mt={1} mb={1}>
                    <MDButton
                      type="submit"
                      variant="gradient"
                      color="info"
                      fullWidth
                      disabled={loading}
                    >
                      {loading ? t("forgot.sending") : t("forgot.sendCode")}
                    </MDButton>
                  </MDBox>
                </>
              ) : (
                <>
                  <MDBox
                    mb={2}
                    px={1.5}
                    py={1}
                    borderRadius="lg"
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{ backgroundColor: "rgba(255,255,255,0.06)" }}
                  >
                    <MDTypography variant="button" color="text" fontWeight="medium">
                      {email}
                    </MDTypography>
                    <MDTypography
                      variant="caption"
                      color="info"
                      fontWeight="medium"
                      sx={{ cursor: "pointer", userSelect: "none" }}
                      onClick={() => {
                        setError(null);
                        setStep(1);
                      }}
                    >
                      {t("forgot.changeEmail")}
                    </MDTypography>
                  </MDBox>
                  <MDBox mb={2}>
                    <MDInput
                      type="text"
                      label={t("forgot.verificationCode")}
                      fullWidth
                      value={code}
                      onChange={handleOtpChange}
                      onPaste={handleOtpPaste}
                      inputProps={{
                        inputMode: "numeric",
                        autoComplete: "one-time-code",
                        maxLength: 6,
                        pattern: "[0-9]*",
                      }}
                    />
                  </MDBox>
                  <MDBox mb={2}>
                    <MDInput
                      type={showPassword ? "text" : "password"}
                      label={t("forgot.newPassword")}
                      fullWidth
                      value={newPassword}
                      autoComplete="new-password"
                      onChange={(event: ChangeEvent<HTMLInputElement>) => {
                        setNewPassword(event.target.value);
                      }}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              aria-label={
                                showPassword ? t("forgot.hidePassword") : t("forgot.showPassword")
                              }
                              onClick={() => setShowPassword((visible) => !visible)}
                              edge="end"
                            >
                              <Icon>{showPassword ? "visibility_off" : "visibility"}</Icon>
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  </MDBox>
                  <MDBox mb={2}>
                    <MDInput
                      type={showConfirm ? "text" : "password"}
                      label={t("forgot.confirmPassword")}
                      fullWidth
                      value={confirmPassword}
                      autoComplete="new-password"
                      onChange={(event: ChangeEvent<HTMLInputElement>) => {
                        setConfirmPassword(event.target.value);
                      }}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              aria-label={
                                showConfirm ? t("forgot.hidePassword") : t("forgot.showPassword")
                              }
                              onClick={() => setShowConfirm((visible) => !visible)}
                              edge="end"
                            >
                              <Icon>{showConfirm ? "visibility_off" : "visibility"}</Icon>
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  </MDBox>
                  {error ? (
                    <MDBox mb={1}>
                      <MDTypography variant="caption" color="error">
                        {error}
                      </MDTypography>
                    </MDBox>
                  ) : null}
                  <MDBox mt={1} mb={1}>
                    <MDButton
                      type="submit"
                      variant="gradient"
                      color="info"
                      fullWidth
                      disabled={loading}
                    >
                      {loading ? t("forgot.saving") : t("forgot.reset")}
                    </MDButton>
                  </MDBox>
                  <MDBox mt={1} textAlign="center">
                    <MDButton
                      variant="text"
                      color="info"
                      disabled={loading || resendIn > 0}
                      onClick={() => {
                        void resendCode();
                      }}
                    >
                      {resendIn > 0
                        ? t("forgot.resendIn", { seconds: resendIn })
                        : t("forgot.resend")}
                    </MDButton>
                  </MDBox>
                </>
              )}
              <MDBox mt={2} mb={1} textAlign="center">
                <MDTypography
                  component={Link}
                  to="/authentication/sign-in/basic"
                  variant="button"
                  color="text"
                  fontWeight="medium"
                >
                  {t("forgot.backToSignIn")}
                </MDTypography>
              </MDBox>
            </MDBox>
          )}
        </MDBox>
      </Card>
    </BasicLayout>
  );
}

export default ForgotPassword;
