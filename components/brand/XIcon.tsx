/**
 * The X mark, drawn rather than imported so it inherits currentColor and
 * matches the monoline weight used elsewhere in the shell.
 */
export function XIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M17.53 3h3.02l-6.6 7.54L21.75 21h-6.07l-4.76-6.22L5.48 21H2.46l7.06-8.07L2.25 3h6.22l4.3 5.69L17.53 3Zm-1.06 16.2h1.67L7.6 4.71H5.81L16.47 19.2Z" />
    </svg>
  );
}
