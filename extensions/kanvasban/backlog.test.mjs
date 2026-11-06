import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { chmod, copyFile, mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { registerHooks } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { pathToFileURL } from 'node:url'
import { setTimeout } from 'node:timers/promises'

// The host supplies the SDK in production; tests need only its error contract.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '@github/copilot-sdk/extension') {
      return {
        shortCircuit: true,
        url: 'data:text/javascript,export class CanvasError extends Error { constructor(code, message) { super(message); this.code = code } }; export const createCanvas = config => config; export const joinSession = async config => { globalThis.__kanvasbanTestCanvas = config.canvases[0]; return { log: async () => {} } }',
      }
    }
    return nextResolve(specifier, context)
  },
})

async function fixture(t, homeMode = 'configured', existing = true) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'kanvasban-test-'))
  t.after(() => rm(directory, { recursive: true }))
  const previousHome = process.env.HOME
  const previousCopilotHome = process.env.COPILOT_HOME
  t.after(() => {
    if (previousHome === undefined) delete process.env.HOME
    else process.env.HOME = previousHome
    if (previousCopilotHome === undefined) delete process.env.COPILOT_HOME
    else process.env.COPILOT_HOME = previousCopilotHome
  })
  process.env.HOME = path.join(directory, 'home')
  if (homeMode === 'unset') delete process.env.COPILOT_HOME
  else process.env.COPILOT_HOME = homeMode === 'empty' ? '' : path.join(directory, 'configured-home')
  const copilotHome = homeMode === 'configured'
    ? process.env.COPILOT_HOME : path.join(process.env.HOME, '.copilot')
  for (const filename of ['backlog-store.mjs', 'live-updates.mjs']) {
    await copyFile(new URL(filename, import.meta.url), path.join(directory, filename))
  }
  const dataPath = path.join(copilotHome, 'extension-data', 'kanvasban', 'backlog.json')
  if (existing) {
    await mkdir(path.dirname(dataPath), { recursive: true })
    const now = new Date().toISOString()
    await writeFile(dataPath, JSON.stringify({
      format: 'kanvasban', version: 2, stories: [],
      projects: [{ id: 'default', name: 'Default project', description: '', createdAt: now, updatedAt: now }],
    }))
  }
  const store = await import(pathToFileURL(path.join(directory, 'backlog-store.mjs')).href)
  const live = await import(pathToFileURL(path.join(directory, 'live-updates.mjs')).href)
  return { store, live, dataPath, directory, copilotHome }
}

test('configured Copilot home shares one board across extension directories', async (t) => {
  const { store, dataPath, directory, copilotHome } = await fixture(t)
  assert.equal(dataPath, path.join(copilotHome, 'extension-data', 'kanvasban', 'backlog.json'))
  const peerDirectory = path.join(directory, 'another-workspace')
  await mkdir(peerDirectory)
  await copyFile(new URL('backlog-store.mjs', import.meta.url), path.join(peerDirectory, 'backlog-store.mjs'))
  await writeFile(path.join(directory, 'backlog.json'), 'Extension-adjacent data must not be used')
  const peer = await import(pathToFileURL(path.join(peerDirectory, 'backlog-store.mjs')).href)
  const created = await store.addStory({ title: 'Shared personal item' })
  assert.equal((await peer.readStories()).stories[0].id, created.id)
  await peer.updateStory({ id: created.id, status: 'ready' })
  assert.equal((await store.readStories()).stories[0].status, 'ready')
  assert.equal(await readFile(path.join(directory, 'backlog.json'), 'utf8'), 'Extension-adjacent data must not be used')
})

for (const homeMode of ['empty', 'unset']) {
  test(`${homeMode} COPILOT_HOME uses the default home directory`, async (t) => {
    const { store, dataPath } = await fixture(t, homeMode)
    await store.addStory({ title: 'Default home item' })
    const expectedPath = path.join(os.homedir(), '.copilot', 'extension-data', 'kanvasban', 'backlog.json')
    assert.equal(dataPath, expectedPath)
    assert.equal(JSON.parse(await readFile(expectedPath, 'utf8')).stories[0].title, 'Default home item')
  })
}

