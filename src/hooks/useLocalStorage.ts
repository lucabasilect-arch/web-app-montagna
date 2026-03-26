import { useEffect, useState } from "react";

type Serializer<T> = {
  parse: (value: string) => T;
  stringify: (value: T) => string;
};

const defaultSerializer: Serializer<unknown> = {
  parse: (value) => JSON.parse(value),
  stringify: (value) => JSON.stringify(value),
};

export const useLocalStorage = <T,>(
  key: string,
  initialValue: T,
  serializer: Serializer<T> = defaultSerializer as Serializer<T>
) => {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }
    const stored = window.localStorage.getItem(key);
    if (!stored) {
      return initialValue;
    }
    try {
      return serializer.parse(stored);
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(key, serializer.stringify(value));
  }, [key, serializer, value]);

  return [value, setValue] as const;
};
