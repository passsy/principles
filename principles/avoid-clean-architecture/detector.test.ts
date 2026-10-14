import { expect, test } from "vitest";
import { detect, edit, prompt, read, source, write } from "@wellactually/sdk/v3/test";

const useCase = source`
  /// Loads one user.
  class GetUserUseCase {
    const GetUserUseCase();

    Future<int> call(String id) async {
      return 1;
    }
  }
`;

test("a file in a usecases directory fires for the file", () => {
  const code = source`
    // Loads one user.
    Future<int> loadUser(String id) async {
      return 1;
    }
  `;
  expect(detect(write("lib/domain/usecases/load_user.dart", code))).toEqual([{}]);
});

test("reading a file in a repositories directory fires too", () => {
  expect(detect(read("lib/data/repositories/order_repository.dart", "class Orders {}"))).toEqual([{}]);
});

test("a UseCase class fires", () => {
  expect(detect(write("lib/get_user_use_case.dart", useCase))).toEqual([{ line: 2 }]);
});

test("a UseCase class the agent did not write stays quiet", () => {
  expect(detect(edit("lib/get_user_use_case.dart", useCase, { written: "      return 1;" }))).toEqual([]);
});

test("feature-first structure stays quiet", () => {
  const code = source`
    /// One order line in the overview.
    class OrderSummary {
      const OrderSummary(this.total);

      final int total;
    }
  `;
  expect(detect(write("lib/orders/order_summary.dart", code))).toEqual([]);
});

test("UseCase as a name prefix is not a UseCase class", () => {
  expect(detect(write("lib/use_case_gallery.dart", "class UseCaseGallery {}"))).toEqual([]);
});

const dartApp = { project: "fixtures/dart_app" };

test("points at the principle when the user mentions clean architecture in a Dart project", () => {
  expect(detect(prompt("Set up the orders feature with Clean Architecture"), dartApp)).toEqual([{ match: "Clean Architecture", depth: "pointer" }]);
});

test("stays quiet when the user talks about a git repository", () => {
  expect(detect(prompt("Push this to the repository"), dartApp)).toEqual([]);
});
