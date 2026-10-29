// Constantes partagées de la plateforme Pastef Keur Massar Nord

export const OFFICIAL_CELL_NAME = 'Cellule Pastef quartiers : Serigne Mansour Sy 1 / Darou Salam 2 Extension';
export const APP_SHORT_NAME = 'Pastef keur Massar nord';
export const APP_SUBTITLE = 'Serigne Mansour Sy 1 · Darou Salam 2 Ext.';

export const PRESET_NEIGHBORHOODS = [
  'Serigne Mansour Sy 1',
  'Darou Salam 2 Extension',
  'Serigne Mansour Sy 2',
  'Autre quartier',
] as const;

export const NEIGHBORHOOD_CHIEFS: Record<string, string> = {
  'Serigne Mansour Sy 1': 'Maodo Ka',
  'Darou Salam 2 Extension': '',
  'Serigne Mansour Sy 2': '',
};

export const DEFAULT_EVENING_QTY = 2;
export const DEFAULT_MORNING_QTY = 2;
