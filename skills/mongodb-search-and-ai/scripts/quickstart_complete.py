#!/usr/bin/env python3
# /// script
# dependencies = [
#   "pymongo>=4.6.0",
# ]
# ///

# MongoDB Search Quickstart — Complete Script
# ─────────────────────────────────────────────────────────────
# Written for the Atlas `sample_mflix.movies` sample collection. The
# schema is hard-coded throughout: the `plot`, `genres`, and `title`
# fields, the index definitions, and the sample query text.
#
# The connection string comes from the environment: set MONGODB_URI, or
# MDB_MCP_CONNECTION_STRING, which the MongoDB MCP server already uses.
#
# To run against your own data, change the two values below AND
# update the index definitions, `$project` stages, and query strings
# to match your own field names.

DB_NAME = "sample_mflix"
COLLECTION_NAME = "movies"

# Index names. The walkthrough uses these defaults, but creates `<name>_2` when
# the default is already taken by an incompatible definition. If that happened,
# set the matching constant to the name it created, so this script reuses that
# index instead of stopping on the conflicting one.
SEMANTIC_INDEX_NAME = "quickstart_semantic"
TEXT_INDEX_NAME = "quickstart_text"
AUTOCOMPLETE_INDEX_NAME = "quickstart_autocomplete"

INDEX_WAIT_TIMEOUT_SECONDS = 600

# ─────────────────────────────────────────────────────────────

import os
import time
from pymongo import MongoClient
from pymongo.operations import SearchIndexModel

CONNECTION_STRING = (os.environ.get("MONGODB_URI")
                     or os.environ.get("MDB_MCP_CONNECTION_STRING"))

if not CONNECTION_STRING:
    raise SystemExit("\n  ERROR: no connection string. Set MONGODB_URI (or"
                     " MDB_MCP_CONNECTION_STRING) to your cluster's SRV"
                     " string, then rerun.")

client = MongoClient(CONNECTION_STRING)
db = client[DB_NAME]
collection = db[COLLECTION_NAME]

def fail(message):
    print(f"\n  ERROR: {message}")
    client.close()
    raise SystemExit(1)

def wait_for_index(name):
    print(f"  Waiting for index '{name}' to be ready...", end="", flush=True)
    deadline = time.monotonic() + INDEX_WAIT_TIMEOUT_SECONDS
    while True:
        indexes = list(collection.list_search_indexes(name))
        if not indexes:
            fail(f"Index '{name}' does not exist.")
        status = indexes[0].get("status")
        if status == "READY":
            print(" ready.")
            return
        if status == "STALE":
            fail(f"Index '{name}' is stale because embedding sync is paused. "
                 "Free disk space, wait for READY, then rerun.")
        if status == "FAILED":
            fail(f"Index '{name}' failed to build. Check the tier index cap"
                 " (3 on Free, 10 on Flex) and the index definition.")
        if time.monotonic() > deadline:
            fail(f"Index '{name}' is still '{status}' after"
                 f" {INDEX_WAIT_TIMEOUT_SECONDS}s. Check its status in Atlas,"
                 " then rerun.")
        print(".", end="", flush=True)
        time.sleep(5)

def covers(expected, actual):
    # True when `actual` contains everything `expected` asks for. Atlas adds
    # its own defaults to a stored definition, so an exact match is too strict.
    if isinstance(expected, dict):
        # A field can be stored as a list of types (a multi-type field), which
        # still satisfies a single expected type.
        if isinstance(actual, list):
            return any(covers(expected, candidate) for candidate in actual)
        return (isinstance(actual, dict)
                and all(k in actual and covers(v, actual[k])
                        for k, v in expected.items()))
    if isinstance(expected, list):
        return (isinstance(actual, list)
                and all(any(covers(item, candidate) for candidate in actual)
                        for item in expected))
    return expected == actual

