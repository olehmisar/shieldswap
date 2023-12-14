<script lang="ts">
  import { useQueryClient } from "@tanstack/svelte-query";

  export let onsubmit: (
    e: Event & { currentTarget: EventTarget & HTMLFormElement },
  ) => unknown;
  export let oninput:
    | ((e: Event & { currentTarget: EventTarget & HTMLFormElement }) => unknown)
    | undefined = undefined;
  let loading = false;

  const queryClient = useQueryClient();
</script>

<form
  on:input={oninput}
  on:submit|preventDefault={async (e) => {
    try {
      loading = true;
      await onsubmit(e);
      queryClient.invalidateQueries();
      alert("Success");
    } catch (e) {
      // @ts-expect-error
      alert("Error: " + e?.message);
      throw e;
    } finally {
      loading = false;
    }
  }}
>
  <slot {loading} />
</form>
