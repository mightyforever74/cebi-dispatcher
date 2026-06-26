import { useTheme } from "@mui/material/styles";

/**
 * FuelGaugeMini — dispatcher (web) için küçük dairesel yakıt göstergesi.
 *
 * Mobil RN FuelGauge'ın web/SVG karşılığı (react-native-svg web'de çalışmaz).
 * Aynı renk eşiği: <=15% error, <=40% warning, else success.
 *
 * @param percent  0-100 doluluk yüzdesi
 * @param size     px çap (default 40)
 * @param liters   opsiyonel; verilirse ortada % yerine litre gösterilmez, sadece tooltip amaçlı
 */
interface FuelGaugeMiniProps {
  percent: number;
  size?: number;
}

function FuelGaugeMini({ percent, size = 40 }: FuelGaugeMiniProps): JSX.Element {
  const theme = useTheme();

  const pct = Math.max(0, Math.min(100, Number(percent) || 0));

  // renk eşiği (mobil ile birebir)
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
      {/* doluluk yayı (12 o'clock'tan başlasın diye -90 derece döndür) */}
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
      {/* ortadaki yüzde */}
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
