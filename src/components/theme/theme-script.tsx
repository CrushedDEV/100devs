import { STORAGE_KEY } from "./constants";

/**
 * Applies the persisted theme before the first paint.
 *
 * Rendered from the **server** root layout on purpose: a `<script>` created
 * during a client-side render is never executed by React, so keeping it out of
 * any client component avoids both the warning and a useless DOM node.
 */
export function ThemeScript() {
  const script = `(function(){try{var s=localStorage.getItem('${STORAGE_KEY}');var m=window.matchMedia('(prefers-color-scheme: dark)').matches;var d=s==='dark'||((!s||s==='system')&&m);var e=document.documentElement;e.classList.toggle('dark',d);e.style.colorScheme=d?'dark':'light';}catch(e){}})();`;

  return (
    <script
      // The value is a compile-time constant, never user input.
      dangerouslySetInnerHTML={{ __html: script }}
      suppressHydrationWarning
    />
  );
}
