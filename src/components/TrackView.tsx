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
                event: `${eventName}_read_confirmation`, // Sufixo solicitado
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