function assertSeed(data) {
  assert.equal(data.format, 'kanvasban')
  assert.equal(data.version, 2)
  assert.equal(data.projects.length, 1)
  assert.equal(data.projects[0].name, 'Hello world')
  assert.equal(data.stories.length, 2)
  const feature = data.stories.find((item) => item.type === 'feature')
  const story = data.stories.find((item) => item.type === 'user-story')
  assert.equal(feature.title, 'Hello world feature')
  assert.equal(feature.parentFeatureId, null)
  assert.equal(story.title, 'Hello world user story')
  assert.equal(story.parentFeatureId, feature.id)
  assert.equal(new Set([data.projects[0].id, feature.id, story.id]).size, 3)
  for (const entity of [...data.projects, ...data.stories]) {
    assert.match(entity.id, /^[0-9a-f-]{36}$/)
    assert.ok(!Number.isNaN(Date.parse(entity.createdAt)))
    assert.equal(entity.updatedAt, entity.createdAt)
  }
  for (const item of data.stories) {
    assert.equal(item.projectId, data.projects[0].id)
    assert.equal(item.status, 'backlog')
    assert.equal(item.priority, 'medium')
    assert.deepEqual(item.comments, [])
    assert.deepEqual(item.history, [])
  }
}

for (const homeMode of ['configured', 'empty', 'unset']) {
  test(`first read initializes only the Hello world seed with ${homeMode} COPILOT_HOME`, async (t) => {
    const { store, dataPath, directory } = await fixture(t, homeMode, false)
    const data = await store.readStories()
    assertSeed(data)
    const raw = await readFile(dataPath, 'utf8')
    assert.deepEqual(JSON.parse(raw), data)
    assert.deepEqual(await store.readStories(), data)
    assert.equal(await readFile(dataPath, 'utf8'), raw)
    assert.deepEqual(await readdir(path.dirname(dataPath)), ['backlog.json'])
    if (process.platform !== 'win32') assert.equal((await stat(dataPath)).mode & 0o777, 0o600)
    const peerPath = path.join(directory, 'restarted-store.mjs')
    await copyFile(new URL('backlog-store.mjs', import.meta.url), peerPath)
    const restarted = await import(pathToFileURL(peerPath).href)
    assert.deepEqual(await restarted.readStories(), data)
    assert.equal(await readFile(dataPath, 'utf8'), raw)
  })
}

test('first mutation initializes the seed and persists the requested change', async (t) => {
  const { store, dataPath } = await fixture(t, 'configured', false)
  const added = await store.addStory({ title: 'First real item' })
  const data = await store.readStories()
  assert.equal(data.stories.length, 3)
  assert.equal(added.projectId, data.projects[0].id)
  assert.equal(data.stories.at(-1).id, added.id)
  assertSeed({ ...data, stories: data.stories.slice(0, 2) })
  assert.deepEqual(JSON.parse(await readFile(dataPath, 'utf8')), data)
})

test('concurrent fresh-store readers and writers share one seed without losing writes', async (t) => {
  const { store, dataPath, directory } = await fixture(t, 'configured', false)
  const peerPath = path.join(directory, 'peer-store.mjs')
  await copyFile(new URL('backlog-store.mjs', import.meta.url), peerPath)
  const peer = await import(pathToFileURL(peerPath).href)
  const results = await Promise.all(Array.from({ length: 12 }, (_, index) => {
    const client = index % 2 ? store : peer
    return index % 3 ? client.readStories() : client.addStory({ title: `Concurrent item ${index}` })
  }))
  const data = await store.readStories()
  assertSeed({ ...data, stories: data.stories.slice(0, 2) })
  assert.equal(data.stories.length, 6)
  for (const result of results) {
    if (result.projects) assert.equal(result.projects[0].id, data.projects[0].id)
    else assert.ok(data.stories.some((item) => item.id === result.id))
  }
  assert.deepEqual(await readdir(path.dirname(dataPath)), ['backlog.json'])
})

