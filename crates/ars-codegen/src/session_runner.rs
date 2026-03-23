use std::path::Path;
use tokio::process::Command;

use crate::prompt_generator::CodegenTask;

pub struct CodegenConfig {
    pub project_file: String,
    pub output_dir: String,
    pub dry_run: bool,
    pub max_concurrent: usize,
    pub claude_model: Option<String>,
    pub claude_permission_mode: Option<String>,
}

pub struct CodegenResult {
    pub task_id: String,
    pub success: bool,
    pub output_files: Vec<String>,
    pub error: Option<String>,
    pub duration_ms: u64,
}

pub struct SessionRunner {
    config: CodegenConfig,
}

impl SessionRunner {
    pub fn new(config: CodegenConfig) -> Self {
        Self { config }
    }

    pub async fn run_tasks(&self, tasks: Vec<CodegenTask>) -> Vec<CodegenResult> {
        let mut results = Vec::new();
        let mut completed = std::collections::HashSet::new();
        let mut remaining: Vec<_> = tasks.into_iter().collect();

        while !remaining.is_empty() {
            let ready: Vec<_> = remaining.iter()
                .enumerate()
                .filter(|(_, t)| t.dependencies.iter().all(|d| completed.contains(d)))
                .map(|(i, _)| i)
                .collect();

            if ready.is_empty() {
                for t in &remaining {
                    results.push(CodegenResult {
                        task_id: t.id.clone(),
                        success: false,
                        output_files: vec![],
                        error: Some(format!("依存関係が解決できません: {:?}", t.dependencies)),
                        duration_ms: 0,
                    });
                }
                break;
            }

            let batch_size = ready.len().min(self.config.max_concurrent);
            let batch_indices: Vec<_> = ready.into_iter().take(batch_size).collect();

            // Extract batch tasks (reverse order to preserve indices)
            let mut batch = Vec::new();
            for &idx in batch_indices.iter().rev() {
                batch.push(remaining.remove(idx));
            }
            batch.reverse();

            println!("\n--- バッチ実行: {} ---", batch.iter().map(|t| t.name.as_str()).collect::<Vec<_>>().join(", "));

            let handles: Vec<_> = batch.into_iter().map(|task| {
                let dry_run = self.config.dry_run;
                let model = self.config.claude_model.clone();
                let perm = self.config.claude_permission_mode.clone();
                let project_dir = Path::new(&self.config.project_file).parent().map(|p| p.to_string_lossy().to_string()).unwrap_or_default();
                tokio::spawn(async move {
                    run_single_task(task, dry_run, model, perm, &project_dir).await
                })
            }).collect();

            for handle in handles {
                match handle.await {
                    Ok(result) => {
                        if result.success {
                            completed.insert(result.task_id.clone());
                        }
                        results.push(result);
                    }
                    Err(e) => {
                        results.push(CodegenResult {
                            task_id: "unknown".into(),
                            success: false,
                            output_files: vec![],
                            error: Some(format!("タスク実行エラー: {e}")),
                            duration_ms: 0,
                        });
                    }
                }
            }
        }

        results
    }
}

async fn run_single_task(
    task: CodegenTask,
    dry_run: bool,
    model: Option<String>,
    permission_mode: Option<String>,
    project_dir: &str,
) -> CodegenResult {
    let start = std::time::Instant::now();

    // 出力ディレクトリ作成
    if let Err(e) = tokio::fs::create_dir_all(&task.output_dir).await {
        return CodegenResult {
            task_id: task.id,
            success: false,
            output_files: vec![],
            error: Some(format!("ディレクトリ作成失敗: {e}")),
            duration_ms: start.elapsed().as_millis() as u64,
        };
    }

    // プロンプトをファイルに保存
    let prompt_file = format!("{}/.codegen-prompt.md", task.output_dir);
    if let Err(e) = tokio::fs::write(&prompt_file, &task.prompt).await {
        return CodegenResult {
            task_id: task.id,
            success: false,
            output_files: vec![],
            error: Some(format!("プロンプト書き込み失敗: {e}")),
            duration_ms: start.elapsed().as_millis() as u64,
        };
    }

    if dry_run {
        println!("[DRY RUN] タスク: {}", task.name);
        println!("  プロンプト保存先: {}", prompt_file);
        return CodegenResult {
            task_id: task.id,
            success: true,
            output_files: vec![prompt_file],
            error: None,
            duration_ms: start.elapsed().as_millis() as u64,
        };
    }

    println!("[開始] {} ({})", task.name, task.task_type);

    let mut args = vec![
        "--print".to_string(),
        "--output-format".to_string(), "text".to_string(),
        "--max-turns".to_string(), "50".to_string(),
    ];
    if let Some(ref m) = model {
        args.extend(["--model".to_string(), m.clone()]);
    }
    if let Some(ref p) = permission_mode {
        args.extend(["--permission-mode".to_string(), p.clone()]);
    }
    args.extend(["--prompt".to_string(), task.prompt.clone()]);

    // セキュリティ: 環境変数をホワイトリストで制限
    let safe_env_keys = [
        "PATH", "HOME", "USER", "SHELL", "LANG", "LC_ALL", "LC_CTYPE",
        "TERM", "TMPDIR", "TMP", "TEMP", "NODE_ENV",
    ];
    let mut cmd = Command::new("claude");
    cmd.args(&args).current_dir(&task.output_dir);
    cmd.env_clear();
    for key in &safe_env_keys {
        if let Ok(val) = std::env::var(key) {
            cmd.env(key, val);
        }
    }
    // CLAUDE_ prefix
    for (key, value) in std::env::vars() {
        if key.starts_with("CLAUDE_") {
            cmd.env(&key, &value);
        }
    }
    cmd.env("ARS_PROJECT_DIR", project_dir);

    match cmd.output().await {
        Ok(output) if output.status.success() => {
            let log_file = format!("{}/.codegen-output.log", task.output_dir);
            let _ = tokio::fs::write(&log_file, &output.stdout).await;
            let generated = find_generated_files(&task.output_dir, &prompt_file);
            println!("[完了] {} - {}ファイル生成 ({:.1}s)", task.name, generated.len(), start.elapsed().as_secs_f64());
            CodegenResult {
                task_id: task.id,
                success: true,
                output_files: generated,
                error: None,
                duration_ms: start.elapsed().as_millis() as u64,
            }
        }
        Ok(output) => {
            let stderr = String::from_utf8_lossy(&output.stderr);
            println!("[失敗] {}: {}", task.name, stderr);
            CodegenResult {
                task_id: task.id,
                success: false,
                output_files: vec![],
                error: Some(format!("Claude Code exited with code {:?}: {}", output.status.code(), stderr)),
                duration_ms: start.elapsed().as_millis() as u64,
            }
        }
        Err(e) => {
            CodegenResult {
                task_id: task.id,
                success: false,
                output_files: vec![],
                error: Some(format!("Claude Code 起動失敗: {e}\n'claude' コマンドがインストールされているか確認してください。")),
                duration_ms: start.elapsed().as_millis() as u64,
            }
        }
    }
}

fn find_generated_files(dir: &str, exclude: &str) -> Vec<String> {
    let mut files = Vec::new();
    scan_files(Path::new(dir), &mut files);
    files.retain(|f| f != exclude && !f.ends_with(".codegen-prompt.md") && !f.ends_with(".codegen-output.log"));
    files
}

fn scan_files(dir: &Path, results: &mut Vec<String>) {
    let entries = match std::fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            scan_files(&path, results);
        } else {
            results.push(path.to_string_lossy().to_string());
        }
    }
}
