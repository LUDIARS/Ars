import { useEffect, useRef } from 'react';
import { useCollabStore } from '@/stores/collabStore';
import { useProjectStore } from '@/stores/projectStore';
import { useEditorStore } from '@/stores/editorStore';

/**
 * ユーザーのプレゼンス（操作中のシーン・ノード・ビュータブ）を
 * コラボレーションサーバーに自動送信するフック。
 *
 * AppLayout または EditorPage の最上位で 1 回だけ呼び出す。
 */
export function usePresenceTracker() {
  const connected = useCollabStore((s) => s.connected);
  const sendPresence = useCollabStore((s) => s.sendPresence);

  const project = useProjectStore((s) => s.project);
  const activeSceneId = project.activeSceneId;
  const scenes = project.scenes;

  const selectedNodeIds = useEditorStore((s) => s.selectedNodeIds);
  const activeViewTab = useEditorStore((s) => s.activeViewTab);

  const prevRef = useRef<string>('');

  useEffect(() => {
    if (!connected) return;

    const scene = activeSceneId ? scenes[activeSceneId] : null;
    const sceneName = scene?.name ?? null;

    const selectedNodeNames = selectedNodeIds
      .map((id) => scene?.actors[id]?.name)
      .filter((n): n is string => !!n);

    // 同じ状態なら送信しない
    const key = JSON.stringify({
      activeSceneId,
      sceneName,
      selectedNodeIds,
      selectedNodeNames,
      activeViewTab,
    });
    if (key === prevRef.current) return;
    prevRef.current = key;

    sendPresence(
      activeSceneId,
      sceneName,
      selectedNodeIds,
      selectedNodeNames,
      activeViewTab,
    );
  }, [connected, sendPresence, activeSceneId, scenes, selectedNodeIds, activeViewTab]);
}
