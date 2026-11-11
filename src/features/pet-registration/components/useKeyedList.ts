import { useRef, useState } from "react";

/**
 * Stable keys for a list of repeatable form blocks (guardians, phone numbers),
 * starting with one. The keys never change position meaning, so removing an
 * item doesn't hand its state to the one after it.
 */
export function useKeyedList() {
  const [keys, setKeys] = useState<number[]>([0]);
  const nextKey = useRef(1);

  const add = () => {
    const key = nextKey.current++;
    setKeys((current) => [...current, key]);
  };
  const remove = (index: number) => {
    setKeys((current) => current.filter((_, i) => i !== index));
  };

  return { keys, add, remove };
}
