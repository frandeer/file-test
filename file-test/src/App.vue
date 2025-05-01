<script setup>
import { ref, onMounted, reactive, watch, computed } from "vue";
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

// Import shadcn UI components
import UiButton from '@/components/ui/button.vue';
import UiCard from '@/components/ui/card.vue';
import UiSwitch from '@/components/ui/switch.vue';
import UiTable from '@/components/ui/table.vue';

// Lucide 아이콘 가져오기
import { X, Plus, Save, Trash2, Edit, Power, Sun, Moon, FileText, Check } from 'lucide-vue-next';

// 디버깅용 로그 추가
console.log('환경 변수 형식 변경됨: 배열에서 객체로');

const fileContent = ref("");
const lastFilePath = ref("");
const errorMsg = ref("");
const theme = ref(localStorage.getItem('theme') || 'system');
const showFileContent = ref(false); // 파일 내용 표시 토글
// 다크 모드 확인을 위한 상태
const isDarkMode = ref(false);

// Handle theme changes
function setTheme(newTheme) {
  theme.value = newTheme;
  localStorage.setItem('theme', newTheme);
  
  // isDarkMode 상태 업데이트
  updateDarkMode();
  
  // Apply theme to document
  document.documentElement.classList.toggle('dark', isDarkMode.value);
}

