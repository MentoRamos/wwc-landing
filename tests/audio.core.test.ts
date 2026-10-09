import { describe, expect, it } from 'vitest';
import {
  AUDIO_BUCKET,
  audioExtension,
  audioLength,
  audioMimeType,
  audioObjectPath,
  audioPublicUrl,
  audioSeconds,
  clock,
  publishableAudio,
} from '@/lib/core/audio.core';

describe('audioExtension', () => {
  it('aceita o que o bucket aceita', () => {
    expect(audioExtension('audio/ogg')).toBe('ogg');
    expect(audioExtension('audio/mpeg')).toBe('mp3');
  });

  it('ignora o parâmetro que o ffmpeg e o curl mandam', () => {
    expect(audioExtension('audio/ogg; codecs=opus')).toBe('ogg');
    expect(audioExtension('AUDIO/OGG')).toBe('ogg');
  });

  it('recusa o que o navegador não toca, e a falta do cabeçalho', () => {
    expect(audioExtension('audio/wav')).toBeNull();
    expect(audioExtension('application/json')).toBeNull();
    expect(audioExtension(null)).toBeNull();
    expect(audioExtension('')).toBeNull();
  });
});

describe('audioObjectPath', () => {
  const digest = 'AB12CD34EF567890';

  it('carrega a impressão digital do conteúdo, para o cache de um ano ser seguro', () => {
    expect(audioObjectPath('omega-3-fibrilacao', 'ogg', digest)).toBe(
      'omega-3-fibrilacao-ab12cd34.ogg',
    );
  });

  it('muda de nome quando o áudio muda, e repete quando o áudio é o mesmo', () => {
    const antes = audioObjectPath('x', 'ogg', 'aaaaaaaa11');
    const depois = audioObjectPath('x', 'ogg', 'bbbbbbbb22');
    expect(antes).not.toBe(depois);
    expect(audioObjectPath('x', 'ogg', 'aaaaaaaa11')).toBe(antes);
  });

  it('cabe no `check` da coluna audio_path', () => {
    const path = audioObjectPath('um-artigo-de-slug-longo', 'mp3', digest);
    expect(path).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*\.(ogg|mp3)$/);
    expect(path.length).toBeLessThanOrEqual(110);
  });
});

describe('audioPublicUrl', () => {
  it('monta o endereço público do bucket', () => {
    expect(audioPublicUrl('https://abc.supabase.co', 'x-1234abcd.ogg')).toBe(
      `https://abc.supabase.co/storage/v1/object/public/${AUDIO_BUCKET}/x-1234abcd.ogg`,
    );
  });

  it('não gera barra dobrada quando a variável termina em barra', () => {
    const url = audioPublicUrl('https://abc.supabase.co/', 'x-1234abcd.ogg');
    expect(url).not.toContain('.co//');
    expect(url).toContain('/storage/v1/object/public/');
  });
});

describe('audioSeconds', () => {
  it('lê o número declarado por quem subiu', () => {
    expect(audioSeconds('604')).toBe(604);
    expect(audioSeconds(' 604.6 ')).toBe(605);
  });

  it('descarta em silêncio o que não serve: a duração é só enfeite de tela', () => {
    expect(audioSeconds(null)).toBeNull();
    expect(audioSeconds('')).toBeNull();
    expect(audioSeconds('dez minutos')).toBeNull();
    expect(audioSeconds('-5')).toBeNull();
    expect(audioSeconds('0')).toBeNull();
    // Milissegundos mandados como segundos: além do teto da coluna.
    expect(audioSeconds('604000')).toBeNull();
  });
});

describe('clock', () => {
  it('escreve minuto e segundo, com hora só quando passa de uma', () => {
    expect(clock(0)).toBe('0:00');
    expect(clock(9.7)).toBe('0:09');
    expect(clock(544)).toBe('9:04');
    expect(clock(3723)).toBe('1:02:03');
  });

  it('não escreve tempo negativo quando o navegador devolve NaN ou -0', () => {
    expect(clock(-3)).toBe('0:00');
  });
});

describe('audioLength', () => {
  it('diz os minutos antes de alguém baixar 3 MB', () => {
    expect(audioLength(604)).toBe('10 min');
    expect(audioLength(20)).toBe('1 min');
  });

  it('não diz nada quando não sabe', () => {
    expect(audioLength(null)).toBeNull();
    expect(audioLength(0)).toBeNull();
  });
});

describe('audioMimeType', () => {
  it('devolve os dois tipos declarados no bucket', () => {
    expect(audioMimeType('ogg')).toBe('audio/ogg');
    expect(audioMimeType('mp3')).toBe('audio/mpeg');
  });
});

describe('publishableAudio', () => {
  it('só MP3 vira áudio do artigo: ogg tira o episódio do feed do Spotify', () => {
    expect(publishableAudio('mp3')).toBe(true);
    expect(publishableAudio('ogg')).toBe(false);
    expect(publishableAudio('wav')).toBe(false);
    expect(publishableAudio('')).toBe(false);
  });
});
