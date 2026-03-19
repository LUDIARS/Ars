import { useCallback, useEffect, useState } from 'react';
import { depotApi, type Resource, type ResourceCategory, type BonePattern, type MotionGroup, type TextureGroup } from '@/lib/depot-api';

const CATEGORIES: { label: string; value: ResourceCategory | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Model', value: 'model' },
  { label: 'Texture', value: 'texture' },
  { label: 'Motion', value: 'motion' },
  { label: 'Font', value: 'font' },
  { label: 'Sound', value: 'sound' },
];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function CategoryBadge({ category }: { category: ResourceCategory }) {
  const colors: Record<ResourceCategory, string> = {
    model: 'bg-blue-500/20 text-blue-300',
    texture: 'bg-green-500/20 text-green-300',
    motion: 'bg-purple-500/20 text-purple-300',
    font: 'bg-yellow-500/20 text-yellow-300',
    sound: 'bg-pink-500/20 text-pink-300',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[category]}`}>
      {category}
    </span>
  );
}

type Tab = 'resources' | 'bone-patterns' | 'motion-groups' | 'texture-groups';

export function ResourceDepotPage() {
  const [tab, setTab] = useState<Tab>('resources');
  const [resources, setResources] = useState<Resource[]>([]);
  const [bonePatterns, setBonePatterns] = useState<BonePattern[]>([]);
  const [motionGroups, setMotionGroups] = useState<MotionGroup[]>([]);
  const [textureGroups, setTextureGroups] = useState<TextureGroup[]>([]);
  const [category, setCategory] = useState<ResourceCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);

  const loadResources = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let data: Resource[];
      if (search) {
        data = await depotApi.searchResources(search);
      } else if (category !== 'all') {
        data = await depotApi.getByCategory(category);
      } else {
        data = await depotApi.getResources();
      }
      setResources(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load resources');
    } finally {
      setLoading(false);
    }
  }, [category, search]);

  const loadGroupData = useCallback(async () => {
    try {
      const [bp, mg, tg] = await Promise.all([
        depotApi.getBonePatterns(),
        depotApi.getMotionGroups(),
        depotApi.getTextureGroups(),
      ]);
      setBonePatterns(bp);
      setMotionGroups(mg);
      setTextureGroups(tg);
    } catch {
      // Non-critical
    }
  }, []);

  useEffect(() => {
    loadResources();
    loadGroupData();
  }, [loadResources, loadGroupData]);

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'resources', label: 'Resources', count: resources.length },
    { key: 'bone-patterns', label: 'Bone Patterns', count: bonePatterns.length },
    { key: 'motion-groups', label: 'Motion Groups', count: motionGroups.length },
    { key: 'texture-groups', label: 'Texture Groups', count: textureGroups.length },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-3 border-b border-zinc-700">
        <h2 className="text-sm font-semibold text-white whitespace-nowrap">Resource Depot</h2>
        <span className="text-xs text-zinc-500">Read-only</span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-700">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-xs font-medium transition-colors ${
              tab === t.key
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {t.label}
            {t.count > 0 && <span className="ml-1 text-zinc-500">({t.count})</span>}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {tab === 'resources' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Filters */}
            <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-800">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && loadResources()}
                placeholder="Search..."
                className="flex-1 bg-zinc-800 text-sm text-zinc-200 px-3 py-1.5 rounded border border-zinc-700 focus:outline-none focus:border-blue-500"
              />
              <div className="flex gap-1">
                {CATEGORIES.map(c => (
                  <button
                    key={c.value}
                    onClick={() => setCategory(c.value)}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      category === c.value
                        ? 'bg-blue-500/20 text-blue-300'
                        : 'text-zinc-400 hover:bg-zinc-800'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Resource List */}
            <div className="flex-1 overflow-y-auto">
              {loading && <div className="p-4 text-zinc-500 text-sm">Loading...</div>}
              {error && <div className="p-4 text-red-400 text-sm">{error}</div>}
              {!loading && resources.length === 0 && (
                <div className="p-4 text-zinc-500 text-sm text-center">No resources found</div>
              )}
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-zinc-900 text-zinc-400">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Filename</th>
                    <th className="text-left px-4 py-2 font-medium">Original</th>
                    <th className="text-left px-4 py-2 font-medium">Category</th>
                    <th className="text-left px-4 py-2 font-medium">Role</th>
                    <th className="text-right px-4 py-2 font-medium">Size</th>
                    <th className="text-left px-4 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {resources.map(r => (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedResource(r)}
                      className={`border-t border-zinc-800 cursor-pointer transition-colors ${
                        selectedResource?.id === r.id ? 'bg-zinc-800' : 'hover:bg-zinc-800/50'
                      }`}
                    >
                      <td className="px-4 py-2 text-zinc-200 font-mono">{r.filename}</td>
                      <td className="px-4 py-2 text-zinc-400">{r.original_filename}</td>
                      <td className="px-4 py-2"><CategoryBadge category={r.category} /></td>
                      <td className="px-4 py-2 text-zinc-400">{r.role}</td>
                      <td className="px-4 py-2 text-zinc-400 text-right">{formatSize(r.size)}</td>
                      <td className="px-4 py-2 text-zinc-400">{r.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'bone-patterns' && (
          <div className="flex-1 overflow-y-auto p-4">
            {bonePatterns.length === 0 && <div className="text-zinc-500 text-sm">No bone patterns</div>}
            <div className="space-y-3">
              {bonePatterns.map(bp => (
                <div key={bp.id} className="bg-zinc-800 rounded-lg p-3">
                  <div className="text-sm font-medium text-zinc-200">{bp.name}</div>
                  <div className="text-xs text-zinc-500 mt-1">ID: {bp.id}</div>
                  <div className="mt-2">
                    <span className="text-xs text-zinc-400">Required: </span>
                    <span className="text-xs text-zinc-300">{bp.required_bones.join(', ') || 'none'}</span>
                  </div>
                  {bp.optional_bones.length > 0 && (
                    <div className="mt-1">
                      <span className="text-xs text-zinc-400">Optional: </span>
                      <span className="text-xs text-zinc-300">{bp.optional_bones.join(', ')}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'motion-groups' && (
          <div className="flex-1 overflow-y-auto p-4">
            {motionGroups.length === 0 && <div className="text-zinc-500 text-sm">No motion groups</div>}
            <div className="space-y-3">
              {motionGroups.map(mg => (
                <div key={mg.id} className="bg-zinc-800 rounded-lg p-3">
                  <div className="text-sm font-medium text-zinc-200">{mg.name}</div>
                  <div className="text-xs text-zinc-500 mt-1">
                    {mg.motion_ids.length} motion(s)
                    {mg.bone_pattern_id && ` | Pattern: ${mg.bone_pattern_id}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'texture-groups' && (
          <div className="flex-1 overflow-y-auto p-4">
            {textureGroups.length === 0 && <div className="text-zinc-500 text-sm">No texture groups</div>}
            <div className="space-y-3">
              {textureGroups.map(tg => (
                <div key={tg.id} className="bg-zinc-800 rounded-lg p-3">
                  <div className="text-sm font-medium text-zinc-200">{tg.name}</div>
                  <div className="text-xs text-zinc-500 mt-1">
                    {tg.texture_ids.length} texture(s) |
                    Atlas: {tg.atlas_config.max_width}x{tg.atlas_config.max_height}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detail Panel */}
        {tab === 'resources' && selectedResource && (
          <div className="w-72 border-l border-zinc-700 overflow-y-auto p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Resource Detail</h3>
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-zinc-500">ID</span>
                <div className="text-zinc-300 font-mono break-all">{selectedResource.id}</div>
              </div>
              <div>
                <span className="text-zinc-500">Filename</span>
                <div className="text-zinc-200">{selectedResource.filename}</div>
              </div>
              <div>
                <span className="text-zinc-500">Original</span>
                <div className="text-zinc-200">{selectedResource.original_filename}</div>
              </div>
              <div>
                <span className="text-zinc-500">Category</span>
                <div><CategoryBadge category={selectedResource.category} /></div>
              </div>
              <div>
                <span className="text-zinc-500">Role</span>
                <div className="text-zinc-200">{selectedResource.role}</div>
              </div>
              <div>
                <span className="text-zinc-500">Size</span>
                <div className="text-zinc-200">{formatSize(selectedResource.size)}</div>
              </div>
              <div>
                <span className="text-zinc-500">Hash</span>
                <div className="text-zinc-300 font-mono break-all">{selectedResource.hash}</div>
              </div>
              <div>
                <span className="text-zinc-500">Status</span>
                <div className="text-zinc-200">{selectedResource.status}</div>
              </div>
              {selectedResource.local_path && (
                <div>
                  <span className="text-zinc-500">Local Path</span>
                  <div className="text-zinc-300 font-mono break-all text-[10px]">{selectedResource.local_path}</div>
                </div>
              )}
              <div>
                <span className="text-zinc-500">Metadata</span>
                <pre className="text-zinc-300 font-mono text-[10px] mt-1 bg-zinc-800 rounded p-2 overflow-x-auto">
                  {JSON.stringify(selectedResource.metadata, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
