import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import { useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

function CodeBlock({ language, value }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="rounded-xl overflow-hidden my-3 border border-[#2a2a2a]">
      <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a1a] border-b border-[#2a2a2a]">
        <span className="text-xs text-gray-400 font-mono">{language || 'code'}</span>
        <button onClick={copy} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition">
          {copied ? (
            <><svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
            </svg><span className="text-green-400">Copied!</span></>
          ) : (
            <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
            </svg><span>Copy code</span></>
          )}
        </button>
      </div>
      <SyntaxHighlighter language={language || 'text'} style={oneDark}
        customStyle={{ margin:0, borderRadius:0, background:'#141414', fontSize:'14px', padding:'16px' }}
        showLineNumbers={true}>
        {value}
      </SyntaxHighlighter>
    </div>
  )
}

export default function Chat() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState(null)
  const [chats, setChats] = useState([])
  const [currentChatId, setCurrentChatId] = useState(null)
  const [copied, setCopied] = useState(null)
  const [feedback, setFeedback] = useState({})
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const bottomRef = useRef(null)
  const navigate = useNavigate()
  const textareaRef = useRef(null)

  const welcomeMessage = {
    role: 'assistant',
    content: `Hello! I'm **BeaconAI** — your intelligent assistant. I can help you with:\n\n- 💡 **Answering questions** on any topic\n- 💻 **Writing & debugging code**\n- ✍️ **Writing & editing content**\n- 🔢 **Math & analysis**\n- 🎨 **Creative work**\n\nWhat would you like to explore today?`
  }

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/login'); return }
      setUser(user)
      await loadChats(user.id)
      setMessages([welcomeMessage])
    }
    getUser()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadChats = async (userId) => {
    const { data } = await supabase
      .from('chats')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (data) setChats(data)
  }

  const loadChatMessages = async (chatId) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })
    if (data) setMessages(data.map(m => ({ role: m.role, content: m.content })))
    setCurrentChatId(chatId)
  }

  const createNewChat = async (userId, firstMessage) => {
    const title = firstMessage.slice(0, 40) + (firstMessage.length > 40 ? '...' : '')
    const { data } = await supabase
      .from('chats')
      .insert({ user_id: userId, title })
      .select()
      .single()
    if (data) {
      setCurrentChatId(data.id)
      setChats(prev => [data, ...prev])
      return data.id
    }
    return null
  }

  const saveMessage = async (chatId, role, content) => {
    await supabase.from('messages').insert({ chat_id: chatId, role, content })
  }

  const autoResize = (e) => {
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px'
  }

  const sendMessage = async (overrideInput) => {
    const text = overrideInput || input
    if (!text.trim() || loading) return
    const userMessage = { role: 'user', content: text }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setLoading(true)

    let chatId = currentChatId
    if (!chatId) {
      chatId = await createNewChat(user.id, text)
    }
    if (chatId) await saveMessage(chatId, 'user', text)

    try {
      const response = await fetch('https://beaconai-jcl8.onrender.com/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMessage] })
      })
      const data = await response.json()
      const reply = data.reply
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
      if (chatId) await saveMessage(chatId, 'assistant', reply)
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong!' }])
    }
    setLoading(false)
  }

  const retryMessage = async (index) => {
    const previousMessages = messages.slice(0, index)
    setMessages(previousMessages)
    setLoading(true)
    try {
      const response = await fetch('https://beaconai-jcl8.onrender.com/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: previousMessages })
      })
      const data = await response.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry!' }])
    }
    setLoading(false)
  }

  const startNewChat = () => {
    setMessages([welcomeMessage])
    setCurrentChatId(null)
    setFeedback({})
  }

  const copyMessage = (content, index) => {
    navigator.clipboard.writeText(content)
    setCopied(index)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleFeedback = (index, type) => {
    setFeedback(prev => ({ ...prev, [index]: type }))
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const markdownComponents = {
    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '')
      const language = match ? match[1] : ''
      const value = String(children).replace(/\n$/, '')
      if (!inline && (match || value.includes('\n'))) {
        return <CodeBlock language={language} value={value} />
      }
      return (
        <code className="bg-[#2a2a2a] px-1.5 py-0.5 rounded text-indigo-300 text-sm font-mono" {...props}>
          {children}
        </code>
      )
    }
  }

  return (
    <div className="flex h-screen bg-[#0f0f0f] text-white overflow-hidden">

      {/* ── Sidebar ── */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-14'} transition-all duration-300 bg-[#171717] border-r border-[#2a2a2a] flex flex-col shrink-0 overflow-hidden`}>

        {/* Logo */}
        <div className="p-3 border-b border-[#2a2a2a] flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center font-bold shrink-0">B</div>
          {sidebarOpen && <span className="font-bold text-lg tracking-tight whitespace-nowrap">BeaconAI</span>}
        </div>

        {/* Buttons */}
        <div className="p-2 flex flex-col gap-1">
          <button onClick={startNewChat}
            title="New Chat"
            className="flex items-center gap-3 w-full px-2 py-2.5 rounded-xl hover:bg-[#2a2a2a] transition text-gray-300">
            <svg className="w-5 h-5 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
            </svg>
            {sidebarOpen && <span className="text-sm font-medium whitespace-nowrap">New Chat</span>}
          </button>
          <button
            title="Search Chats"
            className="flex items-center gap-3 w-full px-2 py-2.5 rounded-xl hover:bg-[#2a2a2a] transition text-gray-300">
            <svg className="w-5 h-5 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z"/>
            </svg>
            {sidebarOpen && <span className="text-sm whitespace-nowrap">Search Chats</span>}
          </button>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto px-2">
          {sidebarOpen && chats.length > 0 && (
            <p className="text-xs text-gray-600 uppercase tracking-wider mb-1 px-2 font-semibold">Recent</p>
          )}
          {chats.map((chat) => (
            <button key={chat.id}
              onClick={() => loadChatMessages(chat.id)}
              title={chat.title}
              className={`flex items-center gap-3 w-full px-2 py-2.5 rounded-xl hover:bg-[#2a2a2a] transition text-left ${currentChatId === chat.id ? 'bg-[#2a2a2a]' : ''}`}>
              <svg className="w-4 h-4 shrink-0 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
              </svg>
              {sidebarOpen && <span className="text-sm text-gray-400 truncate">{chat.title}</span>}
            </button>
          ))}
        </div>

        {/* User */}
        <div className="p-2 border-t border-[#2a2a2a]">
          <div className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-[#2a2a2a] transition cursor-pointer">
            <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold shrink-0">
              {user?.email?.[0]?.toUpperCase()}
            </div>
            {sidebarOpen && (
              <>
                <p className="text-xs text-gray-400 truncate flex-1">{user?.email}</p>
                <button onClick={handleLogout} title="Logout"
                  className="text-gray-600 hover:text-red-400 transition shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Main Chat ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header */}
        <div className="px-4 py-3 border-b border-[#2a2a2a] flex items-center gap-3">
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#2a2a2a] text-gray-400 hover:text-white transition shrink-0"
            title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-sm shrink-0">B</div>
          <div className="flex-1">
            <p className="font-semibold text-sm">BeaconAI</p>
            <p className="text-xs text-green-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse"></span>
              Online
            </p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {messages.map((msg, i) => (
            <div key={i} className={`group px-6 py-5 ${msg.role === 'assistant' ? 'bg-[#0f0f0f]' : 'bg-[#141414]'}`}>
              <div className="max-w-3xl mx-auto flex gap-4">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 mt-0.5 ${msg.role === 'assistant' ? 'bg-indigo-600' : 'bg-gray-700'}`}>
                  {msg.role === 'assistant' ? 'B' : user?.email?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-300 mb-2">
                    {msg.role === 'assistant' ? 'BeaconAI' : 'You'}
                  </p>
                  {msg.role === 'assistant' ? (
                    <div className="text-gray-100 text-base leading-7
                      [&_strong]:text-white [&_strong]:font-semibold
                      [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ul]:my-2
                      [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_ol]:my-2
                      [&_li]:text-gray-200
                      [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-white [&_h1]:mt-4 [&_h1]:mb-2
                      [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-white [&_h2]:mt-3 [&_h2]:mb-2
                      [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-white [&_h3]:mt-2
                      [&_p]:leading-7 [&_p]:my-1
                      [&_blockquote]:border-l-4 [&_blockquote]:border-indigo-500 [&_blockquote]:pl-4 [&_blockquote]:text-gray-400 [&_blockquote]:my-2">
                      <ReactMarkdown components={markdownComponents}>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-gray-100 text-base leading-7">{msg.content}</p>
                  )}
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => copyMessage(msg.content, i)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-[#2a2a2a] text-gray-500 hover:text-gray-300 transition text-xs">
                        {copied === i ? (
                          <><svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                          </svg><span className="text-green-400">Copied!</span></>
                        ) : (
                          <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                          </svg><span>Copy</span></>
                        )}
                      </button>
                      <button onClick={() => handleFeedback(i, 'up')}
                        className={`p-1.5 rounded-lg hover:bg-[#2a2a2a] transition ${feedback[i] === 'up' ? 'text-green-400' : 'text-gray-500 hover:text-gray-300'}`}>
                        <svg className="w-3.5 h-3.5" fill={feedback[i] === 'up' ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905a3.61 3.61 0 01-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"/>
                        </svg>
                      </button>
                      <button onClick={() => handleFeedback(i, 'down')}
                        className={`p-1.5 rounded-lg hover:bg-[#2a2a2a] transition ${feedback[i] === 'down' ? 'text-red-400' : 'text-gray-500 hover:text-gray-300'}`}>
                        <svg className="w-3.5 h-3.5" fill={feedback[i] === 'down' ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v2a2 2 0 002 2h.095c.5 0 .905-.405.905-.905a3.61 3.61 0 01.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5"/>
                        </svg>
                      </button>
                      <button onClick={() => retryMessage(i)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-[#2a2a2a] text-gray-500 hover:text-gray-300 transition text-xs">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                        </svg>
                        <span>Retry</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="px-6 py-5 bg-[#0f0f0f]">
              <div className="max-w-3xl mx-auto flex gap-4">
                <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold shrink-0">B</div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-300 mb-3">BeaconAI</p>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay:'0ms'}}></div>
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay:'150ms'}}></div>
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay:'300ms'}}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-6 py-4 border-t border-[#2a2a2a]">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-3 bg-[#1a1a1a] rounded-2xl px-4 py-3 border border-[#2a2a2a] focus-within:border-indigo-500 transition">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => { setInput(e.target.value); autoResize(e) }}
                onKeyDown={handleKeyDown}
                placeholder="Message BeaconAI..."
                rows={1}
                className="flex-1 bg-transparent text-white placeholder-gray-600 resize-none outline-none text-base leading-6"
              />
              <button onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-xl p-2.5 transition shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                </svg>
              </button>
            </div>
            <p className="text-xs text-gray-700 text-center mt-2">BeaconAI can make mistakes · Press Enter to send · Shift+Enter for new line</p>
          </div>
        </div>
      </div>
    </div>
  )
}