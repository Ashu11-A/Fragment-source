const maxInspectableBytes = 8 * 1024 * 1024

type PluginBundleValidationResult = {
  valid: boolean
  reason?: string
}

function maskCommentsAndStrings(source: string): string {
  let masked = ''
  let index = 0
  let mode: 'code' | 'lineComment' | 'blockComment' | 'single' | 'double' | 'template' = 'code'

  while (index < source.length) {
    const char = source[index] ?? ''
    const next = source[index + 1] ?? ''

    if (mode === 'code') {
      if (char === '/' && next === '/') {
        masked += '  '
        index += 2
        mode = 'lineComment'
        continue
      }
      if (char === '/' && next === '*') {
        masked += '  '
        index += 2
        mode = 'blockComment'
        continue
      }
      if (char === '\'') mode = 'single'
      if (char === '"') mode = 'double'
      if (char === '`') mode = 'template'
      masked += char
      index += 1
      continue
    }

    if (mode === 'lineComment') {
      masked += char === '\n' ? '\n' : ' '
      if (char === '\n') mode = 'code'
      index += 1
      continue
    }

    if (mode === 'blockComment') {
      masked += char === '\n' ? '\n' : ' '
      if (char === '*' && next === '/') {
        masked += ' '
        index += 2
        mode = 'code'
      } else {
        index += 1
      }
      continue
    }

    masked += char === '\n' ? '\n' : ' '
    if (char === '\\') {
      masked += next === '\n' ? '\n' : ' '
      index += 2
      continue
    }
    if ((mode === 'single' && char === '\'') || (mode === 'double' && char === '"') || (mode === 'template' && char === '`')) {
      mode = 'code'
    }
    index += 1
  }

  return masked
}

function hasSourceDefaultPluginExport(maskedSource: string): boolean {
  return /export\s+default\s+new\s+Plugin\s*\(\s*\{/.test(maskedSource)
}

function hasCompiledDefaultPluginExport(maskedSource: string): boolean {
  const pluginCtorMatch = maskedSource.match(/\b(?:var|let|const)\s+([A-Za-z_$][\w$]*)\s*=\s*new\s+Plugin\s*\(\s*\{/)
  if (!pluginCtorMatch?.[1]) return false

  const exportedName = pluginCtorMatch[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`export\\s*\\{[\\s\\S]*\\b${exportedName}\\s+as\\s+default\\b[\\s\\S]*\\}`).test(maskedSource)
}

export function validatePluginBundle(buffer: Buffer): PluginBundleValidationResult {
  if (buffer.byteLength === 0) {
    return { valid: false, reason: 'Plugin bundle is empty.' }
  }

  if (buffer.byteLength > maxInspectableBytes) {
    return { valid: false, reason: 'Plugin bundle is too large to validate.' }
  }

  if (buffer.includes(0)) {
    return { valid: false, reason: 'Plugin bundle must be text JavaScript or TypeScript.' }
  }

  const rawSource = buffer.toString('utf8')
  const pluginIndex = rawSource.lastIndexOf('new Plugin')
  const exportIndex = rawSource.lastIndexOf('export')
  const anchor = [pluginIndex, exportIndex].filter((value) => value >= 0).sort((left, right) => left - right)[0] ?? 0
  const inspectedSource = rawSource.slice(Math.max(0, anchor - 2_000))
  const source = maskCommentsAndStrings(inspectedSource)
  const valid = hasSourceDefaultPluginExport(source) || hasCompiledDefaultPluginExport(source)

  if (!valid) {
    return {
      valid: false,
      reason: 'Plugin bundle must default-export a Plugin instance, for example: export default new Plugin({...}).',
    }
  }

  return { valid: true }
}
