<script lang="ts">
  export let disabled = false;
  export let loading: boolean;
</script>

<button type="submit" aria-busy={loading} disabled={disabled || loading}>
  <slot />
</button>
