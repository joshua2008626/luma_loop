// base './' keeps asset URLs relative, so the build works under a GitHub Pages repo subpath.
// `vite build --mode playables` injects the official Playables SDK script (before game code) and writes dist-playables/.
export default ({ mode }) => ({
  base: './',
  build: { outDir: mode === 'playables' ? 'dist-playables' : 'dist', chunkSizeWarningLimit: 1600 },
  plugins: [{ name: 'playables-sdk', transformIndexHtml: html => mode === 'playables' ? html.replace('<head>', '<head>\n<script src="https://www.youtube.com/game_api/v1"></script>') : html }]
});
