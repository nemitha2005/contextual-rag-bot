import type { Suggestion } from "@/lib/db/schema";

export async function getSuggestions({
  documentId: _documentId,
}: {
  documentId: string;
}): Promise<Suggestion[]> {
  return [];
}
