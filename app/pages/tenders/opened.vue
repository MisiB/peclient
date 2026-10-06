<template>
  <TendersStatusListPage
    title="Opened tenders"
    description="Tenders for which bid opening has been formally recorded."
    status="OPENED"
    icon="lucide:folder-open"
  />
</template>

<script setup>
definePageMeta({ layout: 'default', sanctum: { authOnly: true } })
useHead({ title: 'Opened tenders' })
</script>
