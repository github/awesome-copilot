import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { CanvasError, createCanvas, joinSession } from '@github/copilot-sdk/extension'
import { addStory, changeComment, createProject, deleteStory, itemTypes, readStories, reorderStory, statuses, updateProject, updateStory } from './backlog-store.mjs'
import { streamStories } from './live-updates.mjs'

const canvasId = 'kanvasban'
const htmlPath = fileURLToPath(new URL('./index.html', import.meta.url))
const instances = new Map()
const priorities = ['low', 'medium', 'high']
const itemProperties = {
  actor: { type: 'string', minLength: 1, maxLength: 100, description: 'Display label for history; agent actions default to Agent. Not authenticated.' },
  type: { type: 'string', enum: itemTypes, description: 'Feature or user story; defaults to user-story.' },
  parentFeatureId: {
    type: ['string', 'null'],
    minLength: 1,
    description: 'Optional parent Feature UUID for a user story. Use null to unlink. Features cannot have a parent.',
  },
}

const addStorySchema = {
  type: 'object',
  properties: {
    ...itemProperties,
    projectId: { type: 'string', minLength: 1, description: 'Project ID from listProjects. Required when multiple projects exist.' },
    title: { type: 'string', minLength: 1, maxLength: 160 },
    description: { type: 'string', maxLength: 4000 },
    acceptanceCriteria: { type: 'string', maxLength: 4000 },
    priority: { type: 'string', enum: priorities },
  },
  required: ['title'],
  additionalProperties: false,
}

const updateStorySchema = {
  type: 'object',
  properties: {
    ...itemProperties,
    archived: { type: 'boolean', description: 'True archives without deleting; false restores to the board. Status and child stories are unchanged.' },
    id: { type: 'string', minLength: 1 },
    title: { type: 'string', minLength: 1, maxLength: 160 },
    description: { type: 'string', maxLength: 4000 },
    acceptanceCriteria: { type: 'string', maxLength: 4000 },
    priority: { type: 'string', enum: priorities },
    status: { type: 'string', enum: statuses },
  },
  required: ['id'],
  additionalProperties: false,
}

const deleteStorySchema = {
  type: 'object',
  properties: { id: { type: 'string', minLength: 1 } },
  required: ['id'],
  additionalProperties: false,
}
const projectProperties = {
  name: { type: 'string', minLength: 1, maxLength: 100 },
  description: { type: 'string', maxLength: 4000 },
}
const createProjectSchema = {
  type: 'object', properties: projectProperties, required: ['name'], additionalProperties: false,
}
const updateProjectSchema = {
  type: 'object', properties: { ...projectProperties, id: { type: 'string', minLength: 1 } },
  required: ['id', 'name'], additionalProperties: false,
}
const listStoriesSchema = {
  type: 'object', properties: { projectId: { type: 'string', minLength: 1 } }, additionalProperties: false,
}

function validateProject(input, edit = false) {
  validateStoryInput(input, edit ? ['id', 'name', 'description'] : ['name', 'description'], edit ? ['id', 'name'] : ['name'])
  if (typeof input.name !== 'string' || !input.name.trim() || input.name.length > 100) {
    throw new CanvasError('INVALID_INPUT', 'Project name must contain 1 to 100 characters.')
  }
}
const reorderSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', minLength: 1 },
    beforeId: { type: ['string', 'null'], minLength: 1, description: 'Place before this item in the destination column; null appends to the bottom.' },
    status: { type: 'string', enum: statuses },
    actor: itemProperties.actor,
  },
  required: ['id', 'beforeId'],
  additionalProperties: false,
}

function validateReorder(input) {
  validateStoryInput(input, Object.keys(reorderSchema.properties), ['id', 'beforeId'])
  if (input.beforeId !== null && (typeof input.beforeId !== 'string' || !input.beforeId.trim())) {
    throw new CanvasError('INVALID_INPUT', 'beforeId must be an item ID or null.')
  }
}

const commentSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', minLength: 1 },
    operation: { type: 'string', enum: ['add', 'edit', 'delete'] },
    commentId: { type: 'string', minLength: 1 },
    body: { type: 'string', minLength: 1, maxLength: 4000 },
    actor: itemProperties.actor,
  },
  required: ['id', 'operation'],
  additionalProperties: false,
}

