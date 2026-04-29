/** MediConnect+ brand mark — matches `public/favicon.svg`. */
export function AppLogoMark({
  className = "w-9 h-9",
  title = "MediConnect+",
}: {
  className?: string;
  /** Set empty string for decorative use next to visible text. */
  title?: string;
}) {
  return (
    <img
      src="/favicon.svg"
      alt={title || ""}
      className={`object-contain ${className}`}
      loading="eager"
      decoding="async"
    />
  );
}
