import { useEffect, useCallback, useRef } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { useEditorStore } from '@/stores/editorStore';
import { pushHistory, undo, redo, canUndo, canRedo, isRestoring } from '@/stores/historyMiddleware';

export function useUndoRedo() {
  const project = useProjectStore((s) => s.project);
  const isGenerating = useEditorStore((s) => s.isGenerating);
  const abortGeneration = useEditorStore((s) => s.abortGeneration);
  const prevProjectRef = useRef(project);

  // Track project changes and create snapshot commands automatically
  useEffect(() => {
    const prev = prevProjectRef.current;
    if (prev !== project && !isRestoring()) {
      const prevJson = JSON.stringify(prev);
      const currJson = JSON.stringify(project);
      if (prevJson !== currJson) {
        pushHistory(prev);
      }
    }
    prevProjectRef.current = project;
  }, [project]);

  const handleUndo = useCallback(() => {
    // If AI code generation is running, abort it before undoing
    if (isGenerating) {
      abortGeneration();
    }
    if (canUndo()) {
      undo();
    }
  }, [isGenerating, abortGeneration]);

  const handleRedo = useCallback(() => {
    if (canRedo()) {
      redo();
    }
  }, []);

  return { handleUndo, handleRedo, canUndo, canRedo };
}