function validateComment(input) {
  validateStoryInput(input, Object.keys(commentSchema.properties), ['id', 'operation'])
  if (input.commentId !== undefined && (typeof input.commentId !== 'string' || !input.commentId.trim())) {
    throw new CanvasError('INVALID_INPUT', 'Comment ID must be a non-empty string.')
  }
  if (input.operation !== 'add' && !input.commentId) throw new CanvasError('INVALID_INPUT', 'Comment ID is required.')
}

function errorResponse(response, status, message) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  response.end(JSON.stringify({ error: message }))
}

function sendJson(response, status, value) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  response.end(JSON.stringify(value))
}

async function readRequestBody(request) {
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > 16384) throw new CanvasError('INVALID_INPUT', 'Request body exceeds the 16 KB limit.')
    chunks.push(chunk)
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    throw new CanvasError('INVALID_INPUT', 'Request body must contain valid JSON.')
  }
}

function validateStoryInput(input, allowedFields, requiredFields = []) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new CanvasError('INVALID_INPUT', 'Story input must be a JSON object.')
  }
  const allowed = new Set(allowedFields)
  for (const key of Object.keys(input)) {
    if (!allowed.has(key)) throw new CanvasError('INVALID_INPUT', `Unexpected story field: ${key}.`)
  }
  for (const key of requiredFields) {
    if (input[key] === undefined) throw new CanvasError('INVALID_INPUT', `Missing required story field: ${key}.`)
  }
  if (input.id !== undefined && (typeof input.id !== 'string' || input.id.length === 0)) {
    throw new CanvasError('INVALID_INPUT', 'Story ID must be a non-empty string.')
  }
  if (input.projectId !== undefined && (typeof input.projectId !== 'string' || !input.projectId.trim())) {
    throw new CanvasError('INVALID_INPUT', 'Project ID must be a non-empty string.')
  }
  if (input.actor !== undefined && (typeof input.actor !== 'string' || !input.actor.trim() || input.actor.length > 100)) {
    throw new CanvasError('INVALID_INPUT', 'Author must contain 1 to 100 characters.')
  }
  if (input.archived !== undefined && typeof input.archived !== 'boolean') {
    throw new CanvasError('INVALID_INPUT', 'archived must be a boolean.')
  }
  for (const field of ['title', 'description', 'acceptanceCriteria']) {
    if (input[field] !== undefined && typeof input[field] !== 'string') {
      throw new CanvasError('INVALID_INPUT', `${field} must be a string.`)
    }
  }
  if (input.title !== undefined && (!input.title.trim() || input.title.length > 160)) {
    throw new CanvasError('INVALID_INPUT', 'Story title must contain 1 to 160 characters.')
  }
  for (const field of ['description', 'acceptanceCriteria']) {
    if (input[field] !== undefined && input[field].length > 4000) {
      throw new CanvasError('INVALID_INPUT', `${field} must not exceed 4000 characters.`)
    }
  }
  if (input.priority !== undefined && !priorities.includes(input.priority)) {
    throw new CanvasError('INVALID_INPUT', 'Priority must be low, medium, or high.')
  }
  if (input.status !== undefined && !statuses.includes(input.status)) {
    throw new CanvasError('INVALID_INPUT', `Status must be one of: ${statuses.join(', ')}.`)
  }
  if (input.type !== undefined && !itemTypes.includes(input.type)) {
    throw new CanvasError('INVALID_INPUT', 'Type must be feature or user-story.')
  }
  if (input.parentFeatureId !== undefined && input.parentFeatureId !== null
      && (typeof input.parentFeatureId !== 'string' || !input.parentFeatureId.trim())) {
    throw new CanvasError('INVALID_INPUT', 'Parent Feature ID must be a non-empty string or null.')
  }
}

function statusFor(error) {
  if (error instanceof CanvasError) {
    if (error.code === 'NOT_FOUND') return 404
    if (error.code === 'INVALID_INPUT') return 400
  }
  return 500
}

