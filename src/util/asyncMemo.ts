import { useEffect, useState, type DependencyList } from 'react';

export function useAsyncMemo<T>(
  asyncFn: () => Promise<T>,
  dependencies: DependencyList,
): T | null {
  const [value, setValue] = useState<T | null>(null);

  useEffect(() => {
    let isCurrent = true;

    asyncFn().then((result) => {
      if (isCurrent) setValue(result);
    });

    return () => {
      isCurrent = false;

      if (value && typeof (value as any).close === 'function') {
        (value as any).close();
      }
    };
  }, dependencies);

  return value;
}
