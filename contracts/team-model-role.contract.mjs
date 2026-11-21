export default {
  post(result, team) {
    const configured = team.instructionModes.api.model;
    const expected = configured === 'sonnet' ? 'claude-ars-sonnet-fixture' : 'claude-ars-explicit-fixture';
    return (['sonnet', 'claude-ars-explicit-fixture'].includes(configured) && result === expected)
      || 'The API default must follow the Sonnet role; an explicit model must pass through.';
  },
};
