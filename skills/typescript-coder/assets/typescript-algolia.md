# TypeScript Algolia Integration Template

> A TypeScript project template for integrating Algolia search into an application. Covers
> search client setup, index management, record indexing, and query construction using the
> official `algoliasearch` SDK and InstantSearch utilities.

## License

The Algolia JavaScript SDK (`algoliasearch`) is distributed under the MIT License.
See the [algoliasearch npm package](https://www.npmjs.com/package/algoliasearch) and
[Algolia GitHub repositories](https://github.com/algolia) for full license terms.

## Source

- [Algolia JavaScript API Client](https://github.com/algolia/algoliasearch-client-javascript)
- [Algolia InstantSearch.js](https://github.com/algolia/instantsearch)
- [Algolia Documentation](https://www.algolia.com/doc/)

## Project Structure

```
my-algolia-app/
├── src/
│   ├── client/
│   │   └── algoliaClient.ts       # Initialized search client singleton
│   ├── indexing/
│   │   ├── indexManager.ts        # Create, configure, and delete indices
│   │   └── recordUploader.ts      # Batch upload / save objects
│   ├── search/
│   │   ├── searchService.ts       # Query builder and search execution
│   │   └── facetService.ts        # Faceted search helpers
│   ├── types/
│   │   └── algolia.types.ts       # Shared TypeScript interfaces
│   └── index.ts                   # Entry point / demo runner
├── .env                           # ALGOLIA_APP_ID, ALGOLIA_API_KEY
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

## Key Files

### `package.json`

```json
{
  "name": "my-algolia-app",
  "version": "1.0.0",
  "description": "TypeScript project with Algolia search integration",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "dev": "ts-node src/index.ts",
    "start": "node dist/index.js",
    "lint": "eslint 'src/**/*.ts'",
    "test": "jest --coverage",
    "index:upload": "ts-node src/indexing/recordUploader.ts",
    "clean": "rimraf dist"
  },
  "dependencies": {
    "algoliasearch": "^5.0.0",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "eslint": "^8.56.0",
    "jest": "^29.7.0",
    "rimraf": "^5.0.5",
    "ts-jest": "^29.1.2",
    "ts-node": "^10.9.2",
    "typescript": "^5.3.3"
  }
}
```

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

### `src/types/algolia.types.ts`

```typescript
export interface ProductRecord {
  objectID: string;
  name: string;
  description: string;
  price: number;
  category: string;
  brand: string;
  rating: number;
  inStock: boolean;
  tags: string[];
  image?: string;
  _highlightResult?: AlgoliaHighlightResult;
}

export interface AlgoliaHighlightResult {
  [key: string]: {
    value: string;
    matchLevel: 'none' | 'partial' | 'full';
    matchedWords: string[];
  };
}

export interface SearchParams {
  query: string;
  page?: number;
  hitsPerPage?: number;
  filters?: string;
  facets?: string[];
  facetFilters?: string | string[][];
  numericFilters?: string[];
  attributesToRetrieve?: string[];
  attributesToHighlight?: string[];
}

export interface SearchResult<T> {
  hits: T[];
  nbHits: number;
  page: number;
  nbPages: number;
  hitsPerPage: number;
  processingTimeMS: number;
  query: string;
  facets?: Record<string, Record<string, number>>;
}

export interface IndexSettings {
  searchableAttributes?: string[];
  attributesForFaceting?: string[];
  customRanking?: string[];
  ranking?: string[];
  highlightPreTag?: string;
  highlightPostTag?: string;
  hitsPerPage?: number;
  maxValuesPerFacet?: number;
  typoTolerance?: boolean | 'min' | 'strict';
}
```

### `src/client/algoliaClient.ts`

```typescript
import { algoliasearch, SearchClient } from 'algoliasearch';
import * as dotenv from 'dotenv';

dotenv.config();

const APP_ID = process.env.ALGOLIA_APP_ID;
const API_KEY = process.env.ALGOLIA_API_KEY;

if (!APP_ID || !API_KEY) {
  throw new Error(
    'Missing required environment variables: ALGOLIA_APP_ID and ALGOLIA_API_KEY'
  );
}

let clientInstance: SearchClient | null = null;

export function getAlgoliaClient(): SearchClient {
  if (!clientInstance) {
    clientInstance = algoliasearch(APP_ID, API_KEY);
  }
  return clientInstance;
}

export const SEARCH_APP_ID = APP_ID;
```

### `src/indexing/indexManager.ts`

```typescript
import { getAlgoliaClient } from '../client/algoliaClient';
import { IndexSettings } from '../types/algolia.types';

export async function configureIndex(
  indexName: string,
  settings: IndexSettings
): Promise<void> {
  const client = getAlgoliaClient();

  await client.setSettings({
    indexName,
    indexSettings: {
      searchableAttributes: settings.searchableAttributes ?? [
        'name',
        'description',
        'brand',
        'tags',
      ],
      attributesForFaceting: settings.attributesForFaceting ?? [
        'filterOnly(category)',
        'filterOnly(brand)',
        'price',
        'rating',
      ],
      customRanking: settings.customRanking ?? [
        'desc(rating)',
        'asc(price)',
      ],
      ranking: settings.ranking ?? [
        'typo',
        'geo',
        'words',
        'filters',
        'proximity',
        'attribute',
        'exact',
        'custom',
      ],
      highlightPreTag: settings.highlightPreTag ?? '<em>',
      highlightPostTag: settings.highlightPostTag ?? '</em>',
      hitsPerPage: settings.hitsPerPage ?? 20,
      maxValuesPerFacet: settings.maxValuesPerFacet ?? 100,
    },
  });

  console.log(`Index "${indexName}" configured successfully.`);
}

export async function clearIndex(indexName: string): Promise<void> {
  const client = getAlgoliaClient();
  await client.clearObjects({ indexName });
  console.log(`Index "${indexName}" cleared.`);
}

export async function deleteIndex(indexName: string): Promise<void> {
  const client = getAlgoliaClient();
  await client.deleteIndex({ indexName });
  console.log(`Index "${indexName}" deleted.`);
}
```

### `src/indexing/recordUploader.ts`

```typescript
import { getAlgoliaClient } from '../client/algoliaClient';
import { ProductRecord } from '../types/algolia.types';

const INDEX_NAME = process.env.ALGOLIA_INDEX_NAME ?? 'products';

const sampleProducts: ProductRecord[] = [
  {
    objectID: 'prod-001',
    name: 'Wireless Noise-Cancelling Headphones',
    description: 'Over-ear headphones with 30-hour battery and active noise cancellation.',
    price: 299.99,
    category: 'Electronics',
    brand: 'AudioTech',
    rating: 4.7,
    inStock: true,
    tags: ['headphones', 'wireless', 'noise-cancelling', 'audio'],
  },
  {
    objectID: 'prod-002',
    name: 'Mechanical Keyboard TKL',
    description: 'Tenkeyless mechanical keyboard with Cherry MX Blue switches.',
    price: 129.99,
    category: 'Peripherals',
    brand: 'KeyMaster',
    rating: 4.5,
    inStock: true,
    tags: ['keyboard', 'mechanical', 'tkl', 'gaming'],
  },
];

export async function uploadRecords(
  records: ProductRecord[],
  indexName: string = INDEX_NAME
): Promise<void> {
  const client = getAlgoliaClient();

  const { taskID } = await client.saveObjects({
    indexName,
    objects: records,
  });

  await client.waitForTask({ indexName, taskID });
  console.log(`Uploaded ${records.length} records to "${indexName}".`);
}

export async function deleteRecord(
  objectID: string,
  indexName: string = INDEX_NAME
): Promise<void> {
  const client = getAlgoliaClient();

  const { taskID } = await client.deleteObject({ indexName, objectID });
  await client.waitForTask({ indexName, taskID });
  console.log(`Deleted record "${objectID}" from "${indexName}".`);
}

// Run directly: ts-node src/indexing/recordUploader.ts
if (require.main === module) {
  uploadRecords(sampleProducts).catch(console.error);
}
```

### `src/search/searchService.ts`

```typescript
import { getAlgoliaClient } from '../client/algoliaClient';
import { ProductRecord, SearchParams, SearchResult } from '../types/algolia.types';

const INDEX_NAME = process.env.ALGOLIA_INDEX_NAME ?? 'products';

export async function searchProducts(
  params: SearchParams,
  indexName: string = INDEX_NAME
): Promise<SearchResult<ProductRecord>> {
  const client = getAlgoliaClient();

  const response = await client.searchSingleIndex<ProductRecord>({
    indexName,
    searchParams: {
      query: params.query,
      page: params.page ?? 0,
      hitsPerPage: params.hitsPerPage ?? 20,
      filters: params.filters,
      facets: params.facets,
      facetFilters: params.facetFilters,
      numericFilters: params.numericFilters,
      attributesToRetrieve: params.attributesToRetrieve,
      attributesToHighlight: params.attributesToHighlight ?? ['name', 'description'],
    },
  });

  return {
    hits: response.hits,
    nbHits: response.nbHits ?? 0,
    page: response.page ?? 0,
    nbPages: response.nbPages ?? 0,
    hitsPerPage: response.hitsPerPage ?? 20,
    processingTimeMS: response.processingTimeMS,
    query: response.query,
    facets: response.facets,
  };
}

export async function multiIndexSearch(
  queries: Array<{ indexName: string; query: string; hitsPerPage?: number }>
): Promise<Array<SearchResult<ProductRecord>>> {
  const client = getAlgoliaClient();

  const response = await client.search<ProductRecord>({
    requests: queries.map((q) => ({
      indexName: q.indexName,
      query: q.query,
      hitsPerPage: q.hitsPerPage ?? 5,
    })),
  });

  return response.results.map((result) => {
    if ('hits' in result) {
      return {
        hits: result.hits,
        nbHits: result.nbHits ?? 0,
        page: result.page ?? 0,
        nbPages: result.nbPages ?? 0,
        hitsPerPage: result.hitsPerPage ?? 5,
        processingTimeMS: result.processingTimeMS,
        query: result.query,
      };
    }
    throw new Error('Unexpected search result type');
  });
}
```

### `src/search/facetService.ts`

```typescript
import { getAlgoliaClient } from '../client/algoliaClient';

const INDEX_NAME = process.env.ALGOLIA_INDEX_NAME ?? 'products';

export async function searchForFacetValues(
  facetName: string,
  facetQuery: string,
  indexName: string = INDEX_NAME
): Promise<Array<{ value: string; count: number }>> {
  const client = getAlgoliaClient();

  const response = await client.searchForFacetValues({
    indexName,
    facetName,
    searchForFacetValuesParams: { facetQuery },
  });

  return response.facetHits.map((hit) => ({
    value: hit.value,
    count: hit.count,
  }));
}

export function buildPriceRangeFilter(min: number, max: number): string {
  return `price >= ${min} AND price <= ${max}`;
}

export function buildCategoryFilter(categories: string[]): string {
  return categories.map((c) => `category:"${c}"`).join(' OR ');
}

export function buildInStockFilter(): string {
  return 'inStock:true';
}
```

### `src/index.ts`

```typescript
import * as dotenv from 'dotenv';
dotenv.config();

import { configureIndex } from './indexing/indexManager';
import { uploadRecords } from './indexing/recordUploader';
import { searchProducts } from './search/searchService';
import { buildCategoryFilter, buildPriceRangeFilter } from './search/facetService';
import { ProductRecord } from './types/algolia.types';

const INDEX_NAME = process.env.ALGOLIA_INDEX_NAME ?? 'products';

const sampleRecords: ProductRecord[] = [
  {
    objectID: 'prod-001',
    name: 'Wireless Noise-Cancelling Headphones',
    description: 'Over-ear headphones with 30-hour battery.',
    price: 299.99,
    category: 'Electronics',
    brand: 'AudioTech',
    rating: 4.7,
    inStock: true,
    tags: ['headphones', 'wireless'],
  },
  {
    objectID: 'prod-002',
    name: 'Mechanical Keyboard TKL',
    description: 'Tenkeyless keyboard with Cherry MX switches.',
    price: 129.99,
    category: 'Peripherals',
    brand: 'KeyMaster',
    rating: 4.5,
    inStock: true,
    tags: ['keyboard', 'mechanical'],
  },
];

async function main(): Promise<void> {
  // 1. Configure index settings
  await configureIndex(INDEX_NAME, {
    searchableAttributes: ['name', 'description', 'brand', 'tags'],
    attributesForFaceting: ['category', 'brand', 'price', 'rating'],
    hitsPerPage: 20,
  });

  // 2. Upload records
  await uploadRecords(sampleRecords, INDEX_NAME);

  // 3. Basic search
  const basicResults = await searchProducts({ query: 'headphones' });
  console.log('Basic search results:', basicResults.hits.length, 'hits');

  // 4. Filtered search
  const filteredResults = await searchProducts({
    query: 'keyboard',
    filters: buildPriceRangeFilter(50, 200),
    facets: ['category', 'brand'],
  });
  console.log('Filtered search results:', filteredResults.hits.length, 'hits');

  // 5. Category search
  const categoryResults = await searchProducts({
    query: '',
    filters: buildCategoryFilter(['Electronics', 'Peripherals']),
  });
  console.log('Category search results:', categoryResults.hits.length, 'hits');
}

main().catch(console.error);
```

### `.env.example`

```
ALGOLIA_APP_ID=YOUR_APP_ID
ALGOLIA_API_KEY=YOUR_ADMIN_API_KEY
ALGOLIA_SEARCH_ONLY_API_KEY=YOUR_SEARCH_ONLY_API_KEY
ALGOLIA_INDEX_NAME=products
```

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Copy environment file and fill in your Algolia credentials
cp .env.example .env

# 3. Run the demo (configure index, upload sample data, run queries)
npm run dev

# 4. Build for production
npm run build
npm start
```

## Features

- Singleton Algolia client with environment-based configuration
- Index configuration: searchable attributes, faceting, custom ranking
- Batch record upload with task completion waiting
- Single-index and multi-index search
- Filter builders for price ranges, categories, and stock status
- Facet value search helpers
- Strongly typed records and search results using TypeScript interfaces
- Full `strict` TypeScript compilation with source maps