// 다크 모드 상태 업데이트 함수
function updateDarkMode() {
  if (theme.value === 'dark') {
    isDarkMode.value = true;
  } else if (theme.value === 'light') {
    isDarkMode.value = false;
  } else if (theme.value === 'system' && typeof window !== 'undefined' && window.matchMedia) {
    isDarkMode.value = window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
}

// Watch for system theme changes when in system mode
watch(theme, (newTheme) => {
  setTheme(newTheme);
});

// Show form modal
const showAddForm = ref(false);
const showEditForm = ref(false);

// MCP 저장소 관리
const mcpList = ref(getMcpList());
// 팝업 폼 표시 여부
const showAddModal = ref(false);
const showEditModal = ref(false);

// 저장소 유형
const REPO_TYPES = {
  STDIO: 'stdio',
  SSE: 'sse'
};

// 새 저장소 기본 상태
const newRepo = reactive({ 
  id: "", 
  type: REPO_TYPES.STDIO,
  command: "", 
  args: "", 
  url: "",
  env: {},
  active: true 
});

// 환경변수 관리를 위한 새 항목
const newEnvVar = reactive({ key: "", value: "" });

// 편집 중인 저장소 상태
const editingRepo = reactive({ 
  id: "", 
  type: REPO_TYPES.STDIO,
  command: "", 
  args: "", 
  url: "",
  env: {},
  active: true, 
  isEditing: false 
});

async function refreshMcpList() {
  await saveMcpListToFile();
  mcpList.value = getMcpList(); // 저장 후에도 동기화!
}

// 환경변수 추가 함수
function addEnvVar() {
  if (!newEnvVar.key) return;
  
  if (editingRepo.isEditing) {
    editingRepo.env[newEnvVar.key] = newEnvVar.value;
  } else {
    newRepo.env[newEnvVar.key] = newEnvVar.value;
  }
  
  // 항목 초기화
  newEnvVar.key = "";
  newEnvVar.value = "";
}

// 환경변수 삭제 함수
function removeEnvVar(key, isEditing = false) {
  if (isEditing) {
    delete editingRepo.env[key];
  } else {
    delete newRepo.env[key];
  }
}

async function addRepo() {
  try {
    if (!newRepo.id) {
      alert('ID\ub294 \ud544\uc218 \uc785\ub825 \ud56d\ubaa9\uc785\ub2c8\ub2e4.');
      return;
    }
    
    if (newRepo.type === REPO_TYPES.STDIO && !newRepo.command) {
      alert('stdio \ud0c0\uc785\uc740 Command\uac00 \ud544\uc218\uc785\ub2c8\ub2e4.');
      return;
    }
    
    if (newRepo.type === REPO_TYPES.SSE && !newRepo.url) {
      alert('SSE \ud0c0\uc785\uc740 URL\uc774 \ud544\uc218\uc785\ub2c8\ub2e4.');
      return;
    }
    
    const repoData = {
      id: newRepo.id.trim(),
      type: newRepo.type,
      active: newRepo.active,
      env: { ...newRepo.env }
    };
    
    // 타입에 따라 필요한 필드 추가
    if (newRepo.type === REPO_TYPES.STDIO) {
      repoData.command = newRepo.command.trim();
      repoData.args = newRepo.args.split(",").map(s => s.trim()).filter(Boolean);
    } else if (newRepo.type === REPO_TYPES.SSE) {
      repoData.url = newRepo.url.trim();
    }
    
    addMcpRepo(repoData);
    
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
    newRepo.type = REPO_TYPES.STDIO;
    newRepo.command = ""; 
    newRepo.args = ""; 
    newRepo.url = "";
    newRepo.env = {};
    newRepo.active = true;
    
    // 모달 닫기
    showAddModal.value = false;
    
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
      // 필요한 속성을 포함한 객체 생성
      let repoData = {};
      
      // 타입에 따라 필요한 필드 추가
      if (repo.type === REPO_TYPES.STDIO) {
        repoData.command = repo.command;
        repoData.args = repo.args;
      } else if (repo.type === REPO_TYPES.SSE) {
        repoData.url = repo.url;
      }
      
      // 환경 변수 추가 (있는 경우)
      if (repo.env && Object.keys(repo.env).length > 0) {
        repoData.env = repo.env;
      }
      
      fileJson.mcpServers[repo.id] = repoData;
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
  editingRepo.type = repo.type || REPO_TYPES.STDIO;
  editingRepo.command = repo.command || "";
  editingRepo.args = repo.args ? repo.args.join(',') : "";
  editingRepo.url = repo.url || "";
  editingRepo.env = repo.env ? { ...repo.env } : {};
  editingRepo.active = repo.active;
  editingRepo.isEditing = true;
  
  // 편집 모달 열기
  showEditModal.value = true;
}

async function saveEdit() {
  try {
    if (editingRepo.type === REPO_TYPES.STDIO && !editingRepo.command) {
      alert('stdio \ud0c0\uc785\uc740 Command\uac00 \ud544\uc218\uc785\ub2c8\ub2e4.');
      return;
    }
    
    if (editingRepo.type === REPO_TYPES.SSE && !editingRepo.url) {
      alert('SSE \ud0c0\uc785\uc740 URL\uc774 \ud544\uc218\uc785\ub2c8\ub2e4.');
      return;
    }
    
    const repoData = {
      type: editingRepo.type,
      active: editingRepo.active,
      env: { ...editingRepo.env }
    };
    
    // 타입에 따라 필요한 필드 추가
    if (editingRepo.type === REPO_TYPES.STDIO) {
      repoData.command = editingRepo.command.trim();
      repoData.args = editingRepo.args.split(",").map(s => s.trim()).filter(Boolean);
    } else if (editingRepo.type === REPO_TYPES.SSE) {
      repoData.url = editingRepo.url.trim();
    }
    
    editMcpRepo(editingRepo.id, repoData);
    
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
  editingRepo.type = REPO_TYPES.STDIO;
  editingRepo.command = "";
  editingRepo.args = "";
  editingRepo.url = "";
  editingRepo.env = {};
  editingRepo.active = true;
  editingRepo.isEditing = false;
  
  // 편집 모달 닫기
  showEditModal.value = false;
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
  
  // window 객체 접근이 안전한지 확인
  if (typeof window !== 'undefined' && window.matchMedia) {
    // 초기 다크 모드 상태 설정
    updateDarkMode();
    
    // Initialize theme based on saved preference
    setTheme(theme.value);
    
    // Add listener for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (theme.value === 'system') {
        updateDarkMode();
        document.documentElement.classList.toggle('dark', isDarkMode.value);
      }
    });
  }
});

// 포맷된 JSON 반환 함수
function getPrettyJson() {
  try {
    if (!fileContent.value) return "";
    const jsonObj = JSON.parse(fileContent.value);
    return JSON.stringify(jsonObj, null, 2);
  } catch (e) {
    return fileContent.value;
  }
}
</script>

