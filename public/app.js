// DOM Elements
const addTaskBtn = document.getElementById('addTaskBtn');
const modal = document.getElementById('taskModal');
const taskForm = document.getElementById('taskForm');
const cancelBtn = document.getElementById('cancelBtn');
const deleteBtn = document.getElementById('deleteBtn');
const modalTitle = document.getElementById('modalTitle');

// State
let tasks = [];
let editingTaskId = null;

// API Functions
async function fetchTasks() {
  const res = await fetch('/api/tasks');
  tasks = await res.json();
  renderTasks();
}

async function createTask(data) {
  const res = await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

async function updateTask(id, data) {
  const res = await fetch(`/api/tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

async function moveTask(id, status, position) {
  const res = await fetch(`/api/tasks/${id}/move`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, position })
  });
  return res.json();
}

async function deleteTask(id) {
  await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
}

// Render Functions
function renderTasks() {
  const columns = {
    backlog: document.getElementById('backlog'),
    in_progress: document.getElementById('in_progress'),
    done: document.getElementById('done')
  };

  // Clear all columns
  Object.values(columns).forEach(col => col.innerHTML = '');

  // Group tasks by status
  const grouped = { backlog: [], in_progress: [], done: [] };
  tasks.forEach(task => {
    if (grouped[task.status]) {
      grouped[task.status].push(task);
    }
  });

  // Render each column
  Object.entries(grouped).forEach(([status, statusTasks]) => {
    const column = columns[status];
    const countEl = document.getElementById(`${status}-count`);
    
    if (countEl) countEl.textContent = statusTasks.length;

    statusTasks.forEach(task => {
      const card = createTaskCard(task);
      column.appendChild(card);
    });
  });
}

function createTaskCard(task) {
  const card = document.createElement('div');
  card.className = `task-card owner-${task.owner}`;
  card.draggable = true;
  card.dataset.id = task.id;

  const priorityLabels = { 1: 'Low', 2: 'Medium', 3: 'High' };
  const ownerLabel = task.owner === 'oracle' ? '🤖 Oracle' : '👤 Soheil';
  const date = new Date(task.updated_at).toLocaleDateString();

  card.innerHTML = `
    <div class="task-header">
      <span class="task-title">${escapeHtml(task.title)}</span>
      <span class="task-owner ${task.owner}">${ownerLabel}</span>
    </div>
    ${task.description ? `<p class="task-description">${escapeHtml(task.description)}</p>` : ''}
    <div class="task-footer">
      <span class="task-priority priority-${task.priority}">
        <span class="priority-dot"></span>
        ${priorityLabels[task.priority] || 'Low'}
      </span>
      <span class="task-date">${date}</span>
    </div>
  `;

  // Click to edit
  card.addEventListener('click', () => openEditModal(task));

  // Drag events
  card.addEventListener('dragstart', handleDragStart);
  card.addEventListener('dragend', handleDragEnd);

  return card;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Modal Functions
function openModal(task = null) {
  modal.classList.add('active');
  
  if (task) {
    modalTitle.textContent = 'Edit Task';
    document.getElementById('taskId').value = task.id;
    document.getElementById('title').value = task.title;
    document.getElementById('description').value = task.description || '';
    document.getElementById('owner').value = task.owner;
    document.getElementById('priority').value = task.priority;
    document.getElementById('status').value = task.status;
    deleteBtn.style.display = 'block';
    editingTaskId = task.id;
  } else {
    modalTitle.textContent = 'New Task';
    taskForm.reset();
    document.getElementById('taskId').value = '';
    deleteBtn.style.display = 'none';
    editingTaskId = null;
  }
}

function openEditModal(task) {
  openModal(task);
}

function closeModal() {
  modal.classList.remove('active');
  taskForm.reset();
  editingTaskId = null;
}

// Drag & Drop
let draggedCard = null;

function handleDragStart(e) {
  draggedCard = e.target;
  e.target.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
  e.target.classList.remove('dragging');
  draggedCard = null;
  
  // Remove drag-over from all columns
  document.querySelectorAll('.task-list').forEach(col => {
    col.classList.remove('drag-over');
  });
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(e) {
  const column = e.target.closest('.task-list');
  if (column) {
    column.classList.add('drag-over');
  }
}

function handleDragLeave(e) {
  const column = e.target.closest('.task-list');
  if (column && !column.contains(e.relatedTarget)) {
    column.classList.remove('drag-over');
  }
}

async function handleDrop(e) {
  e.preventDefault();
  
  const column = e.target.closest('.task-list');
  if (!column || !draggedCard) return;
  
  column.classList.remove('drag-over');
  
  const taskId = draggedCard.dataset.id;
  const newStatus = column.id;
  
  // Calculate position based on drop location
  const cards = Array.from(column.querySelectorAll('.task-card'));
  const position = cards.length;
  
  // Update task
  await moveTask(taskId, newStatus, position);
  await fetchTasks();
}

// Event Listeners
addTaskBtn.addEventListener('click', () => openModal());
cancelBtn.addEventListener('click', closeModal);

modal.addEventListener('click', (e) => {
  if (e.target === modal) closeModal();
});

taskForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const data = {
    title: document.getElementById('title').value,
    description: document.getElementById('description').value,
    owner: document.getElementById('owner').value,
    priority: parseInt(document.getElementById('priority').value),
    status: document.getElementById('status').value
  };
  
  if (editingTaskId) {
    await updateTask(editingTaskId, data);
  } else {
    await createTask(data);
  }
  
  closeModal();
  await fetchTasks();
});

deleteBtn.addEventListener('click', async () => {
  if (editingTaskId && confirm('Delete this task?')) {
    await deleteTask(editingTaskId);
    closeModal();
    await fetchTasks();
  }
});

// Setup drag-drop on columns
document.querySelectorAll('.task-list').forEach(column => {
  column.addEventListener('dragover', handleDragOver);
  column.addEventListener('dragenter', handleDragEnter);
  column.addEventListener('dragleave', handleDragLeave);
  column.addEventListener('drop', handleDrop);
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
  if (e.key === 'n' && e.ctrlKey) {
    e.preventDefault();
    openModal();
  }
});

// Initialize
fetchTasks();
