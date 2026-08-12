export function formatMinAge(minAge: number): string {
  return minAge === 0 ? 'Tutti' : `${minAge}+`;
}
