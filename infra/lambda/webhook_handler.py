"""
GitHub Webhook → EC2 Start Lambda

Receives GitHub webhook events (push, pull_request, workflow_dispatch)
and starts the self-hosted runner EC2 instance if it's stopped.
"""

import hashlib
import hmac
import json
import os

import boto3

ec2 = boto3.client("ec2")

INSTANCE_ID = os.environ["INSTANCE_ID"]
WEBHOOK_SECRET = os.environ["WEBHOOK_SECRET"]


def verify_signature(payload: bytes, signature: str) -> bool:
    expected = "sha256=" + hmac.new(
        WEBHOOK_SECRET.encode(), payload, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


def handler(event, _context):
    body = event.get("body", "")
    signature = event.get("headers", {}).get("x-hub-signature-256", "")

    if not verify_signature(body.encode(), signature):
        return {"statusCode": 401, "body": "Invalid signature"}

    payload = json.loads(body)
    action = payload.get("action", "")
    event_type = event.get("headers", {}).get("x-github-event", "")

    # Only start for relevant events
    if event_type == "pull_request" and action not in ("opened", "synchronize", "reopened"):
        return {"statusCode": 200, "body": "Skipped"}

    # Check instance state
    response = ec2.describe_instances(InstanceIds=[INSTANCE_ID])
    state = response["Reservations"][0]["Instances"][0]["State"]["Name"]

    if state == "stopped":
        ec2.start_instances(InstanceIds=[INSTANCE_ID])
        return {"statusCode": 200, "body": f"Instance {INSTANCE_ID} starting"}

    if state == "running":
        return {"statusCode": 200, "body": f"Instance {INSTANCE_ID} already running"}

    return {"statusCode": 200, "body": f"Instance in state: {state}, no action taken"}
