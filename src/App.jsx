import { useState, useEffect, useRef } from 'react'
import "prismjs/themes/prism-tomorrow.css"
import Editor from "react-simple-code-editor"
import prism from "prismjs"
import Markdown from "react-markdown"
import rehypeHighlight from "rehype-highlight"
import "highlight.js/styles/github-dark.css"
import axios from 'axios'
import './App.css'

const CodeEditor = (typeof Editor === 'function' || Editor?.$$typeof) ? Editor : (Editor?.default || Editor);

const CODE_PRESETS = {
  asyncBug: `// Scenario: Fetching and parsing user data with async bugs
function getUserData(userId) {
  let profile = fetch('/api/user/' + userId).then(res => res.json());
  
  if (!profile) {
    return "User not found";
  }

  return {
    id: userId,
    name: profile.name,
    email: profile.email
  };
}`,
  memoryLeak: `// Scenario: Event listener closure leak in a component
class DashboardWidget {
  constructor(element) {
    this.element = element;
    this.hugePayload = new Array(1000000).fill("payload_data");
    
    window.addEventListener("resize", () => {
      console.log("Resize event handled for:", this.element);
      this.render();
    });
  }

  render() {
    this.element.innerHTML = \`<div>Widget active</div>\`;
  }
}`,
  sqlInjection: `// Scenario: Node/Express backend query with SQL vulnerability
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  const query = "SELECT * FROM users WHERE user = '" + username + "' AND pass = '" + password + "'";
  
  db.query(query, (err, results) => {
    if (results.length > 0) {
      res.send({ status: "success", user: results[0] });
    } else {
      res.status(401).send("Invalid credentials");
    }
  });
});`,
  cleanFunction: `// Scenario: Clean functional utility
function calculateCartTotal(items, discountRate = 0) {
  if (!Array.isArray(items)) {
    throw new TypeError("Items must be an array");
  }

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discount = subtotal * (discountRate / 100);
  const tax = (subtotal - discount) * 0.08;

  return {
    subtotal: Number(subtotal.toFixed(2)),
    discount: Number(discount.toFixed(2)),
    tax: Number(tax.toFixed(2)),
    total: Number((subtotal - discount + tax).toFixed(2))
  };
}`
};

