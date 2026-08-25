export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const SQL_KEYWORDS = new Set([
  "SELECT", "FROM", "WHERE", "JOIN", "LEFT", "RIGHT", "INNER", "OUTER", "FULL", "CROSS",
  "ON", "GROUP", "BY", "ORDER", "HAVING", "LIMIT", "OFFSET", "WITH", "AS", "CASE",
  "WHEN", "THEN", "ELSE", "END", "INSERT", "INTO", "VALUES", "UPDATE", "SET", "DELETE",
  "CREATE", "TABLE", "VIEW", "INDEX", "DROP", "ALTER", "ADD", "CONSTRAINT", "PRIMARY",
  "KEY", "FOREIGN", "REFERENCES", "UNION", "ALL", "DISTINCT", "AND", "OR", "NOT", "IN",
  "IS", "NULL", "LIKE", "ILIKE", "BETWEEN", "EXISTS", "RETURNING", "OVER", "PARTITION",
  "WINDOW", "DESC", "ASC", "NULLS", "FIRST", "LAST", "TEMPORARY", "TEMP", "DEFAULT",
  "CHECK", "CASCADE", "CONFLICT", "DO", "NOTHING", "SHOW", "EXPLAIN", "ANALYZE"
]);

const CODE_KEYWORDS = new Set([
  "const", "let", "var", "function", "return", "if", "else", "for", "while", "do",
  "switch", "case", "default", "break", "continue", "import", "export", "from",
  "class", "extends", "new", "this", "super", "async", "await", "try", "catch",
  "finally", "throw", "typeof", "instanceof", "yield", "interface", "type", "enum",
  "implements", "declare", "abstract", "readonly", "as", "is", "keyof", "infer",
  "never", "any", "unknown", "void", "def", "elif", "lambda", "pass", "raise",
  "global", "nonlocal", "assert", "del", "None", "True", "False", "self", "cls",
  "fn", "mut", "pub", "struct", "impl", "trait", "match", "package", "go", "chan",
  "select", "defer", "null", "undefined", "true", "false"
]);

const BUILTINS = new Set([
  "SUM", "COUNT", "AVG", "MIN", "MAX", "CAST", "NULLIF", "COALESCE", "ROUND", "FLOOR",
  "CEIL", "DATE_TRUNC", "NOW", "JSON_EXTRACT", "ROW_NUMBER", "RANK", "DENSE_RANK",
  "FLOAT", "INT", "INTEGER", "BIGINT", "VARCHAR", "TEXT", "BOOLEAN", "TIMESTAMP", "JSON", "JSONB",
  "console", "log", "error", "warn", "info", "print", "len", "range", "map", "filter",
  "reduce", "find", "some", "every", "includes", "slice", "push", "pop", "shift", "unshift",
  "parseInt", "parseFloat", "Math", "JSON", "Promise", "Array", "Object", "String", "Number",
  "Boolean", "fetch", "useState", "useEffect", "useMemo", "useCallback", "useRef"
]);

export function highlightCode(code: string, language = ""): string {
  if (!code) return "";

  const lang = language.toLowerCase().trim();
  const isSql = lang === "sql" || lang === "postgres" || lang === "postgresql" || lang === "mysql" || lang === "sqlite";
  const isShellOrPython = lang === "python" || lang === "py" || lang === "sh" || lang === "bash" || lang === "zsh" || lang === "shell" || lang === "yaml" || lang === "dockerfile";

  // Regex that captures comments, strings, words, numbers, and operators
  const masterRegex = isShellOrPython
    ? /(\/\*[\s\S]*?\*\/|\/\/[^\n]*|#[^\n]*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)|(\b[a-zA-Z_$][\w$]*\b)|(===|!==|==|!=|=>|->|::|<=|>=|&&|\|\||[+\-*\/%<>=!&|^~])/g
    : isSql
    ? /(\/\*[\s\S]*?\*\/|--[^\n]*|\/\/[^\n]*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d+(?:\.\d+)?\b)|(\b[a-zA-Z_$][\w$]*\b)|(::|<=|>=|!=|<>|[+\-*\/%<>=])/g
    : /(\/\*[\s\S]*?\*\/|\/\/[^\n]*|--[^\n]*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)|(\b[a-zA-Z_$][\w$]*\b)|(===|!==|==|!=|=>|->|::|<=|>=|&&|\|\||[+\-*\/%<>=!&|^~])/g;

  let lastIndex = 0;
  let result = "";
  let match: RegExpExecArray | null;

  while ((match = masterRegex.exec(code)) !== null) {
    if (match.index > lastIndex) {
      result += escapeHtml(code.slice(lastIndex, match.index));
    }
    lastIndex = masterRegex.lastIndex;

    const [full, comment, str, num, word, op] = match;

    if (comment) {
      result += `<span class="hl-cm">${escapeHtml(comment)}</span>`;
    } else if (str) {
      result += `<span class="hl-st">${escapeHtml(str)}</span>`;
    } else if (num) {
      result += `<span class="hl-nu">${escapeHtml(num)}</span>`;
    } else if (word) {
      const upper = word.toUpperCase();
      if (isSql) {
        if (SQL_KEYWORDS.has(upper)) {
          result += `<span class="hl-kw">${escapeHtml(word)}</span>`;
        } else if (BUILTINS.has(upper)) {
          result += `<span class="hl-fn">${escapeHtml(word)}</span>`;
        } else {
          result += escapeHtml(word);
        }
      } else {
        if (CODE_KEYWORDS.has(word)) {
          result += `<span class="hl-kw">${escapeHtml(word)}</span>`;
        } else if (SQL_KEYWORDS.has(upper) && (upper === "SELECT" || upper === "FROM" || upper === "WHERE" || upper === "WITH" || upper === "INSERT" || upper === "UPDATE" || upper === "DELETE")) {
          result += `<span class="hl-kw">${escapeHtml(word)}</span>`;
        } else if (BUILTINS.has(word) || BUILTINS.has(upper)) {
          result += `<span class="hl-fn">${escapeHtml(word)}</span>`;
        } else {
          result += escapeHtml(word);
        }
      }
    } else if (op) {
      result += `<span class="hl-op">${escapeHtml(op)}</span>`;
    } else {
      result += escapeHtml(full);
    }
  }

  if (lastIndex < code.length) {
    result += escapeHtml(code.slice(lastIndex));
  }

  return result;
}

export function formatLanguageLabel(language: string): string {
  const clean = (language || "").trim().toLowerCase();
  if (!clean) return "CODE";
  if (clean === "ts") return "TYPESCRIPT";
  if (clean === "js") return "JAVASCRIPT";
  if (clean === "py") return "PYTHON";
  if (clean === "sh" || clean === "bash" || clean === "zsh") return "SHELL";
  if (clean === "sql") return "SQL";
  if (clean === "json") return "JSON";
  if (clean === "html") return "HTML";
  if (clean === "css") return "CSS";
  if (clean === "md" || clean === "markdown") return "MARKDOWN";
  if (clean === "rs" || clean === "rust") return "RUST";
  if (clean === "go") return "GO";
  return clean.toUpperCase();
}
