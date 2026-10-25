import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const vi = {
  'rag.channel': '\u0048\u0041\u004e\u004b RAG / K\u00caNH RI\u00caNG', 'rag.fast': 'Truy xu\u1ea5t nhanh', 'rag.deep': 'Ph\u00e2n t\u00edch s\u00e2u',
  'rag.welcomeTitle': 'Hank c\u00f3 th\u1ec3 t\u00ecm g\u00ec cho b\u1ea1n?', 'rag.welcomeText': 'H\u1ecfi Hank v\u1ec1 t\u00e0i li\u1ec7u, quy tr\u00ecnh ho\u1eb7c d\u1eef li\u1ec7u logistics.',
  'rag.promptSummary': 'T\u00f3m t\u1eaft knowledge base', 'rag.promptPolicy': 'T\u00ecm ch\u00ednh s\u00e1ch li\u00ean quan', 'rag.placeholder': 'H\u1ecfi Hank v\u1ec1 d\u1eef li\u1ec7u, t\u00e0i li\u1ec7u ho\u1eb7c v\u1eadn \u0111\u01a1n\u2026',
  'rag.thinking': 'Hank \u0111ang suy ngh\u0129 v\u00e0 \u0111\u1ed1i chi\u1ebfu ngu\u1ed3n\u2026', 'rag.error': 'Hank RAG kh\u00f4ng tr\u1ea3 v\u1ec1 c\u00e2u tr\u1ea3 l\u1eddi. Ki\u1ec3m tra GEMINI_API_KEY v\u00e0 log FastAPI.',
  'rag.askSummary': 'T\u00f3m t\u1eaft c\u00e1c t\u00e0i li\u1ec7u hi\u1ec7n c\u00f3', 'rag.askPolicy': 'C\u00f3 ch\u00ednh s\u00e1ch n\u00e0o li\u00ean quan \u0111\u1ebfn quy tr\u00ecnh n\u00e0y?',
};
const en = {
  'rag.channel': 'HANK RAG / PRIVATE CHANNEL', 'rag.fast': 'Fast retrieval', 'rag.deep': 'Deep analysis', 'rag.welcomeTitle': 'What should we find for you?', 'rag.welcomeText': 'Ask Hank about documents, procedures or logistics data.',
  'rag.promptSummary': 'Summarise knowledge base', 'rag.promptPolicy': 'Find related policies', 'rag.placeholder': 'Ask Hank about data, documents or shipments…', 'rag.thinking': 'Hank is thinking and checking sources…', 'rag.error': 'Hank RAG returned no answer. Check GEMINI_API_KEY and FastAPI logs.', 'rag.askSummary': 'Summarise the available documents', 'rag.askPolicy': 'Are there policies related to this process?',
};
if (!i18n.isInitialized) i18n.use(initReactI18next).init({ resources: { en: { translation: en }, vi: { translation: vi } }, lng: 'vi', fallbackLng: 'en', interpolation: { escapeValue: false } });
export default i18n;
