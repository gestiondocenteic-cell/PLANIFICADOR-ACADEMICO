export interface AuthorizedUser {
  usuario: string;
  contrasena: string;
  nombre?: string;
}

export const AUTHORIZED_USERS: AuthorizedUser[] = [
  { usuario: "20034339", contrasena: "20034339OGD2026", nombre: "Usuario 20034339" },
  { usuario: "70041819", contrasena: "70041819OGD2026", nombre: "Usuario 70041819" },
  { usuario: "20071153", contrasena: "20071153OGD2026", nombre: "Usuario 20071153" },
  { usuario: "40261777", contrasena: "40261777OGD2026", nombre: "Usuario 40261777" },
];

export const validateUserCredentials = (usuario: string, contrasena: string): boolean => {
  const cleanUser = usuario.trim();
  const cleanPass = contrasena.trim();
  return AUTHORIZED_USERS.some(
    (u) => u.usuario === cleanUser && u.contrasena === cleanPass
  );
};
