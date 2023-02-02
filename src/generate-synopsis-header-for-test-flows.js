const vscode = require('vscode')
const window = vscode.window
const workspace = vscode.workspace

const { isset, allMatches } = require('../utils')

//----------------------------------------
// TEST FLOW AUTO SYNOPSIS
//----------------------------------------
module.exports = (ctx = {}) => {
    workspace.onWillSaveTextDocument(async function (event) {
        try {
            const editor = window.activeTextEditor
            if (editor && event.document === editor.document && editor.document.fileName.endsWith('.test-flow.ts') | editor.document.fileName.endsWith('.test.ts')) {
                const text = editor.document.getText()
                if (text.includes('rest-test')) {
                    const match = /^\/\* SYNOPSIS[\s\S]*?\*\/\n?\n?/.exec(text) || []
                    const alreadyExistingSelection = isset(match[0])
                    const allDescriptionMatches = allMatches(text, /doc: `(.+?)`,\s*\n/g)
                    let synopsis = '/* SYNOPSIS\n\n'
                    let i = 0
                    for (const [, description] of allDescriptionMatches) synopsis += `${++i}) ${description}\n`
                    synopsis += '*/\n\n'
                    await editor.edit(editBuilder => {
                        if (alreadyExistingSelection) {
                            const deleteStart = editor.document.positionAt(match.index)
                            const deleteEnd = editor.document.positionAt(match.index + match[0].length)
                            editBuilder.delete(new vscode.Range(deleteStart, deleteEnd))
                        }
                        editBuilder.insert(editor.document.positionAt(0), synopsis)
                    })
                }
            }
        } catch (err) { console.error(err) }
    }, null, ctx.subscriptions)
}