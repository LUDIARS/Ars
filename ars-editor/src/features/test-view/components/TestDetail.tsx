import { useMemo } from 'react';
import { useTestStore } from '../testStore';
import { useProjectStore } from '@/stores/projectStore';
import {
  DEFAULT_INTEGRATION_SKELETON,
  TEST_STATUS_COLOR,
  TEST_STATUS_LABEL,
} from '../types';
import type { FunctionalTest, IntegrationTest } from '../types';

/**
 * 中央ペイン: 選択中テストの編集フォーム。
 *
 * - 機能テスト: 要件 / 対象コンポーネントパスのメタデータを編集。
 *   テスト本体はコード生成直後に自動生成される前提で、ここでは骨格のみ扱う。
 * - 統合テスト: 骨子（AI）と詳細（人間）を2枠に分離して編集する。
 */
export function TestDetail() {
  const activeKind = useTestStore((s) => s.activeKind);
  const selectedId = useTestStore((s) => s.selectedTestId);
  const functionalTests = useTestStore((s) => s.functionalTests);
  const integrationTests = useTestStore((s) => s.integrationTests);

  const selected = useMemo(() => {
    if (!selectedId) return null;
    if (activeKind === 'functional') {
      return functionalTests[selectedId] ?? null;
    }
    return integrationTests[selectedId] ?? null;
  }, [activeKind, selectedId, functionalTests, integrationTests]);

  if (!selected) {
    return (
      <div
        className="flex-1 flex items-center justify-center text-xs"
        style={{ color: 'var(--text-muted)' }}
      >
        左のリストからテストを選択してください。
      </div>
    );
  }

  if (activeKind === 'functional') {
    return <FunctionalDetail test={selected as FunctionalTest} />;
  }
  return <IntegrationDetail test={selected as IntegrationTest} />;
}

// ── Functional ────────────────────────────────────────

function FunctionalDetail({ test }: { test: FunctionalTest }) {
  const upsert = useTestStore((s) => s.upsertFunctionalTest);
  const remove = useTestStore((s) => s.removeFunctionalTest);

  return (
    <div
      className="flex-1 flex flex-col overflow-y-auto p-4 gap-3"
      style={{ background: 'var(--bg)' }}
    >
      <HeaderRow
        title="機能テスト"
        status={test.lastStatus}
        message={test.lastMessage}
        onDelete={() => remove(test.id)}
      />

      <Field label="対象パス (actor:component)">
        <input
          type="text"
          value={test.targetPath}
          onChange={(e) => upsert({ ...test, targetPath: e.target.value })}
          placeholder="Player:Movement"
        />
      </Field>

      <Field label="達成すべき要件 (codedesign の goal / test case)">
        <textarea
          value={test.requirement}
          onChange={(e) => upsert({ ...test, requirement: e.target.value })}
          rows={4}
          placeholder="例: 方向入力に応じてキャラクターが速度 5 単位/秒で移動する"
          className="w-full resize-none"
        />
      </Field>

      <MetaRow label="自動生成状態">
        <span
          className="text-xs px-2 py-0.5 rounded"
          style={{
            color: test.generated ? 'var(--green)' : 'var(--text-muted)',
            border: '1px solid var(--border)',
          }}
        >
          {test.generated ? '生成済み' : 'コード生成時に生成される'}
        </span>
      </MetaRow>

      <MetaRow label="依存ドライバー">
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {test.driverIds.length === 0
            ? 'なし（要件に応じて自動生成）'
            : test.driverIds.join(', ')}
        </span>
      </MetaRow>

      <MetaRow label="依存テストモジュール">
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {test.moduleIds.length === 0 ? 'なし' : test.moduleIds.join(', ')}
        </span>
      </MetaRow>

      <p
        className="text-[11px] mt-2"
        style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}
      >
        機能テストは <code>ars-codegen</code> 実行後に <code>test/functional/</code>
        配下へ自動生成されます。ここではメタデータのみ編集できます。詳細仕様は
        <code> spec/rule/test-rules.md</code> を参照。
      </p>
    </div>
  );
}

