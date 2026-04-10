import { useState, useRef, useEffect } from 'react'
import './App.css'

// ─── Ruffle Types ─────────────────────────────────────────────────────────
declare global {
  interface Window {
    RufflePlayer: { create(): RuffleInstance }
  }
}
interface RuffleInstance {
  load(config: { url?: string; swf?: string; allowScriptAccess?: boolean }): void
  appendTo(el: HTMLElement): void
  on(event: string, cb: () => void): void
}

// ─── URL History ─────────────────────────────────────────────────────────
const HISTORY_KEY = 'flash_history'
function loadHistory(): string[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') } catch { return [] }
}
function saveHistory(url: string) {
  const h = loadHistory().filter(u => u !== url)
  h.unshift(url)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, 20)))
}

// ─── Ruffle Loader ─────────────────────────────────────────────────────
async function loadRuffle(): Promise<typeof window.RufflePlayer> {
  if ((window as any).RufflePlayer) return (window as any).RufflePlayer
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://unpkg.com/@ruffle-rs/ruffle@0.1.0-nightly.2025.1.18/ruffle.js'
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Ruffle 加载失败'))
    document.head.appendChild(s)
  })
  return (window as any).RufflePlayer
}

// ─── Key Layout ─────────────────────────────────────────────────────────
type KeyLabel = string
const ROWS: KeyLabel[][] = [
  ['`','1','2','3','4','5','6','7','8','9','0','-','=','⌫'],
  ['Tab','q','w','e','r','t','y','u','i','o','p','[',']','\\'],
  ['Caps','a','s','d','f','g','h','j','k','l',';',"'",'Enter'],
  ['⇧','z','x','c','v','b','n','m',',','.','/','⇧'],
  ['ABC','123','🌐','','','⌽','','','↑',''],
]

// ─── Game Controls ─────────────────────────────────────────────────────
function GameControls({ onKey }: { onKey: (k: string) => void }) {
  const btn = (label: string, key: string) => (
    <button className="ctrl-btn"
      onMouseDown={e => { e.preventDefault(); onKey(key) }}
      onTouchStart={e => { e.preventDefault(); onKey(key) }}>
      {label}
    </button>
  )
  return (
    <div className="game-controls">
      {btn('◀', 'ArrowLeft')}
      {btn('▶▶', 'ArrowRight')}
      {btn('▲', 'ArrowUp')}
      {btn('▼', 'ArrowDown')}
      {btn('⏸', ' ')}
      {btn('Esc', 'Escape')}
      {btn('Tab', 'Tab')}
    </div>
  )
}

