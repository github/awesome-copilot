# Architecture & Patterns Reference

Web application architectures, design patterns, and architectural concepts.

## Application Architectures

### Single Page Application (SPA)

Web app that loads single HTML page and dynamically updates content.

**Characteristics**:
- Client-side routing
- Heavy JavaScript usage
- Fast navigation after initial load
- Complex state management

**Pros**:
- Smooth user experience
- Reduced server load
- Mobile app-like feel

**Cons**:
- Larger initial download
- SEO challenges (mitigated with SSR)
- Complex state management

**Examples**: React, Vue, Angular apps

```javascript
// React Router example
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/products/:id" element={<Product />} />
      </Routes>
    </BrowserRouter>
  );
}
```

### Multi-Page Application (MPA)

Traditional web app with multiple HTML pages.

**Characteristics**:
- Server renders each page
- Full page reload on navigation
- Simpler architecture

**Pros**:
- Better SEO out of the box
- Simpler to build
- Good for content-heavy sites

**Cons**:
- Slower navigation
- More server requests

### Progressive Web App (PWA)

Web app with native app capabilities.

**Features**:
- Installable
- Offline support (Service Workers)
- Push notifications
- App-like experience

```javascript
// Service Worker registration
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(reg => console.log('SW registered', reg))
    .catch(err => console.error('SW error', err));
}
```

**manifest.json**:
```json
{
  "name": "My PWA",
  "short_name": "PWA",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    }
  ]
}
```

### Server-Side Rendering (SSR)

Render pages on server, send HTML to client.

**Pros**:
- Better SEO
- Faster first contentful paint
- Works without JavaScript

**Cons**:
- Higher server load
- More complex setup

**Frameworks**: Next.js, Nuxt.js, SvelteKit

```javascript
// Next.js SSR
export async function getServerSideProps() {
  const data = await fetchData();
  return { props: { data } };
}

function Page({ data }) {
  return <div>{data.title}</div>;
}
```

### Static Site Generation (SSG)

Pre-render pages at build time.

**Pros**:
- Extremely fast
- Low server cost
- Great SEO

**Best for**: Blogs, documentation, marketing sites

**Tools**: Next.js, Gatsby, Hugo, Jekyll, Eleventy

```javascript
// Next.js SSG
export async function getStaticProps() {
  const data = await fetchData();
  return { props: { data } };
}

export async function getStaticPaths() {
  const paths = await fetchPaths();
  return { paths, fallback: false };
}
```

### Incremental Static Regeneration (ISR)

Update static content after build.

```javascript
// Next.js ISR
export async function getStaticProps() {
  const data = await fetchData();
  return {
    props: { data },
    revalidate: 60 // Revalidate every 60 seconds
  };
}
```

### JAMstack

JavaScript, APIs, Markup architecture.

**Principles**:
- Pre-rendered static files
- APIs for dynamic functionality
- Git-based workflows
- CDN deployment

**Benefits**:
- Fast performance
- High security
- Scalability
- Developer experience

## Rendering Patterns

### Client-Side Rendering (CSR)

JavaScript renders content in browser.

```html
<div id="root"></div>
<script>
  // React renders app here
  ReactDOM.render(<App />, document.getElementById('root'));
</script>
```

### Hydration

Attach JavaScript to server-rendered HTML.

```javascript
// React hydration
ReactDOM.hydrate(<App />, document.getElementById('root'));
```

### Partial Hydration

Hydrate only interactive components.

**Tools**: Astro, Qwik

### Islands Architecture

Independent interactive components in static HTML.

**Concept**: Ship minimal JavaScript, hydrate only "islands" of interactivity

**Frameworks**: Astro, Eleventy with Islands

## Design Patterns

### MVC (Model-View-Controller)

Separate data, presentation, and logic.

- **Model**: Data and business logic
- **View**: UI presentation
- **Controller**: Handle input, update model/view

### MVVM (Model-View-ViewModel)

Similar to MVC with data binding.

- **Model**: Data
- **View**: UI
- **ViewModel**: View logic and state

**Used in**: Vue.js, Angular, Knockout

### Component-Based Architecture

Build UI from reusable components.

```javascript
// React component
function Button({ onClick, children }) {
  return (
    <button onClick={onClick} className="btn">
      {children}
    </button>
  );
}

// Usage
<Button onClick={handleClick}>Click me</Button>
```

### Micro Frontends

Split frontend into smaller, independent apps.

**Approaches**:
- Build-time integration
- Run-time integration (iframes, Web Components)
- Edge-side includes

## State Management

### Local State

Component-level state.

```javascript
// React useState
function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

### Global State

Application-wide state.

**Solutions**:
- **Redux**: Predictable state container
- **MobX**: Observable state
- **Zustand**: Minimal state management
- **Recoil**: Atomic state management

```javascript
// Redux example
import { createSlice, configureStore } from '@reduxjs/toolkit';

const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0 },
  reducers: {
    increment: state => { state.value += 1; }
  }
});

const store = configureStore({
  reducer: { counter: counterSlice.reducer }
});
```

### Context API

Share state without prop drilling.

```javascript
// React Context
const ThemeContext = React.createContext('light');

