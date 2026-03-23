use ars_core::models::PortDefinition;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModuleDefinition {
    pub id: String,
    pub name: String,
    pub summary: String,
    pub category: String,
    pub domain: String,
    pub required_data: Vec<String>,
    pub variables: Vec<ModuleVariable>,
    pub dependencies: Vec<String>,
    pub tasks: Vec<ModuleTask>,
    pub tests: Vec<ModuleTest>,
    pub source_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModuleVariable {
    pub name: String,
    #[serde(rename = "type")]
    pub var_type: String,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModuleTask {
    pub name: String,
    pub description: String,
    pub inputs: Vec<PortDefinition>,
    pub outputs: Vec<PortDefinition>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModuleTest {
    pub description: String,
}

/// Ars形式のMarkdownからモジュール定義をパース
pub fn parse_module_markdown(content: &str, source_path: Option<&str>) -> Vec<ModuleDefinition> {
    let mut modules = Vec::new();
    let sections = split_by_module_headers(content);

    for (name, section_content) in sections {
        if let Some(module) = parse_single_module(&name, &section_content, source_path) {
            modules.push(module);
        }
    }
    modules
}

fn split_by_module_headers(content: &str) -> Vec<(String, String)> {
    let mut result = Vec::new();
    let header_re = regex_lite::Regex::new(r"(?m)^###\s+(.+?)(?:\s+モジュール定義)?$").unwrap();
    let matches: Vec<_> = header_re.find_iter(content)
        .map(|m| {
            let caps = header_re.captures(m.as_str()).unwrap();
            (caps.get(1).unwrap().as_str().trim().to_string(), m.start(), m.end())
        })
        .collect();

    for (i, (name, _start, end)) in matches.iter().enumerate() {
        let section_end = if i + 1 < matches.len() { matches[i + 1].1 } else { content.len() };
        result.push((name.clone(), content[*end..section_end].to_string()));
    }
    result
}

fn parse_single_module(name: &str, content: &str, source_path: Option<&str>) -> Option<ModuleDefinition> {
    let summary = extract_section(content, "概要").unwrap_or_default();
    let category_str = extract_section(content, "カテゴリ").unwrap_or_default();
    let category = parse_category(&category_str)?;
    let domain = extract_section(content, "所属ドメイン").unwrap_or_default();
    let required_data = extract_list_items(content, "必要なデータ");
    let variables = parse_variables(content);
    let dependencies = extract_list_items(content, "依存");
    let tasks = parse_tasks(content);
    let tests = extract_list_items(content, "テスト")
        .into_iter()
        .map(|desc| ModuleTest { description: desc })
        .collect();

    Some(ModuleDefinition {
        id: uuid::Uuid::new_v4().to_string(),
        name: name.to_string(),
        summary,
        category,
        domain,
        required_data,
        variables,
        dependencies,
        tasks,
        tests,
        source_path: source_path.map(|s| s.to_string()),
    })
}

fn parse_category(s: &str) -> Option<String> {
    let trimmed = s.trim();
    if ["UI", "Logic", "System", "GameObject"].contains(&trimmed) {
        Some(trimmed.to_string())
    } else {
        None
    }
}

fn extract_section(content: &str, header: &str) -> Option<String> {
    let pattern = format!(r"(?m)^####\s+{}\s*\n([\s\S]*?)(?=\n####|\n###|$)", regex_lite::escape(header));
    let re = regex_lite::Regex::new(&pattern).ok()?;
    let caps = re.captures(content)?;
    let text = caps.get(1)?.as_str().trim().to_string();
    if text.is_empty() { None } else { Some(text) }
}

fn extract_list_items(content: &str, header: &str) -> Vec<String> {
    let section = match extract_section(content, header) {
        Some(s) => s,
        None => return vec![],
    };
    section.lines()
        .map(|l| l.trim())
        .filter(|l| l.starts_with("- ") || l.starts_with("* "))
        .map(|l| l[2..].trim().to_string())
        .collect()
}

fn parse_variables(content: &str) -> Vec<ModuleVariable> {
    extract_list_items(content, "変数").into_iter().map(|item| {
        let parts: Vec<&str> = item.splitn(2, ':').collect();
        if parts.len() >= 2 {
            let name_part = parts[0].trim();
            let desc = parts[1].trim().to_string();
            // Check for type in parentheses: name (type)
            if let Some(paren_start) = name_part.find('(') {
                if let Some(paren_end) = name_part.find(')') {
                    return ModuleVariable {
                        name: name_part[..paren_start].trim().to_string(),
                        var_type: name_part[paren_start + 1..paren_end].trim().to_string(),
                        description: Some(desc),
                    };
                }
            }
            ModuleVariable { name: name_part.to_string(), var_type: "unknown".to_string(), description: Some(desc) }
        } else {
            ModuleVariable { name: item, var_type: "unknown".to_string(), description: None }
        }
    }).collect()
}

fn parse_tasks(content: &str) -> Vec<ModuleTask> {
    let inputs = parse_port_section(content, "入力");
    let outputs = parse_port_section(content, "出力");

    let task_pattern = r"(?m)^#####\s+タスク\s*\n([\s\S]*?)(?=\n####|\n###|\n#####|$)";
    let re = match regex_lite::Regex::new(task_pattern) {
        Ok(r) => r,
        Err(_) => return vec![],
    };
    let caps = match re.captures(content) {
        Some(c) => c,
        None => return vec![],
    };

    caps.get(1).map(|m| {
        m.as_str().lines()
            .map(|l| l.trim())
            .filter(|l| l.starts_with("- ") || l.starts_with("* "))
            .map(|l| {
                let text = l[2..].trim();
                if let Some(colon) = text.find(':') {
                    ModuleTask {
                        name: text[..colon].trim().to_string(),
                        description: text[colon + 1..].trim().to_string(),
                        inputs: inputs.clone(),
                        outputs: outputs.clone(),
                    }
                } else {
                    ModuleTask {
                        name: text.to_string(),
                        description: String::new(),
                        inputs: inputs.clone(),
                        outputs: outputs.clone(),
                    }
                }
            })
            .collect()
    }).unwrap_or_default()
}

fn parse_port_section(content: &str, header: &str) -> Vec<PortDefinition> {
    let pattern = format!(r"(?m)^#####\s+{}\s*\n([\s\S]*?)(?=\n#####|\n####|\n###|$)", regex_lite::escape(header));
    let re = match regex_lite::Regex::new(&pattern) {
        Ok(r) => r,
        Err(_) => return vec![],
    };
    re.captures(content).and_then(|c| c.get(1)).map(|m| {
        m.as_str().lines()
            .map(|l| l.trim())
            .filter(|l| l.starts_with("- ") || l.starts_with("* "))
            .map(|l| PortDefinition {
                name: l[2..].trim().to_string(),
                port_type: "any".to_string(),
            })
            .collect()
    }).unwrap_or_default()
}
