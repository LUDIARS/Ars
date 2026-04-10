import { useProjectStore } from '@/stores/projectStore';
import { useEditorStore } from '@/stores/editorStore';
import { useAuthStore } from '@/stores/authStore';
import { useBackendHealth } from '@/hooks/useBackendHealth';
import { useI18n } from '@/hooks/useI18n';

export function StatusBar() {
  const { t } = useI18n();
  const project = useProjectStore((s) => s.project);
  const activeSceneId = project.activeSceneId;
  const activeScene = activeSceneId ? project.scenes[activeSceneId] : null;
  const lastSavedAt = useEditorStore((s) => s.lastSavedAt);
  const isDirty = useEditorStore((s) => s.isDirty);
  const user = useAuthStore((s) => s.user);
  const backendHealth = useBackendHealth();

  const lastSavedLabel = lastSavedAt
    ? new Date(lastSavedAt).toLocaleTimeString()
    : null;

  const actorCount = activeScene ? Object.keys(activeScene.actors).length : 0;
  const messageCount = activeScene ? activeScene.messages.length : 0;

  return (
    <div
      className="flex items-center h-6 px-3 gap-4 text-[10px] shrink-0 select-none"
      style={{
        background: 'var(--bg-surface)',
        borderTop: '1px solid var(--border)',
        color: 'var(--text-muted)',
      }}
    >
      {/* Backend status */}
      <div className="flex items-center gap-1.5">
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{
            background: backendHealth === 'ok' ? 'var(--green)'
              : backendHealth === 'down' ? 'var(--red)'
              : 'var(--text-muted)',
          }}
        />
        <span>
          {backendHealth === 'ok' ? 'Connected'
            : backendHealth === 'down' ? 'Offline'
            : 'Checking...'}
        </span>
      </div>

      {/* Active scene */}
      {activeScene && (
        <div className="flex items-center gap-1">
          <span style={{ color: 'var(--accent)' }}>{activeScene.name}</span>
          <span>({actorCount} actors, {messageCount} msgs)</span>
        </div>
      )}

      <div className="flex-1" />

      {/* Last saved */}
      {lastSavedLabel && (
        <span>
          {t('toolbar.lastSaved', { time: lastSavedLabel }) === `toolbar.lastSaved`
            ? `Saved ${lastSavedLabel}`
            : t('toolbar.lastSaved', { time: lastSavedLabel })}
          {isDirty && <span className="ml-1" style={{ color: 'var(--orange)' }}>*</span>}
        </span>
      )}

      {/* User */}
      {user && (
        <div className="flex items-center gap-1.5">
          <img src={user.avatarUrl} alt="" className="w-3.5 h-3.5 rounded-full" />
          <span>{user.displayName}</span>
        </div>
      )}
    </div>
  );
}
