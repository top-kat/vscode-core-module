/* eslint-disable no-cond-assign */

import vscode from 'vscode'
const window = vscode.window
const workspace = vscode.workspace

import { isset } from "../utils"

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
        },
        godMode: {
            fontWeight: 'bold',
            color: '#3fa787',
            backgroundColor: '#316353',
        },
        packageJsonH1: {
            fontWeight: 'bold',
            color: '#80B6F8',
            backgroundColor: '#18212C',
        }
    },
    styles: {} as any, // will be filled
}

for (const name in config.stylesRaw) config.styles[name] = window.createTextEditorDecorationType(config.stylesRaw[name])

const init = (fileName: string) => {
    regexpHighlight(/\/!\\/g, config.styles.warningSign)
    regexpHighlightFirstCapturingGroup(/(TODO)/g, config.styles.todo)
    regexpHighlightFirstCapturingGroup(/(DELETEME|TODELETE)/g, config.styles.delete)
    regexpHighlight(/(?:\$\.throw|errors?)(?:\.|\[)[[\]A-Za-z0-9_]+/g, config.styles.error)
    regexpHighlightFirstCapturingGroup(/(applicationError)\(/g, config.styles.error)
    regexpHighlight(/doc: `[^`]+`/g, config.styles.comment)
    regexpHighlightFirstCapturingGroup(/(ctx.GM|ctx.system\(\))/g, config.styles.godMode)

    console.log('fileName', fileName);
    if (/package.json/.test(fileName)) {
        console.log(`INSIDDEE22`);
        regexpHighlight(/"\/\/.+/g, config.styles.comment)
        regexpHighlight(/"==.+/g, config.styles.packageJsonH1)
    }
}

//----------------------------------------
// INIT
//----------------------------------------
export default (ctx = {} as any) => {
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

        const { fileName } = editor.document

        init(fileName)

    } catch (err) { console.error(err) }
}

/** Highlight whole match of the regexp */
function regexpHighlight(regexp, style) {
    const editor = window.activeTextEditor
    if (!editor) throw 'NO EDITOR ACTIVE'
    if (!isset(style)) throw new Error('style is not defined for regexpHighlight')
    const text = editor.document.getText()
    let match
    const ranges = [] as vscode.Range[]
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
function regexpHighlightFirstCapturingGroup(regexp: RegExp, styleForCapturingGroup, styleForTheRest$?) {
    const editor = window.activeTextEditor
    if (!editor) throw 'NO EDITOR ACTIVE'

    const text = editor.document.getText()
    let match: RegExpExecArray | null
    const ranges = [
        [], // the rest
        [] // 1st capturing group
    ] as [any, any]

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
        const rangesLocal = [] as any[]
        arrayOfStartEnd.forEach((start, i2) => {
            if (i2 % 2 !== 1) {
                const end = arrayOfStartEnd[i2 + 1]
                rangesLocal.push(new vscode.Range(editor.document.positionAt(start), editor.document.positionAt(end)) as any)
            }
        })

        editor.setDecorations(style, rangesLocal)
    })
}
