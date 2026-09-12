
export interface TeacherRecord {
  programa: string;
  periodo: string;
  seccion: string;
  idUD: string;
  unidadDidactica: string;
  idDocente: string;
  docente: string;
  inicio: string;
  fin: string;
  modalidad: string;
  responsable: string;
}

export interface Criterion {
  id: number;
  label: string;
  description: string;
  points: number;
}

export interface ChecklistState {
  [key: number]: boolean;
}

export interface FormData {
  docente: string;
  programa: string;
  unidadDidactica: string;
  seccion: string;
  modalidad: string;
  responsable: string;
  fechaMonitoreo: string;
  enlaceAula: string;
}
