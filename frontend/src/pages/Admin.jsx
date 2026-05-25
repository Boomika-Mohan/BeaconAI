import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useNavigate } from 'react-router-dom'

const ADMIN_EMAIL = 'boomikamohan819@gmail.com'

export default function Admin() {
  const [users, setUsers] = useState([])
  const [chats, setChats] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('users')
  const [selectedUser, setSelectedUser] = useState(null)
  const [userChats, setUserChats] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || user.email !== ADMIN_EMAIL) {
        navigate('/chat')
        return
      }
      loadData()
    }
    checkAdmin()
  }, [])

  const loadData = async () => {
    setLoading(true)

    // Load all chats
    const { data: chatsData } = await supabase
      .from('chats')
      .select('*')
      .order('created_at', { ascending: false })

    if (chatsData) setChats(chatsData)

    // Load all messages count per chat
    setLoading(false)
  }

  const loadUserChats = async (userId) => {
    const { data } = await supabase
      .from('chats')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (data) setUserChats(data)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const totalChats = chats.length
  const uniqueUsers = [...new Set(chats.map(c => c.user_id))]
  const totalUsers = uniqueUsers.length

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">

      {/* Header */}
      <div className="border-b border-[#2a2a2a] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center font-bold">B</div>
          <div>
            <p className="font-bold text-lg">BeaconAI Admin</p>
            <p className="text-xs text-gray-500">Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/chat')}
            className="px-4 py-2 rounded-xl bg-[#1a1a1a] hover:bg-[#2a2a2a] text-sm text-gray-300 transition">
            Go to Chat
          </button>
          <button onClick={handleLogout}
            className="px-4 py-2 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm transition">
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-[#171717] border border-[#2a2a2a] rounded-2xl p-6">
            <p className="text-gray-500 text-sm mb-1">Total Users</p>
            <p className="text-4xl font-bold text-indigo-400">{totalUsers}</p>
          </div>
          <div className="bg-[#171717] border border-[#2a2a2a] rounded-2xl p-6">
            <p className="text-gray-500 text-sm mb-1">Total Chats</p>
            <p className="text-4xl font-bold text-green-400">{totalChats}</p>
          </div>
          <div className="bg-[#171717] border border-[#2a2a2a] rounded-2xl p-6">
            <p className="text-gray-500 text-sm mb-1">Avg Chats/User</p>
            <p className="text-4xl font-bold text-yellow-400">
              {totalUsers > 0 ? (totalChats / totalUsers).toFixed(1) : 0}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${activeTab === 'users' ? 'bg-indigo-600 text-white' : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#2a2a2a]'}`}>
            Users
          </button>
          <button onClick={() => setActiveTab('chats')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${activeTab === 'chats' ? 'bg-indigo-600 text-white' : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#2a2a2a]'}`}>
            All Chats
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-500">Loading...</div>
        ) : (
          <>
            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="bg-[#171717] border border-[#2a2a2a] rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-[#2a2a2a]">
                  <h2 className="font-semibold">All Users ({totalUsers})</h2>
                </div>
                {uniqueUsers.length === 0 ? (
                  <div className="px-6 py-12 text-center text-gray-500">No users yet</div>
                ) : (
                  <div className="divide-y divide-[#2a2a2a]">
                    {uniqueUsers.map((userId, i) => {
                      const userChatCount = chats.filter(c => c.user_id === userId).length
                      const lastChat = chats.find(c => c.user_id === userId)
                      return (
                        <div key={userId}
                          className="px-6 py-4 flex items-center justify-between hover:bg-[#1a1a1a] transition cursor-pointer"
                          onClick={() => {
                            setSelectedUser(userId)
                            loadUserChats(userId)
                            setActiveTab('userchats')
                          }}>
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-indigo-600/30 border border-indigo-600/50 flex items-center justify-center text-indigo-400 font-bold">
                              {i + 1}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-300 font-mono">{userId.slice(0, 20)}...</p>
                              <p className="text-xs text-gray-600 mt-0.5">
                                Last active: {lastChat ? new Date(lastChat.created_at).toLocaleDateString() : 'Never'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-sm font-bold text-white">{userChatCount}</p>
                              <p className="text-xs text-gray-500">chats</p>
                            </div>
                            <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                            </svg>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* All Chats Tab */}
            {activeTab === 'chats' && (
              <div className="bg-[#171717] border border-[#2a2a2a] rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-[#2a2a2a]">
                  <h2 className="font-semibold">All Chats ({totalChats})</h2>
                </div>
                {chats.length === 0 ? (
                  <div className="px-6 py-12 text-center text-gray-500">No chats yet</div>
                ) : (
                  <div className="divide-y divide-[#2a2a2a]">
                    {chats.map((chat) => (
                      <div key={chat.id} className="px-6 py-4 flex items-center justify-between hover:bg-[#1a1a1a] transition">
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded-lg bg-[#2a2a2a] flex items-center justify-center">
                            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-300">{chat.title}</p>
                            <p className="text-xs text-gray-600 font-mono mt-0.5">{chat.user_id.slice(0, 16)}...</p>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500">
                          {new Date(chat.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* User Chats Tab */}
            {activeTab === 'userchats' && (
              <div className="bg-[#171717] border border-[#2a2a2a] rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-[#2a2a2a] flex items-center gap-3">
                  <button onClick={() => setActiveTab('users')}
                    className="text-gray-500 hover:text-white transition">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
                    </svg>
                  </button>
                  <h2 className="font-semibold">User Chats ({userChats.length})</h2>
                </div>
                {userChats.length === 0 ? (
                  <div className="px-6 py-12 text-center text-gray-500">No chats for this user</div>
                ) : (
                  <div className="divide-y divide-[#2a2a2a]">
                    {userChats.map((chat) => (
                      <div key={chat.id} className="px-6 py-4 flex items-center justify-between hover:bg-[#1a1a1a] transition">
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded-lg bg-[#2a2a2a] flex items-center justify-center">
                            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                            </svg>
                          </div>
                          <p className="text-sm font-medium text-gray-300">{chat.title}</p>
                        </div>
                        <p className="text-xs text-gray-500">
                          {new Date(chat.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}