/**
 * TulipFleet Dispatcher — Delete Account
 */
import { useState } from "react";

import Card from "@mui/material/Card";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import MDInput from "components/MDInput";
import ConfirmDialogShell from "components/ConfirmDialogShell";
import { useNotifications } from "components/Notifications";
import { useDeleteAccount } from "hooks/useUserAccount";
import { useT } from "i18n";

function DeleteAccount(): JSX.Element {
  const { t } = useT();
  const { notifyToast } = useNotifications();
  const deleteMutation = useDeleteAccount();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");

  const handleOpen = () => {
    setPassword("");
    setOpen(true);
  };
  const handleClose = () => setOpen(false);

  const handleConfirmDelete = () => {
    if (!password) return;
    deleteMutation.mutate(password, {
      onSuccess: () => setOpen(false),
      onError: () =>
        notifyToast({ type: "form_err", titleKey: "settings.deleteFailed", severity: "high" }),
    });
  };

  return (
    <Card id="delete-account">
      <MDBox
        pr={3}
        display="flex"
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        flexDirection={{ xs: "column", sm: "row" }}
      >
        <MDBox p={3} lineHeight={1}>
          <MDBox mb={1}>
            <MDTypography variant="h5" component="h2">
              {t("settings.deleteTitle")}
            </MDTypography>
          </MDBox>
          <MDTypography variant="button" color="text">
            {t("settings.deleteHint")}
          </MDTypography>
        </MDBox>
        <MDBox display="flex" flexDirection={{ xs: "column", sm: "row" }}>
          <MDButton variant="gradient" color="error" sx={{ height: "100%" }} onClick={handleOpen}>
            {t("settings.deleteButton")}
          </MDButton>
        </MDBox>
      </MDBox>

      <ConfirmDialogShell
        open={open}
        severity="danger"
        icon="delete_forever"
        title={t("settings.deleteTitle")}
        subtitle={t("settings.deleteConfirmBody")}
        submitting={deleteMutation.isPending}
        confirmLabel={t("settings.confirmDelete")}
        submittingLabel={t("settings.deleting")}
        confirmDisabled={!password}
        onCancel={handleClose}
        onConfirm={handleConfirmDelete}
      >
        <MDInput
          fullWidth
          autoFocus
          label={t("settings.deletePassword")}
          value={password}
          required
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
          inputProps={{ type: "password", autoComplete: "", "aria-required": true }}
        />
        {deleteMutation.isError && (
          <MDTypography variant="caption" color="error" fontWeight="bold" display="block" mt={1}>
            {t("settings.deleteFailed")}
          </MDTypography>
        )}
      </ConfirmDialogShell>
    </Card>
  );
}

export default DeleteAccount;
