#!/bin/bash
set -e

echo "Creating Kafka topics..."

rpk topic create obs.logs --partitions 3 --replicas 1 2>/dev/null || echo "Topic obs.logs already exists"
rpk topic create obs.traces --partitions 3 --replicas 1 2>/dev/null || echo "Topic obs.traces already exists"
rpk topic create obs.metrics --partitions 3 --replicas 1 2>/dev/null || echo "Topic obs.metrics already exists"

echo "Topics created successfully."
rpk topic list
