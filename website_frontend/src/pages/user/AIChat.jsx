import React, { useState, useRef, useEffect } from 'react';
import { apiRequest } from '../../services/api';

const suggestedQuestions = [
  "Suggest a mystery book",
  "Best fantasy for beginners",
  "Books published in 2020",
  "What's popular this month?",
  "Recommend a feel‑good novel"
];

const AIChat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentResults, setCurrentResults] = useState([]);
  const [aiMode, setAiMode] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendQuery = async (queryText) => {
    if (!queryText.trim()) return;

    const userMessage = { role: 'user', content: queryText };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    const history = messages.slice(-10).map(({ role, content }) => ({ role, content }));

    try {
      const res = await apiRequest('/ai-chat/search', {
        method: 'POST',
        body: JSON.stringify({ query: queryText, history }),
      });

      if (!res.relevance) {
        // Off‑topic response
        const aiMessage = { role: 'assistant', content: res.response };
        setMessages(prev => [...prev, aiMessage]);
        setCurrentResults([]);
        setAiMode(false);
        setLoading(false);
        return;
      }

      const usedAi = !!(res.parsed?.genre || res.parsed?.author || res.parsed?.min_year || res.parsed?.max_year || res.parsed?.title_keywords?.length);
      setAiMode(usedAi);

      const aiMessage = { role: 'assistant', content: res.response };
      setMessages(prev => [...prev, aiMessage]);
      setCurrentResults(res.results || []);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => sendQuery(input);
  const handleChipClick = (question) => sendQuery(question);
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-[#FAF7F2]">
      {/* Header - fixed */}
      <div className="bg-white border-b border-[#EAE0D0] px-6 py-4 shadow-sm shrink-0">
        <h1 className="font-serif text-2xl font-bold text-[#2C1F14]">📚 Ask a Librarian</h1>
        <p className="text-[#9A8478] text-sm">Describe what you'd like to read – I'll find the best matches.</p>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Chat Panel - flex column layout */}
        <div className="w-1/2 flex flex-col bg-white border-r border-[#EAE0D0]">
          {/* Chat messages - scrollable area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-[#9A8478] mt-10">
                <p className="font-serif text-lg">✨ Try asking:</p>
                <div className="flex flex-wrap justify-center gap-2 mt-3">
                  {suggestedQuestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => handleChipClick(q)}
                      className="bg-[#F3EDE3] hover:bg-[#EAE0D0] text-[#4A3728] px-4 py-2 rounded-full text-sm transition"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    msg.role === 'user'
                      ? 'bg-[#C4895A] text-white'
                      : 'bg-[#F3EDE3] text-[#2C1F14]'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-[#F3EDE3] rounded-2xl px-4 py-2 text-[#9A8478] italic">
                  Searching the shelves...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Input area - fixed at bottom */}
          <div className="p-4 border-t border-[#EAE0D0] bg-white shrink-0">
            <div className="flex gap-2">
              <textarea
                className="flex-1 border border-[#EAE0D0] rounded-2xl p-3 focus:ring-2 focus:ring-[#C4895A] focus:border-transparent resize-none bg-[#FAF7F2]"
                rows="2"
                placeholder="e.g., 'I love Agatha Christie, any mystery suggestions?' or 'sci‑fi from the last 5 years'"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="bg-[#2C1F14] text-[#FAF7F2] px-5 py-2 rounded-2xl hover:bg-[#4A3728] disabled:opacity-50 self-end font-medium transition"
              >
                Send
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {suggestedQuestions.slice(0, 3).map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleChipClick(q)}
                  className="text-xs bg-[#F3EDE3] hover:bg-[#EAE0D0] text-[#4A3728] px-3 py-1 rounded-full transition"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Results Panel - similar flex structure */}
        <div className="w-1/2 flex flex-col bg-[#FAF7F2]">
          <div className="p-4 border-b border-[#EAE0D0] bg-white shrink-0 flex justify-between items-center">
            <h2 className="font-serif text-xl font-semibold text-[#2C1F14]">📖 Found Books</h2>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${aiMode ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
              {aiMode ? '✨ AI‑powered' : '🔍 Keyword search'}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {currentResults.length === 0 ? (
              <div className="text-center text-[#9A8478] mt-10">
                <p>No books yet. Start a conversation above.</p>
              </div>
            ) : (
              currentResults.map((book) => (
                <div key={book.id} className="bg-white rounded-xl shadow-sm border border-[#EAE0D0] p-4 hover:shadow-md transition">
                  {book.cover_image && (
                    <img
                      src={`/uploads/covers/${book.cover_image}`}
                      alt={book.title}
                      className="w-full h-40 object-cover rounded-lg mb-3"
                    />
                  )}
                  <h3 className="font-bold text-lg text-[#2C1F14]">{book.title}</h3>
                  <p className="text-[#9A8478]">by {book.author}</p>
                  <p className="text-sm text-[#C4895A] mt-1">{book.genre} • {book.published_year}</p>
                  <p className="text-sm mt-2 text-green-700">✓ Available: {book.available_copies} copies</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChat;