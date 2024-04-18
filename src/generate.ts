

import vscode from 'vscode'
import Path from 'path'
import fs from 'fs'
import templater from 'simple-file-templater'
import { Q } from './usePrompt'
import { randomItemInArray, camelCase, pascalCase, dashCase, asArray } from 'topkat-utils'


export default () => {
    vscode.commands.registerCommand('coreVscodeModule.generate', async () => {
        try {

            const workspacePath = vscode.workspace.workspaceFolders?.[0].uri.path || './'

            const choices = [
                `SERVICE`,
                `MODEL`,
                `DEFINITIONS`,
                `SEED`,
                `TESTFLOW`,
                'TEST',
                'ERROR'
            ] as const

            const whatToGenerate = await Q({
                prompt: `What to generate ?`,
                choices
            })

            const isDb = ['MODEL'].includes(whatToGenerate)

            let basePath: string
            const folderForEnd = 'back'
            const appFolder = isDb ? 'db' : 'apps'
            if (fs.existsSync(Path.join(workspacePath, 'src'))) basePath = Path.join(workspacePath, 'src')
            else {
                basePath = (await vscode.workspace.findFiles(`**/${folderForEnd}/src/**/*`)).reduce((serverBasePath, file) => {
                    return serverBasePath || file.path.split(`/${folderForEnd}/src/`)[0] + `/${folderForEnd}/src/`
                }, '')
                if (!basePath) {
                    const appsDir = Path.join(workspacePath, appFolder)
                    const dirs = fs.readdirSync(appsDir).filter(file => fs.statSync(appsDir + '/' + file).isDirectory()).filter(f => !f.includes('front'))
                    let dir: string
                    if (dirs.length > 1) {
                        dir = await Q({
                            prompt: randomItemInArray([`Choose ${isDb ? 'database' : 'project'}`]),
                            choices: dirs.map(d => d.replace(/^.*\/([^/]+$)/, '$1')),
                        })
                    } else dir = dirs[0].replace(/^.*\/([^/]+$)/, '$1')

                    basePath = Path.join(appsDir, dir)
                }
            }

            const corePathRoot = fs.existsSync(Path.join(basePath, '/00_nuke')) ? '00_nuke' : fs.existsSync(Path.join(basePath, '/0_core')) ? '0_core' : '../../packages/core-backend'

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
                const modelNames = [] as string[]
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
                    prompt: `File name without type extension (Eg: 'userUpdate' OR 'reservationCancel')`,
                    // validateInput: str => isset(str) && str.length ? null : 'Cannot be empty',
                })
            }

            const mainChoiceFormatted = whatToGenerate.toLowerCase().replace(/ /g, '')
            const filesToGenerate = [mainChoiceFormatted]
            if (mainChoiceFormatted === 'model') filesToGenerate.push('mongodao')

            const extensions = {
                //            extension |   templateName      | folder
                service: /**/[`.svc.ts`, `module-generic.svc.ts`, ``],
                definitions: [`.def.ts`, `module.def.ts`, ``],
                seed: /*   */[`.seed.ts`, `module.seed.ts`, ``],
                model: /*  */[`.model.ts`, `module.model.ts`, `models`],
                mongodao:/**/[`.dao.ts`, `module.dao.ts`, `models`],
                firebasedao: [`.dao.ts`, `module-firebase.dao.ts`, `models`],
                testflow:/**/[`.test-flow.ts`, `module.test-flow.ts`, `tests`],
                test: /*   */[`.test.ts`, `module.test-flow.ts`, `tests`],
                error: /*  */[`.error.ts`, `module.error.ts`, ``],
            }

            for (const fileToGenerate of filesToGenerate) {
                const [extension, templateName, folderName] = extensions[fileToGenerate]
                const generatedFilePath = Path.join(basePath, 'src', selectedModule, folderName, fileName + extension)
                const templatePath = Path.join(basePath, `${corePathRoot}/src/templates/${templateName}`)
                await writeAndopenFile([generatedFilePath, templatePath, moduleNameVarz(isDb ? fileName : selectedModule)])
            }

        } catch (err) {
            console.error(`err`, err)
            vscode.window.showErrorMessage((err as any)?.toString())
            vscode.window.showInformationMessage(randomItemInArray(['Whooops!! shit happens...', 'Next time avoid waking me up', 'What! All that for.......that ?!', 'little dick', `You don't dare ? Dare you ?`, `Next time I'll stay in my bed!`]))
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
