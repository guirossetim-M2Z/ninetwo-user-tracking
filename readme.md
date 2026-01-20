Perfeito. Vamos evoluir o componente `TrackView` para suportar essa lógica de **"Read Confirmation"** (Confirmação de Leitura).

A lógica será:

1. Quando o elemento entra na tela: Dispara o evento de **View** (imediato) e inicia um **Timer** de 5 segundos.
2. Se o usuário sair da tela antes dos 5s: O timer é cancelado.
3. Se o usuário ficar 5s: Dispara o evento `_read_confirmation`.

### 1. Código Atualizado: `src/components/TrackView.tsx`

Substitua o arquivo atual por este novo código. Adicionei uma prop opcional `readTime` (padrão 5000ms) caso você queira customizar esse tempo no futuro.

```tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { pushToDataLayer } from '../utils/gtm';

interface TrackViewProps {
  children: React.ReactNode;
  eventName: string;
  category?: string;
  label?: string;
  threshold?: number;
  readTime?: number; // Tempo em ms para confirmar leitura (Default: 5000)
}

export const TrackView: React.FC<TrackViewProps> = ({ 
  children, 
  eventName, 
  category, 
  label, 
  threshold = 0.5,
  readTime = 5000 
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Estados para garantir que dispare apenas uma vez por carregamento de página
  const [hasTriggeredView, setHasTriggeredView] = useState(false);
  const [hasTriggeredRead, setHasTriggeredRead] = useState(false);

  useEffect(() => {
    if (!ref.current) return;

    // Se ambos já foram disparados, desliga o observer para economizar recurso
    if (hasTriggeredView && hasTriggeredRead) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // 1. Disparo imediato de Visualização (VIEW)
          if (!hasTriggeredView) {
            pushToDataLayer({
              event: eventName,
              category,
              label,
              type: 'view',
            });
            setHasTriggeredView(true);
          }

          // 2. Inicia contagem para Confirmação de Leitura (READ CONFIRMATION)
          if (!hasTriggeredRead && !timerRef.current) {
            timerRef.current = setTimeout(() => {
              pushToDataLayer({
                event: `${eventName}`, // Sufixo solicitado
                category,
                label,
                type: 'read_confirmation', // Tipo diferenciado
              });
              setHasTriggeredRead(true);
            }, readTime);
          }

        } else {
          // Se o usuário saiu da tela antes do tempo, cancela a confirmação
          if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
          }
        }
      },
      { threshold }
    );

    observer.observe(ref.current);

    return () => {
      observer.disconnect();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [hasTriggeredView, hasTriggeredRead, eventName, category, label, threshold, readTime]);

  return <div ref={ref} style={{ display: 'contents' }}>{children}</div>;
};

```

---

### 2. Atualizar o Build

Como alteramos a lógica do componente, não esqueça de rodar o build novamente na pasta do pacote:

```bash
npm run build

```

---

### 3. Documentação Atualizada (README.md)

Aqui está o **README.md** completo e atualizado com a nova funcionalidade de Confirmação de Leitura documentada.

Pode clicar em "Copy" e substituir o seu arquivo atual.

```markdown
# NineTwo User Tracking

Pacote de abstração de Analytics para React e Next.js.
Facilita a implementação do **Google Tag Manager (GTM)** utilizando **Delegação de Eventos** para cliques (via atributos HTML) e **Intersection Observer** para visualizações e confirmação de leitura.

## ✨ Funcionalidades

- 🚀 **Zero Boilerplate:** Rastreamento declarativo via atributos `data-nt-ut-*`.
- 🖱️ **Click Tracking Automático:** Listener global que captura cliques.
- 👁️ **View Tracking:** Dispara evento ao visualizar elemento.
- 📖 **Read Confirmation:** Dispara evento secundário automaticamente após 5s de visualização contínua.
- 💉 **GTM Injection:** Injeção segura do script do GTM.
- ⚡ **Next.js Ready:** Compatível com App Router (Providers Pattern).

---

## 📦 Instalação

```bash
npm install ninetwo_user_tracking

```

---

## 🚀 Configuração (Next.js 13+ App Router)

### 1. Crie o componente `app/providers.tsx`

```tsx
'use client';

import { TrackingProvider } from 'ninetwo_user_tracking';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TrackingProvider 
      gtmId="GTM-SEU-ID-AQUI" 
      debug={process.env.NODE_ENV === 'development'} 
    >
      {children}
    </TrackingProvider>
  );
}

```

### 2. Envolva o `app/layout.tsx`

```tsx
import { Providers } from "./providers";
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

```

---

## 🖱️ Rastreamento de Cliques (Click)

Adicione os atributos `data-nt-ut-*` ao elemento interativo.

```tsx
<button
  className="btn-primary"
  data-nt-ut-event="add_to_cart"
  data-nt-ut-category="ecommerce"
  data-nt-ut-label="tenis_nike_v2"
  data-nt-ut-type="click" // Opcional (default: click)
>
  Comprar Agora
</button>

```

---

## 👁️ Rastreamento de Visualização e Leitura (View/Read)

Use o componente `<TrackView>` para monitorar impressões.
**Novidade:** Se o usuário permanecer com o elemento visível por 5 segundos (padrão), um segundo evento `_read_confirmation` será disparado.

```tsx
import { TrackView } from 'ninetwo_user_tracking';

export default function BlogPost() {
  return (
    <TrackView 
      eventName="article_view" 
      category="blog" 
      label="como_aprender_react"
      threshold={0.5} // 50% visível para disparar
      readTime={5000} // (Opcional) Tempo em ms para confirmar leitura
    >
      <article>
        <h1>Como aprender React</h1>
        <p>Conteúdo do artigo...</p>
      </article>
    </TrackView>
  );
}

```

### Comportamento dos Eventos

Neste exemplo acima, dois eventos serão enviados ao DataLayer:

1. **Assim que aparecer:**
* event: `"article_view"`
* type: `"view"`


2. **Após 5 segundos visível:**
* event: `"article_view_read_confirmation"`
* type: `"read_confirmation"`



---

## ⚙️ Configuração no GTM

O pacote envia os dados para `window.dataLayer`.

### Exemplo de Objeto Enviado (Read Confirmation)

```javascript
{
  event: "article_view_read_confirmation",
  event_category: "blog",
  event_label: "como_aprender_react",
  event_type: "read_confirmation",
  interaction_time: "..."
}

```

### Configuração Recomendada

1. **Variáveis:** Crie variáveis de DataLayer para `event_category`, `event_label` e `event_type`.
2. **Trigger:** Use `.*` (Regex) em Evento Personalizado para capturar tudo.
3. **Tag GA4:** Mapeie os parâmetros. No GA4, você poderá filtrar eventos onde `type` é igual a `read_confirmation` para medir engajamento real.

---

## License

ISC © NineTwo

```

```