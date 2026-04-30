---
name: qdrant-clients-sdk
description: "Qdrant provides client SDKs for various programming languages, allowing easy integration with Qdrant deployments."
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
---

# Qdrant Clients SDK

Qdrant has the following officially supported client SDKs:

- Python — [qdrant-client](https://github.com/qdrant/qdrant-client) · Installation: `pip install qdrant-client[fastembed]`
- JavaScript / TypeScript — [qdrant-js](https://github.com/qdrant/qdrant-js) · Installation: `npm install @qdrant/js-client-rest`
- Rust — [rust-client](https://github.com/qdrant/rust-client) · Installation: `cargo add qdrant-client`
- Go — [go-client](https://github.com/qdrant/go-client) · Installation: `go get github.com/qdrant/go-client`
- .NET — [qdrant-dotnet](https://github.com/qdrant/qdrant-dotnet) · Installation: `dotnet add package Qdrant.Client`
- Java — [java-client](https://github.com/qdrant/java-client) · Available on Maven Central: https://central.sonatype.com/artifact/io.qdrant/client


## API Reference

All interaction with Qdrant can happen through the REST API or gRPC API. We recommend using the REST API if you are using Qdrant for the first time or working on a prototype.

* REST API - [OpenAPI Reference](https://api.qdrant.tech/api-reference) - [GitHub](https://github.com/qdrant/qdrant/blob/master/docs/redoc/master/openapi.json)
* gRPC API - [gRPC protobuf definitions](https://github.com/qdrant/qdrant/tree/master/lib/api/src/grpc/proto)

## Code examples

To obtain code examples for a specific client and use case, you can send a search request to the library of curated code snippets for the Qdrant client.

```bash
curl -X GET "https://snippets.qdrant.tech/search?language=python&query=how+to+upload+points"
```

Available languages: `python`, `typescript`, `rust`, `java`, `go`, `csharp`


Response example:

```markdown

## Snippet 1

*qdrant-client* (vlatest) — https://search.qdrant.tech/md/documentation/manage-data/points/

Uploads multiple vector-embedded points to a Qdrant collection using the Python qdrant_client (PointStruct) with id, payload (e.g., color), and a 3D-like vector for similarity search. It supports parallel uploads (parallel=4) and a retry policy (max_retries=3) for robust indexing. The operation is idempotent: re-uploading with the same id overwrites existing points; if ids aren’t provided, Qdrant auto-generates UUIDs.

client.upload_points(
    collection_name="{collection_name}",
    points=[
        models.PointStruct(
            id=1,
            payload={
                "color": "red",
            },
            vector=[0.9, 0.1, 0.1],
        ),
        models.PointStruct(
            id=2,
            payload={
                "color": "green",
            },
            vector=[0.1, 0.9, 0.1],
        ),
    ],
    parallel=4,
    max_retries=3,
)
```

Default response format is markdown, if snippet output is required in JSON format, you can add `&format=json` to the query string.
