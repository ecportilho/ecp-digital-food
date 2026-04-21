import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Wrapper sobre a Web Speech API (SpeechRecognition) para ditar comandos em
 * pt-BR no chat do ECP Food.
 *
 * Nativa do browser — nao requer chaves nem API externa paga. Funciona em
 * Chrome/Edge e Safari desktop recentes. Para browsers sem suporte (Firefox
 * atual), `supported` fica false e callers escondem o botao de microfone.
 */

function getRecognitionCtor() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function useSpeechRecognition(lang = 'pt-BR') {
  const [supported] = useState(() => getRecognitionCtor() !== null);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return undefined;

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onstart = () => {
      setListening(true);
      setError(null);
    };

    recognition.onresult = (event) => {
      let finalPiece = '';
      let interimPiece = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        if (result.isFinal) finalPiece += text;
        else interimPiece += text;
      }
      if (finalPiece) {
        setTranscript((prev) => (prev ? prev + ' ' + finalPiece.trim() : finalPiece.trim()));
      }
      setInterimTranscript(interimPiece.trim());
    };

    recognition.onerror = (event) => {
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setError('Permissao de microfone negada. Habilite nas configuracoes do site.');
      } else if (event.error === 'network') {
        setError('Sem conexao para transcricao de voz.');
      } else {
        setError('Erro no reconhecimento: ' + event.error);
      }
    };

    recognition.onend = () => {
      setListening(false);
      setInterimTranscript('');
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    };
  }, [lang]);

  const start = useCallback(() => {
    if (!recognitionRef.current) return;
    setError(null);
    setTranscript('');
    setInterimTranscript('');
    try {
      recognitionRef.current.start();
    } catch (err) {
      if (err instanceof Error && err.message.includes('already started')) return;
      setError('Nao foi possivel iniciar a gravacao.');
    }
  }, []);

  const stop = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch {
      // ignore
    }
  }, []);

  const reset = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  return { supported, listening, transcript, interimTranscript, error, start, stop, reset };
}

export default useSpeechRecognition;
