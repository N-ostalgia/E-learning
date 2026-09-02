export function NexusLogo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Three interlocking blades forming a hub — echoes "Nexus" as a connection point */}
      <path
        d="M20 4C20 4 27 9 27 17C27 21 24 24 20 24C16 24 13 21 13 17C13 9 20 4 20 4Z"
        fill="#10B981"
      />
      <path
        d="M20 4C20 4 27 9 27 17C27 21 24 24 20 24C16 24 13 21 13 17C13 9 20 4 20 4Z"
        fill="#10B981"
        opacity="0.65"
        transform="rotate(120 20 20)"
      />
      <path
        d="M20 4C20 4 27 9 27 17C27 21 24 24 20 24C16 24 13 21 13 17C13 9 20 4 20 4Z"
        fill="#10B981"
        opacity="0.35"
        transform="rotate(240 20 20)"
      />
      <circle cx="20" cy="20" r="4.5" fill="#FFFFFF" />
      <circle cx="20" cy="20" r="4.5" fill="none" stroke="#059669" strokeWidth="1" />
    </svg>
  );
}