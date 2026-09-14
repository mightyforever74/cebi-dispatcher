import { MouseEvent, useState } from "react";

import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import { useT, type Lang } from "i18n";

const OPTIONS: { code: Lang; flag: string; label: string }[] = [
  { code: "en", flag: "🇬🇧", label: "EN" },
  { code: "tr", flag: "🇹🇷", label: "TR" },
  { code: "nl", flag: "🇳🇱", label: "NL" },
];

interface Props {
  variant?: "navbar" | "login";
}

function LanguageSwitcher({ variant = "navbar" }: Props): JSX.Element {
  const { lang, setLang } = useT();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const current = OPTIONS.find((opt) => opt.code === lang) ?? OPTIONS[0];
  const open = Boolean(anchorEl);

  const handleOpen = (event: MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);
  const handleChoose = (code: Lang) => {
    setLang(code);
    handleClose();
  };

  const trigger =
    variant === "login" ? (
      <MDBox
        component="button"
        type="button"
        onClick={handleOpen}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Language"
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 0.75,
          px: 1.25,
          py: 0.75,
          borderRadius: "8px",
          border: "1px solid rgba(255,255,255,0.35)",
          background: "rgba(0,0,0,0.28)",
          color: "#fff",
          cursor: "pointer",
          fontSize: "13px",
          fontWeight: 600,
          letterSpacing: "0.04em",
          lineHeight: 1,
        }}
      >
        <span aria-hidden="true">{current.flag}</span>
        {current.label}
      </MDBox>
    ) : (
      <IconButton
        size="small"
        color="inherit"
        disableRipple
        onClick={handleOpen}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Language"
        sx={{
          px: 1,
          borderRadius: "8px",
          fontSize: "13px",
          fontWeight: 600,
          letterSpacing: "0.04em",
        }}
      >
        <span aria-hidden="true" style={{ marginRight: 6 }}>
          {current.flag}
        </span>
        {current.label}
      </IconButton>
    );

  return (
    <>
      {trigger}
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        sx={{ mt: 1 }}
        MenuListProps={{ dense: true, "aria-label": "Language" }}
      >
        {OPTIONS.map((opt) => (
          <MenuItem key={opt.code} selected={opt.code === lang} onClick={() => handleChoose(opt.code)}>
            <MDTypography variant="button" fontWeight="medium" color="text">
              <span aria-hidden="true">{opt.flag}</span>
              &nbsp;&nbsp;{opt.label}
            </MDTypography>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

export default LanguageSwitcher;
