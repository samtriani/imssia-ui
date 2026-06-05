import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap, catchError, throwError } from 'rxjs';
import { MedicoSession } from '../models/auth.model';
import { environment } from '../../../environments/environment';

interface LoginRequest  { matricula: string; password: string; }
interface LoginResponse {
  matricula:       string;
  nombre:          string;
  nombreCorto:     string;
  email:           string;
  turno:           string;
  nivel:           string;
  cveEspecialidad: string;
  desEspecialidad: string;
  unidadMedica:    string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {

  private readonly SESSION_KEY = 'imss_ai_session';
  private readonly BASE        = `${environment.apiUrl}/api/v1/auth`;

  private session$ = new BehaviorSubject<MedicoSession | null>(this.loadSession());

  constructor(
    private http:   HttpClient,
    private router: Router
  ) {}

  /**
   * Llama a POST /api/v1/auth/login en el backend Spring Boot.
   * El backend valida contra pamt_usuario_medico con bcrypt/pgcrypto
   * y retorna la sesión enriquecida con la especialidad del médico.
   */
  login(
    matricula: string,
    password: string,
    cveEspecialidad?: string,
    desEspecialidad?: string
  ): Observable<MedicoSession> {
    const body: LoginRequest = { matricula, password };

    return this.http.post<LoginResponse>(`${this.BASE}/login`, body).pipe(
      tap(res => {
        const session: MedicoSession = {
          matricula:       res.matricula,
          nombre:          res.nombre,
          nombreCorto:     res.nombreCorto,
          email:           res.email,
          turno:           res.turno,
          nivel:           res.nivel,
          cveEspecialidad: cveEspecialidad || res.cveEspecialidad,
          desEspecialidad: desEspecialidad || res.desEspecialidad,
          unidadMedica:    res.unidadMedica
        };
        sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
        this.session$.next(session);
      }),
      catchError(err => {
        const msg = err.status === 401
          ? 'Matrícula o contraseña incorrecta.'
          : err.status === 404
          ? 'Médico no encontrado en el sistema.'
          : 'Error de conexión. Verifica que el servidor esté activo.';
        return throwError(() => new Error(msg));
      })
    );
  }

  logout(): void {
    sessionStorage.removeItem(this.SESSION_KEY);
    this.session$.next(null);
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean    { return !!this.session$.value; }
  getSession(): MedicoSession | null { return this.session$.value; }

  private loadSession(): MedicoSession | null {
    const raw = sessionStorage.getItem(this.SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  }
}
