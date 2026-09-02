export function HeroGraphic() {
  return (
    <svg
      viewBox="0 0 480 440"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full max-w-lg"
      aria-hidden="true"
    >
      {/* connecting lines */}
      <g stroke="#A7F3D0" strokeWidth="2">
        <line x1="240" y1="120" x2="120" y2="220" />
        <line x1="240" y1="120" x2="360" y2="220" />
        <line x1="240" y1="120" x2="240" y2="260" />
        <line x1="120" y1="220" x2="240" y2="260" />
        <line x1="360" y1="220" x2="240" y2="260" />
        <line x1="120" y1="220" x2="90" y2="340" />
        <line x1="360" y1="220" x2="390" y2="340" />
        <line x1="240" y1="260" x2="240" y2="370" />
      </g>

      {/* floating geometric shapes */}
      <rect x="70" y="60" width="36" height="36" rx="8" fill="#ECFDF5" stroke="#10B981" strokeWidth="2" transform="rotate(18 88 78)" />
      <circle cx="410" cy="90" r="22" fill="#10B981" opacity="0.15" />
      <polygon points="420,300 450,340 390,340" fill="#10B981" opacity="0.2" />

      {/* hub nodes */}
      <circle cx="240" cy="120" r="26" fill="#10B981" />
      <circle cx="120" cy="220" r="20" fill="#059669" />
      <circle cx="360" cy="220" r="20" fill="#059669" />
      <circle cx="240" cy="260" r="16" fill="#FFFFFF" stroke="#10B981" strokeWidth="3" />
      <circle cx="90" cy="340" r="14" fill="#A7F3D0" />
      <circle cx="390" cy="340" r="14" fill="#A7F3D0" />
      <circle cx="240" cy="370" r="18" fill="#0F172A" />

      {/* small accent dots */}
      <circle cx="180" cy="80" r="5" fill="#10B981" />
      <circle cx="330" cy="150" r="5" fill="#0F172A" opacity="0.6" />
      <circle cx="150" cy="300" r="5" fill="#10B981" />
    </svg>
  );
}