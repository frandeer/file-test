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
  <main class="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-4xl mx-auto">
      <h1 class="text-3xl font-bold text-center text-gray-800 mb-8">파일 컨트롤 테스트 (Tauri + Vue3)</h1>
      
      <div class="flex justify-center space-x-4 mb-6">
        <button @click="selectFile" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
          파일 선택
        </button>
        <button @click="resetFile" class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2">
          기록 초기화
        </button>
      </div>
      
      <div v-if="lastFilePath" class="bg-blue-50 p-4 rounded-md mb-6">
        <p class="text-sm text-blue-800"><span class="font-medium">불러온 파일 경로:</span> {{ lastFilePath }}</p>
      </div>
      
      <div v-if="errorMsg" class="bg-red-50 p-4 rounded-md mb-6 text-red-700">{{ errorMsg }}</div>

      <!-- MCP 저장소 관리 UI -->
      <section class="bg-white p-6 rounded-lg shadow-md mt-8">
        <h2 class="text-xl font-semibold text-gray-800 mb-6">MCP 저장소 관리</h2>
        
        <form @submit.prevent="addRepo" class="mb-6 flex flex-wrap gap-3 items-center">
          <input 
            v-model="newRepo.id" 
            placeholder="id" 
            required 
            class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-28"
          />
          <input 
            v-model="newRepo.command" 
            placeholder="command" 
            required 
            class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-28"
          />
          <input 
            v-model="newRepo.args" 
            placeholder="args (쉼표로 구분)" 
            class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-44"
          />
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" v-model="newRepo.active" class="rounded text-blue-600 focus:ring-blue-500 h-4 w-4" />
            <span class="text-sm text-gray-700">활성화</span>
          </label>
          <button 
            type="submit" 
            class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            추가
          </button>
        </form>
        
        <ul class="divide-y divide-gray-200">
          <li 
            v-for="repo in mcpList" 
            :key="repo.id" 
            class="py-3 flex items-center justify-between"
          >
            <div class="flex items-center gap-2">
              <span class="font-medium text-gray-800">{{ repo.id }}</span>
              <span class="text-sm text-gray-500">({{ repo.command }} {{ repo.args.join(' ') }})</span>
            </div>
            <div class="flex items-center gap-2">
              <button 
                @click="toggleActive(repo.id)"
                :class="[
                  'text-sm px-3 py-1 rounded focus:outline-none focus:ring-2',
                  repo.active 
                    ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 focus:ring-yellow-500' 
                    : 'bg-green-100 text-green-800 hover:bg-green-200 focus:ring-green-500'
                ]"
              >
                {{ repo.active ? '비활성화' : '활성화' }}
              </button>
              <button 
                @click="deleteRepo(repo.id)"
                class="text-sm px-3 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                삭제
              </button>
            </div>
          </li>
        </ul>
      </section>
    </div>
  </main>
</template>

<style>
/* Global styles now handled by Tailwind */
</style>
