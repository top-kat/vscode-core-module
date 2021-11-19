const vscode = require('vscode');
const window = vscode.window;
const Path = require('path');
const fs = require('fs')
const templater = require('simple-file-templater');


const { isset, randomItemInArray, firstMatch, camelCase, pascalCase, dashCase, asArray } = require('../utils');

// let serverBasePath;
// let frontBasePath;
module.exports = () => {
    vscode.commands.registerCommand('coreVscodeModule.generate', async () => {
        try {
            let basePath, isFront, isBack, isOneLevelAboveRoot = false;

            const workspacePath = vscode.workspace.workspaceFolders[0].uri.path;

            if (workspacePath.includes('/server')) {
                isFront = false;
                isBack = true;
                basePath = Path.join(workspacePath, 'src');
            } else if (workspacePath.includes('front')) {
                isFront = true;
                isBack = false;
                basePath = Path.join(workspacePath, 'src');
            } else {
                const backOrFront = await Q({
                    prompt: randomItemInArray([`Hi DAD!! What do you want I generate for you today ?`, `Huh O_o !! You waked me up!`, `Lazy boy! Do you really need that I do the work for you ?`, 'Oh SHIT! let me finish first!']),
                    choices: [`BACK`, `FRONT`],
                });
                isFront = backOrFront === 'FRONT';
                isBack = backOrFront === 'BACK';
                const folderForEnd = isFront ? 'front' : 'back';
                console.log(`workspacePath`, workspacePath);
                if (fs.existsSync(Path.join(workspacePath, 'src'))) basePath = Path.join(workspacePath, 'src');
                else {
                    basePath = (await vscode.workspace.findFiles(`**/${folderForEnd}/src/**/*`)).reduce((serverBasePath, file) => {
                        return serverBasePath || file.path.split(`/${folderForEnd}/src/`)[0] + `/${folderForEnd}/src/`;
                    }, false);
                    isOneLevelAboveRoot = true
                }
                console.log(`basePath`, basePath);
            }

            const whatToGenerate = await Q({
                prompt: `What kind of file ?`,
                choices: isBack ? [
                    `SERVICE`,
                    `MODEL`,
                    `DAO`,
                    `DEFINITIONS`,
                    `IMPORT`,
                    `SEED`,
                ] : [
                    'COMPONENT',
                    `MODULE`,
                ],
            });

            if (whatToGenerate === `MODULE`) {
                //----------------------------------------
                // MODULE
                //----------------------------------------
                const moduleName = await Q({
                    prompt: `Module name ?`,
                    validateInput: str => isset(str) && str.length ? null : 'Cannot be empty',
                });
                const varz = {
                    ...moduleNameVarz(moduleName),
                    // others
                    '/\\*eslint-disable\\*/': '',
                    '// here for intellisense': '',
                };

                const createdPaths = templater.templater(
                    Path.join(basePath, `00_core/templates/new-module`), // from
                    Path.join(basePath, isFront ? varz.MyNewModule : varz['my-new-module']), // to
                    varz, // replace
                    { module: varz['my-new-module'], Module: varz.MyNewModule, }, // file name replacer
                );

                await openFiles(...createdPaths.filter(p => !p.includes('error')));
            } else {
                const frontModuleNames = await findAllModuleNames(isOneLevelAboveRoot ? 'frontend/src' : 'src', ['00_core', '/dist/']);
                const backModuleNames = await findAllModuleNames(isOneLevelAboveRoot ? 'server/src' : 'src', ['00_core', '/dist/']);

                const selectedModuleR = await Q({
                    prompt: `In which module?`,
                    choices: isFront ? frontModuleNames : backModuleNames,
                    allowCustomValues: true,
                });
                const selectedModule = selectedModuleR.toString(); // hack for no red to appear
                const fileName = await Q({
                    prompt: whatToGenerate === `COMPONENT` ? `Component name ?` : `File name without type extension (Eg: 'user-update' OR 'reservation-cancel')`,
                    validateInput: str => isset(str) && str.length ? null : 'Cannot be empty',
                });


                if ([`SERVICE`, `IMPORT`, `DEFINITIONS`, `MODEL`, `DAO`, `SEED`].includes(whatToGenerate)) {
                    //----------------------------------------
                    // GENERIC
                    //----------------------------------------
                    const extensions = {
                        service: [`.svc.ts`, `module-generic.svc.ts`],
                        import: [`-import.svc.ts`, `module-import.svc.ts`],
                        definitions: [`.def.ts`, `module.def.ts`],
                        seed: [`.seed.ts`, `module.seed.ts`],
                        model: [`.model.ts`, `module.model.ts`],
                        dao: [`.dao.ts`, `module.dao.ts`],
                    }
                    const [extension, templateName] = extensions[whatToGenerate.toLowerCase()]
                    const generatedFilePath = Path.join(basePath, selectedModule, 'services', fileName + extension);
                    const templatePath = Path.join(basePath, `00_core/templates/${templateName}`);
                    await writeAndopenFile([generatedFilePath, templatePath, moduleNameVarz(selectedModule)]);
                } else if (whatToGenerate === `COMPONENT`) {
                    //----------------------------------------
                    // COMPONENT
                    //----------------------------------------
                    const varz = {
                        ...moduleNameVarz(fileName),
                        // others
                        '/\\*eslint-disable\\*/': '',
                        '// here for intellisense': '',
                    };

                    const createdPaths = templater.templater(
                        Path.join(basePath, `00_core/templates/new-component`), // from
                        Path.join(basePath, selectedModule, `${varz.MyNewModule}`), // to
                        varz, // replace
                        { module: varz['my-new-module'], Module: varz.MyNewModule }, // file name replacer
                    );

                    await openFiles(...createdPaths);
                } else vscode.window.showInformationMessage(randomItemInArray(['Next time avoid waking me up', 'What! All that for.......that ?!', 'little dick', `You don't dare ? Dare you ?`, `Next time I'll stay in my bed!`]));
            }
        } catch (err) {
            console.error(`err`, err);
            vscode.window.showErrorMessage(err.toString());
            vscode.window.showInformationMessage(randomItemInArray(['Whooops!! shit happens...', 'What! All that for.......that ?!', 'little dick', `You don't dare ? Dare you ?`, `Next time I'll stay in my bed!`]));
        }
    });
};

