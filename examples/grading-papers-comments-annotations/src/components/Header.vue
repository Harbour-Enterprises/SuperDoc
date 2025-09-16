<script setup>
</script>

<template>
  <header class="header" id="header">
    <div class="header-content">
      <div class="logo">
        <div class="logo-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#667eea" stroke-width="2" stroke-linejoin="round" />
            <path d="M2 17L12 22L22 17" stroke="#667eea" stroke-width="2" stroke-linejoin="round" />
            <path d="M2 12L12 17L22 12" stroke="#667eea" stroke-width="2" stroke-linejoin="round" />
          </svg>
        </div>
        <div>
          <h1>Student Portal</h1>
          <small>Document Management System</small>
        </div>
      </div>
      <div class="user-info user-switcher" id="userSwitcher">
        <div class="user-avatar" id="userAvatar">AJ</div>
        <div>
          <div id="userName">Sarah Smith</div>
          <small id="userRole">Professor</small>
        </div>
        <div class="user-dropdown" id="userDropdown">
          <div class="user-option active" data-user="student">
            <div class="user-option-name">Alex Johnson</div>
            <div class="user-option-email">alex.johnson@aol.com</div>
            <div class="user-option-role">Student</div>
          </div>
          <div class="user-option" data-user="professor">
            <div class="user-option-name">Sarah Smith</div>
            <div class="user-option-email">sarah.smith@uni.edu</div>
            <div class="user-option-role">Professor</div>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped></style>