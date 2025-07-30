/**
 * Process markdown text to make it suitable for text-to-speech conversion
 * Removes markdown formatting and converts to natural speech text
 */
export const processMarkdownText = (markdownText: string): string => {
  if (!markdownText) return '';

  let processedText = markdownText;

  // Remove code blocks (```code```)
  processedText = processedText.replace(/```[\s\S]*?```/g, ' [khối mã] ');
  
  // Remove inline code (`code`)
  processedText = processedText.replace(/`([^`]+)`/g, ' $1 ');
  
  // Remove bold and italic formatting (**text**, *text*, __text__, _text_)
  processedText = processedText.replace(/\*\*([^*]+)\*\*/g, '$1');
  processedText = processedText.replace(/\*([^*]+)\*/g, '$1');
  processedText = processedText.replace(/__([^_]+)__/g, '$1');
  processedText = processedText.replace(/_([^_]+)_/g, '$1');
  
  // Remove strikethrough (~~text~~)
  processedText = processedText.replace(/~~([^~]+)~~/g, '$1');
  
  // Convert headers (# ## ### etc.) to natural speech
  processedText = processedText.replace(/^#{1}\s+(.+)$/gm, 'Tiêu đề chính: $1.');
  processedText = processedText.replace(/^#{2}\s+(.+)$/gm, 'Tiêu đề phụ: $1.');
  processedText = processedText.replace(/^#{3,}\s+(.+)$/gm, 'Mục: $1.');
  
  // Convert links [text](url) to natural speech
  processedText = processedText.replace(/\[([^\]]+)\]\([^)]+\)/g, 'liên kết $1');
  
  // Convert images ![alt](url) to natural speech
  processedText = processedText.replace(/!\[([^\]]*)\]\([^)]+\)/g, (match, alt) => {
    return alt ? `hình ảnh ${alt}` : 'hình ảnh';
  });
  
  // Convert lists to natural speech
  // Unordered lists (- * +)
  processedText = processedText.replace(/^[\s]*[-*+]\s+(.+)$/gm, 'Mục danh sách: $1.');
  
  // Ordered lists (1. 2. etc.)
  processedText = processedText.replace(/^[\s]*\d+\.\s+(.+)$/gm, 'Mục số: $1.');
  
  // Convert blockquotes (> text)
  processedText = processedText.replace(/^>\s+(.+)$/gm, 'Trích dẫn: $1.');
  
  // Convert horizontal rules (--- *** ___)
  processedText = processedText.replace(/^[-*_]{3,}$/gm, 'Đường phân cách.');
  
  // Convert tables to natural speech (basic)
  processedText = processedText.replace(/\|([^|]+)\|/g, (match, content) => {
    return content.trim() + ' ';
  });
  
  // Remove table separators (|---|---|
  processedText = processedText.replace(/\|[-:]+\|/g, '');
  
  // Convert line breaks to periods for better speech flow
  processedText = processedText.replace(/\n{2,}/g, '. ');
  processedText = processedText.replace(/\n/g, ' ');
  
  // Clean up extra spaces
  processedText = processedText.replace(/\s{2,}/g, ' ');
  
  // Remove HTML tags if any
  processedText = processedText.replace(/<[^>]*>/g, '');
  
  // Convert common symbols to words
  processedText = processedText.replace(/&/g, ' và ');
  processedText = processedText.replace(/@/g, ' at ');
  processedText = processedText.replace(/#/g, ' thăng ');
  processedText = processedText.replace(/\$/g, ' đô la ');
  processedText = processedText.replace(/%/g, ' phần trăm ');
  processedText = processedText.replace(/\+/g, ' cộng ');
  processedText = processedText.replace(/=/g, ' bằng ');
  
  // Convert numbers with units
  processedText = processedText.replace(/(\d+)km/g, '$1 ki-lô-mét');
  processedText = processedText.replace(/(\d+)m/g, '$1 mét');
  processedText = processedText.replace(/(\d+)cm/g, '$1 xăng-ti-mét');
  processedText = processedText.replace(/(\d+)kg/g, '$1 ki-lô-gam');
  processedText = processedText.replace(/(\d+)g/g, '$1 gam');
  
  // Convert time formats
  processedText = processedText.replace(/(\d{1,2}):(\d{2})/g, '$1 giờ $2 phút');
  
  // Convert dates (basic format)
  processedText = processedText.replace(/(\d{1,2})\/(\d{1,2})\/(\d{4})/g, 'ngày $1 tháng $2 năm $3');
  
  // Remove extra punctuation
  processedText = processedText.replace(/[\[\]{}()]/g, '');
  processedText = processedText.replace(/[.,;:!?]{2,}/g, '.');
  
  // Ensure proper sentence ending
  processedText = processedText.trim();
  if (processedText && !processedText.match(/[.!?]$/)) {
    processedText += '.';
  }
  
  // Final cleanup
  processedText = processedText.replace(/\s+/g, ' ').trim();
  
  return processedText;
};

/**
 * Split long text into smaller chunks for better TTS processing
 */
export const splitTextForTTS = (text: string, maxLength: number = 500): string[] => {
  if (!text || text.length <= maxLength) {
    return [text];
  }

  const chunks: string[] = [];
  const sentences = text.split(/[.!?]+/);
  let currentChunk = '';

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (!trimmedSentence) continue;

    const sentenceWithPunctuation = trimmedSentence + '.';
    
    if (currentChunk.length + sentenceWithPunctuation.length <= maxLength) {
      currentChunk += (currentChunk ? ' ' : '') + sentenceWithPunctuation;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      currentChunk = sentenceWithPunctuation;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks.filter(chunk => chunk.trim().length > 0);
};

/**
 * Clean text for better pronunciation
 */
export const cleanTextForSpeech = (text: string): string => {
  let cleanedText = text;
  
  // Convert common abbreviations to full words
  const abbreviations: Record<string, string> = {
    'AI': 'Ây Ai',
    'API': 'Ây Pi Ai',
    'URL': 'U R L',
    'HTTP': 'H T T P',
    'HTTPS': 'H T T P S',
    'JSON': 'J S O N',
    'XML': 'X M L',
    'HTML': 'H T M L',
    'CSS': 'C S S',
    'JS': 'Java Script',
    'TS': 'Type Script',
    'SQL': 'S Q L',
    'DB': 'cơ sở dữ liệu',
    'UI': 'U I',
    'UX': 'U X',
    'CEO': 'C E O',
    'CTO': 'C T O',
    'IT': 'I T',
    'PC': 'P C',
    'OS': 'O S',
    'iOS': 'i O S',
    'Android': 'An-droid',
    'Windows': 'Win-đô',
    'Linux': 'Li-nux',
    'macOS': 'Mac O S'
  };
  
  for (const [abbr, full] of Object.entries(abbreviations)) {
    const regex = new RegExp(`\\b${abbr}\\b`, 'gi');
    cleanedText = cleanedText.replace(regex, full);
  }
  
  return cleanedText;
};

const markdownProcessor = {
  processMarkdownText,
  splitTextForTTS,
  cleanTextForSpeech
};

export default markdownProcessor;