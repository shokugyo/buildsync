'use client'

import { useState, useEffect, useRef } from 'react'
import { formatDateTime } from '@/lib/utils'
import { Send, Plus, X, Trash2, Camera, Folder, Bell, Settings, MessageSquare, AtSign, Paperclip, FileText, Image as ImageIcon, Pencil, Smile, Check } from 'lucide-react'
import { useSession } from 'next-auth/react'

interface ChatReaction {
  id: string
  messageId: string
  userId: string
  emoji: string
  user: { id: string; name: string }
}

interface ChatMessageRead {
  userId: string
  readAt: string
}

interface ChatMessage {
  id: string
  content: string
  fileUrl?: string | null
  fileName?: string | null
  fileSize?: number | null
  parentId?: string | null
  createdAt: string
  editedAt?: string | null
  deletedAt?: string | null
  sender: { id: string; name: string; company?: { name: string } }
  reactions: ChatReaction[]
  readBy?: ChatMessageRead[]
}

interface ChatRoom {
  id: string
  name: string
  project: { id: string; name: string; projectNumber: string }
  messages: ChatMessage[]
  unreadCount?: number
}

const COMMON_EMOJIS = ['👍', '❤️', '😄', '🎉', '👀', '🙏']

function groupMessagesByDate(messages: ChatMessage[]) {
  const groups: { date: string; messages: ChatMessage[] }[] = []
  messages.forEach((msg) => {
    const d = new Date(msg.createdAt)
    const label = d.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' })
      .replace(/(\d+)\/(\d+)（(.+)）/, '$1/$2($3)')
    const last = groups[groups.length - 1]
    if (last && last.date === label) {
      last.messages.push(msg)
    } else {
      groups.push({ date: label, messages: [msg] })
    }
  })
  return groups
}

function groupReactions(reactions: ChatReaction[], currentUserId: string) {
  const grouped: Record<string, { emoji: string; count: number; reacted: boolean; users: string[] }> = {}
  for (const r of reactions) {
    if (!grouped[r.emoji]) {
      grouped[r.emoji] = { emoji: r.emoji, count: 0, reacted: false, users: [] }
    }
    grouped[r.emoji].count++
    grouped[r.emoji].users.push(r.user.name)
    if (r.userId === currentUserId) grouped[r.emoji].reacted = true
  }
  return Object.values(grouped)
}

