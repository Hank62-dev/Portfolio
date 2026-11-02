import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const vi = {
  'rag.channel': 'HANK / KÊNH RIÊNG',
  'rag.fast': 'Trả lời nhanh',
  'rag.deep': 'Phân tích sâu',
  'rag.welcomeTitle': 'Hỏi Hank bất cứ điều gì',
  'rag.welcomeText': 'Hank trả lời từ những gì nó biết, từ tài liệu bạn đã thêm trong Vault, và tự lên mạng tìm khi cần.',
  'rag.promptDocs': 'Hỏi về tài liệu của tôi',
  'rag.promptNews': 'Tìm tin mới trên mạng',
  'rag.promptExplain': 'Giải thích một khái niệm',
  'rag.placeholder': 'Hỏi Hank bất cứ điều gì…',
  'rag.thinking': 'Hank đang suy nghĩ…',
  'rag.error': 'Hank không trả về câu trả lời. Kiểm tra GEMINI_API_KEY và log FastAPI.',
  'rag.askDocs': 'Tóm tắt các tài liệu tôi đã thêm vào Vault',
  'rag.askNews': 'Tin công nghệ nổi bật hôm nay là gì?',
  'rag.askExplain': 'Giải thích RAG là gì, bằng ví dụ dễ hiểu',
  'rag.web': 'Tìm trên web',
  'rag.webAuto': 'Tự động',
  'rag.webOn': 'Luôn bật',
  'rag.webOff': 'Tắt',
  'rag.fromDocs': 'Từ tài liệu của bạn',
  'rag.fromWeb': 'Từ web',
  'rag.fromKnowledge': 'Từ kiến thức của Hank',
};

const en = {
  'rag.channel': 'HANK / PRIVATE CHANNEL',
  'rag.fast': 'Quick answer',
  'rag.deep': 'Deep analysis',
  'rag.welcomeTitle': 'Ask Hank anything',
  'rag.welcomeText': 'Hank answers from what it knows, from the documents you added to the Vault, and searches the web when it needs to.',
  'rag.promptDocs': 'Ask about my documents',
  'rag.promptNews': 'Find the latest news online',
  'rag.promptExplain': 'Explain a concept',
  'rag.placeholder': 'Ask Hank anything…',
  'rag.thinking': 'Hank is thinking…',
  'rag.error': 'Hank returned no answer. Check GEMINI_API_KEY and the FastAPI logs.',
  'rag.askDocs': 'Summarise the documents I added to the Vault',
  'rag.askNews': "What are today's top tech stories?",
  'rag.askExplain': 'Explain what RAG is with a simple example',
  'rag.web': 'Web search',
  'rag.webAuto': 'Auto',
  'rag.webOn': 'Always',
  'rag.webOff': 'Off',
  'rag.fromDocs': 'From your documents',
  'rag.fromWeb': 'From the web',
  'rag.fromKnowledge': 'From what Hank knows',
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
