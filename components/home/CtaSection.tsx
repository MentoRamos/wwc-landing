'use client';

import Image from 'next/image';
import { useState, useRef, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollReveal } from '@/components/animations/ScrollReveal';
import { WHATSAPP_NUMBER, WHATSAPP_MESSAGE } from '@/lib/constants';

type Status = 'idle' | 'loading' | 'success' | 'error';

const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];

// Particle burst for success state
function ParticleBurst() {
  const particles = Array.from({ length: 12 }, (_, i) => i);
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
      {particles.map((i) => {
        const angle = (i / 12) * 360;
        const rad = (angle * Math.PI) / 180;
        const tx = Math.cos(rad) * 80;
        const ty = Math.sin(rad) * 80;
        return (
          <motion.div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full bg-[#C9A84C]"
            initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
            animate={{ x: tx, y: ty, scale: [0, 1.2, 0], opacity: [1, 1, 0] }}
            transition={{ duration: 0.8, delay: 0.1 + i * 0.03, ease: 'easeOut' }}
          />
        );
      })}
    </div>
  );
}

// Floating label input
function FloatingInput({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  required?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const floated = focused || value.length > 0;

  return (
    <div className="relative">
      <motion.label
        htmlFor={id}
        className="absolute left-4 pointer-events-none text-[var(--text-3)] origin-left"
        animate={{
          top: floated ? '6px' : '50%',
          y: floated ? '0%' : '-50%',
          fontSize: floated ? '9px' : '12px',
          letterSpacing: floated ? '0.18em' : '0.12em',
          color: focused ? '#C9A84C' : undefined,
        }}
        transition={{ duration: 0.22, ease }}
        style={{ textTransform: 'uppercase' }}
      >
        {label}
      </motion.label>
      <input
        id={id}
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={floated ? placeholder : ''}
        className="w-full bg-[var(--bg)] border px-4 pt-6 pb-2.5 text-[var(--text-1)] text-sm placeholder:text-[var(--text-4)] focus:outline-none transition-all duration-300 h-[58px]"
        style={{
          borderColor: focused ? '#C9A84C' : 'var(--border)',
          boxShadow: focused
            ? '0 0 0 1px #C9A84C40, 0 0 12px #C9A84C18'
            : 'none',
        }}
      />
    </div>
  );
}

// Loading spinner
function Spinner() {
  return (
    <motion.svg
      className="w-4 h-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      animate={{ rotate: 360 }}
      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
    >
      <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
    </motion.svg>
  );
}

export function CtaSection() {
  const [status, setStatus] = useState<Status>('idle');
  const [form, setForm] = useState({ name: '', email: '', whatsapp: '' });
  const [showBurst, setShowBurst] = useState(false);

  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus('loading');

    try {
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error('Erro ao salvar');
      setShowBurst(true);
      setTimeout(() => setShowBurst(false), 1000);
      setStatus('success');
    } catch {
      setStatus('error');
    }
  }

  return (
    <section id="interesse" className="py-24 md:py-36 border-t border-[var(--border)] relative overflow-hidden">
      {/* Background — event networking, blended */}
      <div className="absolute inset-0">
        <Image src="/photos/networking.jpg" alt="" fill sizes="100vw" className="object-cover opacity-[0.04]" quality={40} />
        <div className="absolute inset-0 bg-[var(--bg)]/92" />
      </div>

      <div className="container-lp relative z-10">
        <div className="grid md:grid-cols-2 gap-12 md:gap-20">
          {/* Left — copy */}
          <div>
            <ScrollReveal>
              <p className="text-[10px] tracking-[0.3em] uppercase text-[var(--accent)] mb-6 flex items-center gap-3">
                <span className="inline-block w-10 h-px bg-[var(--accent)]" />
                Interesse
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.1}>
              <h2 className="font-display text-3xl md:text-5xl leading-[1] tracking-[-0.03em] mb-8">
                Seja o primeiro{' '}
                <em className="italic text-[var(--accent)]">a saber.</em>
              </h2>
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              <p className="text-[var(--text-2)] text-base leading-[1.8] mb-8">
                Cadastre-se na lista de interesse da 2ª edição do Wealth & Wellness Connect.
                Você será notificado em primeira mão sobre data, local e como garantir sua vaga.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.3}>
              <div className="space-y-4">
                {[
                  'Notificação antecipada sobre a 2ª edição',
                  'Acesso prioritário às vagas limitadas',
                  'Conteúdo exclusivo sobre saúde e performance',
                ].map((benefit) => (
                  <div key={benefit} className="flex gap-3 items-start">
                    <span className="text-[var(--accent)] mt-0.5 shrink-0">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
                        <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <span className="text-[var(--text-3)] text-sm">{benefit}</span>
                  </div>
                ))}
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.4}>
              <div className="mt-10 pt-8 border-t border-[var(--border)]">
                <p className="text-[var(--text-4)] text-xs mb-3">Prefere falar direto?</p>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 text-[#25D366] text-sm hover:underline"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Conversar no WhatsApp
                </a>
              </div>
            </ScrollReveal>
          </div>

          {/* Right — form */}
          <ScrollReveal delay={0.15}>
            <div className="bg-[var(--bg-card)] border border-[var(--border)] p-8 md:p-10">
              <AnimatePresence mode="wait">
                {status === 'success' ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.5, ease }}
                    className="relative flex flex-col items-center justify-center min-h-[300px] text-center"
                  >
                    {showBurst && <ParticleBurst />}

                    <motion.div
                      className="w-20 h-20 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/30 flex items-center justify-center mb-6 relative"
                      initial={{ scale: 0 }}
                      animate={{ scale: [0, 1.15, 1] }}
                      transition={{ duration: 0.6, ease }}
                    >
                      {/* Outer ring pulse */}
                      <motion.div
                        className="absolute inset-0 rounded-full border border-[var(--accent)]/40"
                        animate={{ scale: [1, 1.5], opacity: [0.6, 0] }}
                        transition={{ duration: 1.2, repeat: 2, ease: 'easeOut' }}
                      />
                      <motion.svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--accent)"
                        strokeWidth="2"
                        className="w-9 h-9"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.3, ease: 'easeOut' }}
                      >
                        <motion.path
                          d="M5 12l5 5L20 7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.5, delay: 0.35 }}
                        />
                      </motion.svg>
                    </motion.div>

                    <motion.h3
                      className="font-display text-2xl mb-3 text-[var(--text-1)]"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5, duration: 0.5, ease }}
                    >
                      Cadastro recebido!
                    </motion.h3>
                    <motion.p
                      className="text-[var(--text-3)] text-sm"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.65, duration: 0.4, ease }}
                    >
                      Você será notificado em primeira mão sobre a 2ª edição.
                    </motion.p>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    onSubmit={handleSubmit}
                    className="space-y-6"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    <FloatingInput
                      id="name"
                      label="Nome completo"
                      value={form.name}
                      onChange={(v) => setForm({ ...form, name: v })}
                      placeholder="Seu nome"
                      required
                    />

                    <FloatingInput
                      id="email"
                      label="E-mail"
                      type="email"
                      value={form.email}
                      onChange={(v) => setForm({ ...form, email: v })}
                      placeholder="seu@email.com"
                      required
                    />

                    <FloatingInput
                      id="whatsapp"
                      label="WhatsApp"
                      type="tel"
                      value={form.whatsapp}
                      onChange={(v) => setForm({ ...form, whatsapp: v })}
                      placeholder="(62) 99999-9999"
                      required
                    />

                    {status === 'error' && (
                      <motion.p
                        className="text-red-400 text-sm"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        Erro ao salvar. Tente novamente ou fale via WhatsApp.
                      </motion.p>
                    )}

                    <motion.button
                      type="submit"
                      disabled={status === 'loading'}
                      className="btn-glow w-full py-4 bg-[var(--accent)] text-[var(--bg)] text-[11px] font-medium tracking-[0.22em] uppercase border border-[var(--accent)] transition-all duration-500 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                      whileHover={status !== 'loading' ? { scale: 1.01 } : {}}
                      whileTap={status !== 'loading' ? { scale: 0.98 } : {}}
                    >
                      {status === 'loading' ? (
                        <>
                          <Spinner />
                          Enviando...
                        </>
                      ) : (
                        'Quero participar da 2ª edição'
                      )}
                    </motion.button>

                    <p className="text-[var(--text-4)] text-[10px] text-center">
                      Seus dados estão seguros. Sem spam, apenas atualizações do evento.
                    </p>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
