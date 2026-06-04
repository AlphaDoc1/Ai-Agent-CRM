import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Talk to AI Assistant — AI CRM Pro",
  description:
    "Speak directly to our AI assistant through your browser. No downloads, no phone calls, no charges. Just tap and talk.",
};

export default function TalkLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
