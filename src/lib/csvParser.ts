// CSV解析工具 - 支持Anki导出格式

export interface CSVCard {
  front: string;
  back: string;
  tags?: string[];
}

/**
 * 解析CSV文件内容
 * 支持的格式：
 * 1. 基本格式：front,back
 * 2. 带标签：front,back,tags
 * 3. 支持引号包裹的字段
 * 4. 支持制表符分隔
 */
export function parseCSV(content: string): CSVCard[] {
  const lines = content.split('\n').filter(line => line.trim());
  const cards: CSVCard[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // 尝试解析行
    const fields = parseCSVLine(line);

    if (fields.length < 2) {
      console.warn(`Line ${i + 1} has less than 2 fields, skipping`);
      continue;
    }

    const front = fields[0].trim();
    const back = fields[1].trim();

    if (!front || !back) {
      console.warn(`Line ${i + 1} has empty front or back, skipping`);
      continue;
    }

    const card: CSVCard = {
      front,
      back,
    };

    // 如果有第三个字段，作为标签
    if (fields.length > 2 && fields[2].trim()) {
      const tagsString = fields[2].trim();
      // 标签可能用空格或逗号分隔
      card.tags = tagsString.split(/[,\s]+/).filter(tag => tag);
    }

    cards.push(card);
  }

  return cards;
}

/**
 * 解析CSV行，处理引号和分隔符
 * 支持逗号和制表符分隔
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let currentField = '';
  let inQuotes = false;

  // 检测分隔符（优先制表符，然后是逗号）
  const delimiter = line.includes('\t') ? '\t' : ',';

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // 双引号转义
        currentField += '"';
        i++; // 跳过下一个引号
      } else {
        // 切换引号状态
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      // 字段分隔符
      fields.push(currentField);
      currentField = '';
    } else {
      currentField += char;
    }
  }

  // 添加最后一个字段
  fields.push(currentField);

  // 清理字段（去掉首尾空格和引号）
  return fields.map(field => {
    field = field.trim();
    // 去掉外层引号
    if (field.startsWith('"') && field.endsWith('"')) {
      field = field.slice(1, -1);
    }
    return field;
  });
}

/**
 * 验证CSV内容
 */
export function validateCSV(content: string): {
  valid: boolean;
  error?: string;
  cardCount?: number;
} {
  if (!content || !content.trim()) {
    return { valid: false, error: 'CSV文件为空' };
  }

  try {
    const cards = parseCSV(content);

    if (cards.length === 0) {
      return { valid: false, error: '没有找到有效的卡片数据' };
    }

    return { valid: true, cardCount: cards.length };
  } catch (error) {
    return { valid: false, error: '解析CSV文件失败' };
  }
}
