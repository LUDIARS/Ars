/// Git モジュールインストール管理
///
/// Gitリポジトリからモジュールをクローンし、ローカルにキャッシュする。
/// インストール済みモジュールの一覧は `~/.ars/modules/registry.json` で管理する。
use git2::{Cred, FetchOptions, RemoteCallbacks, Repository};
use std::path::{Path, PathBuf};

use ars_core::models::{InstalledModule, ModuleRegistry};

const MODULES_DIR: &str = "modules";
const REGISTRY_FILE: &str = "registry.json";

fn get_ars_home() -> PathBuf {
    let home = dirs_next::home_dir().unwrap_or_else(|| PathBuf::from("."));
    home.join(".ars")
}

fn get_modules_dir() -> PathBuf {
    get_ars_home().join(MODULES_DIR)
}

fn get_registry_path() -> PathBuf {
    get_ars_home().join(REGISTRY_FILE)
}

/// レジストリを読み込む（ファイルが無ければ空のレジストリを返す）
pub fn load_registry() -> ModuleRegistry {
    let path = get_registry_path();
    if !path.exists() {
        return ModuleRegistry { modules: vec![] };
    }
    match std::fs::read_to_string(&path) {
        Ok(content) => serde_json::from_str(&content).unwrap_or(ModuleRegistry { modules: vec![] }),
        Err(_) => ModuleRegistry { modules: vec![] },
    }
}

/// レジストリを保存する
fn save_registry(registry: &ModuleRegistry) -> Result<(), String> {
    let path = get_registry_path();
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create registry directory: {}", e))?;
    }
    let content = serde_json::to_string_pretty(registry)
        .map_err(|e| format!("Failed to serialize registry: {}", e))?;
    std::fs::write(&path, content)
        .map_err(|e| format!("Failed to write registry: {}", e))
}

fn make_callbacks(token: &str) -> RemoteCallbacks<'_> {
    let mut callbacks = RemoteCallbacks::new();
    callbacks.credentials(move |_url, _username_from_url, _allowed_types| {
        Cred::userpass_plaintext("x-access-token", token)
    });
    callbacks
}

/// Git URLからモジュール名を推測する
fn module_name_from_url(git_url: &str) -> String {
    let name = git_url
        .trim_end_matches('/')
        .rsplit('/')
        .next()
        .unwrap_or("unknown");
    name.strip_suffix(".git").unwrap_or(name).to_string()
}

/// モジュール用のローカルディレクトリ名を生成
fn local_dir_name(git_url: &str) -> String {
    // URLからオーナー/リポ名を抽出してディレクトリ名にする
    let cleaned = git_url
        .trim_end_matches('/')
        .strip_suffix(".git")
        .unwrap_or(git_url);
    // "https://github.com/owner/repo" -> "owner_repo"
    let parts: Vec<&str> = cleaned.rsplitn(3, '/').collect();
    if parts.len() >= 2 {
        format!("{}_{}", parts[1], parts[0])
    } else {
        parts[0].to_string()
    }
}

/// Gitリポジトリからモジュールをインストールする
pub fn install_module(
    access_token: &str,
    git_url: &str,
    git_ref: &str,
) -> Result<InstalledModule, String> {
    let mut registry = load_registry();

    // 既にインストール済みか確認
    if registry.modules.iter().any(|m| m.git_url == git_url) {
        return Err(format!("Module already installed: {}", git_url));
    }

    let modules_dir = get_modules_dir();
    let dir_name = local_dir_name(git_url);
    let local_path = modules_dir.join(&dir_name);

    std::fs::create_dir_all(&modules_dir)
        .map_err(|e| format!("Failed to create modules directory: {}", e))?;

    // クローン
    if local_path.exists() {
        // ディレクトリが既に存在する場合はpull
        pull_module(access_token, &local_path, git_ref)?;
    } else {
        clone_module(access_token, git_url, &local_path, git_ref)?;
    }

    let now = chrono::Utc::now().to_rfc3339();
    let module = InstalledModule {
        id: uuid::Uuid::new_v4().to_string(),
        name: module_name_from_url(git_url),
        git_url: git_url.to_string(),
        git_ref: git_ref.to_string(),
        local_path: local_path.to_string_lossy().to_string(),
        installed_at: now.clone(),
        updated_at: now,
        enabled: true,
        description: None,
    };

    registry.modules.push(module.clone());
    save_registry(&registry)?;

    Ok(module)
}

/// モジュールをクローンする
fn clone_module(
    access_token: &str,
    git_url: &str,
    local_path: &Path,
    git_ref: &str,
) -> Result<(), String> {
    let callbacks = make_callbacks(access_token);
    let mut fo = FetchOptions::new();
    fo.remote_callbacks(callbacks);

    let mut builder = git2::build::RepoBuilder::new();
    builder.fetch_options(fo);
    builder.branch(git_ref);

    builder
        .clone(git_url, local_path)
        .map_err(|e| format!("Failed to clone module: {}", e))?;

    Ok(())
}

