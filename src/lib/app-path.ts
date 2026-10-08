// Vite embeds the deployment prefix in both browser and server builds.
export function appPath(path: string): string {
  return `${import.meta.env.BASE_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}
