# TypeScript Gulp + Angular Project Template (Modernized)

> A modernized TypeScript project starter inspired by `generator-gulp-angular`. The original generator targeted Angular 1.x (AngularJS) with Gulp 3; this template updates the approach for Angular 17+ and TypeScript 5.x while preserving the Gulp task-runner philosophy for builds, serving, and asset pipelines.

## License

MIT License — See source repository for full license terms.

> Note: The original `swiip/generator-gulp-angular` generator is no longer actively maintained and targeted AngularJS (Angular 1.x). This template modernises its patterns for current Angular and TypeScript.

## Source

- [swiip/generator-gulp-angular](https://github.com/swiip/generator-gulp-angular) (original, AngularJS era)

## Project Structure

```
my-gulp-angular-app/
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   └── hero-card/
│   │   │       ├── hero-card.component.ts
│   │   │       ├── hero-card.component.html
│   │   │       └── hero-card.component.css
│   │   ├── services/
│   │   │   └── hero.service.ts
│   │   ├── models/
│   │   │   └── hero.model.ts
│   │   ├── app.component.ts
│   │   ├── app.component.html
│   │   ├── app.module.ts
│   │   └── app-routing.module.ts
│   ├── assets/
│   │   └── images/
│   ├── environments/
│   │   ├── environment.ts
│   │   └── environment.prod.ts
│   ├── styles/
│   │   ├── _variables.css
│   │   └── main.css
│   ├── index.html
│   └── main.ts
├── tests/
│   └── hero-card.component.spec.ts
├── dist/                   ← Gulp build output
├── .eslintrc.json
├── .gitignore
├── gulpfile.ts
├── karma.conf.js
├── package.json
└── tsconfig.json
```

## Key Files

### `package.json`

```json
{
  "name": "my-gulp-angular-app",
  "version": "1.0.0",
  "description": "Angular 17 + TypeScript application with Gulp build pipeline",
  "scripts": {
    "start": "gulp serve",
    "build": "gulp build",
    "build:prod": "gulp build --env=production",
    "test": "gulp test",
    "lint": "eslint src --ext .ts",
    "clean": "gulp clean"
  },
  "dependencies": {
    "@angular/animations": "^17.0.0",
    "@angular/common": "^17.0.0",
    "@angular/compiler": "^17.0.0",
    "@angular/core": "^17.0.0",
    "@angular/forms": "^17.0.0",
    "@angular/platform-browser": "^17.0.0",
    "@angular/platform-browser-dynamic": "^17.0.0",
    "@angular/router": "^17.0.0",
    "rxjs": "^7.8.1",
    "tslib": "^2.6.2",
    "zone.js": "^0.14.2"
  },
  "devDependencies": {
    "@angular-devkit/build-angular": "^17.0.0",
    "@angular/cli": "^17.0.0",
    "@angular/compiler-cli": "^17.0.0",
    "@types/jasmine": "^5.1.1",
    "@types/node": "^20.8.10",
    "@typescript-eslint/eslint-plugin": "^6.9.1",
    "@typescript-eslint/parser": "^6.9.1",
    "browser-sync": "^3.0.2",
    "del": "^7.1.0",
    "eslint": "^8.52.0",
    "eslint-plugin-angular": "^4.1.0",
    "fancy-log": "^2.0.0",
    "gulp": "^5.0.0",
    "gulp-clean-css": "^4.3.0",
    "gulp-concat": "^2.6.0",
    "gulp-htmlmin": "^5.0.1",
    "gulp-if": "^3.0.0",
    "gulp-rev": "^10.0.0",
    "gulp-sourcemaps": "^3.0.0",
    "gulp-typescript": "^6.0.0-alpha.1",
    "gulp-uglify": "^3.0.2",
    "jasmine-core": "^5.1.1",
    "karma": "^6.4.2",
    "karma-chrome-launcher": "^3.2.0",
    "karma-jasmine": "^5.1.0",
    "typescript": "^5.2.2"
  }
}
```

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM"],
    "useDefineForClassFields": false,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "strict": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "sourceMap": true,
    "declaration": false,
    "outDir": "dist/app",
    "baseUrl": "src"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

### `gulpfile.ts`

```typescript
import gulp from "gulp";
import ts from "gulp-typescript";
import cleanCSS from "gulp-clean-css";
import htmlmin from "gulp-htmlmin";
import sourcemaps from "gulp-sourcemaps";
import browserSync from "browser-sync";
import { deleteAsync } from "del";

const bs = browserSync.create();
const tsProject = ts.createProject("tsconfig.json");

const paths = {
  ts: "src/**/*.ts",
  html: ["src/**/*.html", "src/index.html"],
  css: "src/**/*.css",
  assets: "src/assets/**/*",
  dist: "dist/",
};

// --- Clean ---
export async function clean(): Promise<void> {
  await deleteAsync([paths.dist]);
}

// --- TypeScript ---
export function scripts(): NodeJS.ReadWriteStream {
  return gulp
    .src(paths.ts)
    .pipe(sourcemaps.init())
    .pipe(tsProject())
    .js.pipe(sourcemaps.write("."))
    .pipe(gulp.dest(paths.dist))
    .pipe(bs.stream());
}

// --- CSS ---
export function styles(): NodeJS.ReadWriteStream {
  return gulp
    .src(paths.css)
    .pipe(sourcemaps.init())
    .pipe(cleanCSS({ compatibility: "ie11" }))
    .pipe(sourcemaps.write("."))
    .pipe(gulp.dest(paths.dist + "styles/"))
    .pipe(bs.stream());
}

// --- HTML ---
export function templates(): NodeJS.ReadWriteStream {
  return gulp
    .src(paths.html)
    .pipe(htmlmin({ collapseWhitespace: true, removeComments: true }))
    .pipe(gulp.dest(paths.dist))
    .pipe(bs.stream());
}

// --- Assets ---
export function assets(): NodeJS.ReadWriteStream {
  return gulp.src(paths.assets).pipe(gulp.dest(paths.dist + "assets/"));
}

// --- Dev server ---
export function serve(done: () => void): void {
  bs.init({ server: { baseDir: paths.dist }, port: 4200, open: false });
  done();
}

// --- Watch ---
export function watchFiles(): void {
  gulp.watch(paths.ts, scripts);
  gulp.watch(paths.css, styles);
  gulp.watch(paths.html, templates);
  gulp.watch(paths.assets, assets);
}

// --- Composite tasks ---
export const build = gulp.series(
  clean,
  gulp.parallel(scripts, styles, templates, assets)
);

export default gulp.series(
  build,
  serve,
  watchFiles
);
```

### `src/app/models/hero.model.ts`

```typescript
export interface Hero {
  id: number;
  name: string;
  power: string;
  alterEgo?: string;
}
```

### `src/app/services/hero.service.ts`

```typescript
import { Injectable } from "@angular/core";
import { Observable, of } from "rxjs";
import { Hero } from "../models/hero.model";

@Injectable({
  providedIn: "root",
})
export class HeroService {
  private heroes: Hero[] = [
    { id: 1, name: "Windstorm", power: "Meteorology" },
    { id: 2, name: "Bombasto", power: "Super Strength", alterEgo: "Bob" },
    { id: 3, name: "Magneta", power: "Magnetism" },
  ];

  getHeroes(): Observable<Hero[]> {
    return of(this.heroes);
  }

  getHero(id: number): Observable<Hero | undefined> {
    return of(this.heroes.find((h) => h.id === id));
  }
}
```

### `src/app/components/hero-card/hero-card.component.ts`

```typescript
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Hero } from "../../models/hero.model";

@Component({
  selector: "app-hero-card",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./hero-card.component.html",
  styleUrls: ["./hero-card.component.css"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroCardComponent {
  @Input({ required: true }) hero!: Hero;
  @Output() selected = new EventEmitter<Hero>();

  onSelect(): void {
    this.selected.emit(this.hero);
  }
}
```

### `src/app/components/hero-card/hero-card.component.html`

```html
<div class="hero-card" (click)="onSelect()">
  <h3>{{ hero.name }}</h3>
  <p class="power">Power: {{ hero.power }}</p>
  <p class="alter-ego" *ngIf="hero.alterEgo">Alter Ego: {{ hero.alterEgo }}</p>
</div>
```

### `src/app/app.module.ts`

```typescript
import { NgModule } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";
import { AppRoutingModule } from "./app-routing.module";
import { AppComponent } from "./app.component";

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, AppRoutingModule],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
```

### `src/environments/environment.ts`

```typescript
export const environment = {
  production: false,
  apiUrl: "http://localhost:3000/api",
};
```

### `src/environments/environment.prod.ts`

```typescript
export const environment = {
  production: true,
  apiUrl: "https://api.my-app.com",
};
```

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server with Gulp (compiles TS, serves with BrowserSync, watches for changes):
   ```bash
   npm start
   ```
   The app will be available at `http://localhost:4200`.
3. Build for production:
   ```bash
   npm run build:prod
   ```
4. Run tests with Karma/Jasmine:
   ```bash
   npm test
   ```

## Features

- Angular 17 with standalone components and `ChangeDetectionStrategy.OnPush`
- TypeScript 5.x with strict mode and Angular decorator support
- Gulp 5 build pipeline replacing the Angular CLI build tooling
- BrowserSync for live-reloading development server
- CSS minification via `gulp-clean-css`
- HTML minification via `gulp-htmlmin`
- TypeScript compilation via `gulp-typescript`
- Source maps in development for debuggable compiled output
- Environment-specific configuration files (`environment.ts` / `environment.prod.ts`)
- Modular component structure with standalone component pattern
- RxJS 7 Observable-based service layer
