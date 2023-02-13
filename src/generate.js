const vscode = require('vscode')
const window = vscode.window
const Path = require('path')
const fs = require('fs')
const templater = require('simple-file-templater')


const { isset, randomItemInArray, firstMatch, camelCase, pascalCase, dashCase, asArray } = require('../utils')

// let serverBasePath;
// let frontBasePath;
module.exports = () => {
    vscode.commands.registerCommand('coreVscodeModule.generate', async () => {
        try {
            let isFront, isBack
            const workspacePath = vscode.workspace.workspaceFolders[0].uri.path
            let basePath = Path.join(workspacePath, 'src')


            if (workspacePath.includes('/server')) {
                isFront = false
                isBack = true
            } else if (workspacePath.includes('front')) {
                isFront = true
                isBack = false
            } else {
                const backOrFront = await Q({
                    prompt: randomItemInArray([`Hi DAD!! What do you want I generate for you today ?`, `Huh O_o !! You waked me up!`, `Lazy boy! Do you really need that I do the work for you ?`, 'Oh SHIT! let me finish first!']),
                    choices: [`BACK`, `FRONT`],
                })

                isFront = backOrFront === 'FRONT'
                isBack = backOrFront === 'BACK'
                basePath = null
            }

            const whatToGenerate = await Q({
                prompt: `What kind of file ?`,
                choices: isBack ? [
                    `SERVICE`,
                    `MODEL`,
                    `FIREBASE DAO`,
                    `MONGO DAO`,
                    `DEFINITIONS`,
                    `SEED`,
                    `TESTFLOW`,
                    'TEST'
                ] : [
                    'COMPONENT',
                    `MODULE`,
                ],
            })

            const isDb = ['MONGO DAO', 'FIREBASE DAO', 'MODEL'].includes(whatToGenerate)

            if (!isset(basePath)) {
                const folderForEnd = isFront ? 'front' : 'back'
                const appFolder = isDb ? 'db' : 'apps'
                if (fs.existsSync(Path.join(workspacePath, 'src'))) basePath = Path.join(workspacePath, 'src')
                else {
                    basePath = (await vscode.workspace.findFiles(`**/${folderForEnd}/src/**/*`)).reduce((serverBasePath, file) => {
                        return serverBasePath || file.path.split(`/${folderForEnd}/src/`)[0] + `/${folderForEnd}/src/`
                    }, false)
                    if (!basePath) {
                        const appsDir = Path.join(workspacePath, appFolder)
                        const dirs = fs.readdirSync(appsDir).filter(file => fs.statSync(appsDir + '/' + file).isDirectory())
                        const dir = await Q({
                            prompt: randomItemInArray([`Choose ${isDb ? 'database' : 'project'}`]),
                            choices: dirs.map(d => d.replace(/^.*\/([^/]+$)/, '$1')),
                        })

                        basePath = Path.join(appsDir, dir)
                    }
                }
            }

            const corePathRoot = fs.existsSync(Path.join(basePath, '/00_nuke')) ? '00_nuke' : fs.existsSync(Path.join(basePath, '/0_core')) ? '0_core' : '../../packages/core-backend'

            if (whatToGenerate === `MODULE`) {
                //----------------------------------------
                // MODULE
                //----------------------------------------
                const moduleName = await Q({
                    prompt: `Module name ?`,
                    validateInput: str => isset(str) && str.length ? null : 'Cannot be empty',
                })
                const varz = {
                    ...moduleNameVarz(moduleName),
                    // others
                    '/\\*eslint-disable\\*/': '',
                    '// here for intellisense': '',
                }

                const createdPaths = templater.templater(
                    Path.join(basePath, `${corePathRoot}/templates/new-module`), // from
                    Path.join(basePath, isFront ? varz.MyNewModule : varz['my-new-module']), // to
                    varz, // replace
                    { module: varz['my-new-module'], Module: varz.MyNewModule, }, // file name replacer
                )

                await openFiles(...createdPaths.filter(p => !p.includes('error')))
            } else {

                const moduleNames = await findAllModuleNames(Path.join(basePath, 'src'), [corePathRoot, 'dist/', '2_generated'])

                const selectedModuleR = isDb ? '' : await Q({
                    prompt: `In which module?`,
                    choices: moduleNames,
                    allowCustomValues: true,
                })

                const selectedModule = selectedModuleR.toString() // hack for no red to appear

                let fileName
                if (whatToGenerate.includes('DAO')) {
                    const modelBaseDir = Path.join(basePath, 'src/models')
                    const filesInModelFolder = fs.readdirSync(modelBaseDir)
                    const modelNames = []
                    filesInModelFolder.forEach(fileName => {
                        if (fileName.includes('.model.')) {
                            const daoName = fileName.replace('.model.', '.dao.')
                            const hasDao = filesInModelFolder.includes(daoName)
                            if (!hasDao) {
                                modelNames.push(fileName.replace(/^(.+)\.model\.[tj]s$/, '$1'))
                            }
                        }
                    })
                    fileName = await Q({
                        prompt: `For which model shall we create a DAO?`,
                        choices: modelNames,
                    })
                } else {
                    fileName = await Q({
                        prompt: whatToGenerate === `COMPONENT` ? `Component name ?` : `File name without type extension (Eg: 'user-update' OR 'reservation-cancel')`,
                        validateInput: str => isset(str) && str.length ? null : 'Cannot be empty',
                    })
                }

                if ([`SERVICE`, `DEFINITIONS`, `MODEL`, `MONGO DAO`, 'FIREBASE DAO', `SEED`, `TESTFLOW`, 'TEST'].includes(whatToGenerate)) {
                    //----------------------------------------
                    // GENERIC
                    //----------------------------------------
                    const extensions = {
                        //       extension |     templateName        | folder
                        service: [`.svc.ts`, `module-generic.svc.ts`, ``],
                        definitions: [`.def.ts`, `module.def.ts`, ``],
                        seed: [`.seed.ts`, `module.seed.ts`, ``],
                        model: [`.model.ts`, `module.model.ts`, `models`],
                        mongodao: [`.dao.ts`, `module.dao.ts`, `models`],
                        firebasedao: [`.dao.ts`, `module-firebase.dao.ts`, `models`],
                        testflow: [`.test-flow.ts`, `module.test-flow.ts`, `tests`],
                        test: [`.test.ts`, `module.test-flow.ts`, `tests`],
                    }
                    const [extension, templateName, folderName] = extensions[whatToGenerate.toLowerCase().replace(/ /g, '')]
                    const generatedFilePath = Path.join(basePath, 'src', selectedModule, folderName, fileName + extension)
                    const templatePath = Path.join(basePath, `${corePathRoot}/src/templates/${templateName}`)
                    await writeAndopenFile([generatedFilePath, templatePath, moduleNameVarz(isDb ? fileName : selectedModule)])
                } else if (whatToGenerate === `COMPONENT`) {
                    //----------------------------------------
                    // COMPONENT
                    //----------------------------------------
                    const varz = {
                        ...moduleNameVarz(fileName),
                        // others
                        '/\\*eslint-disable\\*/': '',
                        '// here for intellisense': '',
                    }

                    const createdPaths = templater.templater(
                        Path.join(basePath, `${corePathRoot}/templates/new-component`), // from
                        Path.join(basePath, selectedModule, `${varz.MyNewModule}`), // to
                        varz, // replace
                        { module: varz['my-new-module'], Module: varz.MyNewModule }, // file name replacer
                    )

                    await openFiles(...createdPaths)
                } else vscode.window.showInformationMessage(randomItemInArray(['Next time avoid waking me up', 'What! All that for.......that ?!', 'little dick', `You don't dare ? Dare you ?`, `Next time I'll stay in my bed!`]))
            }
        } catch (err) {
            console.error(`err`, err)
            vscode.window.showErrorMessage(err.toString())
            vscode.window.showInformationMessage(randomItemInArray(['Whooops!! shit happens...', 'What! All that for.......that ?!', 'little dick', `You don't dare ? Dare you ?`, `Next time I'll stay in my bed!`]))
        }
    })
}

