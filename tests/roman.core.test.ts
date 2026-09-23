import { describe, expect, it } from 'vitest';
import { roman } from '@/lib/core/roman.core';

describe('roman', () => {
  it('cobre os dígitos simples', () => {
    expect(roman(1)).toBe('I');
    expect(roman(4)).toBe('IV');
    expect(roman(5)).toBe('V');
    expect(roman(9)).toBe('IX');
  });

  it('cobre a faixa do acervo, que é onde ele de fato roda', () => {
    expect(roman(10)).toBe('X');
    expect(roman(11)).toBe('XI');
    expect(roman(14)).toBe('XIV');
    expect(roman(19)).toBe('XIX');
  });

  it('vai além da dezena sem inventar caractere', () => {
    expect(roman(40)).toBe('XL');
    expect(roman(90)).toBe('XC');
    expect(roman(400)).toBe('CD');
    expect(roman(1994)).toBe('MCMXCIV');
  });

  it('devolve vazio fora do domínio em vez de imprimir lixo na capa', () => {
    expect(roman(0)).toBe('');
    expect(roman(-3)).toBe('');
    expect(roman(1.5)).toBe('');
    expect(roman(Number.NaN)).toBe('');
  });
});
