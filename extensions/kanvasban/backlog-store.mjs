import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, rmdir, unlink, writeFile } from 'node:fs/promises'
import { setTimeout } from 'node:timers/promises'
import path from 'node:path'
import os from 'node:os'
import { CanvasError } from '@github/copilot-sdk/extension'

const dataPath = path.join(
  process.env.COPILOT_HOME || path.join(os.homedir(), '.copilot'),
  'extension-data', 'kanvasban', 'backlog.json',
)
const format = 'kanvasban'
const priorities = new Set(['low', 'medium', 'high'])
export const statuses = ['backlog', 'ready', 'in-progress', 'done', 'cancelled']
export const itemTypes = ['user-story', 'feature']
const validDate = (value) => typeof value === 'string' && !Number.isNaN(Date.parse(value))
const validText = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.length <= max
const validValue = (value) => value === null || typeof value === 'string'

function validActivity(story) {
  return (story.comments === undefined || (Array.isArray(story.comments)
    && new Set(story.comments.map((comment) => comment?.id)).size === story.comments.length
    && story.comments.every((comment) => comment && validText(comment.id, 100)
      && validText(comment.author, 100) && typeof comment.body === 'string' && comment.body.length <= 4000
      && (comment.deletedAt === null ? comment.body.trim().length > 0 : validDate(comment.deletedAt))
      && validDate(comment.createdAt) && validDate(comment.updatedAt))))
    && (story.history === undefined || (Array.isArray(story.history)
      && story.history.every((entry) => entry && validText(entry.id, 100)
        && validText(entry.actor, 100) && validDate(entry.at) && validText(entry.action, 100)
        && Array.isArray(entry.changes) && entry.changes.every((change) => change
          && validText(change.field, 100) && validValue(change.before) && validValue(change.after)))))
}

function actorName(value) {
  if (value === undefined) return 'Human'
  if (!validText(value, 100)) fail('INVALID_INPUT', 'Author must contain 1 to 100 characters.')
  return value.trim()
}

function record(story, actor, action, changes = []) {
  story.history.push({ id: randomUUID(), actor: actorName(actor), action, at: new Date().toISOString(), changes })
}

function fail(code, message) {
  throw new CanvasError(code, message)
}

function isValidStory(story) {
  return story !== null
    && typeof story === 'object'
    && typeof story.id === 'string'
    && story.id.length > 0
    && typeof story.title === 'string'
    && story.title.trim().length > 0
    && typeof story.description === 'string'
    && typeof story.acceptanceCriteria === 'string'
    && priorities.has(story.priority)
    && statuses.includes(story.status)
    && (story.archivedAt === undefined || story.archivedAt === null || validDate(story.archivedAt))
    && (story.type === undefined || itemTypes.includes(story.type))
    && (story.parentFeatureId === undefined || story.parentFeatureId === null
      || (typeof story.parentFeatureId === 'string' && story.parentFeatureId.length > 0))
    && typeof story.createdAt === 'string'
    && !Number.isNaN(Date.parse(story.createdAt))
    && typeof story.updatedAt === 'string'
    && !Number.isNaN(Date.parse(story.updatedAt))
    && validActivity(story)
}

function validateData(data, code = 'CORRUPT_DATA') {
  if (data === null || typeof data !== 'object' || Array.isArray(data)
      || data.format !== format || data.version !== 2
      || !Array.isArray(data.stories) || !data.stories.every(isValidStory)) {
    fail(code, `The Kanvasban data at ${dataPath} has an unrecognized format or invalid data.`)
  }

  if (!Array.isArray(data.projects) || !data.projects.length
      || !data.projects.every((project) => project && validText(project.id, 100)
        && validText(project.name, 100) && typeof project.description === 'string'
        && project.description.length <= 4000 && validDate(project.createdAt) && validDate(project.updatedAt))
      || new Set(data.projects.map((project) => project.id)).size !== data.projects.length
      || !data.stories.every((story) => data.projects.some((project) => project.id === story.projectId))) {
    fail(code, 'Kanvasban data contains invalid projects or project references.')
  }
  const ids = new Set(data.stories.map((story) => story.id))
  if (ids.size !== data.stories.length) {
    fail(code, `The Kanvasban data at ${dataPath} contains duplicate story IDs.`)
  }

  const items = new Map(data.stories.map((story) => [story.id, story]))
  for (const story of data.stories) {
    const type = story.type ?? 'user-story'
    if (story.parentFeatureId != null) {
      const parent = items.get(story.parentFeatureId)
      if (type !== 'user-story' || !parent || parent.type !== 'feature' || parent.id === story.id
          || parent.projectId !== story.projectId) {
        fail(code, `Item ${story.id} must link to a Feature in the same project, and only user stories can have a parent Feature.`)
      }
    }
  }
  return data
}

