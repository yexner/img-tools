<script lang="ts">
  import ComposeTool from '#lib/ui/ComposeTool.svelte';
  import { buildImagePdf, pdfName } from './logic';
</script>

<ComposeTool verb="Create PDF from" filename={pdfName} build={buildImagePdf} />
