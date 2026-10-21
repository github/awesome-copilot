# Arize Link Examples

Placeholders used throughout:
- `{org_id}` — base64-encoded org ID
- `{space_id}` — base64-encoded space ID
- `{project_id}` — base64-encoded project ID
- `{start_ms}` / `{end_ms}` — epoch milliseconds (e.g. 1741305600000 / 1741392000000)

---

## Trace

```
https://app.arize.com/organizations/{org_id}/spaces/{space_id}/projects/{project_id}?selectedTraceId={trace_id}&queryFilterA=&selectedTab=llmTracing&timeZoneA=America%2FLos_Angeles&startA={start_ms}&endA={end_ms}&envA=tracing&modelType=generative_llm
```

## Span (trace + span highlighted)

```
https://app.arize.com/organizations/{org_id}/spaces/{space_id}/projects/{project_id}?selectedTraceId={trace_id}&selectedSpanId={span_id}&queryFilterA=&selectedTab=llmTracing&timeZoneA=America%2FLos_Angeles&startA={start_ms}&endA={end_ms}&envA=tracing&modelType=generative_llm
```

## Session

```
https://app.arize.com/organizations/{org_id}/spaces/{space_id}/projects/{project_id}?selectedSessionId={session_id}&queryFilterA=&selectedTab=llmTracing&timeZoneA=America%2FLos_Angeles&startA={start_ms}&endA={end_ms}&envA=tracing&modelType=generative_llm
```

## Dataset (examples tab)

```
https://app.arize.com/organizations/{org_id}/spaces/{space_id}/datasets/{dataset_id}?selectedTab=examples
```

## Dataset (experiments tab)

```
https://app.arize.com/organizations/{org_id}/spaces/{space_id}/datasets/{dataset_id}?selectedTab=experiments
```

## Labeling Queue list

```
https://app.arize.com/organizations/{org_id}/spaces/{space_id}/queues
```

## Labeling Queue (specific)

```
https://app.arize.com/organizations/{org_id}/spaces/{space_id}/queues/{queue_id}
```

## Evaluator (latest version)

```
https://app.arize.com/organizations/{org_id}/spaces/{space_id}/evaluators/{evaluator_id}
```

## Evaluator (specific version)

```
https://app.arize.com/organizations/{org_id}/spaces/{space_id}/evaluators/{evaluator_id}?version={version_url_encoded}
```

## Annotation Configs

```
https://app.arize.com/organizations/{org_id}/spaces/{space_id}/annotation-configs
```
