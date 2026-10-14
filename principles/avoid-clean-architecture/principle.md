# Avoid Clean Architecture

Organize code by feature and call repositories directly, because UseCase and layer-first folders add indirection and boilerplate without value.

Do not use Clean Architecture, especially the rigid layer separation with UseCases, Repositories, and Entities in separate folders. It adds complexity without proportional value for most projects.

## Problems with Clean Architecture

### Useless Indirection

Most UseCases become one-liner proxies that just call a repository method:

```dart
// Useless - a class with one method is just a function
class GetUserUseCase {
  final UserRepository repository;
  GetUserUseCase(this.repository);

  Future<User> call(String id) => repository.getUser(id); // Just forwarding!
}
```

A function calling a function doing nothing else is useless indirection.

### Layer-First Structure Fragments Features

Clean Architecture organizes by layer, not by feature:

```
lib/
  data/
    repositories/
      order_repository.dart
    models/
      order_model.dart
  domain/
    entities/
      order.dart
    usecases/
      get_orders_usecase.dart
  presentation/
    pages/
      order_page.dart
```

Working on "Orders" requires jumping between 5+ folders. This slows development and makes features harder to understand as a unit.

### Boilerplate Explosion

A simple feature requires: Entity, Model, Repository interface, Repository implementation, UseCase, potentially multiple mappers. For a CRUD feature, this can mean 10+ files before writing any real logic.

### The "Swappable Database" Myth

Repository abstractions are often justified by "we might switch databases." In practice:
- Database switches are rare
- When they happen, the abstraction usually leaks anyway
- ORMs already provide sufficient abstraction

### False Decoupling

Interfaces don't eliminate coupling - they just hide it. If `GetOrderById` interface returns an `Order` shaped by your ORM constraints, you're still coupled to the ORM.

### Single-Source Repositories Are Pointless

Repositories wrapping a single HTTP API add no value - each method is just a one-liner forwarding to the API client:

```dart
// Pointless abstraction
class UserRepository {
  final ApiClient api;
  UserRepository(this.api);

  Future<User> getUser(String id) => api.get('/users/$id'); // Just forwarding!
  Future<List<User>> getUsers() => api.get('/users');       // Just forwarding!
}
```

Worse, hiding the data source is **counterproductive**. Users need to know:
- Is this data fresh from the server or stale from cache?
- Will this call hit the network or return instantly?
- Should I show a loading indicator?

A repository that abstracts away "where data comes from" actively hides information the UI needs to make good decisions. Call the API directly or use a named service that makes the data source explicit.

## What to Do Instead

### Feature-First Structure

```
lib/
  orders/
    order_page.dart
    order_controller.dart
    order_repository.dart
    order.dart
  player/
    player_page.dart
    player_control_widget.dart
    player_view_model.dart
    play_button.dart
    streaming_codec.dart
```

All related code lives together. Easy to find, easy to understand, easy to delete.

### Skip UseCases - Call Repositories Directly

Inject repositories into controllers/ViewModels. Only create a UseCase when it orchestrates multiple repositories or contains non-trivial business logic.

### Keep It Simple

Add abstractions when you have a concrete problem, not to satisfy architectural dogma. Most apps need: UI, State Management, and Data Access. Three layers, not five.

## References

- [Clean Architecture and Indirection - CodeOpinion](https://codeopinion.com/clean-architecture-and-indirection-no-thanks/)
- [UseCase Red Flags - Teknasyon Engineering](https://engineering.teknasyon.com/usecase-red-flags-and-best-practices-in-clean-architecture-76e2f6d921eb)
- [Feature-First Architecture - DEV Community](https://dev.to/princetomarappdev/mastering-flutter-architecture-from-clean-to-feature-first-for-faster-scalable-development-4605)
