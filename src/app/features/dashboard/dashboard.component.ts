import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { PacienteService } from '../../core/services/paciente.service';
import { ImssAiService } from '../../core/services/imss-ai.service';
import { Paciente } from '../../core/models/paciente.model';
import { ChatMessage, ImssAiChatResponse, ProcedimientoDetectado } from '../../core/models/chat.model';
import { MedicoSession } from '../../core/models/auth.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, DatePipe],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, AfterViewChecked {

  @ViewChild('chatContainer') chatContainer!: ElementRef;

  session:      MedicoSession | null        = null;
  paciente:     Paciente | null             = null;
  curpInput   = '';
  searchLoading = false;
  searchError   = '';

  messages:     ChatMessage[]               = [];
  promptInput = '';
  aiLoading     = false;
  lastResponse: Partial<ImssAiChatResponse> = {};
  private shouldScroll = false;

  // ── NOTA MÉDICA
  notaArchivo:     File | null = null;
  notaTexto        = '';
  notaPalabras     = 0;
  notaLoading      = false;
  notaError        = '';
  isDragging       = false;
  fechaIngreso     = '';
  fechaEgreso      = '';
  notaPanelAbierto = false;

  // Quick prompts con paciente
  readonly quickPromptsConPaciente = [
    { icon: '🔍', label: 'Síntomas a vigilar',
      text: '¿Cuáles son los síntomas que debo vigilar en este paciente según sus antecedentes?' },
    { icon: '💊', label: 'Medicamentos seguros',
      text: '¿Qué medicamentos son seguros para este paciente tomando en cuenta sus alergias?' },
    { icon: '🧪', label: 'Estudios de lab',
      text: '¿Qué estudios de laboratorio recomiendas ordenar para este paciente?' },
    { icon: '📋', label: 'Resumen clínico',
      text: 'Genera un resumen clínico completo del paciente con base en su historial.' },
    { icon: '⚠️', label: 'Factores de riesgo',
      text: '¿Cuáles son los factores de riesgo más relevantes de este paciente?' },
    { icon: '💉', label: 'Vacunas pendientes',
      text: '¿Qué vacunas pudieran estar pendientes según el esquema de vacunación 2024?' },
  ];

  // Quick prompts generales (sin paciente)
  readonly quickPromptsGenerales = [
    { icon: '📖', label: 'Criterios diagnósticos',
      text: '¿Cuáles son los criterios diagnósticos más importantes en mi especialidad?' },
    { icon: '💊', label: 'Cuadro Básico IMSS',
      text: '¿Qué medicamentos del Cuadro Básico IMSS son más relevantes en mi especialidad?' },
    { icon: '📋', label: 'Guías de práctica',
      text: '¿Cuáles son las principales guías de práctica clínica del CENETEC para mi especialidad?' },
    { icon: '⚠️', label: 'Signos de alarma',
      text: '¿Cuáles son los principales signos de alarma que debo identificar en mi especialidad?' },
  ];

  readonly especialidadLabels: Record<string, string> = {
    MED_GEN:       '🩺 Medicina General',
    MED_FAM:       '🩺 Medicina Familiar',
    MED_INT:       '🩺 Medicina Interna',
    PEDIATRIA:     '👶 Pediatría',
    GINECOOBST:    '🌸 Ginecología y Obstetricia',
    CIRUGIA_GEN:   '🔪 Cirugía General',
    TRAUMATOLOGIA: '🦴 Traumatología y Ortopedia',
    CARDIOLOGIA:   '❤️ Cardiología',
    NEUROLOGIA:    '🧠 Neurología',
    PSIQUIATRIA:   '🧩 Psiquiatría',
    DERMATOLOGIA:  '🫧 Dermatología',
    OFTALMOLOGIA:  '👁️ Oftalmología',
    OTORRINOL:     '👂 Otorrinolaringología',
    ENDOCRINOL:    '🧬 Endocrinología',
    NEUMOLOGIA:    '🫁 Neumología',
    GASTROENT:     '🫃 Gastroenterología',
    ONCOLOGIA:     '🎗️ Oncología Médica',
    URGENCIAS:     '🚨 Medicina de Urgencias',
    ANESTESIOLOGIA:'💉 Anestesiología',
    RADIOLOGIA:    '🔬 Radiología e Imagen',
  };

  constructor(
    private auth:            AuthService,
    private pacienteService: PacienteService,
    private aiService:       ImssAiService,
    private cdr:             ChangeDetectorRef
  ) {}

  ngOnInit(): void { this.session = this.auth.getSession(); }

  ngAfterViewChecked(): void {
    if (this.shouldScroll && this.chatContainer) {
      const el = this.chatContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
      this.shouldScroll = false;
    }
  }

  logout(): void { this.auth.logout(); }

  // ── BÚSQUEDA
  buscarPaciente(): void {
    const curp = this.curpInput.trim().toUpperCase();
    if (!curp) return;
    this.searchLoading = true;
    this.searchError   = '';
    this.paciente      = null;

    this.pacienteService.buscarPorCurp(curp).subscribe({
      next:  p   => { this.paciente = p; this.searchLoading = false; },
      error: err => { this.searchError = err.message; this.searchLoading = false; }
    });
  }

  limpiarBusqueda(): void {
    this.curpInput   = '';
    this.paciente    = null;
    this.searchError = '';
  }

  onCurpKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter') this.buscarPaciente();
  }

  // ── CHAT
  sendMessage(): void {
    const text = this.promptInput.trim();
    if (!text || this.aiLoading) return;

    this.messages.push({
      id:           this.genId(),
      role:         'user',
      text,
      timestamp:    new Date(),
      modoGeneral:  !this.paciente
    });

    this.promptInput  = '';
    this.aiLoading    = true;
    this.shouldScroll = true;

    const nota = this.notaContext;
    console.log('[IMSS AI] sendMessage — nota context:', {
      tieneNota:     !!nota.notaMedica,
      chars:         nota.notaMedica?.length ?? 0,
      fechaIngreso:  nota.fechaIngreso,
      fechaEgreso:   nota.fechaEgreso,
    });

    const request$ = this.paciente
      ? this.aiService.chatConContexto(text, this.paciente, nota)
      : this.aiService.chatGeneral(text, nota);

    request$.subscribe({
      next: (res: ImssAiChatResponse) => {
        this.messages.push({
          id:                       this.genId(),
          role:                     'ai',
          text:                     res.respuesta,
          timestamp:                new Date(),
          tokensPerSecond:          res.tokensPerSecond,
          totalTokens:              res.totalOutputTokens,
          especialidad:             res.especialidadDetectada,
          modoGeneral:              !this.paciente,
          procedimientosDetectados: res.procedimientosDetectados?.length
                                    ? res.procedimientosDetectados : undefined
        });
        this.lastResponse = res;
        this.aiLoading    = false;
        this.shouldScroll = true;
      },
      error: err => {
        this.messages.push({
          id:        this.genId(),
          role:      'ai',
          text:      `⚠️ Error al conectar con el modelo.\n\nVerifica que LM Studio esté corriendo en localhost:1234.\n\n\`${err.message}\``,
          timestamp: new Date()
        });
        this.aiLoading    = false;
        this.shouldScroll = true;
      }
    });
  }

  useQuickPrompt(text: string): void {
    this.promptInput = text;
    this.sendMessage();
  }

  onPromptKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendMessage(); }
  }

  autoResize(e: Event): void {
    const el = e.target as HTMLTextAreaElement;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }

  formatMessage(text: string): string {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g,     '<em>$1</em>')
      .replace(/`(.*?)`/g,       '<code>$1</code>')
      .replace(/⚠️(.*?):/g,      '<span class="alert-label">⚠️$1:</span>')
      .replace(/\n/g,            '<br>');
  }

  getEspecialidadLabel(key?: string): string {
    if (!key) return '';
    return this.especialidadLabels[key] ?? key;
  }

  get quickPrompts() {
    return this.paciente ? this.quickPromptsConPaciente : this.quickPromptsGenerales;
  }

  // ── NOTA MÉDICA
  onDragOver(e: DragEvent): void  { e.preventDefault(); this.isDragging = true; }
  onDragLeave(): void             { this.isDragging = false; }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.isDragging = false;
    const file = e.dataTransfer?.files[0];
    if (file) this.processFile(file);
  }

  onFileChange(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) this.processFile(file);
    (e.target as HTMLInputElement).value = '';
  }

  async processFile(file: File): Promise<void> {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'doc', 'docx'].includes(ext ?? '')) return;

    this.notaArchivo = file;
    this.notaLoading = true;
    this.notaError   = '';
    this.notaTexto   = '';
    this.cdr.detectChanges();

    try {
      if (ext === 'docx' || ext === 'doc') {
        const mammoth  = await import('mammoth');
        const buffer   = await file.arrayBuffer();
        const result   = await mammoth.extractRawText({ arrayBuffer: buffer });
        this.notaTexto = result.value;
      } else {
        this.notaTexto = await this.extractPdfText(file);
      }

      this.notaPalabras = this.notaTexto.trim().split(/\s+/).filter(w => w).length;

      if (!this.notaTexto.trim()) {
        this.notaError = 'No se pudo extraer texto del archivo. Verifica que no sea una imagen escaneada.';
      }
    } catch (err: any) {
      console.error('[IMSS AI] Error extrayendo texto:', err);
      this.notaTexto    = '';
      this.notaPalabras = 0;
      this.notaError    = `Error al procesar el archivo: ${err?.message ?? 'desconocido'}`;
    }

    this.notaLoading = false;
    this.cdr.detectChanges();
  }

  limpiarNota(): void {
    this.notaArchivo  = null;
    this.notaTexto    = '';
    this.notaPalabras = 0;
  }

  get notaActiva(): boolean {
    return !!(this.notaTexto || this.fechaIngreso || this.fechaEgreso);
  }

  get notaContext() {
    return {
      notaMedica:   this.notaTexto    || undefined,
      fechaIngreso: this.fechaIngreso || undefined,
      fechaEgreso:  this.fechaEgreso  || undefined,
    };
  }

  private async extractPdfText(file: File): Promise<string> {
    const pdfjs = await import('pdfjs-dist');

    // URL absoluta para que funcione independientemente del path base
    pdfjs.GlobalWorkerOptions.workerSrc =
      `${window.location.origin}/pdf.worker.min.mjs`;

    const buffer = await file.arrayBuffer();
    const pdf    = await pdfjs.getDocument({
      data:           new Uint8Array(buffer),
      useWorkerFetch: false,
    }).promise;

    console.log(`[IMSS AI] PDF cargado — páginas: ${pdf.numPages}`);

    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page    = await pdf.getPage(i);
      const content = await page.getTextContent();
      const text    = content.items
        .map((item: any) => ('str' in item ? item.str : ''))
        .join(' ');
      pages.push(text);
    }

    const result = pages.join('\n').trim();
    console.log(`[IMSS AI] Texto extraído — ${result.length} chars`);
    return result;
  }

  formatPeso(val: number | null): string {
    if (val === null || val === undefined) return '—';
    return '$' + val.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  trackById(_: number, msg: ChatMessage): string { return msg.id; }
  private genId(): string { return Math.random().toString(36).substring(2); }
}
