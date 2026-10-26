
/**
 * FILE: ADMIN/src/services/announcements/announcements.service.ts
 *
 * Đối chiếu các route CRUD announcements trong backend trước khi dùng.
 */

import { API_ENDPOINTS } from '../api/endpoints';
import { createResourceService } from '../api/resourceService';

export interface Announcement {
  _id: string;
  title: string;
  content: string;
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
}

export type AnnouncementPayload = Omit<Announcement, '_id'>;

export const announcementsService = createResourceService<
  Announcement,
  AnnouncementPayload,
  Partial<AnnouncementPayload>
>({
  base: API_ENDPOINTS.announcements.base,
});
