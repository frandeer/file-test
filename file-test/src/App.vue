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
const editingRepo = reactive({ id: "", command: "", args: "", active: true, isEditing: false });

async function refreshMcpList() {
  await saveMcpListToFile();
  mcpList.value = getMcpList(); // 저장 후에도 동기화!
}

async function addRepo() {
  try {
    if (!newRepo.id || !newRepo.command) {
      alert('ID와 Command는 필수 입력 항목입니다.');
      return;
    }
    
    addMcpRepo({
      id: newRepo.id.trim(),
      command: newRepo.command.trim(),
      args: newRepo.args.split(",").map(s => s.trim()).filter(Boolean),
      active: newRepo.active
    });
    
    // 즉시 JSON 파일에 저장
    await saveMcpListToFile();
    // 목록 새로고침
    mcpList.value = getMcpList();
    
    // 불러온 파일 업데이트 (활성화된 저장소만 포함)
    if (newRepo.active) {
      await updateLoadedFileWithActiveMcps();
    }
    
    // 입력 폼 초기화
    newRepo.id = ""; 
    newRepo.command = ""; 
    newRepo.args = ""; 
    newRepo.active = true;
    
    // 성공 메시지
    alert('저장소가 성공적으로 추가되었습니다.');
  } catch (e) {
    alert(`저장소 추가 중 오류 발생: ${e.message}`);
  }
}

async function deleteRepo(id) {
  try {
    if (confirm(`'${id}' 저장소를 정말 삭제하시겠습니까?`)) {
      removeMcpRepo(id);
      // 즉시 JSON 파일에 저장
      await saveMcpListToFile();
      // 목록 새로고침
      mcpList.value = getMcpList();
    }
  } catch (e) {
    alert(`저장소 삭제 중 오류 발생: ${e.message}`);
  }
}

// 불러온 파일을 활성화된 MCP 저장소로 업데이트하는 함수
async function updateLoadedFileWithActiveMcps() {
  // 불러온 파일이 없으면 아무것도 하지 않음
  if (!lastFilePath.value || !fileContent.value) return;
  
  try {
    // 현재 파일 콘텐츠를 JSON으로 파싱
    const fileJson = JSON.parse(fileContent.value);
    
    // mcpServers 객체가 없으면 생성
    if (!fileJson.mcpServers) {
      fileJson.mcpServers = {};
    }
    
    // 현재 활성화된 MCP 저장소만 추출
    const activeMcps = mcpList.value.filter(repo => repo.active);
    
    // 활성화된 저장소만 파일에 유지하고 나머지는 삭제
    // 먼저 현재 mcpServers에서 active 아닌 것들을 삭제
    Object.keys(fileJson.mcpServers).forEach(id => {
      const isActive = activeMcps.some(repo => repo.id === id);
      if (!isActive) {
        delete fileJson.mcpServers[id];
      }
    });
    
    // 활성화된 저장소들을 파일에 추가/업데이트
    activeMcps.forEach(repo => {
      // active 속성은 제외하고 저장
      const { active, ...repoWithoutActive } = {
        id: repo.id,
        command: repo.command,
        args: repo.args,
        active: repo.active
      };
      
      fileJson.mcpServers[repo.id] = repoWithoutActive;
    });
    
    // 업데이트된 JSON 다시 문자열로 변환 (예쁘게 포맷팅)
    const updatedContent = JSON.stringify(fileJson, null, 2);
    fileContent.value = updatedContent;
    
    // 파일 저장 (새로운 save_file 함수 사용)
    await invoke("save_file", { path: lastFilePath.value, content: updatedContent });
    console.log('파일 업데이트 완료:', lastFilePath.value);
  } catch (e) {
    console.error('파일 업데이트 오류:', e);
    errorMsg.value = `파일 업데이트 중 오류 발생: ${e.message}`;
  }
}

