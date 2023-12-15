<script lang="ts">
  export let onclick: () => unknown;
  export let disabled = false;
  export let style = "";
  export let inline = false;
  let clas = "";
  export { clas as class };

  let loading = false;
</script>

<button
  type="button"
  aria-busy={loading}
  disabled={loading || disabled}
  class={clas}
  class:inline
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

<style>
  .inline {
    display: inline-block;
    width: auto;
  }
</style>
