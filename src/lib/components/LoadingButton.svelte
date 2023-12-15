<script lang="ts">
  export let onclick: () => unknown;
  export let disabled = false;
  export let style = ''
  let clas = "";
  export { clas as class };

  let loading = false;
</script>

<button
  type="button"
  aria-busy={loading}
  disabled={loading || disabled}
  class={clas}
  {style}
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
