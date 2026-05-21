import { ZoneForecast, Alert } from './types';

export function getNarrative(zonestate: any[], alerts: Alert[]): string {
  let resumen = '';
  if (zonestate.some(z => z.powder.value >= 70)) resumen += 'Polvo asegurado para los fanáticos esta jornada. ';
  if (alerts.find(a => a.type==='viento' && a.level==='danger')) resumen += 'Precaución por viento fuerte, especialmente en cumbre. ';
  if (alerts.find(a => a.type==='lluvia')) resumen += 'Es probable lluvia baja en pueblo o centro, optimice ventana nocturna. ';
  if (zonestate.every(z => z.answer.startsWith('No'))) resumen += 'Hoy predomina tiempo seco y frío, sólo nieve residual.';
  if (!resumen) resumen = 'Jornada variable: ventanas con nieve húmeda, algunas ráfagas, consultar cartelera en centro.';
  return resumen.trim();
}