async function toggleActive(id) {
  try {
    // 먼저 UI에 즉시 반영하기 위해 로컬 상태 변경
    const repoIndex = mcpList.value.findIndex(r => r.id === id);
    if (repoIndex === -1) return;
    
    // 로컬 상태 변경 (즉시 UI 반영)
    const newActive = !mcpList.value[repoIndex].active;
    mcpList.value[repoIndex].active = newActive;
    
    // 전역 상태 변경
    if (newActive) {
      activateMcpRepo(id);
    } else {
      deactivateMcpRepo(id);
    }
    
    // MCP 목록 저장
    try {
      await saveMcpListToFile();
    } catch (e) {
      console.error('활성화 상태 저장 실패:', e);
      // 저장 실패 시 로컬 상태 되돌리기
      mcpList.value[repoIndex].active = !newActive;
      alert(`활성화 상태 저장 실패: ${e.message}`);
      return; // 오류 발생 시 여기서 종료
    }
    
    // 불러온 파일 업데이트 (활성화된 저장소만 포함)
    if (lastFilePath.value && fileContent.value) {
      try {
        await updateLoadedFileWithActiveMcps();
      } catch (e) {
        console.error('파일 업데이트 오류:', e);
        errorMsg.value = `파일 업데이트 중 오류 발생: ${e.message}`;
      }
    }
  } catch (e) {
    console.error('활성화 상태 변경 오류:', e);
    alert(`활성화 상태 변경 중 오류 발생: ${e.message}`);
  }
}

function startEditing(repo) {
  editingRepo.id = repo.id;
  editingRepo.command = repo.command;
  editingRepo.args = repo.args.join(',');
  editingRepo.active = repo.active;
  editingRepo.isEditing = true;
}

async function saveEdit() {
  try {
    if (!editingRepo.command) {
      alert('Command는 필수 입력 항목입니다.');
      return;
    }
    
    editMcpRepo(editingRepo.id, {
      command: editingRepo.command.trim(),
      args: editingRepo.args.split(",").map(s => s.trim()).filter(Boolean),
      active: editingRepo.active
    });
    
    // 즉시 JSON 파일에 저장
    await saveMcpListToFile();
    // 목록 새로고침
    mcpList.value = getMcpList();
    
    // 불러온 파일 업데이트 (활성화된 저장소만 포함)
    await updateLoadedFileWithActiveMcps();
    
    // 편집 모드 종료
    cancelEdit();
    
    // 성공 메시지
    alert('저장소가 성공적으로 수정되었습니다.');
  } catch (e) {
    alert(`저장소 수정 중 오류 발생: ${e.message}`);
  }
}

function cancelEdit() {
  editingRepo.id = "";
  editingRepo.command = "";
  editingRepo.args = "";
  editingRepo.active = true;
  editingRepo.isEditing = false;
}

