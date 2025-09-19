<script setup>
const emit = defineEmits(['select-file']);
const props = defineProps({
  files: {
    type: Array,
    default: () => []
  }
});

const handleFileSelect = (file) => {
  console.debug('here')
  if (!file.name.toLowerCase().endsWith('.docx')) {
    showError('Please select a DOCX file.');
    return;
  }

  currentFile = file;

  // Preview the document
  initDoc(file);
};

const onDragStart = (comment, event) => {
  event.dataTransfer.setData('text/plain', comment);
  event.dataTransfer.effectAllowed = 'copy';
};

const onStickerDragStart = (stickerType, event) => {
  // You can customize what data gets transferred for stickers
  event.dataTransfer.setData('text/plain', stickerType);
  event.dataTransfer.setData('application/sticker', stickerType);
  event.dataTransfer.effectAllowed = 'copy';
};
</script>

<template>
  <div class="sidebar" id="versionsDrawer">
    <div class="sidebar-header">
      <h2 class="sidebar-title">Document Versions</h2>
    </div>

    <div class="card">
      <h3 class="card-title">Comments</h3>
      <div class="version-list" id="commentsList">
        <div style="text-align: left; color: #666; padding: 1rem;">
          <div class="comment-entry" draggable="true" @dragstart="onDragStart('Great job!', $event)">Great job!</div>
          <div class="comment-entry" draggable="true" @dragstart="onDragStart('Expand this', $event)">Expand this</div>
          <div class="comment-entry" draggable="true" @dragstart="onDragStart('Where are your references?', $event)">Where are your references?</div>
        </div>
      </div>

      <div class="add-new-comment">
        + Add new comment
      </div>
    </div>

    <div class="card">
      <h3 class="card-title">Stickers</h3>
      <div class="version-list">
        <div class="stickers-container">
          <!-- Full Check Sticker (Great Work) -->
          <div class="sticker-item" draggable="true" @dragstart="onStickerDragStart('full-check', $event)">
            <svg class="sticker-svg full-check" width="40" height="40" viewBox="0 0 40 40">
              <circle cx="20" cy="20" r="18" fill="#22C55E" stroke="#16A34A" stroke-width="2"/>
              <path d="M12 20l6 6L28 14" stroke="white" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span class="sticker-label">Great Work</span>
          </div>

          <!-- Half Check Sticker (Good Work) -->
          <div class="sticker-item" draggable="true" @dragstart="onStickerDragStart('half-check', $event)">
            <svg class="sticker-svg half-check" width="40" height="40" viewBox="0 0 40 40">
              <defs>
                <mask id="half-fill">
                  <circle cx="20" cy="20" r="18" fill="white"/>
                  <rect x="20" y="2" width="18" height="36" fill="black"/>
                </mask>
              </defs>
              <circle cx="20" cy="20" r="18" fill="white" stroke="#22C55E" stroke-width="3"/>
              <circle cx="20" cy="20" r="18" fill="#22C55E" mask="url(#half-fill)"/>
              <circle cx="20" cy="20" r="16.5" fill="none" stroke="white" stroke-width="1"/>
              <path d="M12 20l6 6L28 14" stroke="white" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M12 20l6 6L28 14" stroke="#22C55E" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span class="sticker-label">Good Work</span>
          </div>

          <!-- Nice! Sticker -->
          <div class="sticker-item" draggable="true" @dragstart="onStickerDragStart('nice', $event)">
            <svg class="sticker-svg nice" width="40" height="40" viewBox="0 0 40 40">
              <circle cx="20" cy="20" r="18" fill="#3B82F6" stroke="#2563EB" stroke-width="2"/>
              <circle cx="15" cy="16" r="2" fill="white"/>
              <circle cx="25" cy="16" r="2" fill="white"/>
              <path d="M13 25c2 3 6 3 8 0" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/>
              <path d="M27 25c-2 3-6 3-8 0" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/>
            </svg>
            <span class="sticker-label">Nice Job</span>
          </div>

          <!-- Needs Improvement Sticker -->
          <div class="sticker-item" draggable="true" @dragstart="onStickerDragStart('needs-improvement', $event)">
            <svg class="sticker-svg needs-improvement" width="40" height="40" viewBox="0 0 40 40">
              <circle cx="20" cy="20" r="18" fill="#F59E0B" stroke="#D97706" stroke-width="2"/>
              <path d="M20 12v10" stroke="white" stroke-width="3" stroke-linecap="round"/>
              <circle cx="20" cy="28" r="2" fill="white"/>
            </svg>
            <span class="sticker-label">Needs Improvement</span>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <h3 class="card-title">Submissions</h3>
      <div class="version-list" id="versionList">
        <div class="version-item " data-version-id="1754508051682" @click="emit('select-file', 'alex')">
          <div class="version-info">
            <div class="version-name">
              Alex_Johnson_version_2.docx
              <span class="version-latest-label">Latest</span>
            </div>
            <div class="version-date">8/6/2025 at 12:20 PM</div>
            <div class="version-author">Submitted by: Alex Johnson</div>
          </div>
        </div>
        <div class="version-item " data-version-id="1754508051682" @click="emit('select-file', 'nick')">
          <div class="version-info">
            <div class="version-name">
              Nick_Bernal_version3.pdf
              <span class="version-latest-label">Latest</span>
            </div>
            <div class="version-date">8/6/2025 at 12:20 PM</div>
            <div class="version-author">Submitted by: Nick Bernal</div>
          </div>
        </div>
      </div>
    </div>

    <!-- <div class="card">
      <h3 class="card-title">Document Versions</h3>
      <div class="version-list" id="versionList">
        <div class="version-item " data-version-id="1754508051682">
          <div class="version-info">
            <div class="version-name">
              Alex_Johnson_version_2.docx
              <span class="version-latest-label">Latest</span>
            </div>
            <div class="version-date">8/6/2025 at 12:20 PM</div>
            <div class="version-author">Saved by: Alex Johnson</div>
          </div>
        </div>
        <div class="version-item " data-version-id="1754508051682">
          <div class="version-info">
            <div class="version-name">
              Alex_Johnson_version_1.docx
            </div>
            <div class="version-date">8/6/2025 at 12:05 PM</div>
            <div class="version-author">Saved by: Alex Johnson</div>
          </div>
        </div>
      </div>
    </div> -->

    <!-- <div class="card">
      <h3 class="card-title">Submission</h3>
      <p style="margin-bottom: 1rem; color: #666; font-size: 0.875rem;">
        Select a final version to submit for grading.
      </p>
      <button class="btn btn-success" id="submitBtn" style="width: 100%;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9,11 12,14 22,4" />
          <path d="M21,12v7a2,2 0,0,1-2,2H5a2,2 0,0,1-2-2V5a2,2 0,0,1,2-2h11" />
        </svg>
        Submit Assignment
      </button>
    </div> -->
  </div>
</template>

<style scoped>
.add-new-comment {
  padding: 1rem;
  border-top: 1px solid #DBDBDB;
  text-align: right;
  color: #003a78;
  font-size: 14px;
}

.stickers-container {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.sticker-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  border-radius: 4px;
  cursor: grab;
  transition: background-color 0.2s;
}

.sticker-item:hover {
  background-color: #f8f9fa;
}

.sticker-item:active {
  cursor: grabbing;
}

.sticker-svg {
  flex-shrink: 0;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
}

.sticker-label {
  font-size: 14px;
  color: #374151;
  font-weight: 500;
}

.sticker-item:hover .sticker-svg {
  transform: scale(1.05);
  transition: transform 0.2s;
}
</style>