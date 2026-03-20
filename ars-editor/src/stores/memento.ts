import type { Project } from '@/types/domain';

/**
 * Memento: Immutable snapshot of project state.
 * Stores a deep-cloned copy of the project at a given point in time.
 */
export class ProjectMemento {
  private readonly state: string;
  readonly label: string;
  readonly timestamp: number;

  constructor(project: Project, label: string) {
    this.state = JSON.stringify(project);
    this.label = label;
    this.timestamp = Date.now();
  }

  getState(): Project {
    return JSON.parse(this.state);
  }
}

/**
 * Command: Represents an executable & undoable operation.
 * Each command captures a before-memento on execute and an after-memento for redo.
 */
export interface Command {
  readonly label: string;
  execute(): void;
  undo(): void;
  redo(): void;
}

/**
 * MementoCommand: A generic command that captures project snapshots (mementos)
 * before and after execution for undo/redo support.
 */
export class MementoCommand implements Command {
  readonly label: string;
  private beforeMemento: ProjectMemento | null = null;
  private afterMemento: ProjectMemento | null = null;
  private readonly getProject: () => Project;
  private readonly restoreProject: (project: Project) => void;
  private readonly action: () => void;

  constructor(
    label: string,
    getProject: () => Project,
    restoreProject: (project: Project) => void,
    action: () => void,
  ) {
    this.label = label;
    this.getProject = getProject;
    this.restoreProject = restoreProject;
    this.action = action;
  }

  execute(): void {
    this.beforeMemento = new ProjectMemento(this.getProject(), this.label);
    this.action();
    this.afterMemento = new ProjectMemento(this.getProject(), this.label);
  }

  undo(): void {
    if (!this.beforeMemento) return;
    this.restoreProject(this.beforeMemento.getState());
  }

  redo(): void {
    if (!this.afterMemento) return;
    this.restoreProject(this.afterMemento.getState());
  }
}

/**
 * SnapshotCommand: A simplified command created from already-captured
 * before/after snapshots. Used by the automatic history tracking.
 */
export class SnapshotCommand implements Command {
  readonly label: string;
  private readonly beforeMemento: ProjectMemento;
  private afterMemento: ProjectMemento | null = null;
  private readonly restoreProject: (project: Project) => void;

  constructor(
    label: string,
    before: Project,
    restoreProject: (project: Project) => void,
  ) {
    this.label = label;
    this.beforeMemento = new ProjectMemento(before, label);
    this.restoreProject = restoreProject;
  }

  setAfter(after: Project): void {
    this.afterMemento = new ProjectMemento(after, this.label);
  }

  execute(): void {
    // Already executed — snapshot was taken after the fact
  }

  undo(): void {
    this.restoreProject(this.beforeMemento.getState());
  }

  redo(): void {
    if (this.afterMemento) {
      this.restoreProject(this.afterMemento.getState());
    }
  }
}
