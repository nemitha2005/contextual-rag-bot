import type { UIMessage } from "ai";
import { z } from "zod";
import type { ArtifactKind } from "@/components/artifact";
import type { Suggestion } from "./db/schema";

export type DataPart = { type: "append-message"; message: string };

export const messageMetadataSchema = z.object({
  createdAt: z.string(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

export type ChatTools = {
  getWeather: { input: { city: string }; output: unknown };
  createDocument: { input: { title: string; kind: ArtifactKind }; output: { id: string; title: string; kind: ArtifactKind } };
  updateDocument: { input: { id: string; description: string }; output: { id: string; title: string; kind: ArtifactKind } };
  requestSuggestions: { input: { documentId: string }; output: { suggestions: Suggestion[] } };
};

export type CustomUIDataTypes = {
  textDelta: string;
  imageDelta: string;
  sheetDelta: string;
  codeDelta: string;
  suggestion: Suggestion;
  appendMessage: string;
  id: string;
  title: string;
  kind: ArtifactKind;
  clear: null;
  finish: null;
  "chat-title": string;
};

export type ChatMessage = UIMessage<
  MessageMetadata,
  CustomUIDataTypes,
  ChatTools
>;

export type Attachment = {
  name: string;
  url: string;
  contentType: string;
};