test('existing empty projects and populated boards are never reseeded or rewritten by reads', async (t) => {
  const { store, dataPath } = await fixture(t)
  const empty = await readFile(dataPath, 'utf8')
  assert.equal((await store.readStories()).stories.length, 0)
  assert.equal(await readFile(dataPath, 'utf8'), empty)
  const story = await store.addStory({ title: 'Keep existing work' })
  const populated = await readFile(dataPath, 'utf8')
  assert.deepEqual((await store.readStories()).stories, [story])
  assert.equal(await readFile(dataPath, 'utf8'), populated)
  await store.deleteStory(story.id)
  assert.equal((await store.readStories()).stories.length, 0)
})

test('invalid first mutations leave no partial store or lock behind', async (t) => {
  const { store, dataPath } = await fixture(t, 'configured', false)
  await assert.rejects(store.addStory({ title: 'Invalid', projectId: 'missing' }), { code: 'INVALID_INPUT' })
  assert.deepEqual(await readdir(path.dirname(dataPath)), [])
  assertSeed(await store.readStories())
})

test('malformed JSON is not mistaken for a missing store', async (t) => {
  const { store, dataPath } = await fixture(t)
  const raw = '{invalid JSON'
  await writeFile(dataPath, raw)
  await assert.rejects(store.readStories(), { code: 'CORRUPT_DATA' })
  await assert.rejects(store.addStory({ title: 'Do not overwrite' }), { code: 'CORRUPT_DATA' })
  assert.equal(await readFile(dataPath, 'utf8'), raw)
  assert.deepEqual(await readdir(path.dirname(dataPath)), ['backlog.json'])
})

test('unreadable stores are not reinitialized', { skip: process.platform === 'win32' || process.getuid?.() === 0 }, async (t) => {
  const { store, dataPath } = await fixture(t)
  const raw = await readFile(dataPath, 'utf8')
  await chmod(dataPath, 0o000)
  try {
    await assert.rejects(store.readStories(), { code: 'STORAGE_ERROR' })
    await assert.rejects(store.addStory({ title: 'Do not overwrite' }), { code: 'STORAGE_ERROR' })
  } finally {
    await chmod(dataPath, 0o600)
  }
  assert.equal(await readFile(dataPath, 'utf8'), raw)
  assert.deepEqual(await readdir(path.dirname(dataPath)), ['backlog.json'])
})

test('an invalid data directory reports storage errors for reads and writes', async (t) => {
  const { store, dataPath } = await fixture(t)
  await rm(path.dirname(dataPath), { recursive: true })
  await writeFile(path.dirname(dataPath), 'Not a directory')
  await assert.rejects(store.readStories(), { code: 'STORAGE_ERROR' })
  await assert.rejects(store.addStory({ title: 'Do not save' }), { code: 'STORAGE_ERROR' })
})

async function waitFor(predicate) {
  const deadline = Date.now() + 4000
  while (!predicate()) {
    assert.ok(Date.now() < deadline, 'Timed out waiting for stream update')
    await setTimeout(25)
  }
}

function response(t) {
  const result = new EventEmitter()
  result.frames = []
  result.writeHead = (status, headers) => {
    assert.equal(status, 200)
    assert.equal(headers['content-type'], 'text/event-stream')
  }
  result.flushHeaders = () => {}
  result.write = (frame) => result.frames.push(frame)
  t.after(() => result.emit('close'))
  return result
}

test('concurrent mutations preserve every story and independent field update', async (t) => {
  const { store } = await fixture(t)
  const stories = await Promise.all(Array.from({ length: 12 }, (_, i) => store.addStory({ title: `Story ${i}` })))
  assert.equal((await store.readStories()).stories.length, 12)
  await Promise.all([
    store.updateStory({ id: stories[0].id, priority: 'high' }),
    store.updateStory({ id: stories[0].id, status: 'done' }),
  ])
  const updated = (await store.readStories()).stories.find((story) => story.id === stories[0].id)
  assert.equal(updated.priority, 'high')
  assert.equal(updated.status, 'done')
})

test('corrupt data is reported without overwriting it or leaking a lock', async (t) => {
  const { store, dataPath } = await fixture(t)
  await writeFile(dataPath, '{"format":"unknown"}')
  await assert.rejects(store.addStory({ title: 'Do not save' }), { code: 'CORRUPT_DATA' })
  assert.equal(await readFile(dataPath, 'utf8'), '{"format":"unknown"}')
  await assert.rejects(readFile(`${dataPath}.lock`), { code: 'ENOENT' })
})

