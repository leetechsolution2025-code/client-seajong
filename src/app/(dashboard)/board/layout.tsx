import { BoardAIAssistant } from "@/components/board/BoardAIAssistant";

export default function BoardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <BoardAIAssistant />
    </>
  );
}