/// モジュールをpullする（更新）
fn pull_module(access_token: &str, local_path: &Path, git_ref: &str) -> Result<(), String> {
    let repo = Repository::open(local_path)
        .map_err(|e| format!("Failed to open repository: {}", e))?;

    let mut remote = repo
        .find_remote("origin")
        .map_err(|e| format!("Failed to find remote: {}", e))?;

    let callbacks = make_callbacks(access_token);
    let mut fo = FetchOptions::new();
    fo.remote_callbacks(callbacks);

    remote
        .fetch(&[git_ref], Some(&mut fo), None)
        .map_err(|e| format!("Failed to fetch: {}", e))?;

    // Fast-forward merge
    let fetch_head = repo
        .find_reference("FETCH_HEAD")
        .map_err(|e| format!("Failed to find FETCH_HEAD: {}", e))?;
    let fetch_commit = repo
        .reference_to_annotated_commit(&fetch_head)
        .map_err(|e| format!("Failed to get commit: {}", e))?;

    let (analysis, _) = repo
        .merge_analysis(&[&fetch_commit])
        .map_err(|e| format!("Merge analysis failed: {}", e))?;

    if analysis.is_up_to_date() {
        return Ok(());
    }

    if analysis.is_fast_forward() {
        let refname = format!("refs/heads/{}", git_ref);
        if let Ok(mut reference) = repo.find_reference(&refname) {
            reference
                .set_target(fetch_commit.id(), "Fast-forward")
                .map_err(|e| format!("Failed to set target: {}", e))?;
        }
        repo.set_head(&format!("refs/heads/{}", git_ref))
            .or_else(|_| repo.set_head("HEAD"))
            .map_err(|e| format!("Failed to set HEAD: {}", e))?;
        repo.checkout_head(Some(git2::build::CheckoutBuilder::default().force()))
            .map_err(|e| format!("Failed to checkout: {}", e))?;
    }

    Ok(())
}

/// インストール済みモジュールを更新する（git pull）
pub fn update_module(access_token: &str, module_id: &str) -> Result<InstalledModule, String> {
    let mut registry = load_registry();
    let module = registry
        .modules
        .iter_mut()
        .find(|m| m.id == module_id)
        .ok_or_else(|| format!("Module not found: {}", module_id))?;

    let local_path = PathBuf::from(&module.local_path);
    if !local_path.exists() {
        // ディレクトリが消えている場合は再クローン
        clone_module(access_token, &module.git_url, &local_path, &module.git_ref)?;
    } else {
        pull_module(access_token, &local_path, &module.git_ref)?;
    }

    module.updated_at = chrono::Utc::now().to_rfc3339();
    let updated = module.clone();
    save_registry(&registry)?;

    Ok(updated)
}

/// モジュールをアンインストールする
pub fn uninstall_module(module_id: &str) -> Result<(), String> {
    let mut registry = load_registry();
    let idx = registry
        .modules
        .iter()
        .position(|m| m.id == module_id)
        .ok_or_else(|| format!("Module not found: {}", module_id))?;

    let module = registry.modules.remove(idx);

    // ローカルディレクトリを削除
    let local_path = PathBuf::from(&module.local_path);
    if local_path.exists() {
        std::fs::remove_dir_all(&local_path)
            .map_err(|e| format!("Failed to remove module directory: {}", e))?;
    }

    save_registry(&registry)?;
    Ok(())
}

/// モジュールの有効/無効を切り替える
pub fn set_module_enabled(module_id: &str, enabled: bool) -> Result<InstalledModule, String> {
    let mut registry = load_registry();
    let module = registry
        .modules
        .iter_mut()
        .find(|m| m.id == module_id)
        .ok_or_else(|| format!("Module not found: {}", module_id))?;

    module.enabled = enabled;
    let updated = module.clone();
    save_registry(&registry)?;

    Ok(updated)
}

/// インストール済みモジュール一覧を取得する
pub fn list_installed_modules() -> Vec<InstalledModule> {
    load_registry().modules
}

/// インストール済みモジュールのディレクトリ内のMarkdownファイルを一覧する
pub fn list_module_files(module_id: &str) -> Result<Vec<String>, String> {
    let registry = load_registry();
    let module = registry
        .modules
        .iter()
        .find(|m| m.id == module_id)
        .ok_or_else(|| format!("Module not found: {}", module_id))?;

    let local_path = PathBuf::from(&module.local_path);
    if !local_path.exists() {
        return Err("Module directory not found. Try updating the module.".to_string());
    }

    let mut files = Vec::new();
    collect_markdown_files(&local_path, &local_path, &mut files);
    Ok(files)
}

fn collect_markdown_files(base: &Path, dir: &Path, results: &mut Vec<String>) {
    let entries = match std::fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };
    for entry in entries.flatten() {
        let name = entry.file_name();
        let name_str = name.to_string_lossy();
        // skip hidden dirs and common non-content dirs
        if name_str.starts_with('.') || name_str == "node_modules" || name_str == "target" {
            continue;
        }
        let path = entry.path();
        if path.is_dir() {
            collect_markdown_files(base, &path, results);
        } else if name_str.ends_with(".md") {
            if let Ok(rel) = path.strip_prefix(base) {
                results.push(rel.to_string_lossy().to_string());
            }
        }
    }
}
