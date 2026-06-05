import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule, UpperCasePipe } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { MedicoSession } from '../../core/models/auth.model';

interface NavItem {
  icon: string;
  label: string;
  sublabel: string;
  route: string;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterModule, UpperCasePipe],
  templateUrl: './shell.component.html',
  styleUrls: ['./shell.component.scss']
})
export class ShellComponent implements OnInit {

  session: MedicoSession | null = null;
  sidebarOpen   = true;
  currentRoute  = '';
  isMobile      = false;

  readonly navItems: NavItem[] = [
    {
      icon:     '🩺',
      label:    'Atención Médica',
      sublabel: 'Asistente AI con contexto clínico',
      route:    '/dashboard/atencion'
    },
    {
      icon:     '💰',
      label:    'Costos de Procedimientos',
      sublabel: 'Análisis de costos en notas médicas',
      route:    '/dashboard/costos'
    }
  ];

  readonly especialidadLabels: Record<string, string> = {
    MED_GEN:        '🩺 Medicina General',
    MED_FAM:        '🩺 Medicina Familiar',
    MED_INT:        '🩺 Medicina Interna',
    PEDIATRIA:      '👶 Pediatría',
    GINECOOBST:     '🌸 Ginecología y Obstetricia',
    CIRUGIA_GEN:    '🔪 Cirugía General',
    TRAUMATOLOGIA:  '🦴 Traumatología y Ortopedia',
    CARDIOLOGIA:    '❤️ Cardiología',
    NEUROLOGIA:     '🧠 Neurología',
    PSIQUIATRIA:    '🧩 Psiquiatría',
    DERMATOLOGIA:   '🫧 Dermatología',
    OFTALMOLOGIA:   '👁️ Oftalmología',
    OTORRINOL:      '👂 Otorrinolaringología',
    ENDOCRINOL:     '🧬 Endocrinología',
    NEUMOLOGIA:     '🫁 Neumología',
    GASTROENT:      '🫃 Gastroenterología',
    ONCOLOGIA:      '🎗️ Oncología Médica',
    URGENCIAS:      '🚨 Medicina de Urgencias',
    ANESTESIOLOGIA: '💉 Anestesiología',
    RADIOLOGIA:     '🔬 Radiología e Imagen',
  };

  constructor(private auth: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.session      = this.auth.getSession();
    this.currentRoute = this.router.url;
    this.checkMobile();

    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        this.currentRoute = e.urlAfterRedirects;
        if (this.isMobile) this.sidebarOpen = false;
      });
  }

  @HostListener('window:resize')
  checkMobile(): void {
    this.isMobile = window.innerWidth < 900;
    if (this.isMobile) this.sidebarOpen = false;
    else               this.sidebarOpen = true;
  }

  toggleSidebar(): void { this.sidebarOpen = !this.sidebarOpen; }
  closeSidebarMobile(): void { if (this.isMobile) this.sidebarOpen = false; }

  isActive(route: string): boolean {
    return this.currentRoute.startsWith(route);
  }

  getEspecialidadLabel(key?: string): string {
    if (!key) return '';
    return this.especialidadLabels[key] ?? key;
  }

  logout(): void { this.auth.logout(); }
}
