"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = __importDefault(require("vscode"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const simple_file_templater_1 = __importDefault(require("simple-file-templater"));
const window = vscode_1.default.window;
const { randomItemInArray, camelCase, pascalCase, dashCase, asArray } = require('../utils');
exports.default = () => {
    vscode_1.default.commands.registerCommand('coreVscodeModule.generate', async () => {
        try {
            const workspacePath = vscode_1.default.workspace.workspaceFolders?.[0].uri.path || './';
            const choices = [
                `SERVICE`,
                `MODEL`,
                `DEFINITIONS`,
                `SEED`,
                `TESTFLOW`,
                'TEST',
                'ERROR'
            ];
            const whatToGenerate = await Q({
                prompt: `What to generate ?`,
                choices
            });
            const isDb = ['MODEL'].includes(whatToGenerate);
            let basePath;
            const folderForEnd = 'back';
            const appFolder = isDb ? 'db' : 'apps';
            if (fs_1.default.existsSync(path_1.default.join(workspacePath, 'src')))
                basePath = path_1.default.join(workspacePath, 'src');
            else {
                basePath = (await vscode_1.default.workspace.findFiles(`**/${folderForEnd}/src/**/*`)).reduce((serverBasePath, file) => {
                    return serverBasePath || file.path.split(`/${folderForEnd}/src/`)[0] + `/${folderForEnd}/src/`;
                }, '');
                if (!basePath) {
                    const appsDir = path_1.default.join(workspacePath, appFolder);
                    const dirs = fs_1.default.readdirSync(appsDir).filter(file => fs_1.default.statSync(appsDir + '/' + file).isDirectory()).filter(f => !f.includes('front'));
                    let dir;
                    if (dirs.length > 1) {
                        dir = await Q({
                            prompt: randomItemInArray([`Choose ${isDb ? 'database' : 'project'}`]),
                            choices: dirs.map(d => d.replace(/^.*\/([^/]+$)/, '$1')),
                        });
                    }
                    else
                        dir = dirs[0].replace(/^.*\/([^/]+$)/, '$1');
                    basePath = path_1.default.join(appsDir, dir);
                }
            }
            const corePathRoot = fs_1.default.existsSync(path_1.default.join(basePath, '/00_nuke')) ? '00_nuke' : fs_1.default.existsSync(path_1.default.join(basePath, '/0_core')) ? '0_core' : '../../packages/core-backend';
            const moduleNames = await findAllModuleNames(path_1.default.join(basePath, 'src'), [corePathRoot, 'dist/', '2_generated']);
            const selectedModuleR = isDb ? '' : await Q({
                prompt: `In which module?`,
                choices: moduleNames,
                allowCustomValues: true,
            });
            const selectedModule = selectedModuleR.toString(); // hack for no red to appear
            let fileName;
            if (whatToGenerate.includes('DAO')) {
                const modelBaseDir = path_1.default.join(basePath, 'src/models');
                const filesInModelFolder = fs_1.default.readdirSync(modelBaseDir);
                const modelNames = [];
                filesInModelFolder.forEach(fileName => {
                    if (fileName.includes('.model.')) {
                        const daoName = fileName.replace('.model.', '.dao.');
                        const hasDao = filesInModelFolder.includes(daoName);
                        if (!hasDao) {
                            modelNames.push(fileName.replace(/^(.+)\.model\.[tj]s$/, '$1'));
                        }
                    }
                });
                fileName = await Q({
                    prompt: `For which model shall we create a DAO?`,
                    choices: modelNames,
                });
            }
            else {
                fileName = await Q({
                    prompt: `File name without type extension (Eg: 'userUpdate' OR 'reservationCancel')`,
                    // validateInput: str => isset(str) && str.length ? null : 'Cannot be empty',
                });
            }
            const mainChoiceFormatted = whatToGenerate.toLowerCase().replace(/ /g, '');
            const filesToGenerate = [mainChoiceFormatted];
            if (mainChoiceFormatted === 'model')
                filesToGenerate.push('mongodao');
            const extensions = {
                //            extension |   templateName      | folder
                service: /**/ [`.svc.ts`, `module-generic.svc.ts`, ``],
                definitions: [`.def.ts`, `module.def.ts`, ``],
                seed: /*   */ [`.seed.ts`, `module.seed.ts`, ``],
                model: /*  */ [`.model.ts`, `module.model.ts`, `models`],
                mongodao: /**/ [`.dao.ts`, `module.dao.ts`, `models`],
                firebasedao: [`.dao.ts`, `module-firebase.dao.ts`, `models`],
                testflow: /**/ [`.test-flow.ts`, `module.test-flow.ts`, `tests`],
                test: /*   */ [`.test.ts`, `module.test-flow.ts`, `tests`],
                error: /*  */ [`.error.ts`, `module.error.ts`, ``],
            };
            for (const fileToGenerate of filesToGenerate) {
                const [extension, templateName, folderName] = extensions[fileToGenerate];
                const generatedFilePath = path_1.default.join(basePath, 'src', selectedModule, folderName, fileName + extension);
                const templatePath = path_1.default.join(basePath, `${corePathRoot}/src/templates/${templateName}`);
                await writeAndopenFile([generatedFilePath, templatePath, moduleNameVarz(isDb ? fileName : selectedModule)]);
            }
        }
        catch (err) {
            console.error(`err`, err);
            vscode_1.default.window.showErrorMessage(err?.toString());
            vscode_1.default.window.showInformationMessage(randomItemInArray(['Whooops!! shit happens...', 'Next time avoid waking me up', 'What! All that for.......that ?!', 'little dick', `You don't dare ? Dare you ?`, `Next time I'll stay in my bed!`]));
        }
    });
};
//----------------------------------------
// HELPERS
//----------------------------------------
function moduleNameVarz(moduleName) {
    if (/[A-Z]/.test(moduleName))
        moduleName = moduleName.replace(/([A-Z])/g, '-$1'); // allow camelCase
    const moduleNameBits = moduleName.toLowerCase().split('-');
    return {
        myNewModule: camelCase(...moduleNameBits),
        MyNewModule: pascalCase(...moduleNameBits),
        'my-new-module': dashCase(...moduleNameBits),
    };
}
async function Q({ prompt, choices, allowCustomValues = false, }) {
    if (choices)
        return new Promise((resolve) => {
            const quickPick = window.createQuickPick();
            quickPick.items = choices.map(choice => ({ label: choice }));
            if (prompt)
                quickPick.title = prompt;
            if (allowCustomValues) {
                quickPick.onDidChangeValue(() => {
                    // add a new code to the pick list as the first item
                    if (!choices.includes(quickPick.value)) {
                        const newItems = [quickPick.value, ...choices].map(label => ({ label }));
                        quickPick.items = newItems;
                    }
                });
            }
            quickPick.onDidAccept(() => {
                const selection = quickPick.activeItems[0];
                resolve(selection.label);
                quickPick.hide();
            });
            quickPick.show();
        });
    else
        return await window.showInputBox({ prompt });
}
async function openFiles(...filePaths) {
    for (const filePath of asArray(filePaths))
        await vscode_1.default.workspace.openTextDocument(vscode_1.default.Uri.file(filePath)).then(doc => vscode_1.default.window.showTextDocument(doc, { preview: false }));
}
/**
 * @param  {...any} configs [filePath, templatePath]
 */
async function writeAndopenFile(...configs) {
    for (const [filePath, templatePath, varz = {}, replaceInFileNames = {}] of configs) {
        simple_file_templater_1.default.templater(templatePath, // from
        filePath, // to
        varz, // replace
        replaceInFileNames);
        // await fs.outputFile(filePath, fs.readFileSync(templatePath, 'utf-8'));
        await openFiles(filePath);
    }
}
async function findAllModuleNames(basePath, ignorePatterns) {
    const filesInModelFolder = fs_1.default.readdirSync(basePath);
    return filesInModelFolder.filter(fileName => {
        const fileStat = fs_1.default.statSync(path_1.default.join(basePath, fileName));
        return !ignorePatterns.some(ip => fileName.includes(ip)) && fileStat.isDirectory();
    });
}
//# sourceMappingURL=generate.js.map