test('unsupported data versions are reported without being rewritten', async (t) => {
  const { store, dataPath } = await fixture(t)
  const raw = JSON.stringify({ format: 'kanvasban', version: 1, stories: [] })
  await writeFile(dataPath, raw)
  await assert.rejects(store.readStories(), { code: 'CORRUPT_DATA' })
  await assert.rejects(store.addStory({ title: 'Do not save' }), { code: 'CORRUPT_DATA' })
  assert.equal(await readFile(dataPath, 'utf8'), raw)
})

test('project creation, editing, references, and ordering are isolated', async (t) => {
  const { store, dataPath } = await fixture(t)
  const initial = await store.readStories()
  const firstProject = initial.projects[0]
  const secondProject = await store.createProject({ name: '  Another project  ', description: '  Purpose  ' })
  assert.equal(secondProject.name, 'Another project')
  assert.equal(secondProject.description, 'Purpose')
  const first = await store.addStory({ projectId: firstProject.id, title: 'First', type: 'feature' })
  const second = await store.addStory({ projectId: secondProject.id, title: 'Second', type: 'feature' })
  const child = await store.addStory({ projectId: secondProject.id, title: 'Child', parentFeatureId: second.id })
  const before = await readFile(dataPath, 'utf8')
  for (const operation of [
    () => store.addStory({ title: 'Ambiguous' }),
    () => store.addStory({ title: 'Unknown', projectId: 'missing' }),
    () => store.addStory({ title: 'Cross project', projectId: firstProject.id, parentFeatureId: second.id }),
    () => store.updateStory({ id: child.id, parentFeatureId: first.id }),
    () => store.reorderStory({ id: child.id, beforeId: first.id }),
    () => store.createProject({ name: ' ' }),
    () => store.updateProject({ id: secondProject.id, name: 'x'.repeat(101) }),
  ]) {
    await assert.rejects(operation(), { code: 'INVALID_INPUT' })
    assert.equal(await readFile(dataPath, 'utf8'), before)
  }
  await store.updateProject({ id: secondProject.id, name: 'Renamed', description: 'New purpose' })
  await store.reorderStory({ id: child.id, beforeId: second.id })
  const data = await store.readStories()
  assert.equal(data.projects.find((project) => project.id === secondProject.id).name, 'Renamed')
  assert.deepEqual(data.stories.filter((story) => story.projectId === secondProject.id).map((story) => story.id), [child.id, second.id])
  assert.equal(data.stories.find((story) => story.id === first.id).projectId, firstProject.id)
  await assert.rejects(store.updateProject({ id: 'missing', name: 'Missing' }), { code: 'NOT_FOUND' })
})

test('project updates stream to both clients, and corrupt project references are rejected', async (t) => {
  const { store, live, dataPath } = await fixture(t)
  const initial = await store.readStories()
  const clients = [response(t), response(t)]
  for (const client of clients) live.streamStories(client)
  await waitFor(() => clients.every((client) => client.frames.some((frame) => frame.includes('Default project'))))
  await store.updateProject({ id: initial.projects[0].id, name: 'Renamed project' })
  await waitFor(() => clients.every((client) => client.frames.some((frame) => frame.includes('Renamed project'))))
  await store.addStory({ title: 'Original' })
  const valid = await readFile(dataPath, 'utf8')
  const data = JSON.parse(valid)
  data.stories[0].projectId = 'missing'
  await writeFile(dataPath, JSON.stringify(data))
  await assert.rejects(store.readStories(), { code: 'CORRUPT_DATA' })
  await writeFile(dataPath, valid)
  data.stories[0].projectId = initial.projects[0].id
  data.projects.push({ ...data.projects[0] })
  await writeFile(dataPath, JSON.stringify(data))
  await assert.rejects(store.readStories(), { code: 'CORRUPT_DATA' })
})

