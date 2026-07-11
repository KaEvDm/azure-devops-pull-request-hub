jest.mock("azure-devops-extension-api", () => ({ getClient: jest.fn() }));
jest.mock("azure-devops-extension-api/Graph/GraphClient", () => ({
  GraphRestClient: jest.fn(),
}));
jest.mock("azure-devops-extension-api/Profile/Profile", () => ({
  AvatarSize: { Medium: 1 },
}));

import { getIdentityDisplayName } from "./services/AvatarService";

it("provides a neutral label for an inaccessible identity", () => {
  expect(getIdentityDisplayName({})).toBe("Unknown user");
  expect(getIdentityDisplayName({ isDeletedInOrigin: true })).toBe(
    "Deleted user"
  );
});
