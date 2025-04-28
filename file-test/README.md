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