async function ensureDataDirectory() {
  try {
    await mkdir(path.dirname(dataPath), { recursive: true, mode: 0o700 })
  } catch (error) {
    fail('STORAGE_ERROR', `Could not create Kanvasban data directory at ${path.dirname(dataPath)}: ${error.message}`)
  }
}

function createSeedData() {
  const now = new Date().toISOString()
  const projectId = randomUUID()
  const featureId = randomUUID()
  const item = {
    projectId, priority: 'medium', status: 'backlog',
    createdAt: now, updatedAt: now,
  }
  return {
    format, version: 2,
    projects: [{
      id: projectId, name: 'Hello world',
      description: 'A starter project for exploring Kanvasban.',
      createdAt: now, updatedAt: now,
    }],
    stories: [
      {
        ...item, id: featureId, type: 'feature', parentFeatureId: null,
        title: 'Hello world feature',
        description: 'Try organizing a feature and its linked user story.',
        acceptanceCriteria: 'The linked user story can be tracked on the board.',
        comments: [], history: [],
      },
      {
        ...item, id: randomUUID(), type: 'user-story', parentFeatureId: featureId,
        title: 'Hello world user story',
        description: 'As a new user, I want to explore the board so I can plan my work.',
        acceptanceCriteria: 'Edit this story and move it through the workflow columns.',
        comments: [], history: [],
      },
    ],
  }
}

async function readExistingData() {
  let raw
  try {
    raw = await readFile(dataPath, 'utf8')
  } catch (error) {
    if (error.code === 'ENOENT') return null
    fail('STORAGE_ERROR', `Could not read Kanvasban data at ${dataPath}: ${error.message}`)
  }

  let data
  try {
    data = JSON.parse(raw)
  } catch (error) {
    fail('CORRUPT_DATA', `The Kanvasban data at ${dataPath} is not valid JSON: ${error.message}`)
  }

  validateData(data)
  for (const story of data.stories) {
    story.type ??= 'user-story'
    story.parentFeatureId ??= null
    story.comments ??= []
    story.history ??= []
  }
  return data
}

export async function readStories() {
  const existing = await readExistingData()
  if (existing) return existing
  return withStoreLock(async () => {
    const data = await readExistingData()
    if (data) return data
    const seed = validateData(createSeedData())
    await writeStories(seed)
    return seed
  })
}

async function writeStories(data) {
  const temporaryPath = path.join(
    path.dirname(dataPath),
    `.${path.basename(dataPath)}.${process.pid}.${randomUUID()}.tmp`,
  )

  try {
    await writeFile(temporaryPath, `${JSON.stringify(data, null, 2)}\n`, { flag: 'wx', mode: 0o600 })
    await rename(temporaryPath, dataPath)
  } catch (error) {
    try {
      await unlink(temporaryPath)
    } catch (cleanupError) {
      if (cleanupError.code !== 'ENOENT') {
        fail('STORAGE_ERROR', `Could not clean up temporary backlog data at ${temporaryPath}: ${cleanupError.message}`)
      }
    }
    fail('STORAGE_ERROR', `Could not write Kanvasban data at ${dataPath}: ${error.message}`)
  }
}

