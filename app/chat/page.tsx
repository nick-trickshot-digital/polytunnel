'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import { useToast } from '@/components/ui/Toast';

interface Message {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirmClear, setConfirmClear] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const showToast = useToast();

  useEffect(() => {
    fetch('/api/chat/history')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setMessages(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setIsStreaming(true);
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });

      if (!res.ok) throw new Error('Chat request failed');

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('No response body');

      let fullText = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                fullText += parsed.text;
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: 'assistant', content: fullText };
                  return updated;
                });
              }
            } catch { /* skip */ }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: 'Sorry, I had trouble processing that. Please try again.',
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/history', { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setMessages([]);
      showToast('Chat cleared');
    } catch {
      showToast('Failed to clear chat');
    } finally {
      setConfirmClear(false);
    }
  }, [showToast]);

  const quickQuestions = [
    'What should I plant this month?',
    'Which beds are empty?',
    'Any pest issues to watch for?',
    'What needs harvesting soon?',
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] md:h-screen max-w-3xl mx-auto">
      {/* Header */}
      <div className="px-5 py-4 border-b border-earth-200 bg-white/90 backdrop-blur-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-800 text-earth-800" style={{ fontFamily: 'var(--font-display)' }}>
              💬 Vickie
            </h1>
            <p className="text-base text-earth-500 font-medium mt-0.5">
              Your growing assistant
            </p>
          </div>
          {messages.length > 0 && !confirmClear && (
            <button
              onClick={() => setConfirmClear(true)}
              className="text-sm text-earth-400 hover:text-red-500 font-semibold px-3 py-2 rounded-xl hover:bg-red-50 transition-colors flex-shrink-0 mt-0.5"
            >
              Clear chat
            </button>
          )}
          {confirmClear && (
            <div className="flex gap-2 flex-shrink-0 mt-0.5">
              <button
                onClick={handleClearChat}
                className="text-sm text-white bg-red-500 hover:bg-red-600 font-bold px-4 py-2 rounded-xl transition-colors"
              >
                Delete all
              </button>
              <button
                onClick={() => setConfirmClear(false)}
                className="text-sm text-earth-500 hover:text-earth-700 font-semibold px-3 py-2 rounded-xl hover:bg-earth-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-earth-500 text-lg font-medium">Loading chat history...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-5">
            <Image
              src="/images/vickie.png"
              alt="Vickie, your growing assistant"
              width={96}
              height={96}
              className="w-24 h-24 object-contain"
            />
            <div className="text-center">
              <p className="text-2xl font-bold text-earth-700" style={{ fontFamily: 'var(--font-display)' }}>
                Hello, Ant!
              </p>
              <p className="text-lg text-earth-500 mt-2 max-w-md">
                I&apos;m your polytunnel expert. Ask me anything about growing, pests, planting, or the weather.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 justify-center mt-3 max-w-lg">
              {quickQuestions.map(q => (
                <button
                  key={q}
                  onClick={() => {
                    setInput(q);
                    inputRef.current?.focus();
                  }}
                  className="text-base px-5 py-3 bg-white text-tunnel-700 rounded-2xl hover:bg-tunnel-50 transition-colors font-semibold border border-tunnel-300"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-2.5`}
            >
              {msg.role === 'assistant' && (
                <Image
                  src="/images/vickie-head.png"
                  alt="Vickie"
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-full object-cover object-top border border-earth-200 flex-shrink-0 mt-1 bg-earth-50"
                />
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-5 py-4 text-base leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-tunnel-600 text-white rounded-br-lg shadow-sm'
                    : 'bg-white border border-earth-200 text-earth-700 rounded-bl-lg shadow-sm'
                }`}
              >
                {msg.role === 'assistant' && !msg.content && isStreaming ? (
                  <div className="flex gap-1.5 py-2">
                    <span className="w-2.5 h-2.5 bg-earth-300 rounded-full animate-bounce" />
                    <span className="w-2.5 h-2.5 bg-earth-300 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-2.5 h-2.5 bg-earth-300 rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                ) : msg.role === 'user' ? (
                  <div className="whitespace-pre-wrap font-medium">{msg.content}</div>
                ) : (
                  <div className="prose prose-sm prose-earth max-w-none font-medium [&>p]:my-1.5 [&>ul]:my-1.5 [&>ol]:my-1.5 [&>h2]:text-base [&>h2]:font-extrabold [&>h2]:mt-3 [&>h2]:mb-1 [&>h3]:text-sm [&>h3]:font-bold [&>h3]:mt-2.5 [&>h3]:mb-1 [&>ul]:pl-4 [&>ol]:pl-4 [&_li]:my-0.5 [&>p:first-child]:mt-0 [&>p:last-child]:mb-0 [&_strong]:text-earth-800 [&_code]:bg-earth-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-semibold">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area — big and easy to use */}
      <div className="px-4 md:px-6 py-4 border-t border-earth-200 bg-white/90 backdrop-blur-sm">
        <div className="flex gap-3 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your tunnel..."
            rows={1}
            className="flex-1 px-5 py-4 border border-earth-300 rounded-2xl text-lg focus:ring-2 focus:ring-tunnel-300 focus:border-tunnel-400 outline-none resize-none max-h-32 font-medium"
            disabled={isStreaming}
          />
          <button
            onClick={handleSend}
            disabled={isStreaming || !input.trim()}
            className="px-8 py-4 bg-tunnel-600 text-white rounded-2xl text-lg font-bold hover:bg-tunnel-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0 shadow-sm active:scale-[0.97]"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