<template>
  <main class="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
    <div class="max-w-5xl mx-auto">
      <div class="flex justify-between items-center mb-8">
        <h1 class="text-3xl font-bold p-4">MCP-Server 관리</h1>
        <div class="flex items-center gap-2">
          <UiButton 
            @click="() => {
              setTheme(isDarkMode ? 'light' : 'dark');
            }" 
            variant="ghost" 
            size="icon" 
            :class="{ 'bg-accent': !isDarkMode }"
          >
            <Sun v-if="!isDarkMode" class="h-5 w-5" />
            <Moon v-else class="h-5 w-5" />
          </UiButton>
        </div>
      </div>
      
      <div class="flex justify-end space-x-4 mb-6">
        <UiButton @click="selectFile" variant="default" class="gap-2">
          <FileText class="h-4 w-4" />
          파일 선택
        </UiButton>
        <!-- <UiButton @click="resetFile" variant="destructive" class="gap-2">
          <Trash2 class="h-4 w-4" />
          초기화
        </UiButton> -->
      </div>
      
      <UiCard v-if="lastFilePath" class="mb-6">
        <div 
          class="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors"
          @click="showFileContent = !showFileContent"
        >
          <div class="flex items-center gap-2">
            <FileText class="h-5 w-5 text-primary" />
            <p class="text-sm"><span class="font-medium">불러온 파일 경로:</span> {{ lastFilePath }}</p>
          </div>
          <div class="text-muted-foreground transition-transform duration-200" :class="{ 'rotate-180': showFileContent }">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
        </div>
        
        <div v-if="showFileContent" class="px-4 pb-4 pt-0">
          <div class="mt-2 p-4 bg-muted rounded-md overflow-auto max-h-96">
            <pre class="text-xs leading-relaxed whitespace-pre-wrap break-all"><code>{{ getPrettyJson() }}</code></pre>
          </div>
        </div>
      </UiCard>
      
      <UiCard v-if="errorMsg" class="mb-6 border-destructive">
        <div class="p-4 text-destructive">{{ errorMsg }}</div>
      </UiCard>

      <!-- MCP 저장소 관리 UI -->
      <UiCard class="mt-8">
        <div class="p-6">
          <h2 class="text-2xl font-semibold mb-6 border-b pb-3">MCP 저장소 관리</h2>
        
        <!-- 수정 모달 -->
        <div v-if="showEditModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <!-- 모달 -->
          <div class="bg-background rounded-lg shadow-lg w-full max-w-2xl overflow-hidden">
            <!-- 모달 헤더 -->
            <div class="flex justify-between items-center p-4 border-b">
              <h3 class="text-xl font-semibold">저장소 수정</h3>
              <UiButton @click="cancelEdit" variant="ghost" size="icon">
                <X class="h-5 w-5" />
              </UiButton>
            </div>
            
            <!-- 모달 본문 -->
            <form @submit.prevent="saveEdit" class="p-6">
              <!-- 기본 정보 -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label class="block text-sm font-medium mb-1">ID</label>
                  <input 
                    v-model="editingRepo.id" 
                    disabled
                    class="px-3 py-2 border border-input bg-muted rounded-md w-full"
                  />
                </div>
                
                <div>
                  <label class="block text-sm font-medium mb-1">저장소 유형</label>
                  <select v-model="editingRepo.type" class="px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring w-full bg-background">
                    <option :value="REPO_TYPES.STDIO">Standard IO (stdio)</option>
                    <option :value="REPO_TYPES.SSE">Server-Sent Events (sse)</option>
                  </select>
                </div>
              </div>
              
              <!-- STDIO 유형 필드 -->
              <div v-if="editingRepo.type === REPO_TYPES.STDIO" class="mb-4">
                <h4 class="text-sm font-medium mb-2 pb-1 border-b">STDIO 설정</h4>
                <div class="flex flex-col gap-2">
                  <div>
                    <label class="block text-sm font-medium mb-1">Command</label>
                    <input 
                      v-model="editingRepo.command" 
                      placeholder="실행 명령어" 
                      class="px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring w-full bg-background"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium mb-1">Arguments (쉼표로 구분)</label>
                    <input 
                      v-model="editingRepo.args" 
                      placeholder="arg1, arg2, ..." 
                      class="px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring w-full bg-background"
                    />
                  </div>
                </div>
              </div>
              
              <!-- SSE 유형 필드 -->
              <div v-if="editingRepo.type === REPO_TYPES.SSE" class="mb-4">
                <h4 class="text-sm font-medium mb-2 pb-1 border-b">SSE 설정</h4>
                <div>
                  <label class="block text-sm font-medium mb-1">URL</label>
                  <input 
                    v-model="editingRepo.url" 
                    placeholder="https://example.com/events" 
                    class="px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring w-full bg-background"
                  />
                </div>
              </div>
              
              <!-- 환경 변수 -->
              <div class="mb-4">
                <h4 class="text-sm font-medium mb-2 pb-1 border-b">환경 변수</h4>
                
                <!-- 환경 변수 목록 -->
                <div v-if="Object.keys(editingRepo.env).length > 0" class="mb-4 border border-input rounded-md overflow-hidden">
                  <table class="min-w-full divide-y divide-border">
                    <thead class="bg-muted/50">
                      <tr>
                        <th scope="col" class="px-4 py-2 text-left text-xs font-medium uppercase">Key</th>
                        <th scope="col" class="px-4 py-2 text-left text-xs font-medium uppercase">Value</th>
                        <th scope="col" class="px-4 py-2 text-center text-xs font-medium uppercase w-16">삭제</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-border bg-background">
                      <tr v-for="(value, key) in editingRepo.env" :key="key">
                        <td class="px-4 py-2 text-sm">{{ key }}</td>
                        <td class="px-4 py-2 text-sm">{{ value }}</td>
                        <td class="px-4 py-2 text-center">
                          <button @click="removeEnvVar(key, true)" type="button" class="text-destructive hover:text-destructive/80">
                            <Trash2 class="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                <!-- 환경 변수 추가 폼 -->
                <div class="flex gap-2 items-end">
                  <div class="flex-1">
                    <label class="block text-sm font-medium mb-1">Key</label>
                    <input 
                      v-model="newEnvVar.key" 
                      placeholder="변수명" 
                      class="px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring w-full bg-background"
                    />
                  </div>
                  <div class="flex-1">
                    <label class="block text-sm font-medium mb-1">Value</label>
                    <input 
                      v-model="newEnvVar.value" 
                      placeholder="값" 
                      class="px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring w-full bg-background"
                    />
                  </div>
                  <UiButton @click="addEnvVar" type="button" variant="outline" size="sm" class="h-10">
                    <Plus class="h-4 w-4 mr-1" /> 추가
                  </UiButton>
                </div>
              </div>
              
              <div class="flex items-center gap-2 mt-2">
                <UiSwitch v-model="editingRepo.active" />
                <span class="text-sm">저장소 활성화</span>
              </div>
              
              <!-- 모달 하단 버튼 -->
              <div class="flex justify-end gap-2 mt-6">
                <UiButton @click="cancelEdit" type="button" variant="outline">취소</UiButton>
                <UiButton type="submit" variant="default">
                  <Save class="h-4 w-4 mr-1" /> 변경사항 저장
                </UiButton>
              </div>
            </form>
          </div>
        </div>
        
        <!-- 추가 버튼 -->
        <div class="mb-6 flex justify-end">
          <UiButton @click="showAddModal = true" variant="default" class="gap-2">
            <Plus class="h-4 w-4" />
            새 저장소 추가
          </UiButton>
        </div>
        
        <!-- 모달 오버레이 - 추가 -->
        <div v-if="showAddModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <!-- 모달 -->
          <div class="bg-background rounded-lg shadow-lg w-full max-w-2xl overflow-hidden">
            <!-- 모달 헤더 -->
            <div class="flex justify-between items-center p-4 border-b">
              <h3 class="text-xl font-semibold">새 저장소 추가</h3>
              <UiButton @click="showAddModal = false" variant="ghost" size="icon">
                <X class="h-5 w-5" />
              </UiButton>
            </div>
            
            <!-- 모달 본문 -->
            <form @submit.prevent="addRepo" class="p-6">
              <!-- 기본 정보 -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label class="block text-sm font-medium mb-1">ID</label>
                  <input 
                    v-model="newRepo.id" 
                    placeholder="저장소 ID" 
                    required 
                    class="px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring w-full bg-background"
                  />
                </div>
                
                <div>
                  <label class="block text-sm font-medium mb-1">저장소 유형</label>
                  <select v-model="newRepo.type" class="px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring w-full bg-background">
                    <option :value="REPO_TYPES.STDIO">Standard IO (stdio)</option>
                    <option :value="REPO_TYPES.SSE">Server-Sent Events (sse)</option>
                  </select>
                </div>
              </div>
              
              <!-- STDIO 유형 필드 -->
              <div v-if="newRepo.type === REPO_TYPES.STDIO" class="mb-4">
                <h4 class="text-sm font-medium mb-2 pb-1 border-b">STDIO 설정</h4>
                <div class="flex flex-col gap-2">
                  <div>
                    <label class="block text-sm font-medium mb-1">Command</label>
                    <input 
                      v-model="newRepo.command" 
                      placeholder="실행 명령어" 
                      class="px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring w-full bg-background"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium mb-1">Arguments (쉼표로 구분)</label>
                    <input 
                      v-model="newRepo.args" 
                      placeholder="arg1, arg2, ..." 
                      class="px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring w-full bg-background"
                    />
                  </div>
                </div>
              </div>
              
              <!-- SSE 유형 필드 -->
              <div v-if="newRepo.type === REPO_TYPES.SSE" class="mb-4">
                <h4 class="text-sm font-medium mb-2 pb-1 border-b">SSE 설정</h4>
                <div>
                  <label class="block text-sm font-medium mb-1">URL</label>
                  <input 
                    v-model="newRepo.url" 
                    placeholder="https://example.com/events" 
                    class="px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring w-full bg-background"
                  />
                </div>
              </div>
              
              <!-- 환경 변수 -->
              <div class="mb-4">
                <h4 class="text-sm font-medium mb-2 pb-1 border-b">환경 변수</h4>
                
                <!-- 환경 변수 목록 -->
                <div v-if="Object.keys(newRepo.env).length > 0" class="mb-4 border border-input rounded-md overflow-hidden">
                  <table class="min-w-full divide-y divide-border">
                    <thead class="bg-muted/50">
                      <tr>
                        <th scope="col" class="px-4 py-2 text-left text-xs font-medium uppercase">Key</th>
                        <th scope="col" class="px-4 py-2 text-left text-xs font-medium uppercase">Value</th>
                        <th scope="col" class="px-4 py-2 text-center text-xs font-medium uppercase w-16">삭제</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-border bg-background">
                      <tr v-for="(value, key) in newRepo.env" :key="key">
                        <td class="px-4 py-2 text-sm">{{ key }}</td>
                        <td class="px-4 py-2 text-sm">{{ value }}</td>
                        <td class="px-4 py-2 text-center">
                          <button @click="removeEnvVar(key)" type="button" class="text-destructive hover:text-destructive/80">
                            <Trash2 class="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                <!-- 환경 변수 추가 폼 -->
                <div class="flex gap-2 items-end">
                  <div class="flex-1">
                    <label class="block text-sm font-medium mb-1">Key</label>
                    <input 
                      v-model="newEnvVar.key" 
                      placeholder="변수명" 
                      class="px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring w-full bg-background"
                    />
                  </div>
                  <div class="flex-1">
                    <label class="block text-sm font-medium mb-1">Value</label>
                    <input 
                      v-model="newEnvVar.value" 
                      placeholder="값" 
                      class="px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring w-full bg-background"
                    />
                  </div>
                  <UiButton @click="addEnvVar" type="button" variant="outline" size="sm" class="h-10">
                    <Plus class="h-4 w-4 mr-1" /> 추가
                  </UiButton>
                </div>
              </div>
              
              <div class="flex items-center gap-2 mt-2">
                <UiSwitch v-model="newRepo.active" />
                <span class="text-sm">저장소 활성화</span>
              </div>
              
              <!-- 모달 하단 버튼 -->
              <div class="flex justify-end gap-2 mt-6">
                <UiButton @click="showAddModal = false" type="button" variant="outline">취소</UiButton>
                <UiButton type="submit" variant="default">
                  <Save class="h-4 w-4 mr-1" /> 저장소 추가
                </UiButton>
              </div>
            </form>
          </div>
        </div>
        
        <!-- 저장소 목록 -->
        <div :class="[theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200', 'rounded-lg border overflow-hidden transition-colors duration-300']">
          <table :class="[theme === 'dark' ? 'divide-gray-600' : 'divide-gray-200', 'min-w-full divide-y transition-colors duration-300']">
            <thead :class="[theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100', 'transition-colors duration-300']">
              <tr>
                <th scope="col" :class="[theme === 'dark' ? 'text-gray-300' : 'text-gray-500', 'px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300']">ID</th>
                <th scope="col" :class="[theme === 'dark' ? 'text-gray-300' : 'text-gray-500', 'px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300']">Command</th>
                <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">작업</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="repo in mcpList" :key="repo.id" class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="font-medium text-gray-900">{{ repo.id }}</div>
                  <div class="text-xs text-gray-500">{{ repo.type }}</div>
                </td>
                <td class="px-6 py-4">
                  <div v-if="repo.type === REPO_TYPES.STDIO" class="text-sm text-gray-500">
                    <div>Command: <span class="font-medium">{{ repo.command }}</span></div>
                    <div v-if="repo.args && repo.args.length">
                      Args: <span class="font-medium">{{ repo.args.join(' ') }}</span>
                    </div>
                  </div>
                  <div v-else-if="repo.type === REPO_TYPES.SSE" class="text-sm text-gray-500">
                    <div>URL: <span class="font-medium">{{ repo.url }}</span></div>
                  </div>
                  <div v-if="Object.keys(repo.env).length > 0" class="mt-1 text-xs text-gray-500">
                    <div class="font-medium">환경 변수:</div>
                    <div v-for="(value, key) in repo.env" :key="key" class="ml-2">
                      {{ key }}: {{ value }}
                    </div>
                  </div>
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
        </div>
      </UiCard>
    </div>
  </main>
</template>

<style>
/* Global styles now handled by Tailwind */
body {
  transition: background-color 0.3s ease, color 0.3s ease;
}
</style>
