import { useState } from "react";
import axios from "axios";

export default function AISearchPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const res = await axios.post("/api/ai-search", { query });
      setResults(res.data.results);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">📚 Library AI Search</h1>
      <p className="text-gray-600 mb-6">
        Tell us what you want – a genre, a topic, a specific plot, or a favorite author – and we'll find books from our collection.
      </p>

      <div className="mb-6">
        <textarea
          className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500"
          rows="3"
          placeholder="e.g., Mystery books with a female detective set in Victorian London"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="mt-2 flex gap-2 flex-wrap">
          {["Best fantasy books of 2020s", "Short stories about friendship", "Non-fiction about space exploration"].map(prompt => (
            <button
              key={prompt}
              onClick={() => setQuery(prompt)}
              className="bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-full text-sm"
            >
              {prompt}
            </button>
          ))}
        </div>
        <button
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg disabled:opacity-50"
        >
          {loading ? "Searching..." : "Find books"}
        </button>
      </div>

      {results.length === 0 && !loading && (
        <div className="text-center text-gray-400 py-12">
          Your book options will appear here
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {results.map(book => (
          <div key={book.id} className="border rounded-lg p-4 shadow hover:shadow-md transition">
            <h3 className="font-bold text-lg">{book.title}</h3>
            <p className="text-gray-600">by {book.author}</p>
            <p className="text-sm text-gray-500">{book.genre} • {book.publication_year}</p>
            <p className="text-sm mt-2 line-clamp-2">{book.description}</p>
            <p className="mt-2 text-green-600">Available: {book.available_copies} copy(ies)</p>
          </div>
        ))}
      </div>
    </div>
  );
}