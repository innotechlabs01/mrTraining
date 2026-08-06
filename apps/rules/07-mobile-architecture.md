# MR Training — Mobile Architecture

**Version 1.0 — 2026**

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Technology Stack](#2-technology-stack)
3. [Project Structure](#3-project-structure)
4. [State Management](#4-state-management)
5. [Routing](#5-routing)
6. [Data Layer](#6-data-layer)
7. [Offline Support](#7-offline-support)
8. [Push Notifications](#8-push-notifications)
9. [UI Components](#9-ui-components)
10. [Native Integration](#10-native-integration)
11. [Performance](#11-performance)
12. [Testing](#12-testing)

---

## 1. Architecture Overview

### 1.1 Clean Architecture on Flutter

The MR Training mobile app follows Clean Architecture with a strict separation of concerns across three layers. The dependency rule is absolute: outer layers depend on inner layers. A presentation widget never imports a database driver. A domain entity never knows about Riverpod. This is not a suggestion — it is enforced through Dart's package visibility and every import is reviewed against this rule.

```
┌──────────────────────────────────────────────────────┐
│              Presentation Layer                       │
│  Screens, Widgets, Riverpod Providers (UI state)     │
│  GoRouter configuration, Theme, Navigation           │
├──────────────────────────────────────────────────────┤
│                Domain Layer                           │
│  Entities, Value Objects, Repository Interfaces,     │
│  Use Cases, Domain Exceptions                        │
├──────────────────────────────────────────────────────┤
│                  Data Layer                           │
│  Repository Implementations, Data Sources (Remote,   │
│  Local), DTOs, Drift DAOs, Dio API Clients,          │
│  Firebase Services, Hive Boxes                       │
└──────────────────────────────────────────────────────┘
```

**Presentation Layer** — Everything the user sees and touches. Screens are thin orchestrators that read state from Riverpod providers and delegate actions to use cases. A screen never contains business logic. A widget never makes an API call directly. The presentation layer knows about Riverpod, GoRouter, and Material Design widgets. It knows nothing about Dio, Drift, or Firebase.

**Domain Layer** — The core of the application. Contains entities (`Athlete`, `Workout`, `Program`, `NutritionPlan`), value objects (`SportType`, `TrainingLoad`, `MacroTargets`), repository interfaces (abstract classes defining data contracts), and use cases (single-purpose classes with a `call` method). The domain layer imports only Dart's standard library and `flutter/foundation.dart` for immutable collections. It has zero dependencies on Flutter widgets, Riverpod, or any data-layer technology. This means the entire business logic of MR Training can be tested without a simulator, without a database, and without a network — pure Dart tests that run in milliseconds.

**Data Layer** — Implements the repository interfaces defined in the domain layer. Contains `DriftWorkoutRepository` which implements `WorkoutRepository` using a local SQLite database. Contains `DioTrainingApi` which implements `TrainingRemoteDataSource` using HTTP. The data layer owns technology decisions: which HTTP client to use, which local database, which serialization format. The rest of the app never knows about these choices — it depends on interfaces, and dependency injection wires the concrete implementations at startup.

### 1.2 Why Flutter

A web application cannot deliver the native experience that MR Training's athlete persona demands. Athletes log workouts in gyms with spotty connectivity. They track nutrition by scanning barcodes. They receive push notifications that must open directly to the relevant workout. They expect fluid 60 FPS animations when logging sets, swiping between exercises, and browsing their training calendar. They want Health Connect and HealthKit integration to automatically import sleep, heart rate, and activity data. None of this is achievable with acceptable quality in a web view or a cross-platform framework that renders through a bridge.

Flutter compiles to native ARM code. It controls every pixel on the screen through Skia — no platform UI component overhead, no bridge latency for animations. The widget tree is declarative and composable, aligning naturally with the component architecture already established in the Next.js frontend. The same design tokens, the same spacing scale, the same typography system, and the same color palette are implemented once in the design system and consumed identically across web and mobile. Flutter is not a compromise between iOS and Android — it is a deliberate choice to render identically on both platforms while accessing native APIs through platform channels when necessary.

### 1.3 Feature-First Organization

Code is organized by feature, not by layer. A feature directory under `lib/src/features/` contains everything that feature needs — screens, widgets, providers, use cases, repositories, and data sources — colocated for maximum cohesion:

```
lib/src/features/training/
├── presentation/
│   ├── screens/
│   │   ├── program_list_screen.dart
│   │   ├── program_detail_screen.dart
│   │   └── workout_log_screen.dart
│   └── widgets/
│       ├── program_card.dart
│       ├── exercise_timer.dart
│       └── set_logger.dart
├── domain/
│   ├── entities/
│   │   ├── workout.dart
│   │   └── program.dart
│   ├── value_objects/
│   │   └── sport_type.dart
│   ├── repositories/
│   │   └── workout_repository.dart
│   └── usecases/
│       ├── create_program.dart
│       ├── complete_workout.dart
│       └── get_athlete_workouts.dart
├── data/
│   ├── repositories/
│   │   └── drift_workout_repository.dart
│   ├── datasources/
│   │   ├── workout_remote_datasource.dart
│   │   └── workout_local_datasource.dart
│   └── dtos/
│       └── workout_dto.dart
└── training_providers.dart
```

Cross-cutting concerns — authentication, connectivity monitoring, navigation, theming — live in `lib/src/core/`. Infrastructure implementations live in `lib/src/infrastructure/` organized by technology: `drift/`, `dio/`, `firebase/`, `hive/`, `platform_channels/`.

This structure means a developer working on the training feature opens one directory and sees every file they need. When a feature is removed, one directory is deleted. The feature's public API — the providers and use cases other features are allowed to consume — is exported through a barrel file. Internal widgets and data sources are never imported across feature boundaries.

---

## 2. Technology Stack

| Component | Technology | Version | Purpose |
|---|---|---|---|
| Framework | Flutter | 3.24+ | Cross-platform native compilation (iOS + Android) |
| Language | Dart | 3.6+ | Sound null safety, sealed classes, pattern matching, records |
| State Management | Riverpod | 2.6+ | Compile-safe, provider-based state with code generation |
| Routing | GoRouter | 14+ | Declarative routing with deep linking, redirect guards, nested navigation |
| HTTP Client | Dio | 5.x | Interceptors, retry policies, request/response transformers, multipart uploads |
| Local Database | Drift (SQLite) | 2.x | Type-safe SQLite with DAOs, migrations, and reactive streams |
| Key-Value Storage | Hive | 2.x | Fast, encrypted local storage for preferences and small objects |
| Push Notifications | Firebase Cloud Messaging | latest | Cross-platform push with notification channels and data payloads |
| Analytics | Firebase Analytics | latest | Event tracking, user properties, screen views |
| Crash Reporting | Firebase Crashlytics | latest | Real-time crash reporting with Dart and native stack traces |
| Image Caching | cached_network_image | 3.x | Disk and memory cache for network images |
| Dependency Injection | Riverpod + Provider overrides | — | No code generation DI; Riverpod's override system handles testing |
| Code Generation | build_runner + freezed + json_serializable | — | Immutable models with JSON serialization and union types |
| Serialization | freezed | 2.x | Immutable data classes with pattern matching, copyWith, and JSON |
| Testing | flutter_test + mockito + integration_test | — | Unit, widget, and integration testing |
| Platform Channels | MethodChannel + EventChannel | — | Native API access for Health Connect, HealthKit, biometrics |

### 2.1 Why Riverpod Over BLoC

BLoC enforces a strict event-in, state-out pattern that, while disciplined, introduces boilerplate that does not pay for itself in an application of this complexity. Every state change requires an event class, a state class, a mapEventToState method, and a BlocProvider. For an application with 14 modules and hundreds of screens, this overhead compounds into thousands of lines of ceremony that obscure the actual business logic.

Riverpod providers are functions. A `StateNotifierProvider` exposes mutable state with methods. A `FutureProvider` handles async data with built-in loading and error states. A `StreamProvider` listens to a Drift database query and rebuilds the UI automatically when the underlying data changes. Riverpod's compile-time safety eliminates the runtime errors that plague InheritedWidget-based solutions — a missing provider is a compile error, not a silent null at runtime. Providers are autodisposed when no longer listened to, preventing memory leaks automatically. The `ref` object gives every provider access to every other provider, enabling composition without prop-drilling or context-walking.

### 2.2 Why Drift Over Floor or sqflite

Drift generates type-safe Dart code from SQL. A DAO definition is a Dart class with annotated methods; Drift generates the SQL, the Dart query methods, and the reactive streams. The result is compile-time SQL validation — a typo in a column name fails the build, not an integration test. Drift's `watch()` methods return `Stream<List<T>>` that emit a new list every time the underlying table changes. When an athlete completes a workout and the local database writes the completed sets, every Riverpod `StreamProvider` watching the workouts table rebuilds automatically. This is offline-first architecture at the database level — the UI always shows the latest local state, and background sync reconciles with the server when connectivity returns.

sqflite is a thin wrapper around SQLite with raw SQL strings and manual row mapping. Floor adds code generation but is less actively maintained and less feature-rich than Drift. Neither provides the reactivity that Drift's stream-based watchers offer out of the box. For a mobile app where the local database is the primary data source — not a fallback — Drift's reactive queries are a requirement, not a preference.

---

## 3. Project Structure

```
apps/mobile/
├── android/                        # Android native project
│   ├── app/
│   │   └── src/main/
│   │       ├── kotlin/.../
│   │       │   ├── MainActivity.kt
│   │       │   ├── HealthConnectService.kt
│   │       │   └── NotificationService.kt
│   │       └── AndroidManifest.xml
│   └── build.gradle.kts
│
├── ios/                            # iOS native project
│   ├── Runner/
│   │   ├── AppDelegate.swift
│   │   ├── HealthKitService.swift
│   │   └── Info.plist
│   └── Podfile
│
├── lib/
│   ├── main.dart                   # App entry point, provider scope, router
│   ├── app.dart                    # MaterialApp.router configuration
│   │
│   ├── src/
│   │   ├── core/                   # Cross-cutting concerns
│   │   │   ├── constants/
│   │   │   │   ├── app_constants.dart
│   │   │   │   └── api_constants.dart
│   │   │   ├── errors/
│   │   │   │   ├── failures.dart
│   │   │   │   └── exceptions.dart
│   │   │   ├── network/
│   │   │   │   ├── dio_client.dart          # Dio instance with interceptors
│   │   │   │   ├── auth_interceptor.dart    # Token injection & refresh
│   │   │   │   ├── connectivity_service.dart # Online/offline detection
│   │   │   │   └── network_info.dart        # Connectivity abstraction
│   │   │   ├── router/
│   │   │   │   ├── app_router.dart          # GoRouter configuration
│   │   │   │   ├── routes.dart              # Route path constants
│   │   │   │   └── auth_guard.dart          # Redirect logic for auth state
│   │   │   ├── theme/
│   │   │   │   ├── app_theme.dart           # ThemeData, color scheme
│   │   │   │   ├── design_tokens.dart       # Colors, spacing, typography, radii
│   │   │   │   ├── text_styles.dart         # Typography scale
│   │   │   │   └── dark_mode.dart           # Dark theme variant
│   │   │   ├── utils/
│   │   │   │   ├── date_utils.dart
│   │   │   │   ├── formatters.dart
│   │   │   │   └── validators.dart
│   │   │   └── extensions/
│   │   │       ├── context_extensions.dart
│   │   │       └── build_context_x.dart
│   │   │
│   │   ├── features/               # Feature modules
│   │   │   ├── auth/
│   │   │   │   ├── data/
│   │   │   │   │   ├── datasources/
│   │   │   │   │   │   └── auth_remote_datasource.dart
│   │   │   │   │   ├── repositories/
│   │   │   │   │   │   └── auth_repository_impl.dart
│   │   │   │   │   └── dtos/
│   │   │   │   │       └── auth_dto.dart
│   │   │   │   ├── domain/
│   │   │   │   │   ├── entities/
│   │   │   │   │   │   └── user.dart
│   │   │   │   │   ├── repositories/
│   │   │   │   │   │   └── auth_repository.dart
│   │   │   │   │   └── usecases/
│   │   │   │   │       ├── login.dart
│   │   │   │   │       ├── register.dart
│   │   │   │   │       └── refresh_token.dart
│   │   │   │   ├── presentation/
│   │   │   │   │   ├── screens/
│   │   │   │   │   │   ├── login_screen.dart
│   │   │   │   │   │   ├── register_screen.dart
│   │   │   │   │   │   └── onboarding_screen.dart
│   │   │   │   │   └── widgets/
│   │   │   │   │       └── auth_form.dart
│   │   │   │   └── auth_providers.dart
│   │   │   │
│   │   │   ├── training/
│   │   │   │   ├── data/
│   │   │   │   │   ├── datasources/
│   │   │   │   │   │   ├── training_remote_datasource.dart
│   │   │   │   │   │   └── training_local_datasource.dart
│   │   │   │   │   ├── repositories/
│   │   │   │   │   │   └── training_repository_impl.dart
│   │   │   │   │   ├── dtos/
│   │   │   │   │   │   ├── workout_dto.dart
│   │   │   │   │   │   └── program_dto.dart
│   │   │   │   │   └── models/
│   │   │   │   │       ├── workout_drift.dart       # Drift table definition
│   │   │   │   │       ├── workout_drift.drift.dart # Drift DAOs
│   │   │   │   │       └── program_drift.dart
│   │   │   │   ├── domain/
│   │   │   │   │   ├── entities/
│   │   │   │   │   │   ├── workout.dart
│   │   │   │   │   │   ├── program.dart
│   │   │   │   │   │   └── exercise.dart
│   │   │   │   │   ├── repositories/
│   │   │   │   │   │   └── training_repository.dart
│   │   │   │   │   └── usecases/
│   │   │   │   │       ├── get_todays_workouts.dart
│   │   │   │   │       ├── complete_workout.dart
│   │   │   │   │       ├── create_program.dart
│   │   │   │   │       └── get_programs.dart
│   │   │   │   ├── presentation/
│   │   │   │   │   ├── screens/
│   │   │   │   │   │   ├── training_dashboard_screen.dart
│   │   │   │   │   │   ├── program_list_screen.dart
│   │   │   │   │   │   ├── program_detail_screen.dart
│   │   │   │   │   │   ├── workout_log_screen.dart
│   │   │   │   │   │   └── workout_history_screen.dart
│   │   │   │   │   └── widgets/
│   │   │   │   │       ├── program_card.dart
│   │   │   │   │       ├── workout_timeline.dart
│   │   │   │   │       ├── exercise_card.dart
│   │   │   │   │       ├── set_logger.dart
│   │   │   │   │       ├── exercise_timer.dart
│   │   │   │   │       └── rpe_selector.dart
│   │   │   │   └── training_providers.dart
│   │   │   │
│   │   │   ├── nutrition/
│   │   │   ├── recovery/
│   │   │   ├── community/
│   │   │   ├── events/
│   │   │   ├── payments/
│   │   │   ├── analytics/
│   │   │   ├── ai/
│   │   │   ├── crm/
│   │   │   └── communications/
│   │   │
│   │   ├── infrastructure/         # Technology-specific implementations
│   │   │   ├── drift/
│   │   │   │   ├── app_database.dart        # Drift database definition
│   │   │   │   ├── app_database.drift.dart  # Custom queries
│   │   │   │   └── migrations/
│   │   │   │       └── schema_versions.dart
│   │   │   ├── dio/
│   │   │   │   └── api_constants.dart
│   │   │   ├── firebase/
│   │   │   │   ├── firebase_messaging_service.dart
│   │   │   │   └── firebase_analytics_service.dart
│   │   │   ├── hive/
│   │   │   │   ├── hive_service.dart
│   │   │   │   └── hive_boxes.dart
│   │   │   ├── platform_channels/
│   │   │   │   ├── health_connect_channel.dart
│   │   │   │   └── health_kit_channel.dart
│   │   │   └── sync/
│   │   │       ├── sync_queue.dart
│   │   │       ├── sync_worker.dart
│   │   │       └── conflict_resolver.dart
│   │   │
│   │   └── shared/                 # Shared widgets and utilities
│   │       ├── widgets/
│   │       │   ├── mr_button.dart
│   │       │   ├── mr_card.dart
│   │       │   ├── mr_text_field.dart
│   │       │   ├── mr_bottom_sheet.dart
│   │       │   ├── mr_snackbar.dart
│   │       │   ├── mr_loading_indicator.dart
│   │       │   ├── mr_empty_state.dart
│   │       │   └── mr_error_widget.dart
│   │       └── extensions/
│   │           └── ...
│   │
│   └── l10n/                       # Localization
│       ├── app_en.arb
│       ├── app_es.arb
│       └── app_fr.arb
│
├── test/
│   ├── unit/
│   │   ├── features/
│   │   │   └── training/
│   │   │       ├── domain/
│   │   │       │   ├── workout_test.dart
│   │   │       │   └── complete_workout_test.dart
│   │   │       └── data/
│   │   │           └── training_repository_impl_test.dart
│   │   └── core/
│   │       └── ...
│   ├── widget/
│   │   └── features/
│   │       └── training/
│   │           ├── program_card_test.dart
│   │           └── set_logger_test.dart
│   └── integration/
│       ├── auth_flow_test.dart
│       └── workout_log_flow_test.dart
│
├── integration_test/
│   ├── app_test.dart
│   └── driver_extension.dart
│
├── pubspec.yaml
├── analysis_options.yaml
├── l10n.yaml
├── .env.example
├── firebase.json
└── README.md
```

### 3.1 Dependency Injection

Riverpod serves as both the state management and dependency injection system. There is no separate DI container. Every external dependency — databases, HTTP clients, platform channel services — is exposed through a `Provider`:

```dart
// lib/src/infrastructure/drift/app_database_provider.dart
final appDatabaseProvider = Provider<AppDatabase>((ref) {
  throw UnimplementedError('Must be overridden in app startup');
});

// lib/src/infrastructure/dio/dio_client_provider.dart
final dioClientProvider = Provider<Dio>((ref) {
  final dio = Dio(BaseOptions(
    baseUrl: ApiConstants.baseUrl,
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 15),
  ));
  dio.interceptors.add(ref.watch(authInterceptorProvider));
  dio.interceptors.add(ref.watch(connectivityInterceptorProvider));
  dio.interceptors.add(ref.watch(loggingInterceptorProvider));
  return dio;
});
```

Repository implementations depend on these infrastructure providers:

```dart
final trainingRepositoryProvider = Provider<TrainingRepository>((ref) {
  return TrainingRepositoryImpl(
    remoteDataSource: ref.watch(trainingRemoteDataSourceProvider),
    localDataSource: ref.watch(trainingLocalDataSourceProvider),
    networkInfo: ref.watch(networkInfoProvider),
  );
});
```

In tests, providers are overridden with mocks:

```dart
testWidgets('displays workouts for today', (tester) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        trainingRepositoryProvider.overrideWithValue(mockRepository),
      ],
      child: const TrainingDashboardScreen(),
    ),
  );
  // ...
});
```

This approach requires zero code generation for DI and makes the dependency graph explicit and auditable. Every provider's dependencies are visible through `ref.watch()` calls. The override system makes testing trivial — swap any dependency anywhere in the graph.

---

## 4. State Management

### 4.1 Provider Architecture

Riverpod providers are organized by concern. The presentation layer never accesses a repository directly — it goes through use case providers, which go through repository providers:

```dart
// lib/src/features/training/training_providers.dart

// --- Infrastructure ---
final trainingRemoteDataSourceProvider = Provider<TrainingRemoteDataSource>((ref) {
  return DioTrainingRemoteDataSource(ref.watch(dioClientProvider));
});

final trainingLocalDataSourceProvider = Provider<TrainingLocalDataSource>((ref) {
  return DriftTrainingLocalDataSource(ref.watch(appDatabaseProvider));
});

// --- Repository ---
final trainingRepositoryProvider = Provider<TrainingRepository>((ref) {
  return TrainingRepositoryImpl(
    remoteDataSource: ref.watch(trainingRemoteDataSourceProvider),
    localDataSource: ref.watch(trainingLocalDataSourceProvider),
    networkInfo: ref.watch(networkInfoProvider),
  );
});

// --- Use Cases ---
final getTodaysWorkoutsProvider = Provider<GetTodaysWorkouts>((ref) {
  return GetTodaysWorkouts(ref.watch(trainingRepositoryProvider));
});

final completeWorkoutProvider = Provider<CompleteWorkout>((ref) {
  return CompleteWorkout(
    repository: ref.watch(trainingRepositoryProvider),
    syncQueue: ref.watch(syncQueueProvider),
    messagingService: ref.watch(firebaseMessagingServiceProvider),
  );
});

// --- UI State ---
final todaysWorkoutsProvider = FutureProvider<List<Workout>>((ref) async {
  final useCase = ref.watch(getTodaysWorkoutsProvider);
  final authState = ref.watch(authStateProvider);
  return useCase(
    athleteId: authState.requireValue!.userId,
    date: DateTime.now(),
  );
});

final selectedWorkoutProvider = StateProvider<Workout?>((ref) => null);

final workoutLogStateProvider = StateNotifierProvider<WorkoutLogNotifier, WorkoutLogState>((ref) {
  return WorkoutLogNotifier(
    completeWorkout: ref.watch(completeWorkoutProvider),
  );
});
```

### 4.2 Auto-Disposal

Riverpod automatically disposes providers when no widget is listening to them. The `todaysWorkoutsProvider` is listened to by the training dashboard screen. When the user navigates away, the provider is disposed after a configurable timeout (default 5 minutes). If the user returns within the timeout, the cached data is served immediately. If the timeout expires, the provider refetches. This eliminates the need for manual lifecycle management — the framework handles it deterministically.

### 4.3 Error Handling

Every `FutureProvider` and `StreamProvider` has built-in support for loading, error, and data states through `AsyncValue`:

```dart
class TrainingDashboardScreen extends ConsumerWidget {
  const TrainingDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final workoutsAsync = ref.watch(todaysWorkoutsProvider);

    return workoutsAsync.when(
      loading: () => const TrainingShimmer(),
      error: (error, stack) => MRErrorWidget(
        message: error.toString(),
        onRetry: () => ref.invalidate(todaysWorkoutsProvider),
      ),
      data: (workouts) => WorkoutTimeline(workouts: workouts),
    );
  }
}
```

No manual `isLoading` or `hasError` flags. No `setState` calls. The `when()` method on `AsyncValue` handles all three states declaratively. The loading shimmer is shown during the initial fetch. The error widget provides a retry button that invalidates the provider and triggers a new fetch. The data widget renders the workout timeline. This pattern is used consistently across every screen in the application.

### 4.4 StateNotifier for Complex State

For screens with complex local state — the workout log screen, the program builder, the meal planner — `StateNotifierProvider` manages mutable state with explicit methods:

```dart
@freezed
class WorkoutLogState with _$WorkoutLogState {
  const factory WorkoutLogState({
    required Workout workout,
    required int currentExerciseIndex,
    required List<LoggedSet> completedSets,
    required bool isTimerRunning,
    required int restSecondsRemaining,
    required WorkoutLogStatus status,
  }) = _WorkoutLogState;
}

enum WorkoutLogStatus { inProgress, completed, syncing, synced }

class WorkoutLogNotifier extends StateNotifier<WorkoutLogState> {
  final CompleteWorkout _completeWorkout;
  final SyncQueue _syncQueue;
  Timer? _restTimer;

  WorkoutLogNotifier({
    required CompleteWorkout completeWorkout,
    required SyncQueue syncQueue,
  })  : _completeWorkout = completeWorkout,
        _syncQueue = syncQueue,
        super(/* initial state */);

  void logSet({required int reps, required double weight, required double rpe}) {
    final updatedSets = [...state.completedSets];
    updatedSets.add(LoggedSet(
      exerciseIndex: state.currentExerciseIndex,
      reps: reps,
      weightKg: weight,
      rpe: rpe,
    ));
    state = state.copyWith(completedSets: updatedSets);
    _startRestTimer();
  }

  void nextExercise() {
    _restTimer?.cancel();
    state = state.copyWith(
      currentExerciseIndex: state.currentExerciseIndex + 1,
      isTimerRunning: false,
      restSecondsRemaining: 0,
    );
  }

  Future<void> completeWorkout() async {
    state = state.copyWith(status: WorkoutLogStatus.syncing);
    try {
      await _completeWorkout(
        workoutId: state.workout.id,
        sets: state.completedSets,
        rpe: state.workout.rpe,
        notes: state.workout.athleteNotes,
      );
      state = state.copyWith(status: WorkoutLogStatus.synced);
    } catch (e) {
      await _syncQueue.enqueue(state.workout.id, state.completedSets);
      state = state.copyWith(status: WorkoutLogStatus.completed);
    }
  }
}
```

The workout log is the most critical screen in the mobile app. An athlete who loses 45 minutes of logged sets because they accidentally swiped back will never trust the platform again. The `completeWorkout` method writes locally first through the repository's local data source, then attempts to sync. If the sync fails — no connectivity — the workout is queued for background sync. The athlete sees "completed" instantly regardless of network state. This is the local-first pattern in action at the UI level.

---

## 5. Routing

### 5.1 GoRouter Configuration

GoRouter provides declarative, type-safe routing with support for nested navigation, deep linking, redirect guards, and shell routes. The router configuration is centralized in `app_router.dart` and defines every possible navigation path in the application:

```dart
final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authStateProvider);

  return GoRouter(
    initialLocation: '/training',
    navigatorKey: rootNavigatorKey,
    refreshListenable: GoRouterRefreshStream(authState.stream),
    redirect: (context, state) {
      final isLoggedIn = authState.valueOrNull != null;
      final isAuthRoute = state.matchedLocation.startsWith('/auth');
      final isOnboardingComplete = ref.read(onboardingCompleteProvider);

      if (!isLoggedIn && !isAuthRoute) return '/auth/login';
      if (isLoggedIn && isAuthRoute) return '/training';
      if (isLoggedIn && !isOnboardingComplete && !state.matchedLocation.startsWith('/onboarding')) {
        return '/onboarding';
      }
      return null;
    },
    routes: [
      // --- Auth Routes ---
      GoRoute(
        path: '/auth',
        redirect: (_, __) => '/auth/login',
      ),
      GoRoute(
        path: '/auth/login',
        name: 'login',
        builder: (_, __) => const LoginScreen(),
      ),
      GoRoute(
        path: '/auth/register',
        name: 'register',
        builder: (_, __) => const RegisterScreen(),
      ),

      // --- Onboarding ---
      GoRoute(
        path: '/onboarding',
        name: 'onboarding',
        builder: (_, __) => const OnboardingScreen(),
      ),

      // --- Main App (Shell Route) ---
      ShellRoute(
        builder: (_, state, child) => AppShell(child: child),
        routes: [
          // --- Training ---
          GoRoute(
            path: '/training',
            name: 'training',
            builder: (_, __) => const TrainingDashboardScreen(),
            routes: [
              GoRoute(
                path: 'programs',
                name: 'programs',
                builder: (_, __) => const ProgramListScreen(),
                routes: [
                  GoRoute(
                    path: ':programId',
                    name: 'program-detail',
                    builder: (_, state) => ProgramDetailScreen(
                      programId: state.pathParameters['programId']!,
                    ),
                    routes: [
                      GoRoute(
                        path: 'edit',
                        name: 'program-edit',
                        builder: (_, state) => ProgramEditScreen(
                          programId: state.pathParameters['programId']!,
                        ),
                      ),
                    ],
                  ),
                  GoRoute(
                    path: 'create',
                    name: 'program-create',
                    builder: (_, __) => const ProgramCreateScreen(),
                  ),
                ],
              ),
              GoRoute(
                path: 'workouts/:workoutId',
                name: 'workout-detail',
                builder: (_, state) => WorkoutDetailScreen(
                  workoutId: state.pathParameters['workoutId']!,
                ),
              ),
              GoRoute(
                path: 'workouts/:workoutId/log',
                name: 'workout-log',
                builder: (_, state) => WorkoutLogScreen(
                  workoutId: state.pathParameters['workoutId']!,
                ),
              ),
            ],
          ),

          // --- Athletes ---
          GoRoute(
            path: '/athletes',
            name: 'athletes',
            builder: (_, __) => const AthleteListScreen(),
            routes: [
              GoRoute(
                path: ':athleteId',
                name: 'athlete-detail',
                builder: (_, state) => AthleteDetailScreen(
                  athleteId: state.pathParameters['athleteId']!,
                ),
                routes: [
                  GoRoute(
                    path: 'metrics',
                    name: 'athlete-metrics',
                    builder: (_, state) => AthleteMetricsScreen(
                      athleteId: state.pathParameters['athleteId']!,
                    ),
                  ),
                ],
              ),
            ],
          ),

          // --- Nutrition, Recovery, Community, etc. ---
          // ... additional route groups for each module
        ],
      ),
    ],
  );
});
```

### 5.2 Shell Routes and Persistent Navigation

`ShellRoute` wraps the main application routes in a persistent `AppShell` widget. The shell contains the bottom navigation bar, the app bar, and any persistent UI. Navigating between `/training` and `/athletes` does not rebuild the shell — only the child content area updates. This matches the native navigation behavior users expect on mobile: tabs persist their state, the bottom bar remains visible, and the back stack is maintained per tab.

Each tab maintains its own navigation stack through GoRouter's nested routing. A coach viewing an athlete's detail screen, then switching to the training tab, then switching back to the athletes tab, finds the athlete detail screen exactly where they left it. GoRouter's `StatefulShellRoute.indexedStack` variant provides this behavior by maintaining a separate navigator per tab with preserved widget state.

### 5.3 Deep Linking

Every route in MR Training is deep-linkable. A push notification for a completed workout opens directly to that workout's detail screen. A payment confirmation email opens the billing screen. A coach sharing a program sends a link that opens the program detail in the mobile app.

Deep link paths are mapped directly to GoRouter route names:

```
mr-training://training/programs/abc-123
mr-training://training/workouts/def-456/log
mr-training://athletes/ghi-789/metrics
mr-training://community/challenges/jkl-012
mr-training://settings/billing
```

Android deep links are configured in `AndroidManifest.xml` through intent filters. iOS universal links are configured through the Associated Domains entitlement and an `apple-app-site-association` file served from the web domain. Both platforms pass the full URI to Flutter, where GoRouter matches it against the route table and navigates to the correct screen. The `redirect` guard ensures the user is authenticated before the deep link resolves — if not, the deep link is stored, the user authenticates, and the navigation continues to the intended destination.

### 5.4 Auth Guards

The `redirect` function on the `GoRouter` configuration enforces authentication and onboarding state. It runs on every navigation — initial load, deep link, programmatic navigation. The logic is centralized and testable:

1. If the user is not authenticated and the target route is not an auth route → redirect to login, storing the intended destination.
2. If the user is authenticated and the target route is an auth route → redirect to the training dashboard.
3. If the user is authenticated but has not completed onboarding → redirect to onboarding.
4. If none of the above → allow the navigation.

The `refreshListenable` parameter is a `Stream` from the auth state provider. When the auth state changes — the user logs in or out — the router reevaluates all redirects and navigates accordingly. This eliminates imperative navigation on auth state changes — the router reacts to the auth state stream, not to individual login/logout button presses.

---

## 6. Data Layer

### 6.1 Repository Pattern

Every feature exposes a repository interface in its domain layer. The interface defines data operations in domain terms — entities, not DTOs or database rows:

```dart
// lib/src/features/training/domain/repositories/training_repository.dart
abstract class TrainingRepository {
  Future<List<Workout>> getWorkoutsForDate({
    required String athleteId,
    required DateTime date,
  });

  Future<Workout> getWorkoutById(String workoutId);

  Future<void> completeWorkout({
    required String workoutId,
    required List<LoggedSet> sets,
    required int rpe,
    required String notes,
  });

  Future<List<Program>> getPrograms({
    required String coachId,
    String? sportType,
    String? status,
    int page = 1,
    int perPage = 20,
  });

  Future<Program> createProgram(CreateProgramParams params);

  Stream<List<Workout>> watchWorkoutsForDate({
    required String athleteId,
    required DateTime date,
  });
}
```

The repository implementation in the data layer decides where data comes from — server, local database, or both:

```dart
class TrainingRepositoryImpl implements TrainingRepository {
  final TrainingRemoteDataSource _remote;
  final TrainingLocalDataSource _local;
  final NetworkInfo _networkInfo;

  TrainingRepositoryImpl({
    required TrainingRemoteDataSource remote,
    required TrainingLocalDataSource local,
    required NetworkInfo networkInfo,
  })  : _remote = remote,
        _local = local,
        _networkInfo = networkInfo;

  @override
  Future<List<Workout>> getWorkoutsForDate({
    required String athleteId,
    required DateTime date,
  }) async {
    // Always read from local first for instant UI response
    final localWorkouts = await _local.getWorkoutsForDate(athleteId, date);

    // If online, fetch remote to sync and update local
    if (await _networkInfo.isConnected) {
      try {
        final remoteWorkouts = await _remote.getWorkoutsForDate(athleteId, date);
        await _local.saveWorkouts(remoteWorkouts);
        return remoteWorkouts.map((dto) => dto.toDomain()).toList();
      } catch (e) {
        // Fall through to return local data
      }
    }

    return localWorkouts.map((dto) => dto.toDomain()).toList();
  }

  @override
  Stream<List<Workout>> watchWorkoutsForDate({
    required String athleteId,
    required DateTime date,
  }) {
    return _local.watchWorkoutsForDate(athleteId, date).map(
      (dtos) => dtos.map((dto) => dto.toDomain()).toList(),
    );
  }
}
```

This is the local-first pattern. The UI receives data from the local database instantly — no loading spinner for data that already exists on the device. When the network is available, remote data is fetched in the background and synced to the local database. The `Stream` variant (`watchWorkoutsForDate`) uses Drift's reactive queries: the UI rebuilds automatically when the local database changes, whether from a background sync or a user action.

### 6.2 Dio HTTP Client

Dio is configured with a chain of interceptors that handle cross-cutting HTTP concerns:

```dart
// lib/src/core/network/dio_client.dart
Dio createDioClient({
  required AuthInterceptor authInterceptor,
  required ConnectivityInterceptor connectivityInterceptor,
  required LoggingInterceptor loggingInterceptor,
  required RetryInterceptor retryInterceptor,
}) {
  final dio = Dio(BaseOptions(
    baseUrl: ApiConstants.baseUrl,
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 15),
    sendTimeout: const Duration(seconds: 15),
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    validateStatus: (status) => status != null && status < 500,
  ));

  dio.interceptors.addAll([
    connectivityInterceptor,
    authInterceptor,
    retryInterceptor,
    loggingInterceptor,
  ]);

  return dio;
}
```

**AuthInterceptor** — Attaches the JWT access token to every request. On a 401 response, it attempts a token refresh using the refresh token stored in Hive. If the refresh succeeds, it retries the original request with the new token. If the refresh fails, it clears the auth state and redirects to the login screen. This interceptor eliminates the need for every data source to handle token expiry — it is a single implementation that applies to every API call.

**ConnectivityInterceptor** — Checks network connectivity before each request. If offline, it short-circuits the request and returns an `OfflineException`. The repository catches this and falls back to local data. This interceptor prevents wasted connection attempts and provides a clear signal to the data layer.

**RetryInterceptor** — Retries failed requests with exponential backoff (1s, 2s, 4s, max 3 retries) for transient errors (5xx, network errors). It uses Dio's `RetryEvaluator` to decide which errors are retryable. 4xx errors (other than 401, which is handled by the auth interceptor) are never retried — the client made a bad request, and retrying won't fix it.

### 6.3 Drift Local Database

Drift generates a type-safe SQLite database from Dart table definitions:

```dart
// lib/src/features/training/data/models/workout_drift.dart
import 'package:drift/drift.dart';

@DataClassName('WorkoutDrift')
class Workouts extends Table {
  TextColumn get id => text()();
  TextColumn get programId => text().nullable()();
  TextColumn get athleteId => text()();
  TextColumn get coachId => text().nullable()();
  TextColumn get name => text()();
  TextColumn get description => text().nullable()();
  TextColumn get sportType => text()();
  TextColumn get scheduledDate => text()();
  TextColumn get completedAt => text().nullable()();
  TextColumn get status => text()();
  IntColumn get rpe => integer().nullable()();
  TextColumn get athleteNotes => text().nullable()();
  TextColumn get coachFeedback => text().nullable()();
  IntColumn get version => integer().withDefault(const Constant(1))();
  TextColumn get syncedAt => text().nullable()();

  @override
  Set<Column> get primaryKey => {id};
}

@DataClassName('WorkoutExerciseDrift')
class WorkoutExercises extends Table {
  TextColumn get id => text()();
  TextColumn get workoutId => text().references(Workouts, #id, onDelete: KeyAction.cascade)();
  TextColumn get exerciseId => text()();
  TextColumn get exerciseName => text()();
  TextColumn get section => text()();
  IntColumn get sortOrder => integer()();
  TextColumn get notes => text().nullable()();

  @override
  Set<Column> get primaryKey => {id};
}

@DataClassName('ExerciseSetDrift')
class ExerciseSets extends Table {
  TextColumn get id => text()();
  TextColumn get workoutExerciseId => text().references(WorkoutExercises, #id, onDelete: KeyAction.cascade)();
  IntColumn get setNumber => integer()();
  IntColumn get prescribedReps => integer().nullable()();
  RealColumn get prescribedWeightKg => real().nullable()();
  IntColumn get actualReps => integer().nullable()();
  RealColumn get actualWeightKg => real().nullable()();
  BoolColumn get isCompleted => boolean().withDefault(const Constant(false))();
  BoolColumn get isSkipped => boolean().withDefault(const Constant(false))();
  TextColumn get completedAt => text().nullable()();

  @override
  Set<Column> get primaryKey => {id};
}
```

Drift generates DAO classes with reactive queries:

```dart
// Auto-generated by drift
Stream<List<WorkoutDrift>> watchWorkoutsForDate(String athleteId, String date);
Future<List<WorkoutDrift>> getWorkoutsForDate(String athleteId, String date);
Future<void> upsertWorkout(WorkoutDrift workout);
Future<void> deleteWorkoutsNotIn(List<String> ids);
```

The `watchWorkoutsForDate` method returns a `Stream` that emits a new list every time the workouts table changes for the given athlete and date. Riverpod's `StreamProvider` listens to this stream and rebuilds the UI automatically. When a background sync updates the local database, the training dashboard reflects the new data without a manual refresh. This is the reactive local-first architecture that makes the mobile app feel instant even when the network is slow or unavailable.

### 6.4 Hive for Preferences and Small Objects

Hive stores key-value data that doesn't belong in the relational database: user preferences, theme selection, onboarding completion flags, the active organization ID, and cached authentication tokens. Hive boxes are opened at startup and exposed through Riverpod providers:

```dart
final preferencesBoxProvider = Provider<Box<Map>>((ref) {
  return Hive.box('preferences');
});

final themeModeProvider = StateNotifierProvider<ThemeModeNotifier, ThemeMode>((ref) {
  return ThemeModeNotifier(ref.watch(preferencesBoxProvider));
});
```

Hive is chosen over SharedPreferences because it supports structured data (Maps and Lists), is faster for frequent writes, and supports encryption through `Hive.initFlutter()` with an encryption key derived from the device's secure storage.

---

## 7. Offline Support

### 7.1 Local-First Architecture

The mobile app treats the local database as the primary data source and the server as the synchronization target. The athlete opens the app, sees their workouts for today, logs their sets, and completes the session — all without the server being involved in the critical path. The server is contacted to sync data and to fetch new content, but never to enable the core flow of "see workout, log workout, complete workout."

This is not an offline mode bolted on after the fact. It is the fundamental architecture. Every screen reads from the local database through Drift streams. Every mutation writes to the local database first and enqueues a sync operation. The user experience is identical whether the device has full 5G connectivity or is deep in a gym basement with zero bars.

### 7.2 Sync Queue

Mutations that need to reach the server are enqueued in a persistent sync queue stored in Drift:

```dart
class SyncQueue {
  final AppDatabase _database;
  final ConnectivityService _connectivity;

  Future<void> enqueue(SyncOperation operation) async {
    await _database.into(_database.syncQueue).insert(
      SyncQueueCompanion.insert(
        id: const Value(uuid.v7()),
        operationType: operation.type,
        entityType: operation.entityType,
        entityId: operation.entityId,
        payload: Value(operation.payload),
        status: const Value('pending'),
        createdAt: Value(DateTime.now()),
        retryCount: const Value(0),
      ),
    );
  }

  Future<void> processQueue() async {
    if (!await _connectivity.isConnected) return;

    final pending = await _database.getPendingSyncOperations();
    for (final operation in pending) {
      try {
        await _executeSync(operation);
        await _database.markSyncComplete(operation.id);
      } catch (e) {
        await _database.incrementSyncRetry(operation.id);
        if (operation.retryCount >= 5) {
          await _database.markSyncFailed(operation.id);
        }
      }
    }
  }
}
```

Sync operations are processed by a background worker that runs on a timer (every 30 seconds when the app is in the foreground) and in response to connectivity changes (when the device transitions from offline to online). Each operation has a retry count; operations that fail more than 5 times are marked as failed and surfaced to the user through the notification center.

### 7.3 Conflict Resolution

Conflicts arise when the same entity is modified on the server and on the client while disconnected. MR Training uses a last-write-wins strategy with version vectors:

```dart
class ConflictResolver {
  /// Server version wins for completed workouts (coach feedback takes precedence)
  /// Client version wins for partially logged workouts (athlete's data is preserved)
  ConflictResolution resolve(EntityType type, int clientVersion, int serverVersion) {
    switch (type) {
      case EntityType.workout:
        return clientVersion > serverVersion
            ? ConflictResolution.useClient
            : ConflictResolution.useServer;
      case EntityType.nutritionEntry:
        return ConflictResolution.merge;
      case EntityType.message:
        return ConflictResolution.useBoth; // Messages never conflict — both are preserved
      default:
        return ConflictResolution.useServer;
    }
  }
}
```

For workout conflicts, the strategy is nuanced:
- If the server version has coach feedback and the client version is the athlete's logged data, both are preserved by merging the coach feedback into the client's logged data.
- If the server version is a new workout assigned by the coach that the athlete hasn't seen, it is inserted alongside the athlete's logged data.
- If the server version is a deletion and the client has logged data, the deletion is rejected — the athlete's completed workout is never lost.

### 7.4 Connectivity Monitoring

The `ConnectivityService` monitors network state using the `connectivity_plus` package:

```dart
class ConnectivityService {
  final Connectivity _connectivity;
  final _controller = BehaviorSubject<bool>.seeded(true);

  ConnectivityService(this._connectivity) {
    _connectivity.onConnectivityChanged.listen((results) {
      final isConnected = results.any((r) => r != ConnectivityResult.none);
      _controller.add(isConnected);
      if (isConnected) {
        // Trigger sync when coming back online
        getIt<SyncQueue>().processQueue();
      }
    });
  }

  Stream<bool> get onConnectivityChanged => _controller.stream;
  bool get isConnected => _controller.value;
}
```

The connectivity stream is consumed by multiple parts of the system:
- The sync worker triggers queue processing when connectivity returns.
- The repository layer decides whether to attempt remote fetches.
- The UI shows a subtle offline indicator — not a blocking modal, but a thin colored bar at the top of the screen.
- The Dio interceptor short-circuits requests when offline.

### 7.5 Optimistic Updates

Every user-initiated mutation in the mobile app is optimistic. When the athlete taps "Complete Set," the set is marked as completed in the local database immediately. The UI updates. The sync operation is enqueued. If the server rejects the mutation — extremely rare, typically only for version conflicts — the local state is rolled back and the user is notified. But the default path is: local write, UI update, background sync. The athlete never waits for a network round-trip to see their set logged.

```dart
Future<void> logSet(LoggedSetParams params) async {
  // 1. Write to local database immediately
  await _localDataSource.logSet(params);

  // 2. Enqueue sync operation
  await _syncQueue.enqueue(SyncOperation(
    type: 'log_set',
    entityType: 'exercise_set',
    entityId: params.setId,
    payload: params.toJson(),
  ));

  // 3. No waiting. UI is already updated via Drift stream.
}
```

---

## 8. Push Notifications

### 8.1 Firebase Cloud Messaging

Push notifications in MR Training are not an afterthought bolted onto a web app. They are a first-class mobile feature powered by Firebase Cloud Messaging with platform-specific behavior on iOS and Android.

```dart
class FirebaseMessagingService {
  final FirebaseMessaging _fcm;
  final GoRouter _router;
  final NotificationChannelService _channelService;

  Future<void> initialize() async {
    // Request permission (iOS requires explicit prompt)
    final settings = await _fcm.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      criticalAlert: true, // iOS critical alerts bypass Do Not Disturb
    );

    // Get FCM token and register with backend
    final token = await _fcm.getToken();
    await _registerToken(token);

    // Handle token refresh
    _fcm.onTokenRefresh.listen(_registerToken);

    // Foreground messages — display in-app banners
    FirebaseMessaging.onMessage.listen(_handleForegroundMessage);

    // Background tap — navigate to relevant screen
    FirebaseMessaging.onMessageOpenedApp.listen(_handleNotificationTap);

    // Terminated app tap — check initial notification
    final initialMessage = await _fcm.getInitialMessage();
    if (initialMessage != null) {
      _handleNotificationTap(initialMessage);
    }
  }

  void _handleNotificationTap(RemoteMessage message) {
    final deepLink = message.data['deep_link'] as String?;
    if (deepLink != null) {
      _router.go(deepLink);
    }
  }
}
```

### 8.2 Notification Channels (Android)

Android requires notification channels for every category of notification. MR Training defines channels aligned with the platform's notification settings, allowing athletes to customize which notifications they receive:

```kotlin
// android/app/src/main/kotlin/.../NotificationService.kt
class NotificationService {
    companion object {
        const val CHANNEL_WORKOUT_ASSIGNED = "workout_assigned"
        const val CHANNEL_WORKOUT_REMINDER = "workout_reminder"
        const val CHANNEL_COACH_FEEDBACK = "coach_feedback"
        const val CHANNEL_MESSAGE = "message"
        const val CHANNEL_PAYMENT = "payment"
        const val CHANNEL_EVENT = "event"
        const val CHANNEL_AI_INSIGHT = "ai_insight"
    }

    fun createChannels() {
        listOf(
            NotificationChannel(
                CHANNEL_WORKOUT_REMINDER,
                "Workout Reminders",
                NotificationManager.IMPORTANCE_HIGH
            ).apply { description = "Daily workout reminders and scheduled session alerts" },

            NotificationChannel(
                CHANNEL_COACH_FEEDBACK,
                "Coach Feedback",
                NotificationManager.IMPORTANCE_HIGH
            ).apply { description = "When your coach reviews a workout or sends feedback" },

            NotificationChannel(
                CHANNEL_MESSAGE,
                "Messages",
                NotificationManager.IMPORTANCE_HIGH
            ).apply { description = "Direct messages from coaches, nutritionists, and teammates" },

            NotificationChannel(
                CHANNEL_PAYMENT,
                "Billing",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply { description = "Payment confirmations, invoices, and subscription updates" },

            NotificationChannel(
                CHANNEL_AI_INSIGHT,
                "AI Insights",
                NotificationManager.IMPORTANCE_LOW
            ).apply { description = "Weekly summaries, performance trends, and AI-generated insights" },
        ).forEach { channel ->
            notificationManager.createNotificationChannel(channel)
        }
    }
}
```

### 8.3 Silent Data Pushes

Silent push notifications — data messages without a notification payload — are used for background sync triggers. When the backend detects new content (a coach assigns a new workout, a nutrition plan is updated, recovery data from a wearable is available), it sends a silent push to the athlete's device. The device wakes up the Flutter engine in the background, processes the sync queue, and updates the local database. When the athlete opens the app, the data is already there:

```dart
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();

  final syncQueue = BackgroundSyncQueue();
  await syncQueue.processQueue();
}
```

This background handler runs in a separate isolate with minimal memory footprint. It does not initialize the full Flutter app — only the database, the API client, and the sync queue. The operation completes in under 30 seconds (iOS's background execution limit) or under 10 minutes (Android's WorkManager window). If processing exceeds the time limit, remaining operations are picked up on the next foreground session.

### 8.4 In-App Notification Center

Push notifications that arrive while the app is in the foreground are displayed as in-app banners — non-intrusive, contextual, and actionable. The notification center aggregates all notifications (push, in-app, system) into a single feed accessible from the app bar. Notifications are persisted locally and marked as read when viewed. This ensures that notifications dismissed accidentally or swiped away are not lost — they are always available in the notification center.

---

## 9. UI Components

### 9.1 Material Design 3 Foundation

MR Training's mobile UI is built on Material Design 3. Unlike the web application, which uses a custom design system built on Radix primitives, the mobile app leverages Material's component library for consistency with platform conventions while applying MR Training's own design tokens:

```dart
class MRTheme {
  static ThemeData light() {
    final colorScheme = ColorScheme.fromSeed(
      seedColor: MRColors.primary,
      brightness: Brightness.light,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme.copyWith(
        primary: MRColors.primary,
        secondary: MRColors.secondary,
        surface: MRColors.surfaceLight,
        error: MRColors.error,
      ),
      typography: Typography.material2021(),
      textTheme: _buildTextTheme(colorScheme),
      appBarTheme: AppBarTheme(
        centerTitle: false,
        backgroundColor: colorScheme.surface,
        foregroundColor: colorScheme.onSurface,
        elevation: 0,
        scrolledUnderElevation: 1,
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(MRRadii.lg),
        ),
        color: colorScheme.surfaceContainer,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: colorScheme.primary,
          foregroundColor: colorScheme.onPrimary,
          minimumSize: const Size(double.infinity, 56),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(MRRadii.md),
          ),
          textStyle: MRTextStyles.labelLarge,
        ),
      ),
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        type: BottomNavigationBarType.fixed,
        backgroundColor: colorScheme.surface,
        selectedItemColor: colorScheme.primary,
        unselectedItemColor: colorScheme.onSurfaceVariant,
        elevation: 0,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: colorScheme.surfaceContainerHighest,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(MRRadii.md),
          borderSide: BorderSide.none,
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      ),
    );
  }

  static ThemeData dark() {
    // ... dark variant with adjusted surface colors
  }
}
```

### 9.2 Custom Design Tokens

Design tokens from the shared design system are implemented as Dart constants, ensuring visual consistency between web and mobile:

```dart
class MRColors {
  static const primary = Color(0xFF1A73E8);
  static const secondary = Color(0xFF34A853);
  static const surfaceLight = Color(0xFFFAFAFA);
  static const surfaceDark = Color(0xFF121212);
  static const error = Color(0xFFEA4335);
  static const warning = Color(0xFFFBBC04);
  static const success = Color(0xFF34A853);
}

class MRRadii {
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 24;
  static const double full = 999;
}

class MRSpacing {
  static const double xs = 4;
  static const double sm = 8;
  static const double md = 16;
  static const double lg = 24;
  static const double xl = 32;
  static const double xxl = 48;
}

class MRTextStyles {
  static const displayLarge = TextStyle(fontSize: 32, fontWeight: FontWeight.w700, height: 1.2);
  static const headline = TextStyle(fontSize: 24, fontWeight: FontWeight.w600, height: 1.3);
  static const title = TextStyle(fontSize: 20, fontWeight: FontWeight.w600, height: 1.3);
  static const body = TextStyle(fontSize: 16, fontWeight: FontWeight.w400, height: 1.5);
  static const bodySmall = TextStyle(fontSize: 14, fontWeight: FontWeight.w400, height: 1.4);
  static const label = TextStyle(fontSize: 14, fontWeight: FontWeight.w500, height: 1.2);
  static const caption = TextStyle(fontSize: 12, fontWeight: FontWeight.w400, height: 1.3);
}
```

### 9.3 Shared Widget Library

Every widget in `lib/src/shared/widgets/` is built to the same standard:

- **MRButton** — Configurable variants (primary, secondary, outline, ghost, destructive), sizes (sm, md, lg), loading state with animated indicator, disabled state with reduced opacity. Touch target minimum 48x48dp for accessibility.

- **MRCard** — Standard card with configurable padding, optional header with title and action, optional footer. Supports swipe-to-dismiss, long-press context menu, and press animation.

- **MRTextField** — Validated text input with floating label, error state, helper text, character counter, prefix/suffix icons, and clear button. Validation is declarative through a `validator` callback.

- **MRBottomSheet** — Draggable bottom sheet with handle, configurable snap points, nested scroll support. Used for quick actions (log weight, add meal, send message).

- **MRSnackbar** — Contextual snackbar with success, error, warning, and info variants. Action button, auto-dismiss, and stacking behavior.

- **MRLoadingIndicator** — Branded loading indicator with the MR Training logo mark as a pulsing animation. Used during data fetches that haven't loaded cached data yet.

- **MREmptyState** — Illustrated empty state with title, description, and optional action button. Used when a list has no items (no programs yet, no workouts today, no messages).

- **MRErrorWidget** — Error state with retry button. Consumes the `AsyncValue.error` state from Riverpod providers.

### 9.4 Dark Mode

Dark mode is implemented as a complete `ThemeData` variant, not just inverted colors. Surface colors are carefully chosen for contrast and readability under low-light conditions. The `ThemeMode` is stored in Hive and can be set to light, dark, or system (follows the device's appearance setting). Theme changes are applied immediately through Riverpod's `StateNotifierProvider` — any widget reading `themeModeProvider` rebuilds when the theme changes.

---

## 10. Native Integration

### 10.1 Health Connect (Android)

Health Connect is Android's unified API for accessing health and fitness data from multiple apps and devices. MR Training integrates Health Connect to automatically import sleep data, heart rate, resting heart rate, heart rate variability (HRV), steps, calories burned, and exercise sessions:

```kotlin
// android/app/src/main/kotlin/.../HealthConnectService.kt
class HealthConnectService(private val context: Context) {
    private val healthConnectClient by lazy {
        HealthConnectClient.getOrCreate(context)
    }

    suspend fun readSleepData(startTime: Instant, endTime: Instant): List<SleepSession> {
        val response = healthConnectClient.readRecords(
            ReadRecordsRequest(
                recordType = SleepSessionRecord::class,
                timeRangeFilter = TimeRangeFilter.between(startTime, endTime),
            )
        )
        return response.records.map { record ->
            SleepSession(
                startTime = record.startTime,
                endTime = record.endTime,
                title = record.title,
            )
        }
    }

    suspend fun readHeartRateData(startTime: Instant, endTime: Instant): List<HeartRateRecord> {
        val response = healthConnectClient.readRecords(
            ReadRecordsRequest(
                recordType = HeartRateRecord::class,
                timeRangeFilter = TimeRangeFilter.between(startTime, endTime),
            )
        )
        return response.records
    }

    suspend fun readExerciseSessions(startTime: Instant, endTime: Instant): List<ExerciseSessionRecord> {
        val response = healthConnectClient.readRecords(
            ReadRecordsRequest(
                recordType = ExerciseSessionRecord::class,
                timeRangeFilter = TimeRangeFilter.between(startTime, endTime),
            )
        )
        return response.records
    }
}
```

The Flutter side communicates with the native service through a `MethodChannel`:

```dart
class HealthConnectChannel {
  static const _channel = MethodChannel('com.mrtraining/health_connect');

  Future<List<Map<String, dynamic>>> readSleepData({
    required DateTime startTime,
    required DateTime endTime,
  }) async {
    final result = await _channel.invokeMethod('readSleepData', {
      'startTime': startTime.toIso8601String(),
      'endTime': endTime.toIso8601String(),
    });
    return List<Map<String, dynamic>>.from(result);
  }

  Future<List<Map<String, dynamic>>> readHeartRateData({
    required DateTime startTime,
    required DateTime endTime,
  }) async {
    final result = await _channel.invokeMethod('readHeartRateData', {
      'startTime': startTime.toIso8601String(),
      'endTime': endTime.toIso8601String(),
    });
    return List<Map<String, dynamic>>.from(result);
  }
}
```

The athlete grants Health Connect permissions during onboarding. The app requests only the data types it needs — sleep, heart rate, resting heart rate, HRV, exercise sessions, and steps. No data is written to Health Connect from MR Training; the integration is read-only. Imported data is stored in the local Drift database alongside manually logged recovery data, providing a unified view of the athlete's health across all sources.

### 10.2 HealthKit (iOS)

On iOS, HealthKit serves the same role. The integration is implemented natively in Swift and accessed through a platform channel:

```swift
// ios/Runner/HealthKitService.swift
import HealthKit

class HealthKitService {
    private let healthStore = HKHealthStore()

    func requestAuthorization() async throws {
        let typesToRead: Set<HKSampleType> = [
            HKObjectType.categoryType(forIdentifier: .sleepAnalysis)!,
            HKObjectType.quantityType(forIdentifier: .heartRate)!,
            HKObjectType.quantityType(forIdentifier: .restingHeartRate)!,
            HKObjectType.quantityType(forIdentifier: .heartRateVariabilitySDNN)!,
            HKObjectType.workoutType(),
            HKObjectType.quantityType(forIdentifier: .stepCount)!,
        ]

        try await healthStore.requestAuthorization(toShare: [], read: typesToRead)
    }

    func readSleepData(start: Date, end: Date) async throws -> [[String: Any]] {
        let predicate = HKQuery.predicateForSamples(withStart: start, end: end)
        let samples = try await fetchSamples(
            type: HKObjectType.categoryType(forIdentifier: .sleepAnalysis)!,
            predicate: predicate
        )
        return samples.map { sample in
            [
                "startDate": sample.startDate.iso8601,
                "endDate": sample.endDate.iso8601,
                "value": (sample as? HKCategorySample)?.value ?? -1,
            ]
        }
    }
}
```

### 10.3 Platform Channel Pattern

All native integrations follow the same platform channel pattern:

1. **Interface definition** — A Dart class defines the API surface using `MethodChannel` or `EventChannel`. Method names and parameter keys are constants to prevent typos.
2. **Native implementation** — Kotlin (Android) or Swift (iOS) handles the native API calls and returns serialized results (Maps, Lists, primitives).
3. **Error handling** — Native exceptions are caught, wrapped in platform-specific error codes, and thrown as Dart exceptions on the Flutter side.
4. **Testing** — The Dart interface is abstracted behind a repository interface so unit tests can mock the platform channel. Native implementations are tested through integration tests on physical devices.

### 10.4 Biometric Authentication

Biometric authentication (fingerprint, face recognition) is used for quick re-authentication when the app returns from the background after a configurable timeout. This protects athlete data — workout history, nutrition logs, payment information — without requiring the full login flow. The `local_auth` package provides a cross-platform API:

```dart
class BiometricAuthService {
  final LocalAuthentication _auth;

  Future<bool> authenticate() async {
    final canAuth = await _auth.canCheckBiometrics;
    if (!canAuth) return true; // Fall back to no auth if biometrics unavailable

    return _auth.authenticate(
      localizedReason: 'Unlock MR Training to continue your session',
      options: const AuthenticationOptions(
        stickyAuth: true, // Persists across app switches
      ),
    );
  }
}
```

---

## 11. Performance

### 11.1 60 FPS Rendering

Flutter renders at 60 frames per second by default, and 120 FPS on devices with high-refresh-rate displays (ProMotion on iPhone, 120Hz on Android). Maintaining this frame rate requires discipline in widget construction:

- **Const constructors** — Every widget that can be const is const. A `const Text('Hello')` is instantiated once at compile time; a non-const `Text('Hello')` is instantiated on every build. The Flutter framework can skip rebuilding const subtrees, saving milliseconds per frame.
- **Widget decomposition** — No widget exceeds 200 lines. Large widgets are broken into smaller widgets with explicit `const` constructors. This limits the scope of rebuilds — changing a single set in the workout log rebuilds only the `SetLogger` widget, not the entire `WorkoutLogScreen`.
- **RepaintBoundary** — Widgets that animate independently (the exercise timer, the RPE selector's radial dial, the swipe-to-complete gesture) are wrapped in `RepaintBoundary` widgets. This tells Flutter's rendering engine to cache the widget's rasterized output and avoid repainting unrelated parts of the screen.
- **ListView.builder** — All lists use `ListView.builder` or `SliverList.builder` with `itemCount` and `itemBuilder`. No `ListView(children: [...])` with pre-built children for any list longer than a handful of items. The builder pattern lazily constructs widgets only for visible items.

### 11.2 Isolate Workers

CPU-intensive operations — JSON parsing for large API responses, image processing for meal photos, training load calculations for weekly analytics — run in separate isolates to keep the UI thread free:

```dart
final trainingLoadProvider = FutureProvider.family<double, String>((ref, athleteId) async {
  final workouts = await ref.watch(workoutsForAthleteProvider(athleteId).future);
  return Isolate.run(() => _calculateTrainingLoad(workouts));
});

double _calculateTrainingLoad(List<Workout> workouts) {
  // CPU-intensive calculation running in a separate isolate
  double acuteLoad = 0;
  double chronicLoad = 0;
  // ...
  return acuteLoad / chronicLoad;
}
```

`Isolate.run()` spawns a new isolate, executes the computation, and returns the result. The UI thread remains responsive — the training dashboard scrolls smoothly while the weekly load chart crunches numbers in the background. The result is cached in the Riverpod provider; subsequent reads return the cached value until the underlying data changes.

### 11.3 Image Caching

Exercise demonstration images, profile avatars, meal photos, and progress pictures are cached aggressively:

```dart
CachedNetworkImage(
  imageUrl: exercise.thumbnailUrl,
  placeholder: (_, __) => const MRLoadingIndicator(size: 24),
  errorWidget: (_, __, ___) => const Icon(Icons.fitness_center),
  cacheManager: CacheManager(
    Config(
      'exercise_images',
      stalePeriod: const Duration(days: 7),
      maxNrOfCacheObjects: 500,
    ),
  ),
)
```

The `cached_network_image` package manages disk and memory cache. Exercise images — which change rarely — are cached for 7 days. Profile avatars — which change infrequently — are cached for 24 hours. The cache is cleaned up automatically by the package's least-recently-used eviction policy, keeping the app's storage footprint small.

### 11.4 Lazy Loading

Feature screens are loaded lazily using Flutter's deferred loading. The `training` feature is loaded at startup because it is the primary surface. But `payments`, `events`, and `analytics` — features used less frequently — are loaded only when the user navigates to them:

```dart
import 'package:payments/payments.dart' deferred as payments;

GoRoute(
  path: '/payments',
  builder: (_, __) => FutureBuilder(
    future: payments.loadLibrary(),
    builder: (_, snapshot) {
      if (snapshot.connectionState == ConnectionState.done) {
        return payments.PaymentsDashboardScreen();
      }
      return const MRLoadingIndicator();
    },
  ),
)
```

This reduces the initial app load time and memory footprint. The first navigation to a deferred feature takes slightly longer as Dart downloads and compiles the deferred library, but subsequent navigations are instant because the library is cached in memory.

---

## 12. Testing

### 12.1 Unit Testing

Domain layer tests are pure Dart tests with no Flutter dependency. They run in milliseconds and cover every use case, entity method, and value object invariant:

```dart
void main() {
  group('Workout.complete', () {
    late Workout workout;
    late MockTrainingRepository repository;

    setUp(() {
      repository = MockTrainingRepository();
      workout = Workout(
        id: 'test-id',
        name: 'Morning Strength',
        status: WorkoutStatus.scheduled,
        scheduledDate: DateTime(2026, 1, 15),
        exercises: [
          WorkoutExercise(
            id: 'ex-1',
            name: 'Bench Press',
            sets: [
              ExerciseSet(setNumber: 1, prescribedReps: 10, prescribedWeightKg: 60),
              ExerciseSet(setNumber: 2, prescribedReps: 10, prescribedWeightKg: 60),
              ExerciseSet(setNumber: 3, prescribedReps: 10, prescribedWeightKg: 60),
            ],
          ),
        ],
      );
    });

    test('should mark workout as completed', () {
      final results = [
        ExerciseResult(exerciseId: 'ex-1', sets: [
          SetResult(setNumber: 1, actualReps: 10, actualWeightKg: 60),
          SetResult(setNumber: 2, actualReps: 10, actualWeightKg: 62.5),
          SetResult(setNumber: 3, actualReps: 8, actualWeightKg: 62.5),
        ]),
      ];

      workout.complete(rpe: 8, notes: 'Felt strong', exerciseResults: results);

      expect(workout.status, WorkoutStatus.completed);
      expect(workout.rpe, 8);
      expect(workout.completedAt, isNotNull);
      expect(workout.domainEvents, contains(isA<WorkoutCompletedEvent>()));
    });

    test('should throw if workout is already completed', () {
      workout.complete(rpe: 7, notes: '', exerciseResults: []);

      expect(
        () => workout.complete(rpe: 8, notes: '', exerciseResults: []),
        throwsA(isA<WorkoutAlreadyCompletedException>()),
      );
    });

    test('should throw if RPE is out of range', () {
      expect(
        () => workout.complete(rpe: 11, notes: '', exerciseResults: []),
        throwsA(isA<InvalidRPEException>()),
      );
    });
  });
}
```

Use case tests verify the orchestration logic — loading aggregates, invoking domain methods, persisting, and publishing events:

```dart
void main() {
  group('CompleteWorkout', () {
    test('should complete workout and publish event', () async {
      final repository = MockTrainingRepository();
      final eventBus = MockEventBus();
      final useCase = CompleteWorkout(repository, eventBus);

      when(() => repository.findById('workout-1'))
          .thenAnswer((_) async => scheduledWorkout);

      await useCase(CompleteWorkoutParams(
        workoutId: 'workout-1',
        rpe: 8,
        notes: 'Great session',
        exerciseResults: [],
      ));

      verify(() => repository.save(any())).called(1);
      verify(() => eventBus.publish(any<WorkoutCompletedEvent>())).called(1);
    });
  });
}
```

Repository implementation tests verify the local-first logic with a real in-memory Drift database:

```dart
void main() {
  late AppDatabase database;
  late TrainingRepositoryImpl repository;

  setUp(() {
    database = AppDatabase.executor(InMemoryExecutor());
    repository = TrainingRepositoryImpl(
      remoteDataSource: MockTrainingRemoteDataSource(),
      localDataSource: DriftTrainingLocalDataSource(database),
      networkInfo: MockNetworkInfo(),
    );
  });

  test('should return local workouts when offline', () async {
    when(() => networkInfo.isConnected).thenReturn(false);
    await database.into(database.workouts).insert(localWorkoutData);

    final workouts = await repository.getWorkoutsForDate(
      athleteId: 'athlete-1',
      date: DateTime(2026, 1, 15),
    );

    expect(workouts.length, 1);
    expect(workouts.first.name, 'Morning Strength');
  });
}
```

### 12.2 Widget Testing

Widget tests verify that screens and components render correctly with given state. Riverpod's `ProviderScope.overrides` injects mock providers:

```dart
void main() {
  testWidgets('shows shimmer while loading workouts', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          todaysWorkoutsProvider.overrideWith((ref) {
            // Never completes — perpetual loading state
            return Future.value(const AsyncValue.loading());
          }),
        ],
        child: const MaterialApp(home: TrainingDashboardScreen()),
      ),
    );

    expect(find.byType(TrainingShimmer), findsOneWidget);
  });

  testWidgets('renders workout cards when data is available', (tester) async {
    final workouts = [
      Workout(id: '1', name: 'Morning Strength', status: WorkoutStatus.scheduled, ...),
      Workout(id: '2', name: 'Evening Run', status: WorkoutStatus.scheduled, ...),
    ];

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          todaysWorkoutsProvider.overrideWith((ref) => AsyncValue.data(workouts)),
        ],
        child: const MaterialApp(home: TrainingDashboardScreen()),
      ),
    );

    expect(find.text('Morning Strength'), findsOneWidget);
    expect(find.text('Evening Run'), findsOneWidget);
  });

  testWidgets('tapping a workout navigates to log screen', (tester) async {
    // ...
  });
}
```

### 12.3 Integration Testing

Integration tests run on physical devices or emulators and verify end-to-end flows. Critical paths — authentication, workout logging, and program creation — have integration tests that run in CI:

```dart
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('complete workout logging flow', (tester) async {
    app.main();
    await tester.pumpAndSettle();

    // Login
    await tester.enterText(find.byKey(const Key('email_field')), 'athlete@test.com');
    await tester.enterText(find.byKey(const Key('password_field')), 'password123');
    await tester.tap(find.byKey(const Key('login_button')));
    await tester.pumpAndSettle();

    // Verify we're on the training dashboard
    expect(find.text('Today'), findsOneWidget);

    // Tap first workout
    await tester.tap(find.byKey(const Key('workout_card_0')));
    await tester.pumpAndSettle();

    // Verify we're on the workout log screen
    expect(find.byKey(const Key('workout_log_screen')), findsOneWidget);

    // Log a set
    await tester.enterText(find.byKey(const Key('reps_input')), '10');
    await tester.enterText(find.byKey(const Key('weight_input')), '60');
    await tester.tap(find.byKey(const Key('log_set_button')));

    // Verify set was logged
    expect(find.text('10 reps × 60 kg'), findsOneWidget);

    // Complete the workout
    await tester.tap(find.byKey(const Key('complete_workout_button')));
    await tester.pumpAndSettle();

    // Verify we're back on the dashboard
    expect(find.text('Today'), findsOneWidget);
  });
}
```

### 12.4 Test Coverage

Coverage targets align with the MASTER_PROMPT requirements: 85%+ unit test coverage for domain and data layers, critical paths covered by widget and integration tests. Coverage is measured by `flutter test --coverage` and enforced in CI. A PR that reduces coverage below the threshold fails the build.

Tests are not an afterthought. They are the specification of how the system behaves. A developer reading the test suite should understand every use case, every edge case, and every failure mode without consulting a wiki. When a test fails, it means the contract between components has been violated — and the build stops until the contract is restored.

---

*This document is part of the MR Training architecture series. See also: [05 Backend Architecture](./05-backend-architecture.md) and [06 Frontend Architecture](./06-frontend-architecture.md).*