export default function ChatPage() {
  const { data: session } = useSession()
  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [showNewRoom, setShowNewRoom] = useState(false)
  const [projects, setProjects] = useState<any[]>([])
  const [roomForm, setRoomForm] = useState({ name: '', projectId: '' })
  const [creatingRoom, setCreatingRoom] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'notice' | 'unread'>('all')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const selectedRoomIdRef = useRef<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [mentionQuery, setMentionQuery] = useState('')
  const [showMentionMenu, setShowMentionMenu] = useState(false)
  const [mentionStart, setMentionStart] = useState(-1)
  const [pendingFile, setPendingFile] = useState<{ url: string; name: string; size?: number } | null>(null)
  const [uploading, setUploading] = useState(false)

  // Edit state
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)

  // Reply state
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null)

  // Reaction picker state
  const [reactionPickerMsgId, setReactionPickerMsgId] = useState<string | null>(null)

  // Message action menu state
  const [actionMenuMsgId, setActionMenuMsgId] = useState<string | null>(null)

  const currentUserId = (session?.user as any)?.id as string | undefined

  useEffect(() => {
    Promise.all([
      fetch('/api/chat').then((r) => r.json()),
      fetch('/api/projects').then((r) => r.json()),
      fetch('/api/users').then((r) => r.json()),
    ]).then(async ([data, p, u]) => {
      setAllUsers(Array.isArray(u) ? u : [])
      const r = Array.isArray(data) ? data : []
      setRooms(r)
      setProjects(Array.isArray(p) ? p : [])
      if (r.length > 0) {
        const messages = await fetch(`/api/chat?roomId=${r[0].id}`).then((res) => res.json())
        setSelectedRoom({ ...r[0], messages: Array.isArray(messages) ? messages : [] })
        fetch(`/api/chat/${r[0].id}/read`, { method: 'POST' }).catch(() => {})
        setRooms(r.map((room: ChatRoom, i: number) => i === 0 ? { ...room, unreadCount: 0 } : room))
      }
      setLoading(false)
    })
  }, [])

  useEffect(() => { selectedRoomIdRef.current = selectedRoom?.id || null }, [selectedRoom?.id])

  useEffect(() => {
    const interval = setInterval(async () => {
      if (!selectedRoomIdRef.current) return
      try {
        const messages = await fetch(`/api/chat?roomId=${selectedRoomIdRef.current}`).then((r) => r.json())
        if (!Array.isArray(messages)) return
        setSelectedRoom((prev) => {
          if (!prev || messages.length === prev.messages.length) return prev
          fetch(`/api/chat/${selectedRoomIdRef.current}/read`, { method: 'POST' }).catch(() => {})
          setRooms((prevRooms) => prevRooms.map((r) => r.id === selectedRoomIdRef.current ? { ...r, unreadCount: 0 } : r))
          return { ...prev, messages }
        })
      } catch {}
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selectedRoom?.messages])

  // Close menus on outside click
  useEffect(() => {
    const handler = () => {
      setReactionPickerMsgId(null)
      setActionMenuMsgId(null)
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  const sendMessage = async () => {
    if ((!message.trim() && !pendingFile) || !selectedRoom) return
    setSending(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'message',
          roomId: selectedRoom.id,
          content: message || (pendingFile ? `[ファイル: ${pendingFile.name}]` : ''),
          fileUrl: pendingFile?.url || null,
          fileName: pendingFile?.name || null,
          fileSize: pendingFile?.size || null,
          parentId: replyTo?.id || null,
        }),
      })
      if (res.ok) {
        const msg = await res.json()
        setRooms((prev) => prev.map((r) => r.id === selectedRoom.id ? { ...r, messages: [...r.messages, msg] } : r))
        setSelectedRoom((prev) => prev ? { ...prev, messages: [...prev.messages, msg] } : prev)
        setMessage('')
        setPendingFile(null)
        setReplyTo(null)
      }
    } finally {
      setSending(false)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const fileSize = file.size
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload/chat', { method: 'POST', body: formData })
      if (res.ok) {
        const data = await res.json()
        setPendingFile({ url: data.filePath, name: data.fileName, size: fileSize })
      }
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreatingRoom(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'room', name: roomForm.name, projectId: roomForm.projectId }),
      })
      if (res.ok) {
        const newRoom = await res.json()
        setRooms((prev) => [...prev, { ...newRoom, messages: [] }])
        setSelectedRoom({ ...newRoom, messages: [] })
        setShowNewRoom(false)
        setRoomForm({ name: '', projectId: '' })
      }
    } finally {
      setCreatingRoom(false)
    }
  }

  const deleteRoom = async (roomId: string, roomName: string) => {
    if (!confirm(`「${roomName}」を削除しますか？`)) return
    const res = await fetch(`/api/chat/rooms/${roomId}`, { method: 'DELETE' })
    if (res.ok) {
      setRooms((prev) => prev.filter((r) => r.id !== roomId))
      if (selectedRoom?.id === roomId) setSelectedRoom(null)
    }
  }

  const deleteMessage = async (msgId: string) => {
    if (!confirm('このメッセージを削除しますか？')) return
    const res = await fetch(`/api/chat/messages/${msgId}`, { method: 'DELETE' })
    if (res.ok) {
      const updated = await res.json()
      updateMessageInState(updated)
    }
    setActionMenuMsgId(null)
  }

  const startEdit = (msg: ChatMessage) => {
    setEditingMsgId(msg.id)
    setEditContent(msg.content)
    setActionMenuMsgId(null)
    setTimeout(() => editInputRef.current?.focus(), 50)
  }

  const cancelEdit = () => {
    setEditingMsgId(null)
    setEditContent('')
  }

  const submitEdit = async (msgId: string) => {
    if (!editContent.trim()) return
    const res = await fetch(`/api/chat/messages/${msgId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: editContent }),
    })
    if (res.ok) {
      const updated = await res.json()
      updateMessageInState(updated)
      cancelEdit()
    }
  }

  const updateMessageInState = (updated: ChatMessage) => {
    setSelectedRoom((prev) =>
      prev
        ? { ...prev, messages: prev.messages.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)) }
        : prev
    )
  }

  const toggleReaction = async (msgId: string, emoji: string) => {
    if (!currentUserId) return
    const res = await fetch(`/api/chat/messages/${msgId}/reactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji }),
    })
    if (res.ok) {
      const result = await res.json()
      // Optimistically update local state
      setSelectedRoom((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          messages: prev.messages.map((m) => {
            if (m.id !== msgId) return m
            let reactions = [...m.reactions]
            if (result.action === 'removed') {
              reactions = reactions.filter((r) => !(r.userId === currentUserId && r.emoji === emoji))
            } else {
              reactions = [...reactions, { id: '', messageId: msgId, userId: currentUserId, emoji, user: { id: currentUserId, name: (session?.user as any)?.name || '' } }]
            }
            return { ...m, reactions }
          }),
        }
      })
    }
    setReactionPickerMsgId(null)
  }

  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setMessage(val)
    const cursorPos = e.target.selectionStart || 0
    const textBefore = val.slice(0, cursorPos)
    const atIdx = textBefore.lastIndexOf('@')
    if (atIdx >= 0 && (atIdx === 0 || textBefore[atIdx - 1] === ' ')) {
      const query = textBefore.slice(atIdx + 1)
      if (!query.includes(' ')) {
        setMentionQuery(query)
        setMentionStart(atIdx)
        setShowMentionMenu(true)
        return
      }
    }
    setShowMentionMenu(false)
  }

  const insertMention = (userName: string) => {
    const before = message.slice(0, mentionStart)
    const after = message.slice(mentionStart + 1 + mentionQuery.length)
    const newMsg = `${before}@${userName} ${after}`
    setMessage(newMsg)
    setShowMentionMenu(false)
    inputRef.current?.focus()
  }

  const mentionUsers = allUsers.filter(u =>
    mentionQuery === '' || u.name.includes(mentionQuery)
  ).slice(0, 5)

  const markAsRead = async (roomId: string) => {
    try {
      await fetch(`/api/chat/${roomId}/read`, { method: 'POST' })
      setRooms((prev) => prev.map((r) => r.id === roomId ? { ...r, unreadCount: 0 } : r))
    } catch {}
  }

  const selectRoom = async (room: ChatRoom) => {
    const messages = await fetch(`/api/chat?roomId=${room.id}`).then((r) => r.json())
    setSelectedRoom({ ...room, messages: Array.isArray(messages) ? messages : [] })
    markAsRead(room.id)
  }

  const AVATAR_COLORS = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-amber-500', 'bg-red-500', 'bg-teal-500']
  const getAvatarColor = (name: string) => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]

  const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp|heic)$/i.test(url)

  return (
    <div className="flex h-screen bg-white">
      {/* Left sidebar */}
      <div className="w-64 border-r border-slate-200 flex flex-col flex-shrink-0">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            <span className="font-bold text-slate-900 text-sm">BUILDSYNC CHAT</span>
          </div>
          <button
            onClick={() => setShowNewRoom(true)}
            className="p-1 text-slate-400 hover:text-blue-600 rounded"
            title="新規作成"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex border-b border-slate-200">
          {([['all', 'すべて'], ['notice', 'お知らせ'], ['unread', '未読']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 py-2 text-xs font-medium transition-colors ${activeTab === key ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-xs text-slate-400 text-center">読み込み中...</div>
          ) : rooms.length === 0 ? (
            <div className="p-4 text-xs text-slate-400 text-center">ルームがありません</div>
          ) : (
            rooms.filter((room) => {
              if (activeTab === 'unread') return (room.unreadCount ?? 0) > 0
              return true
            }).map((room) => {
              const lastMsg = room.messages?.[room.messages.length - 1]
              const isSelected = selectedRoom?.id === room.id
              const time = lastMsg ? new Date(lastMsg.createdAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : ''
              return (
                <div
                  key={room.id}
                  onClick={() => selectRoom(room)}
                  className={`group flex items-start gap-2.5 px-3 py-3 border-b border-slate-100 cursor-pointer hover:bg-slate-50 ${isSelected ? 'bg-blue-50' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white ${getAvatarColor(room.name)}`}>
                    {room.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className={`text-xs font-medium truncate ${isSelected ? 'text-blue-700' : 'text-slate-900'}`}>{room.name}</p>
                      <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                        {!isSelected && (room.unreadCount ?? 0) > 0 && (
                          <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                            {room.unreadCount}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400">{time}</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">{room.project?.name}</p>
                    {lastMsg && (
                      <p className={`text-[11px] truncate ${!isSelected && (room.unreadCount ?? 0) > 0 ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>
                        {lastMsg.deletedAt ? '(削除されました)' : lastMsg.fileUrl ? `📎 ${lastMsg.fileName || 'ファイル'}` : lastMsg.content}
                      </p>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Main message area */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedRoom ? (
          <>
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between bg-white">
              <span className="font-semibold text-slate-900">{selectedRoom.name}</span>
              <button
                onClick={() => deleteRoom(selectedRoom.id, selectedRoom.name)}
                className="text-slate-300 hover:text-red-500 p-1"
                title="ルームを削除"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-slate-50">
              {selectedRoom.messages?.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-slate-400 text-sm">メッセージがありません</p>
                </div>
              ) : (
                groupMessagesByDate(selectedRoom.messages || []).map(({ date, messages }) => (
                  <div key={date}>
                    <div className="flex items-center gap-3 my-4">
                      <div className="flex-1 border-t border-slate-200" />
                      <span className="text-xs text-slate-400 px-2">{date}</span>
                      <div className="flex-1 border-t border-slate-200" />
                    </div>
                    <div className="space-y-4">
                      {messages.map((msg) => {
                        const isMe = msg.sender.id === currentUserId
                        const isDeleted = !!msg.deletedAt
                        const reactionGroups = groupReactions(msg.reactions || [], currentUserId || '')
                        const isEditing = editingMsgId === msg.id

                        return (
                          <div key={msg.id} className={msg.parentId ? 'ml-8 border-l-2 border-slate-200 pl-2' : ''}>
                          <div className={`flex gap-3 group/msg ${isMe ? 'flex-row-reverse' : ''}`}>
                            <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white ${getAvatarColor(msg.sender.name)}`}>
                              {msg.sender.name[0]}
                            </div>
                            <div className={`max-w-md ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                              <div className={`flex items-baseline gap-2 mb-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                                <span className="text-xs font-medium text-slate-700">{msg.sender.name}</span>
                                {(msg.sender as any).company?.name && (
                                  <span className="text-[11px] text-slate-400">（{(msg.sender as any).company.name}）</span>
                                )}
                                <span className="text-[10px] text-slate-400">
                                  {new Date(msg.createdAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {msg.editedAt && !isDeleted && (
                                  <span className="text-[10px] text-slate-400 italic">（編集済み）</span>
                                )}
                              </div>

                              <div className={`flex items-end gap-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                                {/* Action buttons (hover) */}
                                {!isDeleted && (
                                  <div className={`flex items-center gap-0.5 opacity-0 group-hover/msg:opacity-100 transition-opacity ${isMe ? 'flex-row-reverse' : ''}`}>
                                    {/* Reply button */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setReplyTo(msg)
                                        inputRef.current?.focus()
                                      }}
                                      className="p-1 text-slate-400 hover:text-blue-500 rounded text-xs"
                                      title="返信"
                                    >
                                      ↩
                                    </button>
                                    {/* Reaction picker trigger */}
                                    <div className="relative">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setReactionPickerMsgId(reactionPickerMsgId === msg.id ? null : msg.id)
                                          setActionMenuMsgId(null)
                                        }}
                                        className="p-1 text-slate-400 hover:text-amber-500 rounded"
                                        title="リアクション"
                                      >
                                        <Smile className="w-3.5 h-3.5" />
                                      </button>
                                      {reactionPickerMsgId === msg.id && (
                                        <div
                                          className={`absolute bottom-full mb-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 flex gap-1 p-1.5 ${isMe ? 'right-0' : 'left-0'}`}
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          {COMMON_EMOJIS.map((emoji) => (
                                            <button
                                              key={emoji}
                                              onClick={() => toggleReaction(msg.id, emoji)}
                                              className="text-lg hover:scale-125 transition-transform p-0.5"
                                            >
                                              {emoji}
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>

                                    {/* Own message menu */}
                                    {isMe && (
                                      <div className="relative">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            setActionMenuMsgId(actionMenuMsgId === msg.id ? null : msg.id)
                                            setReactionPickerMsgId(null)
                                          }}
                                          className="p-1 text-slate-400 hover:text-slate-600 rounded text-xs font-bold leading-none"
                                          title="操作"
                                        >
                                          ···
                                        </button>
                                        {actionMenuMsgId === msg.id && (
                                          <div
                                            className="absolute bottom-full right-0 mb-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 min-w-[100px]"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <button
                                              onClick={() => startEdit(msg)}
                                              className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                                            >
                                              <Pencil className="w-3.5 h-3.5" /> 編集
                                            </button>
                                            <button
                                              onClick={() => deleteMessage(msg.id)}
                                              className="w-full text-left px-3 py-2 text-sm hover:bg-red-50 flex items-center gap-2 text-red-600"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" /> 削除
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Message bubble */}
                                {isDeleted ? (
                                  <div className="px-3 py-2 rounded-xl text-sm text-slate-400 italic bg-slate-100">
                                    （削除されました）
                                  </div>
                                ) : isEditing ? (
                                  <div className="flex items-center gap-1">
                                    <input
                                      ref={editInputRef}
                                      type="text"
                                      value={editContent}
                                      onChange={(e) => setEditContent(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') submitEdit(msg.id)
                                        if (e.key === 'Escape') cancelEdit()
                                      }}
                                      className="px-3 py-2 border border-blue-400 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[200px]"
                                    />
                                    <button onClick={() => submitEdit(msg.id)} className="p-1 text-green-600 hover:text-green-700">
                                      <Check className="w-4 h-4" />
                                    </button>
                                    <button onClick={cancelEdit} className="p-1 text-slate-400 hover:text-slate-600">
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className={`px-3 py-2 rounded-xl text-sm leading-relaxed whitespace-pre-wrap ${
                                    isMe ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white text-slate-800 shadow-sm rounded-tl-sm'
                                  }`}>
                                    {msg.fileUrl && isImage(msg.fileUrl) ? (
                                      <div className="space-y-1">
                                        <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer">
                                          <img src={msg.fileUrl} alt={msg.fileName || '画像'} className="max-w-xs rounded-lg" />
                                        </a>
                                        {msg.content && msg.content !== `[ファイル: ${msg.fileName}]` && (
                                          <p>{msg.content}</p>
                                        )}
                                      </div>
                                    ) : msg.fileUrl ? (
                                      <div className="space-y-1">
                                        <a
                                          href={msg.fileUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className={`flex items-center gap-2 underline ${isMe ? 'text-blue-100' : 'text-blue-600'}`}
                                        >
                                          <FileText className="w-4 h-4 flex-shrink-0" />
                                          <span>{msg.fileName || 'ファイルをダウンロード'}</span>
                                          {msg.fileSize && <span className={`text-xs no-underline ${isMe ? 'text-blue-200' : 'text-slate-400'}`}>({formatFileSize(msg.fileSize)})</span>}
                                        </a>
                                        {msg.content && msg.content !== `[ファイル: ${msg.fileName}]` && (
                                          <p>{msg.content}</p>
                                        )}
                                      </div>
                                    ) : (
                                      msg.content.split(/(@\S+)/g).map((part, idx) =>
                                        part.startsWith('@') ? (
                                          <span key={idx} className={`font-semibold ${isMe ? 'text-blue-200' : 'text-blue-600'}`}>{part}</span>
                                        ) : part
                                      )
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Reaction badges */}
                              {!isDeleted && reactionGroups.length > 0 && (
                                <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                  {reactionGroups.map((rg) => (
                                    <button
                                      key={rg.emoji}
                                      onClick={() => toggleReaction(msg.id, rg.emoji)}
                                      title={rg.users.join(', ')}
                                      className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition-colors ${
                                        rg.reacted
                                          ? 'bg-blue-100 border-blue-300 text-blue-700'
                                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                      }`}
                                    >
                                      <span>{rg.emoji}</span>
                                      <span className="font-medium">{rg.count}</span>
                                    </button>
                                  ))}
                                </div>
                              )}

                              {/* Read receipts */}
                              {!isDeleted && (() => {
                                const readCount = (msg.readBy || []).filter(r => r.userId !== msg.sender.id).length
                                return readCount > 0 ? (
                                  <div className={`mt-0.5 ${isMe ? 'text-right' : 'text-left'}`}>
                                    <span className="text-[10px] text-slate-400">既読 {readCount}</span>
                                  </div>
                                ) : null
                              })()}
                            </div>
                          </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="border-t border-slate-200 bg-white px-4 py-3">
              {replyTo && (
                <div className="mb-2 flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 text-xs">
                  <span className="text-blue-600 font-medium">返信先:</span>
                  <span className="flex-1 text-slate-600 truncate">{replyTo.content.slice(0, 40)}{replyTo.content.length > 40 ? '…' : ''}</span>
                  <button onClick={() => setReplyTo(null)} className="text-slate-400 hover:text-red-500 flex-shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              {pendingFile && (
                <div className="mb-2 flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm">
                  <Paperclip className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span className="flex-1 text-slate-700 truncate">{pendingFile.name}</span>
                  {pendingFile.size && <span className="text-xs text-slate-400 flex-shrink-0">{formatFileSize(pendingFile.size)}</span>}
                  <button onClick={() => setPendingFile(null)} className="text-slate-400 hover:text-red-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <div className="relative flex items-center gap-2 mb-2">
                {showMentionMenu && mentionUsers.length > 0 && (
                  <div className="absolute bottom-full left-0 mb-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 w-48">
                    {mentionUsers.map(u => (
                      <button
                        key={u.id}
                        onClick={() => insertMention(u.name)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2"
                      >
                        <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {u.name[0]}
                        </div>
                        {u.name}
                      </button>
                    ))}
                  </div>
                )}
                <input
                  ref={inputRef}
                  type="text"
                  value={message}
                  onChange={handleMessageChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setShowMentionMenu(false)
                    if (e.key === 'Enter' && !e.shiftKey && !showMentionMenu) sendMessage()
                  }}
                  placeholder="メッセージを入力（@でメンション）"
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                />
                <button
                  onClick={sendMessage}
                  disabled={sending || uploading || (!message.trim() && !pendingFile)}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white p-2 rounded-lg transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-4 px-1">
                <button
                  onClick={() => { setMessage(m => m + '@'); inputRef.current?.focus() }}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700"
                >
                  <AtSign className="w-4 h-4" /> メンション
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <button
                  onClick={() => { if (fileInputRef.current) { fileInputRef.current.accept = 'image/*'; fileInputRef.current.click() } }}
                  disabled={uploading}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 disabled:opacity-50"
                >
                  <Camera className="w-4 h-4" /> {uploading ? 'アップロード中...' : '写真を追加'}
                </button>
                <button
                  onClick={() => { if (fileInputRef.current) { fileInputRef.current.accept = '.pdf,.xlsx,.xls,.docx,.doc,.txt,.csv'; fileInputRef.current.click() } }}
                  disabled={uploading}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 disabled:opacity-50"
                >
                  <Folder className="w-4 h-4" /> 資料を追加
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-slate-50">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">ルームを選択してください</p>
            </div>
          </div>
        )}
      </div>

      {/* New Room Modal */}
      {showNewRoom && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">ルームを作成</h2>
              <button onClick={() => setShowNewRoom(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ルーム名 *</label>
                <input type="text" value={roomForm.name} onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="例: 現場連絡" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">案件 *</label>
                <select value={roomForm.projectId} onChange={(e) => setRoomForm({ ...roomForm, projectId: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">選択してください</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.projectNumber} - {p.name}</option>)}
                </select>
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={creatingRoom} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 rounded-lg text-sm font-medium">
                  {creatingRoom ? '作成中...' : '作成する'}
                </button>
                <button type="button" onClick={() => setShowNewRoom(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-sm font-medium">キャンセル</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