def check_definition(name, expected):
    indexes = list(collection.list_search_indexes(name))
    if not indexes:
        fail(f"Index '{name}' does not exist.")
    actual = indexes[0].get("latestDefinition", {})
    if not covers(expected, actual):
        fail(f"An index named '{name}' already exists, but its definition does"
             " not match the one this script needs, so the queries below would"
             " fail. An index created by another route (for example the MCP"
             " walkthrough) can omit fields this script queries. Drop"
             f" '{name}' in Atlas and rerun, or point the matching"
             " *_INDEX_NAME constant at the top of this script at a name that"
             f" is free or already correct.\n  Existing definition: {actual}")

def ensure_index(model, name, definition):
    try:
        collection.create_search_index(model)
    except Exception as e:
        if "already exists" not in str(e):
            fail(f"Could not create index '{name}': {e}")
        print("  Index already exists — checking its definition.")
        check_definition(name, definition)
    wait_for_index(name)

def print_results(results, fields=["title", "plot"]):
    for i, doc in enumerate(results, 1):
        print(f"\n  {i}. {doc.get('title', 'N/A')}")
        if "score" in doc:
            print(f"     Score: {round(doc['score'], 3)}")
        if "plot" in fields and doc.get("plot"):
            print(f"     Plot:  {doc['plot'][:120]}...")
        if "genres" in doc:
            print(f"     Genres: {doc.get('genres', [])}")

# ─────────────────────────────────────────────────────────────
# 1. CREATE AUTO EMBEDDING INDEX (Semantic Search)
# ─────────────────────────────────────────────────────────────
print("\n── SEMANTIC SEARCH (Auto Embedding) ──────────────────")
print("Creating autoEmbed index on 'plot' field...")

semantic_definition = {
    "fields": [
        {
            "type": "autoEmbed",
            "modality": "text",
            "path": "plot",
            "model": "voyage-4"
        },
        {
            "type": "filter",
            "path": "genres"
        }
    ]
}

ensure_index(
    SearchIndexModel(
        definition=semantic_definition,
        name=SEMANTIC_INDEX_NAME,
        type="vectorSearch"
    ),
    SEMANTIC_INDEX_NAME,
    semantic_definition
)

# Run semantic query
print("\nQuery: 'a story about growing up'")
results = list(collection.aggregate([
    {
        "$vectorSearch": {
            "index": SEMANTIC_INDEX_NAME,
            "path": "plot",
            "query": "a story about growing up",
            "numCandidates": 100,
            "limit": 3
        }
    },
    {
        "$project": {
            "_id": 0,
            "title": 1,
            "plot": 1,
            "score": { "$meta": "vectorSearchScore" }
        }
    }
]))
print_results(results)

# Run filtered semantic query
print("\nFiltered query: 'a story about growing up' + Drama only")
results = list(collection.aggregate([
    {
        "$vectorSearch": {
            "index": SEMANTIC_INDEX_NAME,
            "path": "plot",
            "query": "a story about growing up",
            "filter": { "genres": { "$eq": "Drama" } },
            "numCandidates": 150,
            "limit": 3
        }
    },
    {
        "$project": {
            "_id": 0,
            "title": 1,
            "genres": 1,
            "score": { "$meta": "vectorSearchScore" }
        }
    }
]))
print_results(results, fields=["title", "genres"])

# ─────────────────────────────────────────────────────────────
# 2. CREATE TEXT SEARCH INDEX (Keyword Search)
# ─────────────────────────────────────────────────────────────
print("\n── KEYWORD SEARCH (Atlas Search) ─────────────────────")
print("Creating text search index on 'title', 'plot', 'genres'...")

text_definition = {
    "mappings": {
        "dynamic": False,
        "fields": {
            "title": { "type": "string" },
            "plot": { "type": "string" },
            "genres": { "type": "token" }
        }
    }
}

ensure_index(
    SearchIndexModel(
        definition=text_definition,
        name=TEXT_INDEX_NAME
    ),
    TEXT_INDEX_NAME,
    text_definition
)

