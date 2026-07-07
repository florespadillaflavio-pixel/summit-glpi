export interface ContractListItem {
  id: string | number;
  nombre: string;
  tipo: string;
  proveedor: string;
  inicio: string;
  fin: string;
  valor: number;
  estado: 'Activo' | 'Por vencer' | 'Vencido';
  activos: number;
}

export interface MesTimeline {
  label: string;
  contratos: { nombre: string; color: string }[];
}