async function handleHttpRequest(request, response) {
  const url = new URL(request.url ?? '/', 'http://127.0.0.1')
  try {
    if (['POST', 'PATCH'].includes(request.method)
        && !/^application\/json(?:\s*;|$)/i.test(request.headers['content-type'] ?? '')) {
      throw new CanvasError('INVALID_INPUT', 'Request content type must be application/json.')
    }
    if (request.method === 'GET' && url.pathname === '/') {
      const html = await readFile(htmlPath)
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' })
      response.end(html)
      return
    }
    if (request.method === 'GET' && url.pathname === '/card-details.mjs') {
      response.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-store' })
      response.end(await readFile(new URL('./card-details.mjs', import.meta.url)))
      return
    }
    if (request.method === 'POST' && url.pathname === '/api/comments') {
      const input = await readRequestBody(request)
      validateComment(input)
      sendJson(response, 200, await changeComment(input))
      return
    }
    if (request.method === 'POST' && url.pathname === '/api/reorder') {
      const input = await readRequestBody(request)
      validateReorder(input)
      sendJson(response, 200, { story: await reorderStory(input) })
      return
    }
    if (request.method === 'POST' && url.pathname === '/api/projects') {
      const input = await readRequestBody(request)
      validateProject(input)
      sendJson(response, 201, { project: await createProject(input) })
      return
    }
    const projectMatch = /^\/api\/projects\/([^/]+)$/.exec(url.pathname)
    if (request.method === 'PATCH' && projectMatch) {
      const input = await readRequestBody(request)
      const id = decodeURIComponent(projectMatch[1])
      if (input?.id !== undefined && input.id !== id) throw new CanvasError('INVALID_INPUT', 'Project IDs must match.')
      validateProject(input, input?.id !== undefined)
      sendJson(response, 200, { project: await updateProject({ ...input, id }) })
      return
    }
    if (request.method === 'GET' && url.pathname === '/api/stories') {
      const data = await readStories()
      sendJson(response, 200, { stories: data.stories, projects: data.projects })
      return
    }
    if (request.method === 'GET' && url.pathname === '/api/projects') {
      sendJson(response, 200, { projects: (await readStories()).projects })
      return
    }
    if (request.method === 'GET' && url.pathname === '/api/events') {
      streamStories(response)
      return
    }
    if (request.method === 'POST' && url.pathname === '/api/stories') {
      const input = await readRequestBody(request)
      validateStoryInput(input, Object.keys(addStorySchema.properties), ['title'])
      sendJson(response, 201, { story: await addStory(input) })
      return
    }

    const match = /^\/api\/stories\/([^/]+)$/.exec(url.pathname)
    if (match && request.method === 'PATCH') {
      const input = await readRequestBody(request)
      validateStoryInput(input, Object.keys(updateStorySchema.properties))
      if (Object.keys(input).every((key) => key === 'id')) {
        throw new CanvasError('INVALID_INPUT', 'Provide at least one story field to update.')
      }
      const id = decodeURIComponent(match[1])
      if (input.id !== undefined && input.id !== id) {
        throw new CanvasError('INVALID_INPUT', 'Story ID in the URL and request body must match.')
      }
      sendJson(response, 200, { story: await updateStory({ ...input, id }) })
      return
    }
    if (match && request.method === 'DELETE') {
      sendJson(response, 200, { story: await deleteStory(decodeURIComponent(match[1])) })
      return
    }
    errorResponse(response, 404, 'Route not found.')
  } catch (error) {
    errorResponse(response, statusFor(error), error.message)
  }
}

let session

async function logDiagnostic(message, data) {
  await session.log(`${message}: ${JSON.stringify(data)}`)
}

function getActionInput(args) {
  return args?.input ?? args
}

