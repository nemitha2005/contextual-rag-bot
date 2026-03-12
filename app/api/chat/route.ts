import { anthropic } from "@ai-sdk/anthropic";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateText,
  stepCountIs,
  streamText,
  tool,
} from "ai";
import { FieldValue } from "firebase-admin/firestore";
import type { NextRequest } from "next/server";
import { z } from "zod/v4";
import { adminDb } from "@/lib/firebase/admin";
import { getCurrentUserId } from "@/lib/firebase/server-auth";
import { chatModels, DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import type { ChatMessage } from "@/lib/types";
import { generateUUID } from "@/lib/utils";

// generateUUID kept for potential future use
void generateUUID;

function extractText(parts: ChatMessage["parts"]): string {
  return parts
    .filter((p) => p.type === "text")
    .map((p) => (p as { type: "text"; text: string }).text)
    .join("");
}

const SYSTEM_PROMPT_WITH_TOOLS = `You are a helpful AI assistant. Answer clearly and concisely.

You have a canvas panel tool called \`createDocument\`. Use it ONLY for substantial standalone content the user would save as a file:
- A full HTML page (not a tiny snippet)
- A complete script or program (20+ lines)
- A full essay, report, or long-form document
- A CSV spreadsheet with real data

Do NOT use the canvas for:
- Short code snippets (under ~20 lines) — write those as normal code blocks in chat
- Explanations, answers, or conversation
- Quick examples, one-liners, or demonstrations

CRITICAL rules:
- Call \`createDocument\` EXACTLY ONCE per response — never twice
- After calling \`createDocument\` or \`updateDocument\`, your ONLY text response must be a brief one-sentence confirmation like "Here's your login page." NEVER write the document content in the chat — the tool handles all content generation
- Do NOT write any text like "Now I'll write..." or "Here's the essay:" followed by the actual content — the tool already generated it
- If the user asks for a web page, HTML page, or any front-end UI — the kind MUST be "code" and you must write actual HTML/CSS/JS, not Python or any other language that generates HTML
- The title should describe the content (e.g. "Login Page", "Snake Game", "Sales Report")

When the user asks to modify existing canvas content, use \`updateDocument\`.`;

function stripMarkdownFences(code: string): string {
  return code.replace(/^```[\w]*\n?/, "").replace(/\n?```\s*$/, "");
}

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return Response.json({ code: "unauthorized:chat" }, { status: 401 });
  }

  const body = await request.json();
  const {
    id,
    message,
    messages: overrideMessages,
    selectedChatModel: rawModel,
    thinkingEnabled = false,
  } = body as {
    id: string;
    message?: ChatMessage;
    messages?: ChatMessage[];
    selectedChatModel: string;
    thinkingEnabled?: boolean;
  };

  const validModelIds = new Set(chatModels.map((m) => m.id));
  const selectedChatModel = validModelIds.has(rawModel)
    ? rawModel
    : DEFAULT_CHAT_MODEL;

  let conversationMessages: ChatMessage[];

  if (overrideMessages) {
    conversationMessages = overrideMessages;
  } else {
    const historySnap = await adminDb
      .collection("messages")
      .where("chatId", "==", id)
      .orderBy("createdAt", "asc")
      .get();

    const history = historySnap.docs.map((doc) => doc.data() as ChatMessage);
    conversationMessages = message ? [...history, message] : history;
  }

  const chatRef = adminDb.collection("chats").doc(id);
  const chatDoc = await chatRef.get();

  if (!chatDoc.exists) {
    const firstUserMsg = conversationMessages.find((m) => m.role === "user");
    const userText = firstUserMsg ? extractText(firstUserMsg.parts) : "";

    let title = "New Chat";
    if (userText) {
      const { text } = await generateText({
        model: anthropic("claude-haiku-4-5"),
        prompt: `Generate a short 4-6 word title for a chat that starts with this message. Reply with only the title, no quotes or punctuation:\n\n${userText.slice(0, 500)}`,
      });
      title = text.trim().slice(0, 60);
    }

    await chatRef.set({
      id,
      userId,
      title,
      visibility: "private",
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const selectedModel = chatModels.find((m) => m.id === selectedChatModel);
      const useThinking = thinkingEnabled && (selectedModel?.supportsThinking ?? false);

      let documentCreated = false;

      const result = streamText({
        model: anthropic(selectedChatModel),
        messages: await convertToModelMessages(conversationMessages),
        system: SYSTEM_PROMPT_WITH_TOOLS,
        stopWhen: stepCountIs(2),
        prepareStep: ({ stepNumber }) => {
          if (stepNumber > 0) {
            return { toolChoice: "none" as const };
          }
          return {};
        },
        ...(useThinking && {
          providerOptions: {
            anthropic: {
              thinking: { type: "enabled", budgetTokens: 50000 },
            },
          },
        }),
        tools: {
          getWeather: tool({
            description: "Get the current weather for a city",
            inputSchema: z.object({
              city: z.string().describe("The city name"),
            }),
            execute: async ({ city }) => {
              try {
                const geoRes = await fetch(
                  `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`
                );
                const geoData = (await geoRes.json()) as {
                  results?: Array<{
                    name: string;
                    country: string;
                    latitude: number;
                    longitude: number;
                  }>;
                };
                const loc = geoData.results?.[0];
                if (!loc) return { error: `City not found: ${city}` };

                const weatherRes = await fetch(
                  `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,weathercode,windspeed_10m&temperature_unit=celsius`
                );
                const weatherData = (await weatherRes.json()) as {
                  current: {
                    temperature_2m: number;
                    weathercode: number;
                    windspeed_10m: number;
                  };
                };

                return {
                  city: loc.name,
                  country: loc.country,
                  temperature: weatherData.current.temperature_2m,
                  unit: "°C",
                  windspeed: weatherData.current.windspeed_10m,
                };
              } catch {
                return { error: "Failed to fetch weather data" };
              }
            },
          }),
          createDocument: tool({
            description:
              "Create a document in the artifact canvas. Use for full code files, HTML pages, essays, detailed reports, and CSV spreadsheets. Do NOT use for short snippets or conversational answers. NEVER call this more than once per response.",
            inputSchema: z.object({
              title: z.string().describe("Short descriptive title for the document"),
              kind: z
                .enum(["text", "code", "sheet"])
                .describe("Content type: text for prose/markdown, code for any programming language or HTML/CSS/JS, sheet for CSV data"),
            }),
            execute: async ({ title, kind }) => {
              if (documentCreated) {
                return { error: "Document already created in this response" };
              }
              documentCreated = true;

              const docId = generateUUID();

              writer.write({ type: "data-id", data: docId });
              writer.write({ type: "data-title", data: title });
              writer.write({ type: "data-kind", data: kind });
              writer.write({ type: "data-clear", data: null });

              const userRequest = conversationMessages
                .filter((m) => m.role === "user")
                .map((m) => extractText(m.parts))
                .pop() ?? title;

              const systemPromptForKind = {
                text: `You are a document writer. The user asked: "${userRequest}"\n\nWrite a well-structured, comprehensive markdown document with headings, lists, and formatting. Output the document directly with no preamble.`,
                code: `You are a code generator. The user wants: "${userRequest}"\n\nWrite the ACTUAL code they are asking for. If they want an HTML page, write HTML/CSS/JS. If they want a Python script, write Python. Match the language to what makes sense for the request.\n\nOutput ONLY raw source code. No markdown fences (\`\`\`). No explanations. No text before or after the code. Just the code itself.`,
                sheet: `You are a data generator. The user wants: "${userRequest}"\n\nWrite a well-structured CSV with a header row and relevant data. Output only the raw CSV.`,
              }[kind];

              const deltaType = {
                text: "data-textDelta",
                code: "data-codeDelta",
                sheet: "data-sheetDelta",
              }[kind] as "data-textDelta" | "data-codeDelta" | "data-sheetDelta";

              let content = "";

              try {
                const innerResult = streamText({
                  model: anthropic(selectedChatModel),
                  system: systemPromptForKind,
                  prompt: `Create: ${title}`,
                });

                for await (const text of innerResult.textStream) {
                  content += text;
                  writer.write({ type: deltaType, data: text });
                }

                console.log(`[createDocument] kind=${kind} streamText produced ${content.length} chars`);
              } catch (e) {
                console.error("[createDocument] Inner streamText error:", e);

                try {
                  const fallback = await generateText({
                    model: anthropic(selectedChatModel),
                    system: systemPromptForKind,
                    prompt: `Create: ${title}`,
                  });
                  content = fallback.text;
                  console.log(`[createDocument] fallback generateText produced ${content.length} chars`);
                  writer.write({ type: deltaType, data: content });
                } catch (e2) {
                  console.error("[createDocument] Fallback generateText also failed:", e2);
                }
              }

              content = stripMarkdownFences(content.trim());

              const docRef = adminDb.collection("documents").doc(docId);
              await docRef.set({
                title,
                kind,
                userId,
                chatId: id,
                createdAt: FieldValue.serverTimestamp(),
              });
              await docRef.collection("versions").add({
                content,
                title,
                createdAt: FieldValue.serverTimestamp(),
              });

              writer.write({ type: "data-finish", data: null });

              return { id: docId, title, kind, status: "success", message: "Content generated and displayed in canvas. Do NOT repeat it." };
            },
          }),
          updateDocument: tool({
            description:
              "Update or rewrite the content of a document already open in the canvas. Use when the user asks to modify, fix, or extend existing canvas content.",
            inputSchema: z.object({
              id: z.string().describe("The document ID to update"),
              description: z.string().describe("What changes to make"),
            }),
            execute: async ({ id, description }) => {
              const docRef = adminDb.collection("documents").doc(id);
              const docMeta = await docRef.get();
              if (!docMeta.exists) return { error: "Document not found" };

              const { title, kind } = docMeta.data() as { title: string; kind: string };
              const versionsSnap = await docRef
                .collection("versions")
                .orderBy("createdAt", "desc")
                .limit(1)
                .get();
              const currentContent = versionsSnap.docs[0]?.data()?.content ?? "";

              writer.write({ type: "data-id", data: id });
              writer.write({ type: "data-title", data: title });
              writer.write({ type: "data-kind", data: kind });
              writer.write({ type: "data-clear", data: null });

              const k = kind as "text" | "code" | "sheet";

              const systemPromptForKind = {
                text: `You are updating a markdown document. Here is the current content:\n\n${currentContent}\n\nApply the requested changes and output the complete updated document.`,
                code: `You are updating code. Here is the current code:\n\n${currentContent}\n\nApply the requested changes and output the complete updated code only — no markdown fences, no explanations.`,
                sheet: `You are updating a CSV spreadsheet. Here is the current data:\n\n${currentContent}\n\nApply the requested changes and output the complete updated CSV only.`,
              }[k];

              const deltaType = {
                text: "data-textDelta",
                code: "data-codeDelta",
                sheet: "data-sheetDelta",
              }[k] as "data-textDelta" | "data-codeDelta" | "data-sheetDelta";

              const innerResult = streamText({
                model: anthropic(selectedChatModel),
                system: systemPromptForKind,
                prompt: description,
              });

              let content = "";
              for await (const chunk of innerResult.fullStream) {
                if (chunk.type === "text-delta") {
                  content += chunk.text;
                  writer.write({ type: deltaType, data: chunk.text });
                }
              }

              content = stripMarkdownFences(content.trim());

              await docRef.collection("versions").add({
                content,
                title,
                createdAt: FieldValue.serverTimestamp(),
              });

              writer.write({ type: "data-finish", data: null });

              return { id, title, kind };
            },
          }),
        },
        onFinish: async ({ text, reasoning, steps }) => {
          if (message) {
            await adminDb.collection("messages").doc(message.id).set({
              id: message.id,
              chatId: id,
              role: message.role,
              parts: message.parts,
              attachments: [],
              createdAt: FieldValue.serverTimestamp(),
            });
          }

          const assistantId = crypto.randomUUID();
          const parts: Array<Record<string, unknown>> = [];

          const reasoningText = reasoning
            ?.filter((r) => r.type === "reasoning")
            .map((r) => r.text)
            .join("");

          if (reasoningText) {
            parts.push({ type: "reasoning", text: reasoningText });
          }

          for (const step of steps) {
            for (const tc of step.toolCalls) {
              const tr = step.toolResults.find(
                (r: { toolCallId: string }) => r.toolCallId === tc.toolCallId
              );
              parts.push({
                type: `tool-${tc.toolName}`,
                toolCallId: tc.toolCallId,
                toolName: tc.toolName,
                input: tc.input,
                state: "output-available",
                output: tr?.output ?? null,
              });
            }
          }

          if (text) {
            parts.push({ type: "text", text });
          }

          if (parts.length > 0) {
            await adminDb.collection("messages").doc(assistantId).set({
              id: assistantId,
              chatId: id,
              role: "assistant",
              parts,
              attachments: [],
              createdAt: FieldValue.serverTimestamp(),
            });
          }
        },
      });

      writer.merge(result.toUIMessageStream());
    },
    onError: (error) => {
      console.error("Stream error:", error);
      return error instanceof Error ? error.message : "An error occurred";
    },
  });

  return createUIMessageStreamResponse({ stream });
}

export async function DELETE(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return Response.json({ code: "unauthorized:chat" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get("id");

  if (!chatId) {
    return Response.json({ code: "bad_request:chat" }, { status: 400 });
  }

  const chatRef = adminDb.collection("chats").doc(chatId);
  const chatDoc = await chatRef.get();

  if (!chatDoc.exists || chatDoc.data()?.userId !== userId) {
    return Response.json({ code: "forbidden:chat" }, { status: 403 });
  }

  const messagesSnap = await adminDb
    .collection("messages")
    .where("chatId", "==", chatId)
    .get();

  const batch = adminDb.batch();
  for (const doc of messagesSnap.docs) {
    batch.delete(doc.ref);
  }
  batch.delete(chatRef);
  await batch.commit();

  const docsSnap = await adminDb
    .collection("documents")
    .where("chatId", "==", chatId)
    .get();

  for (const docSnapshot of docsSnap.docs) {
    const versionsSnap = await docSnapshot.ref.collection("versions").get();
    const docBatch = adminDb.batch();
    for (const versionDoc of versionsSnap.docs) {
      docBatch.delete(versionDoc.ref);
    }
    docBatch.delete(docSnapshot.ref);
    await docBatch.commit();
  }

  return Response.json({ success: true });
}