//----------------------------------------
// HELPERS
//----------------------------------------

function moduleNameVarz(moduleName) {
    if (/[A-Z]/.test(moduleName)) moduleName = moduleName.replace(/([A-Z])/g, '-$1') // allow camelCase

    const moduleNameBits = moduleName.toLowerCase().split('-')
    return {
        myNewModule: camelCase(...moduleNameBits),
        MyNewModule: pascalCase(...moduleNameBits),
        'my-new-module': dashCase(...moduleNameBits),
    }
}


async function Q(questionConfig) {
    if (questionConfig.choices) {
        const { choices, allowCustomValues } = questionConfig
        return new Promise((resolve) => {
            const quickPick = window.createQuickPick()
            quickPick.items = choices.map(choice => ({ label: choice }))
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
            quickPick.show()
        })
    } else {
        return await window.showInputBox(questionConfig)
    }
}
async function openFiles(...filePaths) {
    for (const filePath of asArray(filePaths)) await vscode.workspace.openTextDocument(vscode.Uri.file(filePath)).then(doc => vscode.window.showTextDocument(doc, { preview: false }))
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
        )
        // await fs.outputFile(filePath, fs.readFileSync(templatePath, 'utf-8'));
        await openFiles(filePath)
    }
}

async function findAllModuleNames(basePath, ignorePatterns) {
    const filesInModelFolder = fs.readdirSync(basePath)
    return filesInModelFolder.filter(fileName => {
        const fileStat = fs.statSync(Path.join(basePath, fileName))
        return !ignorePatterns.some(ip => fileName.includes(ip)) && fileStat.isDirectory()
    })
}
