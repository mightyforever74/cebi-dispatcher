import { useTheme } from "@mui/material/styles";

/**
 * FuelGaugeMini — dispatcher (web) icin kucuk dairesel yakit gostergesi.
 *
 * Mobil RN FuelGauge'in web/SVG karsiligi (react-native-svg web'de calismaz).
 * Ayni renk esigi: <=15% error, <=40% warning, else success.
 *
 * @param percent  0-100 doluluk yuzdesi
 * @param size     px cap (default 40)
 * @param liters   opsiyonel; verilirse ortada % yerine litre gosterilmez, sadece tooltip amacli
 */
interface FuelGaugeMiniProps {
  percent: number;
  size?: number;
}

function FuelGaugeMini({ percent, size = 40 }: FuelGaugeMiniProps): JSX.Element {
  const theme = useTheme();

  const pct = Math.max(0, Math.min(100, Number(percent) || 0));

  // renk esigi (mobil ile birebir)
  const color =
    pct <= 15
      ? theme.palette.error.main
      : pct <= 40
      ? theme.palette.warning.main
      : theme.palette.success.main;

  const stroke = Math.max(3, size * 0.1);
  const radius = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct / 100);

  const track = theme.palette.grey[300];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* arka halka */}
      <circle cx={cx} cy={cy} r={radius} fill="none" stroke={track} strokeWidth={stroke} />
      {/* doluluk yayi (12 o'clock'tan baslasin diye -90 derece dondur) */}
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      {/* ortadaki yuzde */}
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={size * 0.26}
        fontWeight="700"
        fill={color}
      >
        {Math.round(pct)}
      </text>
    </svg>
  );
}

export default FuelGaugeMini;
