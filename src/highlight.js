/* eslint-disable no-cond-assign */
// @ts-nocheck
const vscode = require('vscode');
const window = vscode.window;
const workspace = vscode.workspace;

const config = require('./config');

const { isset, allMatches } = require('@cawita/data-validation-utils/src');

//----------------------------------------
// CONFIG
//----------------------------------------

const config = {
    /** Will be converted to vscode.window.createTextEditorDecorationType */
    stylesRaw: {
        // PROJECTIONS
        projectionChars: { color: '#AAAAAA' }, //#ffaa77
        // TEST / TEST FLOW
        dimTestFlow: { opacity: '0.5', color: '#83bb71' },
        dimTest: { opacity: '0.5' /* , color: '#CCC'  */ },
        // testName: false,
        testFlowName: { color: '#83bb71' },
        testDescriptionSynopsis: { color: '#888' },
        testDescription: {
            color: '#fff',///
            opacity: '0.45',
            //color: '#68b3e7' // bleu fonce
            //color: '#4ed7d4' // bleu clair
            // color: '#d7a44e' orange
            //color: '#bdbdbd' // gris
        },
        testDescriptionOut: {
            opacity: '0.28',
            color: '#fff'
        },
        // GLOBAL
        dim: { opacity: '0.6' },
        delete: {
            fontWeight: 'bold',
            backgroundColor: '#953627',
            color: '#000',
        },
        bridgeService: {
            color: '#C7407D',
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
            color: '#D5756B',
        },
        errorDim: {
            color: '#D5756B',
            opacity: '0.6'
        },
    },
    styles: {},
};

const process = {
    all(editor) {
        regexpHighlight(editor, /\/!\\/g, config.styles.warningSign);
        regexpHighlightFirstCapturingGroup(editor, /(TODO)/g, config.styles.todo);
        regexpHighlightFirstCapturingGroup(editor, /(DELETEME|TODELETE)/g, config.styles.delete);
        regexpHighlightFirstCapturingGroup(editor, /\$\.throw\.[A-Za-z0-9_]+/g, config.styles.error, config.styles.errorDim);
    },
    extension: {
        // js(editor) {
        //    regexpHighlightFirstCapturingGroup(editor, / (B|bridgeService)\./g, config.styles.bridgeService);
        // },
    },
    // PROJECTIONS
    projections(editor) {
        const text = editor.document.getText();
        const match = /(projections\s*:\s*{(?:.|\s)*?)}(?:.|\s)*?mask/.exec(text);
        if (isset(match[1])) {
            const colorizedChars = ['[', ']', ',']; // array 4 perf
            const stringChar = ['\'', '`', '"'];
            const decorations = [];
            let precedingChar = false;
            let stringCharOpen = false;

            match[1].split('').forEach((char, i) => {
                if (stringCharOpen && char === stringCharOpen && precedingChar !== '\\') {
                    // close a string
                    stringCharOpen = false;
                } else if (stringCharOpen) {
                    // add index
                    if (colorizedChars.includes(char)) {
                        const start = editor.document.positionAt(match.index + i);
                        const end = editor.document.positionAt(match.index + i + 1);
                        decorations.push(new vscode.Range(start, end));
                    }
                } else if (stringChar.includes(char)) {
                    // open a string
                    stringCharOpen = char;
                }
                precedingChar = char;
            });

            editor.setDecorations(config.styles.projectionChars, decorations);
        }
    },
    flow(editor) {
        // require test flow in green to catch attention
        regexpHighlightFirstCapturingGroup(editor, /require\(\s?'.*\/(.*?)-test-flow'\s?\)/g, config.styles.testFlowName, config.styles.dimTestFlow);

        // require test (dim the not relevant part)
        // regexpHighlightFirstCapturingGroup( editor, /require\(\s?'.*\/(.*?)test'\s?\)/g, config.styles.testName, config.styles.dimTest);

        // highlight test description
        regexpHighlightFirstCapturingGroup(editor, /description: (.*?),\s*\n/g, config.styles.testDescription, config.styles.testDescriptionOut);
        regexpHighlight(editor, /\d+\).*$/g, config.styles.testDescriptionSynopsis);
    },
};

const fileTypes = Object.keys(process);

//----------------------------------------
// INIT
//----------------------------------------
module.exports = ctx => {
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
    const text = editor.document.getText();
    let match;
    const ranges = [];
    while ((match = regexp.exec(text))) {
        const start = editor.document.positionAt(match.index);
        const end = editor.document.positionAt(match.index + match[0].length);
        const range = new vscode.Range(start, end);
        ranges.push(isset(hoverMessage) ? { range, hoverMessage } : range);
    }
    editor.setDecorations(style, ranges);
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