// ── Integration ───────────────────────────────────────

function IntegrationDetail({ test }: { test: IntegrationTest }) {
  const upsert = useTestStore((s) => s.upsertIntegrationTest);
  const remove = useTestStore((s) => s.removeIntegrationTest);
  const regenerateSkeleton = useTestStore((s) => s.regenerateSkeleton);
  const scenes = useProjectStore((s) => s.project.scenes);
  const scene = scenes[test.sceneId];

  return (
    <div
      className="flex-1 flex flex-col overflow-y-auto p-4 gap-3"
      style={{ background: 'var(--bg)' }}
    >
      <HeaderRow
        title={`統合テスト — ${scene?.name ?? '(missing scene)'}`}
        status={test.lastStatus}
        message={test.lastMessage}
        onDelete={() => remove(test.id)}
      />

      <Field label="フロー名">
        <input
          type="text"
          value={test.name}
          onChange={(e) => upsert({ ...test, name: e.target.value })}
          placeholder="タイトル画面からバトル開始まで"
        />
      </Field>

      <div className="flex items-center justify-between">
        <span
          className="text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--accent)' }}
        >
          骨子 (AI 生成)
        </span>
        <button
          onClick={() => regenerateSkeleton(test.id, DEFAULT_INTEGRATION_SKELETON)}
          className="text-[10px] px-2 py-0.5 rounded"
          style={{
            color: 'var(--text-muted)',
            background: 'transparent',
            border: '1px solid var(--border)',
          }}
          title="シーン構成から骨子を再生成（人間記述は保持）"
        >
          Regenerate
        </button>
      </div>
      <textarea
        value={test.skeleton}
        onChange={(e) => regenerateSkeleton(test.id, e.target.value)}
        rows={8}
        className="w-full resize-none"
        style={{ fontFamily: 'var(--font-mono, monospace)' }}
      />

      <span
        className="text-[11px] font-semibold uppercase tracking-wider mt-2"
        style={{ color: 'var(--green)' }}
      >
        詳細 (人間記述 / 再生成時も保持)
      </span>
      <textarea
        value={test.details}
        onChange={(e) => upsert({ ...test, details: e.target.value })}
        rows={10}
        className="w-full resize-none"
        style={{ fontFamily: 'var(--font-mono, monospace)' }}
      />

      <MetaRow label="依存テストモジュール">
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {test.moduleIds.length === 0
            ? 'なし（右ペインで追加）'
            : test.moduleIds.join(', ')}
        </span>
      </MetaRow>
    </div>
  );
}

// ── Shared bits ───────────────────────────────────────

function HeaderRow({
  title,
  status,
  message,
  onDelete,
}: {
  title: string;
  status: IntegrationTest['lastStatus'];
  message?: string;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
          {title}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span
            className="text-[10px] px-2 py-0.5 rounded"
            style={{ color: TEST_STATUS_COLOR[status], border: '1px solid var(--border)' }}
          >
            {TEST_STATUS_LABEL[status]}
          </span>
          {message && (
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              {message}
            </span>
          )}
        </div>
      </div>
      <button
        onClick={() => {
          if (confirm('このテストを削除しますか？')) onDelete();
        }}
        className="text-[10px] px-2 py-0.5 rounded"
        style={{
          color: 'var(--red)',
          background: 'transparent',
          border: '1px solid var(--border)',
        }}
      >
        Delete
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span
        className="text-[11px] font-semibold uppercase tracking-wider"
        style={{ color: 'var(--text-muted)' }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="text-[11px] font-semibold uppercase tracking-wider"
        style={{ color: 'var(--text-muted)', width: 180 }}
      >
        {label}
      </span>
      {children}
    </div>
  );
}
