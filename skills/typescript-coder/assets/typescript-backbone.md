# TypeScript Backbone.js MVC

> A TypeScript Backbone.js application starter following the classic MVC pattern — Models, Collections, Views, and a Router — bundled with Webpack. Provides strongly-typed wrappers around Backbone primitives for maintainable single-page applications.

## License

See [source repository](https://gitlab.com/ridesz/generator-typescript-backbone-by-ridesz) for license terms.

## Source

- [ridesz/generator-typescript-backbone-by-ridesz](https://gitlab.com/ridesz/generator-typescript-backbone-by-ridesz)

## Project Structure

```
my-backbone-app/
├── src/
│   ├── models/
│   │   └── TodoModel.ts
│   ├── collections/
│   │   └── TodoCollection.ts
│   ├── views/
│   │   ├── TodoView.ts
│   │   └── TodoListView.ts
│   ├── router/
│   │   └── AppRouter.ts
│   ├── templates/
│   │   └── todo.html
│   └── app.ts              (entry point)
├── dist/                   (generated — do not edit)
├── index.html
├── package.json
├── tsconfig.json
├── webpack.config.js
├── .gitignore
└── README.md
```

## Key Files

### `package.json`

```json
{
  "name": "my-backbone-app",
  "version": "0.1.0",
  "description": "TypeScript Backbone.js MVC application",
  "license": "MIT",
  "private": true,
  "scripts": {
    "start": "webpack serve --mode development",
    "build": "webpack --mode production",
    "build:dev": "webpack --mode development",
    "clean": "rimraf dist",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "backbone": "^1.4.1",
    "jquery": "^3.7.0",
    "underscore": "^1.13.6"
  },
  "devDependencies": {
    "@types/backbone": "^1.4.15",
    "@types/jquery": "^3.5.29",
    "@types/underscore": "^1.11.15",
    "css-loader": "^6.10.0",
    "html-webpack-plugin": "^5.6.0",
    "rimraf": "^5.0.0",
    "style-loader": "^3.3.0",
    "ts-loader": "^9.5.0",
    "typescript": "^5.4.0",
    "webpack": "^5.91.0",
    "webpack-cli": "^5.1.0",
    "webpack-dev-server": "^5.0.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2018",
    "module": "ES2020",
    "moduleResolution": "Bundler",
    "lib": ["ES2018", "DOM", "DOM.Iterable"],
    "strict": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "sourceMap": true,
    "outDir": "dist",
    "rootDir": "src",
    "skipLibCheck": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

### `webpack.config.js`

```javascript
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = (env, argv) => ({
  entry: './src/app.ts',
  output: {
    filename: 'bundle.[contenthash].js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './index.html',
      title: 'Backbone TypeScript App',
    }),
  ],
  devServer: {
    port: 8080,
    hot: true,
    historyApiFallback: true,
  },
  devtool: argv.mode === 'production' ? 'source-map' : 'eval-source-map',
});
```

### `src/models/TodoModel.ts`

```typescript
import Backbone from 'backbone';

export interface TodoAttributes {
  id?: string;
  title: string;
  completed: boolean;
  createdAt: Date;
}

export class TodoModel extends Backbone.Model<TodoAttributes> {
  defaults(): Partial<TodoAttributes> {
    return {
      title: '',
      completed: false,
      createdAt: new Date(),
    };
  }

  validate(attrs: Partial<TodoAttributes>): string | undefined {
    if (!attrs.title || attrs.title.trim().length === 0) {
      return 'Title must not be empty.';
    }
    return undefined;
  }

  toggle(): void {
    this.save({ completed: !this.get('completed') });
  }
}
```

### `src/collections/TodoCollection.ts`

```typescript
import Backbone from 'backbone';
import { TodoModel } from '../models/TodoModel.js';
import type { TodoAttributes } from '../models/TodoModel.js';

export class TodoCollection extends Backbone.Collection<TodoModel> {
  model = TodoModel;

  url = '/api/todos';

  get remaining(): TodoModel[] {
    return this.filter((todo) => !todo.get('completed'));
  }

  get completed(): TodoModel[] {
    return this.filter((todo) => todo.get('completed'));
  }

  clearCompleted(): void {
    const done = this.completed;
    this.remove(done);
    done.forEach((todo) => todo.destroy());
  }

  comparator(todo: TodoModel): Date {
    return todo.get('createdAt') ?? new Date(0);
  }
}
```

### `src/views/TodoView.ts`

```typescript
import Backbone from 'backbone';
import _ from 'underscore';
import type { TodoModel } from '../models/TodoModel.js';

const TEMPLATE = _.template(`
  <div class="todo-item <%- completed ? 'completed' : '' %>">
    <input class="toggle" type="checkbox" <%- completed ? 'checked' : '' %> />
    <label class="title"><%- title %></label>
    <button class="destroy">✕</button>
  </div>
`);

