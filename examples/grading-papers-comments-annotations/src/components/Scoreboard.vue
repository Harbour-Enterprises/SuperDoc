<template>
  <div class="scoreboard">
    <h2 class="scoreboard-title">Grading Scoreboard</h2>
    <div class="score-categories">
      <!-- Great Work (check-mark + full-check + half-check) -->
      <div class="score-category great">
        <div class="category-icon">
          <svg width="20" height="20" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="18" fill="#22C55E" stroke="#16A34A" stroke-width="2"/>
            <path d="M12 20l6 6L28 14" stroke="white" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="category-info">
          <div class="category-label">Great work</div>
        </div>
        <div class="category-score">{{ scores['check-mark'] * stickerPoints['check-mark'] + scores['full-check'] * stickerPoints['full-check'] + scores['half-check'] * stickerPoints['half-check'] }}</div>
      </div>

      <!-- Nice Job -->
      <div class="score-category nice">
        <div class="category-icon">
          <svg width="20" height="20" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="18" fill="#3B82F6" stroke="#2563EB" stroke-width="2"/>
            <circle cx="15" cy="16" r="2" fill="white"/>
            <circle cx="25" cy="16" r="2" fill="white"/>
            <path d="M13 25c2 3 6 3 8 0" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/>
            <path d="M27 25c-2 3-6 3-8 0" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="category-info">
          <div class="category-label">Nice job</div>
        </div>
        <div class="category-score">{{ scores['nice'] * stickerPoints['nice'] }}</div>
      </div>

      <!-- Needs Work -->
      <div class="score-category needs">
        <div class="category-icon">
          <svg width="20" height="20" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="18" fill="#F59E0B" stroke="#D97706" stroke-width="2"/>
            <path d="M20 12v10" stroke="white" stroke-width="3" stroke-linecap="round"/>
            <circle cx="20" cy="28" r="2" fill="white"/>
          </svg>
        </div>
        <div class="category-info">
          <div class="category-label">Needs Work</div>
        </div>
        <div class="category-score">{{ scores['needs-improvement'] * stickerPoints['needs-improvement'] }}</div>
      </div>

      <!-- Total Score -->
      <div class="score-category total">
        <div class="category-info">
          <div class="category-label">Total Score:</div>
        </div>
        <div class="category-score total-score">{{ totalScore }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  scores: {
    type: Object,
    required: true
  },
  stickerPoints: {
    type: Object,
    required: true
  },
  totalScore: {
    type: Number,
    required: true
  }
});
</script>

<style scoped>
.scoreboard {
  background: white;
  border-radius: 4px;
  padding: 1.5rem;
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
  margin-bottom: 2rem;
}

.scoreboard-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #2d3748;
  text-align: center;
}

.score-categories {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.score-category {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: 4px;
  min-height: 60px;
}

.score-category.great {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
}

.score-category.nice {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
}

.score-category.needs {
  background: #fffbeb;
  border: 1px solid #fed7aa;
}

.score-category.total {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  font-weight: 600;
}

.category-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.category-info {
  flex: 1;
}

.category-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.category-score {
  font-size: 1.5rem;
  font-weight: 600;
  color: #2d3748;
}

.total-score {
  color: #1f2937;
  font-size: 1.75rem;
}

@media (max-width: 768px) {
  .score-categories {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }
  
  .score-category {
    padding: 0.75rem;
    flex-direction: column;
    text-align: center;
    gap: 0.5rem;
  }
}
</style>