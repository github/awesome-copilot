# Angular Basic TypeScript Template

> A basic Angular application starter with ASP.NET Core hosting, Angular routing, HTTP services, and a clean component/service/interface structure. Suitable as a starting point for Angular SPAs with a .NET backend or as a standalone Angular project.

## License

MIT — See [source repository](https://github.com/MattJeanes/AngularBasic) for full license text.

## Source

- [MattJeanes/AngularBasic](https://github.com/MattJeanes/AngularBasic)

## Project Structure

```
AngularBasic/
├── ClientApp/                     (Angular SPA)
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/
│   │   │   │   ├── services/
│   │   │   │   │   └── item.service.ts
│   │   │   │   └── models/
│   │   │   │       └── item.model.ts
│   │   │   ├── features/
│   │   │   │   └── items/
│   │   │   │       ├── items.component.ts
│   │   │   │       ├── items.component.html
│   │   │   │       └── items.component.css
│   │   │   ├── shared/
│   │   │   │   └── components/
│   │   │   │       └── nav/
│   │   │   │           ├── nav.component.ts
│   │   │   │           └── nav.component.html
│   │   │   ├── app.component.ts
│   │   │   ├── app.component.html
│   │   │   ├── app.module.ts
│   │   │   └── app-routing.module.ts
│   │   ├── environments/
│   │   │   ├── environment.ts
│   │   │   └── environment.prod.ts
│   │   ├── index.html
│   │   ├── main.ts
│   │   └── styles.css
│   ├── angular.json
│   ├── tsconfig.json
│   ├── tsconfig.app.json
│   ├── tsconfig.spec.json
│   └── package.json
├── Controllers/                   (.NET API controllers)
│   └── ItemsController.cs
├── Program.cs
├── appsettings.json
└── AngularBasic.csproj
```

## Key Files

### `ClientApp/angular.json` (excerpt)

```json
{
  "$schema": "./node_modules/@angular/cli/lib/config/schema.json",
  "version": 1,
  "newProjectRoot": "projects",
  "projects": {
    "angular-basic": {
      "projectType": "application",
      "schematics": {
        "@schematics/angular:component": {
          "style": "css",
          "changeDetection": "OnPush"
        }
      },
      "root": "",
      "sourceRoot": "src",
      "prefix": "app",
      "architect": {
        "build": {
          "builder": "@angular-devkit/build-angular:browser",
          "options": {
            "outputPath": "dist/angular-basic",
            "index": "src/index.html",
            "main": "src/main.ts",
            "polyfills": ["zone.js"],
            "tsConfig": "tsconfig.app.json",
            "assets": ["src/favicon.ico", "src/assets"],
            "styles": ["src/styles.css"],
            "scripts": []
          },
          "configurations": {
            "production": {
              "optimization": true,
              "outputHashing": "all",
              "sourceMap": false,
              "namedChunks": false,
              "aot": true,
              "extractLicenses": true,
              "vendorChunk": false,
              "buildOptimizer": true,
              "fileReplacements": [
                {
                  "replace": "src/environments/environment.ts",
                  "with": "src/environments/environment.prod.ts"
                }
              ]
            },
            "development": {
              "optimization": false,
              "sourceMap": true,
              "namedChunks": true
            }
          },
          "defaultConfiguration": "production"
        },
        "serve": {
          "builder": "@angular-devkit/build-angular:dev-server",
          "configurations": {
            "production": { "buildTarget": "angular-basic:build:production" },
            "development": { "buildTarget": "angular-basic:build:development" }
          },
          "defaultConfiguration": "development"
        },
        "test": {
          "builder": "@angular-devkit/build-angular:karma",
          "options": {
            "polyfills": ["zone.js", "zone.js/testing"],
            "tsConfig": "tsconfig.spec.json",
            "karmaConfig": "karma.conf.js"
          }
        }
      }
    }
  }
}
```

### `ClientApp/tsconfig.json`

```json
{
  "compileOnSave": false,
  "compilerOptions": {
    "baseUrl": "./",
    "outDir": "./dist/out-tsc",
    "strict": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "sourceMap": true,
    "declaration": false,
    "downlevelIteration": true,
    "experimentalDecorators": true,
    "moduleResolution": "Node",
    "importHelpers": true,
    "target": "ES2022",
    "module": "ES2022",
    "useDefineForClassFields": false,
    "lib": ["ES2022", "dom"]
  },
  "angularCompilerOptions": {
    "enableI18nLegacyMessageIdFormat": false,
    "strictInjectionParameters": true,
    "strictInputAccessModifiers": true,
    "strictTemplates": true
  }
}
```

### `ClientApp/tsconfig.app.json`

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "./out-tsc/app",
    "types": []
  },
  "files": ["src/main.ts"],
  "include": ["src/**/*.d.ts"]
}
```

### `ClientApp/package.json`

```json
{
  "name": "angular-basic",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "ng": "ng",
    "start": "ng serve",
    "build": "ng build",
    "watch": "ng build --watch --configuration development",
    "test": "ng test",
    "lint": "ng lint"
  },
  "dependencies": {
    "@angular/animations": "^17.3.0",
    "@angular/common": "^17.3.0",
    "@angular/compiler": "^17.3.0",
    "@angular/core": "^17.3.0",
    "@angular/forms": "^17.3.0",
    "@angular/platform-browser": "^17.3.0",
    "@angular/platform-browser-dynamic": "^17.3.0",
    "@angular/router": "^17.3.0",
    "rxjs": "~7.8.0",
    "tslib": "^2.6.0",
    "zone.js": "~0.14.0"
  },
  "devDependencies": {
    "@angular-devkit/build-angular": "^17.3.0",
    "@angular/cli": "^17.3.0",
    "@angular/compiler-cli": "^17.3.0",
    "@types/jasmine": "~5.1.0",
    "jasmine-core": "~5.1.0",
    "karma": "~6.4.0",
    "karma-chrome-launcher": "~3.2.0",
    "karma-coverage": "~2.2.0",
    "karma-jasmine": "~5.1.0",
    "karma-jasmine-html-reporter": "~2.1.0",
    "typescript": "~5.4.0"
  }
}
```

### `ClientApp/src/app/app.module.ts`

```typescript
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ItemsComponent } from './features/items/items.component';
import { NavComponent } from './shared/components/nav/nav.component';