// 앱 초기화 시 MCP 목록 로드
onMounted(async () => {
  try {
    await loadMcpListFromFile();
    mcpList.value = getMcpList();
    console.log('MCP 목록 로드 완료:', mcpList.value);
  } catch (e) {
    console.error('MCP 목록 로드 실패:', e);
    alert('MCP 목록을 불러오는 중 오류가 발생했습니다.');
  }
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
      
      // 파일 업데이트 - 활성화된 저장소만 포함하도록
      await updateLoadedFileWithActiveMcps();
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
  <main class="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-5xl mx-auto">
      <h1 class="text-3xl font-bold text-center text-gray-800 mb-8 p-4">MCP-Server 관리</h1>
      
      <div class="flex justify-center space-x-4 mb-6">
        <button @click="selectFile" class="px-5 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium transition-colors duration-200 shadow-sm">
          <span class="flex items-center gap-2"><span>📂</span> 파일 선택</span>
        </button>
        <button @click="resetFile" class="px-5 py-2.5 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 font-medium transition-colors duration-200 shadow-sm">
          <span class="flex items-center gap-2"><span>🔄</span> 기록 초기화</span>
        </button>
      </div>
      
      <div v-if="lastFilePath" class="bg-blue-50 p-4 rounded-md mb-6 shadow-sm border border-blue-100">
        <p class="text-sm text-blue-800"><span class="font-medium">불러온 파일 경로:</span> {{ lastFilePath }}</p>
      </div>
      
      <div v-if="errorMsg" class="bg-red-50 p-4 rounded-md mb-6 text-red-700 shadow-sm border border-red-100">{{ errorMsg }}</div>

      <!-- MCP 저장소 관리 UI -->
      <section class="bg-white p-6 rounded-lg shadow-md mt-8">
        <h2 class="text-xl font-semibold text-gray-800 mb-6 border-b pb-3">MCP 저장소 관리</h2>
        
        <!-- 수정 모드 폼 -->
        <form v-if="editingRepo.isEditing" @submit.prevent="saveEdit" class="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 class="text-lg font-medium text-blue-800 mb-3">저장소 수정</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">ID</label>
              <input 
                v-model="editingRepo.id" 
                disabled
                class="px-3 py-2 border border-gray-300 bg-gray-100 rounded-md w-full"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Command</label>
              <input 
                v-model="editingRepo.command" 
                required 
                class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Arguments (쉼표로 구분)</label>
              <input 
                v-model="editingRepo.args" 
                class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
              />
            </div>
            <div>
              <label class="flex items-center gap-2 cursor-pointer mt-6">
                <input type="checkbox" v-model="editingRepo.active" class="rounded text-blue-600 focus:ring-blue-500 h-4 w-4" />
                <span class="text-sm text-gray-700">활성화</span>
              </label>
            </div>
          </div>
          <div class="flex justify-end gap-3">
            <button 
              type="button" 
              @click="cancelEdit"
              class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              취소
            </button>
            <button 
              type="submit" 
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              저장
            </button>
          </div>
        </form>
        
        <!-- 추가 폼 -->
        <form v-else @submit.prevent="addRepo" class="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 class="text-lg font-medium text-gray-800 mb-3">새 저장소 추가</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">ID</label>
              <input 
                v-model="newRepo.id" 
                placeholder="저장소 ID" 
                required 
                class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Command</label>
              <input 
                v-model="newRepo.command" 
                placeholder="실행 명령어" 
                required 
                class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Arguments (쉼표로 구분)</label>
              <input 
                v-model="newRepo.args" 
                placeholder="arg1, arg2, ..." 
                class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
              />
            </div>
            <div>
              <label class="flex items-center gap-2 cursor-pointer mt-6">
                <input type="checkbox" v-model="newRepo.active" class="rounded text-blue-600 focus:ring-blue-500 h-4 w-4" />
                <span class="text-sm text-gray-700">활성화</span>
              </label>
            </div>
          </div>
          <div class="flex justify-end">
            <button 
              type="submit" 
              class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 flex items-center gap-2"
            >
              <span>➕</span> 추가
            </button>
          </div>
        </form>
        
        <!-- 저장소 목록 -->
        <div class="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-100">
              <tr>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Command</th>
                <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">작업</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="repo in mcpList" :key="repo.id" class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="font-medium text-gray-900">{{ repo.id }}</div>
                </td>
                <td class="px-6 py-4">
                  <div class="text-sm text-gray-500">{{ repo.command }} {{ repo.args.join(' ') }}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div class="flex justify-end gap-2">
                                      <!-- 토글 스위치 -->
                                      <div 
                      @click="toggleActive(repo.id)"
                      class="relative inline-flex items-center cursor-pointer"
                    >
                      <div 
                        class="w-11 h-6 rounded-full transition-colors duration-200"
                        :class="repo.active ? 'bg-green-500' : 'bg-gray-300'"
                      >
                        <div 
                          class="absolute left-1 top-1 bg-white w-4 h-4 rounded-full shadow transform transition-transform duration-200"
                          :class="repo.active ? 'translate-x-5' : ''"
                        ></div>
                      </div>
                      <span class="ml-2 text-sm" :class="repo.active ? 'text-green-600' : 'text-gray-500'">
                        {{ repo.active ? '활성화' : '비활성화' }}
                      </span>
                    </div>
                    <button 
                      @click="startEditing(repo)"
                      class="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors duration-200"
                    >
                      수정
                    </button>

                    <button 
                      @click="deleteRepo(repo.id)"
                      class="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-2 py-1 rounded transition-colors duration-200"
                    >
                      삭제
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="mcpList.length === 0">
                <td colspan="4" class="px-6 py-4 text-center text-gray-500">등록된 저장소가 없습니다.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </main>
</template>

<style>
/* Global styles now handled by Tailwind */
</style>
