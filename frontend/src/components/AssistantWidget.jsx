import { useContext, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { AppContext } from "../context/AppContext";
import { FiMessageSquare, FiX, FiSend } from "react-icons/fi";
import ReactMarkdown from "react-markdown";

export default function AssistantWidget() {
    const { token, backendUrl } = useContext(AppContext);
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState([
        { from: "bot", text: "Hi! I can help you find a doctor and book a time. I can't give medical advice." },
    ]);
    const [input, setInput] = useState("");
    const [busy, setBusy] = useState(false);
    const [pending, setPending] = useState(null);
    const sessionId = useRef(window.crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)); // new conversation per page load

    if (!token) return null; // patients only

    const send = async () => {
        const text = input.trim();
        if (!text || busy) return;
        setMessages((m) => [...m, { from: "me", text }]);
        setInput("");
        setBusy(true);
        try {
            const { data } = await axios.post(`${backendUrl}/api/user/assistant/chat`,
                { message: text, sessionId: sessionId.current }, { headers: { token } });
            setMessages((m) => [...m, { from: "bot", text: data.success ? data.reply : data.message }]);
            setPending(data.pendingBooking || null);
        } catch {
            setMessages((m) => [...m, { from: "bot", text: "Something went wrong. Please try again." }]);
        } finally {
            setBusy(false);
        }
    };

    const decide = async (action) => {
        const { data } = await axios.post(
            `${backendUrl}/api/user/assistant/bookings/${pending.id}/${action}`, {}, { headers: { token } });
        setPending(null);
        if (action === "confirm") {
            data.success ? toast.success("Appointment booked!") : toast.error(data.message);
            setMessages((m) => [...m, {
                from: "bot", text: data.success
                    ? "Your appointment is booked. You'll get a confirmation email." : data.message
            }]);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            <div className={`transition-all duration-300 origin-bottom-right ${open ? 'scale-100 opacity-100 mb-4' : 'scale-95 opacity-0 pointer-events-none absolute bottom-16'}`}>
                <div className="w-80 h-[28rem] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden">
                    <div className="p-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white flex justify-between items-center shadow-sm">
                        <div className="font-semibold flex items-center gap-2">
                            <FiMessageSquare className="text-xl" /> DocOp Assistant
                        </div>
                        <button onClick={() => setOpen(false)} className="text-blue-100 hover:text-white transition-colors">
                            <FiX className="text-xl" />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 text-sm bg-gray-50/50">
                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}>
                                <div className={`inline-block px-4 py-2.5 rounded-2xl shadow-sm max-w-[85%] text-left ${m.from === "me" ? "bg-blue-600 text-white rounded-br-sm whitespace-pre-wrap" : "bg-white border border-gray-100 text-gray-800 rounded-bl-sm"}`}>
                                    {m.from === "me" ? (
                                        m.text
                                    ) : (
                                        <ReactMarkdown
                                            components={{
                                                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                                ul: ({ children }) => <ul className="list-disc pl-5 space-y-1 mb-2">{children}</ul>,
                                                ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1 mb-2">{children}</ol>,
                                                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                                                a: ({ children }) => <span>{children}</span>,
                                            }}
                                        >
                                            {m.text}
                                        </ReactMarkdown>
                                    )}
                                </div>
                            </div>
                        ))}
                        {busy && (
                            <div className="flex justify-start">
                                <span className="bg-white border border-gray-100 text-gray-400 px-4 py-2.5 rounded-2xl rounded-bl-sm shadow-sm flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></span>
                                </span>
                            </div>
                        )}
                        {pending && (
                            <div className="border border-blue-100 rounded-2xl p-4 bg-blue-50/50 shadow-sm mx-2">
                                <p className="font-semibold text-blue-900 mb-2">Confirm this booking?</p>
                                <div className="space-y-1 text-blue-800">
                                    <p className="flex justify-between"><span>Doctor:</span> <strong>{pending.doctorName}</strong></p>
                                    <p className="flex justify-between"><span>Date:</span> <strong>{pending.date.replaceAll("_", "/")}</strong></p>
                                    <p className="flex justify-between"><span>Time:</span> <strong>{pending.time}</strong></p>
                                    <p className="flex justify-between"><span>Fee:</span> <strong>{pending.fee}</strong></p>
                                </div>
                                <div className="flex gap-2 mt-4">
                                    <button onClick={() => decide("confirm")} className="flex-1 bg-blue-600 hover:bg-blue-700 transition-colors text-white py-2 rounded-xl font-medium">Confirm</button>
                                    <button onClick={() => decide("cancel")} className="flex-1 bg-white border border-gray-200 hover:bg-gray-50 transition-colors text-gray-700 py-2 rounded-xl font-medium">Cancel</button>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="p-3 bg-white border-t">
                        <div className="flex gap-2 items-center bg-gray-50 border rounded-2xl p-1 pr-2 focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-300 transition-all">
                            <input value={input} onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && send()} maxLength={1000}
                                placeholder="e.g. I need a skin doctor tomorrow" className="flex-1 bg-transparent px-3 py-2 text-sm outline-none" />
                            <button onClick={send} disabled={busy || !input.trim()} className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 transition-colors text-white p-2 rounded-xl flex items-center justify-center">
                                <FiSend className="text-lg" />
                            </button>
                        </div>
                    </div>
                    <p className="text-[10px] text-gray-400 px-4 pb-3 pt-1 text-center bg-white">Not medical advice. In an emergency call 1990.</p>
                </div>
            </div>
            <button onClick={() => setOpen(!open)} className={`bg-blue-600 hover:bg-blue-700 transition-all duration-300 text-white rounded-full w-14 h-14 shadow-xl hover:shadow-2xl hover:scale-110 flex items-center justify-center text-2xl ${open ? 'rotate-90 opacity-0 pointer-events-none' : 'rotate-0 opacity-100'}`}>
                <FiMessageSquare />
            </button>
        </div>
    );
}