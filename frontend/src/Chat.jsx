
import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import "./Chat.css";
import { API_URL } from "./api";

function Chat() {
    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [newMessage, setNewMessage] = useState("");
    const [sending, setSending] = useState(false);

    const handleSelectConversation = async (conversation) => {
        setSelectedConversation(conversation);
        setMessages([]);

        try {
            const { data: { session }, error } =
                await supabase.auth.getSession();

            if (error) throw error;

            const response = await fetch(
                `${API_URL}/conversations/${conversation.conversation_id}/messages`,
                {
                    headers: {
                        Authorization: `Bearer ${session.access_token}`,
                    },
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to fetch messages.");
            }

            setMessages(data.messages);

        } catch (error) {
            console.error("Error fetching messages:", error);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();

        if (!newMessage.trim() || !selectedConversation || sending) {
            return;
        }

        try {
            setSending(true);

            const { data: { session }, error } =
                await supabase.auth.getSession();

            if (error) throw error;

            if (!session) {
                throw new Error("Please log in to send messages.");
            }

            const response = await fetch(
                `${API_URL}/conversations/${selectedConversation.conversation_id}/messages`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify({
                        message_text: newMessage.trim(),
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to send message.");
            }

            setMessages((previousMessages) => [
                ...previousMessages,
                data.sentMessage,
            ]);

            setNewMessage("");

        } catch (error) {
            console.error("Error sending message:", error);
            alert(error.message);
        } finally {
            setSending(false);
        }
    };

    useEffect(() => {
        const fetchConversations = async () => {
            try {
                const { data: { session }, error } =
                    await supabase.auth.getSession();

                if (error) throw error;

                if (!session) {
                    setConversations([]);
                    setCurrentUserId(null);
                    return;
                }

                setCurrentUserId(session.user.id);

                const response = await fetch(
                    `${API_URL}/conversations`,
                    {
                        headers: {
                            Authorization: `Bearer ${session.access_token}`,
                        },
                    }
                );

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || "Failed to fetch conversations.");
                }

                setConversations(data.conversations);

            } catch (error) {
                console.error("Error fetching conversations:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchConversations();
    }, []);

    useEffect(() => {
        if (!selectedConversation) return;

        let isActive = true;
        let channel;

        const setupRealtimeSubscription = async () => {
            try {
                const {
                    data: { session },
                    error,
                } = await supabase.auth.getSession();

                if (error) throw error;
                if (!session) return;
                console.log("Realtime user ID:", session.user.id);
                await supabase.realtime.setAuth(session.access_token);

                channel = supabase
                    .channel(`conversation-${selectedConversation.conversation_id}`)
                    .on(
                        "postgres_changes",
                        {
                            event: "INSERT",
                            schema: "public",
                            table: "messages",
                            filter: `conversation_id=eq.${selectedConversation.conversation_id}`,
                        },
                        async () => {
                            console.log("REALTIME EVENT RECEIVED");

                            if (!isActive) return;

                            try {
                                const response = await fetch(
                                    `${API_URL}/conversations/${selectedConversation.conversation_id}/messages`,
                                    {
                                        headers: {
                                            Authorization: `Bearer ${session.access_token}`,
                                        },
                                    }
                                );

                                const data = await response.json();

                                if (!response.ok) {
                                    throw new Error(
                                        data.error || "Failed to refresh messages."
                                    );
                                }

                                if (isActive) {
                                    setMessages(data.messages);
                                }
                            } catch (error) {
                                console.error("Error refreshing messages:", error);
                            }
                        }
                    )
                    .subscribe((status) => {
                        console.log("Realtime subscription status:", status);
                    });

            } catch (error) {
                console.error("Realtime subscription error:", error);
            }
        };

        setupRealtimeSubscription();

        return () => {
            isActive = false;

            if (channel) {
                supabase.removeChannel(channel);
            }
        };
    }, [selectedConversation]);

    return (
        <div className="chat-screen">
            <div className="chat-page">
                <aside className="chat-sidebar">
                    <h2>Messages</h2>
                    <div className="conversation-list">
                        {loading ? (
                            <p>Loading conversations...</p>
                        ) : conversations.length === 0 ? (
                            <p>No conversations yet.</p>
                        ) : (
                            conversations.map((conversation) => (
                                <div
                                    key={conversation.conversation_id}
                                    className="conversation-item"
                                    onClick={() => handleSelectConversation(conversation)}
                                >
                                    <h3>{conversation.other_user_name}</h3>
                                    <p>{conversation.listing_title}</p>
                                </div>
                            ))
                        )}
                    </div>
                </aside>

                <main className="chat-main">
                    {selectedConversation ? (
                        <>
                            <header className="chat-header">
                                <h2>{selectedConversation.other_user_name}</h2>
                                <p>{selectedConversation.listing_title}</p>
                            </header>

                            <div className="messages-container">

                                {messages.map((message) => (
                                    <div
                                        key={message.id}
                                        className={`message ${message.sender_supabase_user_id === currentUserId
                                            ? "sent"
                                            : "received"
                                            }`}
                                    >
                                        <span className="message-sender">
                                            {message.sender_name || "User"}
                                        </span>

                                        <p>{message.message_text}</p>

                                        <span className="message-time">
                                            {new Date(message.created_at).toLocaleTimeString("en-IN", {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <form className="message-form" onSubmit={handleSendMessage}>
                                <input
                                    type="text"
                                    placeholder="Type your message..."
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    disabled={sending}
                                />

                                <button type="submit" disabled={sending || !newMessage.trim()}>
                                    {sending ? "Sending..." : "Send"}
                                </button>
                            </form>

                        </>
                    ) : (
                        <div className="chat-empty">
                            <h2>Your messages</h2>
                            <p>Select a conversation to start chatting.</p>
                        </div>
                    )}
                </main>
            </div>

            <div className="chat-safety-note">
                <span className="safety-title">
                    🛡️ UNILOOP SAFETY TIP
                </span>

                <p>
                    Keep your conversations safe and respectful.
                </p>

                <span className="safety-description">
                    Never share passwords, OTPs or sensitive personal information
                    with other users.
                </span>
            </div>
        </div>
    );
}

export default Chat;
