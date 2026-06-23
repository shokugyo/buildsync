'use client'

import { useState, useEffect, useCallback } from 'react'
import Header from '@/components/Header'
import {
  FolderOpen,
  Folder,
  FolderPlus,
  ChevronRight,
  ChevronDown,
  Plus,
  Pencil,
  Trash2,
  Download,
  File,
  FileText,
  X,
  Check,
} from 'lucide-react'

interface DocumentFolder {
  id: string
  name: string
  parentId: string | null
  projectId: string | null
  companyId: string
  createdAt: string
  children?: DocumentFolder[]
}

interface Document {
  id: string
  name: string
  fileName: string
  fileUrl: string
  fileSize: number | null
  mimeType: string | null
  folderId: string | null
  projectId: string | null
  uploadedBy: string
  companyId: string
  createdAt: string
  deletedAt: string | null
  uploader: { name: string }
  folder: { name: string } | null
  project: { name: string; projectNumber: string } | null
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

function getFileIcon(mimeType: string | null, fileName: string) {
  const name = fileName.toLowerCase()
  if (/\.(jpg|jpeg|png|gif|webp)$/.test(name)) return <File className="w-4 h-4 text-blue-400" />
  if (/\.pdf$/.test(name)) return <FileText className="w-4 h-4 text-red-500" />
  if (/\.(doc|docx)$/.test(name)) return <FileText className="w-4 h-4 text-blue-600" />
  if (/\.(xls|xlsx)$/.test(name)) return <FileText className="w-4 h-4 text-green-600" />
  return <File className="w-4 h-4 text-slate-400" />
}

function buildTree(folders: DocumentFolder[]): DocumentFolder[] {
  const map: Record<string, DocumentFolder> = {}
  folders.forEach(f => (map[f.id] = { ...f, children: [] }))
  const roots: DocumentFolder[] = []
  folders.forEach(f => {
    if (f.parentId && map[f.parentId]) {
      map[f.parentId].children!.push(map[f.id])
    } else {
      roots.push(map[f.id])
    }
  })
  return roots
}

function getBreadcrumb(
  folders: DocumentFolder[],
  folderId: string | null
): DocumentFolder[] {
  if (!folderId) return []
  const map: Record<string, DocumentFolder> = {}
  folders.forEach(f => (map[f.id] = f))
  const path: DocumentFolder[] = []
  let current = map[folderId]
  while (current) {
    path.unshift(current)
    current = current.parentId ? map[current.parentId] : null!
  }
  return path
}

interface FolderNodeProps {
  folder: DocumentFolder
  selectedId: string | null
  onSelect: (id: string) => void
  onRename: (folder: DocumentFolder) => void
  onDelete: (folder: DocumentFolder) => void
  onCreateChild: (parentId: string) => void
}

function FolderNode({ folder, selectedId, onSelect, onRename, onDelete, onCreateChild }: FolderNodeProps) {
  const [expanded, setExpanded] = useState(false)
  const hasChildren = folder.children && folder.children.length > 0
  const isSelected = selectedId === folder.id

  return (
    <div>
      <div
        className={`flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer group text-sm select-none ${
          isSelected ? 'bg-blue-100 text-blue-700' : 'hover:bg-slate-100 text-slate-700'
        }`}
        onClick={() => {
          onSelect(folder.id)
          if (hasChildren) setExpanded(e => !e)
        }}
      >
        <button
          className="p-0.5 flex-shrink-0"
          onClick={e => { e.stopPropagation(); setExpanded(e2 => !e2) }}
        >
          {hasChildren
            ? expanded
              ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            : <span className="w-3.5 h-3.5 inline-block" />}
        </button>
        {expanded || isSelected
          ? <FolderOpen className="w-4 h-4 text-amber-500 flex-shrink-0" />
          : <Folder className="w-4 h-4 text-amber-500 flex-shrink-0" />}
        <span className="flex-1 truncate">{folder.name}</span>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            title="サブフォルダを作成"
            onClick={e => { e.stopPropagation(); onCreateChild(folder.id) }}
            className="p-1 rounded hover:bg-slate-200"
          >
            <FolderPlus className="w-3.5 h-3.5 text-slate-500" />
          </button>
          <button
            title="名前を変更"
            onClick={e => { e.stopPropagation(); onRename(folder) }}
            className="p-1 rounded hover:bg-slate-200"
          >
            <Pencil className="w-3.5 h-3.5 text-slate-500" />
          </button>
          <button
            title="削除"
            onClick={e => { e.stopPropagation(); onDelete(folder) }}
            className="p-1 rounded hover:bg-red-100"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
          </button>
        </div>
      </div>
      {expanded && hasChildren && (
        <div className="ml-5 border-l border-slate-200 pl-1 mt-0.5 space-y-0.5">
          {folder.children!.map(child => (
            <FolderNode
              key={child.id}
              folder={child}
              selectedId={selectedId}
              onSelect={onSelect}
              onRename={onRename}
              onDelete={onDelete}
              onCreateChild={onCreateChild}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function DocumentsPage() {
  const [folders, setFolders] = useState<DocumentFolder[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [docsLoading, setDocsLoading] = useState(false)

  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [createParentId, setCreateParentId] = useState<string | null>(null)
  const [savingFolder, setSavingFolder] = useState(false)

  const [renameFolder, setRenameFolder] = useState<DocumentFolder | null>(null)
  const [renameName, setRenameName] = useState('')

  const [showAddFile, setShowAddFile] = useState(false)
  const [fileForm, setFileForm] = useState({ name: '', fileName: '', fileUrl: '' })
  const [savingFile, setSavingFile] = useState(false)

  useEffect(() => {
    fetch('/api/documents/folders')
      .then(r => r.json())
      .then(data => {
        setFolders(Array.isArray(data) ? data : [])
        setLoading(false)
      })
  }, [])

  const loadDocuments = useCallback((folderId: string | null) => {
    setDocsLoading(true)
    const params = new URLSearchParams()
    if (folderId) params.set('folderId', folderId)
    fetch(`/api/documents?${params}`)
      .then(r => r.json())
      .then(data => {
        setDocuments(Array.isArray(data) ? data : [])
        setDocsLoading(false)
      })
  }, [])

  useEffect(() => {
    loadDocuments(selectedFolderId)
  }, [selectedFolderId, loadDocuments])

  const tree = buildTree(folders)
  const breadcrumb = getBreadcrumb(folders, selectedFolderId)

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    setSavingFolder(true)
    const res = await fetch('/api/documents/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newFolderName.trim(), parentId: createParentId }),
    })
    if (res.ok) {
      const created = await res.json()
      setFolders(prev => [...prev, created])
    }
    setSavingFolder(false)
    setShowCreateFolder(false)
    setNewFolderName('')
    setCreateParentId(null)
  }

  const openCreateFolder = (parentId: string | null = null) => {
    setCreateParentId(parentId)
    setNewFolderName('')
    setShowCreateFolder(true)
  }

  const handleRenameFolder = async () => {
    if (!renameFolder || !renameName.trim()) return
    const res = await fetch(`/api/documents/folders/${renameFolder.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: renameName.trim() }),
    })
    if (res.ok) {
      const updated = await res.json()
      setFolders(prev => prev.map(f => f.id === updated.id ? { ...f, name: updated.name } : f))
    }
    setRenameFolder(null)
    setRenameName('')
  }

  const handleDeleteFolder = async (folder: DocumentFolder) => {
    if (!confirm(`フォルダ「${folder.name}」を削除しますか？\n中のファイルは削除されません。`)) return
    const res = await fetch(`/api/documents/folders/${folder.id}`, { method: 'DELETE' })
    if (res.ok) {
      setFolders(prev => prev.filter(f => f.id !== folder.id))
      if (selectedFolderId === folder.id) setSelectedFolderId(null)
    }
  }

  const handleAddFile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fileForm.fileUrl.trim() || !fileForm.name.trim()) return
    setSavingFile(true)
    const res = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: fileForm.name.trim(),
        fileName: fileForm.fileName.trim() || fileForm.name.trim(),
        fileUrl: fileForm.fileUrl.trim(),
        folderId: selectedFolderId,
      }),
    })
    if (res.ok) {
      const created = await res.json()
      setDocuments(prev => [created, ...prev])
    }
    setSavingFile(false)
    setShowAddFile(false)
    setFileForm({ name: '', fileName: '', fileUrl: '' })
  }

  const handleDeleteDoc = async (doc: Document) => {
    if (!confirm(`「${doc.name}」を削除しますか？`)) return
    const res = await fetch(`/api/documents/${doc.id}`, { method: 'DELETE' })
    if (res.ok) setDocuments(prev => prev.filter(d => d.id !== doc.id))
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="ドキュメント管理" />
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: Folder tree */}
        <div className="w-64 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col">
          <div className="p-3 border-b border-slate-200">
            <button
              onClick={() => openCreateFolder(null)}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium"
            >
              <FolderPlus className="w-4 h-4" />
              フォルダ作成
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            <div
              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-sm select-none ${
                selectedFolderId === null ? 'bg-blue-100 text-blue-700' : 'hover:bg-slate-100 text-slate-700'
              }`}
              onClick={() => setSelectedFolderId(null)}
            >
              <FolderOpen className="w-4 h-4 text-slate-400" />
              <span className="font-medium">すべてのファイル</span>
            </div>
            {loading ? (
              <p className="text-xs text-slate-400 px-2 py-2">読み込み中...</p>
            ) : tree.length === 0 ? (
              <p className="text-xs text-slate-400 px-2 py-2">フォルダがありません</p>
            ) : (
              tree.map(folder => (
                <FolderNode
                  key={folder.id}
                  folder={folder}
                  selectedId={selectedFolderId}
                  onSelect={id => setSelectedFolderId(id)}
                  onRename={f => { setRenameFolder(f); setRenameName(f.name) }}
                  onDelete={handleDeleteFolder}
                  onCreateChild={parentId => openCreateFolder(parentId)}
                />
              ))
            )}
          </div>
        </div>

        {/* Right panel: File list */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
          {/* Breadcrumb + actions */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-white">
            <nav className="flex items-center gap-1 text-sm text-slate-500">
              <button
                onClick={() => setSelectedFolderId(null)}
                className="hover:text-blue-600 transition-colors"
              >
                ドキュメント
              </button>
              {breadcrumb.map((f, i) => (
                <span key={f.id} className="flex items-center gap-1">
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                  <button
                    onClick={() => setSelectedFolderId(f.id)}
                    className={`hover:text-blue-600 transition-colors ${
                      i === breadcrumb.length - 1 ? 'font-semibold text-slate-800' : ''
                    }`}
                  >
                    {f.name}
                  </button>
                </span>
              ))}
            </nav>
            <button
              onClick={() => {
                setFileForm({ name: '', fileName: '', fileUrl: '' })
                setShowAddFile(true)
              }}
              className="flex items-center gap-2 bg-slate-700 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              ファイル追加
            </button>
          </div>

          {/* File table */}
          <div className="flex-1 overflow-y-auto p-5">
            {docsLoading ? (
              <div className="text-center text-slate-400 py-12">読み込み中...</div>
            ) : documents.length === 0 ? (
              <div className="text-center py-16">
                <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">このフォルダにファイルがありません</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">ファイル名</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">サイズ</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">アップロード日</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">アップロード者</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {documents.map(doc => (
                      <tr key={doc.id} className="hover:bg-slate-50 group">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {getFileIcon(doc.mimeType, doc.fileName)}
                            <div>
                              <p className="text-sm font-medium text-slate-800">{doc.name}</p>
                              <p className="text-xs text-slate-400">{doc.fileName}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">
                          {formatBytes(doc.fileSize)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">
                          {formatDate(doc.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">
                          {doc.uploader.name}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              download
                              className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-800 px-2 py-1 rounded border border-slate-200 hover:border-slate-400 bg-white hover:bg-slate-50 transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" />
                              ダウンロード
                            </a>
                            <button
                              onClick={() => handleDeleteDoc(doc)}
                              className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded border border-red-200 hover:border-red-400 bg-white hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              削除
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create folder modal */}
      {showCreateFolder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">
                {createParentId
                  ? `サブフォルダを作成`
                  : 'フォルダを作成'}
              </h2>
              <button onClick={() => setShowCreateFolder(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            {createParentId && (
              <p className="text-xs text-slate-500 mb-3">
                親フォルダ: {folders.find(f => f.id === createParentId)?.name}
              </p>
            )}
            <input
              type="text"
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}
              placeholder="フォルダ名"
              autoFocus
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={handleCreateFolder}
                disabled={savingFolder || !newFolderName.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-2 rounded-lg text-sm font-medium"
              >
                {savingFolder ? '作成中...' : '作成'}
              </button>
              <button
                onClick={() => setShowCreateFolder(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-sm font-medium"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename folder modal */}
      {renameFolder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">フォルダ名を変更</h2>
              <button onClick={() => setRenameFolder(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <input
              type="text"
              value={renameName}
              onChange={e => setRenameName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRenameFolder()}
              autoFocus
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={handleRenameFolder}
                disabled={!renameName.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-2 rounded-lg text-sm font-medium"
              >
                変更
              </button>
              <button
                onClick={() => setRenameFolder(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-sm font-medium"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add file modal */}
      {showAddFile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">ファイルを追加</h2>
              <button onClick={() => setShowAddFile(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            {selectedFolderId && (
              <p className="text-xs text-slate-500 mb-3">
                フォルダ: {breadcrumb.map(f => f.name).join(' / ')}
              </p>
            )}
            <form onSubmit={handleAddFile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">表示名 *</label>
                <input
                  type="text"
                  value={fileForm.name}
                  onChange={e => setFileForm(f => ({ ...f, name: e.target.value }))}
                  required
                  placeholder="例: 設計図書 v2"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ファイル名</label>
                <input
                  type="text"
                  value={fileForm.fileName}
                  onChange={e => setFileForm(f => ({ ...f, fileName: e.target.value }))}
                  placeholder="例: design_v2.pdf"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ファイルURL *</label>
                <input
                  type="url"
                  value={fileForm.fileUrl}
                  onChange={e => setFileForm(f => ({ ...f, fileUrl: e.target.value }))}
                  required
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={savingFile}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-2 rounded-lg text-sm font-medium"
                >
                  {savingFile ? '追加中...' : '追加する'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddFile(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-sm font-medium"
                >
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
