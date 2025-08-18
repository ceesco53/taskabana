// client/src/utils/cleanNotesHtml.ts

const EMPTY_BLOCK = new Set(['P', 'DIV'])
const BLOCKY = new Set(['UL', 'OL', 'BLOCKQUOTE', 'PRE'])

function isEmptyBlockEl(el: Element) {
  if (!EMPTY_BLOCK.has(el.tagName)) return false
  return /^(\s|&nbsp;|<br\s*\/?>)*$/i.test(el.innerHTML)
}

function stripWhitespaceTextEdges(parent: Element) {
  while (parent.firstChild && parent.firstChild.nodeType === Node.TEXT_NODE && !parent.firstChild.nodeValue?.trim()) {
    parent.removeChild(parent.firstChild)
  }
  while (parent.lastChild && parent.lastChild.nodeType === Node.TEXT_NODE && !parent.lastChild.nodeValue?.trim()) {
    parent.removeChild(parent.lastChild)
  }
}

function collapseRuns(parent: Element) {
  const kids = Array.from(parent.childNodes)
  let run: Element[] = []
  const toRemove: Element[] = []

  const flush = () => {
    if (run.length > 1) {
      for (let i = 1; i < run.length; i++) toRemove.push(run[i])
    }
    run = []
  }

  for (const n of kids) {
    if (n.nodeType === Node.ELEMENT_NODE && isEmptyBlockEl(n as Element)) {
      run.push(n as Element)
    } else {
      flush()
    }
  }
  flush()

  toRemove.forEach((el) => el.parentNode?.removeChild(el))
}

function stripEdgeEmpties(parent: Element) {
  while (parent.firstElementChild && isEmptyBlockEl(parent.firstElementChild)) {
    parent.removeChild(parent.firstElementChild)
  }
  while (parent.lastElementChild && isEmptyBlockEl(parent.lastElementChild)) {
    parent.removeChild(parent.lastElementChild)
  }
}

function pruneEmptiesAroundBlocks(parent: Element) {
  let el = parent.firstElementChild
  while (el) {
    const next = el.nextElementSibling
    if (BLOCKY.has(el.tagName)) {
      let prev = el.previousElementSibling
      while (prev && isEmptyBlockEl(prev)) {
        const rm = prev
        prev = prev.previousElementSibling
        rm.parentNode?.removeChild(rm)
      }
      let after = el.nextElementSibling
      while (after && isEmptyBlockEl(after)) {
        const rm = after
        after = after.nextElementSibling
        rm.parentNode?.removeChild(rm)
      }
    }
    el = next
  }
}

function tidyPreBlocks(parent: Element) {
  parent.querySelectorAll('pre').forEach((pre) => {
    const text = pre.textContent ?? ''
    const trimmed = text.replace(/^\s*\n+/g, '').replace(/\n+\s*$/g, '')
    if (trimmed !== text) pre.textContent = trimmed
  })
}

export function cleanNotesHtml(input: string): string {
  if (!input) return ''
  const container = document.createElement('div')
  container.innerHTML = input

  stripWhitespaceTextEdges(container)
  pruneEmptiesAroundBlocks(container)
  collapseRuns(container)
  stripEdgeEmpties(container)
  tidyPreBlocks(container)
  pruneEmptiesAroundBlocks(container)
  stripEdgeEmpties(container)

  return container.innerHTML.trim()
}