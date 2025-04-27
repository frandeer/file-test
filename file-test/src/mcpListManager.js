// mcpListManager.js
// MCP 저장소 관리 모듈

let mcpList = [];

// 저장소 추가
function addMcpRepo(item) {
  if (!item.id) throw new Error('id is required');
  if (mcpList.find(repo => repo.id === item.id)) throw new Error('Duplicate id');
  mcpList.push({ ...item, active: !!item.active });
}

// 저장소 수정
function editMcpRepo(id, newItem) {
  const idx = mcpList.findIndex(repo => repo.id === id);
  if (idx !== -1) mcpList[idx] = { ...mcpList[idx], ...newItem };
}

// 저장소 삭제
function removeMcpRepo(id) {
  mcpList = mcpList.filter(repo => repo.id !== id);
}

// 활성화
function activateMcpRepo(id) {
  const repo = mcpList.find(repo => repo.id === id);
  if (repo) repo.active = true;
}

// 비활성화
function deactivateMcpRepo(id) {
  const repo = mcpList.find(repo => repo.id === id);
  if (repo) repo.active = false;
}

// 전체 목록 조회
function getMcpList() {
  return mcpList;
}

// 파일 저장/불러오기 (Tauri fs API 활용)
import { invoke } from '@tauri-apps/api/core';

const MCP_LIST_FILENAME = 'mcp-list.json';

async function saveMcpListToFile() {
  console.log("저장 직전 mcpList:", mcpList);
  await invoke("save_mcp_list", { mcpList: mcpList });
  console.log("mcp-list.json 저장 완료");
}

async function loadMcpListFromFile() {
  try {
    const loaded = await invoke("load_mcp_list");
    mcpList = loaded || [];
    console.log("mcp-list.json 불러오기 완료:", mcpList);
  } catch (e) {
    mcpList = [];
    console.log("mcp-list.json 불러오기 실패:", e);
  }
}

// MCP 서버 패턴 자동 추가 함수
async function autoAddMcpReposFromFileContent(content) {
  try {
    const json = JSON.parse(content);
    if (json.mcpServers && typeof json.mcpServers === "object") {
      for (const [id, value] of Object.entries(json.mcpServers)) {
        if (value.command && value.args) {
          if (!mcpList.find(repo => repo.id === id)) {
            addMcpRepo({
              id,
              command: value.command,
              args: Array.isArray(value.args) ? value.args : [],
              active: true
            });
          }
        }
      }
    }
  } catch (e) {
    // JSON 파싱 실패 시 무시
  }
}

export {
  addMcpRepo,
  editMcpRepo,
  removeMcpRepo,
  activateMcpRepo,
  deactivateMcpRepo,
  getMcpList,
  saveMcpListToFile,
  loadMcpListFromFile,
  autoAddMcpReposFromFileContent
};
