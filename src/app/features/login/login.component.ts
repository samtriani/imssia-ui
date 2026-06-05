import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {

  matricula = '';
  password  = '';
  loading   = false;
  error     = '';

  cveEspecialidad = 'MED_GEN';

  readonly especialidades = [
    { cve: 'MED_GEN',        des: 'Medicina General' },
    { cve: 'MED_FAM',        des: 'Medicina Familiar' },
    { cve: 'MED_INT',        des: 'Medicina Interna' },
    { cve: 'PEDIATRIA',      des: 'Pediatría' },
    { cve: 'GINECOOBST',     des: 'Ginecología y Obstetricia' },
    { cve: 'CIRUGIA_GEN',    des: 'Cirugía General' },
    { cve: 'TRAUMATOLOGIA',  des: 'Traumatología y Ortopedia' },
    { cve: 'CARDIOLOGIA',    des: 'Cardiología' },
    { cve: 'NEUROLOGIA',     des: 'Neurología' },
    { cve: 'PSIQUIATRIA',    des: 'Psiquiatría' },
    { cve: 'DERMATOLOGIA',   des: 'Dermatología' },
    { cve: 'OFTALMOLOGIA',   des: 'Oftalmología' },
    { cve: 'OTORRINOL',      des: 'Otorrinolaringología' },
    { cve: 'ENDOCRINOL',     des: 'Endocrinología' },
    { cve: 'NEUMOLOGIA',     des: 'Neumología' },
    { cve: 'GASTROENT',      des: 'Gastroenterología' },
    { cve: 'ONCOLOGIA',      des: 'Oncología Médica' },
    { cve: 'URGENCIAS',      des: 'Medicina de Urgencias' },
    { cve: 'ANESTESIOLOGIA', des: 'Anestesiología' },
    { cve: 'RADIOLOGIA',     des: 'Radiología e Imagen' },
  ];

  constructor(
    private auth:   AuthService,
    private router: Router
  ) {}

  onLogin(): void {
    this.error = '';

    if (!this.matricula.trim() || !this.password.trim()) {
      this.error = 'Ingresa tu matrícula y contraseña.';
      return;
    }

    this.loading = true;

    const esp = this.especialidades.find(e => e.cve === this.cveEspecialidad);

    this.auth.login(
      this.matricula.trim(),
      this.password,
      esp?.cve,
      esp?.des
    ).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (err: Error) => {
        this.error   = err.message;
        this.loading = false;
      }
    });
  }

  onKeyEnter(e: KeyboardEvent): void {
    if (e.key === 'Enter') this.onLogin();
  }
}
