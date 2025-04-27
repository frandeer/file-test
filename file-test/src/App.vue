<script setup>
import { ref, onMounted, reactive } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { openFileDialog } from "./fileDialog";
import {
  addMcpRepo,
  editMcpRepo,
  removeMcpRepo,
  activateMcpRepo,
  deactivateMcpRepo,
  getMcpList,
  loadMcpListFromFile,
  saveMcpListToFile,
  autoAddMcpReposFromFileContent
} from "./mcpListManager";

const fileContent = ref("");
const lastFilePath = ref("");
const errorMsg = ref("");

// MCP 저장소 관리
const mcpList = ref(getMcpList());
const newRepo = reactive({ id: "", command: "", args: "", active: true });

async function refreshMcpList() {
  await saveMcpListToFile();
  mcpList.value = getMcpList(); // 저장 후에도 동기화!
}

async function addRepo() {
  try {
    addMcpRepo({
      id: newRepo.id,
      command: newRepo.command,
      args: newRepo.args.split(",").map(s => s.trim()).filter(Boolean),
      active: newRepo.active
    });
    await saveMcpListToFile();
    mcpList.value = getMcpList(); // 동기화
    newRepo.id = ""; newRepo.command = ""; newRepo.args = ""; newRepo.active = true;
  } catch (e) {
    alert(e.message);
  }
}

async function deleteRepo(id) {
  removeMcpRepo(id);
  await saveMcpListToFile();
  mcpList.value = getMcpList(); // 동기화
}

async function toggleActive(id) {
  const repo = mcpList.value.find(r => r.id === id);
  if (repo.active) {
    deactivateMcpRepo(id);
  } else {
    activateMcpRepo(id);
  }
  await saveMcpListToFile();
  mcpList.value = getMcpList(); // 동기화
}

onMounted(async () => {
  await loadMcpListFromFile();
  mcpList.value = getMcpList();
});

async function selectFile() {
  errorMsg.value = "";
  const path = await openFileDialog();
  if (path) {
    try {
      const content = await invoke("open_file", { path });
      fileContent.value = content;
      lastFilePath.value = path;
      // 파일 내용에서 mcpServers 패턴 자동 추가
      await autoAddMcpReposFromFileContent(content);
      await saveMcpListToFile();
      mcpList.value = getMcpList(); // 동기화
    } catch (e) {
      errorMsg.value = e;
    }
  }
}

async function loadLastFile() {
  errorMsg.value = "";
  try {
    const content = await invoke("read_last_file");
    fileContent.value = content;
    const path = await invoke("get_last_file");
    lastFilePath.value = path;
  } catch (e) {
    fileContent.value = "";
    lastFilePath.value = "";
    errorMsg.value = "이전에 불러온 파일이 없습니다.";
  }
}

async function resetFile() {
  await invoke("reset_last_file");
  fileContent.value = "";
  lastFilePath.value = "";
  errorMsg.value = "파일 기록이 초기화되었습니다.";
}

onMounted(() => {
  loadLastFile();
});
</script>

<template>
  <main class="container">
    <h1>파일 컨트롤 테스트 (Tauri + Vue3)</h1>
    <div>
      <button @click="selectFile">파일 선택</button>
      <button @click="resetFile">기록 초기화</button>
    </div>
    <div v-if="lastFilePath">
      <p><b>불러온 파일 경로:</b> {{ lastFilePath }}</p>
    </div>
    <div v-if="errorMsg" style="color:red; margin-top:1em;">{{ errorMsg }}</div>

    <!-- MCP 저장소 관리 UI -->
    <section style="margin-top:2em; padding:1em; border:1px solid #ccc; border-radius:8px; background:#fafbfc;">
      <h2>MCP 저장소 관리</h2>
      <form @submit.prevent="addRepo" style="margin-bottom:1em; display:flex; gap:0.5em; flex-wrap:wrap; align-items:center;">
        <input v-model="newRepo.id" placeholder="id" required style="width:120px;" />
        <input v-model="newRepo.command" placeholder="command" required style="width:120px;" />
        <input v-model="newRepo.args" placeholder="args (쉼표로 구분)" style="width:180px;" />
        <label style="display:flex; align-items:center; gap:0.2em;">
          <input type="checkbox" v-model="newRepo.active" /> 활성화
        </label>
        <button type="submit">추가</button>
      </form>
      <ul style="text-align:left; max-width:600px; margin:0 auto;">
        <li v-for="repo in mcpList" :key="repo.id" style="margin-bottom:0.5em; padding:0.5em; border-bottom:1px solid #eee; display:flex; align-items:center; gap:0.5em;">
          <b>{{ repo.id }}</b>
          <span>({{ repo.command }} {{ repo.args.join(' ') }})</span>
          <button @click="toggleActive(repo.id)">
            {{ repo.active ? '비활성화' : '활성화' }}
          </button>
          <button @click="deleteRepo(repo.id)">삭제</button>
        </li>
      </ul>
    </section>
  </main>
</template>

<style scoped>
.logo.vite:hover {
  filter: drop-shadow(0 0 2em #747bff);
}

.logo.vue:hover {
  filter: drop-shadow(0 0 2em #249b73);
}

</style>
<style>
:root {
  font-family: Inter, Avenir, Helvetica, Arial, sans-serif;
  font-size: 16px;
  line-height: 24px;
  font-weight: 400;

  color: #0f0f0f;
  background-color: #f6f6f6;

  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -webkit-text-size-adjust: 100%;
}

.container {
  margin: 0;
  padding-top: 10vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  text-align: center;
}

.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: 0.75s;
}

.logo.tauri:hover {
  filter: drop-shadow(0 0 2em #24c8db);
}

.row {
  display: flex;
  justify-content: center;
}

a {
  font-weight: 500;
  color: #646cff;
  text-decoration: inherit;
}

a:hover {
  color: #535bf2;
}

h1 {
  text-align: center;
}

input,
button {
  border-radius: 8px;
  border: 1px solid transparent;
  padding: 0.6em 1.2em;
  font-size: 1em;
  font-weight: 500;
  font-family: inherit;
  color: #0f0f0f;
  background-color: #ffffff;
  transition: border-color 0.25s;
  box-shadow: 0 2px 2px rgba(0, 0, 0, 0.2);
}

button {
  cursor: pointer;
}

button:hover {
  border-color: #396cd8;
}
button:active {
  border-color: #396cd8;
  background-color: #e8e8e8;
}

input,
button {
  outline: none;
}

#greet-input {
  margin-right: 5px;
}

@media (prefers-color-scheme: dark) {
  :root {
    color: #f6f6f6;
    background-color: #2f2f2f;
  }

  a:hover {
    color: #24c8db;
  }

  input,
  button {
    color: #ffffff;
    background-color: #0f0f0f98;
  }
  button:active {
    background-color: #0f0f0f69;
  }
}

</style>
