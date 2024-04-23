

import vscode from 'vscode'

const window = vscode.window


export async function Q<T extends readonly any[]>({
  prompt,
  choices,
  allowCustomValues = false,
}: {
  prompt: string,
  choices?: T,
  allowCustomValues?: boolean
}): Promise<T[number]> {
  if (choices) return new Promise((resolve) => {
    const quickPick = window.createQuickPick()
    quickPick.items = choices.map(choice => ({ label: choice }))

    if (prompt) quickPick.title = prompt
    if (allowCustomValues) {
      quickPick.onDidChangeValue(() => {
        // add a new code to the pick list as the first item
        if (!choices.includes(quickPick.value)) {
          const newItems = [quickPick.value, ...choices].map(label => ({ label }))
          quickPick.items = newItems
        }
      })
    }
    quickPick.onDidAccept(() => {
      const selection = quickPick.activeItems[0]
      resolve(selection.label)
      quickPick.hide()
    })
    quickPick.show()
  })
  else return await window.showInputBox({ prompt })
}
