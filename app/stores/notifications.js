import { defineStore } from 'pinia';

export const useNotificationStore = defineStore('notifications', () => {
  const notifications = ref([]);
  const unread = ref(0);
  const loading = ref(false);

  const { list, unreadCount, markRead, markActioned, markAllRead } = useNotificationHelper();

  const fetchUnreadCount = async () => {
    const { data } = await unreadCount();
    unread.value = data.value?.data?.count ?? 0;
  };

  const fetchNotifications = async (params = {}) => {
    loading.value = true;
    const { data } = await list({ per_page: 25, ...params });
    const raw = data.value;
    // Diagnostic — remove once notifications render.
    console.log('[notifications.fetchNotifications] raw response:', raw);
    const payload = raw?.data;
    let items = [];
    if (Array.isArray(payload)) {
      items = payload;
    } else if (Array.isArray(payload?.data)) {
      items = payload.data;
    }
    notifications.value = items;
    loading.value = false;
  };

  const markAsRead = async (id) => {
    const { status } = await markRead(id);
    if (status?.value) {
      const item = notifications.value.find((n) => n.id === id);
      if (item) item.read_at = item.read_at ?? new Date().toISOString();
      await fetchUnreadCount();
    }
  };

  const markAsActioned = async (id) => {
    const { status } = await markActioned(id);
    if (status?.value) {
      const item = notifications.value.find((n) => n.id === id);
      if (item) {
        item.actioned_at = new Date().toISOString();
        item.read_at = item.read_at ?? item.actioned_at;
      }
      await fetchUnreadCount();
    }
  };

  const markEverythingRead = async () => {
    const { status } = await markAllRead();
    if (status?.value) {
      notifications.value.forEach((n) => {
        n.read_at = n.read_at ?? new Date().toISOString();
      });
      unread.value = 0;
    }
  };

  return {
    notifications,
    unread,
    loading,
    fetchUnreadCount,
    fetchNotifications,
    markAsRead,
    markAsActioned,
    markEverythingRead,
  };
});