test('HTTP and agent project actions preserve project scoping', async (t) => {
  const { directory } = await fixture(t)
  for (const filename of ['extension.mjs', 'index.html', 'card-details.mjs']) {
    await copyFile(new URL(filename, import.meta.url), path.join(directory, filename))
  }
  await import(pathToFileURL(path.join(directory, 'extension.mjs')).href)
  const canvas = globalThis.__kanvasbanTestCanvas
  const { url } = await canvas.open({ instanceId: 'test' })
  t.after(() => canvas.onClose({ instanceId: 'test' }))
  const html = await (await fetch(url)).text()
  const supportLink = html.match(/<a class="kofi-link"[^>]*>/)?.[0]
  assert.ok(supportLink)
  assert.match(supportLink, /href="https:\/\/ko-fi.com\/johnny888"/)
  assert.doesNotMatch(supportLink, /\btarget=/)
  assert.match(html, /<svg class="kofi-icon"[^>]*><image [^>]*href="data:image\/png;base64,/)
  assert.doesNotMatch(html, /storage\.ko-fi\.com/)
  assert.doesNotMatch(html, /<script[^>]+src="https?:/)
  const action = (name, input) => canvas.actions.find((action) => action.name === name).handler({ input })
  const projects = await action('listProjects')
  const created = await action('createProject', { name: 'Agent project' })
  const story = await action('addStory', { projectId: created.id, title: 'Scoped' })
  assert.equal(story.projectId, created.id)
  assert.deepEqual(await action('listStories', { projectId: projects[0].id }), [])
  assert.equal((await action('listStories', { projectId: created.id }))[0].id, story.id)
  await assert.rejects(action('listStories', { projectId: 'missing' }), { code: 'NOT_FOUND' })
  await action('updateProject', { id: created.id, name: 'Agent renamed' })
  let result = await fetch(`${url}api/projects`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Human project', description: 'Details' }),
  })
  assert.equal(result.status, 201)
  const human = (await result.json()).project
  result = await fetch(`${url}api/projects/${human.id}`, {
    method: 'PATCH', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Human renamed', description: 'Edited' }),
  })
  assert.equal(result.status, 200)
  assert.equal((await result.json()).project.name, 'Human renamed')
  result = await fetch(`${url}api/stories/${story.id}`, {
    method: 'PATCH', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ archived: true, actor: 'Human' }),
  })
  assert.equal(result.status, 200)
  assert.ok((await result.json()).story.archivedAt)
  assert.ok((await action('listStories', { projectId: created.id }))[0].archivedAt)
  assert.equal((await action('updateStory', { id: story.id, archived: false })).archivedAt, null)
  result = await fetch(`${url}api/stories/${story.id}`, {
    method: 'PATCH', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ archived: 'yes' }),
  })
  assert.equal(result.status, 400)
  result = await fetch(`${url}api/projects`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: ' ' }),
  })
  assert.equal(result.status, 400)
  const snapshot = await (await fetch(`${url}api/stories`)).json()
  assert.equal(snapshot.projects.length, 3)
  assert.equal(snapshot.stories[0].projectId, created.id)
  assert.equal((await canvas.open({ instanceId: 'test' })).url, url)
})

test('opening a fresh canvas initializes the same board for HTTP and agent actions', async (t) => {
  const { directory, dataPath } = await fixture(t, 'configured', false)
  for (const filename of ['extension.mjs', 'index.html', 'card-details.mjs']) {
    await copyFile(new URL(filename, import.meta.url), path.join(directory, filename))
  }
  await import(pathToFileURL(path.join(directory, 'extension.mjs')).href)
  const canvas = globalThis.__kanvasbanTestCanvas
  const { url } = await canvas.open({ instanceId: 'fresh' })
  t.after(() => canvas.onClose({ instanceId: 'fresh' }))
  const snapshot = await (await fetch(`${url}api/stories`)).json()
  assertSeed({ format: 'kanvasban', version: 2, ...snapshot })
  const action = (name, input) => canvas.actions.find((entry) => entry.name === name).handler({ input })
  assert.deepEqual(await action('listProjects'), snapshot.projects)
  assert.deepEqual(await action('listStories', { projectId: snapshot.projects[0].id }), snapshot.stories)
  await action('updateStory', { id: snapshot.stories[1].id, status: 'ready' })
  assert.equal(JSON.parse(await readFile(dataPath, 'utf8')).stories[1].status, 'ready')
  assert.equal((await canvas.open({ instanceId: 'fresh' })).url, url)
})

