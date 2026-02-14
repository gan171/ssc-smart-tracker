const LATEX_PATTERN = /\\[a-zA-Z]+|\b[a-zA-Z]+\^\{[^}]+\}|\b[a-zA-Z]+_\{[^}]+\}/

function normalizeEscapedLatex(content) {
  return content.replace(/\\\\(?=[a-zA-Z]+)/g, '\\')
}

function shouldWrapAsInlineMath(content) {
  if (!LATEX_PATTERN.test(content)) return false

  // Auto-wrap only for short expression-like strings (typically MCQ options),
  // not full sentences/paragraphs such as analysis text.
  const hasSentenceMarkers = /[.!?]/.test(content)
  const hasLineBreaks = /\n/.test(content)
  return content.length <= 120 && !hasSentenceMarkers && !hasLineBreaks
}

export function normalizeMathText(content, options = {}) {
  if (typeof content !== 'string') return ''

  const { wrapExpression = false } = options
  const trimmed = content.trim()
  if (!trimmed) return ''

  const normalized = normalizeEscapedLatex(trimmed)

  // If math delimiters already exist, only unescape commands.
  if (normalized.includes('$')) {
    return normalized
  }

  if (wrapExpression && shouldWrapAsInlineMath(normalized)) {
    return `$${normalized}$`
  }

  return normalized
}

export function formatAnalysisText(content) {
  const normalized = normalizeMathText(content)
  if (!normalized) return ''

  return normalized
    .replace(/\r\n/g, '\n')
    .replace(/\s+(?=(The Core Concept:|The Examiner's Trap:|Level Up:|Nearby Concepts:))/g, '\n\n')
    .replace(/\s+(?=(Step\s+\d+:))/g, '\n')
    .replace(/^(The Core Concept:|The Examiner's Trap:|Level Up:|Nearby Concepts:)/gm, '### $1')
    .replace(/^(Step\s+\d+:)/gm, '- **$1**')
    .trim()
}