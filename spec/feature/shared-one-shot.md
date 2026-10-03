# Shared code generation CLI boundary

TypeScript and Rust code generation use the same pinned Lapilli library. TypeScript imports @ludiars/one-shot through a file dependency. Rust invokes Node with the library src/cli.js and separate Claude arguments. Node >=22.12 and an authenticated Claude CLI are runtime prerequisites.

Codegen owns dependency order, concurrency, dry-run, prompts, permissions, output files and result status. Lapilli owns model resolution, executable resolution and subscription child environment. No retry, permission bypass or new deadline is added. Existing runners wait for process completion. This change does not claim process-tree cleanup after force-killing the host.

Rust defaults to lib/lapilli beside its build source tree. Relocated distributions must set ARS_ONE_SHOT_CLI to the absolute path of the shipped library src/cli.js; ship its entire src directory. ARS_NODE_BIN selects Node. Missing files fail visibly without a direct Claude fallback. SIGINT/SIGTERM forwarding belongs to the library CLI; killing its Node proxy alone is not verified child-tree termination.

Setup: git submodule update --init -- lib/lapilli, then install and build tools/ars-codegen. Verification: TypeScript build and cargo check; the hermetic Rust command test checks argument preservation. Tests run in Revisor only. No live generation or service restart. Revert source and submodule together while retaining generated files and manifests.