test('fresh live streams initialize one seed and receive subsequent changes', async (t) => {
  const { store, live, dataPath } = await fixture(t, 'configured', false)
  const clients = [response(t), response(t)]
  for (const client of clients) live.streamStories(client)
  await waitFor(() => clients.every((client) => client.frames.some((frame) => frame.startsWith('event: stories'))))
  for (const client of clients) {
    const snapshot = JSON.parse(client.frames.find((frame) => frame.startsWith('event: stories')).split('data: ')[1])
    assertSeed({ format: 'kanvasban', version: 2, ...snapshot })
    assert.ok(!client.frames.some((frame) => frame.startsWith('event: storage-error')))
  }
  const added = await store.addStory({ title: 'Live first-run change' })
  await waitFor(() => clients.every((client) => client.frames.some((frame) => frame.includes(added.id))))
  assert.deepEqual(await readdir(path.dirname(dataPath)), ['backlog.json'])
})

test('archiving preserves items, relationships, status and history and can be reversed', async (t) => {
  const { store, dataPath } = await fixture(t)
  const feature = await store.addStory({ title: 'Parent', type: 'feature' })
  const child = await store.addStory({ title: 'Child', parentFeatureId: feature.id })
  const archived = await store.updateStory({ id: feature.id, archived: true, actor: 'Human' })
  assert.ok(!Number.isNaN(Date.parse(archived.archivedAt)))
  assert.equal(archived.status, feature.status)
  assert.equal(archived.history.at(-1).action, 'archived')
  const data = await store.readStories()
  assert.equal(data.stories.length, 2)
  assert.deepEqual(data.stories.find((item) => item.id === child.id), child)
  assert.equal((await store.updateStory({ id: feature.id, archived: true })).history.length, archived.history.length)
  const restored = await store.updateStory({ id: feature.id, archived: false })
  assert.equal(restored.archivedAt, null)
  assert.equal(restored.history.at(-1).action, 'restored')
  const before = await readFile(dataPath, 'utf8')
  await assert.rejects(store.updateStory({ id: feature.id, archived: 'true' }), { code: 'INVALID_INPUT' })
  assert.equal(await readFile(dataPath, 'utf8'), before)
  const corrupt = JSON.parse(before)
  corrupt.stories[0].archivedAt = 'not a timestamp'
  await writeFile(dataPath, JSON.stringify(corrupt))
  await assert.rejects(store.readStories(), { code: 'CORRUPT_DATA' })
})

test('manual order persists across types, columns, comments, and concurrent edits', async (t) => {
  const { store, dataPath } = await fixture(t)
  const first = await store.addStory({ title: 'First' })
  const feature = await store.addStory({ title: 'Feature', type: 'feature' })
  const child = await store.addStory({ title: 'Child', parentFeatureId: feature.id })
  const last = await store.addStory({ title: 'Last' })
  const ids = async (status = 'backlog') => (await store.readStories()).stories
    .filter((item) => item.status === status).map((item) => item.id)
  await store.reorderStory({ id: child.id, beforeId: first.id, actor: 'Developer' })
  assert.deepEqual(await ids(), [child.id, first.id, feature.id, last.id])
  await store.reorderStory({ id: child.id, beforeId: null })
  assert.deepEqual(await ids(), [first.id, feature.id, last.id, child.id])
  await Promise.all([
    store.reorderStory({ id: last.id, beforeId: feature.id }),
    store.updateStory({ id: last.id, title: 'Renamed' }),
    store.changeComment({ id: last.id, operation: 'add', body: 'Keep order' }),
  ])
  assert.deepEqual(await ids(), [first.id, last.id, feature.id, child.id])
  await store.reorderStory({ id: first.id, beforeId: null, status: 'ready' })
  await store.reorderStory({ id: child.id, beforeId: first.id, status: 'ready' })
  assert.deepEqual(await ids('ready'), [child.id, first.id])
  assert.deepEqual(await ids(), [last.id, feature.id])
  const persisted = JSON.parse(await readFile(dataPath, 'utf8')).stories
  assert.equal(persisted.find((item) => item.id === last.id).title, 'Renamed')
  const savedChild = persisted.find((item) => item.id === child.id)
  assert.equal(savedChild.parentFeatureId, feature.id)
  assert.equal(savedChild.history[1].actor, 'Developer')
  assert.equal(savedChild.history.at(-1).action, 'reordered')
  const historyLength = savedChild.history.length
  await store.reorderStory({ id: child.id, beforeId: first.id })
  assert.equal((await store.readStories()).stories.find((item) => item.id === child.id).history.length, historyLength)
})