//----------------------------------------
// HELPERS
//----------------------------------------

function moduleNameVarz(moduleName) {
    if (/[A-Z]/.test(moduleName)) moduleName = moduleName.replace(/([A-Z])/g, '-$1'); // allow camelCase

    const moduleNameBits = moduleName.toLowerCase().split('-');
    return {
        myNewModule: camelCase(...moduleNameBits),
        MyNewModule: pascalCase(...moduleNameBits),
        'my-new-module': dashCase(...moduleNameBits),
    };
}


async function Q(questionConfig) {
    if (questionConfig.choices) {
        const { choices, allowCustomValues } = questionConfig;
        return new Promise((resolve) => {
            const quickPick = window.createQuickPick();
            quickPick.items = choices.map(choice => ({ label: choice }));
            //  if (questionConfig.prompt) quickPick.placeholder = questionConfig.prompt
            if (questionConfig.prompt) quickPick.title = questionConfig.prompt
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
            quickPick.show();
        })
    } else {
        return await window.showInputBox(questionConfig);
    }
}
async function openFiles(...filePaths) {
    for (const filePath of asArray(filePaths)) await vscode.workspace.openTextDocument(vscode.Uri.file(filePath)).then(doc => vscode.window.showTextDocument(doc, { preview: false }));
}
/**
 * @param  {...any} configs [filePath, templatePath]
 */
async function writeAndopenFile(...configs) {
    for (const [filePath, templatePath, varz = {}, replaceInFileNames = {}] of configs) {
        templater.templater(
            templatePath, // from
            filePath, // to
            varz, // replace
            replaceInFileNames, // file name replacer
        );
        // await fs.outputFile(filePath, fs.readFileSync(templatePath, 'utf-8'));
        await openFiles(filePath);
    }
}

async function findAllModuleNames(nameOfRootFolder, ignorePatterns) {
    const allServerModuleConfigFilesUri = await vscode.workspace.findFiles(`**/${nameOfRootFolder}/**/*`);
    const allModulePaths = allServerModuleConfigFilesUri.reduce((uniqueModulePaths, actualFullPath) => {
        const [, modulePath] = actualFullPath.path.match(new RegExp(`(/${nameOfRootFolder}/[^/]+/).*$`)) || [];
        if (modulePath && !uniqueModulePaths.includes(modulePath) && ignorePatterns.every(ignorePattern => !modulePath.includes(ignorePattern))) uniqueModulePaths.push(modulePath);
        return uniqueModulePaths;
    }, []);

    const allModules = allModulePaths.reduce((moduleNames, actualPth) => {
        const moduleName = firstMatch(actualPth, new RegExp(`${nameOfRootFolder}.([^\\/]+).`));
        if (!moduleNames.includes(moduleName)) return [...moduleNames, moduleName];
        else return moduleNames;
    }, []);
    allModules.sort();
    return allModules;
}