async function withStoreLock(operation) {
  await ensureDataDirectory()
  const lockPath = `${dataPath}.lock`
  const deadline = Date.now() + 5000
  while (true) {
    try {
      await mkdir(lockPath)
      break
    } catch (error) {
      if (error.code !== 'EEXIST') fail('STORAGE_ERROR', `Could not lock backlog: ${error.message}`)
      if (Date.now() >= deadline) {
        fail('STORAGE_BUSY', `Backlog is locked at ${lockPath}. Retry; if a writer crashed, remove the empty lock directory only after confirming no writer is active.`)
      }
      await setTimeout(50)
    }
  }
  try {
    return await operation()
  } finally {
    try {
      await rmdir(lockPath)
    } catch (error) {
      fail('STORAGE_ERROR', `Could not release backlog lock at ${lockPath}: ${error.message}`)
    }
  }
}

function mutateStories(mutate) {
  return withStoreLock(async () => {
    const data = await readExistingData() ?? createSeedData()
    const result = mutate(data)
    validateData(data, 'INVALID_INPUT')
    await writeStories(data)
    return result
  })
}

export function createProject(input) {
  return mutateStories((data) => {
    validateProjectInput(input)
    const now = new Date().toISOString()
    const project = {
      id: randomUUID(), name: input.name.trim(), description: input.description?.trim() ?? '',
      createdAt: now, updatedAt: now,
    }
    data.projects.push(project)
    return project
  })
}

export function updateProject(input) {
  return mutateStories((data) => {
    validateProjectInput(input)
    const project = data.projects.find((project) => project.id === input.id)
    if (!project) fail('NOT_FOUND', 'Project not found.')
    project.name = input.name.trim()
    if (input.description !== undefined) project.description = input.description.trim()
    project.updatedAt = new Date().toISOString()
    return project
  })
}

function validateProjectInput(input) {
  if (!validText(input.name, 100) || (input.description !== undefined
      && (typeof input.description !== 'string' || input.description.length > 4000))) {
    fail('INVALID_INPUT', 'Project name must contain 1 to 100 characters and description at most 4000.')
  }
}

export function addStory(input) {
  return mutateStories((data) => {
    const projectId = input.projectId ?? (data.projects.length === 1 ? data.projects[0].id : undefined)
    if (!data.projects.some((project) => project.id === projectId)) {
      fail('INVALID_INPUT', 'Choose an existing projectId; it is required when multiple projects exist.')
    }
    const now = new Date().toISOString()
    const story = {
      id: randomUUID(),
      projectId,
      title: input.title.trim(),
      description: input.description?.trim() ?? '',
      acceptanceCriteria: input.acceptanceCriteria?.trim() ?? '',
      priority: input.priority ?? 'medium',
      type: input.type ?? 'user-story',
      parentFeatureId: input.parentFeatureId ?? null,
      status: 'backlog',
      createdAt: now,
      updatedAt: now,
      comments: [],
      history: [],
    }
    record(story, input.actor, 'created')
    data.stories.push(story)
    return story
  })
}

export function updateStory(input) {
  return mutateStories((data) => {
    if (input.archived !== undefined && typeof input.archived !== 'boolean') {
      fail('INVALID_INPUT', 'archived must be a boolean.')
    }
    const story = data.stories.find((item) => item.id === input.id)
    if (!story) fail('NOT_FOUND', `No Kanvasban item exists with ID ${input.id}.`)

    const changes = []
    for (const field of ['title', 'description', 'acceptanceCriteria', 'priority', 'status', 'type', 'parentFeatureId']) {
      if (input[field] !== undefined) {
        const value = typeof input[field] === 'string' ? input[field].trim() : input[field]
        if (story[field] !== value) changes.push({ field, before: story[field], after: value })
        story[field] = value
      }
    }
    if (input.archived !== undefined && Boolean(story.archivedAt) !== input.archived) {
      const value = input.archived ? new Date().toISOString() : null
      changes.push({ field: 'archivedAt', before: story.archivedAt ?? null, after: value })
      story.archivedAt = value
    }
    if (changes.length) {
      story.updatedAt = new Date().toISOString()
      record(story, input.actor, changes.some((change) => change.field === 'archivedAt')
        ? input.archived ? 'archived' : 'restored' : 'updated', changes)
    }
    return story
  })
}

