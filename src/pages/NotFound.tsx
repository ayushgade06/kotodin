import { ButtonLink } from '../components/ui';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-6 py-24 text-center">
      <div className="eyebrow">404</div>
      <h1 className="display mt-2 text-4xl font-medium">This page doesn’t exist.</h1>
      <p className="mt-3 text-muted">The link may be mistyped. If you scanned a filter sticker, the household card lives at a longer address.</p>
      <div className="mt-6 flex justify-center gap-2">
        <ButtonLink to="/" variant="primary">Go home</ButtonLink>
        <ButtonLink to="/program">Open the demo program</ButtonLink>
      </div>
    </div>
  );
}
