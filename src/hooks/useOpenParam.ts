import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

/** Lets global search / notifications deep-link to an item: /route?open=<id> calls handler(id) once, then clears the param. */
export function useOpenParam(handler: (id: string) => void): void {
  const [params, setParams] = useSearchParams();
  const id = params.get('open');
  useEffect(() => {
    if (!id) return;
    handler(id);
    const next = new URLSearchParams(params); next.delete('open'); setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
}
