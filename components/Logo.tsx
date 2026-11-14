export default function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      aria-hidden="true"
    >
      <rect width="64" height="64" rx="16" fill="#2563eb" />
      <rect x="12" y="12" width="40" height="32" rx="10" fill="#ffffff" />
      <path d="M20 44 L20 54 L32 44 Z" fill="#ffffff" />
      <path
        d="M28 18h8v6h6v8h-6v6h-8v-6h-6v-8h6z"
        fill="#2563eb"
      />
    </svg>
  );
}