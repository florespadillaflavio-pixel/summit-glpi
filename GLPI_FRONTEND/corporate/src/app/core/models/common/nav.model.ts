export interface NavItem {
  icon: string;   // nombre del ícono en kebab-case (lucide-angular name="...")
  label: string;
  link: string;
  permission?: string;  // código del permiso requerido (undefined = visible siempre)
  badge?: number;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}
