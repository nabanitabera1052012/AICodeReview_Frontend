import { useState, useEffect, useRef } from 'react'
import "prismjs/themes/prism-tomorrow.css"
import Editor from "react-simple-code-editor"
import prism from "prismjs"
import "prismjs/components/prism-clike"
import "prismjs/components/prism-javascript"
import "prismjs/components/prism-typescript"
import "prismjs/components/prism-python"
import "prismjs/components/prism-c"
import "prismjs/components/prism-cpp"
import "prismjs/components/prism-csharp"
import "prismjs/components/prism-java"
import "prismjs/components/prism-go"
import "prismjs/components/prism-rust"
import "prismjs/components/prism-sql"
import "prismjs/components/prism-markup-templating"
import "prismjs/components/prism-php"
import "prismjs/components/prism-json"
import "prismjs/components/prism-bash"
import Markdown from "react-markdown"
import rehypeHighlight from "rehype-highlight"
import "highlight.js/styles/github-dark.css"
import axios from 'axios'
import './App.css'

const API_BASE_URL = (
  import.meta.env.VITE_BACKEND_URL || 
  (import.meta.env.PROD 
    ? 'https://aicodereview-backend-furu.onrender.com' 
    : 'http://localhost:3000')
).replace(/\/+$/, '');

const CodeEditor = (typeof Editor === 'function' || Editor?.$$typeof) ? Editor : (Editor?.default || Editor);

// Supported languages with associated extensions, file badges, and Prism grammar modes
const SUPPORTED_LANGUAGES = [
  { id: 'javascript', label: 'JavaScript', ext: 'js', file: 'solution.js', prismLang: 'javascript' },
  { id: 'typescript', label: 'TypeScript', ext: 'ts', file: 'solution.ts', prismLang: 'typescript' },
  { id: 'python', label: 'Python', ext: 'py', file: 'main.py', prismLang: 'python' },
  { id: 'java', label: 'Java', ext: 'java', file: 'Main.java', prismLang: 'java' },
  { id: 'cpp', label: 'C++', ext: 'cpp', file: 'main.cpp', prismLang: 'cpp' },
  { id: 'csharp', label: 'C#', ext: 'cs', file: 'Program.cs', prismLang: 'csharp' },
  { id: 'go', label: 'Go', ext: 'go', file: 'main.go', prismLang: 'go' },
  { id: 'rust', label: 'Rust', ext: 'rs', file: 'main.rs', prismLang: 'rust' },
  { id: 'php', label: 'PHP', ext: 'php', file: 'index.php', prismLang: 'php' },
  { id: 'sql', label: 'SQL', ext: 'sql', file: 'query.sql', prismLang: 'sql' },
  { id: 'bash', label: 'Bash / Shell', ext: 'sh', file: 'script.sh', prismLang: 'bash' },
  { id: 'json', label: 'JSON', ext: 'json', file: 'config.json', prismLang: 'json' },
  { id: 'markup', label: 'HTML', ext: 'html', file: 'index.html', prismLang: 'markup' }
];

