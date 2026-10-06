<template>
  <TendersStatusListPage
    title="Closed tenders"
    description="Tenders whose submission period has ended and are awaiting bid opening."
    status="SUBMISSIONS_CLOSED"
    icon="lucide:lock-keyhole"
  />
</template>

<script setup>
definePageMeta({ layout: 'default', sanctum: { authOnly: true } })
useHead({ title: 'Closed tenders' })
</script>
