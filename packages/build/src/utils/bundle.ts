import { join } from 'path'
import { IndentationText, Project } from 'ts-morph'
import { __plugin_dirname } from 'utils'
import { getPlatformPath } from '@/app'

export function bundle({ cwd, path }: { cwd?: string, path: string }): string {
  const project = new Project({
    manipulationSettings: {
      indentationText: IndentationText.TwoSpaces
    },
    tsConfigFilePath: join(cwd ?? __plugin_dirname, 'tsconfig.json'),
  })

  const sourceFiles = [project.addSourceFileAtPath(path)]
  const visited = new Set<string>()
  
  while (sourceFiles.length > 0) {
    const currentFile = sourceFiles.pop()!
    const filePath = getPlatformPath(currentFile.getFilePath())

    if (visited.has(filePath)) continue 
    visited.add(filePath)
    
    for (const importDecl of currentFile.getImportDeclarations()) {
      const resolvedFile = importDecl.getModuleSpecifierSourceFile()
      if (!resolvedFile) continue
      
      const fileName = getPlatformPath(resolvedFile.getFilePath())
      const isPackage = fileName.includes('node_modules')
      const isEntry = fileName.includes('.entry.')
      
      if (!(isEntry || isPackage) && !visited.has(fileName)) {
        importDecl.remove()
        sourceFiles.push(resolvedFile)
      }
    }
  }
  
  let output: string = ''
  
  for (const filePath of Array.from(visited).reverse()) {
    const relativePath = filePath.slice(filePath.indexOf('src'))
    const sourceFile = project.getSourceFile(filePath)!
    const content = sourceFile.getFullText()
    const isPackage = filePath.includes('node_modules')
    const isEntry = filePath.includes('.entry.')

    if ((isPackage || isEntry) && !filePath.includes(path)) continue
    output += `\n// ${relativePath}\n${filePath.includes(path) ? content : content.replaceAll('export ', '')}`
  }

  return output.toString()
}