import { useEffect, useState, type DependencyList } from 'react';

/**
 * Async-derived value tied to a dependency list.
 *
 * `dispose` releases a produced value when it is replaced, unmounted, or
 * arrives after its generation was superseded (e.g. `(bitmap) => bitmap.close()`).
 * Each effect run only ever disposes the value IT produced — never a newer
 * generation's. A rejected `asyncFn` resolves the value to null instead of
 * leaking an unhandled rejection.
 */
export function useAsyncMemo<T>(
  asyncFn: () => Promise<T>,
  dependencies: DependencyList,
  dispose?: (value: T) => void,
): T | null {
  const [value, setValue] = useState<T | null>(null);

  useEffect(() => {
    let current = true;
    let produced: T | null = null;

    asyncFn()
      .then((result) => {
        produced = result;
        if (current) {
          setValue(result);
        } else if (result) {
          // Resolved after this generation was replaced/unmounted.
          dispose?.(result);
          produced = null;
        }
      })
      .catch(() => {
        if (current) setValue(null);
      });

    return () => {
      current = false;
      if (produced) {
        dispose?.(produced);
        produced = null;
      }
      setValue(null);
    };
  }, dependencies);

  return value;
}