// Curated language bug presets
const LANGUAGE_PRESETS = {
  javascript: `// JavaScript: Asynchronous fetch race condition and unhandled promise
async function fetchUserProfile(userId) {
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
  typescript: `// TypeScript: Unsafe type cast and missing null check
interface UserProfile {
  id: string;
  name: string;
  roles?: string[];
}

function processAdminAccess(user: any): boolean {
  // Unsafe assumption without runtime check
  return user.roles.includes("admin");
}`,
  python: `# Python: Mutable default argument & unhandled file leak
def append_to_cache(item, cache=[]):
    cache.append(item)
    return cache

def read_config(path: str):
    f = open(path, "r")  # Unclosed resource
    return f.read()`,
  java: `// Java: Null pointer risk & unclosed BufferedReader
import java.io.*;

public class DataReader {
    public static String readFile(String path) throws Exception {
        BufferedReader reader = new BufferedReader(new FileReader(path));
        // Missing try-with-resources or close()
        return reader.readLine();
    }
}`,
  cpp: `// C++: Raw memory leak & buffer overflow vulnerability
#include <iostream>
#include <cstring>

void processInput(const char* input) {
    char buffer[16];
    strcpy(buffer, input); // Dangerous buffer overflow risk
    
    int* data = new int[100]; // Memory leak: never freed
    data[0] = 42;
}`,
  csharp: `// C#: Inefficient multiple LINQ enumerations
using System;
using System.Linq;
using System.Collections.Generic;

public class OrderService {
    public void ProcessOrders(List<int> orders) {
        var query = orders.Where(x => x > 100);
        if (query.Count() > 0) {
            var first = query.First();
        }
    }
}`,
  go: `// Go: Goroutine leak & unhandled HTTP error
package main

import (
    "fmt"
    "net/http"
)

func fetchStatus(url string) {
    ch := make(chan int)
    go func() {
        resp, err := http.Get(url)
        // Missing error check & resp.Body.Close()
        ch <- resp.StatusCode
    }()
}`,
  rust: `// Rust: Unchecked unwrap and unneeded clone
use std::fs::File;
use std::io::Read;

fn load_credentials() -> String {
    let mut file = File::open("secret.key").unwrap(); // Can panic at runtime
    let mut contents = String::new();
    file.read_to_string(&mut contents).unwrap();
    contents.clone() // Redundant clone
}`,
  php: `<?php
// PHP: SQL injection vulnerability
function authenticate($conn, $username, $password) {
    $sql = "SELECT * FROM users WHERE username = '$username' AND password = '$password'";
    $result = mysqli_query($conn, $sql);
    return mysqli_fetch_assoc($result);
}`,
  sql: `-- SQL: Missing join conditions causing slow table scans
SELECT u.id, u.name, o.total
FROM users u, orders o
WHERE u.status = 'active'
ORDER BY u.created_at DESC;`,
  bash: `#!/bin/bash
# Shell: Unquoted variables & command injection hazard
echo "Processing file: $1"
rm -rf /tmp/data/$1
eval "cat $1 | grep 'error'"`,
  json: `{
  "service": "api-gateway",
  "version": "1.0.0",
  "auth": {
    "tokenExpirySeconds": "never",
    "allowAnonymous": true
  }
}`,
  markup: `<!-- HTML: Missing DOCTYPE, meta charset & vulnerable script injection -->
<html>
<head>
  <title>User Portal</title>
</head>
<body>
  <h1>Welcome</h1>
  <div id="output"></div>
  <script>
    const name = location.search.split("=")[1];
    document.getElementById("output").innerHTML = name; // XSS vulnerability
  </script>
</body>
</html>`
};

export default function App() {
  const [selectedLang, setSelectedLang] = useState('javascript');
  const [code, setCode] = useState(LANGUAGE_PRESETS.javascript);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const chatEndRef = useRef(null);

  const currentLang = SUPPORTED_LANGUAGES.find(l => l.id === selectedLang) || SUPPORTED_LANGUAGES[0];
  const grammar = prism.languages[currentLang.prismLang] || prism.languages.javascript;

  // Re-highlight syntax whenever code changes or on mount
  useEffect(() => {
    prism.highlightAll();
  }, [code, selectedLang]);

  // Scroll to bottom of chat on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const showToast = (text) => {
    setToastMessage(text);
    setTimeout(() => setToastMessage(""), 2600);
  };

  const lineCount = code ? code.split("\n").length : 0;
  const charCount = code.length;

  const handleCopyCode = async () => {
    if (!code) {
      showToast("Editor is empty — nothing to copy");
      return;
    }
    try {
      await navigator.clipboard.writeText(code);
      showToast("Code copied to clipboard!");
    } catch {
      showToast("Failed to copy code");
    }
  };

  const handleClearCode = () => {
    setCode("");
    showToast("✨ Editor cleared! Paste code or select a language.");
  };

  const handlePasteCode = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text || !text.trim()) {
        showToast("Clipboard is empty! Copy code from your terminal first.");
        return;
      }
      setCode(text);
      showToast(`📋 Code pasted (${text.split('\n').length} lines)`);
    } catch {
      showToast("Clipboard permission denied. Use Ctrl+V / ⌘V in the editor.");
    }
  };

  const handleLanguageChange = (e) => {
    const newLangId = e.target.value;
    setSelectedLang(newLangId);
    const langObj = SUPPORTED_LANGUAGES.find(l => l.id === newLangId) || SUPPORTED_LANGUAGES[0];

    // If editor is empty or currently contains a standard snippet, load the snippet for the new language
    const isStandardSnippet = Object.values(LANGUAGE_PRESETS).some(p => p.trim() === code.trim());
    if (!code.trim() || isStandardSnippet) {
      if (LANGUAGE_PRESETS[newLangId]) {
        setCode(LANGUAGE_PRESETS[newLangId]);
      }
    }
    showToast(`Switched language to ${langObj.label} (${langObj.file})`);
  };

  const handlePresetSelect = (presetKey) => {
    if (LANGUAGE_PRESETS[presetKey]) {
      setSelectedLang(presetKey);
      setCode(LANGUAGE_PRESETS[presetKey]);
      showToast(`Loaded ${presetKey} sample snippet`);
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
      content: `🚀 Please perform a comprehensive Senior Code Review on this ${currentLang.label} snippet.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      hasCode: true,
      file: currentLang.file
    };

    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/ai/get-review`, {
        code,
        language: currentLang.label,
        message: `Perform a comprehensive Senior Code Review evaluating code quality, bugs, performance, security, and clean architecture.`
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
        : `\n\nUnable to reach backend at \`${API_BASE_URL}\`. If the server was idle (Render free tier), please allow 30–50s for it to wake up and try again.`;

      const errorMsg = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `### ⚠️ Code Review Failed${errDetails}\n\n*Verify backend status or check \`GOOGLE_GEMINI_KEY\`.*`,
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
      const response = await axios.post(`${API_BASE_URL}/ai/get-review`, {
        code,
        language: currentLang.label,
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
        : `\n\nUnable to reach backend at \`${API_BASE_URL}\`.`;

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
          <div className="brand-titles">
            <span className="brand-name">CodePulse AI</span>
            <span className="brand-badge">Senior Reviewer</span>
          </div>

          <div className="nav-divider"></div>

          {/* Left-Side Navbar Action: Clear Button */}
          <button 
            id="nav-clear-btn"
            className="nav-btn nav-btn-clear" 
            onClick={handleClearCode} 
            title="Automatically clear editor (Reset)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18"></path>
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
            </svg>
            <span>Clear</span>
          </button>

          {/* Left-Side Navbar Action: Quick Paste Button */}
          <button 
            id="nav-paste-btn"
            className="nav-btn nav-btn-paste" 
            onClick={handlePasteCode} 
            title="Paste code directly from terminal or clipboard"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
            </svg>
            <span>Paste</span>
          </button>

          {/* Left-Side Navbar Action: Language Selector */}
          <div className="nav-language-wrapper">
            <svg className="nav-lang-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="16 18 22 12 16 6"></polyline>
              <polyline points="8 6 2 12 8 18"></polyline>
            </svg>
            <select 
              id="nav-language-select"
              className="nav-language-select" 
              value={selectedLang} 
              onChange={handleLanguageChange}
              title="Select programming language for syntax highlighting & review"
            >
              {SUPPORTED_LANGUAGES.map(lang => (
                <option key={lang.id} value={lang.id}>
                  {lang.label} ({lang.ext})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="header-actions">
          <select 
            className="preset-select" 
            onChange={(e) => handlePresetSelect(e.target.value)} 
            value={selectedLang}
            title="Load sample snippets by language"
          >
            <option value="" disabled>Load Sample Scenario...</option>
            {SUPPORTED_LANGUAGES.map(lang => (
              <option key={lang.id} value={lang.id}>
                Sample: {lang.label} ({lang.file})
              </option>
            ))}
          </select>

          <div className="status-indicator" title={`Backend: ${API_BASE_URL}`}>
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
                <span>{currentLang.file}</span>
                <span className="tab-ext-pill">{currentLang.ext}</span>
              </div>
            </div>

            <div className="panel-actions">
              <button className="icon-btn" onClick={handlePasteCode} title="Paste code from clipboard / terminal">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                  <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                </svg>
              </button>
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
            {!code && (
              <div className="editor-empty-state">
                <div className="empty-state-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="4 17 10 11 4 5"></polyline>
                    <line x1="12" y1="19" x2="20" y2="19"></line>
                  </svg>
                </div>
                <p className="empty-state-title">Editor is ready for your {currentLang.label} code</p>
                <p className="empty-state-subtitle">Paste code from terminal (<kbd>Ctrl+V</kbd> / <kbd>⌘V</kbd>) or click the <strong>Paste</strong> button above</p>
              </div>
            )}

            <CodeEditor
              value={code}
              onValueChange={c => setCode(c)}
              highlight={c => {
                try {
                  const activeGrammar = prism.languages[currentLang.prismLang] || prism.languages.javascript || {};
                  return prism.highlight(c, activeGrammar, currentLang.prismLang || 'javascript');
                } catch (e) {
                  return c;
                }
              }}
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
              <span className="lang-stat-tag">{currentLang.label}</span>
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
                            {msg.file || currentLang.file} attached
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