function App() {
  return (
    <ThemeContext.Provider value="dark">
      <Toolbar />
    </ThemeContext.Provider>
  );
}

function Toolbar() {
  const theme = useContext(ThemeContext);
  return <div className={theme}>...</div>;
}
```

## API Architecture Patterns

### REST (Representational State Transfer)

Resource-based API design.

```javascript
// RESTful API
GET    /api/users      // List users
GET    /api/users/1    // Get user
POST   /api/users      // Create user
PUT    /api/users/1    // Update user
DELETE /api/users/1    // Delete user
```

### GraphQL

Query language for APIs.

```graphql
# Query
query {
  user(id: "1") {
    name
    email
    posts {
      title
    }
  }
}

# Mutation
mutation {
  createUser(name: "John", email: "john@example.com") {
    id
    name
  }
}
```

```javascript
// Apollo Client
import { useQuery, gql } from '@apollo/client';

const GET_USER = gql`
  query GetUser($id: ID!) {
    user(id: $id) {
      name
      email
    }
  }
`;

function User({ id }) {
  const { loading, error, data } = useQuery(GET_USER, {
    variables: { id }
  });
  
  if (loading) return <p>Loading...</p>;
  return <p>{data.user.name}</p>;
}
```

### tRPC

End-to-end typesafe APIs.

```typescript
// Server
const appRouter = router({
  getUser: publicProcedure
    .input(z.string())
    .query(async ({ input }) => {
      return await db.user.findUnique({ where: { id: input } });
    })
});

// Client (fully typed!)
const user = await trpc.getUser.query('1');
```

## Microservices Architecture

Split application into small, independent services.

**Characteristics**:
- Independent deployment
- Service-specific databases
- API communication
- Decentralized governance

**Benefits**:
- Scalability
- Technology flexibility
- Fault isolation

**Challenges**:
- Complexity
- Network latency
- Data consistency

## Monolithic Architecture

Single, unified application.

**Pros**:
- Simpler development
- Easier debugging
- Single deployment

**Cons**:
- Scaling challenges
- Technology lock-in
- Tight coupling

## Serverless Architecture

Run code without managing servers.

**Platforms**: AWS Lambda, Vercel Functions, Netlify Functions, Cloudflare Workers

```javascript
// Vercel serverless function
export default function handler(req, res) {
  res.status(200).json({ message: 'Hello from serverless!' });
}
```

**Benefits**:
- Auto-scaling
- Pay per use
- No server management

**Use Cases**:
- APIs
- Background jobs
- Webhooks
- Image processing

## Architectural Best Practices

### Separation of Concerns

Keep different aspects separate:
- Presentation layer
- Business logic layer
- Data access layer

### DRY (Don't Repeat Yourself)

Avoid code duplication.

### SOLID Principles

- **S**ingle Responsibility
- **O**pen/Closed
- **L**iskov Substitution
- **I**nterface Segregation
- **D**ependency Inversion

### Composition over Inheritance

Prefer composing objects over class hierarchies.

```javascript
// Composition
function withLogging(Component) {
  return function LoggedComponent(props) {
    console.log('Rendering', Component.name);
    return <Component {...props} />;
  };
}

const LoggedButton = withLogging(Button);
```

## Module Systems

### ES Modules (ESM)

Modern JavaScript modules.

```javascript
// export
export const name = 'John';
export function greet() {}
export default App;

// import
import App from './App.js';
import { name, greet } from './utils.js';
import * as utils from './utils.js';
```

### CommonJS

Node.js module system.

```javascript
// export
module.exports = { name: 'John' };
exports.greet = function() {};

// import
const { name } = require('./utils');
```

## Build Optimization

### Code Splitting

Split code into smaller chunks.

```javascript
// React lazy loading
const OtherComponent = React.lazy(() => import('./OtherComponent'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OtherComponent />
    </Suspense>
  );
}
```

### Tree Shaking

Remove unused code.

```javascript
// Only imports 'map', not entire lodash
import { map } from 'lodash-es';
```

### Bundle Splitting

- **Vendor bundle**: Third-party dependencies
- **App bundle**: Application code
- **Route bundles**: Per-route code

## Glossary Terms

**Key Terms Covered**:
- Abstraction
- API
- Application
- Architecture
- Asynchronous
- Binding
- Block (CSS, JS)
- Call stack
- Class
- Client-side
- Control flow
- Delta
- Design pattern
- Event
- Fetch
- First-class Function
- Function
- Garbage collection
- Grid
- Hoisting
- Hydration
- Idempotent
- Instance
- Lazy load
- Main thread
- MVC
- MVC
- Polyfill
- Progressive Enhancement
- Progressive web apps
- Property
- Prototype
- Prototype-based programming
- REST
- Reflow
- Round Trip Time (RTT)
- SPA
- Semantics
- Server
- Synthetic monitoring
- Thread
- Type

## Additional Resources

- [Patterns.dev](https://www.patterns.dev/)
- [React Patterns](https://reactpatterns.com/)
- [JAMstack](https://jamstack.org/)
- [Micro Frontends](https://micro-frontends.org/)
