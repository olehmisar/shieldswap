<script lang="ts">
  export let onclick: () => unknown;
  let clas = ''
  export { clas as class }

  let loading = false;
</script>

<button
  type="button"
  aria-busy={loading}
  disabled={loading}
  class={clas}
  on:click={async () => {
    loading = true;
    try {
      await onclick();
    } finally {
      loading = false;
    }
  }}
>
  <slot />
</button>
