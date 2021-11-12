/* eslint-disable no-cond-assign */
// @ts-nocheck
const vscode = require('vscode');
const window = vscode.window;
const workspace = vscode.workspace;

const { isset, allMatches } = require('../utils');

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
    },
    styles: {},
};

for (const name in config.stylesRaw) config.styles[name] = window.createTextEditorDecorationType(config.stylesRaw[name]);

const process = {
    all(editor) {
        regexpHighlight(editor, /\/!\\/g, config.styles.warningSign);
        regexpHighlightFirstCapturingGroup(editor, /(TODO)/g, config.styles.todo);
        regexpHighlightFirstCapturingGroup(editor, /(DELETEME|TODELETE)/g, config.styles.delete);
        regexpHighlight(editor, /\$\.throw(\.[[\]A-Za-z0-9_]+)?/g, config.styles.error);
    },
    extension: {},
};

const fileTypes = Object.keys(process);

//----------------------------------------
// INIT
//----------------------------------------
module.exports = (ctx = {}) => {
    highlight();

    window.onDidChangeActiveTextEditor(highlight, null, ctx.subscriptions);

    workspace.onDidChangeTextDocument(highlight, null, ctx.subscriptions);

    //----------------------------------------
    // TEST FLOW AUTO SYNOPSIS
    //----------------------------------------
    workspace.onWillSaveTextDocument(async function (event) {
        highlight();
        try {
            const editor = window.activeTextEditor;
            if (editor && event.document === editor.document && editor.document.fileName.endsWith('flow.js')) {
                const text = editor.document.getText();
                const match = /^\/\* SYNOPSIS[\s\S]*?\*\/\n?\n?/.exec(text) || [];
                const alreadyExistingSelection = isset(match[0]);
                const allDescriptionMatches = allMatches(text, /description: `(.*?)`,\s*\n/g);
                let synopsis = '/* SYNOPSIS\n\n';
                let i = 0;
                for (const [, description] of allDescriptionMatches) synopsis += `${++i}) ${description}\n`;
                synopsis += '*/\n\n';
                await editor.edit(editBuilder => {
                    if (alreadyExistingSelection) {
                        const deleteStart = editor.document.positionAt(match.index);
                        const deleteEnd = editor.document.positionAt(match.index + match[0].length);
                        editBuilder.delete(new vscode.Range(deleteStart, deleteEnd));
                    }
                    editBuilder.insert(editor.document.positionAt(0), synopsis);
                });
            }
        } catch (err) { console.error(err); }
    }, null, ctx.subscriptions);
};


//----------------------------------------
// HELPERS
//----------------------------------------
function highlight() {
    try {
        const editor = window.activeTextEditor;
        if (!editor || !editor.document) return;

        const [, fileType, extension] = editor.document.fileName.match(/(?:-([^-.]*))?\.([a-z0-9]+)$/) || [];

        if (fileType && fileTypes.includes(fileType)) process[fileType](editor);

        process.all(editor);

        if (isset(process.extension[extension])) process.extension[extension](editor);
    } catch (err) { console.error(err); }
}

/** Highlight whole match of the regexp */
function regexpHighlight(editor, regexp, style, hoverMessage) {
    if (!isset(style)) throw new Error('style is not defined for regexpHighlight')
    const text = editor.document.getText();
    let match;
    const ranges = [];
    while ((match = regexp.exec(text))) {
        const start = editor.document.positionAt(match.index);
        const end = editor.document.positionAt(match.index + match[0].length);
        const range = new vscode.Range(start, end);
        ranges.push(isset(hoverMessage) ? { range, hoverMessage } : range);
    }
    if (ranges.length) editor.setDecorations(style, ranges);
}

/**
 * @param {Array} styleForCapturingGroups [styleForWholeMatch, styleFor1styCapturing]
 * @param {*} hoverMessage
 */
function regexpHighlightFirstCapturingGroup(editor, regexp, styleForCapturingGroup, styleForTheRest$) {
    const text = editor.document.getText();
    let match;
    const ranges = [
        [], // the rest
        [] // 1st capturing group
    ];

    while (match = regexp.exec(text)) {
        if (!isset(match[1])) continue;
        console.log(`match`, match);

        const match1Start = match.index + match[0].lastIndexOf(match[1]);
        const match1End = match1Start + match[1].length;

        if (styleForTheRest$) ranges[0].push(match.index, match1Start, match1End, match.index + match[0].length);
        if (styleForCapturingGroup) ranges[1].push(match1Start, match1End); // match 1 range
    }

    ranges.forEach((arrayOfStartEnd, i) => {
        const style = i === 1 ? styleForCapturingGroup : styleForTheRest$;
        if (!isset(style)) return;
        const rangesLocal = [];
        arrayOfStartEnd.forEach((start, i2) => {
            if (i2 % 2 !== 1) {
                const end = arrayOfStartEnd[i2 + 1];
                rangesLocal.push(new vscode.Range(editor.document.positionAt(start), editor.document.positionAt(end)));
            }
        });

        editor.setDecorations(style, rangesLocal);
    });
}
