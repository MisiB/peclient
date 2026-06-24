<template>
  <div class="dropdown dropdown-end">
    <label tabindex="0" class="btn btn-ghost btn-circle" @click="onOpen">
      <div class="indicator">
        <Icon name="lucide:bell" class="h-5 w-5" />
        <span v-if="store.unread > 0" class="badge indicator-item badge-error badge-sm">
          {{ store.unread > 99 ? '99+' : store.unread }}
        </span>
      </div>
    </label>

    <div tabindex="0" class="card dropdown-content card-compact z-[60] mt-2 w-96 border border-base-200 bg-base-100 shadow-xl">
      <div class="card-body p-0">
        <div class="flex items-center justify-between border-b border-base-200 px-3 py-2">
          <span class="text-sm font-semibold">Notifications</span>
          <button
            v-if="store.unread > 0"
            class="btn btn-ghost btn-xs"
            @click="store.markEverythingRead"
          >
            Mark all read
          </button>
        </div>

        <div v-if="store.loading" class="flex justify-center py-6">
          <span class="loading loading-spinner loading-md"></span>
        </div>

        <div
          v-else-if="!store.notifications.length"
          class="px-3 py-6 text-center text-sm text-base-content/60"
        >
          No notifications.
        </div>

        <ul v-else class="max-h-96 divide-y divide-base-200 overflow-y-auto">
          <li
            v-for="n in store.notifications"
            :key="n.id"
            :class="['p-3 text-sm', n.actioned_at ? 'bg-base-200/40' : (n.read_at ? '' : 'bg-warning/10')]"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0 flex-1">
                <p class="font-medium">{{ n.data?.subject || 'Notification' }}</p>
                <p class="text-xs text-base-content/70">{{ n.data?.message || '' }}</p>
                <p v-if="n.data?.comment" class="mt-1 text-xs italic text-base-content/60">
                  "{{ n.data.comment }}"
                </p>
                <p class="mt-1 text-xs text-base-content/50">
                  {{ formatTime(n.created_at) }}
                  <span v-if="n.actioned_at" class="ml-2 badge badge-success badge-xs">Actioned</span>
                </p>
              </div>
              <div class="flex shrink-0 flex-col gap-1">
                <NuxtLink
                  v-if="n.data?.plan_uuid"
                  :to="`/annualprocurementplans/${n.data.plan_uuid}`"
                  class="btn btn-ghost btn-xs"
                  @click="store.markAsRead(n.id)"
                >
                  Open
                </NuxtLink>
                <button
                  v-if="!n.actioned_at"
                  class="btn btn-success btn-xs"
                  @click="store.markAsActioned(n.id)"
                >
                  <Icon name="lucide:check" />
                  Resolve
                </button>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useNotificationStore } from '~/stores/notifications';

const store = useNotificationStore();

const onOpen = async () => {
  await Promise.all([
    store.fetchNotifications(),
    store.fetchUnreadCount({ force: true }),
  ]);
};

const formatTime = (v) => {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  const now = Date.now();
  const diffMin = Math.round((now - d.getTime()) / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH} hr ago`;
  return d.toLocaleString();
};

onMounted(() => {
  store.startUnreadListeners();
});

onBeforeUnmount(() => {
  store.stopUnreadListeners();
});
</script>
