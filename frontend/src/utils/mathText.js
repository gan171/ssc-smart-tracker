const LATEX_PATTERN = /\\[a-zA-Z]+|\b[a-zA-Z]+\^\{[^}]+\}|\b[a-zA-Z]+_\{[^}]+\}/

export function normalizeMathText(content) {
  if (typeof content !== 'string') return ''

  const trimmed = content.trim()
  if (!trimmed) return ''

  // If math delimiters already exist, only normalize escaped LaTeX commands.
  if (trimmed.includes('$')) {
    return trimmed.replace(/\\\\(?=[a-zA-Z]+)/g, '\\')
  }

  // Convert double-backslashed commands from stored JSON into valid LaTeX commands.
  const normalized = trimmed.replace(/\\\\(?=[a-zA-Z]+)/g, '\\')

  // Wrap plain LaTeX-looking option text so remark-math can render it.
  if (LATEX_PATTERN.test(normalized)) {
    return `$${normalized}$`
  }

  return normalized
}