const canvas = createCanvas({
  id: canvasId,
  displayName: 'Kanvasban',
  description: 'Manage shared projects, Features, and user stories on Kanvasban boards.',
  actions: [
    {
      name: 'listProjects',
      description: 'List Kanvasban projects. Use a project ID when creating or listing items.',
      handler: async () => (await readStories()).projects,
    },
    {
      name: 'createProject',
      description: 'Create a Kanvasban project with a name and optional description.',
      inputSchema: createProjectSchema,
      handler: async ({ input }) => { validateProject(input); return createProject(input) },
    },
    {
      name: 'updateProject',
      description: 'Edit a Kanvasban project name and optional description without changing its items.',
      inputSchema: updateProjectSchema,
      handler: async ({ input }) => { validateProject(input, true); return updateProject(input) },
    },
    {
      name: 'reorderStory',
      description: 'Set shared card order: move id before beforeId, or to the bottom with beforeId null. Optional status moves columns atomically. listStories returns canonical order; grouping is view-only.',
      inputSchema: reorderSchema,
      handler: async ({ input }) => {
        validateReorder(input)
        return reorderStory({ ...input, actor: input.actor ?? 'Agent' })
      },
    },
    {
      name: 'changeComment',
      description: 'Add, edit, or soft-delete a comment on an item. Supply body for add/edit, commentId for edit/delete, and actor display label. Changes are recorded in history.',
      inputSchema: commentSchema,
      handler: async ({ input }) => {
        validateComment(input)
        return changeComment({ ...input, actor: input.actor ?? 'Agent' })
      },
    },
    {
      name: 'listStories',
      description: 'List Kanvasban items in shared manual order. Supply projectId to select a project; omit to list all projects. Filter by status for column order.',
      inputSchema: listStoriesSchema,
      handler: async ({ input = {} }) => {
        validateStoryInput(input, ['projectId'])
        const data = await readStories()
        if (input.projectId && !data.projects.some((project) => project.id === input.projectId)) {
          throw new CanvasError('NOT_FOUND', 'Project not found.')
        }
        await logDiagnostic('Listed Kanvasban items', { count: data.stories.length })
        return data.stories.filter((story) => !input.projectId || story.projectId === input.projectId)
      },
    },
    {
      name: 'addStory',
      description: 'Add a Kanvasban Feature or user story. Supply projectId from listProjects; user stories may link to a Feature in the same project.',
      inputSchema: addStorySchema,
      handler: async (args) => {
        const input = getActionInput(args)
        validateStoryInput(input, Object.keys(addStorySchema.properties), ['title'])
        const story = await addStory({ ...input, actor: input.actor ?? 'Agent' })
        await logDiagnostic('Added a Kanvasban item', { id: story.id })
        return story
      },
    },
    {
      name: 'updateStory',
      description: 'Update a Feature or user story. Set archived true to hide from the board without deleting, false to restore. Status: backlog, ready, in-progress, done, cancelled.',
      inputSchema: updateStorySchema,
      handler: async (args) => {
        const input = getActionInput(args)
        validateStoryInput(input, Object.keys(updateStorySchema.properties), ['id'])
        if (Object.keys(input).every((key) => key === 'id')) {
          throw new CanvasError('INVALID_INPUT', 'Provide at least one story field to update.')
        }
        const story = await updateStory({ ...input, actor: input.actor ?? 'Agent' })
        await logDiagnostic('Updated a Kanvasban item', { id: story.id })
        return story
      },
    },
    {
      name: 'deleteStory',
      description: 'Permanently delete an item only when explicitly requested or removing your own test data. Normally use updateStory with status cancelled. Features with children cannot be deleted.',
      inputSchema: deleteStorySchema,
      handler: async (args) => {
        const input = getActionInput(args)
        validateStoryInput(input, ['id'], ['id'])
        const story = await deleteStory(input.id)
        await logDiagnostic('Deleted a Kanvasban item', { id: story.id })
        return story
      },
    },
  ],
  open: async (args) => {
    const instanceId = args?.instanceId
    if (typeof instanceId !== 'string' || !instanceId) {
      throw new CanvasError('INVALID_INPUT', 'A canvas instance ID is required.')
    }

    try {
      await readStories()
      let instance = instances.get(instanceId)
      if (!instance) {
        const server = createServer((request, response) => {
          void handleHttpRequest(request, response)
        })
        await new Promise((resolve, reject) => {
          server.once('error', reject)
          server.listen(0, '127.0.0.1', resolve)
        })
        const address = server.address()
        if (!address || typeof address === 'string') {
          server.close()
          throw new CanvasError('SERVER_ERROR', 'Could not determine the backlog server address.')
        }
        instance = { server, url: `http://127.0.0.1:${address.port}/` }
        instances.set(instanceId, instance)
      }
      await logDiagnostic('Opened Kanvasban', { instanceId })
      return { url: instance.url }
    } catch (error) {
      if (error instanceof CanvasError) throw error
      throw new CanvasError('OPEN_FAILED', `Could not open Kanvasban: ${error.message}`)
    }
  },
  onClose: async (args) => {
    const instance = instances.get(args?.instanceId)
    if (!instance) return
    await new Promise((resolve, reject) => {
      instance.server.close((error) => error ? reject(error) : resolve())
      instance.server.closeAllConnections()
    })
    instances.delete(args.instanceId)
  },
})

session = await joinSession({ canvases: [canvas] })
