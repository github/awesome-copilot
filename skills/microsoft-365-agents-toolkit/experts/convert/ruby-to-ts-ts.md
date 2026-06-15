# ruby-to-ts-ts

## purpose

Rewriting Ruby source code as idiomatic TypeScript — mapping Ruby language constructs, OOP patterns, metaprogramming, and common idioms to their TypeScript equivalents.

## rules

1. Ruby blocks (`do...end` / `{ |x| }`) map to arrow functions. `array.each { |item| puts item }` becomes `array.forEach((item) => console.log(item))`. Ruby's `yield` inside methods maps to calling a callback parameter.
2. Ruby mixins (`include Module`) map to TypeScript interfaces + composition. Do NOT use class inheritance to simulate mixins — use interface implementation with helper functions or the mixin pattern (`applyMixins`).
3. Ruby duck typing maps to TypeScript structural typing. If Ruby code checks `obj.respond_to?(:method)`, define an interface with that method and use a type guard: `function hasMethod(obj: unknown): obj is HasMethod`.
4. Ruby `attr_accessor :name` maps to a class property with TypeScript accessor shorthand: `constructor(public name: string) {}` or explicit `get`/`set` pairs if logic is needed.
5. Ruby symbols (`:name`) map to string literal types or enum members. A method accepting `type: :admin | :user` becomes `type: 'admin' | 'user'` in TypeScript.
6. Ruby hashes (`{ key: value }`) map to TypeScript objects or `Record<string, T>`. Named-parameter hashes (`def method(opts = {})`) become destructured typed parameters: `function method({ key1, key2 }: Options)`.
7. Ruby `nil` maps to `null` or `undefined`. Use `null` for explicit absence and `undefined` for optional/missing. Ruby's `&.` safe navigator maps to optional chaining (`?.`).
8. Ruby `begin/rescue/ensure` maps to `try/catch/finally`. Ruby's typed rescue (`rescue TypeError => e`) maps to catching and narrowing: `catch (e) { if (e instanceof TypeError) ... }`.
9. Ruby open classes and monkey-patching have NO TypeScript equivalent. Redesign as wrapper functions, decorator patterns, or module augmentation (`declare module` for extending third-party types).
10. Ruby metaprogramming (`define_method`, `method_missing`, `send`) has no direct equivalent. Replace `define_method` loops with computed property patterns or factory functions. Replace `method_missing` with `Proxy` objects (sparingly) or explicit handler maps.
11. Ruby's `Enumerable` methods map to JavaScript array methods: `map`→`map`, `select`→`filter`, `reject`→`filter` (inverted), `reduce`→`reduce`, `detect`/`find`→`find`, `flat_map`→`flatMap`, `each_with_object`→`reduce`, `group_by`→custom `groupBy` or `Object.groupBy()`.
12. Ruby string interpolation `"Hello #{name}"` maps to template literals `` `Hello ${name}` ``.
13. Ruby `Proc.new` / `lambda` / `->` all map to arrow functions. Ruby's distinction between procs and lambdas (arity checking, return behavior) disappears — TypeScript arrow functions always behave like Ruby lambdas.
14. Ruby modules used as namespaces map to TypeScript modules (files) with named exports. Do NOT use TypeScript `namespace` keyword — use ES module `export` instead.

## patterns

### Ruby class with mixins → TypeScript interface + composition

```ruby
# --- Before (Ruby) ---
module Greetable
  def greet
    "Hello, I'm #{name}"
  end
end

module Trackable
  def track(event)
    puts "Tracking #{event} for #{name}"
  end
end

class User
  include Greetable
  include Trackable

  attr_accessor :name, :email

  def initialize(name, email)
    @name = name
    @email = email
  end
end

user = User.new("Alice", "alice@example.com")
puts user.greet
user.track("login")
```

```typescript
// --- After (TypeScript) ---
interface Greetable {
  name: string;
  greet(): string;
}

function greetMixin<T extends { name: string }>(obj: T): T & Greetable {
  return Object.assign(obj, {
    greet() {
      return `Hello, I'm ${obj.name}`;
    },
  });
}

interface Trackable {
  name: string;
  track(event: string): void;
}

function trackMixin<T extends { name: string }>(obj: T): T & Trackable {
  return Object.assign(obj, {
    track(event: string) {
      console.log(`Tracking ${event} for ${obj.name}`);
    },
  });
}

class User {
  constructor(
    public name: string,
    public email: string,
  ) {}
}

// Apply mixins
function createUser(name: string, email: string): User & Greetable & Trackable {
  const user = new User(name, email);
  return trackMixin(greetMixin(user));
}

const user = createUser("Alice", "alice@example.com");
console.log(user.greet());
user.track("login");
```

### Ruby hash options / keyword args → TypeScript typed parameters

```ruby
# --- Before (Ruby) ---
class SlackNotifier
  def initialize(opts = {})
    @webhook_url = opts[:webhook_url] || ENV['SLACK_WEBHOOK']
    @channel = opts[:channel] || '#general'
    @username = opts[:username] || 'bot'
  end

  def notify(message, opts = {})
    icon = opts.fetch(:icon_emoji, ':robot_face:')
    thread_ts = opts[:thread_ts]
    # ... send notification
  end
