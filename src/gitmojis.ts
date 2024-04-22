import * as vscode from 'vscode';
import { GitExtension, Repository } from './git';



const gitmoji: Array<[emoji: string, description: string, keywords: string]> = [
  ['🎨', 'CUSTOM Improve structure/format of the code', '#keyword1'],
  ['⚡️', 'Improve performance', '#keyword1'],
  ['🔥', 'Remove code or files', '#keyword1'],
  ['🐛', 'Fix a bug', '#keyword1'],
  ['🚑', 'Critical hotfix', '#keyword1'],
  ['✨', 'Introduce new features', '#keyword1'],
  ['📝', 'Add or update documentation', '#keyword1'],
  ['🚀', 'Deploy stuff', '#keyword1'],
  ['💄', 'Add or update the UI and style files', '#keyword1'],
  ['🎉', 'Begin a project', '#keyword1'],
  ['✅', 'Add, update, or pass tests', '#keyword1'],
  ['🔒️', 'Fix security or privacy issues', '#keyword1'],
  ['🔐', 'Add or update secrets', '#keyword1'],
  ['🔖', 'Release/Version tags', '#keyword1'],
  ['🚨', 'Fix compiler/linter warnings', '#keyword1'],
  ['🚧', 'Work in progress', '#keyword1'],
  ['💚', 'Fix CI Build', '#keyword1'],
  ['⬇️', 'Downgrade dependencies', '#keyword1'],
  ['⬆️', 'Upgrade dependencies', '#keyword1'],
  ['📌', 'Pin dependencies to specific versions', '#keyword1'],
  ['👷', 'Add or update CI build system', '#keyword1'],
  ['📈', 'Add or update analytics or track code', '#keyword1'],
  ['♻️', 'Refactor code', '#keyword1'],
  ['➕', 'Add a dependency', '#keyword1'],
  ['➖', 'Remove a dependency', '#keyword1'],
  ['🔧', 'Add or update configuration files', '#keyword1'],
  ['🔨', 'Add or update development scripts', '#keyword1'],
  ['🌐', 'Internationalization and localization', '#keyword1'],
  ['✏️', 'Fix typos', '#keyword1'],
  ['💩', 'Write bad code that needs to be improved', '#keyword1'],
  ['⏪', 'Revert changes', '#keyword1'],
  ['🔀', 'Merge branches', '#keyword1'],
  ['📦', 'Add or update compiled files or packages', '#keyword1'],
  ['👽️', 'Update code due to external API changes', '#keyword1'],
  ['🚚', 'Move or rename resources (e.g.: files, paths, routes)', '#keyword1'],
  ['📄', 'Add or update license', '#keyword1'],
  ['💥', 'Introduce breaking changes', '#keyword1'],
  ['🍱', 'Add or update assets', '#keyword1'],
  ['♿️', 'Improve accessibility', '#keyword1'],
  ['💡', 'Add or update comments in source code', '#keyword1'],
  ['🍻', 'Write code drunkenly', '#keyword1'],
  ['💬', 'Add or update text and literals', '#keyword1'],
  ['🗃️', 'Perform database related changes', '#keyword1'],
  ['🔊', 'Add or update logs', '#keyword1'],
  ['🔇', 'Remove logs', '#keyword1'],
  ['👥', 'Add or update contributor(s)', '#keyword1'],
  ['🚸', 'Improve user experience/usability', '#keyword1'],
  ['🏗️', 'Make architectural changes', '#keyword1'],
  ['📱', 'Work on responsive design', '#keyword1'],
  ['🤡', 'Mock things', '#keyword1'],
  ['🥚', 'Add or update an easter egg', '#keyword1'],
  ['🙈', 'Add or update a .gitignore file', '#keyword1'],
  ['📸', 'Add or update snapshots', '#keyword1'],
  ['⚗️', 'Perform experiments', '#keyword1'],
  ['🔍', 'Improve SEO', '#keyword1'],
  ['🏷️', 'Add or update types', '#keyword1'],
  ['🌱', 'Add or update seed files', '#keyword1'],
  ['🚩', 'Add, update, or remove feature flags', '#keyword1'],
  ['🥅', 'Catch errors', '#keyword1'],
  ['💫', 'Add or update animations and transitions', '#keyword1'],
  ['🗑️', 'Deprecate code that needs to be cleaned up', '#keyword1'],
  ['🛂', 'Work on code related to authorization, roles and permissions', '#keyword1'],
  ['🩹', 'Simple fix for a non-critical issue', '#keyword1'],
  ['🧐', 'Data exploration/inspection', '#keyword1'],
  ['⚰️', 'Remove dead code', '#keyword1'],
  ['🧪', 'Add a failing test', '#keyword1'],
  ['👔', 'Add or update business logic', '#keyword1'],
  ['🩺', 'Add or update healthcheck', '#keyword1'],
  ['🧱', 'Infrastructure related changes', '#keyword1'],
  ['🧑‍💻', 'Improve developer experience', '#keyword1'],
  ['💸', 'Add sponsorships or money related infrastructure', '#keyword1'],
  ['🧵', 'Add or update code related to multithreading or concurrency', '#keyword1'],
  ['🦺', 'Add or update code related to validation', '#keyword1'],
]



export function gitmojis(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('coreVscodeModule.showGitmoji', (uri?) => {

    const vscodeGit = vscode.extensions.getExtension<GitExtension>('vscode.git')
    const gitExtension = vscodeGit && vscodeGit.exports
    const git = gitExtension && gitExtension.getAPI(1)

    if (!git) return vscode.window.showErrorMessage('Unable to load Git Extension')

    const items = gitmoji.map(([emoji, description, keywords]) => (
      { label: `${emoji} ${description}`, emoji, code: keywords }
    ))

    vscode.window.showQuickPick(items).then(selected => {
      if (selected) {
        vscode.commands.executeCommand("workbench.view.scm")
        const valueToAdd = selected.emoji

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
  })

  context.subscriptions.push(disposable)
}

function updateCommit(repository: Repository, valueOfGitmoji: String) {
  repository.inputBox.value = `${valueOfGitmoji} ${repository.inputBox.value}`
}