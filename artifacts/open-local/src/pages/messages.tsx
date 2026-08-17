import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { MessageCircle, Send, ArrowLeft, Store } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { useUser } from "@/context/UserContext";
import Avatar from "@/components/Avatar";
import { useTranslation } from "react-i18next";

const API = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

function getToken() {
  return localStorage.getItem("ol_session");
}

function authHeaders(): Record<string, string> {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

type ConvSummary = {
  id: number;
  shopperUserId: number;
  vendorId: number;
  updatedAt: string;
  unreadCount: number;
  lastMessage: { body: string; createdAt: string; senderUserId: number } | null;
  shopper: { id: number; username: string } | null;
  vendor: { id: number; name: string; imageUrl: string; slug: string } | null;
};

type Msg = {
  id: number;
  conversationId: number;
  senderUserId: number;
  body: string;
  createdAt: string;
  readAt: string | null;
};

type ConvDetail = {
  conversation: { id: number; shopperUserId: number; vendorId: number };
  shopper: { id: number; username: string; avatarSeed: string; avatarStyle: string } | null;
  vendor: { id: number; name: string; imageUrl: string; slug: string } | null;
  messages: Msg[];
};

export default function Messages() {
  const { t } = useTranslation();
  const { user } = useUser();
  const [convs, setConvs] = useState<ConvSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ConvDetail | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t("messages.justNow");
    if (mins < 60) return t("messages.minutesAgo", { n: mins });
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return t("messages.hoursAgo", { n: hrs });
    return t("messages.daysAgo", { n: Math.floor(hrs / 24) });
  }

  // Load conversation list
  useEffect(() => {
    if (!user) return;
    fetch(`${API}/api/messages/conversations`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((data) => { setConvs(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user]);

  // Load conversation detail when activeId changes
  useEffect(() => {
    if (activeId === null) { setDetail(null); return; }
    fetch(`${API}/api/messages/conversations/${activeId}`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((data) => {
        setDetail(data);
        // Mark as read
        fetch(`${API}/api/messages/conversations/${activeId}/read`, {
          method: "PATCH",
          headers: authHeaders(),
        }).then(() => {
          setConvs((prev) =>
            prev.map((c) => (c.id === activeId ? { ...c, unreadCount: 0 } : c)),
          );
        });
      });
  }, [activeId]);

  // Scroll to bottom when messages load / new message arrives
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [detail?.messages.length]);

  const sendMessage = async () => {
    if (!draft.trim() || !activeId) return;
    setSending(true);
    const res = await fetch(`${API}/api/messages/conversations/${activeId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ body: draft.trim() }),
    });
    if (res.ok) {
      const msg: Msg = await res.json();
      setDetail((prev) => prev ? { ...prev, messages: [...prev.messages, msg] } : prev);
      setConvs((prev) =>
        prev.map((c) =>
          c.id === activeId
            ? { ...c, lastMessage: { body: msg.body, createdAt: msg.createdAt, senderUserId: msg.senderUserId }, updatedAt: msg.createdAt }
            : c,
        ),
      );
      setDraft("");
    }
    setSending(false);
  };

  if (!user) {
    return (
      <Layout>
        <div className="container max-w-lg mx-auto px-4 py-24 text-center">
          <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-serif font-bold mb-2">{t("messages.signInTitle")}</h2>
          <p className="text-muted-foreground">{t("messages.signInDescription")}</p>
        </div>
      </Layout>
    );
  }

  const otherName = (conv: ConvSummary) =>
    user.id === conv.shopperUserId ? conv.vendor?.name ?? "Vendor" : `@${conv.shopper?.username ?? "user"}`;

  const otherImage = (conv: ConvSummary) =>
    user.id === conv.shopperUserId ? conv.vendor?.imageUrl : null;

  return (
    <Layout>
      <div className="container max-w-5xl mx-auto px-0 md:px-4 py-0 md:py-8">
        <div className="flex h-[calc(100vh-5rem)] md:h-[75vh] border border-border rounded-none md:rounded-2xl overflow-hidden bg-background shadow-sm">

          {/* Left panel — conversation list */}
          <div className={`w-full md:w-80 flex-shrink-0 border-r border-border flex flex-col ${activeId !== null ? "hidden md:flex" : "flex"}`}>
            <div className="px-5 py-4 border-b border-border">
              <h1 className="text-xl font-serif font-bold">{t("messages.title")}</h1>
              <p className="text-xs text-muted-foreground mt-0.5">{t("messages.conversations")}</p>
            </div>
            {loading ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">{t("common.loading")}</div>
            ) : convs.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center text-muted-foreground">
                <MessageCircle className="w-10 h-10 opacity-30" />
                <p className="text-sm">{t("messages.noConversations")}</p>
              </div>
            ) : (
              <ul className="flex-1 overflow-y-auto divide-y divide-border">
                {convs.map((conv) => (
                  <li key={conv.id}>
                    <button
                      onClick={() => setActiveId(conv.id)}
                      className={`w-full px-4 py-4 flex items-start gap-3 text-left hover:bg-secondary/50 transition-colors ${activeId === conv.id ? "bg-secondary" : ""}`}
                    >
                      <div className="relative shrink-0">
                        {otherImage(conv) ? (
                          <img src={otherImage(conv)!} className="w-10 h-10 rounded-full object-cover border border-border" alt="" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Store className="w-5 h-5 text-primary" />
                          </div>
                        )}
                        {conv.unreadCount > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                            {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span className={`text-sm font-semibold truncate ${conv.unreadCount > 0 ? "text-foreground" : "text-foreground/80"}`}>
                            {otherName(conv)}
                          </span>
                          {conv.lastMessage && (
                            <span className="text-[11px] text-muted-foreground shrink-0">{timeAgo(conv.lastMessage.createdAt)}</span>
                          )}
                        </div>
                        {conv.lastMessage ? (
                          <p className={`text-xs truncate ${conv.unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                            {conv.lastMessage.senderUserId === user.id ? t("messages.you") : ""}
                            {conv.lastMessage.body}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">{t("messages.noMessages")}</p>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Right panel — message thread */}
          <div className={`flex-1 flex flex-col ${activeId === null ? "hidden md:flex" : "flex"}`}>
            {detail === null ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <MessageCircle className="w-12 h-12 opacity-20" />
                <p className="text-sm">{t("messages.selectConversation")}</p>
              </div>
            ) : (
              <>
                {/* Thread header */}
                <div className="px-4 py-3 border-b border-border flex items-center gap-3">
                  <button
                    onClick={() => setActiveId(null)}
                    className="md:hidden p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  {detail.vendor?.imageUrl ? (
                    <img src={detail.vendor.imageUrl} className="w-9 h-9 rounded-full object-cover border border-border" alt="" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Store className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    {user.id === detail.conversation.shopperUserId ? (
                      <>
                        <p className="font-semibold text-sm truncate">{detail.vendor?.name}</p>
                        {detail.vendor?.slug && (
                          <Link href={`/vendors/${detail.conversation.vendorId}`} className="text-xs text-primary hover:underline">
                            {t("messages.viewVendorPage")}
                          </Link>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="font-semibold text-sm">@{detail.shopper?.username}</p>
                        <p className="text-xs text-muted-foreground">{t("messages.roleShopper")}</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                  {detail.messages.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-8">
                      {t("messages.sayHello")}
                    </p>
                  )}
                  {detail.messages.map((msg) => {
                    const mine = msg.senderUserId === user.id;
                    return (
                      <div key={msg.id} className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}>
                        {!mine && detail.shopper && user.id !== detail.conversation.shopperUserId ? (
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <Store className="w-3.5 h-3.5 text-primary" />
                          </div>
                        ) : !mine ? (
                          <Avatar
                            seed={detail.shopper?.avatarSeed ?? "default"}
                            style={(detail.shopper?.avatarStyle ?? "adventurer") as any}
                            size={28}
                          />
                        ) : null}
                        <div className={`max-w-[72%] ${mine ? "items-end" : "items-start"} flex flex-col gap-1`}>
                          <div
                            className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                              mine
                                ? "bg-primary text-primary-foreground rounded-br-sm"
                                : "bg-secondary text-foreground rounded-bl-sm"
                            }`}
                          >
                            {msg.body}
                          </div>
                          <span className="text-[10px] text-muted-foreground px-1">{timeAgo(msg.createdAt)}</span>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>

                {/* Compose */}
                <div className="px-4 py-3 border-t border-border">
                  <form
                    onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
                    className="flex items-end gap-2"
                  >
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
                      }}
                      placeholder={t("messages.messagePlaceholder")}
                      rows={1}
                      className="flex-1 resize-none rounded-xl border border-border bg-secondary/30 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:bg-background placeholder:text-muted-foreground max-h-32 overflow-y-auto"
                      style={{ minHeight: "42px" }}
                    />
                    <button
                      type="submit"
                      disabled={!draft.trim() || sending}
                      className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                  <p className="text-[10px] text-muted-foreground mt-1.5 px-1">{t("messages.pressEnter")}</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
