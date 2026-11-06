export function createCardDetails({ request, refresh }) {
  const dialog = document.createElement('dialog')
  dialog.className = 'item-dialog'
  dialog.setAttribute('aria-labelledby', 'item-heading')
  dialog.innerHTML = `
    <header class="dialog-heading"><h2 id="item-heading"></h2><button type="button" id="close-item" aria-label="Close details" title="Close details">&times;</button></header>
    <p id="item-metadata"></p>
    <div id="item-parent"><h3>Parent Feature</h3></div>
    <div id="item-description"></div>
    <h3>Activity</h3>
    <div role="tablist" aria-label="Item activity">
      <button type="button" role="tab" id="comments-tab" aria-controls="comments-panel" aria-selected="true" tabindex="0">Comments</button>
      <button type="button" role="tab" id="history-tab" aria-controls="history-panel" aria-selected="false" tabindex="-1">History</button>
    </div>
    <section role="tabpanel" id="comments-panel" aria-labelledby="comments-tab">
      <div id="comment-list"></div>
      <form id="comment-form">
        <label for="comment-author">Author (display label)</label><input id="comment-author" maxlength="100" value="Human" required>
        <label for="comment-body">Comment</label><textarea id="comment-body" maxlength="4000" required></textarea>
        <button type="submit" id="save-comment">Add comment</button>
        <button type="button" id="cancel-edit" hidden>Cancel edit</button>
      </form>
    </section>
    <section role="tabpanel" id="history-panel" aria-labelledby="history-tab" hidden><div id="history-list"></div></section>
    <p id="activity-status" role="status" aria-live="polite"></p>`
  document.body.append(dialog)
  const find = (selector) => dialog.querySelector(selector)
  let itemId
  let opener
  let editingId = null
  let snapshot = ''
  let currentItem
  let features = []
  const fields = new Map()

  function editable(parent, field, label, multiline = false, choices) {
    const root = document.createElement('div')
    root.className = 'inline-field'
    const display = text(root, 'button', '')
    display.type = 'button'
    display.className = 'inline-value'
    display.setAttribute('aria-label', `Edit ${label}`)
    parent.append(root)
    let editing = false
    let saving = false
    let baseline
    const show = () => {
      display.textContent = choices
        ? choices().find(([value]) => value === (currentItem[field] ?? ''))?.[1] ?? 'Unavailable Feature'
        : currentItem[field] || `Add ${label.toLowerCase()}...`
    }
    const finish = () => {
      editing = false
      root.replaceChildren(display)
      show()
      display.focus()
    }
    display.addEventListener('click', () => {
      if (editing) return
      for (const other of fields.values()) {
        if (other.isEditing()) other.cancel()
      }
      editing = true
      baseline = currentItem[field]
      const editor = document.createElement(choices ? 'select' : multiline ? 'textarea' : 'input')
      if (choices) {
        for (const [value, name] of choices()) {
          const option = text(editor, 'option', name)
          option.value = value
        }
      } else {
        editor.maxLength = multiline ? 4000 : 160
      }
      editor.value = baseline ?? ''
      editor.setAttribute('aria-label', label)
      const editorRow = document.createElement('div')
      editorRow.className = multiline || choices ? 'inline-editor' : 'inline-editor inline-editor-single'
      const controls = document.createElement('div')
      controls.className = 'inline-actions'
      const cancel = text(controls, 'button', '\u00d7')
      cancel.type = 'button'
      cancel.setAttribute('aria-label', `Cancel ${label}`)
      const accept = text(controls, 'button', '\u2713')
      accept.type = 'button'
      accept.className = 'inline-save'
      accept.setAttribute('aria-label', `Save ${label}`)
      const error = text(root, 'p', '')
      error.className = 'error'
      error.setAttribute('role', 'alert')
      editorRow.append(editor, controls)
      root.replaceChildren(editorRow, error)
      async function commit() {
        if (saving) return
        const value = choices ? editor.value || null : editor.value.trim()
        if (!choices && !multiline && !value) {
          error.textContent = 'Title is required.'
          editor.focus()
          return
        }
        if (currentItem[field] !== baseline && currentItem[field] !== value) {
          error.textContent = 'This field changed while you were editing. Cancel to load the latest value, then try again.'
          return
        }
        saving = true
        accept.disabled = cancel.disabled = editor.disabled = true
        find('#close-item').disabled = true
        for (const other of fields.values()) other.setDisabled(true)
        try {
          const { story } = await request(`/api/stories/${encodeURIComponent(itemId)}`, {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ [field]: value, actor: find('#comment-author').value }),
          })
          currentItem = story
          finish()
          find('#activity-status').className = ''
          find('#activity-status').textContent = `${label} saved.`
          await refresh()
        } catch (failure) {
          error.textContent = failure.message
        } finally {
          saving = false
          accept.disabled = cancel.disabled = editor.disabled = false
          find('#close-item').disabled = false
          for (const other of fields.values()) other.setDisabled(false)
        }
      }
      accept.addEventListener('click', () => void commit())
      cancel.addEventListener('click', finish)
      editor.addEventListener('keydown', (event) => {
        if (event.isComposing) return
        if (event.key === 'Escape') {
          event.preventDefault()
          event.stopPropagation()
          if (!saving) finish()
        } else if (event.key === 'Enter' && (!multiline || event.ctrlKey || event.metaKey)) {
          event.preventDefault()
          void commit()
        }
      })
      text(root, 'small', multiline ? 'Ctrl/Cmd+Enter to save; Escape to cancel.' : 'Enter to save; Escape to cancel.')
      editor.focus()
    })
    fields.set(field, {
      update: () => { if (!editing) show() },
      reset: () => { editing = false; root.replaceChildren(display) },
      isEditing: () => editing,
      isSaving: () => saving,
      setDisabled: (disabled) => { display.disabled = disabled },
      cancel: () => { if (!saving) finish() },
    })
  }
  editable(find('#item-heading'), 'title', 'Title')
  text(find('#item-description'), 'h3', 'Description')
  editable(find('#item-description'), 'description', 'Description', true)
  text(find('#item-description'), 'h3', 'Acceptance criteria')
  editable(find('#item-description'), 'acceptanceCriteria', 'Acceptance criteria', true)
  editable(find('#item-parent'), 'parentFeatureId', 'Parent Feature', false,
    () => [['', 'No parent Feature'], ...features.map((feature) => [feature.id, feature.title])])

  function text(parent, tag, value) {
    const element = document.createElement(tag)
    element.textContent = value
    parent.append(element)
    return element
  }
  function resetEditor() {
    editingId = null
    find('#comment-body').value = ''
    find('#save-comment').textContent = 'Add comment'
    find('#cancel-edit').hidden = true
  }
  function tab(name, focus = false) {
    for (const key of ['comments', 'history']) {
      const active = key === name
      find(`#${key}-tab`).setAttribute('aria-selected', String(active))
      find(`#${key}-tab`).tabIndex = active ? 0 : -1
      find(`#${key}-panel`).hidden = !active
    }
    if (focus) find(`#${name}-tab`).focus()
  }
  for (const name of ['comments', 'history']) {
    find(`#${name}-tab`).addEventListener('click', () => tab(name))
    find(`#${name}-tab`).addEventListener('keydown', (event) => {
      if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
        event.preventDefault()
        tab(event.key === 'Home' ? 'comments' : event.key === 'End' ? 'history' : name === 'comments' ? 'history' : 'comments', true)
      }
    })
  }
  find('#close-item').addEventListener('click', () => dialog.close())
  function dismissOrCancelEdit() {
    if ([...fields.values()].some((field) => field.isSaving())) return
    const editors = [...fields.values()].filter((field) => field.isEditing())
    if (editors.length) {
      for (const field of editors) field.cancel()
    } else {
      dialog.close()
    }
  }
  document.addEventListener('keydown', (event) => {
    if (!dialog.open || event.key !== 'Escape' || event.isComposing || event.defaultPrevented) return
    event.preventDefault()
    event.stopPropagation()
    dismissOrCancelEdit()
  })
  dialog.addEventListener('close', () => {
    const title = document.querySelector(`.story[data-story-id="${CSS.escape(itemId ?? '')}"] .story-title`)
    itemId = undefined
    if (opener?.isConnected) opener.focus()
    else (title ?? document.querySelector('.create-story'))?.focus()
  })
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault()
    dismissOrCancelEdit()
  })
  find('#cancel-edit').addEventListener('click', resetEditor)

  async function save(operation, commentId, body) {
    await request('/api/comments', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: itemId, operation, ...(commentId ? { commentId } : {}), ...(body !== undefined ? { body } : {}), actor: find('#comment-author').value }),
    })
  }
  function showError(error) {
    find('#activity-status').textContent = error.message
    find('#activity-status').className = 'error'
  }
  find('#comment-form').addEventListener('submit', async (event) => {
    event.preventDefault()
    const button = find('#save-comment')
    if (button.disabled) return
    button.disabled = true
    try {
      await save(editingId ? 'edit' : 'add', editingId, find('#comment-body').value)
      resetEditor()
      find('#activity-status').className = ''
      find('#activity-status').textContent = 'Comment saved.'
      await refresh()
    } catch (error) {
      showError(error)
    } finally {
      button.disabled = false
    }
  })

  function update(stories) {
    if (!dialog.open) return
    const item = stories.find((story) => story.id === itemId)
    if (!item) {
      find('#activity-status').textContent = 'This item is no longer available. Close this view.'
      find('#save-comment').disabled = true
      return
    }
    features = stories.filter((story) => story.type === 'feature' && story.projectId === item.projectId
      && (!story.archivedAt || story.id === item.parentFeatureId))
    const next = JSON.stringify([item, features.map(({ id, title }) => [id, title])])
    if (snapshot === next) return
    snapshot = next
    currentItem = item
    find('#item-parent').hidden = item.type === 'feature'
    find('#item-metadata').textContent = `${item.type === 'feature' ? 'Feature' : 'User story'} / ${item.status} / ${item.priority} priority${item.archivedAt ? ' / Archived' : ''}`
    for (const field of fields.values()) field.update()
    const comments = find('#comment-list')
    comments.replaceChildren()
    if (!item.comments.length) text(comments, 'p', 'No comments yet.')
    for (const comment of item.comments) {
      const entry = document.createElement('article')
      entry.className = 'activity-entry'
      text(entry, 'strong', comment.author)
      text(entry, 'small', ` ${new Date(comment.createdAt).toLocaleString()}${comment.updatedAt !== comment.createdAt ? ' (edited)' : ''}`)
      text(entry, 'p', comment.deletedAt ? 'Comment deleted.' : comment.body)
      if (!comment.deletedAt) {
        const edit = text(entry, 'button', 'Edit')
        edit.type = 'button'
        edit.addEventListener('click', () => {
          editingId = comment.id
          find('#comment-body').value = comment.body
          find('#save-comment').textContent = 'Save comment'
          find('#cancel-edit').hidden = false
          find('#comment-body').focus()
        })
        const remove = text(entry, 'button', 'Delete comment')
        remove.type = 'button'
        remove.addEventListener('click', async () => {
          if (!confirm('Delete this comment? Its previous text remains in History.')) return
          remove.disabled = true
          try {
            await save('delete', comment.id)
            if (editingId === comment.id) resetEditor()
            await refresh()
          } catch (error) {
            showError(error)
            remove.disabled = false
          }
        })
      }
      comments.append(entry)
    }
    const history = find('#history-list')
    history.replaceChildren()
    if (!item.history.length) text(history, 'p', 'No recorded history. Changes made before activity tracking was added are unavailable.')
    for (const event of [...item.history].reverse()) {
      const entry = document.createElement('article')
      entry.className = 'activity-entry'
      text(entry, 'strong', `${event.actor} - ${event.action}`)
      text(entry, 'small', ` ${new Date(event.at).toLocaleString()}`)
      for (const change of event.changes) {
        text(entry, 'p', `${change.field}: ${change.before ?? '(none)'} -> ${change.after ?? '(none)'}`)
      }
      history.append(entry)
    }
  }
  return {
    update,
    open(id, button, stories) {
      itemId = id
      opener = button
      snapshot = ''
      for (const field of fields.values()) field.reset()
      resetEditor()
      find('#save-comment').disabled = false
      find('#activity-status').textContent = ''
      tab('comments')
      dialog.showModal()
      update(stories)
      find('#close-item').focus()
    },
  }
}
