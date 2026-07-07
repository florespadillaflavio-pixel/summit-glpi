export interface StatCard {
  label:    string;
  value:    number | string;
  trend:    number;
  trendGoodWhenUp: boolean;
  icon:     string;
}

export interface ChartBar {
  label: string;
  count: number;
  max:   number;
  cls:   string;
}

export interface RecentTicket {
  id:         string;
  number:     string;
  subject:    string;
  statusCode: string;
  statusName: string;
  priCode:    string;
  priName:    string;
  assignee:   string;
  createdAgo: string;
}
