import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { resolveModel } from '../lib/lapilli/packages/one-shot/src/index.js';
import { contract } from '../contracts/contract-runtime.mjs'; /* augur-inject:import:b7e408f3 */
import augurContract_61b985b8 from '../contracts/team-model-role.contract.mjs'; /* augur-inject:contract-predicate:fe84168f */

const team = JSON.parse(readFileSync(new URL('../.claude/agent-team.json', import.meta.url), 'utf8'));
const mappedModel = 'claude-ars-sonnet-fixture';
const explicitModel = 'claude-ars-explicit-fixture';

export function resolveTeamModel(team, env) {
  return resolveModel(team.instructionModes.api.model, 'claude', env);
}
// @ts-expect-error augur-inject
resolveTeamModel = contract(resolveTeamModel, { ...augurContract_61b985b8, contractId: 'C-1', mode: 'observe', sample: 1, where: 'tests/model-role-map.test.js:12', rule: 'contract-wrap', id: '61b985b8' }); /* augur-inject:contract-wrap:61b985b8 */

test('the team API configuration uses the Sonnet role and accepts an explicit model ID', (context) => {
  const directory = mkdtempSync(join(tmpdir(), 'ars-model-role-map-'));
  context.after(() => rmSync(directory, { recursive: true, force: true }));
  const roleMapPath = join(directory, 'model-roles.json');
  writeFileSync(roleMapPath, JSON.stringify({ schemaVersion: 1, roles: { claude: { sonnet: mappedModel } } }));
  const env = { LUDIARS_MODEL_ROLES_FILE: roleMapPath };

  assert.equal(team.instructionModes.api.model, 'sonnet');
  assert.equal(resolveTeamModel(team, env), mappedModel);

  const overriddenTeam = structuredClone(team);
  overriddenTeam.instructionModes.api.model = explicitModel;
  assert.equal(resolveTeamModel(overriddenTeam, env), explicitModel);
});

test('Anatomia groups the team model setting and its contract checks in one domain', () => {
  const domainPath = new URL('../spec/domains/team-model-configuration.domain.json', import.meta.url);
  const domain = JSON.parse(readFileSync(domainPath, 'utf8'));
  const pathPatterns = domain.membership.map(({ pathPattern }) => new RegExp(pathPattern, 'u'));
  const teamModelPaths = [
    '.claude/agent-team.json',
    'contracts/contract-runtime.mjs',
    'contracts/team-model-role.contract.mjs',
    'tests/model-role-map.test.js',
  ];

  for (const path of teamModelPaths) {
    assert.ok(pathPatterns.some((pattern) => pattern.test(path)), `${path} must belong to ${domain.name}`);
  }
});