test('invalid reorder targets leave stored order and status unchanged', async (t) => {
  const { store, dataPath } = await fixture(t)
  const first = await store.addStory({ title: 'First' })
  const second = await store.addStory({ title: 'Second' })
  await store.updateStory({ id: second.id, status: 'ready' })
  const original = await readFile(dataPath, 'utf8')
  for (const input of [
    { id: first.id },
    { id: first.id, beforeId: '' },
    { id: first.id, beforeId: 'missing' },
    { id: first.id, beforeId: first.id },
    { id: first.id, beforeId: second.id },
    { id: first.id, beforeId: null, status: 'invalid' },
  ]) {
    await assert.rejects(store.reorderStory(input), { code: 'INVALID_INPUT' })
    assert.equal(await readFile(dataPath, 'utf8'), original)
  }
  await assert.rejects(store.reorderStory({ id: 'missing', beforeId: null }), { code: 'NOT_FOUND' })
  assert.equal(await readFile(dataPath, 'utf8'), original)
})

test('reordering notifies both live clients in canonical order', async (t) => {
  const { store, live } = await fixture(t)
  const first = await store.addStory({ title: 'First' })
  const second = await store.addStory({ title: 'Second' })
  const clients = [response(t), response(t)]
  for (const client of clients) live.streamStories(client)
  await waitFor(() => clients.every((client) => client.frames.some((frame) => frame.includes(first.id))))
  await store.reorderStory({ id: second.id, beforeId: first.id })
  await waitFor(() => clients.every((client) => {
    const frame = client.frames.filter((frame) => frame.startsWith('event: stories')).at(-1)
    return frame && JSON.parse(frame.split('data: ')[1]).stories[0].id === second.id
  }))
})

test('comments and history capture human and agent edits and preserve soft-deleted text in history', async (t) => {
  const { store } = await fixture(t)
  const story = await store.addStory({ title: 'Activity', actor: 'Agent' })
  await store.updateStory({ id: story.id, status: 'ready', actor: 'Myself' })
  await store.updateStory({ id: story.id, status: 'ready' })
  const comment = await store.changeComment({ id: story.id, operation: 'add', body: 'First' })
  await store.changeComment({ id: story.id, operation: 'edit', commentId: comment.id, body: 'Updated', actor: 'Agent' })
  await store.changeComment({ id: story.id, operation: 'delete', commentId: comment.id, actor: 'Myself' })
  const item = (await store.readStories()).stories[0]
  assert.equal(item.comments[0].author, 'Human')
  assert.equal(item.comments[0].body, '')
  assert.ok(item.comments[0].deletedAt)
  assert.deepEqual(item.history.map((event) => event.action), ['created', 'updated', 'comment-added', 'comment-edited', 'comment-deleted'])
  assert.deepEqual(item.history[1].changes, [{ field: 'status', before: 'backlog', after: 'ready' }])
  assert.equal(item.history.at(-1).changes[0].before, 'Updated')
  await assert.rejects(store.changeComment({ id: story.id, operation: 'edit', commentId: comment.id, body: 'No' }), { code: 'NOT_FOUND' })
  await assert.rejects(store.changeComment({ id: story.id, operation: 'add', body: ' ' }), { code: 'INVALID_INPUT' })
})

test('legacy stories load as standalone user stories without losing stored fields', async (t) => {
  const { store, dataPath } = await fixture(t)
  const story = await store.addStory({ title: 'Existing story', description: 'Keep me' })
  const data = JSON.parse(await readFile(dataPath, 'utf8'))
  delete data.stories[0].type
  delete data.stories[0].parentFeatureId
  await writeFile(dataPath, JSON.stringify(data))
  const loaded = (await store.readStories()).stories[0]
  assert.deepEqual(loaded, story)
  assert.equal(loaded.type, 'user-story')
  assert.equal(loaded.parentFeatureId, null)
  await store.updateStory({ id: story.id, status: 'ready' })
  assert.equal(JSON.parse(await readFile(dataPath, 'utf8')).stories[0].type, 'user-story')
})

