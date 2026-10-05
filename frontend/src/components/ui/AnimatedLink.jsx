// Adapted from Skiper UI Link000 (skiper40), author @gurvinder-singh02.
// Free-version attribution is displayed in the workspace footer.
import { cn } from "../../lib/cn";
export default function AnimatedLink({ href, children, className, ...props }) {
  return (
    <a href={href} className={cn("skiper-animated-link", className)} {...props}>
      {children}
    </a>
  );
}
