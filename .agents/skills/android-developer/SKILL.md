---
name: android-developer
description: Expert Android app development, architecture, Jetpack Compose, Kotlin, Gradle, Coroutines, Flow, Hilt, Room, debugging, and reverse engineering/APK analysis. Use when developing, building, refactoring, fixing, or testing Android applications, Gradle configurations, or Android reverse engineering projects.
---

# Android Developer Skill

Comprehensive guide and expert instructions for modern Android app development, architectural patterns, debugging, and advanced Android ecosystem workflows.

## Core Competencies & Technologies

1. **Language & Concurrency**:
   - Modern Kotlin (Kotlin 2.x, K2 compiler, context receivers, contracts, sealed interfaces).
   - Kotlin Coroutines (structured concurrency, `CoroutineScope`, `SupervisorJob`, Dispatchers: `Main`, `IO`, `Default`).
   - Kotlin Flow (`StateFlow`, `SharedFlow`, `Flow` operators, `collectAsStateWithLifecycle`, cold vs. hot streams).

2. **UI Framework & Theming**:
   - **Jetpack Compose**: Composables, State hoisting, stable types (`@Immutable`, `@Stable`), recomposition optimization.
   - Material Design 3 (Material You, dynamic color, typography, shape tokens).
   - Compose Side-Effects (`LaunchedEffect`, `rememberCoroutineScope`, `DisposableEffect`, `produceState`, `derivedStateOf`).
   - Edge-to-Edge display (`enableEdgeToEdge()`, `WindowInsets`, ime padding).
   - Navigation Compose & Navigation 3 (type-safe navigation, deep linking, back stack management).

3. **Architecture & Design**:
   - Clean Architecture + Unidirectional Data Flow (UDF) / MVI / MVVM.
   - UI Layer (`Screen`, `ViewModel`, `UiState`, `UiEvent`, `UiEffect`).
   - Domain Layer (UseCases, domain models, business logic isolation).
   - Data Layer (Repositories, Local Data Sources, Remote Data Sources).
   - Offline-First architecture with single source of truth.

4. **Dependency Injection**:
   - Hilt / Dagger (`@HiltAndroidApp`, `@AndroidEntryPoint`, `@HiltViewModel`, Modules, Scopes, Qualifiers).
   - Koin / manual dependency injection where applicable.

5. **Networking & Persistence**:
   - Retrofit 2 / OkHttp (interceptors, authenticator, certificate pinning, logging, converters).
   - Room Persistence Library (entities, DAOs, type converters, migrations, relations, paging integration).
   - DataStore (Preferences DataStore, Proto DataStore for typed persistence).

6. **Build System & Tooling**:
   - Gradle Kotlin DSL (`build.gradle.kts`), Version Catalogs (`gradle/libs.versions.toml`).
   - Android Gradle Plugin (AGP), build variants, product flavors, signing configs.
   - ProGuard / R8 optimization, rule verification, obfuscation mappings.

7. **Debugging, Profiling & Testing**:
   - ADB CLI commands (`adb shell`, `adb install`, `adb push`, `adb logcat`, dumpsys).
   - Profiling CPU traces, memory leaks (LeakCanary, Android Studio Memory Profiler), ANR analysis.
   - Testing: JUnit 5, MockK, Coroutines Test (`runTest`, `TestDispatcher`), Compose UI Test (`createComposeRule`), Robolectric.

8. **Advanced / Reverse Engineering / Modding**:
   - APK / AAB structure, Dex bytecode, Smali analysis, ProGuard de-obfuscation.
   - Tools: JADX, Apktool, Bytecode Viewer, Frida, Xposed/LSPosed hook architecture.
   - Custom patching, GQL/REST API reverse-engineering, certificate pinning bypass, asset extraction.

## Workflow Guidelines

### 1. New Feature / UI Component Development
- Define UI State with immutable data classes (`@Immutable data class FeatureUiState(...)`).
- Handle `Loading`, `Success`, and `Error` states explicitly.
- Use `collectAsStateWithLifecycle()` in Compose to ensure lifecycle-aware state observation.
- Extract business logic into UseCases or ViewModel, keeping Composables stateless and testable.

### 2. Gradle & Dependency Management
- Always check `gradle/libs.versions.toml` before adding dependencies.
- Use KSP (Kotlin Symbol Processing) instead of KAPT for annotation processing.
- Verify Java and Kotlin compatibility versions (e.g. Java 17 / Java 21, JVM toolchains).

### 3. Performance & Memory Guardrails
- Avoid allocating objects inside `@Composable` functions without `remember`.
- Avoid blocking the main thread; offload I/O and heavy computing to `Dispatchers.IO` / `Dispatchers.Default`.
- Guard against memory leaks in listeners, coroutine scopes, and static references.
