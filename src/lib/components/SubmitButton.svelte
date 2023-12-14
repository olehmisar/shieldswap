<script lang="ts">
  export let loading: boolean;
</script>

<button type="submit" aria-busy={loading} disabled={loading}>
  <slot />
</button>