# Run keyword query
print("\nKeyword query: 'space adventure'")
results = list(collection.aggregate([
    {
        "$search": {
            "index": TEXT_INDEX_NAME,
            "text": {
                "query": "space adventure",
                "path": ["title", "plot"]
            }
        }
    },
    {
        "$project": {
            "_id": 0,
            "title": 1,
            "plot": 1,
            "score": { "$meta": "searchScore" }
        }
    },
    { "$limit": 3 }
]))
print_results(results)

# Run fuzzy query
print("\nFuzzy query: 'sapce adventre' (intentional typos)")
results = list(collection.aggregate([
    {
        "$search": {
            "index": TEXT_INDEX_NAME,
            "text": {
                "query": "sapce adventre",
                "path": ["title", "plot"],
                "fuzzy": { "maxEdits": 1 }
            }
        }
    },
    {
        "$project": {
            "_id": 0,
            "title": 1,
            "score": { "$meta": "searchScore" }
        }
    },
    { "$limit": 3 }
]))
print_results(results, fields=["title"])

# Autocomplete needs 'title' typed as autocomplete, which the text index does
# not provide. Use a dedicated index, matching the walkthrough's MCP route.
print("\nCreating autocomplete index on 'title'...")

autocomplete_definition = {
    "mappings": {
        "dynamic": False,
        "fields": {
            "title": { "type": "autocomplete", "tokenization": "edgeGram" }
        }
    }
}

ensure_index(
    SearchIndexModel(
        definition=autocomplete_definition,
        name=AUTOCOMPLETE_INDEX_NAME
    ),
    AUTOCOMPLETE_INDEX_NAME,
    autocomplete_definition
)

# Run autocomplete
print("\nAutocomplete query: 'inc'")
results = list(collection.aggregate([
    {
        "$search": {
            "index": AUTOCOMPLETE_INDEX_NAME,
            "autocomplete": { "query": "inc", "path": "title" }
        }
    },
    { "$project": { "_id": 0, "title": 1 } },
    { "$limit": 5 }
]))
for doc in results:
    print(f"  - {doc['title']}")

# ─────────────────────────────────────────────────────────────
# 3. HYBRID SEARCH ($rankFusion)
# ─────────────────────────────────────────────────────────────
print("\n── HYBRID SEARCH ($rankFusion) ───────────────────────")
print("Query: 'a story about growing up' (semantic 70% + keyword 30%)")

try:
    results = list(collection.aggregate([
        {
            "$rankFusion": {
                "input": {
                    "pipelines": {
                        "semanticPipeline": [
                            {
                                "$vectorSearch": {
                                    "index": SEMANTIC_INDEX_NAME,
                                    "path": "plot",
                                    "query": "a story about growing up",
                                    "numCandidates": 100,
                                    "limit": 20
                                }
                            }
                        ],
                        "keywordPipeline": [
                            {
                                "$search": {
                                    "index": TEXT_INDEX_NAME,
                                    "text": {
                                        "query": "coming of age",
                                        "path": "plot"
                                    }
                                }
                            },
                            { "$limit": 20 }
                        ]
                    }
                },
                "combination": {
                    "weights": {
                        "semanticPipeline": 0.7,
                        "keywordPipeline": 0.3
                    }
                }
            }
        },
        { "$project": { "_id": 0, "title": 1, "plot": 1 } },
        { "$limit": 5 }
    ]))
    print_results(results)
except Exception as e:
    message = str(e)
    if "Unrecognized pipeline stage name: '$rankFusion'" in message:
        print("  $rankFusion requires MongoDB 8.0+. This cluster does not"
              " support it, so hybrid search was skipped.")
    else:
        fail(f"Hybrid search query failed: {message}")

print("\n── Done! ─────────────────────────────────────────────")
print("This script targets the sample_mflix.movies schema. To use your")
print("own data, set MONGODB_URI (or MDB_MCP_CONNECTION_STRING), then")
print("change DB_NAME and COLLECTION_NAME at the top and adjust the")
print("index definitions, $project stages, and query strings to match")
print("your own field names.")

client.close()
