import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/NOM_DU_DEPOT/", // ex: "/neuroreact/"
});
