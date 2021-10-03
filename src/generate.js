const vscode = require('vscode');
const window = vscode.window;
const Path = require('path');
const templater = require('simple-file-templater');


const { isset, randomItemInArray, firstMatch, camelCase, pascalCase, dashCase, asArray } = require('../utils');

let serverBasePath;
let frontBasePath;
module.exports = () => {
    vscode.commands.registerCommand('core.generate', async () => {
        try {

            const backOrFront = await Q({
                prompt: randomItemInArray([`Hi DAD!! What do you want I generate for you today ?`, `Huh O_o !! You waked me up!`, `Lazy boy! Do you really need that I do the work for you ?`, 'Oh SHIT! let me finish first!']),
                choices: [`FRONT`, `BACK`],
            });
            const isFront = backOrFront === 'FRONT';
            const isBack = backOrFront === 'BACK';

            const whatToGenerate = await Q({
                prompt: `What kind of file ?`,
                choices: isBack ? [
                    `SERVICE`,
                    `MODEL`,
                    `MODULE`,
                    `SEED file`,
                    `SCHEDULE`,
                ] : [
                    'COMPONENT',
                    `MODULE`,
                ],
            });

            // this is needed for all file generation
            const frontModuleNames = await findAllModuleNames('frontend/src', ['00_core', '/dist/']);
            const backModuleNames = await findAllModuleNames('server/src', ['00_core', '/dist/']);

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
                    Path.join(isFront ? frontBasePath : serverBasePath, `00_core/templates/new-module`), // from
                    Path.join(isFront ? frontBasePath : serverBasePath, `${varz['my-new-module']}`), // to
                    varz, // replace
                    { module: varz['my-new-module'] }, // file name replacer
                );

                await openFiles(...createdPaths.filter(p => !p.includes('error.js') && !p.includes('config.js')));
            } else {
                const selectedModuleR = await Q({
                    prompt: `In which module?`,
                    choices: isFront ? frontModuleNames : backModuleNames,
                });
                const selectedModule = selectedModuleR.toString(); // hack for no red to appear
                const fileName = await Q({
                    prompt: `File name without type extension (Eg: 'user-update' OR 'reservation-cancel')`,
                    validateInput: str => isset(str) && str.length ? null : 'Cannot be empty',
                });
                if (whatToGenerate === `SERVICE`) {
                    //----------------------------------------
                    // SERVICE
                    //----------------------------------------
                    const generatedFilePath = Path.join(serverBasePath, selectedModule, 'services', fileName + '.svc.js');
                    const templatePath = Path.join(serverBasePath, `00_core/templates/module-generic.svc.js`);
                    await writeAndopenFile([generatedFilePath, templatePath]);
                } else if (whatToGenerate === `COMPONENT`) {
                    //----------------------------------------
                    // COMPONENT
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
                        Path.join(isFront ? frontBasePath : serverBasePath, `00_core/templates/new-module`), // from
                        Path.join(isFront ? frontBasePath : serverBasePath, `${varz['my-new-module']}`), // to
                        varz, // replace
                        { module: varz['my-new-module'] }, // file name replacer
                    );

                    await openFiles(...createdPaths.filter(p => !p.includes('error.js') && !p.includes('config.js')));
                } else if (whatToGenerate === `MODEL`) {
                    //----------------------------------------
                    // MODEL
                    //----------------------------------------
                    const generatedModelFilePath = Path.join(serverBasePath, selectedModule, 'models', fileName + '.model.js');
                    const generatedDaoPath = Path.join(serverBasePath, selectedModule, 'models', fileName + '.dao.js');
                    const modelTemplatePath = Path.join(serverBasePath, `00_core/templates/module.model.js`);
                    const daoTemplatePath = Path.join(serverBasePath, `00_core/templates/module.dao.js`);
                    const varz = { 'my-new-module': fileName };
                    await writeAndopenFile([generatedDaoPath, daoTemplatePath, varz], [generatedModelFilePath, modelTemplatePath, varz]);
                } else if (whatToGenerate === `SEED file`) {
                    //----------------------------------------
                    // SEED
                    //----------------------------------------
                    const generatedSeedPath = Path.join(serverBasePath, selectedModule, fileName + '-seed.js');
                    const templatePath = Path.join(serverBasePath, `00_core/templates/module-seed.js`);
                    await writeAndopenFile([generatedSeedPath, templatePath, moduleNameVarz(selectedModule)]);
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
        const { choices, ...options } = questionConfig;
        return await window.showQuickPick(choices, { ...options });
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
        const [, rootPath, modulePath] = actualFullPath.path.match(new RegExp(`^(.*)(/${nameOfRootFolder}/[^/]+/).*$`)) || [];
        if (modulePath && !uniqueModulePaths.includes(modulePath) && ignorePatterns.every(ignorePattern => !modulePath.includes(ignorePattern))) {
            if (!isset(serverBasePath) && modulePath.includes('server')) serverBasePath = Path.join(rootPath, nameOfRootFolder);
            else if (!isset(frontBasePath) && modulePath.includes('frontend')) frontBasePath = Path.join(rootPath, nameOfRootFolder);
            uniqueModulePaths.push(modulePath);
        }
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