@NgModule({
  declarations: [AppComponent, NavComponent, ItemsComponent],
  imports: [BrowserModule, HttpClientModule, AppRoutingModule],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
```

### `ClientApp/src/app/app-routing.module.ts`

```typescript
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ItemsComponent } from './features/items/items.component';

const routes: Routes = [
  { path: '', redirectTo: '/items', pathMatch: 'full' },
  { path: 'items', component: ItemsComponent },
  { path: '**', redirectTo: '/items' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
```

### `ClientApp/src/app/core/models/item.model.ts`

```typescript
export interface Item {
  id: number;
  name: string;
  description: string;
  createdAt: string;
  isActive: boolean;
}

export interface CreateItemRequest {
  name: string;
  description: string;
}

export interface UpdateItemRequest {
  name?: string;
  description?: string;
  isActive?: boolean;
}
```

### `ClientApp/src/app/core/services/item.service.ts`

```typescript
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import type { CreateItemRequest, Item, UpdateItemRequest } from '../models/item.model';

@Injectable({ providedIn: 'root' })
export class ItemService {
  private readonly apiUrl = '/api/items';

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<Item[]> {
    return this.http.get<Item[]>(this.apiUrl).pipe(catchError(this.handleError));
  }

  getById(id: number): Observable<Item> {
    return this.http.get<Item>(`${this.apiUrl}/${id}`).pipe(catchError(this.handleError));
  }

  create(request: CreateItemRequest): Observable<Item> {
    return this.http.post<Item>(this.apiUrl, request).pipe(catchError(this.handleError));
  }

  update(id: number, request: UpdateItemRequest): Observable<Item> {
    return this.http.put<Item>(`${this.apiUrl}/${id}`, request).pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    const message =
      error.status === 0
        ? `Network error: ${error.error?.message ?? 'Unknown'}`
        : `Server error ${error.status}: ${error.message}`;
    console.error(message);
    return throwError(() => new Error(message));
  }
}
```

### `ClientApp/src/app/features/items/items.component.ts`

```typescript
import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';
import type { Item } from '../../core/models/item.model';
import { ItemService } from '../../core/services/item.service';

@Component({
  selector: 'app-items',
  templateUrl: './items.component.html',
  styleUrls: ['./items.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemsComponent implements OnInit {
  items$!: Observable<Item[]>;
  error: string | null = null;

  constructor(private readonly itemService: ItemService) {}

  ngOnInit(): void {
    this.loadItems();
  }

  loadItems(): void {
    this.items$ = this.itemService.getAll().pipe(
      catchError((err: Error) => {
        this.error = err.message;
        return of([]);
      })
    );
  }

  trackById(_index: number, item: Item): number {
    return item.id;
  }
}
```

### `ClientApp/src/app/features/items/items.component.html`

```html
<div class="items-container">
  <h2>Items</h2>

  <div *ngIf="error" class="error-message" role="alert">
    {{ error }}
  </div>

  <ng-container *ngIf="items$ | async as items; else loading">
    <p *ngIf="items.length === 0">No items found.</p>
    <ul *ngIf="items.length > 0">
      <li *ngFor="let item of items; trackBy: trackById">
        <strong>{{ item.name }}</strong>
        <span class="description">{{ item.description }}</span>
        <span class="badge" [class.active]="item.isActive">
          {{ item.isActive ? 'Active' : 'Inactive' }}
        </span>
      </li>
    </ul>
  </ng-container>

  <ng-template #loading>
    <p>Loading…</p>
  </ng-template>
</div>
```

### `ClientApp/src/environments/environment.ts`

```typescript
export const environment = {
  production: false,
  apiBaseUrl: 'https://localhost:5001',
};
```

## Getting Started

```bash
# Prerequisites: Node.js 18+, Angular CLI 17+

# 1. Navigate to the ClientApp directory
cd ClientApp

# 2. Install Angular dependencies
npm install

# 3. Serve the Angular app (standalone, without .NET backend)
npm start
# Opens at http://localhost:4200

# 4. Build for production
npm run build
# Output goes to dist/angular-basic/

# (Optional) With .NET backend
# Restore and run from the project root
# dotnet restore
# dotnet run
```

## Features

- Angular 17 with `OnPush` change detection strategy for performance
- `HttpClient`-based service with typed `Observable<T>` returns and centralised error handling
- `AsyncPipe` in templates to automatically subscribe and unsubscribe from Observables
- Standalone `AppRoutingModule` with lazy-loadable route structure
- Strict Angular template type-checking via `strictTemplates: true`
- Interface-driven data models (`Item`, `CreateItemRequest`, `UpdateItemRequest`)
- Environment configuration files for development and production API URLs
- ASP.NET Core backend integration with a `/api/items` REST controller