export default function App() {
  const [code, setCode] = useState(CODE_PRESETS.asyncBug);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const chatEndRef = useRef(null);

  // Re-highlight syntax whenever code changes or on mount
  useEffect(() => {
    prism.highlightAll();
  }, [code]);

  // Scroll to bottom of chat on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const showToast = (text) => {
    setToastMessage(text);
    setTimeout(() => setToastMessage(""), 2500);
  };

  const lineCount = code.split("\n").length;
  const charCount = code.length;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      showToast("Code copied to clipboard!");
    } catch {
      showToast("Failed to copy code");
    }
  };

  const handleClearCode = () => {
    setCode("");
    showToast("Editor cleared");
  };

  const handlePresetChange = (e) => {
    const key = e.target.value;
    if (CODE_PRESETS[key]) {
      setCode(CODE_PRESETS[key]);
      showToast("Preset loaded");
    }
  };

  const handleReviewCode = async () => {
    if (!code.trim()) {
      showToast("Please enter some code to review");
      return;
    }
    if (loading) return;

    const userMsg = {
      id: Date.now().toString(),
      role: "user",
      content: "🚀 Please perform a comprehensive Senior Code Review on this code snippet.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      hasCode: true
    };

    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const response = await axios.post("http://localhost:3000/ai/get-review", {
        code,
        message: "Perform a comprehensive Senior Code Review evaluating code quality, bugs, performance, security, and clean architecture."
      });

      const aiMsg = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.data,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error(error);
      const errDetails = error.response?.data
        ? `\n\n> **API Error:** ${typeof error.response.data === 'string' ? error.response.data : JSON.stringify(error.response.data)}`
        : "\n\nPlease ensure your backend server is running on `http://localhost:3000` and your `GOOGLE_GEMINI_KEY` is configured.";

      const errorMsg = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `### ⚠️ Code Review Failed${errDetails}\n\n*Check your API key in \`backend/.env\`.*`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (customPrompt) => {
    const promptToSend = (typeof customPrompt === "string" ? customPrompt : inputMessage).trim();
    if (!promptToSend) return;
    if (loading) return;

    const userMsg = {
      id: Date.now().toString(),
      role: "user",
      content: promptToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      hasCode: Boolean(code.trim())
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage("");
    setLoading(true);

    try {
      const response = await axios.post("http://localhost:3000/ai/get-review", {
        code,
        message: promptToSend
      });

      const aiMsg = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.data,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error(error);
      const errDetails = error.response?.data
        ? `\n\n> **API Error:** ${typeof error.response.data === 'string' ? error.response.data : JSON.stringify(error.response.data)}`
        : "\n\nPlease check your backend server on `http://localhost:3000`.";

      const errorMsg = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `### ⚠️ Request Failed${errDetails}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="app-container">
      {toastMessage && <div className="toast">ℹ️ {toastMessage}</div>}

      {/* Global Navigation Bar */}
      <header className="app-header">
        <div className="brand-section">
          <div className="brand-logo">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6"></polyline>
              <polyline points="8 6 2 12 8 18"></polyline>
            </svg>
          </div>
          <span className="brand-name">CodePulse AI</span>
          <span className="brand-badge">Senior Reviewer</span>
        </div>

        <div className="header-actions">
          <select className="preset-select" onChange={handlePresetChange} defaultValue="asyncBug" title="Load sample code snippets">
            <option value="asyncBug">Snippet: Async Promise Bug</option>
            <option value="memoryLeak">Snippet: Memory Leak Closure</option>
            <option value="sqlInjection">Snippet: SQL Injection Risk</option>
            <option value="cleanFunction">Snippet: Clean E-Commerce Utility</option>
          </select>

          <div className="status-indicator">
            <span className="pulse-dot"></span>
            <span>Gemini AI Ready</span>
          </div>
        </div>
      </header>

      {/* Workspace Split Panes */}
      <main className="app-workspace">
        {/* Left Pane: Professional Code Editor */}
        <section className="panel editor-panel">
          <div className="panel-header">
            <div className="panel-title-group">
              <div className="window-dots">
                <span className="dot-red"></span>
                <span className="dot-yellow"></span>
                <span className="dot-green"></span>
              </div>
              <div className="tab-badge">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                <span>solution.js</span>
              </div>
            </div>

            <div className="panel-actions">
              <button className="icon-btn" onClick={handleCopyCode} title="Copy code">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </button>
              <button className="icon-btn" onClick={handleClearCode} title="Clear editor">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          </div>

          <div className="editor-wrapper">
            <CodeEditor
              value={code}
              onValueChange={c => setCode(c)}
              highlight={c => prism.highlight(c, prism.languages.javascript, "javascript")}
              padding={16}
              className="code-editor-area"
              style={{
                fontFamily: '"Fira Code", monospace',
                fontSize: 14,
                minHeight: '100%'
              }}
            />
          </div>

          <div className="editor-footer">
            <div className="editor-stats">
              <span>Lines: {lineCount}</span>
              <span>Chars: {charCount}</span>
              <span>JavaScript</span>
            </div>

            <button 
              className="btn-primary" 
              onClick={handleReviewCode} 
              disabled={loading}
              title="Audit code using Google Gemini AI"
            >
              {loading ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                    <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="10"></circle>
                  </svg>
                  <span>Reviewing...</span>
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                  </svg>
                  <span>Review Code</span>
                </>
              )}
            </button>
          </div>
        </section>

        {/* Right Pane: Interactive Senior AI Chatbox */}
        <section className="panel chat-panel">
          <div className="panel-header">
            <div className="panel-title-group">
              <div className="msg-avatar avatar-ai" style={{ width: 22, height: 22, fontSize: 10 }}>
                AI
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Senior AI Reviewer</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>• Gemini 7+ Yrs Lead</span>
            </div>

            <div className="panel-actions">
              {messages.length > 0 && (
                <button 
                  className="icon-btn" 
                  onClick={() => setMessages([])} 
                  title="Clear conversation"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18"></path>
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                  </svg>
                </button>
              )}
            </div>
          </div>

          <div className="chat-container">
            <div className="chat-messages">
              {messages.length === 0 ? (
                <div className="chat-welcome">
                  <div className="welcome-icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                  </div>
                  <h3 className="welcome-title">Senior Code Review Assistant</h3>
                  <p className="welcome-desc">
                    Paste or write code in the left editor, then ask questions, scan for security flaws, or request full architectural refactoring.
                  </p>

                  <div className="suggestions-grid">
                    <button 
                      className="suggestion-chip"
                      onClick={() => handleSendMessage("Perform a full code review examining bugs, performance bottlenecks, and best practices.")}
                    >
                      <span>🚀</span>
                      <span>Run Full Code Audit</span>
                    </button>
                    <button 
                      className="suggestion-chip"
                      onClick={() => handleSendMessage("Check this code strictly for security vulnerabilities (e.g. Injection, XSS, Resource Leaks) and suggest mitigations.")}
                    >
                      <span>🔒</span>
                      <span>Security Vulnerability Scan</span>
                    </button>
                    <button 
                      className="suggestion-chip"
                      onClick={() => handleSendMessage("How can I optimize this code for speed, memory usage, and algorithmic efficiency?")}
                    >
                      <span>⚡</span>
                      <span>Optimize Performance & Complexity</span>
                    </button>
                    <button 
                      className="suggestion-chip"
                      onClick={() => handleSendMessage("Generate comprehensive unit tests with edge cases for this function.")}
                    >
                      <span>🧪</span>
                      <span>Generate Unit Tests</span>
                    </button>
                  </div>
                </div>
              ) : (
                messages.map(msg => (
                  <div 
                    key={msg.id} 
                    className={`chat-message ${msg.role === 'user' ? 'message-user' : 'message-ai'}`}
                  >
                    <div className={`msg-avatar ${msg.role === 'user' ? 'avatar-user' : 'avatar-ai'}`}>
                      {msg.role === 'user' ? 'You' : 'AI'}
                    </div>

                    <div className="msg-content-wrapper">
                      <div className="msg-header">
                        <span>{msg.role === 'user' ? 'Developer' : 'Senior Reviewer'}</span>
                        <span>•</span>
                        <span>{msg.timestamp}</span>
                        {msg.hasCode && (
                          <span style={{ color: '#818cf8', fontSize: '0.65rem', background: 'rgba(99,102,241,0.15)', padding: '1px 6px', borderRadius: 4 }}>
                            solution.js attached
                          </span>
                        )}
                      </div>

                      <div className={`msg-bubble ${msg.role === 'user' ? 'bubble-user' : 'bubble-ai'}`}>
                        {msg.role === 'user' ? (
                          <p>{msg.content}</p>
                        ) : (
                          <Markdown rehypePlugins={[rehypeHighlight]}>
                            {msg.content}
                          </Markdown>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}

              {loading && (
                <div className="chat-message message-ai">
                  <div className="msg-avatar avatar-ai">AI</div>
                  <div className="msg-content-wrapper">
                    <div className="msg-header">
                      <span>Senior Reviewer</span>
                      <span>•</span>
                      <span>Analyzing...</span>
                    </div>
                    <div className="typing-indicator">
                      <span className="typing-dot"></span>
                      <span className="typing-dot"></span>
                      <span className="typing-dot"></span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Chat Input Box */}
            <div className="chat-input-bar">
              <div className="input-container">
                <textarea
                  className="chat-input"
                  rows="1"
                  placeholder="Ask a question or request refactoring (e.g. 'Can you convert this to TypeScript?')..."
                  value={inputMessage}
                  onChange={e => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={loading}
                />
                <button 
                  className="send-btn" 
                  onClick={() => handleSendMessage()}
                  disabled={!inputMessage.trim() || loading}
                  title="Send message (Enter)"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </button>
              </div>
              <div className="input-footer">
                <span>Press <strong>Enter</strong> to send • <strong>Shift + Enter</strong> for new line</span>
                <span>Context: solution.js ({lineCount} lines)</span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
