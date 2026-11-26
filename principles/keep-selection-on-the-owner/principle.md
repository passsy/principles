# Keep Selection on the Owner

Store which item is recommended, selected or default on the collection's owner, not as a flag on each item, so there can only ever be the one you meant.

A flag like `recommended: true` on every item says that several items may carry it.
When the meaning is "exactly one" (recommended, accepted, selected, default, primary, current), store it once on the owner of the collection: `recommendedFix: "F2"` on the finding, not `recommended` on each fix.
Then a second one cannot exist, there is no "at most one" check to write, and changing the pick is one write instead of two.

The same holds for multi-selection: keep the selection as a set on the owner, not an `isSelected` flag on each item.
The selection is cleared or replaced in one write, and the same items can be selected differently in two places (two views, two users) at once.

A state enum with a `selected` value on each item, like `enum MarkerState { selected, unselected }`, is the same flag in disguise.
When the owner also keeps the selected list, every selection change has to loop over all items to keep the two in sync.

Either way the items can stay immutable.
Picking or selecting one changes only the owner, so no item is copied or mutated to flip a flag, and an item shared by several owners is never touched by one of them.

## Bad

```ts
interface Fix {
  id: string;
  description: string;
  recommended?: boolean;
}

interface Finding {
  fixes: Fix[];
}

// Needs a rule nobody can see in the types, and two writes to move the pick.
if (finding.fixes.filter((f) => f.recommended).length > 1) {
  throw new Error("Recommend at most one fix");
}
```

```dart
class Address {
  Address({required this.street, this.isDefault = false});

  final String street;
  final bool isDefault;
}

class Customer {
  Customer(this.addresses);

  final List<Address> addresses;
}
```

## Good

```ts
interface Fix {
  id: string;
  description: string;
}

interface Finding {
  fixes: Fix[];
  /** The id of the fix the reviewer would pick. On the finding, so there is only ever one. */
  recommendedFix?: string;
}
```

```dart
class Address {
  Address({required this.id, required this.street});

  final AddressId id;
  final String street;
}

class Customer {
  Customer(this.addresses, {this.defaultAddress});

  final List<Address> addresses;
  final AddressId? defaultAddress;
}
```

Multi-selection lives on whoever does the selecting, often a view's state:

```dart
class _InboxPageState extends State<InboxPage> {
  final Set<MessageId> _selected = {};

  void _clearSelection() => setState(_selected.clear);
}
```

```ts
const [selected, setSelected] = useState<ReadonlySet<MessageId>>(new Set());
```

## Id or identity?

The owner can hold the item's id or the item itself.

- **Serialised items** (JSON storage, database rows, wire formats, MCP or API payloads): hold the id.
  An object reference does not survive a round trip, and the id is what both ends agree on.
- **Live objects in memory** whose identity is stable: holding the item works.
  In Dart that means a `Set<Item>` where `Item` has `==` and `hashCode` over its identity (its id, not every field, or editing an item drops it out of the set).
  In TypeScript a `Set<Item>` compares by reference, so it only works while the same instances live on; after a reload, a refetch or an immutable update the set holds stale objects. Prefer ids there unless you own the instances.
- When in doubt, hold the id. It works in both cases.

## A pick must name an item that exists

When an item is removed, a pick naming it either fails the change or is cleared with it, never left dangling:

```ts
if (finding.recommendedFix && !finding.fixes.some((f) => f.id === finding.recommendedFix)) {
  throw new InputError(`recommendedFix ${finding.recommendedFix} names no fix on this finding`);
}
```

```dart
void removeAddress(AddressId id) {
  addresses.removeWhere((a) => a.id == id);
  if (defaultAddress == id) {
    defaultAddress = null;
  }
}
```

## Exceptions

- A boolean that describes the item itself, true for any number of them independent of the others, is data: `isArchived`, `isVerified`, `done`.
- A widget or a React component may take `selected` as an input. It shows a selection that its parent owns; it does not store one.
- A wire format you do not control may carry the flag. Convert it to the owner's field at the boundary.
