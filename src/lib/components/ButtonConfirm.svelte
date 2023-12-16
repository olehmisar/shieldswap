<script lang="ts">
  import LoadingButton from "./LoadingButton.svelte";

  export let onclick: () => unknown;
  export let confirmText: string;
  let clas = "";
  export { clas as class };
</script>

<LoadingButton
  class={clas}
  onclick={async () => {
    if (!confirm(confirmText)) {
      return;
    }
    return await onclick();
  }}
>
  <slot />
</LoadingButton>
