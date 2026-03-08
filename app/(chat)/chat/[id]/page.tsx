export const dynamic = "force-dynamic";

import { cookies } from "next/headers";
import { Suspense } from "react";

import { Chat } from "@/components/chat";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { adminDb } from "@/lib/firebase/admin";
import { getCurrentUserId } from "@/lib/firebase/server-auth";
import { convertToUIMessages } from "@/lib/utils";
import type { DBMessage } from "@/lib/db/schema";

export default function Page(props: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="flex h-dvh" />}>
      <ChatPage params={props.params} />
    </Suspense>
  );
}

async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const cookieStore = await cookies();
  const chatModelFromCookie = cookieStore.get("chat-model");

  const userId = await getCurrentUserId();

  let initialMessages: ReturnType<typeof convertToUIMessages> = [];

  if (userId) {
    const snap = await adminDb
      .collection("messages")
      .where("chatId", "==", id)
      .orderBy("createdAt", "asc")
      .get();

    const dbMessages: DBMessage[] = snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: data.id,
        chatId: data.chatId,
        role: data.role,
        parts: data.parts,
        attachments: data.attachments,
        createdAt: data.createdAt?.toDate() ?? new Date(),
      };
    });

    initialMessages = convertToUIMessages(dbMessages);
  }

  return (
    <>
      <Chat
        autoResume={false}
        id={id}
        initialChatModel={chatModelFromCookie?.value ?? DEFAULT_CHAT_MODEL}
        initialMessages={initialMessages}
        isReadonly={false}
        key={id}
      />
      <DataStreamHandler />
    </>
  );
}
