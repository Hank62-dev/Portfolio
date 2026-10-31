import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const vi = {
  'rag.channel': 'HANK RAG / KÊNH RIÊNG',
  'rag.fast': 'Truy xuất nhanh',
  'rag.deep': 'Phân tích sâu',
  'rag.welcomeTitle': 'Hank có thể tìm gì cho bạn?',
  'rag.welcomeText': 'Hỏi Hank về tài liệu, quy trình hoặc dữ liệu logistics.',
  'rag.promptSummary': 'Tóm tắt knowledge base',
  'rag.promptPolicy': 'Tìm chính sách liên quan',
  'rag.placeholder': 'Hỏi Hank về dữ liệu, tài liệu hoặc vận đơn…',
  'rag.thinking': 'Hank đang suy nghĩ và đối chiếu nguồn…',
  'rag.error': 'Hank RAG không trả về câu trả lời. Kiểm tra GEMINI_API_KEY và log FastAPI.',
  'rag.askSummary': 'Tóm tắt các tài liệu hiện có',
  'rag.askPolicy': 'Có chính sách nào liên quan đến quy trình này?',
};

const en = {
  'rag.channel': 'HANK RAG / PRIVATE CHANNEL',
  'rag.fast': 'Fast retrieval',
  'rag.deep': 'Deep analysis',
  'rag.welcomeTitle': 'What should we find for you?',
  'rag.welcomeText': 'Ask Hank about documents, procedures or logistics data.',
  'rag.promptSummary': 'Summarise knowledge base',
  'rag.promptPolicy': 'Find related policies',
  'rag.placeholder': 'Ask Hank about data, documents or shipments…',
  'rag.thinking': 'Hank is thinking and checking sources…',
  'rag.error': 'Hank RAG returned no answer. Check GEMINI_API_KEY and FastAPI logs.',
  'rag.askSummary': 'Summarise the available documents',
  'rag.askPolicy': 'Are there policies related to this process?',
};

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: { en: { translation: en }, vi: { translation: vi } },
    lng: 'vi',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });
}

export default i18n;
