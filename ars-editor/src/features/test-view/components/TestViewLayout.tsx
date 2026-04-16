import { useState } from 'react';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useTestStore } from '../testStore';
import { TestList } from './TestList';
import { TestDetail } from './TestDetail';
import { TestModulePanel } from './TestModulePanel';

/**
 * Scene/UI と同列の「Test」ビューのレイアウト。
 *
 * - Desktop: 左 (TestList) | 中央 (TestDetail) | 右 (TestModulePanel) の 3 ペイン。
 * - Mobile: タブで切替。
 */
export function TestViewLayout() {
  const isMobile = useIsMobile();
  if (isMobile) {
    return <MobileTestViewLayout />;
  }
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TestToolbar />
      <div className="flex flex-1 overflow-hidden">
        <TestList />
        <TestDetail />
        <TestModulePanel />
      </div>
    </div>
  );
}

// ── Toolbar ───────────────────────────────────────────

function TestToolbar() {
  const resetStatuses = useTestStore((s) => s.resetStatuses);

  return (
    <div
      className="flex items-center gap-2 px-2 shrink-0"
      style={{
        height: 36,
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <ToolbarButton
        label="Run All"
        title="全テストを実行（機能＋統合）"
        onClick={() => {
          // 実行は将来 Tauri / Vitest 連携で差し込む。
          // 現時点では status を pending に戻すだけ。
          resetStatuses();
        }}
      />
      <ToolbarButton
        label="Regenerate Functional"
        title="codedesign の要件から機能テストを再生成"
        onClick={() => {
          // TODO(ars-test): codegen バックエンドと連携
        }}
      />
      <ToolbarButton
        label="Regenerate Skeleton"
        title="シーン構成から統合テストの骨子を再生成（人間記述は保持）"
        onClick={() => {
          // TODO(ars-test): AI 骨子生成コマンドを呼ぶ
        }}
      />
      <ToolbarButton
        label="Sync TestModules"
        title="Ars-TestModule リポジトリと同期"
        onClick={() => {
          // TODO(ars-test): module-registry 経由で Ars-TestModule を同期
        }}
      />
      <div className="flex-1" />
      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
        spec/rule/test-rules.md
      </span>
    </div>
  );
}

function ToolbarButton({
  label,
  title,
  onClick,
}: {
  label: string;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="text-xs px-2 py-1 rounded"
      style={{
        color: 'var(--text-muted)',
        background: 'transparent',
        border: '1px solid var(--border)',
      }}
    >
      {label}
    </button>
  );
}

// ── Mobile ────────────────────────────────────────────

type MobileTestTab = 'list' | 'detail' | 'modules';

function MobileTestViewLayout() {
  const [tab, setTab] = useState<MobileTestTab>('list');
  const tabs: { key: MobileTestTab; label: string }[] = [
    { key: 'list', label: 'List' },
    { key: 'detail', label: 'Detail' },
    { key: 'modules', label: 'Modules' },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TestToolbar />
      <div
        className="flex items-center gap-0.5 px-2 shrink-0"
        style={{
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border)',
          height: 32,
        }}
      >
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="px-3 py-1 text-xs font-medium rounded-t"
              style={{
                color: active ? 'var(--text)' : 'var(--text-muted)',
                background: active ? 'var(--bg-surface-2)' : 'transparent',
                border: 'none',
                borderBottom: active
                  ? '2px solid var(--accent)'
                  : '2px solid transparent',
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {tab === 'list' && <TestList />}
        {tab === 'detail' && <TestDetail />}
        {tab === 'modules' && <TestModulePanel />}
      </div>
    </div>
  );
}
