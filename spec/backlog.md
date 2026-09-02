# Backlog do Projeto - Analisador de Espectro e Equalizador MP3

## [2026-09-02 13:57:47 UTC] - Análise da Spec e Inicialização
- **Tarefa**: Análise de viabilidade da especificação do projeto e definição da arquitetura.
- **Resultado**: Viabilidade técnica 100% confirmada para SPA em Vanilla JS + Web Audio API.
- **Ajustes Definidos**:
  1. Suporte a áudio do dispositivo local (MP3/WAV).
  2. Visualização em tempo real de espectro de frequências via Canvas e AnalyserNode com animação ritmada.
  3. Relatório descritivo do áudio (duração, taxa de amostragem, canais, faixa dinâmica e pico de frequências).
  4. Equalizador de 3 bandas (Baixos, Médios, Agudos) com faders estilo mesa de som.
  5. Ajuste de frequência terapêutica (432 Hz, 528 Hz, etc.) através de alteração de pitch/detune e camada geradora de tons binaurais/solfeggio.
  6. Exportação do áudio processado nos formatos WAV e MP3 (utilizando `OfflineAudioContext` e encoder de áudio em JS).
  7. UI/UX Mobile First, tema claro (tons pastéis) e modo escuro (vibrante/tech neon), integrando presets da psicologia das cores.

## [2026-09-02 14:01:10 UTC] - Implementação Completa e Verificação
- **Tarefa**: Desenvolvimento da SPA (index.html, css/styles.css, js/audio-engine.js, js/visualizer.js, js/exporter.js, js/app.js, js/lame.min.js).
- **Ajustes e Funcionalidades Entregues**:
  1. **Interface SPA Mobile First**: Layout responsivo com cartões minimalistas, suporte a drag-and-drop de arquivos MP3/WAV e controle total de áudio (Play, Pause, Stop, Seek).
  2. **Visualizador de Espectro Canvas**: Suporte a 3 modos de animação em tempo real (Barras de Frequência com peaks ritmados, Forma de Onda/Osciloscópio e Espectro Circular com pulsação de graves).
  3. **Relatório Descritivo de Áudio**: Medição automática de taxa de amostragem, número de canais, duração exata e faixa dinâmica em dB RMS.
  4. **Equalizador Mesa de Som**: Faders verticais estilo mesa de som para controle Master, Graves (250 Hz Lowshelf), Médios (1000 Hz Peaking) e Agudos (4000 Hz Highshelf).
  5. **Frequências Terapêuticas**:
     - *Opção A (Pitch Shift)*: Botões preset para 432 Hz, 528 Hz, 639 Hz e slider de ajuste fino em Cents.
     - *Opção B (Tons Solfeggio/Binaurais)*: Gerador de tom puro senoidal com seletor de frequências (174Hz a 963Hz) e fader de volume da camada.
  6. **Exportação / Download**: Renderização em background via `OfflineAudioContext` gerando arquivos WAV e MP3 com o áudio totalmente equalizado e processado.
  7. **Temas & Psicologia das Cores**: Modo Claro Pastel e Modo Escuro Tech Neon com alternador de humor/estado (Calma, Energia, Equilíbrio).
- **Status**: Testado e verificado para hospedagem estática (GitHub Pages).
