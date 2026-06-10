// Sets the browser tab title to "<children> - Triage". React 19 hoists this <title> into <head> from anywhere in the tree.
// Rendering the title (rather than setting `document.title` in an effect) keeps it reconciliation-safe — Next's metadata commit can't clobber it — and it's server-rendered, so there's no first-paint flash.
export function PageTitle({ children }: { children: string }) {
  return <title>{`${children} - Triage`}</title>;
}
