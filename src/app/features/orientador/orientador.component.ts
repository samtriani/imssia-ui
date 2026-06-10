import { Component, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrientadorService } from '../../core/services/orientador.service';
import { OrientadorChatResponse } from '../../core/models/orientador.model';
import { ChatMessage } from '../../core/models/chat.model';

@Component({
  selector: 'app-orientador',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, DatePipe],
  templateUrl: './orientador.component.html',
  styleUrls: ['./orientador.component.scss']
})
export class OrientadorComponent implements AfterViewChecked {

  @ViewChild('chatContainer') chatContainer!: ElementRef;

  messages:     ChatMessage[]                   = [];
  promptInput = '';
  aiLoading     = false;
  lastResponse: Partial<OrientadorChatResponse> = {};
  private shouldScroll = false;

  readonly quickPrompts = [
    { icon: '🔑', label: 'Iniciar sesión',
      text: '¿Cómo inicio sesión en ECSUS?' },
    { icon: '🔍', label: 'Buscar paciente',
      text: '¿Cómo busco un paciente en ECSUS?' },
    { icon: '📅', label: 'Agendar cita',
      text: '¿Cómo agendo una cita para un paciente?' },
    { icon: '📝', label: 'Nota médica',
      text: '¿Cómo lleno la nota médica?' },
    { icon: '🧪', label: 'Solicitar laboratorio',
      text: '¿Cómo solicito un estudio de laboratorio?' },
  ];

  constructor(private orientadorService: OrientadorService) {}

  ngAfterViewChecked(): void {
    if (this.shouldScroll && this.chatContainer) {
      const el = this.chatContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
      this.shouldScroll = false;
    }
  }

  sendMessage(): void {
    const text = this.promptInput.trim();
    if (!text || this.aiLoading) return;

    this.messages.push({
      id:        this.genId(),
      role:      'user',
      text,
      timestamp: new Date()
    });

    this.promptInput  = '';
    this.aiLoading    = true;
    this.shouldScroll = true;

    this.orientadorService.chat(text).subscribe({
      next: (res: OrientadorChatResponse) => {
        this.messages.push({
          id:              this.genId(),
          role:            'ai',
          text:            res.respuesta,
          timestamp:       new Date(),
          tokensPerSecond: res.tokensPerSecond,
          totalTokens:     res.totalOutputTokens,
          imagenes:        res.imagenesRelacionadas?.length ? res.imagenesRelacionadas : undefined
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
      .replace(/\n/g,            '<br>');
  }

  trackById(_: number, msg: ChatMessage): string { return msg.id; }
  private genId(): string { return Math.random().toString(36).substring(2); }
}
