import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { Lock } from 'lucide-react';

const VIDEO_SRC = '/art/banner.mp4';

export default function WanderHero() {
  const videoWrapRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    const videoBg = videoWrapRef.current;
    if (!videoBg) return;

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let raf = 0;

    const handleMouseMove = (event: MouseEvent) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      targetX = ((event.clientX - cx) / cx) * 20;
      targetY = ((event.clientY - cy) / cy) * 20;
    };

    const tick = () => {
      currentX += (targetX - currentX) * 0.06;
      currentY += (targetY - currentY) * 0.06;
      gsap.set(videoBg, { x: currentX, y: currentY });
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener('mousemove', handleMouseMove);
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(raf);
      gsap.set(videoBg, { clearProps: 'transform' });
    };
  }, []);

  return (
    <section
      id="home"
      className={`relative min-h-[100svh] overflow-hidden bg-black text-white ${ready ? 'hero-ready' : ''}`}
    >
      <div ref={videoWrapRef} className="fixed inset-0 z-0 origin-center scale-[1.08]">
        <video
          src={VIDEO_SRC}
          className="home-video h-full w-full object-cover opacity-100"
          autoPlay
          muted
          loop
          playsInline
          onLoadedMetadata={(event) => {
            event.currentTarget.playbackRate = 1.25;
          }}
        />
      </div>

      <div className="pointer-events-none fixed inset-0 z-[1] bg-[radial-gradient(circle_at_50%_42%,rgba(0,0,0,0)_0%,rgba(0,0,0,0.08)_48%,rgba(0,0,0,0.18)_100%)]" />
      <div className="pointer-events-none fixed inset-0 z-[2] bg-gradient-to-b from-black/50 via-black/0 to-black/35" />

      <div className="relative z-20 flex min-h-[100svh] flex-col justify-between gap-14 px-6 pb-10 pt-[126px] text-center sm:gap-16 sm:pb-14 sm:pt-[120px]">
        <div className="pointer-events-none">
          <h1 className="hero-fade home-hero-heading mx-auto max-w-[22rem] sm:max-w-5xl">
            <span className="hidden text-white sm:block">Venture without edges.</span>
            <span className="hidden text-white/55 sm:block">Uncover with keen instinct.</span>
            <span className="home-mobile-heading-line block text-white sm:hidden">Venture without</span>
            <span className="home-mobile-heading-line block text-white sm:hidden">edges.</span>
            <span className="home-mobile-heading-line mt-2 block text-white/55 sm:hidden">Uncover with</span>
            <span className="home-mobile-heading-line block text-white/55 sm:hidden">keen instinct.</span>
          </h1>
          <p className="hero-fade hero-terminal-copy mx-auto mt-4 max-w-[19rem] break-words font-terminal text-base tracking-[0.04em] text-neon-cyan/90 sm:max-w-2xl sm:text-xl">
            &gt; TRANICI terminal stays online while the horizon buffers.
          </p>
        </div>

        <div className="hero-fade hero-delay flex flex-col items-center gap-6">
          <p className="hero-bottom-copy w-full max-w-[20rem] text-xl leading-relaxed text-white sm:max-w-[620px]">
            Our smart itineraries shape around you - your rhythm, your vibe, your hunger for adventure.
            <span className="text-white/55"> Each getaway is tailored, seamless, and wholly yours.</span>
          </p>

          <a
            href="/tools"
            className="home-cta border-2 border-neon-cyan bg-ink-deep px-8 py-3.5 font-pixel text-[0.72rem] font-medium uppercase tracking-[0.08em] text-neon-cyan transition duration-200 hover:scale-[1.03] hover:bg-neon-cyan hover:text-ink-deep active:scale-[0.97]"
          >
            Plan my escape today
          </a>

          <div className="home-security-copy flex items-center gap-2 text-base font-medium tracking-[0.14em] text-white/70">
            <Lock size={13} strokeWidth={1.5} />
            <span>SECURE BY DESIGN. ZERO DATA LEAKS.</span>
          </div>
        </div>
      </div>
    </section>
  );
}