// ─── Virtual Keyboard ───────────────────────────────────────────────────
function VirtualKeyboard({ visible, mode, onInput, onKey, onModeChange, onClose }: {
  visible: boolean
  mode: 'text' | 'keys'
  onInput: (t: string) => void
  onKey: (k: string) => void
  onModeChange: (m: 'text' | 'keys') => void
  onClose: () => void
}) {
  const [shift, setShift] = useState(false)
  const [caps, setCaps] = useState(false)

  function handleKey(k: KeyLabel) {
    if (k === '⌫') { onKey('Backspace'); return }
    if (k === 'Tab') { onKey('Tab'); return }
    if (k === 'Enter') { onKey('Enter'); return }
    if (k === '⇧') { const s = !shift; setShift(s); setCaps(s); return }
    if (k === 'Caps') { const c = !caps; setCaps(c); setShift(false); return }
    if (k === ' ') { onKey(' '); return }
    if (k === 'ABC') { onModeChange('keys'); return }
    if (k === '123') { onModeChange('text'); return }
    if (k === '⌽') { onClose(); return }
    if (k === '') return

    const upper = shift || caps
    const char = upper ? k.toUpperCase() : k
    onKey(char)
    if (shift) { setShift(false) }
  }

  if (!visible) return null

  if (mode === 'text') {
    return (
      <div className="vkeyboard">
        <div className="vk-header">
          <span className="vk-mode-tag">123 符号</span>
          <button className="vk-close" onClick={onClose}>✕</button>
        </div>
        <div className="vk-numpad">
          {['1','2','3','4','5','6','7','8','9','0','+','-','*','/','.','@','_','(',')','[',']','{','}','|',':','"','<','>','#','%','^','&'].map(s => (
            <button key={s} className="num-btn" onClick={() => onInput(s)}>{s}</button>
          ))}
          <button className="num-btn back" onClick={() => onKey('⌫')}>⌫</button>
          <button className="num-btn space" onClick={() => onInput(' ')}>空格</button>
          <button className="num-btn enter" onClick={() => onKey('Enter')}>确认</button>
        </div>
      </div>
    )
  }

  return (
    <div className="vkeyboard">
      <div className="vk-header">
        <span className="vk-mode-tag">ABC 键盘</span>
        <button className="vk-close" onClick={onClose}>✕</button>
      </div>
      <div className="vk-keys">
        {ROWS.map((row, ri) => (
          <div key={ri} className="vk-row">
            {row.map((k, ki) => {
              const isWide = ['Tab','Caps','⇧','Enter','\\','⌽'].includes(k)
              const isExtra = k === ''
              return (
                <button
                  key={ki}
                  className={[
                    'vk-key',
                    isWide ? 'wide' : '',
                    isExtra ? 'extra' : '',
                    k === '⌽' ? 'close' : '',
                    k === '⌫' ? 'backspace' : '',
                    shift && k !== '⇧' && k !== '' ? 'shifted' : '',
                  ].filter(Boolean).join(' ')}
                  onMouseDown={e => { e.preventDefault(); handleKey(k) }}
                  onTouchStart={e => { e.preventDefault(); handleKey(k) }}
                >
                  {k === '⌫' ? '⌫' : k === '⇧' ? (shift ? '⬆' : '⇧') : k === 'Enter' ? '确认' : k}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── URL Bar ─────────────────────────────────────────────────────────────
function UrlBar({ url, onNavigate, history }: {
  url: string
  onNavigate: (u: string) => void
  history: string[]
}) {
  const [focused, setFocused] = useState(false)
  const [input, setInput] = useState(url)

  function go() {
    let u = input.trim()
    if (!u) return
    if (!u.startsWith('http://') && !u.startsWith('https://')) u = 'https://' + u
    onNavigate(u)
    setFocused(false)
  }

  function display(u: string) {
    return u.replace(/^https?:\/\//, '').slice(0, 42)
  }

  return (
    <div className="url-bar">
      <button className="nav-btn" onClick={() => onNavigate('')}>↺</button>
      <div className="url-input-wrap">
        <input
          className="url-input"
          value={focused ? input : (url ? display(url) : '输入网址访问 Flash 游戏...')}
          onFocus={() => { setFocused(true); setInput(url || '') }}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && go()}
        />
        {focused && history.length > 0 && (
          <div className="url-history">
            {history.map((h, i) => (
              <button key={i} className="history-item"
                onMouseDown={() => { setInput(h); onNavigate(h); setFocused(false) }}>
                {display(h)}
              </button>
            ))}
          </div>
        )}
      </div>
      <button className="go-btn" onClick={go}>→</button>
    </div>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────
export default function App() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showKeyboard, setShowKeyboard] = useState(false)
  const [keyboardMode, setKeyboardMode] = useState<'text' | 'keys'>('keys')
  const [history, setHistory] = useState<string[]>(() => loadHistory())
  const [ruffleReady, setRuffleReady] = useState(false)

  const playerRef = useRef<HTMLDivElement>(null)
  const ruffleRef = useRef<RuffleInstance | null>(null)

  // Load Ruffle once
  useEffect(() => {
    loadRuffle().then(() => setRuffleReady(true)).catch(() => {})
  }, [])

  // Navigate
  async function navigate(u: string) {
    if (!u) return
    setLoading(true)
    setError('')
    saveHistory(u)
    setHistory(loadHistory())

    try {
      const Ruffle = await loadRuffle()
      const player = Ruffle.create()
      ruffleRef.current = player
      if (playerRef.current) {
        playerRef.current.innerHTML = ''
        player.appendTo(playerRef.current)
      }
      player.on('loaded', () => setLoading(false))
      player.on('error', () => { setError('Flash 内容加载失败，请检查链接'); setLoading(false) })
      player.load({ url: u, allowScriptAccess: true })
      setUrl(u)
      setShowKeyboard(false)
    } catch (e: unknown) {
      setError('加载失败')
      setLoading(false)
    }
  }

  // Send key to Flash
  function sendKey(key: string) {
    if (!playerRef.current) return
    const el = playerRef.current
    const ev = new KeyboardEvent('keydown', { key, bubbles: true })
    const ev2 = new KeyboardEvent('keyup', { key, bubbles: true })
    el.dispatchEvent(ev)
    setTimeout(() => el.dispatchEvent(ev2), 50)
  }

  function sendText(text: string) {
    if (!playerRef.current) return
    playerRef.current.dispatchEvent(new InputEvent('input', { data: text, bubbles: true }))
  }

  const hasContent = url.length > 0

  return (
    <div className="app">
      <UrlBar url={url} onNavigate={navigate} history={history} />

      <div className="content">
        {loading && (
          <div className="loading-state">
            <div className="spinner-large" />
            <p>正在加载 Flash 内容...</p>
            {ruffleReady && <p className="sub">Ruffle 已就绪</p>}
          </div>
        )}

        {error && (
          <div className="error-state">
            <p>❌ {error}</p>
            <button className="retry-btn" onClick={() => navigate(url)}>重试</button>
          </div>
        )}

        {!hasContent && !loading && !error && (
          <div className="home-state">
            <div className="home-logo">🎮</div>
            <h2>Flash 游戏浏览器</h2>
            <p>输入 .swf 链接或游戏页面地址</p>
            <div className="quick-links">
              <p className="ql-title">快捷入口</p>
              {[
                ['Crazy Games', 'https://www.crazygames.com/'],
                ['Miniclip', 'https://www.miniclip.com/games/en/'],
                ['Kongregate', 'https://www.kongregate.com/'],
                ['Addicting Games', 'https://www.addictinggames.com/'],
                ['Armor Games', 'https://www.armorgames.com/'],
                ['Newgrounds', 'https://www.newgrounds.com/'],
              ].map(([name, link]) => (
                <button key={link} className="ql-btn" onClick={() => navigate(link)}>{name}</button>
              ))}
            </div>
            <p className="tip">💡 提示：输入 .swf 文件直链效果最佳</p>
          </div>
        )}

        <div ref={playerRef} id="ruffle-container" className="ruffle-container" />
      </div>

      {/* Bottom bar */}
      {hasContent && (
        <div className="bottom-bar">
          <button className="bar-btn" onClick={() => navigate(url)}>↻</button>
          <button className="bar-btn" onClick={() => setShowKeyboard(s => !s)}>
            {showKeyboard ? '⌨️' : '⌨️'}
          </button>
          <GameControls onKey={sendKey} />
        </div>
      )}

      <VirtualKeyboard
        visible={showKeyboard}
        mode={keyboardMode}
        onInput={sendText}
        onKey={sendKey}
        onModeChange={setKeyboardMode}
        onClose={() => setShowKeyboard(false)}
      />
    </div>
  )
}
