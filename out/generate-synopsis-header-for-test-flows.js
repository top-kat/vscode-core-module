"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = __importDefault(require("vscode"));
const utils_1 = require("../utils");
const workspace = vscode_1.default.workspace;
const window = vscode_1.default.window;
//----------------------------------------
// TEST FLOW AUTO SYNOPSIS
//----------------------------------------
exports.default = (ctx = {}) => {
    workspace.onWillSaveTextDocument(async function (event) {
        try {
            const editor = window.activeTextEditor;
            if (!editor)
                return;
            if (event.document === editor.document && editor.document.fileName.endsWith('.test-flow.ts') || editor.document.fileName.endsWith('.test.ts')) {
                const text = editor.document.getText();
                if (text.includes('rest-test')) {
                    const match = /^\/\* SYNOPSIS[\s\S]*?\*\/\n?\n?/.exec(text);
                    const alreadyExistingSelection = match && match[0];
                    const matchIndex = match && match.index ? match.index : 0;
                    const matchEnd = match?.[0]?.length || 0;
                    const allDescriptionMatches = (0, utils_1.allMatches)(text, /doc: `(.+?)`,\s*\n/g);
                    let synopsis = '/* SYNOPSIS\n\n';
                    for (const [i, description] of allDescriptionMatches)
                        synopsis += `${i}) ${description}\n`;
                    synopsis += '*/\n\n';
                    await editor.edit(editBuilder => {
                        if (alreadyExistingSelection) {
                            const deleteStart = editor.document.positionAt(matchIndex);
                            const deleteEnd = editor.document.positionAt(matchIndex + matchEnd);
                            editBuilder.delete(new vscode_1.default.Range(deleteStart, deleteEnd));
                        }
                        editBuilder.insert(editor.document.positionAt(0), synopsis);
                    });
                }
            }
        }
        catch (err) {
            console.error(err);
        }
    }, null, ctx.subscriptions);
};
//# sourceMappingURL=generate-synopsis-header-for-test-flows.js.map