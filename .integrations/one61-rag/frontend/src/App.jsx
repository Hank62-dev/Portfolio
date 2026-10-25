import { useCallback, useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import AssistantText from './AssistantText.mjs';
import { STORAGE_KEY, loadWorkspace, newConversation, requestChat, requestJson, validateFile } from './data.mjs';

const prompts = [
  { icon: 'box', color: 'blue', title: 'Tra cứu vận đơn', description: 'Theo dõi hành trình, nắm bắt trạng thái', text: 'Đơn hàng TRK0001617 hiện đang ở đâu?' },
  { icon: 'file', color: 'violet', title: 'Hỏi đáp tài liệu', description: 'Biến kiến thức thành câu trả lời', text: 'Quy trình đóng gói hàng dễ vỡ yêu cầu những vật tư gì?' },
  { icon: 'shield', color: 'green', title: 'Chính sách & quy trình', description: 'Hiểu đúng quy định, xử lý nhanh hơn', text: 'Hàng hóa bị vỡ khi không mua bảo hiểm thì được bồi thường như thế nào?' },
  { icon: 'sparkles', color: 'amber', title: 'Phân tích thông minh', description: 'Kết nối dữ liệu với góc nhìn mới', text: 'Đơn TRK0001617 bị trễ giao, theo chính sách tôi có được bồi thường cước không?' },
];
const navigation = [{ id: 'chat', icon: 'chat', label: 'Trợ lý AI' }, { id: 'documents', icon: 'folder', label: 'Tài liệu' }, { id: 'saved', icon: 'bookmark', label: 'Đã lưu' }];
const themes = [
  { id: 'light', icon: 'sun', label: 'Sáng', description: 'Nền sáng, độ tương phản quen thuộc.' },
  { id: 'dark', icon: 'moon', label: 'Tối', description: 'Dịu mắt hơn trong môi trường thiếu sáng.' },
  { id: 'doom', icon: 'doom', label: 'Dr. Doom', description: 'Xanh lục Latveria, bạc kim loại.' },
  { id: 'strange', icon: 'strange', label: 'Dr. Strange', description: 'Đỏ áo choàng, vàng đồng, nền đen than.' },
];
const iconButton = 'inline-flex size-7.5 shrink-0 items-center justify-center rounded-md p-1.25 text-[#979797] hover:bg-[#f3f3f3] hover:text-[#353535] dark:hover:bg-[#333333] doom:hover:bg-[#233429] strange:hover:bg-[#2d2b27] dark:hover:text-[#e7e7e7] disabled:cursor-not-allowed disabled:opacity-45';
const primaryButton = 'inline-flex shrink-0 items-center justify-center gap-1.75 rounded-[7px] bg-[#065908] doom:bg-[#32763a] strange:bg-[#a13732] doom:hover:bg-[#408a47] strange:hover:bg-[#bc463c] px-3.25 py-2.5 text-[10px] text-white shadow-sm hover:bg-[#044506] disabled:cursor-not-allowed disabled:opacity-45';
const secondaryButton = 'inline-flex shrink-0 items-center justify-center gap-1.75 rounded-[7px] border border-[#ededed] bg-white px-3.25 py-2.5 text-[10px] text-[#7a7a7a] hover:bg-[#f3f3f3] dark:border-[#3b3b3b] doom:border-[#314337] strange:border-[#403b33] dark:bg-[#2b2b2b] doom:bg-[#1b2b21] strange:bg-[#232522] dark:text-[#ababab] doom:text-[#a9bcad] strange:text-[#bfb7a8] dark:hover:bg-[#333333] doom:hover:bg-[#233429] strange:hover:bg-[#2d2b27]';
const logo = 'relative inline-flex shrink-0 items-center justify-center bg-[linear-gradient(145deg,#247326,#065908_70%,#044506)] doom:bg-[linear-gradient(145deg,#d4ddd5,#718779_45%,#34463a)] strange:bg-[linear-gradient(145deg,#bc493c,#702b25_45%,#351b18)] doom:text-[#082213] strange:text-[#ffdda3] text-white shadow-[inset_0_1px_1px_#ffffff60,0_3px_6px_#06590828]';
const spinner = 'inline-block size-4 shrink-0 animate-spin rounded-full border-2 border-[#c6c6c650] border-t-[#a4a4a4] motion-reduce:animate-none';
const suggestionColors = {
  blue: 'bg-[#f0f0f0] text-[#9d9d9d] dark:bg-[#40404066] dark:text-[#c1c1c1] strange:bg-[#263550] strange:text-[#adc8ed]',
  violet: 'bg-[#f3f3f3] text-[#a3a3a3] dark:bg-[#56565666] dark:text-[#c0c0c0] strange:bg-[#472b24] strange:text-[#efb09b]',
  green: 'bg-[#eaf4ef] text-[#72a18a] dark:bg-[#3f605466] dark:text-[#9cc6b2] strange:bg-[#274035] strange:text-[#ade0a7]',
  amber: 'bg-[#fbf3e6] text-[#c9a261] dark:bg-[#68573966] dark:text-[#cfb37d] strange:bg-[#493227] strange:text-[#efc47e]',
};

function readLocal(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function ThemeOptions({ theme, onChange }) {
  return <div className="flex flex-col gap-1" role="group" aria-label="Lựa chọn giao diện">{themes.map(item => <button type="button" key={item.id} aria-pressed={theme === item.id} onClick={() => onChange(item.id)} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left hover:bg-[#f3f3f3] aria-pressed:bg-[#e7f2e8] aria-pressed:text-[#065908] dark:hover:bg-[#333333] dark:aria-pressed:bg-[#2d4030] dark:aria-pressed:text-[#b4d9ae] doom:hover:bg-[#233429] strange:hover:bg-[#2d2b27] doom:aria-pressed:bg-[#2b4933] strange:aria-pressed:bg-[#493227] doom:aria-pressed:text-[#d4e8d0] strange:aria-pressed:text-[#f6d28d]">
    <Icon name={item.icon} size={20} /><span className="min-w-0 flex-1"><strong className="block text-[13px] font-semibold">{item.label}</strong><span className="mt-0.5 block text-[11px] leading-normal text-[#777777] dark:text-[#ababab] doom:text-[#a9bcad] strange:text-[#bfb7a8]">{item.description}</span></span>{theme === item.id && <Icon name="check" size={18} />}
  </button>)}</div>;
}

export default function App() {
  const [conversations, setConversations] = useState(() => {
    const restored = loadWorkspace(readLocal(STORAGE_KEY));
    return restored.length ? restored : [newConversation()];
  });
  const [activeId, setActiveId] = useState(() => conversations[0].id);
  const [view, setView] = useState('chat');
  const [drafts, setDrafts] = useState({});
  const [mode, setMode] = useState('fast');
  const [theme, setTheme] = useState(() => {
    const saved = readLocal('one61.theme');
    return themes.some(item => item.id === saved) ? saved : 'light';
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [pendingId, setPendingId] = useState(null);
  const [typingId, setTypingId] = useState(null);
  const finishTyping = useCallback(() => setTypingId(null), []);
  const [uploading, setUploading] = useState(false);
  const [uploadLabel, setUploadLabel] = useState('');
  const [health, setHealth] = useState(null);
  const [toast, setToast] = useState('');
  const [storageError, setStorageError] = useState(false);
  const [modal, setModal] = useState('');
  const [search, setSearch] = useState('');
  const [now, setNow] = useState(new Date());
  const fileInput = useRef(null);
  const textarea = useRef(null);
  const bottom = useRef(null);
  const dialog = useRef(null);
  const themePicker = useRef(null);
  const controller = useRef(null);
  const active = conversations.find(c => c.id === activeId) || conversations[0];
  const draft = drafts[active.id] || '';
  const typing = view === 'chat' && active.messages.some(message => message.id === typingId);
  const busy = Boolean(pendingId) || typing || uploading;
  const brandIcon = theme === 'doom' || theme === 'strange' ? theme : 'layers';
  const saved = conversations.flatMap(c => c.messages.filter(m => m.saved).map(m => ({ ...m, conversation: c })));

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations)); setStorageError(false); }
    catch { setStorageError(true); }
  }, [conversations]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('one61.theme', theme); } catch { /* Theme still works without storage. */ }
  }, [theme]);

  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        const data = await requestJson('/health', { signal: AbortSignal.timeout(5000) });
        if (alive) setHealth(data.status === 'healthy' ? data : false);
      } catch { if (alive) setHealth(false); }
    };
    check();
    const interval = setInterval(check, 30000);
    const clock = setInterval(() => setNow(new Date()), 60000);
    return () => { alive = false; clearInterval(interval); clearInterval(clock); };
  }, []);

  useEffect(() => {
    const keyboard = e => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault(); setSearch(''); setModal('search');
      }
    };
    window.addEventListener('keydown', keyboard);
    return () => window.removeEventListener('keydown', keyboard);
  }, []);

  useEffect(() => {
    if (modal) dialog.current?.showModal();
    else dialog.current?.close();
  }, [modal]);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'end' }); }, [active.messages.length, pendingId, view]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  function updateConversation(id, transform) {
    setConversations(current => current.map(c => c.id === id ? transform(c) : c));
  }

  function openView(nextView) {
    setTypingId(null); setView(nextView); setSidebarOpen(false);
  }

  function startConversation() {
    const empty = conversations.find(c => !c.messages.length && !c.documents.length && !drafts[c.id]);
    const next = empty || newConversation();
    if (!empty) setConversations(current => [next, ...current]);
    setActiveId(next.id); openView('chat');
    setTimeout(() => textarea.current?.focus(), 0);
  }

  function selectConversation(id) {
    setActiveId(id); openView('chat'); setModal('');
  }

  function fillPrompt(text) {
    setDrafts(current => ({ ...current, [active.id]: text })); openView('chat');
    setTimeout(() => textarea.current?.focus(), 0);
  }

  async function send(event) {
    event?.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    const sessionId = active.id;
    const history = active.messages;
    const userMessage = { id: crypto.randomUUID(), role: 'user', text };
    updateConversation(sessionId, c => ({ ...c, title: c.messages.length ? c.title : text.slice(0, 42), messages: [...c.messages, userMessage] }));
    setDrafts(current => ({ ...current, [sessionId]: '' })); setPendingId(sessionId);
    const abort = new AbortController(); controller.current = abort;
    try {
      const result = await requestChat(sessionId, text, mode, history, AbortSignal.any([abort.signal, AbortSignal.timeout(180000)]));
      const answerId = crypto.randomUUID();
      setTypingId(answerId);
      updateConversation(sessionId, c => ({ ...c, messages: [...c.messages, {
        id: answerId, role: 'assistant', text: result.response.message,
        citations: Array.isArray(result.citations) ? result.citations : [], verification: result.verification,
        metadata: result.metadata, suggestions: Array.isArray(result.response.suggestions) ? result.response.suggestions.filter(s => typeof s === 'string') : [],
      }] }));
    } catch (error) {
      const message = error.name === 'AbortError' ? 'Đã dừng trả lời. Bạn có thể gửi lại câu hỏi.'
        : error.name === 'TimeoutError' ? 'Phản hồi mất quá nhiều thời gian. Hãy thử lại.' : error.message;
      updateConversation(sessionId, c => ({ ...c, messages: [...c.messages, { id: crypto.randomUUID(), role: 'assistant', text: message, error: true, retry: text }] }));
    } finally { setPendingId(null); controller.current = null; }
  }

  async function uploadFiles(files) {
    if (busy || !files.length) return;
    const sessionId = active.id;
    setUploading(true);
    for (const file of files) {
      const invalid = validateFile(file);
      if (invalid) { setToast(`${file.name}: ${invalid}`); continue; }
      setUploadLabel(`Đang xử lý ${file.name}…`);
      try {
        const body = new FormData(); body.append('file', file); body.append('conversation_id', sessionId);
        const result = await requestJson('/api/test/upload', { method: 'POST', body, signal: AbortSignal.timeout(180000) });
        if (typeof result.filename !== 'string' || typeof result.document_id !== 'string') throw new Error('Thông tin tài liệu từ máy chủ không hợp lệ.');
        updateConversation(sessionId, c => ({ ...c, documents: [...c.documents, { ...result, size: file.size, uploadedAt: new Date().toISOString() }] }));
        setToast(`Đã thêm ${result.filename}. Tài liệu sẵn sàng để hỏi đáp.`);
      } catch (error) {
        setToast(`${file.name}: ${error.name === 'TimeoutError' ? 'Hết thời gian tải lên. Hãy thử lại.' : error.message}`);
      }
    }
    setUploading(false); setUploadLabel('');
  }

  async function copy(text) {
    try { await navigator.clipboard.writeText(text); setToast('Đã sao chép câu trả lời.'); }
    catch { setToast('Không thể sao chép. Hãy chọn nội dung và sao chép thủ công.'); }
  }

  function exportWorkspace() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(conversations, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'one61-conversations.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); setToast('Đã xuất lịch sử trò chuyện.');
  }

  function renderMessage(message, conversationId = active.id) {
    return <article key={message.id} className={`mb-6.25 flex items-start gap-3 text-xs leading-[1.9] max-[761px]:gap-2 max-[761px]:text-[11px] ${message.role === 'user' ? 'mt-1 mb-7 justify-end' : ''}`}>
      {message.role === 'assistant' && <div className="flex size-7.5 shrink-0 items-center justify-center rounded-[9px] bg-[linear-gradient(140deg,#428944,#065908)] doom:bg-[linear-gradient(145deg,#d4ddd5,#718779)] strange:bg-[linear-gradient(145deg,#bc493c,#702b25)] doom:text-[#082213] strange:text-[#ffdda3] text-white max-[761px]:size-6.5 max-[761px]:rounded-[7px]"><Icon name={brandIcon} size={18} /></div>}
      <div className={message.role === 'user' ? 'min-w-0 max-w-[85%] flex-[0_1_auto] rounded-[13px_13px_3px_13px] border border-[#eaeaea] bg-[#f1f1f1] px-4.25 py-3 dark:border-[#4b4b4b] dark:bg-[#363636] doom:bg-[#293c2f] strange:bg-[#302a25] max-[761px]:max-w-[92%]' : 'min-w-0 flex-1'}>
        {message.role === 'assistant' && <div className="mb-2.25 pt-0.5 text-[11px] font-[650]">One61 <span className="ml-1.5 text-[8px] font-normal text-[#868686] dark:text-[#929292] doom:text-[#8ca592] strange:text-[#a39a8b]">Trợ lý AI</span></div>}
        <div className={message.error ? 'rounded-md bg-[#b275640a] px-3 py-2.5 text-[#b27564]' : ''}>{message.role === 'assistant' ? <AssistantText text={message.text} animate={view === 'chat' && typingId === message.id && !message.error} onComplete={finishTyping} /> : <div className="whitespace-pre-wrap wrap-anywhere">{message.text}</div>}</div>
        {message.verification && <div className={`mt-3.25 flex flex-wrap items-center gap-1.25 text-[9px] ${message.verification.is_verified ? 'text-[#659b87]' : 'text-[#b99255]'}`}>
          <Icon name="shield" size={14} /> {message.verification.is_verified ? 'Đã đối chiếu nguồn' : 'Cần kiểm tra thêm'}
          {Number.isFinite(message.verification.confidence_score) && <span className="text-[#868686] dark:text-[#929292] doom:text-[#8ca592] strange:text-[#a39a8b]">· {Math.round(message.verification.confidence_score * 100)}% tin cậy</span>}
        </div>}
        {message.verification?.disclaimer && <p className="mt-2 rounded-[5px] bg-[#a9844d0a] px-2.5 py-2 text-[10px] text-[#a4814d]">{message.verification.disclaimer}</p>}
        {message.citations?.length > 0 && <details className="mt-3 rounded-md bg-[#f3f3f3] px-3 py-2 text-[10px] text-[#7a7a7a] dark:bg-[#333333] doom:bg-[#233429] strange:bg-[#2d2b27] dark:text-[#ababab] doom:text-[#a9bcad] strange:text-[#bfb7a8]"><summary className="cursor-pointer"><Icon name="file" size={14} className="mr-1" /> {message.citations.length} nguồn tham khảo</summary>
          {message.citations.map((citation, index) => <div key={index} className="mt-2.5 border-t border-[#ededed] pt-2.5 wrap-anywhere dark:border-[#3b3b3b] doom:border-[#314337] strange:border-[#403b33]"><strong>{citation.source_name || citation.source_id || `Nguồn ${index + 1}`}</strong><AssistantText text={citation.chunk_text} /></div>)}
        </details>}
        {message.role === 'assistant' && !message.error && <div className="mt-2.5 flex items-center gap-0.75">
          <button className="flex items-center rounded-[5px] p-1.25 text-[#868686] hover:bg-[#f3f3f3] dark:text-[#929292] doom:text-[#8ca592] strange:text-[#a39a8b] dark:hover:bg-[#333333] doom:hover:bg-[#233429] strange:hover:bg-[#2d2b27]" title="Sao chép" aria-label="Sao chép câu trả lời" onClick={() => copy(message.text)}><Icon name="copy" size={15} /></button>
          <button className={`flex items-center rounded-[5px] p-1.25 ${message.saved ? 'bg-[#e7f2e8] text-[#065908] dark:bg-[#2d4030] strange:bg-[#493227] dark:text-[#9cce97] strange:text-[#f6d28d]' : 'text-[#868686] hover:bg-[#f3f3f3] dark:text-[#929292] doom:text-[#8ca592] strange:text-[#a39a8b] dark:hover:bg-[#333333] doom:hover:bg-[#233429] strange:hover:bg-[#2d2b27]'}`} title={message.saved ? 'Bỏ lưu' : 'Lưu câu trả lời'} aria-label={message.saved ? 'Bỏ lưu câu trả lời' : 'Lưu câu trả lời'} aria-pressed={Boolean(message.saved)} onClick={() => updateConversation(conversationId, c => ({ ...c, messages: c.messages.map(m => m.id === message.id ? { ...m, saved: !m.saved } : m) }))}><Icon name="bookmark" size={15} /></button>
          {Number.isFinite(message.metadata?.processing_time_ms) && <span className="ml-2 text-[8px] text-[#868686] dark:text-[#929292] doom:text-[#8ca592] strange:text-[#a39a8b]">{(message.metadata.processing_time_ms / 1000).toFixed(1)} giây</span>}
        </div>}
        {message.error && <button className="mt-2 inline-flex items-center gap-1.25 text-[10px] text-[#065908] disabled:cursor-not-allowed disabled:opacity-45 dark:text-[#9cce97] strange:text-[#f6d28d]" onClick={() => fillPrompt(message.retry)} disabled={busy}>Thử lại <Icon name="arrow" size={14} /></button>}
        {view === 'chat' && message.suggestions?.length > 0 && <div className="mt-3.5 flex flex-wrap gap-1.5">{message.suggestions.slice(0, 3).map((suggestion, index) => <button key={index} className="flex items-center gap-2 rounded-[7px] border border-[#ededed] px-2.25 py-1.5 text-left text-[9px] text-[#7a7a7a] hover:bg-[#f3f3f3] dark:border-[#3b3b3b] doom:border-[#314337] strange:border-[#403b33] dark:text-[#ababab] doom:text-[#a9bcad] strange:text-[#bfb7a8] dark:hover:bg-[#333333] doom:hover:bg-[#233429] strange:hover:bg-[#2d2b27]" onClick={() => fillPrompt(suggestion)}>{suggestion}<Icon name="arrow" size={14} /></button>)}</div>}
      </div>
    </article>;
  }

  return <div className="relative h-dvh overflow-hidden font-['Be_Vietnam_Pro',sans-serif] text-[#353535] antialiased selection:bg-[#e3e3e3] selection:text-[#3c3c3c] doom:selection:bg-[#375942] strange:selection:bg-[#614035] doom:selection:text-[#edf5ee] strange:selection:text-[#fff1d8] dark:text-[#e7e7e7] doom:text-[#e2ebe3] strange:text-[#f3e9dd] [&_button]:cursor-pointer [&_button]:transition [&_button]:duration-200 [&_:is(button,input,select,summary):focus-visible]:outline-2 [&_:is(button,input,select,summary):focus-visible]:outline-offset-4 [&_:is(button,input,select,summary):focus-visible]:outline-[#737373] dark:[&_:is(button,input,select,summary):focus-visible]:outline-[#bcbcbc] doom:[&_:is(button,input,select,summary):focus-visible]:outline-[#92ba91] strange:[&_:is(button,input,select,summary):focus-visible]:outline-[#e5b86e] motion-reduce:**:animate-none motion-reduce:**:transition-none">
    <section aria-label="One61 Workspace" className="flex h-full flex-col overflow-hidden bg-[#f3f3f3] dark:bg-[#292929] doom:bg-[#132019] strange:bg-[#1b1d1b]">
      <header className="relative z-2 flex h-7.75 shrink-0 items-center justify-between border-b border-[#ededed] bg-[#ffffff2d] px-6.25 text-[11px] text-[#444444] backdrop-blur-xl dark:border-[#3b3b3b] doom:border-[#314337] strange:border-[#403b33] dark:bg-[#18181866] doom:bg-[#0b150fbb] strange:bg-[#151715e8] dark:text-[#d0d0d0] doom:text-[#c7d7cb] strange:text-[#ded5c4] max-[761px]:h-7.5 max-[761px]:px-3.5">
        <div className="flex items-center gap-5.25 max-[761px]:gap-2.5"><Icon name={brandIcon} size={18} className="-mr-1" /><strong className="text-xs font-bold">One61</strong><span className="max-[761px]:hidden">Không gian làm việc</span></div>
        <div className="flex items-center gap-3.75 text-[10px] font-medium max-[761px]:text-[9px]"><span className="flex items-center gap-1.5 max-[761px]:hidden"><Icon name="moon" size={13} /> Tập trung</span><Icon name="wifi" size={17} className="max-[761px]:hidden" /><Icon name="battery" size={22} className="max-[761px]:hidden" /><button className="flex p-0.5 max-[761px]:hidden" aria-label="Cài đặt nhanh" title="Cài đặt" onClick={() => setModal('settings')}><Icon name="sliders" size={17} /></button><time className="min-w-33.75 text-right max-[761px]:min-w-0" dateTime={now.toISOString()}>{new Intl.DateTimeFormat('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(now)}</time></div>
      </header>
      <div className="relative flex min-h-0 flex-1">
        {sidebarOpen && <button className="absolute inset-0 z-6 hidden bg-[#29292925] max-[761px]:block" aria-label="Đóng thanh bên" onClick={() => setSidebarOpen(false)} />}
        <aside aria-label="Thanh bên" className={`w-59.5 shrink-0 flex-col border-r border-[#dbdbdb66] px-4.25 dark:border-[#3b3b3b] doom:border-[#314337] strange:border-[#403b33] tablet:w-53.25 tablet:px-3.25 ${sidebarHidden ? 'hidden' : 'flex'} ${sidebarOpen ? 'max-[761px]:absolute max-[761px]:inset-y-0 max-[761px]:left-0 max-[761px]:z-7 max-[761px]:flex max-[761px]:bg-[#f3f3f3de] max-[761px]:shadow-[15px_0_40px_#3c3c3c20] max-[761px]:backdrop-blur-[30px] dark:max-[761px]:bg-[#292929ed] strange:max-[761px]:bg-[#1b1d1bf2]' : 'max-[761px]:hidden'}`}>
          <div aria-hidden="true" className="flex h-13 shrink-0 items-center gap-2 px-1.25">
            <span className="size-3 rounded-full bg-[#ff6059]" />
            <span className="size-3 rounded-full bg-[#ffbd2e]" />
            <span className="size-3 rounded-full bg-[#29c840]" />
          </div>
          <div className="flex items-center gap-2.5 px-1.5 pt-1.75 pb-6.5 compact:pb-4.5"><span className={`${logo} size-9.5 rounded-[11px]`}><Icon name={brandIcon} size={23} /></span><span className="flex items-center gap-2.25 text-[27px] font-[750] tracking-[-1.4px]">one61<span className="rounded-[5px] border border-[#c7c7c7] px-1.25 text-[9px] leading-4.25 font-semibold tracking-[.2px] text-[#8e8e8e] dark:text-[#d8d8d8]">AI</span></span></div>
          <button className="flex w-full shrink-0 items-center justify-center gap-2.25 rounded-lg border border-[#065908] bg-[#065908] doom:border-[#32763a] strange:border-[#a13732] doom:bg-[#32763a] strange:bg-[#a13732] doom:hover:bg-[#408a47] strange:hover:bg-[#bc463c] px-1.5 py-2.75 text-[11px] font-[550] text-white shadow-sm hover:bg-[#044506] tablet:text-[10px]" onClick={startConversation}><Icon name="plus" size={17} /> Cuộc trò chuyện mới</button>
          <button className="flex w-full shrink-0 items-center gap-2.25 px-2.5 pt-4.25 pb-3.75 text-[11px] text-[#828282] dark:text-[#ababab] doom:text-[#a9bcad] strange:text-[#bfb7a8]" onClick={() => { setSearch(''); setModal('search'); }}><Icon name="search" size={16} /><span>Tìm kiếm</span><kbd className="ml-auto rounded border border-[#d3d3d388] px-1.25 py-px font-sans text-[10px] font-normal text-[#868686] dark:text-[#ababab] doom:text-[#a9bcad] strange:text-[#bfb7a8]">⌘ K</kbd></button>
          <p className="flex shrink-0 items-center justify-between px-2.25 pt-4.5 pb-2.25 text-[8px] font-semibold tracking-[1.05px] text-[#7a7a7a] dark:text-[#ababab] doom:text-[#a9bcad] strange:text-[#bfb7a8]">KHÔNG GIAN LÀM VIỆC</p>
          <nav className="flex shrink-0 flex-col gap-1" aria-label="Điều hướng chính">{navigation.map(item => <button key={item.id} className={`flex w-full items-center gap-2.5 rounded-[7px] px-2.5 py-2.75 text-[11px] ${view === item.id ? 'bg-[#e7f2e8] font-semibold text-[#065908] dark:bg-[#2d4030] strange:bg-[#493227] dark:text-[#9cce97] strange:text-[#f6d28d]' : 'text-[#6e6e6e] hover:bg-[#dedede80] dark:text-[#ababab] doom:text-[#a9bcad] strange:text-[#bfb7a8] dark:hover:bg-[#48484860] strange:hover:bg-[#49322766]'}`} onClick={() => openView(item.id)} aria-current={view === item.id ? 'page' : undefined}><Icon name={item.icon} size={18} /><span>{item.label}</span>{item.id === 'chat' && <span className="ml-auto rounded border border-[#cfcfcf] px-1 text-[8px] leading-3.5 text-[#8e8e8e] dark:text-[#d8d8d8]">AI</span>}{item.id === 'documents' && active.documents.length > 0 && <span className="ml-auto text-[10px] text-[#9a9a9a]">{active.documents.length}</span>}{item.id === 'saved' && saved.length > 0 && <span className="ml-auto text-[10px] text-[#9a9a9a]">{saved.length}</span>}</button>)}</nav>
          <div className="mt-1.75 min-h-13.5 flex-1 overflow-y-auto"><p className="mb-1 flex items-center justify-between px-2.25 pt-4.75 pb-2.25 text-[8px] font-semibold tracking-[1.05px] text-[#7a7a7a] dark:text-[#ababab] doom:text-[#a9bcad] strange:text-[#bfb7a8]">GẦN ĐÂY <Icon name="clock" size={12} /></p>
            {conversations.filter(c => c.messages.length || c.documents.length).length ? conversations.filter(c => c.messages.length || c.documents.length).map(c => <button key={c.id} className={`flex w-full items-center gap-2.25 rounded-md p-2.5 text-left text-[10px] ${c.id === active.id && view === 'chat' ? 'bg-[#e4e4e480] text-[#747474] dark:bg-[#48484845] strange:bg-[#49322766] dark:text-[#c4c4c4] strange:text-[#ded5c4]' : 'text-[#888888] hover:bg-[#dedede80] dark:text-[#ababab] doom:text-[#a9bcad] strange:text-[#bfb7a8] dark:hover:bg-[#48484860] strange:hover:bg-[#49322766]'}`} onClick={() => selectConversation(c.id)} title={c.title}><Icon name="chat" size={14} /><span className="truncate">{c.title}</span></button>) : <p className="px-2.5 py-1 text-[10px] leading-[1.9] text-[#7a7a7a] dark:text-[#ababab] doom:text-[#a9bcad] strange:text-[#bfb7a8]">Những cuộc trò chuyện của bạn<br />sẽ xuất hiện ở đây.</p>}
          </div>
          <div className="shrink-0 pt-4"><div className="mb-4 flex items-start gap-2 rounded-lg border border-[#ffffff85] bg-[linear-gradient(130deg,#ffffff7a,#ededed7a)] px-2.25 py-3 compact:mb-3 dark:border-[#48484866] dark:bg-[#40404033] doom:bg-[#263d2c66] strange:bg-[#49322766] dark:bg-none tablet:gap-1.25 tablet:px-1.75 tablet:py-2.75"><span className="pt-0.5 text-[#9e9e9e]"><Icon name="sparkles" size={18} /></span><div><strong className="text-[9px] font-[550] tablet:text-[8px]">Ít tìm kiếm. Nhiều câu trả lời.</strong><p className="mt-1.5 text-[8px] leading-normal text-[#9a9a9a] tablet:text-[7px]">Tri thức của bạn, luôn trong tầm tay.</p></div></div>
            <button className="-ml-4.25 flex w-[calc(100%+34px)] items-center gap-2.25 border-t border-[#e2e2e2] p-4.25 text-left dark:border-[#3b3b3b] doom:border-[#314337] strange:border-[#403b33] tablet:-ml-3.25 tablet:w-[calc(100%+26px)] tablet:px-3.25 tablet:py-3.75" onClick={() => setModal('settings')}><span className="inline-flex size-7.75 shrink-0 items-center justify-center rounded-full border-2 border-[#ffffff66] bg-[linear-gradient(120deg,#dddddd,#cccccc)] text-xs font-semibold text-[#7b7b7b] dark:border-[#85858544] dark:bg-[#494949] dark:bg-none dark:text-[#c9c9c9]">B</span><span className="flex-1"><strong className="block text-[10px] font-[550]">Không gian cá nhân</strong><small className="mt-1.25 flex items-center gap-1 text-[8px] text-[#989898]"><i className={`inline-block size-1.25 shrink-0 rounded-full ${health ? 'bg-[#68a88f]' : 'bg-[#bd945d]'}`} />{health === null ? 'Đang kết nối…' : health ? 'Đã kết nối máy chủ' : 'Chưa kết nối máy chủ'}</small></span><Icon name="settings" size={17} className="text-[#989898]" /></button>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col bg-[#fcfcfc] dark:bg-[#202020] doom:bg-[#0e1712] strange:bg-[#111311]">
          <header className="flex h-14.5 shrink-0 items-center justify-between gap-3 border-b border-[#ededed] px-6 dark:border-[#3b3b3b] doom:border-[#314337] strange:border-[#403b33] max-[761px]:h-12.5 max-[761px]:px-3"><div className="flex items-center gap-3.75 overflow-hidden text-[10px] max-[761px]:gap-2.5"><button className={iconButton} aria-label="Ẩn hoặc hiện thanh bên" onClick={() => { if (window.matchMedia('(width < 761px)').matches) setSidebarOpen(!sidebarOpen); else setSidebarHidden(!sidebarHidden); }}><Icon name="sidebar" size={19} /></button><span className="h-3.5 w-px bg-[#ededed] dark:bg-[#3b3b3b] max-[761px]:hidden" /><span className="whitespace-nowrap text-[#999999] max-[761px]:hidden">Không gian cá nhân</span><Icon name="chevron" size={12} className="text-[#bcbcbc] max-[761px]:hidden" /><strong className="shrink-0 font-[550]">{navigation.find(n => n.id === view)?.label}</strong></div><div className="flex shrink-0 items-center gap-3 text-[10px] max-[761px]:gap-1.25"><span className="mr-1.25 flex items-center gap-1.25 text-[9px] text-[#9e9e9e] tablet:hidden max-[761px]:hidden"><Icon name="shield" size={13} /> Lịch sử trên máy</span><button type="button" className={`${iconButton} [anchor-name:--theme-trigger]`} popoverTarget="theme-picker" title="Chọn giao diện" aria-label="Giao diện"><Icon name={themes.find(item => item.id === theme).icon} size={18} /></button><button className={iconButton} title="Trợ giúp" aria-label="Trợ giúp" onClick={() => setModal('help')}><Icon name="help" size={18} /></button></div></header>
          {storageError && <div role="alert" className="bg-[#fff4e7] px-5 py-2.25 text-[10px] text-[#9b743f]">Không thể lưu lịch sử trên máy. Xuất lịch sử trong Cài đặt trước khi đóng trang.</div>}
          {view === 'chat' && <>
            <div className={`min-h-0 flex-1 overflow-y-auto px-9.5 tablet:px-6.5 max-[761px]:px-5 ${!active.messages.length ? 'flex flex-col pt-6 pb-2.5 compact:pt-3.25 compact:pb-0 max-[761px]:pt-5.25 short-phone:pt-3.5' : 'pt-8 pb-3 max-[761px]:pt-5.25 max-[761px]:pb-2.5'}`}>
              {!active.messages.length ? <div className="m-auto w-full max-w-170.5 pt-3 pb-2 text-center compact:py-0.5 max-[761px]:max-w-120 max-[761px]:pt-0.5 max-[761px]:pb-0">
                <div className="relative mx-auto mb-2.5 flex h-17.5 w-22.5 items-center justify-center compact:mb-3 compact:h-15.5 compact:w-16 max-[761px]:mb-3.5 max-[761px]:size-16.5 short-phone:hidden">
                  <span className="absolute size-21.5 rotate-12 rounded-[28px] border border-[#bebebe26] bg-[#ececec1f] compact:size-16 compact:rounded-[20px] max-[761px]:size-16.75 max-[761px]:rounded-[20px]" /><span className="absolute size-26 rotate-[-14deg] rounded-[28px] border border-[#d0d0d01a] compact:size-19.5 compact:rounded-[20px] max-[761px]:size-20 max-[761px]:rounded-[20px]" />
                  <span className={`${logo} size-16.5 rotate-[-8deg] rounded-[19px] shadow-[inset_0_2px_2px_#ffffff80,0_8px_20px_#06590828,0_2px_4px_#06590820] compact:size-12.25 compact:rounded-[14px] max-[761px]:size-12.75 max-[761px]:rounded-[14px]`}><Icon name={brandIcon} size={35} className="rotate-[8deg] compact:size-7.25 max-[761px]:size-7.25" /></span><span className="absolute right-1 bottom-1 flex size-6 rotate-6 items-center justify-center rounded-lg bg-[#fcfcfc] text-[#a3a3a3] shadow-[0_2px_5px_#66666613] compact:-right-0.5 compact:bottom-0 compact:size-5 compact:rounded-md dark:bg-[#202020] doom:bg-[#0e1712] strange:bg-[#111311] max-[761px]:-right-px max-[761px]:bottom-0 max-[761px]:size-5"><Icon name="sparkles" size={15} /></span>
                </div>
                <div className="mt-2 mb-3 text-[8px] font-[550] tracking-[1.8px] text-[#878787] compact:hidden max-[761px]:hidden">TRỢ LÝ THÔNG MINH CỦA BẠN</div>
                <h1 className="text-[clamp(30px,3.05vw,43px)] leading-[1.32] font-semibold tracking-[-1.5px] text-[#3e3e3e] compact:text-[34px] compact:leading-[1.27] dark:text-[#ededed] max-[761px]:text-[29px] max-[761px]:leading-[1.33] max-[761px]:tracking-[-1px] short-phone:text-[25px]">Hiểu dữ liệu.<br /><span className="bg-[linear-gradient(100deg,#4b4b4b,#606060_60%,#737373)] bg-clip-text text-transparent dark:bg-[linear-gradient(100deg,#dedede,#aeaeae)] doom:bg-[linear-gradient(100deg,#e0e8e1,#8eac96)] strange:bg-[linear-gradient(100deg,#ffe7b3,#d99552)]">Đơn giản mọi việc.</span></h1>
                <p className="mt-3.75 text-[11px] leading-[1.9] text-[#7a7a7a] compact:mt-2.75 compact:text-[10px] dark:text-[#ababab] doom:text-[#a9bcad] strange:text-[#bfb7a8] max-[761px]:mt-3 max-[761px]:text-[10px]">Từ vận đơn đến kiến thức vận hành.<br className="hidden max-[761px]:block" /> Cứ hỏi, One61 sẽ giúp bạn kết nối.</p>
                <div className="mt-6.25 grid grid-cols-2 gap-2.75 text-left compact:mt-5.5 compact:gap-2.25 max-[761px]:mt-6.25 max-[761px]:gap-2.25 short-phone:mt-4.5">{prompts.map(prompt => <button key={prompt.title} className="relative flex min-h-19 items-center gap-3.25 rounded-[10px] border border-[#ebebeb] bg-[linear-gradient(125deg,#fff,#fcfcfc)] px-3.75 py-3.5 text-left shadow-[0_2px_4px_#51515102] hover:-translate-y-0.5 hover:border-[#dadada] hover:shadow-[0_5px_15px_#7474740b] compact:min-h-16 compact:px-3.5 compact:py-2.75 dark:border-[#3b3b3b] doom:border-[#314337] strange:border-[#403b33] dark:bg-[linear-gradient(125deg,#2b2b2b,#202020)] doom:bg-[linear-gradient(125deg,#1b2b21,#111d16)] strange:bg-[linear-gradient(125deg,#232522,#1b1e1a)] tablet:gap-2.25 tablet:p-2.75 max-[761px]:min-h-23.75 max-[761px]:flex-col max-[761px]:items-start max-[761px]:gap-2.25 max-[761px]:p-3 short-phone:min-h-20 short-phone:gap-1.75 short-phone:p-2.5" onClick={() => fillPrompt(prompt.text)}><span className={`inline-flex size-9.25 shrink-0 items-center justify-center rounded-[9px] compact:size-8 compact:rounded-lg max-[761px]:size-7.25 max-[761px]:rounded-[7px] ${suggestionColors[prompt.color]}`}><Icon name={prompt.icon} size={21} className="compact:size-4.75 max-[761px]:size-4.5" /></span><span className="flex min-w-0 flex-col gap-1.75 compact:gap-1.25 max-[761px]:gap-1.25"><strong className="text-[11px] font-[550] whitespace-nowrap tablet:text-[10px] max-[761px]:text-[9px]">{prompt.title}</strong><small className="text-[9px] leading-normal text-[#7a7a7a] dark:text-[#ababab] doom:text-[#a9bcad] strange:text-[#bfb7a8] tablet:text-[8px] max-[761px]:text-[8px] max-[761px]:leading-[1.7] short-phone:hidden">{prompt.description}</small></span><Icon name="arrow" size={15} className="ml-auto text-[#b3b3b3] tablet:w-3 max-[761px]:absolute max-[761px]:top-4.5 max-[761px]:right-2.5 max-[761px]:w-3" /></button>)}</div>
                <p className="mt-4.5 flex items-center justify-center gap-1.5 text-[9px] text-[#7a7a7a] compact:mt-4 compact:text-[8px] dark:text-[#ababab] doom:text-[#a9bcad] strange:text-[#bfb7a8] max-[761px]:mt-4 max-[761px]:gap-1 max-[761px]:text-[8px] short-phone:mt-3.25"><Icon name="paperclip" size={13} /> Có tài liệu riêng? Đính kèm để bắt đầu hỏi đáp.</p>
              </div> : <div className="mx-auto max-w-180" role="log" aria-label="Cuộc trò chuyện" aria-live="polite">{active.messages.map(m => renderMessage(m))}{pendingId === active.id && <div className="mb-6.25 flex items-start gap-3 max-[761px]:gap-2"><div className="flex size-7.5 shrink-0 items-center justify-center rounded-[9px] bg-[linear-gradient(140deg,#428944,#065908)] doom:bg-[linear-gradient(145deg,#d4ddd5,#718779)] strange:bg-[linear-gradient(145deg,#bc493c,#702b25)] doom:text-[#082213] strange:text-[#ffdda3] text-white"><Icon name={brandIcon} size={18} /></div><div className="flex h-7.5 items-center gap-1"><span className="size-1 animate-bounce rounded-full bg-[#b2b2b2]" /><span className="size-1 animate-bounce rounded-full bg-[#b2b2b2] [animation-delay:.15s]" /><span className="size-1 animate-bounce rounded-full bg-[#b2b2b2] [animation-delay:.3s]" /><small className="ml-1.75 text-[9px] text-[#7a7a7a] dark:text-[#ababab] doom:text-[#a9bcad] strange:text-[#bfb7a8]">Đang tìm câu trả lời{mode === 'reasoning' ? ' · Phân tích sâu' : ''}…</small></div></div>}<div ref={bottom} /></div>}
            </div>
            <div className="w-full max-w-205.5 self-center px-9.5 pt-2.5 pb-4.25 compact:pt-3 compact:pb-3.5 tablet:px-6.5 max-[761px]:px-4.25 max-[761px]:pt-2.5 max-[761px]:pb-3.25">
              {active.documents.length > 0 && <button className="mb-2.25 flex items-center gap-1.5 rounded-md bg-[#f3f3f3] px-2.25 py-1.5 text-[9px] text-[#888888] dark:bg-[#333333] doom:bg-[#233429] strange:bg-[#2d2b27] dark:text-[#ababab] doom:text-[#a9bcad] strange:text-[#bfb7a8]" onClick={() => openView('documents')}><Icon name="file" size={14} />{active.documents.length} tài liệu trong cuộc trò chuyện<Icon name="chevron" size={12} /></button>}
              {uploading && <div className="mb-2.25 flex items-center gap-2 text-[10px] text-[#7a7a7a] dark:text-[#ababab] doom:text-[#a9bcad] strange:text-[#bfb7a8]" role="status"><span className={spinner} />{uploadLabel}</div>}
              <form className="rounded-xl border border-[#e6e6e6] bg-white px-4 pt-3.5 pb-2.75 shadow-[0_3px_10px_#4e4e4e05] transition focus-within:border-[#c6c6c6] focus-within:shadow-[0_0_0_3px_#a8a8a80a,0_3px_12px_#4e4e4e06] dark:border-[#3b3b3b] doom:border-[#314337] strange:border-[#403b33] dark:bg-[#262626] doom:bg-[#17251c] strange:bg-[#20231f] max-[761px]:rounded-[10px] max-[761px]:px-3 max-[761px]:pt-3 max-[761px]:pb-2.25" onSubmit={send}>
                <textarea className="block max-h-35 min-h-9 w-full field-sizing-content resize-none border-0 bg-transparent px-px pt-0.5 pb-2.25 text-[11px] leading-[1.8] placeholder:text-[#868686] focus-visible:outline-none dark:placeholder:text-[#929292] doom:placeholder:text-[#8ca592] strange:placeholder:text-[#a39a8b] max-[761px]:min-h-9.75 max-[761px]:text-xs" ref={textarea} value={draft} onChange={e => setDrafts(current => ({ ...current, [active.id]: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }} placeholder="Hỏi bất cứ điều gì về dữ liệu của bạn…" aria-label="Câu hỏi cho One61" maxLength={12000} rows={1} />
                <div className="flex items-center justify-between"><div className="flex items-center gap-2"><button type="button" className={`${iconButton} -ml-1`} title="Đính kèm tài liệu" aria-label="Đính kèm tài liệu" disabled={busy} onClick={() => fileInput.current?.click()}><Icon name="plus" size={20} /></button><span className="mx-0.5 h-3.25 w-px bg-[#ededed] dark:bg-[#3b3b3b]" /><label className="flex items-center gap-1.5 rounded-md bg-[#f8f8f8] px-2 py-1.5 text-[#969696] dark:bg-[#333333] doom:bg-[#233429] strange:bg-[#2d2b27]"><Icon name="sparkles" size={14} /><select className="max-w-32 cursor-pointer border-0 bg-transparent pr-0.5 text-[9px] text-[#888888] dark:text-[#bdbdbd] [&>option]:bg-white [&>option]:text-[#353535] dark:[&>option]:bg-[#2b2b2b] dark:[&>option]:text-[#e7e7e7]" aria-label="Chế độ trả lời" value={mode} onChange={e => setMode(e.target.value)} disabled={busy}><option value="fast">Trả lời nhanh</option><option value="reasoning">Phân tích sâu</option></select></label></div><div className="flex items-center gap-2"><span className="mr-1.25 text-[8px] text-[#aeaeae] max-[761px]:hidden">↵ để gửi</span>{pendingId || typing ? <button type="button" className="flex size-7.75 items-center justify-center rounded-lg bg-[linear-gradient(145deg,#247326,#065908)] doom:bg-[linear-gradient(145deg,#408a47,#245f30)] strange:bg-[linear-gradient(145deg,#bc463c,#702b25)] text-white shadow-sm hover:-translate-y-px" aria-label="Dừng trả lời" title="Dừng trả lời" onClick={() => pendingId ? controller.current?.abort() : finishTyping()}><Icon name="stop" size={18} /></button> : <button type="submit" className="flex size-7.75 items-center justify-center rounded-lg bg-[linear-gradient(145deg,#247326,#065908)] doom:bg-[linear-gradient(145deg,#408a47,#245f30)] strange:bg-[linear-gradient(145deg,#bc463c,#702b25)] text-white shadow-[0_2px_4px_#06590821] enabled:hover:-translate-y-px enabled:hover:shadow-[0_3px_8px_#06590835] disabled:cursor-not-allowed disabled:bg-[#aec5aa] disabled:bg-none disabled:shadow-none dark:disabled:bg-[#3b513c] strange:disabled:bg-[#40352e] dark:disabled:text-[#a5bca1] strange:disabled:text-[#c5b3a0]" aria-label="Gửi câu hỏi" title="Gửi câu hỏi" disabled={!draft.trim() || busy}><Icon name="up" size={20} /></button>}</div></div>
              </form>
              <div className="mx-0.5 mt-2.75 flex justify-between gap-2 text-[7px] text-[#aeaeae] max-[761px]:justify-center max-[761px]:leading-normal"><span className="whitespace-nowrap max-[761px]:hidden"><i className="mr-1 text-[10px] text-[#a5a5a5] not-italic">✦</i> Được hỗ trợ bởi One61 AI</span><span>AI có thể mắc lỗi. Hãy kiểm tra thông tin quan trọng.</span></div>
            </div>
          </>}

          {view === 'documents' && <div className="flex-1 overflow-y-auto px-11.25 py-10.25 tablet:p-7.5 max-[761px]:px-5 max-[761px]:py-6.25"><div className="mb-6.5 flex items-center justify-between gap-5 max-[761px]:flex-wrap max-[761px]:items-start max-[761px]:gap-3"><div><span className="text-[8px] tracking-[1.4px] text-[#a5a5a5]">KHO KIẾN THỨC</span><h1 className="mt-3 text-[27px] font-[550] tracking-[-.8px] max-[761px]:text-[23px]">Tài liệu của bạn<span className="ml-2.5 rounded-md border border-[#ededed] bg-[#f3f3f3] px-1.75 py-0.5 align-middle text-[11px] text-[#868686] dark:border-[#3b3b3b] doom:border-[#314337] strange:border-[#403b33] dark:bg-[#333333] doom:bg-[#233429] strange:bg-[#2d2b27] dark:text-[#929292] doom:text-[#8ca592] strange:text-[#a39a8b]">{active.documents.length}</span></h1><p className="mt-3 text-[10px] leading-[1.8] text-[#7a7a7a] dark:text-[#ababab] doom:text-[#a9bcad] strange:text-[#bfb7a8]">Kiến thức riêng cho cuộc trò chuyện đang chọn.</p></div><button className={primaryButton} disabled={busy} onClick={() => fileInput.current?.click()}><Icon name="plus" size={17} />Thêm tài liệu</button></div><div className="mb-4.5 flex items-center gap-1.75 border-b border-[#ededed] pb-4 text-[10px] text-[#7a7a7a] dark:border-[#3b3b3b] doom:border-[#314337] strange:border-[#403b33] dark:text-[#ababab] doom:text-[#a9bcad] strange:text-[#bfb7a8]"><Icon name="chat" size={16} /><span className="truncate">{active.title}</span></div>
            <button className="flex w-full flex-col items-center rounded-[11px] border border-dashed border-[#dadada] bg-[#80808004] px-3.75 py-8.25 text-[#7a7a7a] hover:border-[#bcbcbc] hover:bg-[#8080800a] disabled:cursor-not-allowed disabled:opacity-45 dark:border-[#555555] dark:text-[#ababab] doom:text-[#a9bcad] strange:text-[#bfb7a8] max-[761px]:px-3 max-[761px]:py-6.25" disabled={busy} onClick={() => fileInput.current?.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); uploadFiles(Array.from(e.dataTransfer.files)); }}><span className="mb-4.25 flex size-13.25 items-center justify-center rounded-[14px] border border-[#ebebeb] bg-[#f1f1f1] text-[#acacac] dark:border-[#4b4b4b] dark:bg-[#373737] doom:bg-[#293c2f] strange:bg-[#302a25]">{uploading ? <span className={spinner} /> : <Icon name="upload" size={27} />}</span><strong className="text-xs font-[550] text-[#353535] wrap-anywhere dark:text-[#e7e7e7] doom:text-[#e2ebe3] strange:text-[#f3e9dd]">{uploading ? uploadLabel : 'Thả tài liệu vào đây'}</strong><span className="mt-2 text-[10px]">hoặc nhấn để chọn từ máy tính</span><small className="mt-5 text-[8px] text-[#868686] dark:text-[#929292] doom:text-[#8ca592] strange:text-[#a39a8b] max-[761px]:text-[7px]">PDF, DOCX, TXT, MD, CSV, JSON · Tối đa 25 MB / tệp</small></button>
            <div className="mt-6">{active.documents.length ? active.documents.map((document, index) => <div className="flex items-center gap-3.25 border-b border-[#ededed] py-3.75 dark:border-[#3b3b3b] doom:border-[#314337] strange:border-[#403b33] max-[761px]:gap-2.25" key={document.document_id || index}><span className={`flex h-10.75 w-9.75 shrink-0 items-center justify-center rounded-[7px] ${/\.pdf$/i.test(document.filename) ? 'bg-[#fbefed] text-[#cd9b92] dark:bg-[#613f3b]' : 'bg-[#f0f0f0] text-[#a8a8a8] dark:bg-[#363636] doom:bg-[#293c2f] strange:bg-[#302a25]'}`}><Icon name="file" size={23} /></span><div className="min-w-0 flex-1"><strong className="text-[11px] font-medium wrap-anywhere">{document.filename}</strong><small className="mt-1.25 block text-[8px] text-[#868686] dark:text-[#929292] doom:text-[#8ca592] strange:text-[#a39a8b]">{document.size ? `${(document.size / 1024).toFixed(0)} KB · ` : ''}{document.chunks_created} đoạn kiến thức</small></div><span className="flex items-center gap-1 text-[8px] text-[#80a78f] max-[761px]:gap-0 max-[761px]:text-[0px]"><Icon name="check" size={13} />Sẵn sàng</span><button className={iconButton} title="Hỏi về tài liệu" aria-label={`Hỏi về ${document.filename}`} onClick={() => fillPrompt(`Tóm tắt những nội dung chính trong tài liệu ${document.filename}.`)}><Icon name="chat" size={18} /></button></div>) : <div className="flex items-center justify-center gap-2 px-1.25 py-5 text-center text-[10px] text-[#868686] dark:text-[#929292] doom:text-[#8ca592] strange:text-[#a39a8b]"><Icon name="folder" size={20} /><p>Tài liệu đầu tiên, khởi đầu cho nhiều câu trả lời.</p></div>}</div></div>}

          {view === 'saved' && <div className="flex-1 overflow-y-auto px-11.25 py-10.25 tablet:p-7.5 max-[761px]:px-5 max-[761px]:py-6.25"><div className="mb-6.5"><span className="text-[8px] tracking-[1.4px] text-[#a5a5a5]">GIỮ LẠI ĐIỀU HỮU ÍCH</span><h1 className="mt-3 text-[27px] font-[550] tracking-[-.8px] max-[761px]:text-[23px]">Câu trả lời đã lưu<span className="ml-2.5 rounded-md border border-[#ededed] bg-[#f3f3f3] px-1.75 py-0.5 align-middle text-[11px] text-[#868686] dark:border-[#3b3b3b] doom:border-[#314337] strange:border-[#403b33] dark:bg-[#333333] doom:bg-[#233429] strange:bg-[#2d2b27] dark:text-[#929292] doom:text-[#8ca592] strange:text-[#a39a8b]">{saved.length}</span></h1><p className="mt-3 text-[10px] leading-[1.8] text-[#7a7a7a] dark:text-[#ababab] doom:text-[#a9bcad] strange:text-[#bfb7a8]">Một góc nhỏ cho những thông tin bạn muốn quay lại.</p></div>{saved.length ? saved.map(m => <div className="mt-3.75 rounded-[10px] border border-[#ededed] bg-white p-5 dark:border-[#3b3b3b] doom:border-[#314337] strange:border-[#403b33] dark:bg-[#2b2b2b] doom:bg-[#1b2b21] strange:bg-[#232522] max-[761px]:p-3.75 [&>article]:mb-0" key={m.id}><button className="mb-3.75 flex items-center gap-2 text-[9px] text-[#868686] dark:text-[#929292] doom:text-[#8ca592] strange:text-[#a39a8b] max-[761px]:text-[8px]" onClick={() => selectConversation(m.conversation.id)}><Icon name="chat" size={14} />{m.conversation.title}<Icon name="arrow" size={14} className="ml-auto" /></button>{renderMessage(m, m.conversation.id)}</div>) : <div className="px-2.5 py-15 text-center max-[761px]:px-0 max-[761px]:py-11.25"><span className="mx-auto mb-6.25 flex size-18 items-center justify-center rounded-[20px] bg-[#f0f0f0] text-[#ababab] dark:bg-[#373737] doom:bg-[#293c2f] strange:bg-[#302a25]"><Icon name="bookmark" size={31} /></span><h2 className="text-xl font-[550] tracking-[-.5px] max-[761px]:text-lg">Câu trả lời hay, giữ lại đây.</h2><p className="mt-3.75 mb-6.25 text-[11px] leading-loose text-[#7a7a7a] dark:text-[#ababab] doom:text-[#a9bcad] strange:text-[#bfb7a8]">Nhấn biểu tượng lưu dưới câu trả lời của One61.<br />Mọi thứ bạn cần sẽ luôn dễ tìm.</p><button className={secondaryButton} onClick={() => openView('chat')}>Bắt đầu trò chuyện<Icon name="arrow" size={15} /></button></div>}</div>}
        </main>
      </div>
    </section>

    <input ref={fileInput} className="sr-only" type="file" accept=".pdf,.docx,.txt,.md,.csv,.json" multiple tabIndex={-1} aria-label="Chọn tài liệu" onChange={e => { uploadFiles(Array.from(e.target.files)); e.target.value = ''; }} />
    <div ref={themePicker} id="theme-picker" popover="auto" aria-labelledby="theme-picker-title" className="fixed inset-auto top-[anchor(bottom)] right-[anchor(right)] z-30 m-0 mt-2 w-[320px] max-w-[calc(100vw-24px)] rounded-xl border border-[#dedede] bg-[#fcfcfc] p-2 text-inherit shadow-[0_12px_40px_#00000024] [position-anchor:--theme-trigger] dark:border-[#3b3b3b] dark:bg-[#262626] doom:border-[#3e5545] strange:border-[#65523a] doom:bg-[#16251b] strange:bg-[#20231f]">
      <div className="px-3 pt-2 pb-3"><h2 id="theme-picker-title" className="flex items-center gap-2 text-[13px] font-semibold"><Icon name="palette" size={18} />Giao diện</h2><p className="mt-1.5 text-[11px] text-[#777777] dark:text-[#ababab] doom:text-[#a9bcad] strange:text-[#bfb7a8]">Lựa chọn được lưu trên trình duyệt này.</p></div>
      <ThemeOptions theme={theme} onChange={value => { setTheme(value); themePicker.current?.hidePopover(); }} />
    </div>
    {toast && <div className="fixed bottom-4 left-1/2 z-20 flex min-w-65 max-w-[calc(100vw-40px)] -translate-x-1/2 items-center gap-2.25 rounded-[9px] border border-[#ededed] bg-white px-3.75 py-3 text-[10px] shadow-[0_8px_30px_#3e3e3e20] dark:border-[#3b3b3b] doom:border-[#314337] strange:border-[#403b33] dark:bg-[#2b2b2b] doom:bg-[#1b2b21] strange:bg-[#232522]" role="status"><Icon name="chat" size={17} className="text-[#969696] dark:text-[#737373]" /><span className="wrap-anywhere">{toast}</span><button className="ml-auto flex p-0.75 text-[#868686] dark:text-[#929292] doom:text-[#8ca592] strange:text-[#a39a8b]" aria-label="Đóng thông báo" onClick={() => setToast('')}><Icon name="close" size={15} /></button></div>}

    <dialog ref={dialog} className="fixed inset-0 m-auto max-h-[calc(100svh-32px)] w-130 max-w-[calc(100vw-32px)] overflow-y-auto rounded-[14px] border border-[#ffffff70] bg-[#fcfcfc] p-0 text-inherit shadow-[0_25px_100px_#36363640] backdrop:bg-[#29292938] backdrop:backdrop-blur-md dark:border-[#6b6b6b80] dark:bg-[#202020] doom:bg-[#0e1712] strange:bg-[#111311]" onCancel={() => setModal('')} onClose={() => setModal('')} onClick={e => { if (e.target === dialog.current) { const bounds = dialog.current.getBoundingClientRect(); if (e.clientX < bounds.left || e.clientX > bounds.right || e.clientY < bounds.top || e.clientY > bounds.bottom) setModal(''); } }} aria-labelledby="modal-title">
      <div className="flex items-center justify-between border-b border-[#ededed] px-6 pt-5 pb-3.75 dark:border-[#3b3b3b] doom:border-[#314337] strange:border-[#403b33] max-[761px]:px-5 max-[761px]:py-4"><h2 id="modal-title" className="text-sm font-[550]">{modal === 'search' ? 'Tìm cuộc trò chuyện' : modal === 'settings' ? 'Cài đặt không gian' : 'Chào mừng đến One61'}</h2><button className={iconButton} aria-label="Đóng hộp thoại" onClick={() => setModal('')}><Icon name="close" size={18} /></button></div>
      {modal === 'search' && <><div className="mx-5.5 my-4.5 flex items-center gap-2.5 rounded-lg border border-[#ededed] bg-white p-3 text-[#868686] focus-within:border-[#d2d2d2] dark:border-[#3b3b3b] doom:border-[#314337] strange:border-[#403b33] dark:bg-[#2b2b2b] doom:bg-[#1b2b21] strange:bg-[#232522] dark:text-[#929292] doom:text-[#8ca592] strange:text-[#a39a8b]"><Icon name="search" size={19} /><input className="w-full border-0 bg-transparent text-[11px] text-[#353535] placeholder:text-[#868686] focus-visible:outline-none dark:text-[#e7e7e7] doom:text-[#e2ebe3] strange:text-[#f3e9dd] dark:placeholder:text-[#929292] doom:placeholder:text-[#8ca592] strange:placeholder:text-[#a39a8b]" autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm trong tiêu đề, nội dung…" aria-label="Tìm kiếm cuộc trò chuyện" /></div><div className="max-h-75 overflow-y-auto px-3.25 pb-3.75">{conversations.filter(c => (c.messages.length || c.documents.length) && `${c.title} ${c.messages.map(m => m.text).join(' ')}`.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi'))).map(c => <button className="flex w-full items-center gap-3.25 rounded-[7px] px-2.75 py-3 text-left text-[#7a7a7a] hover:bg-[#f3f3f3] dark:text-[#ababab] doom:text-[#a9bcad] strange:text-[#bfb7a8] dark:hover:bg-[#333333] doom:hover:bg-[#233429] strange:hover:bg-[#2d2b27]" key={c.id} onClick={() => selectConversation(c.id)}><Icon name="chat" size={18} /><span className="min-w-0 flex-1"><strong className="block text-[11px] font-medium text-[#353535] wrap-anywhere dark:text-[#e7e7e7] doom:text-[#e2ebe3] strange:text-[#f3e9dd]">{c.title}</strong><small className="mt-1.5 block text-[8px] text-[#868686] dark:text-[#929292] doom:text-[#8ca592] strange:text-[#a39a8b]">{c.messages.length} tin nhắn · {c.documents.length} tài liệu</small></span><Icon name="chevron" size={15} /></button>)}{!conversations.some(c => (c.messages.length || c.documents.length) && `${c.title} ${c.messages.map(m => m.text).join(' ')}`.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi'))) && <p className="p-5 text-center text-[11px] text-[#868686] dark:text-[#929292] doom:text-[#8ca592] strange:text-[#a39a8b]">Chưa có cuộc trò chuyện phù hợp.</p>}</div><div className="flex items-center justify-between border-t border-[#ededed] px-6 py-3 text-[8px] text-[#868686] dark:border-[#3b3b3b] doom:border-[#314337] strange:border-[#403b33] dark:text-[#929292] doom:text-[#8ca592] strange:text-[#a39a8b]">Tìm kiếm trong lịch sử trên trình duyệt này.<kbd className="rounded border border-[#d3d3d388] px-1.25 py-px font-sans text-[10px] font-normal">esc</kbd></div></>}
      {modal === 'settings' && <div className="px-6 pt-1.75 pb-5 max-[761px]:px-5 max-[761px]:pt-1.25"><div className="border-b border-[#ededed] py-4.75 dark:border-[#3b3b3b] doom:border-[#314337] strange:border-[#403b33]"><div><strong className="text-[11px] font-medium">Giao diện</strong><p className="mt-1.75 text-[9px] leading-[1.9] text-[#7a7a7a] dark:text-[#ababab] doom:text-[#a9bcad] strange:text-[#bfb7a8]">Lựa chọn được lưu trên trình duyệt này.</p></div><div className="mt-3"><ThemeOptions theme={theme} onChange={setTheme} /></div></div><div className="flex items-center justify-between gap-3.5 border-b border-[#ededed] py-4.75 dark:border-[#3b3b3b] doom:border-[#314337] strange:border-[#403b33] max-[761px]:flex-wrap"><div><strong className="text-[11px] font-medium">Lịch sử trò chuyện</strong><p className="mt-1.75 text-[9px] leading-[1.9] text-[#7a7a7a] dark:text-[#ababab] doom:text-[#a9bcad] strange:text-[#bfb7a8]">Lưu trên trình duyệt này. Xuất để giữ bản sao.</p></div><button className={secondaryButton} onClick={exportWorkspace}><Icon name="download" size={16} />Xuất JSON</button></div><div className="flex items-start gap-2.25 py-4.75"><i className={`mt-1.25 size-1.5 shrink-0 rounded-full ${health ? 'bg-[#68a88f]' : 'bg-[#bd945d]'}`} /><div><strong className="text-[10px] font-medium">{health ? 'Máy chủ đã kết nối' : 'Máy chủ chưa kết nối'}</strong><p className="mt-1.75 text-[9px] leading-[1.9] text-[#7a7a7a] dark:text-[#ababab] doom:text-[#a9bcad] strange:text-[#bfb7a8]">{health ? (health.rag_initialized ? 'Kho kiến thức sẵn sàng.' : 'Máy chủ hoạt động. Kho kiến thức chưa khởi tạo.') : 'Khởi động dịch vụ FastAPI tại cổng 8000 để chat và tải tài liệu.'}</p></div></div><p className="mt-0.75 text-center text-[8px] text-[#868686] dark:text-[#929292] doom:text-[#8ca592] strange:text-[#a39a8b]">One61 Workspace · React · Lấy cảm hứng từ macOS</p></div>}
      {modal === 'help' && <div className="px-6.5 pt-5.25 pb-6.5"><p className="mb-6.25 text-[11px] leading-[1.9] text-[#7a7a7a] dark:text-[#ababab] doom:text-[#a9bcad] strange:text-[#bfb7a8]">Không gian gọn gàng để làm việc cùng dữ liệu của bạn.</p>{[
        { icon: 'chat', color: 'blue', title: 'Hỏi theo cách của bạn', text: 'Tra cứu vận đơn, hỏi chính sách hoặc phân tích dữ liệu. Chọn “Phân tích sâu” cho câu hỏi cần đối chiếu kỹ.' },
        { icon: 'file', color: 'violet', title: 'Thêm kiến thức riêng', text: 'Đính kèm tài liệu bằng nút +. Tài liệu chỉ dùng trong cuộc trò chuyện hiện tại.' },
        { icon: 'bookmark', color: 'green', title: 'Giữ những câu trả lời hữu ích', text: 'Lưu câu trả lời để xem lại. Dùng ⌘ K hoặc Ctrl K để tìm cuộc trò chuyện.' },
      ].map(item => <div key={item.icon} className="mb-5.5 flex gap-3.5"><span className={`inline-flex size-9.25 shrink-0 items-center justify-center rounded-[9px] ${suggestionColors[item.color]}`}><Icon name={item.icon} /></span><section><strong className="text-[11px] font-[550]">{item.title}</strong><p className="mt-1.25 text-[10px] leading-[1.9] text-[#7a7a7a] dark:text-[#ababab] doom:text-[#a9bcad] strange:text-[#bfb7a8]">{item.text}</p></section></div>)}<button className={`${primaryButton} mt-0.75 w-full`} onClick={() => { setModal(''); openView('chat'); }}>Bắt đầu khám phá<Icon name="arrow" size={16} /></button></div>}
    </dialog>
  </div>;
}
