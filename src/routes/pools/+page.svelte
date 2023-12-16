<script lang="ts">
  import AddLiquidity from "./AddLiquidity.svelte";
  import PoolInfo from "./PoolInfo.svelte";
</script>

<svelte:head>
  <title>Pools - ShieldSwap</title>
</svelte:head>

<main class="container">
  <PoolInfo />
  <AddLiquidity />
</main>
