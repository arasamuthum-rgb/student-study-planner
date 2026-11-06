import { useEffect, useState } from 'react';
export function useMediaQuery(query: string): boolean {
  const [m, setM] = useState(() => typeof matchMedia !== 'undefined' && matchMedia(query).matches);
  useEffect(() => { const mq = matchMedia(query); const h = () => setM(mq.matches); h(); mq.addEventListener('change', h); return () => mq.removeEventListener('change', h); }, [query]);
  return m;
}
