import { afterEach, describe, expect, it } from "vitest";
import {
  DATABASE_NAME,
  currentDatabaseName,
  databaseNameForUser,
  resetActiveDatabaseName,
  setActiveUserDatabase,
} from "./database";

afterEach(() => resetActiveDatabaseName());

describe("alcance de la base local", () => {
  it("usa la base histórica para invitados", () => {
    expect(databaseNameForUser(null)).toBe(DATABASE_NAME);
    expect(databaseNameForUser(undefined)).toBe(DATABASE_NAME);
    expect(databaseNameForUser("")).toBe(DATABASE_NAME);
    expect(currentDatabaseName()).toBe(DATABASE_NAME);
  });

  it("separa cada cuenta y codifica identificadores", () => {
    expect(databaseNameForUser("user-123")).toBe("runo-user-user-123");
    expect(databaseNameForUser("a/b")).toBe("runo-user-a%2Fb");
  });

  it("cambia de alcance sin tocar la base del invitado", () => {
    setActiveUserDatabase("user-123");
    expect(currentDatabaseName()).toBe("runo-user-user-123");
    setActiveUserDatabase(null);
    expect(currentDatabaseName()).toBe(DATABASE_NAME);
  });
});