test('Features have optional child stories and cancellation preserves the hierarchy', async (t) => {
  const { store } = await fixture(t)
  const feature = await store.addStory({ title: 'Feature', type: 'feature' })
  const child = await store.addStory({ title: 'Child', parentFeatureId: feature.id })
  const standalone = await store.addStory({ title: 'Standalone' })
  assert.equal(child.type, 'user-story')
  assert.equal(standalone.parentFeatureId, null)
  for (const status of ['ready', 'in-progress', 'done', 'cancelled', 'backlog']) {
    assert.equal((await store.updateStory({ id: child.id, status })).status, status)
  }
  await store.updateStory({ id: feature.id, status: 'cancelled' })
  const items = (await store.readStories()).stories
  assert.equal(items.length, 3)
  assert.equal(items.find((item) => item.id === child.id).parentFeatureId, feature.id)
  assert.equal(items.find((item) => item.id === child.id).status, 'backlog')
  await store.updateStory({ id: child.id, parentFeatureId: null })
  assert.equal((await store.readStories()).stories.find((item) => item.id === child.id).parentFeatureId, null)
})

test('invalid hierarchy edits, type changes and statuses never overwrite valid data', async (t) => {
  const { store, dataPath } = await fixture(t)
  const feature = await store.addStory({ title: 'Feature', type: 'feature' })
  const child = await store.addStory({ title: 'Child', parentFeatureId: feature.id })
  const original = await readFile(dataPath, 'utf8')
  const invalid = [
    () => store.addStory({ title: 'Missing parent', parentFeatureId: 'missing' }),
    () => store.addStory({ title: 'Wrong parent', parentFeatureId: child.id }),
    () => store.addStory({ title: 'Nested feature', type: 'feature', parentFeatureId: feature.id }),
    () => store.addStory({ title: 'Wrong type', type: 'bug' }),
    () => store.updateStory({ id: feature.id, type: 'user-story' }),
    () => store.updateStory({ id: child.id, parentFeatureId: child.id }),
    () => store.updateStory({ id: child.id, type: 'feature' }),
    () => store.updateStory({ id: child.id, status: 'invalid' }),
    () => store.deleteStory(feature.id),
  ]
  for (const operation of invalid) {
    await assert.rejects(operation(), { code: 'INVALID_INPUT' })
    assert.equal(await readFile(dataPath, 'utf8'), original)
  }
  const converted = await store.updateStory({ id: child.id, type: 'feature', parentFeatureId: null })
  assert.equal(converted.type, 'feature')
})

test('live streams send initial state, agent writes, external writes, errors, and recovery', async (t) => {
  const { store, live, dataPath } = await fixture(t)
  const first = response(t)
  const second = response(t)
  live.streamStories(first)
  live.streamStories(second)
  await waitFor(() => first.frames.some((frame) => frame.includes('"stories":[]')))
  await store.addStory({ title: 'Agent update' })
  await waitFor(() => [first, second].every((client) => client.frames.some((frame) => frame.includes('Agent update'))))
  const valid = await readFile(dataPath, 'utf8')
  await writeFile(dataPath, 'invalid')
  await waitFor(() => first.frames.some((frame) => frame.includes('event: storage-error')))
  const external = JSON.parse(valid)
  external.stories[0].title = 'External update'
  await writeFile(dataPath, JSON.stringify(external))
  await waitFor(() => [first, second].every((client) => client.frames.some((frame) => frame.includes('External update'))))
  const reconnected = response(t)
  live.streamStories(reconnected)
  await waitFor(() => reconnected.frames.some((frame) => frame.includes('External update')))
  first.emit('close')
  const count = first.frames.length
  await store.deleteStory(external.stories[0].id)
  await waitFor(() => second.frames.at(-1).includes('"stories":[]'))
  assert.equal(first.frames.length, count)
})