end

notifier = SlackNotifier.new(webhook_url: 'https://...', channel: '#alerts')
notifier.notify('Deploy complete', icon_emoji: ':rocket:')
```

```typescript
// --- After (TypeScript) ---
interface SlackNotifierOptions {
  webhookUrl?: string;
  channel?: string;
  username?: string;
}

interface NotifyOptions {
  iconEmoji?: string;
  threadTs?: string;
}

class SlackNotifier {
  private readonly webhookUrl: string;
  private readonly channel: string;
  private readonly username: string;

  constructor({
    webhookUrl = process.env.SLACK_WEBHOOK ?? '',
    channel = '#general',
    username = 'bot',
  }: SlackNotifierOptions = {}) {
    this.webhookUrl = webhookUrl;
    this.channel = channel;
    this.username = username;
  }

  notify(message: string, { iconEmoji = ':robot_face:', threadTs }: NotifyOptions = {}): void {
    // ... send notification
  }
}

const notifier = new SlackNotifier({ webhookUrl: 'https://...', channel: '#alerts' });
notifier.notify('Deploy complete', { iconEmoji: ':rocket:' });
```

### Ruby Enumerable → TypeScript array methods

```ruby
# --- Before (Ruby) ---
users = get_users()
active_admins = users
  .select { |u| u.active? }
  .reject { |u| u.guest? }
  .select { |u| u.role == :admin }
  .map { |u| { name: u.name, email: u.email } }
  .sort_by { |h| h[:name] }
```

```typescript
// --- After (TypeScript) ---
interface User {
  name: string;
  email: string;
  active: boolean;
  guest: boolean;
  role: 'admin' | 'user' | 'guest';
}

const users: User[] = getUsers();
const activeAdmins = users
  .filter((u) => u.active)
  .filter((u) => !u.guest)
  .filter((u) => u.role === 'admin')
  .map((u) => ({ name: u.name, email: u.email }))
  .sort((a, b) => a.name.localeCompare(b.name));
```

## pitfalls

- **Ruby truthiness vs JS truthiness**: In Ruby, only `nil` and `false` are falsy. In JS/TS, `0`, `""`, `NaN`, `null`, `undefined`, and `false` are all falsy. Ruby code like `if count` (truthy when 0) must become `if (count !== null && count !== undefined)` in TS.
- **Ruby `==` is value equality; JS `===` is identity for objects**: Ruby `==` on strings/numbers compares values. TS `===` on primitives works the same, but on objects it compares references. Deep equality requires a library or custom check.
- **`each` return value**: Ruby's `each` returns the original array. JS `forEach` returns `undefined`. Don't chain after `forEach`.
- **Ruby ranges (`1..10`)**: No TS equivalent. Use `Array.from({ length: 10 }, (_, i) => i + 1)` or a simple `for` loop.
- **String is mutable in Ruby, immutable in JS**: Ruby `str.gsub!` mutates in place. TS strings are immutable — always reassign: `str = str.replace(...)`.
- **Ruby exception hierarchy**: Ruby has `StandardError`, `RuntimeError`, etc. TS/JS only has `Error`. Use custom error classes extending `Error` if you need a hierarchy.
- **Snake_case to camelCase**: Ruby uses `snake_case` for methods/variables. TypeScript convention is `camelCase`. Convert all identifiers, but keep API payloads in their original format (e.g., Slack payloads use `snake_case`).
- **Ruby `require` is file-level, not scoped**: All Ruby `require` statements load globally. TS `import` is scoped to the file. This means Ruby's implicit global availability must become explicit imports in every file that uses the dependency.
- **Sinatra/Rack → Express**: Ruby Sinatra routes (`get '/' do ... end`) map to Express (`app.get('/', (req, res) => { ... })`). The middleware patterns are similar but request/response APIs differ completely.

## references

- https://www.typescriptlang.org/docs/handbook/2/classes.html -- TS classes
- https://www.typescriptlang.org/docs/handbook/2/objects.html -- structural typing
- https://www.typescriptlang.org/docs/handbook/mixins.html -- mixin pattern
- https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array -- JS array methods (Enumerable equivalents)
- https://ruby-doc.org/core/Enumerable.html -- Ruby Enumerable reference (for mapping)

## instructions

Use this expert when rewriting Ruby source code in TypeScript. Start by identifying the Ruby constructs in use (classes, modules/mixins, blocks, metaprogramming, Enumerable chains) and map each to its TS equivalent using the rules above. Pay special attention to truthiness differences, mixin patterns, and naming convention changes (snake_case → camelCase). Pair with `dependency-mapping-ts.md` for gem → npm package equivalents, and `type-mapping-ts.md` for cross-language type reference.

## research

Deep Research prompt:

"Write a micro expert on converting Ruby to TypeScript. Cover: blocks to arrow functions, mixins to interfaces/composition, duck typing to structural typing, attr_accessor to class properties, symbol to string literals, hash options to typed parameters, metaprogramming alternatives, Enumerable methods to array methods, exception handling, truthiness differences, and naming convention conversion (snake_case to camelCase). Include 3 worked examples."
