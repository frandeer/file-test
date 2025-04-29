# Tauri + Vue 3

This template should help get you started developing with Tauri + Vue 3 in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

---

## Rust 빌드 속도 개선 팁

Rust(Tauri) 프로젝트의 빌드가 마지막 단계에서 오래 걸릴 때, 아래 방법들을 시도해보세요:

1. **sccache 사용**
   - Rust 빌드 캐시 툴인 `sccache`를 설치하고 환경 변수로 등록하면 빌드 속도를 크게 높일 수 있습니다.
   - 설치: `cargo install sccache`
   - 환경 변수 등록: `set RUSTC_WRAPPER=sccache`

2. **불필요한 의존성 제거**
   - `Cargo.toml`에서 사용하지 않는 dependency를 정리하세요.

3. **병렬 빌드 옵션 사용**
   - 기본적으로 병렬 빌드가 되지만, 필요 시 `cargo build -j <코어수>`로 코어 수를 명시할 수 있습니다.

4. **바이러스 백신 예외 등록**
   - Windows의 경우, `target` 폴더와 Rust toolchain 경로를 백신 예외로 등록하면 속도가 개선될 수 있습니다.

5. **SSD 사용 권장**
   - HDD 대신 SSD를 사용하면 빌드 속도가 빨라집니다.

6. **cargo clean 자제**
   - `cargo clean`을 자주 사용하면 캐시가 삭제되어 빌드가 매번 오래 걸리니, 꼭 필요할 때만 사용하세요.

---

## 아이콘 생성 가이드

Tauri 애플리케이션의 아이콘을 쉽게 변경하려면 다음 단계를 따르세요:

### 준비물
- 512x512 크기의 PNG 이미지 파일 (애플리케이션의 아이콘으로 사용할 이미지)

### 아이콘 생성 단계

1. 준비한 512x512 PNG 이미지를 `src-tauri/icons` 폴더에 `512x512.png` 파일명으로 저장합니다.

2. 터미널에서 다음 명령어를 실행하여 모든 필요한 아이콘 파일을 자동 생성합니다:
   ```bash
   npx @tauri-apps/cli icon src-tauri/icons/512x512.png
   ```

3. 이 명령어를 실행하면 다음과 같은 파일들이 자동으로 생성됩니다:
   - 다양한 크기의 PNG 이미지들 (32x32, 64x64, 128x128, 128x128@2x 등)
   - Windows용 아이콘 파일 (icon.ico)
   - macOS용 아이콘 파일 (icon.icns)
   - Android용 아이콘들 (mipmap 디렉토리에 생성)
   - iOS용 아이콘들 (ios 디렉토리에 생성)
   - Windows 스토어용 아이콘들 (Square*.png)

4. 변경된 아이콘은 다음 빌드 시 자동으로 적용됩니다.

### 참고사항
- 원본 이미지는 선명하고 투명한 배경을 가진 고품질 PNG 파일을 사용하는 것이 좋습니다.
- 아이콘은 정사각형(1:1 비율)이어야 최상의 결과를 얻을 수 있습니다.
- 이 명령은 기존의 모든 아이콘 파일을 덮어씁니다.

---

## Memory Bank - 개발 작업 기록

이 섹션은 프로젝트 개발 중 수행한 중요 작업과 설정을 기록합니다.

### 1. 프로젝트 초기 설정
- Tauri + Vue 3 + Vite 기반 프로젝트 생성
- 기본 개발 환경 구성 (VS Code + Volar + Tauri + rust-analyzer)

### 2. 빌드 최적화
- Rust 빌드 속도 개선을 위한 다양한 기법 적용
  - sccache 설정
  - 불필요한 의존성 제거
  - 바이러스 백신 예외 등록 등

### 3. 아이콘 리소스 관리
- 512x512.png 원본 이미지로부터 모든 필요 아이콘 자동 생성
- Windows, macOS, Android, iOS 등 다양한 플랫폼용 아이콘 생성
- 명령어: `npx @tauri-apps/cli icon src-tauri/icons/512x512.png`

### 4. 기타 작업
- 환경별 설정 파일 관리
- 배포 준비 및 패키징 작업

### 개발 환경 정보
- OS: Windows 10/11
- Node.js: 18.x 이상
- Rust: 최신 안정 버전
- Tauri CLI: 2.x

---