export function reorderStory(input) {
  return mutateStories((data) => {
    if (!validText(input.id, 100)
        || (input.beforeId !== null && !validText(input.beforeId, 100))) {
      fail('INVALID_INPUT', 'Provide an item ID and beforeId (an item ID, or null for the bottom).')
    }
    const story = data.stories.find((item) => item.id === input.id)
    if (!story) fail('NOT_FOUND', 'Item to reorder was not found.')
    const status = input.status ?? story.status
    if (!statuses.includes(status)) fail('INVALID_INPUT', 'Invalid destination status.')
    const target = data.stories.find((item) => item.id === input.beforeId)
    if (input.beforeId !== null && (!target || target.status !== status || target.id === story.id
        || target.projectId !== story.projectId)) {
      fail('INVALID_INPUT', 'The target must be a different item in the destination column.')
    }
    const previous = data.stories.filter((item) => item.status === story.status && item.projectId === story.projectId)
    const oldNext = previous[previous.indexOf(story) + 1]?.id ?? null
    const oldStatus = story.status
    data.stories.splice(data.stories.indexOf(story), 1)
    const column = data.stories.filter((item) => item.status === status && item.projectId === story.projectId)
    const insertion = target ? data.stories.indexOf(target)
      : column.length ? data.stories.indexOf(column.at(-1)) + 1 : data.stories.length
    data.stories.splice(insertion, 0, story)
    story.status = status
    const changes = []
    if (oldStatus !== status) changes.push({ field: 'status', before: oldStatus, after: status })
    if (oldStatus !== status || oldNext !== input.beforeId) {
      changes.push({ field: 'nextItemId', before: oldNext, after: input.beforeId })
    }
    if (changes.length) {
      story.updatedAt = new Date().toISOString()
      record(story, input.actor, 'reordered', changes)
    }
    return story
  })
}

export function changeComment(input) {
  return mutateStories((data) => {
    const story = data.stories.find((item) => item.id === input.id)
    if (!story) fail('NOT_FOUND', 'Item not found.')
    const actor = actorName(input.actor)
    if (!['add', 'edit', 'delete'].includes(input.operation)) fail('INVALID_INPUT', 'Invalid comment operation.')
    if (input.operation !== 'delete' && !validText(input.body, 4000)) {
      fail('INVALID_INPUT', 'Comment must contain 1 to 4000 characters.')
    }
    const now = new Date().toISOString()
    let comment
    if (input.operation === 'add') {
      comment = { id: randomUUID(), author: actor, body: input.body.trim(), createdAt: now, updatedAt: now, deletedAt: null }
      story.comments.push(comment)
      record(story, actor, 'comment-added', [{ field: `comment:${comment.id}`, before: null, after: comment.body }])
    } else {
      comment = story.comments.find((item) => item.id === input.commentId)
      if (!comment || comment.deletedAt) fail('NOT_FOUND', 'Active comment not found.')
      const before = comment.body
      comment.body = input.operation === 'delete' ? '' : input.body.trim()
      comment.updatedAt = now
      if (input.operation === 'delete') comment.deletedAt = now
      record(story, actor, `comment-${input.operation === 'delete' ? 'deleted' : 'edited'}`,
        [{ field: `comment:${comment.id}`, before, after: input.operation === 'delete' ? null : comment.body }])
    }
    story.updatedAt = now
    return comment
  })
}

export function deleteStory(id) {
  return mutateStories((data) => {
    const index = data.stories.findIndex((story) => story.id === id)
    if (index === -1) fail('NOT_FOUND', `No Kanvasban item exists with ID ${id}.`)

    const [deleted] = data.stories.splice(index, 1)
    return deleted
  })
}
