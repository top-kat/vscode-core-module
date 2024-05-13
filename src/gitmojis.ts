import * as vscode from 'vscode';
import { GitExtension, Repository } from './git';



const gitmoji: Array<[emoji: string, description: string]> = [
  // GLOBAL
  ['✨', 'New functional feature (will be displayed in the changelog for the n👀bs)'],
  ['🥷', 'New dev feature (will be displayed in the changelog for the devs)'],
  ['👮‍♀️', 'Security Feature'],
  ['🐞', 'Bug fix'],
  ['🧹', 'Clean/refactor code'],
  ['📚', 'Documentation creation / updates'], // 📖
  ['📁', 'rename file or folder'],
  ['🏗️', 'Move files / folder'],
  ['🧟‍♀️', 'Mark file as outdated / deprecated'],
  ['🗑️', 'remove file'],
  ['🧰', 'Add helper / util function'],
  ['🗄️', 'Declare app constant'],
  ['🌏', 'Localization / translation changes / generate translations'],
  ['🧭', 'Type improvements / fixes #typescript #typings'], // 🤖🏫
  ['💬', 'Change / update import pathname'],
  ['🕵️', 'Tracking / statistics / data gathering'],

  // FRONT
  ['📱', 'develop new screen'],
  ['⚛️', 'Adding a new component'],
  ['🛠️', 'Modified components'],
  ['🛵', 'Navigation related changes'],
  ['📐', 'Layout style fix'],
  ['👩‍🎨', 'Design update'],
  ['🪝', 'Create hook'],
  ['📏', 'add a frontend token'],
  ['🎬', 'Adding a showcase / demo component'],
  ['💫', 'New animation'],
  ['🛒', 'Generate assets'], // ⚙️🤖
  ['🧱', 'Changes in assets'], // 🎞️
  ['🔄', 'Replace Components'],

  // BACK
  ['🏰', 'New backend service'],
  ['🧪', 'Créer modifier des tests (actuel emoji/phrase pas pertinente)'],
  ['🔑', 'key / env variable modification'],
  ['⛓️', 'Blockchain related changes'],

  // Monorepo / structure
  ['📦', 'package.json related changes'],

  // WTF
  ['🍌', 'When you are proud of your code and you want to do the helicockter #dick #sboub #bite'],
  ['💩', 'Write shit / bad code'],
  ['🧻', 'Modify update refactor shit / bad code'],

  // COMBO
  ['⬆️', 'Upgrade of service, component… (meant to be used in combination)'],

  // META COMMANDS
  ['🤼', '==> COMBO <=='], // 🥂👯👩‍❤️‍👩 /!\ DO NOT CHANGE NAME, check below
]



export function gitmojis(context: vscode.ExtensionContext) {

  const disposable = vscode.commands.registerCommand('coreVscodeModule.showGitmoji', async (uri?) => {

    const vscodeGit = vscode.extensions.getExtension<GitExtension>('vscode.git')
    const gitExtension = vscodeGit && vscodeGit.exports
    const git = gitExtension && gitExtension.getAPI(1)

    const selected = await showQuickPick()

    if (selected && git) {
      let valueToAdd: string
      if (selected.label.includes('COMBO')) {
        const selected1 = await showQuickPick()
        const selected2 = await showQuickPick()
        valueToAdd = (selected1?.emoji || '') + (selected2?.emoji || '')
      } else valueToAdd = selected.emoji

      vscode.commands.executeCommand("workbench.view.scm")

      if (uri) {
        const uriPath = uri._rootUri?.path || uri.rootUri.path;
        let selectedRepository = git.repositories.find(repository => repository.rootUri.path === uriPath)
        if (selectedRepository) {
          updateCommit(selectedRepository, valueToAdd)
        }
      } else {
        for (let repo of git.repositories) {
          updateCommit(repo, valueToAdd)
        }
      }
    }
  })

  context.subscriptions.push(disposable)
}

function updateCommit(repository: Repository, valueOfGitmoji: String) {
  repository.inputBox.value = `${valueOfGitmoji} ${repository.inputBox.value}`
}

async function showQuickPick() {
  const vscodeGit = vscode.extensions.getExtension<GitExtension>('vscode.git')
  const gitExtension = vscodeGit && vscodeGit.exports
  const git = gitExtension && gitExtension.getAPI(1)

  if (!git) vscode.window.showErrorMessage('Unable to load Git Extension')
  else {

    const items = gitmoji.map(([emoji, description]) => (
      { label: `${emoji} ${description}`, emoji }
    ))

    return await vscode.window.showQuickPick(items)
  }
}