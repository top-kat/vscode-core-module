/* eslint-disable no-cond-assign */
// @ts-nocheck
const vscode = require('vscode')
const window = vscode.window
const workspace = vscode.workspace

const { isset } = require('../utils')

//----------------------------------------
// CONFIG
//----------------------------------------

const config = {
    /** Will be converted to vscode.window.createTextEditorDecorationType */
    stylesRaw: {
        // GLOBAL
        dim: { opacity: '0.6' },
        delete: {
            fontWeight: 'bold',
            backgroundColor: '#953627',
            color: '#000',
        },
        warningSign: {
            fontWeight: 'bold',
            backgroundColor: '#A17D2B',
            color: '#000',
        },
        todo: {
            fontWeight: 'bold',
            backgroundColor: '#A17D2B',
            color: '#000',
        },
        error: {
            color: '#c55e5e',
        },
        comment: {
            color: '#777',
        }
    },
    styles: {},
}

for (const name in config.stylesRaw) config.styles[name] = window.createTextEditorDecorationType(config.stylesRaw[name])

const process = {
    all(editor) {
        regexpHighlight(/\/!\\/g, config.styles.warningSign)
        regexpHighlightFirstCapturingGroup(/(TODO)/g, config.styles.todo)
        regexpHighlightFirstCapturingGroup(/(DELETEME|TODELETE)/g, config.styles.delete)
        regexpHighlight(/(?:\$\.throw|errors?)(?:\.|\[)[[\]A-Za-z0-9_]+/g, config.styles.error) // $.throw.err('é')
        regexpHighlightFirstCapturingGroup(/(applicationError)\(/g, config.styles.error)
        regexpHighlight(/doc: `[^`]+`/g, config.styles.comment)
    },
    extension: {},
}

const fileTypes = Object.keys(process)

//----------------------------------------
// INIT
//----------------------------------------
module.exports = (ctx = {}) => {
    highlight()

    window.onDidChangeActiveTextEditor(highlight, null, ctx.subscriptions)

    workspace.onDidChangeTextDocument(highlight, null, ctx.subscriptions)
}


//----------------------------------------
// HELPERS
//----------------------------------------
function highlight() {
    try {
        const editor = window.activeTextEditor
        if (!editor || !editor.document) return

        const [, fileType, extension] = editor.document.fileName.match(/(?:-([^-.]*))?\.([a-z0-9]+)$/) || []

        if (fileType && fileTypes.includes(fileType)) process[fileType](editor)

        process.all(editor)

        if (isset(process.extension[extension])) process.extension[extension](editor)
    } catch (err) { console.error(err) }
}

/** Highlight whole match of the regexp */
function regexpHighlight(regexp, style) {
    const editor = window.activeTextEditor
    if (!isset(style)) throw new Error('style is not defined for regexpHighlight')
    const text = editor.document.getText()
    let match
    const ranges = []
    while ((match = regexp.exec(text))) {
        const start = editor.document.positionAt(match.index)
        const end = editor.document.positionAt(match.index + match[0].length)

        const range = new vscode.Range(start, end)

        ranges.push(range)
    }

    if (ranges.length) setTimeout(() => editor.setDecorations(style, ranges), 0) // FIX I duno problem
}

/**
 * @param {Array} styleForCapturingGroups [styleForWholeMatch, styleFor1styCapturing]
 * @param {*} hoverMessage
 */
function regexpHighlightFirstCapturingGroup(regexp, styleForCapturingGroup, styleForTheRest$) {
    const editor = window.activeTextEditor

    const text = editor.document.getText()
    let match
    const ranges = [
        [], // the rest
        [] // 1st capturing group
    ]

    while (match = regexp.exec(text)) {
        if (!isset(match[1])) continue

        const match1Start = match.index + match[0].lastIndexOf(match[1])
        const match1End = match1Start + match[1].length

        if (styleForTheRest$) ranges[0].push(match.index, match1Start, match1End, match.index + match[0].length)
        if (styleForCapturingGroup) ranges[1].push(match1Start, match1End) // match 1 range
    }

    ranges.forEach((arrayOfStartEnd, i) => {
        const style = i === 1 ? styleForCapturingGroup : styleForTheRest$
        if (!isset(style)) return
        const rangesLocal = []
        arrayOfStartEnd.forEach((start, i2) => {
            if (i2 % 2 !== 1) {
                const end = arrayOfStartEnd[i2 + 1]
                rangesLocal.push(new vscode.Range(editor.document.positionAt(start), editor.document.positionAt(end)))
            }
        })

        editor.setDecorations(style, rangesLocal)
    })
}
