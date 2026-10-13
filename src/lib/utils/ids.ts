import { customAlphabet } from "nanoid";

import { ALPHABET, HASH_ID_LENGTH } from "./id-format";

export { HASH_ID_LENGTH, HASH_ID_PATTERN, isHashId } from "./id-format";

const generator = customAlphabet(ALPHABET, HASH_ID_LENGTH);

/** Generate a fresh opaque hashId for a pet record. */
export function generateHashId(): string {
  return generator();
}
