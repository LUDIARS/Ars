// ars-editor の ESLint を実行する。
// npm scripts の `eslint` は PATH 上のグローバル ESLint に解決されてしまい、
// flat config (eslint.config.js) を読めない古いバージョンが動くことがあるため、
// ローカル依存の ESLint を明示的に起動する。依存が未インストールならエラーにする。
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const editorDir = join(repoRoot, 'ars-editor')
const eslintBin = join(editorDir, 'node_modules', 'eslint', 'bin', 'eslint.js')

if (!existsSync(eslintBin)) {
  // CI やクリーンな checkout では ars-editor の依存が未インストールなので、
  // ここで一度だけ導入する。未インストールを成功扱いにすると
  // 「lint が通った」 と誤認されるため、失敗したらそのまま落とす。
  console.error('ars-editor の依存が未インストールのため npm ci を実行します。')
  const install = spawnSync('npm', ['ci', '--prefix', editorDir], {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
  if (install.error) {
    console.error(`npm ci の起動に失敗しました: ${install.error.message}`)
    process.exit(1)
  }
  if (install.status !== 0) {
    console.error('npm ci --prefix ars-editor が失敗しました。')
    process.exit(1)
  }
  if (!existsSync(eslintBin)) {
    console.error(
      'npm ci 後も ars-editor/node_modules に ESLint がありません。' +
        ' ars-editor/package.json の devDependencies を確認してください。',
    )
    process.exit(1)
  }
}

const result = spawnSync(process.execPath, [eslintBin, '.'], {
  cwd: editorDir,
  stdio: 'inherit',
})

// 起動自体に失敗した場合 (status は null) は原因を出さないと追跡できない。
// シグナルで落ちた場合も status は null になるため、そちらも区別して報告する。
if (result.error) {
  console.error(`ESLint の起動に失敗しました: ${result.error.message}`)
  process.exit(1)
}
if (result.status === null) {
  console.error(`ESLint がシグナル ${result.signal} で終了しました。`)
  process.exit(1)
}
process.exit(result.status)
