export function firstNameFromFullName(value: string | null | undefined): string | undefined {
  const firstName = value?.trim().split(/\s+/)[0];
  return firstName || undefined;
}
