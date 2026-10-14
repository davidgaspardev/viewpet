import { cache } from "react";

import { PetRepositoryFactory } from "@/lib/repository";

/**
 * `getPetEntry`, memoised for the duration of one request: `generateMetadata`
 * and the page both need the entry, and this makes it one database read
 * instead of two.
 */
export const getPetEntry = cache((hashId: string) =>
  PetRepositoryFactory.getInstance().getPetEntry(hashId),
);