export class TodoView extends Backbone.View<TodoModel> {
  tagName = 'li' as const;

  events(): Backbone.EventsHash {
    return {
      'click .toggle': 'onToggle',
      'click .destroy': 'onDestroy',
      'dblclick .title': 'onEdit',
    };
  }

  initialize(): void {
    this.listenTo(this.model, 'change', this.render);
    this.listenTo(this.model, 'destroy', this.remove);
  }

  render(): this {
    this.$el.html(TEMPLATE(this.model.toJSON()));
    this.$el.toggleClass('completed', !!this.model.get('completed'));
    return this;
  }

  private onToggle(): void {
    this.model.toggle();
  }

  private onDestroy(): void {
    this.model.destroy();
  }

  private onEdit(): void {
    const newTitle = prompt('Edit todo:', this.model.get('title'));
    if (newTitle !== null && newTitle.trim()) {
      this.model.save({ title: newTitle.trim() });
    }
  }
}
```

### `src/views/TodoListView.ts`

```typescript
import Backbone from 'backbone';
import type { TodoCollection } from '../collections/TodoCollection.js';
import type { TodoModel } from '../models/TodoModel.js';
import { TodoView } from './TodoView.js';

export class TodoListView extends Backbone.View {
  declare collection: TodoCollection;

  events(): Backbone.EventsHash {
    return {
      'keypress #new-todo': 'onKeyPress',
      'click #clear-completed': 'onClearCompleted',
    };
  }

  initialize(): void {
    this.listenTo(this.collection, 'add', this.addOne);
    this.listenTo(this.collection, 'reset', this.addAll);
    this.listenTo(this.collection, 'change remove', this.updateStatus);
    this.collection.fetch();
  }

  render(): this {
    this.$el.html(`
      <h1>Todos</h1>
      <input id="new-todo" placeholder="What needs to be done?" autofocus />
      <ul id="todo-list"></ul>
      <footer id="footer"></footer>
    `);
    this.addAll();
    return this;
  }

  private addOne(todo: TodoModel): void {
    const view = new TodoView({ model: todo });
    this.$('#todo-list').append(view.render().el);
  }

  private addAll(): void {
    this.$('#todo-list').empty();
    this.collection.each((todo) => this.addOne(todo));
    this.updateStatus();
  }

  private updateStatus(): void {
    const remaining = this.collection.remaining.length;
    this.$('#footer').html(
      `<span>${remaining} item${remaining !== 1 ? 's' : ''} left</span>
       <button id="clear-completed">Clear completed</button>`
    );
  }

  private onKeyPress(e: JQuery.KeyPressEvent): void {
    const input = this.$('#new-todo');
    const title = (input.val() as string).trim();
    if (e.which === 13 && title) {
      this.collection.create({ title, completed: false, createdAt: new Date() });
      input.val('');
    }
  }

  private onClearCompleted(): void {
    this.collection.clearCompleted();
  }
}
```

### `src/router/AppRouter.ts`

```typescript
import Backbone from 'backbone';

export class AppRouter extends Backbone.Router {
  routes(): Backbone.RoutesHash {
    return {
      '': 'home',
      'todos/:id': 'showTodo',
      '*path': 'notFound',
    };
  }

  home(): void {
    console.log('Route: home');
  }

  showTodo(id: string): void {
    console.log(`Route: showTodo — id=${id}`);
  }

  notFound(path: string): void {
    console.warn(`Route not found: ${path}`);
  }
}
```

### `src/app.ts`

```typescript
import $ from 'jquery';
import { TodoCollection } from './collections/TodoCollection.js';
import { AppRouter } from './router/AppRouter.js';
import { TodoListView } from './views/TodoListView.js';

$(() => {
  const todos = new TodoCollection();

  const appView = new TodoListView({
    collection: todos,
    el: '#app',
  });
  appView.render();

  const router = new AppRouter();
  Backbone.history.start({ pushState: true });
});
```

## Getting Started

```bash
# 1. Create project directory
mkdir my-backbone-app && cd my-backbone-app

# 2. Copy project files (see structure above)

# 3. Install dependencies
npm install

# 4. Start the development server (http://localhost:8080)
npm start

# 5. Build for production
npm run build
```

## Features

- Strongly-typed Backbone Models, Collections, Views, and Router using `@types/backbone`
- Webpack 5 bundling with `ts-loader`, content-hash output filenames, and dev-server HMR
- Underscore templates compiled inline — no extra template loader needed
- Collection comparator, filtering helpers (`remaining`, `completed`), and `clearCompleted`
- View event delegation using the standard Backbone `events()` hash with TypeScript method references
- `Backbone.history` with `pushState` for clean URLs
- Strict TypeScript mode with source maps in both development and production
