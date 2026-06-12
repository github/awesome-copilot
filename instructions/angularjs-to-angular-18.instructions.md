---
description: 'Migrate AngularJS 1.x to Angular 18: incremental ngUpgrade hybrid as the default path, with standalone-default components, signals, control flow (@if/@for/@switch), deferrable views, function-based interceptors and guards, provideHttpClient + provideRouter, inject(), typed reactive forms, and Vitest as the Angular 18 target. AngularJS 1.x is EOL since Dec 31 2021 with unpatched CVE-2024-21490 (ReDoS in ng-srcset). Catches 62 LLM regressions in three modes: (A) AngularJS 1.x patterns emitted for plain Angular requests, (B) Angular 2-17 legacy idioms emitted instead of Angular 18, (C) migration-specific mistakes (big-bang advice without ngUpgrade, literal $rootScope.$broadcast ports, missing downgradeInjectable, wrong bootstrap order). Pair with HeroDevs NES or OpenLogic if a freeze prevents migration.'
applyTo: '**/*.ts, **/*.js, **/*.html, **/*.scss, **/*.css, angular.json, package.json, **/*.spec.ts'
---

# AngularJS to Angular 18 Migration

## Context: why this matters

AngularJS 1.x exited Long-Term Support on **December 31, 2021**. From January 1, 2022 Google stopped shipping security fixes, browser-compatibility fixes, and jQuery-compatibility fixes. A README-only release (v1.8.3, "ultimate-farewell", April 7, 2022) is the final official version; the substantive code freeze is v1.8.2 (October 2020). Every CVE filed against AngularJS after January 2022 is, by definition, unpatched upstream. The most-cited live vulnerability is **CVE-2024-21490**, a Regular Expression Denial of Service in the `ng-srcset` directive affecting every AngularJS release from 1.3.0 through 1.8.3; the only fixed builds are the commercial HeroDevs NES forks (`1.5.19`, `1.9.3` and later). Source: [HeroDevs CVE-2024-21490 advisory](https://www.herodevs.com/blog-posts/addressing-the-latest-angularjs-cve-2024-21490), [endoflife.date / AngularJS](https://endoflife.date/angularjs).

Two named vendors sell commercial extended support in 2026: **HeroDevs Never-Ending Support** (originally XLTS.dev, merged September 2023; public customers include Google, Microsoft, GE, Capital One; listed on Azure Marketplace) and **OpenLogic by Perforce**. The US Department of Homeland Security Customs and Border Protection awarded HeroDevs an AngularJS support task order, which is the cleanest public proof that regulated federal infrastructure is paying commercial rates to not migrate. There is no free or community-supported AngularJS LTS. The only economically rational options for a regulated org are: (a) pay HeroDevs or OpenLogic, or (b) migrate. Source: [HeroDevs AngularJS NES](https://www.herodevs.com/support/nes-angularjs), [OpenLogic AngularJS Long-Term Support](https://www.openlogic.com/solutions/angularjs-support-and-services).

LLM-assisted migration is where this instructions file earns its keep. HeroDevs reports that **73% of AI-assisted AngularJS migrations fall behind schedule**, citing the gap between training corpora (largely Angular 12 and earlier) and modern Angular 18 patterns. GitHub Copilot's own public issue tracker corroborates the mechanism: [vscode-copilot-release#1019](https://github.com/microsoft/vscode-copilot-release/issues/1019) and [vscode-copilot-release#1128](https://github.com/microsoft/vscode-copilot-release/issues/1128) track "Copilot does not know about Angular 17" complaints. The Angular team ships [llms.txt and llms-full.txt](https://angular.dev/ai/develop-with-ai) on angular.dev as official AI-context hints because the problem is systemic. This file pins the Angular 18 patterns the model must emit and the 62 anti-patterns it must refuse. Source: [HeroDevs: Why 73% of AI-assisted AngularJS migrations fall behind](https://www.herodevs.com/blog-posts/why-73-of-ai-assisted-angularjs-migrations-fall-behind-schedule).

## Migration target: Angular 18 canonical patterns

Angular 18 shipped on **May 22, 2024**. The major stabilised signals, control flow (`@if` / `@for` / `@switch`), and deferrable views (`@defer`); deprecated `HttpClientModule` and class-based interceptors; and shipped zoneless change detection as a developer preview. The migration target rule of thumb: **write everything as if you were starting on Angular 19**, accepting that a few defaults (`standalone: true`, NgModule deprecation) only became the default in v19 but were the recommended pattern in v18. Source: [Angular v18 announcement](https://blog.angular.dev/angular-v18-is-now-available-e79d5ac0affe).

### Standalone components default

A standalone component does not need an NgModule. It imports its own dependencies in `imports: []` and is bootstrapped via `bootstrapApplication` from `@angular/platform-browser`. The first-party schematic `ng g @angular/core:standalone` runs the conversion in three idempotent passes (components, modules, bootstrap).

```ts
import { Component, signal } from '@angular/core';
import { UserCardComponent } from './user-card.component';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [UserCardComponent],
  template: `
    @for (user of users(); track user.id) {
      <app-user-card [user]="user" />
    }
  `,
})
export class UserListComponent {
  users = signal<User[]>([]);
}
```

```ts
// main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
bootstrapApplication(AppComponent, { providers: [/* … */] });
```

Source: [Angular: Standalone migration](https://angular.dev/reference/migrations/standalone), [The future is standalone](https://blog.angular.dev/the-future-is-standalone-475d7edbc706).

### Signals (signal, computed, effect)

Signals shipped to developer preview in Angular 16 (May 2023), stabilised core APIs in v17.2, and became fully stable in v18 for the component-input / output / model / view-query surface. The Angular team recommends signals as the default reactivity primitive; RxJS stays for streams.

```ts
import { signal, computed, effect } from '@angular/core';

const count = signal(0);
const double = computed(() => count() * 2);
effect(() => console.log(count()));

count.set(5);
count.update(n => n + 1);
```

A signal is read like a function (`count()`) and written through `.set` / `.update`. `computed()` is read-only and recomputes only when its dependencies change. `effect()` re-runs when any signal it reads changes. Source: [Angular: Signals](https://angular.dev/guide/signals).

### Signal-based component I/O (input, output, model)

Decorator-based `@Input()` and `@Output()` still compile in Angular 18 but the canonical pattern is signal-based. Signal inputs automatically mark their owning OnPush component as dirty when they change.

```ts
import { Component, input, output, model } from '@angular/core';

@Component({
  selector: 'user-card',
  standalone: true,
  template: `
    <h3>{{ user().name }}</h3>
    <button (click)="remove.emit(user().id)">Remove</button>
    <input [(ngModel)]="draft" />
  `,
})
export class UserCardComponent {
  user = input.required<User>();
  remove = output<string>();
  draft = model('');
}
```

`input.required<T>()` marks the input required at the template level. `output()` returns an emitter without an `EventEmitter` allocation. `model()` is a writable signal that supports `[(prop)]` two-way binding. Source: [v18 docs: Inputs as signals](https://v18.angular.dev/guide/signals/inputs/), [Angular University: Signal Components](https://blog.angular-university.io/angular-signal-components/).

### Built-in control flow (@if / @for / @switch)

Stabilised in v18. The `@for` syntax **requires** an explicit `track` expression; the compiler warns if it is missing because rebuilding without a track key is the historical `*ngFor`-without-`trackBy` performance bug. A first-party schematic auto-converts existing `*ngIf` / `*ngFor` / `*ngSwitch` templates.

```html
@if (user(); as u) {
  <p>{{ u.name }}</p>
} @else if (loading()) {
  <p>Loading...</p>
} @else {
  <p>No user.</p>
}

@for (item of items(); track item.id; let i = $index, isFirst = $first) {
  <li>{{ i }}: {{ item.name }}</li>
} @empty {
  <li>No items.</li>
}

@switch (status()) {
  @case ('idle')    { <p>Idle</p> }
  @case ('loading') { <p>Working</p> }
  @default          { <p>Done</p> }
}
```

`@for` block locals: `$index`, `$first`, `$last`, `$even`, `$odd`, `$count`. Source: [HeroDevs: Control-flow migration schematic](https://www.herodevs.com/blog-posts/new-in-angular----control-flow-migration-schematic).

### Deferrable views (@defer)

`@defer` declaratively defers loading of a template subtree and its dependencies until a trigger fires, with `@placeholder`, `@loading`, and `@error` sub-blocks. Every dependency referenced inside a `@defer` block **must be standalone**; non-standalone declarations eagerly load anyway, defeating the purpose. Bill.com publicly reported a 50% bundle-size reduction in one app using `@defer`, cited in the v18 announcement.

```html
@defer (on viewport; prefetch on idle) {
  <heavy-chart [data]="data()" />
} @placeholder {
  <div class="skeleton"></div>
} @loading (after 100ms; minimum 1s) {
  <spinner />
} @error {
  <p>Failed to load chart.</p>
}
```

Triggers: `on idle` (default), `on viewport`, `on interaction`, `on hover`, `on immediate`, `on timer(2s)`, `when expr()`. Source: [Angular: Deferred loading with @defer](https://angular.dev/guide/templates/defer).

### HttpClient via provideHttpClient and functional interceptors

`HttpClientModule` and `HttpClientTestingModule` are **deprecated in Angular 18**. The canonical setup uses `provideHttpClient(withInterceptors([...]))` in the bootstrap providers. Interceptors are plain functions of type `HttpInterceptorFn`.

```ts
// main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './app/interceptors/auth.interceptor';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, {
  providers: [provideHttpClient(withInterceptors([authInterceptor]))],
});
```

```ts
// auth.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).token();
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;
  return next(authReq);
};
```

Functional interceptors have predictable execution order (the order in the `withInterceptors([...])` array), no class-construction ambiguity, and use `inject()` for DI. Class-based interceptors still work via `provideHttpClient(withInterceptorsFromDi())` as a migration bridge; new code should not use them. Source: [Angular: Intercepting requests and responses](https://angular.dev/guide/http/interceptors), [angular/angular#56964](https://github.com/angular/angular/issues/56964).

### inject() over constructor DI

The `inject()` function has been available since Angular 14 but became the recommended default in v18 alongside standalone components and signal inputs. It works inside standalone functions (interceptors, guards, resolvers, factories) where constructors cannot, gives more accurate types, and supports conditional / lazy injection.

```ts
import { Component, inject } from '@angular/core';
import { UserService } from './user.service';

@Component({ /* … */ })
export class UserListComponent {
  private readonly users = inject(UserService);
}
```

Constraint: `inject()` can only be called in an **injection context** (constructor, field initialiser, factory function). Calling it from `ngOnInit` or a click handler throws `NG0203`. A first-party migration schematic converts class-constructor patterns to `inject()` calls. Source: [Angular: inject() function migration](https://angular.dev/reference/migrations/inject-function).

### Routing via provideRouter and withComponentInputBinding

Standalone router setup replaces `RouterModule.forRoot(routes)` with `provideRouter(routes, ...features)`. `withComponentInputBinding()` flows route path params, matrix params, query params, route data, and resolver output into the component as inputs; with signal inputs you get a reactive value out of the box.

```ts
import { provideRouter, withComponentInputBinding, withViewTransitions, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'users/:id',
    loadComponent: () => import('./user/user.component').then(m => m.UserComponent),
    canActivate: [authGuard],
  },
];

bootstrapApplication(AppComponent, {
  providers: [provideRouter(routes, withComponentInputBinding(), withViewTransitions())],
});
```

```ts
@Component({ /* … */ })
export class UserComponent {
  id = input.required<string>(); // bound from /users/:id automatically
}
```

Precedence when multiple sources have the same key: resolvers, then data, then query params, then matrix, then path. Source: [Angular: withComponentInputBinding](https://angular.dev/api/router/withComponentInputBinding).

### Function-based guards and resolvers

Class-based `CanActivate` / `CanActivateChild` / `CanDeactivate` / `CanMatch` / `CanLoad` guards are **deprecated as of Angular 15.2**. Replace with typed functions.

```ts
import { CanActivateFn, ResolveFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { UserService } from './user.service';

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isLoggedIn() ? true : router.parseUrl('/login');
};

export const userResolver: ResolveFn<User> = (route) =>
  inject(UserService).get(route.params['id']);
```

`CanActivateFn`, `CanMatchFn`, `CanDeactivateFn`, `ResolveFn` are all exported from `@angular/router`. Source: [angular/angular#50234](https://github.com/angular/angular/issues/50234).

### Typed reactive forms (FormGroup<TInterface>)

Angular 14 introduced strictly typed reactive forms; v18 leaves the contract stable. `form.value` is `Partial<T>` (disabled controls excluded); `form.getRawValue()` is the full `T`. `fb.nonNullable.group(...)` creates controls that never emit `null` after `reset()`.

```ts
import { FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';

interface LoginForm {
  email: FormControl<string>;
  password: FormControl<string>;
  remember?: FormControl<boolean>;
}

@Component({ /* … */ })
export class LoginComponent {
  private fb = inject(FormBuilder);
  form: FormGroup<LoginForm> = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  submit() {
    if (this.form.valid) {
      const value = this.form.getRawValue(); // { email: string; password: string }
    }
  }
}
```

Source: [Angular: Strictly typed reactive forms](https://angular.dev/guide/forms/typed-forms).

### OnPush by default and zoneless dev preview

The recommendation in Angular 18 is `changeDetection: ChangeDetectionStrategy.OnPush` on every component. The RFC to make OnPush the default and deprecate `ChangeDetectionStrategy.Default` is open as [angular/angular#66779](https://github.com/angular/angular/discussions/66779). Signal writes automatically mark the consuming OnPush component for check, so the old "I changed a field but the view didn't update" trap no longer applies to signal-driven components.

```ts
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'user-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<h3>{{ user().name }}</h3>`,
})
export class UserCardComponent {
  user = input.required<User>();
}
```

Zoneless change detection landed in v18 as a developer-preview opt-in via `provideZonelessChangeDetection()` and stabilised in v20. For an Angular 18 migration target, write OnPush + signal-ready code and flip the zoneless switch later. Source: [Angular: Zoneless guide](https://angular.dev/guide/zoneless).

### DestroyRef and takeUntilDestroyed

`DestroyRef` is the modern cleanup primitive. It is injectable (so reusable cleanup logic is composable across functions) and pairs with `takeUntilDestroyed()` from `@angular/core/rxjs-interop`. Called from a constructor without an argument, `takeUntilDestroyed()` uses the component's own DestroyRef automatically.

```ts
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';

@Component({ /* … */ })
export class TickerComponent {
  constructor() {
    interval(1000)
      .pipe(takeUntilDestroyed())
      .subscribe(value => console.log(value));
  }
}
```

Source: [Angular: DestroyRef API](https://angular.dev/api/core/DestroyRef).

### toSignal and toObservable interop

`@angular/core/rxjs-interop` bridges the two reactive worlds. The "signal in, observable middle, signal out" pattern is now canonical for any reactive flow that needs RxJS operators (`debounceTime`, `switchMap`, `combineLatest`) but wants a signal at the consumer end.

```ts
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { signal } from '@angular/core';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs';

const data = toSignal(this.http.get<User[]>('/users'), { initialValue: [] });

const query = signal('');
const results = toSignal(
  toObservable(query).pipe(
    debounceTime(300),
    distinctUntilChanged(),
    switchMap(q => this.search(q)),
  ),
  { initialValue: [] },
);
```

The subscription created by `toSignal` is automatically cleaned up when the owning injection context dies. Source: [Angular: RxJS interop](https://angular.dev/ecosystem/rxjs-interop).

### Signal-based viewChild and viewChildren

Decorator queries `@ViewChild`, `@ViewChildren`, `@ContentChild`, `@ContentChildren` still work but the signal-based equivalents eliminate the `static: true` vs `static: false` decision. The signal updates as the view changes.

```ts
import { Component, viewChild, viewChildren, computed } from '@angular/core';

@Component({ /* … */ })
export class TabsComponent {
  panel = viewChild.required<TabPanelComponent>('panel');
  buttons = viewChildren<HTMLButtonElement>('btn');
  buttonCount = computed(() => this.buttons().length);

  open() {
    this.panel().show();
  }
}
```

Source: [Angular: Referencing component children with queries](https://angular.dev/guide/components/queries).

### NgOptimizedImage with ngSrc

`NgOptimizedImage` replaces raw `<img src="…">` with `<img ngSrc="…">` plus required `width` and `height` and an optional `priority` flag. Non-priority images default to `loading=lazy`; priority images get `fetchpriority=high`, `loading=eager`, and an auto-generated `<link rel="preload">` if SSR is in use. The directive emits actionable warnings if `width` / `height` are missing (CLS protection) or if the image is the LCP element and `priority` is not set.

```html
<img ngSrc="/assets/hero.jpg" width="1200" height="800" priority alt="Hero" />
<img ngSrc="/assets/thumb.jpg" width="200" height="200" alt="Thumb" />
```

Source: [Angular: Optimizing images with NgOptimizedImage](https://angular.dev/guide/image-optimization).

### Vitest as the default test runner

Karma was deprecated in Angular 16. The Angular CLI now uses **Vitest as the default unit-test runner for new projects**. Existing Karma + Jasmine projects continue to work; the migration is incremental. Jest had an experimental builder in v16; the team explicitly moved investment to Vitest because of its Vite alignment with the application builder.

```ts
import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { UserListComponent } from './user-list.component';

describe('UserListComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [UserListComponent],
      providers: [provideHttpClientTesting()],
    });
  });

  it('renders', () => {
    const fixture = TestBed.createComponent(UserListComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Users');
  });

  it('updates on input change', () => {
    const fixture = TestBed.createComponent(UserCardComponent);
    fixture.componentRef.setInput('user', { id: '1', name: 'Alice' });
    fixture.detectChanges();
    expect(fixture.componentInstance.user().name).toBe('Alice');
  });
});
```

`fixture.componentRef.setInput()` is the signal-aware way to drive an `input()`-defined input from a test. Source: [Angular: Migrating from Karma to Vitest](https://angular.dev/guide/testing/migrating-to-vitest).

### Application builder (Vite + esbuild) over browser builder

In Angular 18 the default builder for new projects is `@angular-devkit/build-angular:application`, which uses **esbuild** for production builds and **Vite** for the dev server. The legacy `browser` builder is supported but explicitly tagged as a migration target. Reported speed gains: more than 67% improvement in build time versus the old Webpack-based browser builder.

```json
{
  "architect": {
    "build": {
      "builder": "@angular-devkit/build-angular:application",
      "options": { /* … */ }
    }
  }
}
```

Application builder advantages: same builder for client, server (SSR), and prerender; better tree-shaking; first-class support for `@defer` lazy chunking; HMR for component templates and styles. Migration is via `ng update @angular/cli`. Source: [Angular: Migrating to new build system](https://angular.dev/tools/cli/build-system-migration).

### Canonical Angular 18 component (write everything like this)

```ts
import {
  Component, ChangeDetectionStrategy, inject, input, output, computed,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { UserService } from './user.service';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2>{{ title() }}</h2>
    @if (loading()) {
      <p>Loading...</p>
    } @else if (users().length > 0) {
      <ul>
        @for (u of users(); track u.id) {
          <li>
            {{ u.name }}
            <button (click)="select.emit(u.id)">Open</button>
          </li>
        }
      </ul>
    } @else {
      <p>No users.</p>
    }
  `,
})
export class UserListComponent {
  private users$ = inject(UserService).list();

  filter = input<string>('');
  select = output<string>();

  private allUsers = toSignal(this.users$, { initialValue: [] });
  users = computed(() =>
    this.allUsers().filter(u => u.name.toLowerCase().includes(this.filter().toLowerCase())),
  );
  loading = computed(() => this.allUsers().length === 0);
  title = computed(() => `Users (${this.users().length})`);
}
```

Every primitive is Angular-18-canonical: standalone, OnPush, signal inputs, signal outputs, signals + computed for derived state, `toSignal` for RxJS interop, `@if` / `@for` / `@empty` control flow, `inject()` over constructor.

## Migration paths

Three patterns. Each maps to a different organisational constraint.

### Path A: Big-bang rewrite

The team freezes the AngularJS codebase, builds a fresh Angular 18 application against the same backend, and cuts traffic over on a release day.

**When it wins.** Small apps (under ~30K LOC by the XLTS formula), apps where the original requirements have drifted so far that a redesign is desired anyway, internal tools without external SLAs, apps so coupled that ngUpgrade boundaries are impractical. **Reported timeline: 3 to 9 months for mid-sized applications.**

**When it fails.** "Trying to do a big-bang rewrite is usually a recipe for disaster, especially with complex applications" is the consensus across migration consultancies. Feature freeze conflicts with business velocity; the new app accumulates parity bugs while the old app gets emergency patches that have to be re-implemented.

**Tooling.** Angular CLI fresh project (`ng new`), the standalone schematic (`ng g @angular/core:standalone`), control-flow schematic, inject() schematic.

**Real-world cite.** Grid Dynamics' fintech case study explicitly chose **not** to do big-bang for a multi-year financial-consultant app and went with ngUpgrade instead, naming parity risk as the deciding factor. Source: [Grid Dynamics: AngularJS to Angular migration](https://www.griddynamics.com/blog/angularjs-to-angular-migration), [Hashbyt 2026 roadmap](https://hashbyt.com/blog/upgrading-angularjs-to-angular).

### Path B: ngUpgrade hybrid (recommended for most enterprise codebases)

The official Angular tool, `@angular/upgrade/static`, lets both frameworks run inside the same browser bundle. Bootstrap Angular first, then `UpgradeModule.bootstrap` brings AngularJS up against the same DOM root. From there, individual components and services migrate piecewise.

**Primitives.**
- `downgradeComponent({ component: NewAngularComponent })` returns an AngularJS directive factory. Drop the directive into an AngularJS template and you get an Angular 18 component rendering inside an AngularJS view.
- `upgradeComponent({ component: 'oldAngularJSDirective' })` wraps an AngularJS directive so it can be used inside Angular templates.
- `downgradeInjectable(NewAngularService)` exposes an Angular service to the AngularJS DI container.

**When it wins.** Large apps with continuous-deployment requirements, regulated apps that cannot freeze, apps where parts of the surface have well-defined boundaries (settings page vs transaction grid).

**When it loses.** The hybrid bundle ships **both frameworks**; bundle size and startup cost go up before they come down. Routing is a chronic pain point: AngularJS router and Angular router fight for the URL, and lazy-loaded Angular bundles inside an AngularJS shell hit known UpgradeModule issues ([angular/angular#17490](https://github.com/angular/angular/issues/17490)).

**Reported timeline: 6 to 18 months for a large enterprise app.**

**Real-world cite.** Grid Dynamics fintech (AngularJS 1.6 + 1.9 to Angular 4 via UpgradeModule, bootstrapping Angular first then AngularJS), Codurance hybrid case study, Viacheslav Klavdiiev's 2025 retrospective on AngularJS to Angular 16 via UpgradeModule. Source: [Angular v17 Upgrading from AngularJS guide](https://v17.angular.io/guide/upgrade), [Codurance: Hybrid migration](https://www.codurance.com/publications/migrating-angularjs-to-angular).

### Path C: Strangler fig (build-on-the-side)

Stand up a new Angular 18 application as a separate deployable. A facade (reverse proxy, app shell, or container page) routes individual URLs to either the legacy AngularJS app or the new Angular app. Over time the share of URLs shifts toward Angular until the legacy app is retired.

**Mechanisms.**
- **Iframe shell.** Each module renders inside an iframe; the host page coordinates auth and navigation. Manfred Steyer's `microservice-angular-iframe` repo is the canonical Angular reference.
- **Web components.** Migrated Angular components are compiled to custom elements via `@angular/elements` and dropped into the AngularJS template as `<my-component>` tags.
- **Micro-frontends / single-spa.** A meta-router orchestrates which framework runs which route. Small Improvements used a single-spa-like approach for their 100K-LOC AngularJS-to-React migration.

**When it wins.** Apps where the URL surface is naturally segmented (dashboard, settings, reports as independent areas), apps that want to ship the modernised UI under a new brand and keep the old UI accessible during transition, apps with multiple teams wanting independent release cadences.

**When it loses.** Cross-page state (auth tokens, feature flags, navigation breadcrumbs) requires explicit synchronisation. SEO and analytics frequently break. Iframe scrolling and focus-management UX issues are persistent.

**Reported timeline: 6 to 24 months**, highly variable. Source: [Tenmile Square: Angular Migration and the Strangler Fig](https://tenmilesquare.com/resources/software-development/angular-migration-and-the-strangler-fig/), [Small Improvements: Migrating 100K LOC AngularJS to React](https://tech.small-improvements.com/how-to-migrate-an-angularjs-1-app-to-react/).

### Path summary

| Path | Tool | Min app size where it wins | Coexistence cost | Typical timeline |
|------|------|-----------------------------|------------------|------------------|
| A. Big-bang | Angular CLI fresh project | < ~30K LOC | None (separate deployments) | 3 - 9 months |
| B. ngUpgrade | `@angular/upgrade/static` | Any size; required for very large coupled apps | Both frameworks in same bundle, hybrid routing complexity | 6 - 18 months |
| C. Strangler fig | iframes / `@angular/elements` / single-spa | Mid-large with clean URL boundaries | Cross-app state plumbing | 6 - 24 months |

## Anti-patterns the assistant must refuse

The assistant SHALL NOT emit any of the patterns below. Each entry has a BAD code example (what LLMs trained pre-2025 produce by default), a CORRECT code example (the Angular 18 idiom), and a WHY one-liner with source.

### Mode A: AngularJS 1.x emitted for "Angular" requests (15 patterns)

#### A-001: `$scope.$apply` and other `$scope` methods

```js
// BAD - AngularJS 1.x
function MyController($scope) {
  setTimeout(function () {
    $scope.value = 42;
    $scope.$apply();
  }, 100);
}
```

```ts
// CORRECT - Angular 18
@Component({ /* … */ })
export class MyComponent {
  value = signal(0);
  constructor() {
    setTimeout(() => this.value.set(42), 100);
  }
}
```

WHY: `$scope` was removed in Angular 2.0 (September 2016) and does not exist in modern Angular. Signal writes mark consumers dirty automatically. Source: [AngularJS Scopes guide](https://docs.angularjs.org/guide/scope).

#### A-002: `$scope.$watch` to observe a value

```js
// BAD - AngularJS 1.x
$scope.$watch('user.name', function (newVal, oldVal) {
  console.log('changed', newVal);
});
```

```ts
// CORRECT - Angular 18
@Component({ /* … */ })
export class UserComponent {
  user = input.required<User>();
  constructor() {
    effect(() => console.log('changed', this.user().name));
  }
}
```

WHY: `$watch` runs on every digest cycle and is documented as an anti-pattern in community style guides; `effect()` replaces it for signals, RxJS subscriptions for streams. Source: [AngularJS style-guide watch anti-pattern](https://github.com/johnpapa/angular-styleguide/issues/449).

#### A-003: Controller registered against `ng-controller`

```html
<!-- BAD - AngularJS 1.x -->
<div ng-controller="UserCtrl as vm">
  <h1>{{ vm.title }}</h1>
</div>
```

```js
angular.module('app').controller('UserCtrl', function () {
  this.title = 'Users';
});
```

```ts
// CORRECT - Angular 18
@Component({
  selector: 'app-user',
  standalone: true,
  template: '<h1>{{ title }}</h1>',
})
export class UserComponent {
  title = 'Users';
}
```

WHY: Modern Angular has no `Controller` concept. Components are the unit of composition. Source: [Angular: Standalone migration](https://angular.dev/reference/migrations/standalone).

#### A-004: `$compile` to render dynamic HTML

```js
// BAD - AngularJS 1.x
function MyDirective($compile) {
  return {
    link: function (scope, element) {
      var tpl = '<div>{{ user.name }}</div>';
      element.append($compile(tpl)(scope));
    },
  };
}
```

```ts
// CORRECT - Angular 18
@Component({
  standalone: true,
  imports: [NgComponentOutlet],
  template: '<ng-container *ngComponentOutlet="cmp(); inputs: inputs()" />',
})
export class HostComponent {
  cmp = signal(MyChildComponent);
  inputs = signal({ user: { name: 'Alice' } });
}
```

WHY: `$compile` does not exist in Angular. Runtime dynamic insertion uses `ViewContainerRef.createComponent`, `NgComponentOutlet`, or `@defer`. ngMigration Assistant flags `$compile` as a pre-migration refactor target. Source: [ngMigration-Assistant README](https://github.com/ellamaolson/ngMigration-Assistant).

#### A-005: `$http` for HTTP

```js
// BAD - AngularJS 1.x
$http.get('/api/users').then(function (response) {
  $scope.users = response.data;
});
```

```ts
// CORRECT - Angular 18
@Component({ /* … */ })
export class UsersComponent {
  private http = inject(HttpClient);
  users = toSignal(this.http.get<User[]>('/api/users'), { initialValue: [] });
}
```

WHY: `$http` returns a `$q` promise; Angular `HttpClient` returns an Observable, parses JSON automatically, supports cancellation and retry, and integrates with functional interceptors. Source: [Angular: HttpClient API](https://angular.dev/api/common/http/HttpClient).

#### A-006: `$q` deferred promises

```js
// BAD - AngularJS 1.x
function loadUser() {
  var deferred = $q.defer();
  $http.get('/api/user').then(function (r) { deferred.resolve(r.data); });
  return deferred.promise;
}
```

```ts
// CORRECT - Angular 18
loadUser(): Observable<User> {
  return this.http.get<User>('/api/user');
}
```

WHY: `$q` is AngularJS-only. Use native `Promise` for one-shot async, `Observable` for streams. The `$q.defer()` deferred antipattern was already discouraged in JS before AngularJS sunset. Source: [AngularJS $q API](https://docs.angularjs.org/api/ng/service/$q).

#### A-007: `ng-app` directive on the root element

```html
<!-- BAD - AngularJS 1.x -->
<html ng-app="myApp">
  <body>
    <div ng-view></div>
  </body>
</html>
```

```html
<!-- CORRECT - Angular 18 index.html -->
<html>
  <body>
    <app-root></app-root>
  </body>
</html>
```

```ts
// main.ts
bootstrapApplication(AppComponent, { providers: [/* … */] });
```

WHY: `ng-app` is the AngularJS auto-bootstrap directive. Angular bootstraps explicitly through `bootstrapApplication` (standalone) or `platformBrowser().bootstrapModule(AppModule)` (legacy NgModule). Source: [Angular: bootstrapApplication](https://angular.dev/api/platform-browser/bootstrapApplication).

#### A-008: `ng-bind-html` with `$sce.trustAsHtml`

```html
<!-- BAD - AngularJS 1.x -->
<div ng-bind-html="trustedHtml"></div>
```

```js
$scope.trustedHtml = $sce.trustAsHtml(userInput);
```

```ts
// CORRECT - Angular 18
@Component({
  template: '<div [innerHTML]="safeHtml()"></div>',
})
export class CommentComponent {
  private sanitizer = inject(DomSanitizer);
  raw = input.required<string>();
  safeHtml = computed(() => this.sanitizer.bypassSecurityTrustHtml(this.raw()));
}
```

WHY: `$sce.trustAsHtml` is AngularJS's escape hatch and a notorious XSS vector; Angular's `DomSanitizer` is the equivalent and similarly dangerous. Sanitise server-side when possible. Source: [Angular Security Guide](https://angular.dev/best-practices/security).

#### A-009: Template event handler via `ng-click`

```html
<!-- BAD - AngularJS 1.x -->
<button ng-click="vm.save()">Save</button>
```

```html
<!-- CORRECT - Angular 18 -->
<button (click)="save()">Save</button>
```

WHY: Angular event bindings use `(event)` syntax. The `ng-*` attribute family belongs to AngularJS. Source: [AngularJS migration guide](https://docs.angularjs.org/guide/migration).

#### A-010: AngularJS module system (`angular.module('app', [])`)

```js
// BAD - AngularJS 1.x
angular.module('app', ['ngRoute', 'ngResource'])
  .controller('MainCtrl', MainController)
  .service('UserService', UserService);
```

```ts
// CORRECT - Angular 18
@Component({
  standalone: true,
  imports: [RouterOutlet, UserCardComponent],
  template: '...',
})
export class AppComponent {
  private userService = inject(UserService);
}
```

WHY: Angular's standalone model replaces AngularJS's module system with ES module imports plus an `imports` array on each component. Source: [Angular: Standalone migration](https://angular.dev/reference/migrations/standalone).

#### A-011: Filter pipe with AngularJS-only grammar

```html
<!-- BAD - AngularJS 1.x -->
{{ users | filter:search | orderBy:'name':true }}
```

```html
<!-- CORRECT - Angular 18 -->
@for (u of filteredUsers(); track u.id) {
  <li>{{ u.name }}</li>
}
```

```ts
filteredUsers = computed(() =>
  this.users()
    .filter(u => u.name.includes(this.search()))
    .sort((a, b) => b.name.localeCompare(a.name)),
);
```

WHY: The `| filter:expr` and `| orderBy:expr:reverse` pipes from AngularJS do not exist in Angular. The framework explicitly omitted them for performance (they ran every digest cycle). Replace with computed signals. Source: [Medium: Filters in AngularJS vs Pipes in Angular](https://medium.com/@zaynt.dev/filters-in-angularjs-vs-pipes-in-angular-whats-the-difference-3dbb7b6904f6).

#### A-012: `$resource` for REST

```js
// BAD - AngularJS 1.x
var User = $resource('/api/users/:id');
User.query(function (users) { $scope.users = users; });
User.get({ id: 1 }, function (u) { $scope.user = u; });
```

```ts
// CORRECT - Angular 18
@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);
  list() { return this.http.get<User[]>('/api/users'); }
  get(id: string) { return this.http.get<User>(`/api/users/${id}`); }
}
```

WHY: `$resource` is an AngularJS-only abstraction over `$http`. Angular's `HttpClient` is itself the canonical REST client. Source: [AngularJS $resource API](https://docs.angularjs.org/api/ngResource/service/$resource).

#### A-013: `$cookies` service

```js
// BAD - AngularJS 1.x
$cookies.put('token', 'abc');
var t = $cookies.get('token');
```

```ts
// CORRECT - Angular 18
@Injectable({ providedIn: 'root' })
export class CookieService {
  private doc = inject(DOCUMENT);
  set(name: string, value: string) {
    this.doc.cookie = `${name}=${encodeURIComponent(value)}; path=/`;
  }
}
```

WHY: `ngCookies` does not exist in Angular. Use the third-party `ngx-cookie-service` package or the `DOCUMENT` injection token to access `document.cookie`. Source: [AngularJS $cookies provider](https://docs.angularjs.org/api/ngCookies/provider/$cookiesProvider).

#### A-014: `$location` for URL access

```js
// BAD - AngularJS 1.x
$location.path('/users/' + id);
$location.search({ q: 'foo' });
```

```ts
// CORRECT - Angular 18
private router = inject(Router);
this.router.navigate(['/users', id], { queryParams: { q: 'foo' } });
```

WHY: Angular splits the AngularJS `$location` into `Router` (navigation) and `Location` (history). Source: [Angular v17 upgrade guide: $location replacement](https://v17.angular.io/guide/upgrade).

#### A-015: IIFE wrap with `'use strict'` per file

```js
// BAD - AngularJS 1.x
(function () {
  'use strict';
  angular.module('app').service('Foo', Foo);
  function Foo() {}
})();
```

```ts
// CORRECT - Angular 18
// foo.service.ts
@Injectable({ providedIn: 'root' })
export class FooService {}
```

WHY: ES modules are strict by default; the IIFE wrap was an AngularJS-era convention to give each file its own scope for global-namespace `angular.module('app')` registration. Neither idiom is needed in TypeScript ES-module Angular. Source: [Ultimate Courses: Minimal Angular module syntax using an IIFE](https://ultimatecourses.com/blog/minimal-angular-module-syntax-approach-using-an-iife).

### Mode B: Angular 2-17 legacy emitted instead of Angular 18 (35 patterns)

The patterns below are valid Angular 2-17 code that still compiles in Angular 18 but is no longer the recommended target. LLMs trained on the v2-v12 era regress to these defaults unless explicitly steered.

#### B-001: `*ngIf` instead of `@if`

```html
<!-- BAD - Angular 2-16 -->
<div *ngIf="user; else loading">{{ user.name }}</div>
<ng-template #loading><p>Loading...</p></ng-template>
```

```html
<!-- CORRECT - Angular 18 -->
@if (user(); as u) {
  <div>{{ u.name }}</div>
} @else {
  <p>Loading...</p>
}
```

WHY: Control-flow `@if` stabilised in v18 and is the recommended pattern; `*ngIf` is on the long deprecation path. The migration schematic auto-converts. Source: [HeroDevs: Control-flow migration schematic](https://www.herodevs.com/blog-posts/new-in-angular----control-flow-migration-schematic).

#### B-002: `*ngFor` without trackBy (and without `@for`'s required track)

```html
<!-- BAD - Angular 2-16 -->
<li *ngFor="let u of users">{{ u.name }}</li>
```

```html
<!-- CORRECT - Angular 18 -->
@for (u of users(); track u.id) {
  <li>{{ u.name }}</li>
}
```

WHY: `@for` requires `track`. The compiler warns when missing because rebuilding the list on every change is the well-known `*ngFor`-without-`trackBy` performance bug. Source: [Angular: Deferred loading and control flow](https://angular.dev/guide/templates/defer).

#### B-003: `*ngSwitch` instead of `@switch`

```html
<!-- BAD - Angular 2-16 -->
<div [ngSwitch]="status">
  <p *ngSwitchCase="'idle'">Idle</p>
  <p *ngSwitchDefault>Done</p>
</div>
```

```html
<!-- CORRECT - Angular 18 -->
@switch (status()) {
  @case ('idle') { <p>Idle</p> }
  @default       { <p>Done</p> }
}
```

WHY: Same control-flow migration story as `*ngIf` / `*ngFor`. Source: [HeroDevs: Control-flow migration schematic](https://www.herodevs.com/blog-posts/new-in-angular----control-flow-migration-schematic).

#### B-004: NgModule for a feature

```ts
// BAD - Angular 2-15
@NgModule({
  declarations: [UserListComponent, UserCardComponent],
  imports: [CommonModule, RouterModule.forChild(routes)],
  providers: [UserService],
  exports: [UserListComponent],
})
export class UserModule {}
```

```ts
// CORRECT - Angular 18
@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [UserCardComponent],
  template: '...',
})
export class UserListComponent {}

@Injectable({ providedIn: 'root' })
export class UserService {}

// routes.ts
export const userRoutes: Routes = [
  { path: '', loadComponent: () => import('./user-list.component').then(m => m.UserListComponent) },
];
```

WHY: Standalone is the recommended pattern in v18 and the default in v19. NgModule still works but is on the long deprecation runway. Source: [The future is standalone](https://blog.angular.dev/the-future-is-standalone-475d7edbc706).

#### B-005: `@Input()` decorator

```ts
// BAD - Angular 2-17
@Component({ /* … */ })
export class UserCard {
  @Input() user!: User;
  @Input() showAvatar = true;
}
```

```ts
// CORRECT - Angular 18
@Component({ /* … */ })
export class UserCardComponent {
  user = input.required<User>();
  showAvatar = input(true);
}
```

WHY: Signal-based `input()` and `input.required()` are recommended as of v17.1, give better types than the decorator, and auto-mark OnPush components dirty on change. Source: [v18 docs: Inputs as signals](https://v18.angular.dev/guide/signals/inputs/).

#### B-006: `@Output()` decorator with `EventEmitter`

```ts
// BAD - Angular 2-17
@Component({ /* … */ })
export class UserCard {
  @Output() remove = new EventEmitter<string>();
}
```

```ts
// CORRECT - Angular 18
@Component({ /* … */ })
export class UserCardComponent {
  remove = output<string>();
}
```

WHY: `output()` is the signal-era equivalent: typed, lifecycle-managed, consistent with `input()`, no `EventEmitter` allocation. Source: [Angular University: Signal Components](https://blog.angular-university.io/angular-signal-components/).

#### B-007: Constructor injection everywhere

```ts
// BAD - Angular 2-15
@Component({ /* … */ })
export class UserListComponent {
  constructor(
    private http: HttpClient,
    private router: Router,
    private auth: AuthService,
  ) {}
}
```

```ts
// CORRECT - Angular 18
@Component({ /* … */ })
export class UserListComponent {
  private http = inject(HttpClient);
  private router = inject(Router);
  private auth = inject(AuthService);
}
```

WHY: `inject()` works in standalone functions (interceptors, guards, resolvers, factories) where constructors cannot, gives more accurate types, and is the framework's recommended default. Source: [Angular: inject() function migration](https://angular.dev/reference/migrations/inject-function).

#### B-008: Class-based `HttpInterceptor`

```ts
// BAD - Angular 2-14
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private auth: AuthService) {}
  intercept(req: HttpRequest<any>, next: HttpHandler) {
    const token = this.auth.token;
    return next.handle(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
  }
}

@NgModule({
  providers: [{ provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }],
})
export class AppModule {}
```

```ts
// CORRECT - Angular 18
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).token();
  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};

bootstrapApplication(AppComponent, {
  providers: [provideHttpClient(withInterceptors([authInterceptor]))],
});
```

WHY: Functional interceptors have predictable ordering, no class-construction ambiguity. Source: [Angular: Intercepting requests and responses](https://angular.dev/guide/http/interceptors).

#### B-009: Class-based route guard

```ts
// BAD - Angular 2-15.1
@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}
  canActivate(): boolean | UrlTree {
    return this.auth.isLoggedIn() ? true : this.router.parseUrl('/login');
  }
}
```

```ts
// CORRECT - Angular 18
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isLoggedIn() ? true : router.parseUrl('/login');
};
```

WHY: Class-based guards are deprecated as of v15.2. The function form is tree-shakable, composable, and recommended. Source: [angular/angular#50234](https://github.com/angular/angular/issues/50234).

#### B-010: Class-based resolver

```ts
// BAD - Angular 2-15.1
@Injectable({ providedIn: 'root' })
export class UserResolver implements Resolve<User> {
  constructor(private svc: UserService) {}
  resolve(route: ActivatedRouteSnapshot) {
    return this.svc.get(route.params['id']);
  }
}
```

```ts
// CORRECT - Angular 18
export const userResolver: ResolveFn<User> = (route) =>
  inject(UserService).get(route.params['id']);
```

WHY: Same migration story as guards: function form is tree-shakable, composable, recommended. Source: [angular/angular#50234](https://github.com/angular/angular/issues/50234).

#### B-011: `HttpClientModule` import

```ts
// BAD - Angular 2-17
@NgModule({
  imports: [HttpClientModule],
})
export class AppModule {}
```

```ts
// CORRECT - Angular 18
bootstrapApplication(AppComponent, {
  providers: [provideHttpClient()],
});
```

WHY: `HttpClientModule` is deprecated in v18 in favour of `provideHttpClient()`. Source: [angular/angular#56964](https://github.com/angular/angular/issues/56964).

#### B-012: `RouterModule.forRoot()`

```ts
// BAD - Angular 2-14
@NgModule({
  imports: [RouterModule.forRoot(routes)],
})
export class AppModule {}
```

```ts
// CORRECT - Angular 18
bootstrapApplication(AppComponent, {
  providers: [provideRouter(routes, withComponentInputBinding())],
});
```

WHY: Standalone provider functions replace the module forms. `withComponentInputBinding()` enables route param flow into signal inputs. Source: [Angular: withComponentInputBinding](https://angular.dev/api/router/withComponentInputBinding).

#### B-013: `Promise.all` for parallel HTTP

```ts
// BAD - older Angular
async load() {
  const [users, orders] = await Promise.all([
    firstValueFrom(this.http.get<User[]>('/users')),
    firstValueFrom(this.http.get<Order[]>('/orders')),
  ]);
}
```

```ts
// CORRECT - Angular 18
load() {
  return forkJoin({
    users: this.http.get<User[]>('/users'),
    orders: this.http.get<Order[]>('/orders'),
  });
}
```

WHY: `forkJoin` is the RxJS equivalent of `Promise.all`. Keeps the pipeline observable, allowing retry / cancellation / interceptor integration that Promises do not get. Source: [Learn RxJS: forkJoin](https://www.learnrxjs.io/learn-rxjs/operators/combination/forkjoin).

#### B-014: Subscribing in `ngOnInit` without unsubscription

```ts
// BAD - Angular 2-15
ngOnInit() {
  this.svc.stream().subscribe(value => this.value = value);
}
```

```ts
// CORRECT - Angular 18
// Option 1: takeUntilDestroyed
constructor() {
  this.svc.stream()
    .pipe(takeUntilDestroyed())
    .subscribe(value => this.value.set(value));
}

// Option 2: toSignal
value = toSignal(this.svc.stream(), { initialValue: null });
```

WHY: Bare `.subscribe()` without cleanup leaks the subscription when the component is destroyed. `takeUntilDestroyed` (v16+) uses `DestroyRef` to wire teardown automatically. Source: [Angular: DestroyRef](https://angular.dev/api/core/DestroyRef).

#### B-015: `BehaviorSubject` for component state

```ts
// BAD - Angular 2-15
private _user$ = new BehaviorSubject<User | null>(null);
user$ = this._user$.asObservable();
setUser(u: User) { this._user$.next(u); }
```

```ts
// CORRECT - Angular 18
user = signal<User | null>(null);
setUser(u: User) { this.user.set(u); }
```

WHY: Signals are the recommended primitive for local state; `BehaviorSubject` remains valid only when you need RxJS operators on the stream. Source: [Modern Angular: Service with a Subject vs Service with a Signal](https://modernangular.com/articles/service-with-a-signal-in-angular).

#### B-016: `ChangeDetectionStrategy.Default` (implicit)

```ts
// BAD - implicit Default
@Component({
  selector: 'app-foo',
  template: '...',
})
export class FooComponent {}
```

```ts
// CORRECT - Angular 18
@Component({
  selector: 'app-foo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '...',
})
export class FooComponent {}
```

WHY: OnPush is the recommended default and the gateway to zoneless. RFC to make OnPush the default is open. Source: [angular/angular#66779](https://github.com/angular/angular/discussions/66779).

#### B-017: `@ViewChild` decorator with `static: true | false`

```ts
// BAD - Angular 2-16
@ViewChild('panel', { static: true }) panel!: ElementRef;
@ViewChild(ChildComponent, { static: false }) child!: ChildComponent;
```

```ts
// CORRECT - Angular 18
panel = viewChild.required<ElementRef>('panel');
child = viewChild(ChildComponent);

ngAfterViewInit() {
  this.panel().nativeElement.focus();
}
```

WHY: Signal-based `viewChild()` removes the `static: true` / `static: false` ergonomic problem. The signal updates as the view changes. Source: [Angular: Referencing component children](https://angular.dev/guide/components/queries).

#### B-018: `@ViewChildren` / `@ContentChildren`

```ts
// BAD - Angular 2-16
@ViewChildren(ItemComponent) items!: QueryList<ItemComponent>;
ngAfterViewInit() {
  this.items.changes.subscribe(/* … */);
}
```

```ts
// CORRECT - Angular 18
items = viewChildren(ItemComponent);
itemCount = computed(() => this.items().length);
```

WHY: `viewChildren()` returns a signal whose value is the current list; combine with `computed()` for derived values without subscriptions. Source: [Angular: Referencing component children](https://angular.dev/guide/components/queries).

#### B-019: Subscribing to `ActivatedRoute.params`

```ts
// BAD - Angular 2-17
constructor(private route: ActivatedRoute) {}
ngOnInit() {
  this.route.params.subscribe(p => this.id = p['id']);
}
```

```ts
// CORRECT - Angular 18
@Component({ /* … */ })
export class DetailComponent {
  id = input.required<string>(); // bound by withComponentInputBinding
}
```

WHY: With `withComponentInputBinding()` route params flow into component signal inputs automatically; no subscription, no `ActivatedRoute` injection. Source: [DanyWalls: Simplify routing parameters](https://danywalls.com/input-binding-and-router-withcomponentinputbinding-in-angular).

#### B-020: Class-based `TitleStrategy`

```ts
// BAD - older Angular
@Injectable()
export class TemplatePageTitleStrategy extends TitleStrategy {
  override updateTitle(routerState: RouterStateSnapshot) {
    const title = this.buildTitle(routerState);
    if (title) document.title = `MyApp - ${title}`;
  }
}
```

```ts
// CORRECT - Angular 18
const routes: Routes = [
  { path: 'users', component: UserListComponent, title: 'Users - MyApp' },
];

// Or, for dynamic titles, a ResolveFn returning string:
const userTitle: ResolveFn<string> = (route) =>
  inject(UserService).get(route.params['id']).pipe(map(u => `User ${u.name}`));
```

WHY: Routes can specify static `title` or a `ResolveFn`. Class-based `TitleStrategy` overrides are a last resort, not the default. Source: [Angular: withComponentInputBinding](https://angular.dev/api/router/withComponentInputBinding).

#### B-021: `FormGroup` without type interface (untyped reactive forms)

```ts
// BAD - pre-Angular-14
form = new FormGroup({
  email: new FormControl(''),
  password: new FormControl(''),
});
// form.value is { email: any; password: any }
```

```ts
// CORRECT - Angular 18
form = new FormGroup({
  email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
  password: new FormControl('', { nonNullable: true }),
});
// form.getRawValue() is { email: string; password: string }
```

WHY: Strictly typed reactive forms shipped in v14 and are the canonical pattern. Source: [Angular: Strictly typed reactive forms](https://angular.dev/guide/forms/typed-forms).

#### B-022: `Renderer2` for native DOM access

```ts
// BAD - older Angular
constructor(private el: ElementRef, private renderer: Renderer2) {}
focusInput() {
  this.renderer.selectRootElement(this.el.nativeElement.querySelector('input')).focus();
}
```

```ts
// CORRECT - Angular 18
input = viewChild.required<ElementRef<HTMLInputElement>>('input');
focusInput() { this.input().nativeElement.focus(); }
```

WHY: `Renderer2` is still valid for server-rendered or web-worker contexts but for direct browser DOM access through a signal viewChild, the native element handle is type-safe and clearer. Source: [Angular: Referencing component children](https://angular.dev/guide/components/queries).

#### B-023: `HttpHeaders` rebuilt via mutation pattern

```ts
// BAD
let headers = new HttpHeaders();
headers = headers.set('Authorization', `Bearer ${token}`);
headers = headers.set('X-Trace', traceId);
this.http.get('/api/users', { headers });
```

```ts
// CORRECT - Angular 18
this.http.get('/api/users', {
  headers: { Authorization: `Bearer ${token}`, 'X-Trace': traceId },
});
```

WHY: Modern HttpClient accepts a plain object for headers and params, removing the `HttpHeaders` re-assignment ceremony. Source: [Angular: HttpClient API](https://angular.dev/api/common/http/HttpClient).

#### B-024: `async`/`await` inside a `subscribe`

```ts
// BAD
this.users$.subscribe(async users => {
  await this.cache.set('users', users);
  this.users = users;
});
```

```ts
// CORRECT - Angular 18
this.users$
  .pipe(
    switchMap(users => from(this.cache.set('users', users)).pipe(map(() => users))),
    takeUntilDestroyed(),
  )
  .subscribe(users => this.users.set(users));
```

WHY: Mixing `async`/`await` inside `subscribe` callbacks creates orphaned promises, breaks operator composition, and confuses error handling. Use `switchMap` / `from` to keep the pipeline observable. Source: [Angular: RxJS interop](https://angular.dev/ecosystem/rxjs-interop).

#### B-025: `import { map } from 'rxjs/operators'`

```ts
// BAD - RxJS 6 era
import { map, filter, switchMap } from 'rxjs/operators';
```

```ts
// CORRECT - RxJS 7.4+ / Angular 18
import { map, filter, switchMap } from 'rxjs';
```

WHY: `rxjs/operators` is deprecated and slated for removal in a future major. Single-entry import from `rxjs` is the recommended pattern. Source: [RxJS: Importing guide](https://rxjs.dev/guide/importing).

#### B-026: `imports: [CommonModule]` everywhere

```ts
// BAD - Angular 14-17
@Component({
  standalone: true,
  imports: [CommonModule],
  template: '<div *ngIf="x">{{ x }}</div>',
})
```

```ts
// CORRECT - Angular 18
@Component({
  standalone: true,
  imports: [],
  template: '@if (x()) { <div>{{ x() }}</div> }',
})
```

WHY: Built-in control flow does not require `CommonModule`. Importing it pulls in unused directives. Source: [HeroDevs: Control-flow migration schematic](https://www.herodevs.com/blog-posts/new-in-angular----control-flow-migration-schematic).

#### B-027: `<img src="…">` without `NgOptimizedImage`

```html
<!-- BAD -->
<img src="/assets/hero.jpg" />
```

```html
<!-- CORRECT - Angular 18 -->
<img ngSrc="/assets/hero.jpg" width="1200" height="800" priority alt="Hero" />
```

WHY: `NgOptimizedImage` enforces width/height (CLS protection), defaults to lazy loading, and supports `priority` for LCP elements. Source: [Angular: Optimizing images with NgOptimizedImage](https://angular.dev/guide/image-optimization).

#### B-028: `(ngModelChange)` for two-way binding instead of `model()`

```html
<!-- BAD - older Angular -->
<input [ngModel]="name" (ngModelChange)="name = $event" />
```

```html
<!-- CORRECT - Angular 18 (template-driven) -->
<input [(ngModel)]="name" />

<!-- CORRECT - Angular 18 (signal model() in child component) -->
<my-input [(value)]="name" />
```

```ts
// In the child component
value = model('');
```

WHY: For component-to-component two-way binding, `model()` provides a signal-based two-way contract. Source: [v18 docs: Inputs as signals](https://v18.angular.dev/guide/signals/inputs/).

#### B-029: `[innerHTML]` without explicit sanitisation context

```ts
// BAD
@Component({
  template: '<div [innerHTML]="raw"></div>',
})
export class CommentComponent {
  raw = '<script>alert(1)</script><b>hi</b>';
}
```

```ts
// CORRECT - Angular 18
@Component({
  template: '<div [innerHTML]="safe()"></div>',
})
export class CommentComponent {
  raw = input.required<string>();
  private sanitizer = inject(DomSanitizer);
  safe = computed(() => this.sanitizer.sanitize(SecurityContext.HTML, this.raw()));
}
```

WHY: `[innerHTML]` runs the sanitiser by default, but explicit sanitisation makes the policy auditable. Source: [Angular Security Guide](https://angular.dev/best-practices/security).

#### B-030: Lazy-loading via `loadChildren` string syntax

```ts
// BAD - Angular 8-
{ path: 'users', loadChildren: './users/users.module#UsersModule' }
```

```ts
// CORRECT - Angular 18
{ path: 'users', loadChildren: () => import('./users/users.routes').then(m => m.USER_ROUTES) }
// or:
{ path: 'users', loadComponent: () => import('./users/users.component').then(m => m.UsersComponent) }
```

WHY: String-based `loadChildren` was deprecated in Angular 9; the dynamic-import form is the only supported syntax. Standalone components also support `loadComponent`. Source: [Angular: Standalone migration](https://angular.dev/reference/migrations/standalone).

#### B-031: `ngOnInit` for one-time derived computation

```ts
// BAD
ngOnInit() {
  this.total = this.items.reduce((s, i) => s + i.price, 0);
}
```

```ts
// CORRECT - Angular 18
items = input.required<Item[]>();
total = computed(() => this.items().reduce((s, i) => s + i.price, 0));
```

WHY: `computed()` is reactive; when `items` changes, `total` recomputes. The `ngOnInit` form runs once and goes stale if inputs change. Source: [Angular: Signals](https://angular.dev/guide/signals).

#### B-032: Tap-then-subscribe instead of async pipe / toSignal

```ts
// BAD
@Component({ template: '<div>{{ count }}</div>' })
export class CounterComponent {
  count = 0;
  constructor() {
    this.svc.count$.pipe(tap(c => this.count = c)).subscribe();
  }
}
```

```ts
// CORRECT - Angular 18
@Component({ template: '<div>{{ count() }}</div>' })
export class CounterComponent {
  count = toSignal(inject(MyService).count$, { initialValue: 0 });
}
```

WHY: `toSignal` (and `async` pipe) handle subscription and cleanup; the imperative pattern leaks if `.subscribe()` is not torn down. Source: [Angular: toSignal API](https://angular.dev/api/core/rxjs-interop/toSignal).

#### B-033: `HostBinding` and `HostListener` decorators

```ts
// BAD - older Angular
@Directive({ selector: '[appHover]' })
export class HoverDirective {
  @HostBinding('class.active') active = false;
  @HostListener('mouseenter') onEnter() { this.active = true; }
  @HostListener('mouseleave') onLeave() { this.active = false; }
}
```

```ts
// CORRECT - Angular 18
@Directive({
  selector: '[appHover]',
  standalone: true,
  host: {
    '[class.active]': 'active()',
    '(mouseenter)': 'active.set(true)',
    '(mouseleave)': 'active.set(false)',
  },
})
export class HoverDirective {
  active = signal(false);
}
```

WHY: The `host: {}` literal in decorator metadata is the recommended replacement; it keeps all host bindings in one place and is friendlier to template tooling. Source: [Angular: Standalone migration](https://angular.dev/reference/migrations/standalone).

#### B-034: `enableProdMode()` in main.ts

```ts
// BAD - Angular 2-15
if (environment.production) {
  enableProdMode();
}
platformBrowserDynamic().bootstrapModule(AppModule);
```

```ts
// CORRECT - Angular 18
bootstrapApplication(AppComponent, appConfig);
// enableProdMode is set automatically by the application builder
```

WHY: The application builder auto-sets prod mode based on the build configuration. Manual `enableProdMode()` calls are legacy. Source: [Angular: Migrating to new build system](https://angular.dev/tools/cli/build-system-migration).

#### B-035: Browser builder in `angular.json`

```json
// BAD - Angular 2-15
{
  "architect": {
    "build": {
      "builder": "@angular-devkit/build-angular:browser",
      "options": { /* … */ }
    }
  }
}
```

```json
// CORRECT - Angular 18
{
  "architect": {
    "build": {
      "builder": "@angular-devkit/build-angular:application",
      "options": { /* … */ }
    }
  }
}
```

WHY: The application builder is the v18 default and the only one that supports `@defer` chunking, SSR, prerender, and HMR in one chain. `ng update` migrates this. Source: [Angular: Migrating to new build system](https://angular.dev/tools/cli/build-system-migration).

### Mode C: Migration-specific mistakes (12 patterns)

These appear specifically during AngularJS to Angular 18 work, where the LLM is making decisions about migration strategy, tooling, and bridging code.

#### C-001: Recommending big-bang rewrite without considering ngUpgrade

**BAD advice:**

> "Rewrite your AngularJS application from scratch in Angular 18. Plan a 4-week feature freeze."

**CORRECT advice:**

> "For apps over ~30K LOC, use the `@angular/upgrade/static` hybrid path: bootstrap Angular first, then `UpgradeModule.bootstrap` AngularJS against the same root. Migrate component-by-component using `downgradeComponent` / `upgradeComponent`. For apps with cleanly partitioned URL surface, consider the strangler-fig pattern with `@angular/elements`. Big-bang rewrites of large enterprise apps are widely reported as the riskiest path."

WHY: Multiple migration consultancies converge on "big bang fails for large complex apps." Grid Dynamics, Codurance, and Hashbyt all document this explicitly. Source: [Hashbyt 2026 migration roadmap](https://hashbyt.com/blog/upgrading-angularjs-to-angular).

#### C-002: Recommending unmaintained AngularJS community packages

**BAD advice:**

> "Use the `angular-ui-router` package for routing in your AngularJS app."

**CORRECT advice:**

> "AngularJS itself reached EOL in January 2022; only the HeroDevs NES fork ships post-EOL security patches. For any new code, use Angular's first-party `provideRouter` with standalone Routes. If you must continue developing in AngularJS, evaluate HeroDevs NES rather than relying on community packages that stopped receiving updates years ago."

WHY: Community AngularJS packages (`angular-ui-router`, `restangular`, `angular-translate`) are mostly unmaintained. Recommending them in 2026 ships known unpatched CVE risk. Source: [HeroDevs AngularJS NES](https://www.herodevs.com/support/nes-angularjs).

#### C-003: Mixing AngularJS and Angular imports in one file

```ts
// BAD
import { Component } from '@angular/core';
import * as angular from 'angular'; // AngularJS in an Angular file

@Component({ /* … */ })
export class MyComponent {
  constructor() {
    angular.module('legacyApp').service(/* … */); // smells like trouble
  }
}
```

```ts
// CORRECT - dedicated bridge file
// bridges/my-angular.bridge.ts
import * as angular from 'angular';
import { downgradeComponent } from '@angular/upgrade/static';
import { MyAngularComponent } from '../my-angular.component';

angular.module('legacyApp')
  .directive('myAngularComponent',
    downgradeComponent({ component: MyAngularComponent }) as angular.IDirectiveFactory);
```

WHY: Hybrid wiring belongs in dedicated bridge files, not interleaved with component logic. Mixing causes circular dependencies and breaks tree-shaking. Source: [Angular v17 upgrade guide](https://v17.angular.io/guide/upgrade).

#### C-004: Forgetting `downgradeInjectable` for a shared service

```ts
// BAD
@Injectable({ providedIn: 'root' })
export class AuthService { /* … */ }

// Legacy AngularJS code calls Auth.token() and gets undefined,
// because the Angular service is not registered with the AngularJS injector.
```

```ts
// CORRECT - bridge file
import { downgradeInjectable } from '@angular/upgrade/static';
import { AuthService } from './auth.service';

angular.module('legacyApp')
  .factory('authService', downgradeInjectable(AuthService) as any);
```

WHY: Without `downgradeInjectable` the AngularJS DI container cannot resolve the Angular service. Source: [DigitalOcean: Migrate services with ngUpgrade](https://www.digitalocean.com/community/tutorials/migrate-your-angularjs-services-to-angular-with-ngupgrade).

#### C-005: Forgetting `downgradeComponent` when an Angular component is used in an AngularJS template

```html
<!-- BAD - AngularJS template, renders nothing -->
<user-card user="vm.user"></user-card>
```

```ts
// CORRECT - bridge file
angular.module('legacyApp')
  .directive('userCard',
    downgradeComponent({ component: UserCardComponent }) as angular.IDirectiveFactory);
```

WHY: AngularJS only knows directives registered through `angular.module(…).directive(…)`. `downgradeComponent` wraps an Angular component as an AngularJS directive. Source: [Angular v17 upgrade guide](https://v17.angular.io/guide/upgrade).

#### C-006: Wrong bootstrap order in hybrid app

```ts
// BAD
angular.bootstrap(document.body, ['legacyApp']);
platformBrowserDynamic().bootstrapModule(AppModule);
```

```ts
// CORRECT - Angular 18 hybrid
@NgModule({
  imports: [BrowserModule, UpgradeModule],
})
export class AppModule {
  constructor(private upgrade: UpgradeModule) {}
  ngDoBootstrap() {
    this.upgrade.bootstrap(document.body, ['legacyApp']);
  }
}

platformBrowserDynamic().bootstrapModule(AppModule);
```

WHY: Angular must bootstrap first; the `UpgradeModule.bootstrap` call then brings AngularJS up against the same root element. The reverse order leaves both frameworks fighting for the same DOM. Source: [Angular v17 upgrade guide](https://v17.angular.io/guide/upgrade).

#### C-007: Assuming `ng update` covers AngularJS to Angular

**BAD advice:**

> "Run `ng update @angular/core` from your AngularJS app to upgrade to Angular 18."

**CORRECT advice:**

> "`ng update` upgrades between Angular versions (v17 to v18, v18 to v19). It does not migrate AngularJS to Angular. For that, use ngUpgrade hybrid (manual integration via `@angular/upgrade/static`), the strangler-fig pattern, or a full rewrite. Run `ngMigration Assistant` (`npm i -g ngma`) for an effort estimate on the AngularJS codebase first."

WHY: `ng update` is for the Angular 2+ line. AngularJS to Angular is a framework-replacement migration, not a version upgrade. Source: [ngMigration-Assistant](https://github.com/ellamaolson/ngMigration-Assistant).

#### C-008: Wrong RxJS version assumption

```json
// BAD
"dependencies": { "rxjs": "6.6.0" }
```

```json
// CORRECT - Angular 18
"dependencies": { "rxjs": "^7.4.0" }
```

WHY: Angular 18 requires RxJS 7.4 or higher. RxJS 6 is end-of-life and incompatible with the Angular 18 type definitions. Source: [Angular: Version compatibility](https://angular.dev/reference/versions).

#### C-009: Translating `$rootScope.$broadcast` / `$emit` / `$on` literally

**BAD prompt:**

> "Find an equivalent to `$rootScope.$broadcast('user-changed', user)` in Angular."

**CORRECT response:**

> "Don't translate the event-bus pattern. Use a dedicated service (a singleton injected into both sender and receiver) that exposes a signal or a Subject. The AngularJS `$rootScope` event bus was already considered an anti-pattern in 2015-era style guides; ngMigration Assistant explicitly flags `$rootScope` for refactoring before migration."

```ts
// Replacement pattern
@Injectable({ providedIn: 'root' })
export class UserEventService {
  readonly userChanged = signal<User | null>(null);
}

// Sender
inject(UserEventService).userChanged.set(updatedUser);

// Receiver
private events = inject(UserEventService);
constructor() {
  effect(() => {
    const u = this.events.userChanged();
    if (u) this.onUserChanged(u);
  });
}
```

WHY: `$rootScope` proliferation is one of the patterns the ngMigration Assistant calls out: "App contains $rootScope, please refactor rootScope into services." Source: [ngMigration-Assistant README](https://github.com/ellamaolson/ngMigration-Assistant).

#### C-010: Translating `ng-class` literally to `[ngClass]` and stopping there

```html
<!-- BAD intermediate result -->
<div [ngClass]="{ 'active': isActive, 'disabled': isDisabled }">...</div>
```

```html
<!-- CORRECT - Angular 18 target -->
<div [class.active]="isActive()" [class.disabled]="isDisabled()">...</div>
```

WHY: `[ngClass]` works but the binding-shorthand `[class.foo]` is preferred for static class names; `[ngClass]` is reserved for dynamic key maps. The shorthand also reduces template change-detection cost. Source: [Angular: Standalone migration](https://angular.dev/reference/migrations/standalone).

#### C-011: Importing `BrowserAnimationsModule` in a standalone app

```ts
// BAD - Angular 14-17 hybrid output
@NgModule({
  imports: [BrowserAnimationsModule],
})
export class AppModule {}
```

```ts
// CORRECT - Angular 18 standalone
bootstrapApplication(AppComponent, {
  providers: [provideAnimations()], // or provideAnimationsAsync() for lazy
});
```

WHY: Standalone apps use provider functions, not module imports. Source: [Angular: Standalone migration](https://angular.dev/reference/migrations/standalone).

#### C-012: Leaving `zone.js` polyfill when going zoneless

```ts
// BAD - mixed setup
// polyfills.ts
import 'zone.js';

// main.ts
bootstrapApplication(AppComponent, {
  providers: [provideZonelessChangeDetection()],
});
```

```ts
// CORRECT - Angular 18 zoneless dev preview
// polyfills.ts - remove the zone.js import

// main.ts
bootstrapApplication(AppComponent, {
  providers: [provideZonelessChangeDetection()],
});
```

```json
// angular.json - remove zone.js from polyfills array
{
  "architect": {
    "build": {
      "options": {
        "polyfills": []
      }
    }
  }
}
```

WHY: Both shipping Zone.js and enabling zoneless change detection defeats the bundle-size and startup-cost goal of going zoneless. Source: [Angular: Zoneless guide](https://angular.dev/guide/zoneless).

## Decision tree: when to recommend which migration path

| Condition | Recommended path |
|-----------|------------------|
| App is under ~30K LOC, no continuous-deployment requirement, team can freeze for 3-9 months | **Path A (big-bang)** |
| App is 30-300K LOC, must keep shipping, has coupled component boundaries | **Path B (ngUpgrade hybrid)** |
| App is large with cleanly partitioned URL surface (dashboard / settings / reports), multiple teams want independent cadence | **Path C (strangler fig)** |
| App is over 300K LOC | **Path C with multi-team plan**, 18-36+ months |
| Auditor or compliance freeze prevents any migration | Stay on AngularJS under **HeroDevs NES** or **OpenLogic by Perforce** until the freeze lifts |
| Team is debating React / Vue / Svelte as the target | Angular 18 is the only target with **first-party hybrid coexistence** (`@angular/upgrade/static`); pick another target only if there is a non-technical reason |

Sizing heuristic from XLTS.dev: `weeks = (LOC / weekly_team_output_LOC) * 1.4`. Example: 100K LOC at 1K LOC / week per team is ~140 person-weeks, roughly 2.7 calendar years at steady state. Source: [XLTS.dev: The Math of Migrating from AngularJS](https://www.xlts.dev/blog/2021-01-15-the-math-of-migrating-from-angularjs).

| App size | LOC range | Typical path | Realistic calendar (team of 4-8) |
|----------|-----------|---------------|----------------------------------|
| Small | < 20K | Big-bang | 2-4 months |
| Medium | 20-80K | Big-bang or ngUpgrade | 4-9 months |
| Large | 80-300K | ngUpgrade or strangler-fig | 9-18 months |
| Very large | > 300K | Strangler-fig with multi-team plan | 18-36+ months |

## Common ngUpgrade gotchas

1. **Bootstrap order is fixed.** Angular bootstraps first via `platformBrowserDynamic().bootstrapModule(AppModule)`; `UpgradeModule.bootstrap(document.body, ['legacyApp'])` brings AngularJS up against the same DOM root from inside `ngDoBootstrap`. Reverse order leaves both frameworks fighting for the DOM (see C-006).
2. **Both frameworks ship in the bundle.** Hybrid bundle size and startup cost go **up** before they come down. Plan to measure and budget for the regression during the migration window.
3. **Routing is the chronic pain point.** The AngularJS router and the Angular router fight for the URL. Lazy-loaded Angular bundles inside an AngularJS shell hit [angular/angular#17490](https://github.com/angular/angular/issues/17490). Pick one router as the master and downgrade / upgrade individual routes off it.
4. **Every shared boundary needs explicit wiring.** Angular component used in AngularJS template requires `downgradeComponent` (C-005). Angular service called from AngularJS code requires `downgradeInjectable` (C-004). AngularJS directive used in Angular template requires `upgradeComponent`. Missing any of these silently fails (the directive renders nothing, the service returns undefined).
5. **Bridge files belong in their own directory.** Keep all `downgradeComponent` / `downgradeInjectable` / `upgradeComponent` calls in `bridges/` (or similar). Interleaving them with component logic causes circular imports and breaks tree-shaking (C-003).
6. **`$rootScope.$broadcast` does not translate.** Refactor event-bus usage into a shared service exposing a signal or Subject **before** the migration starts, not during (C-009).
7. **`$compile`-using directives are a special case.** They need an architectural rethink (dynamic component creation via `ViewContainerRef.createComponent`, `NgComponentOutlet`, or `@defer`), not a mechanical port (A-004).
8. **Karma + Jasmine + `ngMock` tests do not port.** Plan to **rewrite** the test suite in Vitest + Angular `TestBed`, not migrate the AngularJS specs. Protractor was deprecated in 2022 alongside AngularJS; replace e2e with Cypress or Playwright.

## References

### Angular 18 official documentation
- [Angular v18 announcement (Minko Gechev, May 22 2024)](https://blog.angular.dev/angular-v18-is-now-available-e79d5ac0affe)
- [Angular: Standalone migration](https://angular.dev/reference/migrations/standalone)
- [Angular: bootstrapApplication](https://angular.dev/api/platform-browser/bootstrapApplication)
- [Angular: Signals](https://angular.dev/guide/signals)
- [Angular: Deferred loading with @defer](https://angular.dev/guide/templates/defer)
- [Angular: Intercepting requests and responses](https://angular.dev/guide/http/interceptors)
- [Angular: Setting up HttpClient](https://angular.dev/guide/http/setup)
- [Angular: inject() function migration](https://angular.dev/reference/migrations/inject-function)
- [Angular: withComponentInputBinding](https://angular.dev/api/router/withComponentInputBinding)
- [Angular: Strictly typed reactive forms](https://angular.dev/guide/forms/typed-forms)
- [Angular: Zoneless guide](https://angular.dev/guide/zoneless)
- [Angular: DestroyRef API](https://angular.dev/api/core/DestroyRef)
- [Angular: RxJS interop](https://angular.dev/ecosystem/rxjs-interop)
- [Angular: Referencing component children with queries](https://angular.dev/guide/components/queries)
- [Angular: Optimizing images with NgOptimizedImage](https://angular.dev/guide/image-optimization)
- [Angular: Migrating from Karma to Vitest](https://angular.dev/guide/testing/migrating-to-vitest)
- [Angular: Migrating to new build system](https://angular.dev/tools/cli/build-system-migration)
- [Angular: Version compatibility](https://angular.dev/reference/versions)
- [Angular: LLM prompts and AI IDE setup](https://angular.dev/ai/develop-with-ai)
- [Angular v17 Upgrading from AngularJS guide (still applies for ngUpgrade)](https://v17.angular.io/guide/upgrade)

### AngularJS EOL and CVE
- [AngularJS version-support-status](https://docs.angularjs.org/misc/version-support-status)
- [endoflife.date / AngularJS](https://endoflife.date/angularjs)
- [InfoQ: AngularJS Officially Reached End of Life](https://www.infoq.com/news/2022/01/angularjs-lts-end/)
- [HeroDevs: AngularJS 1.8.3 Is the Final Version](https://www.herodevs.com/blog-posts/angularjs-1-8-3-is-the-final-version----but-the-risk-didnt-end-there)
- [HeroDevs CVE-2024-21490 advisory](https://www.herodevs.com/blog-posts/addressing-the-latest-angularjs-cve-2024-21490)
- [cvedetails: AngularJS](https://www.cvedetails.com/vulnerability-list/vendor_id-18512/product_id-73080/Angularjs-Angular.js.html)

### Commercial extended support
- [HeroDevs AngularJS NES](https://www.herodevs.com/support/nes-angularjs)
- [HeroDevs + XLTS unite (Sept 2023)](https://www.xlts.dev/blog/2023-09-28-xlts-and-herodevs-unite)
- [Azure Marketplace: AngularJS NES](https://marketplace.microsoft.com/en-us/product/saas/herodevs.angularjs-nes)
- [OpenLogic AngularJS Long-Term Support](https://www.openlogic.com/solutions/angularjs-support-and-services)
- [G2X FedCiv: DHS CBP XLTS.dev award](https://app.g2xchange.com/fedciv/posts/dhs-cbp-awards-extended-long-term-solutions-xltsdev-angularjs-support-task)

### Migration case studies and tooling
- [XLTS.dev: The Math of Migrating from AngularJS](https://www.xlts.dev/blog/2021-01-15-the-math-of-migrating-from-angularjs)
- [Grid Dynamics: AngularJS to Angular migration](https://www.griddynamics.com/blog/angularjs-to-angular-migration)
- [Codurance: Hybrid migration](https://www.codurance.com/publications/migrating-angularjs-to-angular)
- [Small Improvements: Migrating 100K LOC AngularJS to React](https://tech.small-improvements.com/how-to-migrate-an-angularjs-1-app-to-react/)
- [Hashbyt: Upgrading AngularJS to Angular 2026](https://hashbyt.com/blog/upgrading-angularjs-to-angular)
- [Viacheslav Klavdiiev: Refactoring AngularJS to Angular 16+ via UpgradeModule](https://medium.com/@viacheslav.klavdiiev/refactoring-an-angularjs-app-to-angular-16-using-upgrademodule-3b431440f7dd)
- [Tenmile Square: Angular Migration and the Strangler Fig](https://tenmilesquare.com/resources/software-development/angular-migration-and-the-strangler-fig/)
- [DigitalOcean: Migrate services with ngUpgrade](https://www.digitalocean.com/community/tutorials/migrate-your-angularjs-services-to-angular-with-ngupgrade)
- [ngMigration-Assistant repo](https://github.com/ellamaolson/ngMigration-Assistant)
- [manfredsteyer/microservice-angular-iframe](https://github.com/manfredsteyer/microservice-angular-iframe)
- [angular/angular#17490: UpgradeModule lazy hybrid bundles](https://github.com/angular/angular/issues/17490)

### Deprecations and feature RFCs
- [angular/angular#50234: Deprecated class-based guards and resolvers](https://github.com/angular/angular/issues/50234)
- [angular/angular#56964: Angular 18 deprecated HTTP modules](https://github.com/angular/angular/issues/56964)
- [angular/angular#66779: RFC make OnPush the default](https://github.com/angular/angular/discussions/66779)
- [The future is standalone (Alex Rickabaugh)](https://blog.angular.dev/the-future-is-standalone-475d7edbc706)
- [HeroDevs: Control-flow migration schematic](https://www.herodevs.com/blog-posts/new-in-angular----control-flow-migration-schematic)
- [HeroDevs: From classes to functions - DestroyRef](https://www.herodevs.com/blog-posts/from-classes-to-functions-angular-16-introduces-destroyref)
- [justangular: Migrate to function-based interceptors](https://justangular.com/blog/migrate-angular-interceptors-to-function-based-interceptors/)

### LLM / Copilot context
- [HeroDevs: Why 73% of AI-assisted AngularJS migrations fall behind](https://www.herodevs.com/blog-posts/why-73-of-ai-assisted-angularjs-migrations-fall-behind-schedule)
- [vscode-copilot-release#1019: Angular 17 syntax support](https://github.com/microsoft/vscode-copilot-release/issues/1019)
- [vscode-copilot-release#1128: Copilot unaware of Angular 17](https://github.com/microsoft/vscode-copilot-release/issues/1128)
