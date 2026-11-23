/** New record id. Ids are created on the client so retries never create duplicates. */
export function newId(): string {
  return crypto.randomUUID();
}
