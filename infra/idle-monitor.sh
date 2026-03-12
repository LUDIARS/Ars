#!/usr/bin/env bash
# Idle Monitor: Stops EC2 instance after N minutes of no GitHub Actions jobs
#
# Checks the runner's Worker status. If no job is running and no new job
# starts within IDLE_TIMEOUT_MINUTES, the instance stops itself.
set -euo pipefail

IDLE_TIMEOUT_MINUTES="${IDLE_TIMEOUT_MINUTES:-5}"
IDLE_TIMEOUT_SECONDS=$((IDLE_TIMEOUT_MINUTES * 60))
CHECK_INTERVAL=15
RUNNER_DIR="/home/runner/actions-runner"
INSTANCE_ID=$(curl -sf http://169.254.169.254/latest/meta-data/instance-id)
REGION=$(curl -sf http://169.254.169.254/latest/meta-data/placement/region)

idle_since=0

is_runner_busy() {
  # The runner creates a _work/_temp directory per job, and the Worker
  # process is alive while a job is executing
  pgrep -f "Runner.Worker" > /dev/null 2>&1
}

echo "Idle monitor started. Timeout: ${IDLE_TIMEOUT_MINUTES}m, Instance: ${INSTANCE_ID}"

while true; do
  if is_runner_busy; then
    idle_since=0
  else
    if [ "$idle_since" -eq 0 ]; then
      idle_since=$(date +%s)
      echo "Runner idle since $(date -d @${idle_since} -Is)"
    fi

    now=$(date +%s)
    elapsed=$((now - idle_since))

    if [ "$elapsed" -ge "$IDLE_TIMEOUT_SECONDS" ]; then
      echo "Idle for ${IDLE_TIMEOUT_MINUTES}m. Stopping instance ${INSTANCE_ID}."
      aws ec2 stop-instances --instance-ids "${INSTANCE_ID}" --region "${REGION}"
      exit 0
    fi
  fi

  sleep ${CHECK_INTERVAL}
done
