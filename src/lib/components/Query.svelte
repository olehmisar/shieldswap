<script lang="ts" generics="T, E">
  import type { CreateQueryResult } from "@tanstack/svelte-query";

  export let query: CreateQueryResult<T, E>;

  $: dataDefined = $query.data as T;
</script>

{#if $query.isLoading}
  <p>Loading...</p>
{:else if $query.isError}
  <p>Error: {String($query.error)}</p>
{:else if $query.isSuccess && $query.data !== undefined}
  <slot data={dataDefined} />
{/if}
