/**
 * Where a pet's public page lives. Everything that builds or revalidates that
 * URL goes through here, so renaming the route again is a one-line change.
 */
export const TAG_ROUTE = "/tag";

export const tagPath = (id: string) => `${TAG_ROUTE}/${id}`;
