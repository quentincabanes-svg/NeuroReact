import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  // ⚠️ mets exactement le nom de ton dépôt entre les slashes :
  base: "/neuroreact/",
});
