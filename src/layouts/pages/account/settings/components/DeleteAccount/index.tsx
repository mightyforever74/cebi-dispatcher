/**
=========================================================
* TulipFleet Dispatcher — Delete Account
=========================================================
* Gercek API baglantisi: DELETE /api/users/me, body:{password}.
* "Deactivate" butonu kaldirildi - mobil AdminSettings.js'de "deactivate"
* kavraminin hicbir karsiligi yok, sadece MD2 demo sablonundandi.
=========================================================
*/

import { useState } from "react";

// @mui material components
import Card from "@mui/material/Card";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";

// Material Dashboard 2 PRO React TS components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import MDInput from "components/MDInput";

// Real API
import { useDeleteAccount } from "hooks/useUserAccount";

function DeleteAccount(): JSX.Element {
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
            <MDTypography variant="h5">Delete Account</MDTypography>
          </MDBox>
          <MDTypography variant="button" color="text">
            Once you delete your account, there is no going back. Please be certain.
          </MDTypography>
        </MDBox>
        <MDBox display="flex" flexDirection={{ xs: "column", sm: "row" }}>
          <MDButton variant="gradient" color="error" sx={{ height: "100%" }} onClick={handleOpen}>
            delete account
          </MDButton>
        </MDBox>
      </MDBox>

      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
        <DialogTitle>Delete Account</DialogTitle>
        <DialogContent>
          <MDTypography variant="button" color="text" mb={2} display="block">
            This action cannot be undone. Enter your password to confirm.
          </MDTypography>
          <MDInput
            fullWidth
            label="Password"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            inputProps={{ type: "password", autoComplete: "" }}
          />
          {deleteMutation.isError && (
            <MDBox mt={1}>
              <MDTypography variant="caption" color="error" fontWeight="bold">
                Could not delete account — check your password
              </MDTypography>
            </MDBox>
          )}
        </DialogContent>
        <DialogActions>
          <MDButton variant="outlined" color="dark" size="small" onClick={handleClose}>
            cancel
          </MDButton>
          <MDButton
            variant="gradient"
            color="error"
            size="small"
            onClick={handleConfirmDelete}
            disabled={!password || deleteMutation.isPending}
          >
            {deleteMutation.isPending ? "deleting..." : "confirm delete"}
          </MDButton>
        </DialogActions>
      </Dialog>
    </Card>
  );
}

export default DeleteAccount;
