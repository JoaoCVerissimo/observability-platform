CREATE DATABASE IF NOT EXISTS observability;

-- Logs table
CREATE TABLE IF NOT EXISTS observability.logs (
    timestamp       DateTime64(9, 'UTC'),
    trace_id        String,
    span_id         String,
    severity        LowCardinality(String),
    service_name    LowCardinality(String),
    body            String,
    attributes      Map(String, String),
    resource        Map(String, String)
) ENGINE = MergeTree()
PARTITION BY toDate(timestamp)
ORDER BY (service_name, severity, timestamp)
TTL toDateTime(timestamp) + INTERVAL 30 DAY;

-- Traces/spans table
CREATE TABLE IF NOT EXISTS observability.traces (
    timestamp       DateTime64(9, 'UTC'),
    trace_id        String,
    span_id         String,
    parent_span_id  String DEFAULT '',
    service_name    LowCardinality(String),
    operation_name  String,
    span_kind       LowCardinality(String),
    duration_ns     UInt64,
    status_code     LowCardinality(String),
    status_message  String DEFAULT '',
    attributes      Map(String, String),
    events_timestamp Array(DateTime64(9, 'UTC')),
    events_name     Array(String),
    resource        Map(String, String)
) ENGINE = MergeTree()
PARTITION BY toDate(timestamp)
ORDER BY (service_name, timestamp, trace_id)
TTL toDateTime(timestamp) + INTERVAL 30 DAY;

-- Alert rules table
CREATE TABLE IF NOT EXISTS observability.alert_rules (
    id              UUID DEFAULT generateUUIDv4(),
    name            String,
    description     String DEFAULT '',
    query_type      LowCardinality(String),
    query           String,
    condition       LowCardinality(String),
    threshold       Float64,
    evaluation_interval_s  UInt32 DEFAULT 60,
    for_duration_s  UInt32 DEFAULT 0,
    severity        LowCardinality(String),
    labels          Map(String, String),
    enabled         UInt8 DEFAULT 1,
    created_at      DateTime DEFAULT now(),
    updated_at      DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(updated_at)
ORDER BY id;

-- Alert events/history
CREATE TABLE IF NOT EXISTS observability.alert_events (
    id              UUID DEFAULT generateUUIDv4(),
    rule_id         UUID,
    fired_at        DateTime64(3, 'UTC'),
    resolved_at     Nullable(DateTime64(3, 'UTC')),
    status          LowCardinality(String),
    value           Float64,
    labels          Map(String, String)
) ENGINE = MergeTree()
PARTITION BY toDate(fired_at)
ORDER BY (rule_id, fired_at)
TTL toDateTime(fired_at) + INTERVAL 90 DAY;

-- Dashboard definitions
CREATE TABLE IF NOT EXISTS observability.dashboards (
    id              UUID DEFAULT generateUUIDv4(),
    title           String,
    description     String DEFAULT '',
    widgets         String,
    created_at      DateTime DEFAULT now(),
    updated_at      DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(updated_at)
ORDER BY id;
