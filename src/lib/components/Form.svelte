<script lang="ts">
  import { useQueryClient } from "@tanstack/svelte-query";
  import toast from "svelte-french-toast";

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
    const duration = 10_000;
    try {
      loading = true;
      await onsubmit(e);
      queryClient.invalidateQueries();
      toast.success("Success", { duration });
    } catch (e) {
      // @ts-expect-error to get `message`
      toast.error(e?.message ?? "Unexpected error", { duration });
      throw e;
    } finally {
      loading = false;
    }
  }}
>
  <slot {loading} />
</form>
