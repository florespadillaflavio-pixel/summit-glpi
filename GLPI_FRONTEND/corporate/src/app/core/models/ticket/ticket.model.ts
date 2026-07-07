import { CatalogItem } from '../catalog/catalog.model';

export interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  statusName: string;
  statusCode: string;
  statusColor: string;
  priorityName: string;
  priorityCode: string;
  requesterName: string;
  assignedToName?: string;
  createdAt: Date | string;
}

export interface TicketDetail extends Ticket {
  typeItemId: string;
  priorityItemId: string;
  assetId?: string;
  typeItem?: CatalogItem;
  statusItem?: CatalogItem;
  priorityItem?: CatalogItem;
  requesterId: string;
  requester?: {
    firstName: string;
    lastName: string;
  };
  assignedToId?: string;
  dueDate?: string;
  slaBreached: boolean;
  tags: string[];
}

export interface TicketComment {
  id: string;
  ticketId: string;
  authorId: string;
  authorName: string;
  authorInitials?: string;
  authorAvatar?: string;
  body: string;
  isInternal: boolean;
  attachments: string; // JSON string
  createdAt: string;
}

export interface TicketCommentCreateDto {
  ticketId: string;
  authorId: string;
  body: string;
  isInternal: boolean;
  attachments: string;
}

export interface TicketHistory {
  id: string;
  eventType: 'AUDIT' | 'COMMENT' | 'NOTE' | string;
  action: string;
  title: string;
  detail: string;
  actorName: string;
  isInternal: boolean;
  oldValues: string;
  newValues: string;
  createdAt: string;
}

export interface CreateTicketDto {
  subject: string;
  description: string;
  typeItemId: string;
  statusItemId?: string;
  priorityItemId: string;
  categoryId?: string;
  requesterId: string;
  assetId?: string;
}
