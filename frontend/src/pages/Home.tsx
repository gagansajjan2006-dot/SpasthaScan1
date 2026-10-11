import React, { useState, useEffect, useRef } from 'react';
import { 
  RotateCw, 
  BookOpen, 
  Crop, 
  LayoutGrid, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles,
  Scan,
  ShieldCheck,
  Zap,
  Sliders,
  Check
} from 'lucide-react';

interface HomeProps {
  onStartInspect: () => void;
  onOpenAbout: () => void;
}

export const Home: React.FC<HomeProps> = ({ onStartInspect, onOpenAbout }) => {
  // 3D Tilt State for interactive document preview
  const [tilt, setTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);

  // Animated Quality Score ring (counts up to 92)
  const [qualityScore, setQualityScore] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);

  // Check prefers-reduced-motion accessibility setting
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setReducedMotion(mediaQuery.matches);

      const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, []);

  // Animate quality score ring up to 92 on mount
  useEffect(() => {
    if (reducedMotion) {
      setQualityScore(92);
      return;
    }

    let start = 0;
    const end = 92;
    const duration = 1400; // ms
    const startTime = performance.now();

    const animateCount = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (end - start) * eased);
      setQualityScore(current);

      if (progress < 1) {
        requestAnimationFrame(animateCount);
      }
    };

    const frameId = requestAnimationFrame(animateCount);
    return () => cancelAnimationFrame(frameId);
  }, [reducedMotion]);

  // Handle 3D Mouse Movement Tilt
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reducedMotion || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Calculate rotation between -10 and +10 degrees
    const rotateX = ((y - centerY) / centerY) * -9;
    const rotateY = ((x - centerX) / centerX) * 9;

    setTilt({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
    setIsHovered(false);
  };

  // SVG circular progress calculation
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (qualityScore / 100) * circumference;

  return (
    <div className="bg-[#070b14] text-slate-100 min-h-screen overflow-hidden selection:bg-violet-500 selection:text-white">
      
      {/* ------------------------------------------------------------- */}
      {/* HERO SECTION: Dark Navy with Glowing Violet & Teal Ambience   */}
      {/* ------------------------------------------------------------- */}
      <section className="relative pt-12 pb-20 sm:pt-20 sm:pb-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Glowing Background Radial Blobs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] sm:w-[850px] sm:h-[500px] bg-gradient-to-tr from-violet-600/25 via-indigo-500/15 to-teal-400/20 blur-[130px] rounded-full pointer-events-none -z-10" />
        <div className="absolute top-10 right-10 w-72 h-72 bg-teal-500/15 blur-[100px] rounded-full pointer-events-none -z-10" />
        <div className="absolute top-1/3 left-10 w-80 h-80 bg-violet-600/20 blur-[110px] rounded-full pointer-events-none -z-10" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Headline, Copy, and CTAs */}
          <div className="lg:col-span-7 text-center lg:text-left space-y-7">
            
            {/* Top Eyebrow Chip */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-950/60 border border-violet-500/30 text-violet-300 text-xs font-semibold shadow-inner shadow-violet-500/10 backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-teal-300" />
              <span>Next-Gen Zero-Hallucination Document Quality Engine</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.12]">
              Make Every Document Image{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-purple-300 to-teal-300 drop-shadow-sm">
                clear and readable.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-slate-300 max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
              Instant automated gatekeeper evaluating orientation, motion vs defocus blur, 
              edge cropping, specular glare, screen fraud, and background clutter with pure deterministic computer vision.
            </p>

            {/* CTA Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <button
                onClick={onStartInspect}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl font-bold text-white bg-gradient-to-r from-violet-600 via-indigo-600 to-teal-500 hover:from-violet-500 hover:to-teal-400 shadow-xl shadow-indigo-950/60 hover:shadow-violet-900/40 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 text-sm sm:text-base cursor-pointer"
              >
                <span>Inspect a Document</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onOpenAbout}
                className="w-full sm:w-auto px-7 py-4 rounded-2xl font-semibold text-slate-200 bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 shadow-md backdrop-blur-sm transition-all flex items-center justify-center gap-2 text-sm sm:text-base cursor-pointer"
              >
                <span>See Architecture</span>
              </button>
            </div>

            {/* Trust Badges */}
            <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-slate-400 font-medium">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-400" />
                <span>Zero Hallucination</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-violet-400" />
                <span>&lt; 30ms Latency</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>100% Client Privacy</span>
              </div>
            </div>

          </div>

          {/* Right Column: Interactive 3D Document Scene & Live Quality Ring */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center relative">
            
            {/* Interactive 3D Perspective Card Container */}
            <div 
              ref={containerRef}
              onMouseMove={handleMouseMove}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={handleMouseLeave}
              className="relative w-full max-w-sm sm:max-w-md perspective-[1000px] cursor-pointer"
            >
              
              {/* Outer Glow Halo */}
              <div className="absolute -inset-1.5 bg-gradient-to-r from-violet-600/30 via-indigo-500/20 to-teal-400/30 rounded-3xl blur-xl opacity-75 group-hover:opacity-100 transition duration-1000" />

              {/* The 3D Tilting Document Canvas */}
              <div 
                style={{
                  transform: reducedMotion ? 'none' : `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(${isHovered ? 1.02 : 1}, ${isHovered ? 1.02 : 1}, 1)`,
                  transition: isHovered ? 'transform 0.1s ease-out' : 'transform 0.5s ease-out',
                }}
                className="relative bg-slate-900/90 border border-slate-700/80 rounded-3xl p-5 shadow-2xl backdrop-blur-xl overflow-hidden select-none"
              >
                
                {/* Sweeping Neon Scan Beam Animation */}
                <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-teal-400 to-transparent shadow-[0_0_16px_4px_rgba(45,212,191,0.6)] animate-scan-beam pointer-events-none z-20" />

                {/* Code-Drawn Document Paper Surface */}
                <div className="relative bg-slate-950 rounded-2xl p-5 border border-slate-800 shadow-inner">
                  
                  {/* Document Header with Stamp & Serial */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-violet-500/20 border border-violet-500/40 flex items-center justify-center text-violet-300">
                        <Scan className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-[11px] font-bold text-white uppercase tracking-wider">OFFICIAL CERTIFICATE</div>
                        <div className="text-[9px] text-slate-400 font-mono">DOC-9428-ID</div>
                      </div>
                    </div>
                    {/* Golden Verified Seal */}
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500/20 to-yellow-400/30 border border-amber-400/50 flex items-center justify-center text-amber-300 shadow-xs">
                      <Check className="w-4 h-4 stroke-[2.5]" />
                    </div>
                  </div>

                  {/* Synthetic Document Lines */}
                  <div className="space-y-2.5 mb-5">
                    <div className="h-2.5 bg-slate-800 rounded-md w-3/4" />
                    <div className="h-2 bg-slate-800/70 rounded-md w-full" />
                    <div className="h-2 bg-slate-800/70 rounded-md w-5/6" />
                    <div className="h-2 bg-slate-800/50 rounded-md w-4/5" />
                  </div>

                  {/* Document ID Details Table Simulation */}
                  <div className="bg-slate-900/70 rounded-xl p-3 border border-slate-800/80 mb-4 space-y-2">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-400 font-medium">Script Standard:</span>
                      <span className="text-teal-300 font-mono font-semibold">Devanagari / Latin</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-400 font-medium">Card Geometry:</span>
                      <span className="text-emerald-300 font-mono font-semibold">CR80 Compliant (1.586)</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-400 font-medium">Laplacian Sharpness:</span>
                      <span className="text-violet-300 font-mono font-semibold">4583.5 · Sharp</span>
                    </div>
                  </div>

                  {/* Bottom Signature & Verification Hash */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-850 text-[9px] text-slate-500 font-mono">
                    <span>SECURITY HASH: 7F8E-2B1A</span>
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                      VERIFIED
                    </span>
                  </div>

                </div>

                {/* Floating Chips Bobbing beside Document */}
                <div className="absolute top-6 -left-3 animate-float-slow z-30">
                  <div className="px-3 py-1.5 rounded-xl bg-violet-900/90 border border-violet-500/50 text-white text-[10px] font-semibold shadow-lg backdrop-blur-md flex items-center gap-1.5">
                    <RotateCw className="w-3 h-3 text-violet-300" />
                    <span>0° Upright</span>
                  </div>
                </div>

                <div className="absolute top-24 -right-3 animate-float-delayed z-30">
                  <div className="px-3 py-1.5 rounded-xl bg-teal-900/90 border border-teal-400/50 text-white text-[10px] font-semibold shadow-lg backdrop-blur-md flex items-center gap-1.5">
                    <Crop className="w-3 h-3 text-teal-300" />
                    <span>4 Corners Enclosed</span>
                  </div>
                </div>

                <div className="absolute bottom-16 -left-3 animate-float-delayed z-30">
                  <div className="px-3 py-1.5 rounded-xl bg-purple-900/90 border border-purple-400/50 text-white text-[10px] font-semibold shadow-lg backdrop-blur-md flex items-center gap-1.5">
                    <BookOpen className="w-3 h-3 text-purple-300" />
                    <span>Readability: 98%</span>
                  </div>
                </div>

                <div className="absolute bottom-5 -right-2 animate-float-slow z-30">
                  <div className="px-3 py-1.5 rounded-xl bg-slate-900/95 border border-slate-700 text-slate-200 text-[10px] font-semibold shadow-lg backdrop-blur-md flex items-center gap-1.5">
                    <LayoutGrid className="w-3 h-3 text-amber-400" />
                    <span>Clean Background</span>
                  </div>
                </div>

              </div>
            </div>

            {/* Quality Score Ring: Counts up to 92 & says "Ready to submit" */}
            <div className="mt-8 w-full max-w-sm sm:max-w-md bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-xl backdrop-blur-md">
              <div className="flex items-center gap-3.5">
                {/* Circular Animated Progress SVG */}
                <div className="relative w-18 h-18 shrink-0 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                    <circle
                      cx="40"
                      cy="40"
                      r={radius}
                      className="text-slate-800 stroke-current"
                      strokeWidth="6"
                      fill="transparent"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r={radius}
                      className="text-teal-400 stroke-current transition-all duration-500 ease-out"
                      strokeWidth="6"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      fill="transparent"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-base font-extrabold text-white font-mono leading-none">
                      {qualityScore}
                    </span>
                    <span className="text-[8px] text-slate-400 uppercase font-bold tracking-tighter">/100</span>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-slate-300">Composite Quality Score</div>
                  <div className="text-sm font-bold text-white flex items-center gap-1.5 mt-0.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Ready to submit</span>
                  </div>
                  <div className="text-[10px] text-slate-400">All 6 quality gates passed without defects</div>
                </div>
              </div>

              <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold shrink-0">
                PASS
              </div>
            </div>

          </div>

        </div>

      </section>

      {/* ------------------------------------------------------------- */}
      {/* FEATURE CARDS: Varied Sizes & Curated Colors (Bento Style)    */}
      {/* ------------------------------------------------------------- */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-slate-850">
        
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Comprehensive Document Diagnostic Checks
          </h2>
          <p className="text-sm sm:text-base text-slate-400 mt-3">
            Instead of generic heuristics, SpasthaScan evaluates documents through four mathematically distinct checks with tailored feedback.
          </p>
        </div>

        {/* Bento Grid: Varied Sizes and Distinct Colors (Violet, White, Pink, Dark) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
          
          {/* Card 1: VIOLET CARD (Large Featured Card - spans 7 cols) */}
          <div className="lg:col-span-7 bg-gradient-to-br from-violet-950/80 via-purple-950/40 to-slate-900 border border-violet-500/40 rounded-3xl p-8 shadow-xl relative overflow-hidden group hover:border-violet-400 transition-all">
            <div className="absolute top-0 right-0 w-60 h-60 bg-violet-600/15 blur-3xl rounded-full pointer-events-none" />
            
            <div className="flex items-center justify-between mb-6">
              <div className="w-14 h-14 rounded-2xl bg-violet-600/30 border border-violet-400/40 flex items-center justify-center text-violet-300 shadow-md group-hover:scale-105 transition-transform">
                <RotateCw className="w-7 h-7" />
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-violet-500/20 text-violet-200 border border-violet-500/30">
                Streak Aspect Ratio
              </span>
            </div>

            <h3 className="text-xl sm:text-2xl font-bold text-white mb-3">
              1. Orientation & Directional Streak Analysis
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed mb-6 max-w-lg">
              Evaluates morphological horizontal vs. vertical text baseline streaks to determine if a document is upright or rotated 90°, 180°, or 270°. Automatically provides clockwise correction suggestions so downstream OCR never fails.
            </p>

            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="bg-violet-950/60 border border-violet-500/20 rounded-xl p-3 text-center">
                <div className="text-xs text-violet-300 font-semibold">0° Upright</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Primary Alignment</div>
              </div>
              <div className="bg-violet-950/60 border border-violet-500/20 rounded-xl p-3 text-center">
                <div className="text-xs text-violet-300 font-semibold">90° / 270°</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Sideways Catch</div>
              </div>
              <div className="bg-violet-950/60 border border-violet-500/20 rounded-xl p-3 text-center">
                <div className="text-xs text-violet-300 font-semibold">180° Inverted</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Upside Down Fix</div>
              </div>
            </div>
          </div>

          {/* Card 2: WHITE CARD (Clean High-Contrast Elevated Card - spans 5 cols) */}
          <div className="lg:col-span-5 bg-white text-slate-900 rounded-3xl p-8 shadow-2xl relative overflow-hidden group hover:shadow-indigo-500/20 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-xs group-hover:scale-105 transition-transform">
                  <BookOpen className="w-7 h-7" />
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">
                  Motion vs Defocus
                </span>
              </div>

              <h3 className="text-xl sm:text-2xl font-bold text-slate-950 mb-3">
                2. Blur Type & Readability
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Computes Laplacian variance and 2D FFT spectral anisotropy. Differentiates camera motion blur from optical defocus to deliver targeted user coaching.
              </p>
            </div>

            <div className="mt-6 p-4 rounded-2xl bg-slate-100 border border-slate-200">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-800 mb-1.5">
                <span>Motion Blur Fix:</span>
                <span className="text-indigo-600">"Hold steady"</span>
              </div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                <span>Defocus Blur Fix:</span>
                <span className="text-indigo-600">"Tap text to focus"</span>
              </div>
            </div>
          </div>

          {/* Card 3: PINK / ROSE CARD (Bold Alert & Margin Enclosure - spans 5 cols) */}
          <div className="lg:col-span-5 bg-gradient-to-br from-rose-950/80 via-pink-950/40 to-slate-900 border border-rose-500/40 rounded-3xl p-8 shadow-xl relative overflow-hidden group hover:border-rose-400 transition-all flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-52 h-52 bg-rose-600/15 blur-3xl rounded-full pointer-events-none" />

            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-rose-600/20 border border-rose-400/40 flex items-center justify-center text-rose-300 shadow-md group-hover:scale-105 transition-transform">
                  <Crop className="w-7 h-7" />
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-200 border border-rose-500/30">
                  RDP Polygon 4-Edge
                </span>
              </div>

              <h3 className="text-xl sm:text-2xl font-bold text-white mb-3">
                3. Cropping & Border Enclosure
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Applies Ramer-Douglas-Peucker contour fitting to ensure all four paper corners are visible in frame. Flags cut headers, missing signatures, and clipped ID edges.
              </p>
            </div>

            <div className="mt-6 flex items-center gap-2 text-xs font-medium text-rose-300 bg-rose-950/60 p-3 rounded-xl border border-rose-500/30">
              <Sliders className="w-4 h-4 shrink-0" />
              <span>Detects top, bottom, left, or right frame collisions</span>
            </div>
          </div>

          {/* Card 4: DARK CARD (Sleek Charcoal with Teal Neon Accents - spans 7 cols) */}
          <div className="lg:col-span-7 bg-slate-900 border border-teal-500/30 rounded-3xl p-8 shadow-xl relative overflow-hidden group hover:border-teal-400 transition-all flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-60 h-60 bg-teal-500/10 blur-3xl rounded-full pointer-events-none" />

            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-300 shadow-md group-hover:scale-105 transition-transform">
                  <LayoutGrid className="w-7 h-7" />
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-200 border border-teal-500/30">
                  Surface & Moiré Analysis
                </span>
              </div>

              <h3 className="text-xl sm:text-2xl font-bold text-white mb-3">
                4. Background Clutter & Screen Photo Detection
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed mb-4">
                Separates clean scanner surfaces from busy desks. Incorporates high-frequency 2D FFT Moiré peak analysis to reject fraudulent photographs taken of computer or smartphone screens.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <div className="text-xs text-teal-300 font-semibold">Surface Segmentation</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Clutter: None, Low, Medium, High</div>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <div className="text-xs text-teal-300 font-semibold">Screen Photo Guard</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Periodic subpixel energy &lt; 0.45</div>
              </div>
            </div>
          </div>

        </div>

      </section>

      {/* ------------------------------------------------------------- */}
      {/* 3-STEP WORKFLOW: Gradient-Numbered Cards                      */}
      {/* ------------------------------------------------------------- */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center max-w-xl mx-auto mb-14">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            How It Works in 3 Simple Steps
          </h2>
          <p className="text-sm text-slate-400 mt-2">
            Instant client feedback before submission to save administrative review hours.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Step 01 */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-7 relative overflow-hidden shadow-lg group hover:border-violet-500/50 transition-all">
            <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400 font-mono mb-4">
              01
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Upload or Scan Live</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Drop any document photo or use our camera coach with real-time spoken guidance in Indian English, Hindi, or Kannada.
            </p>
          </div>

          {/* Step 02 */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-7 relative overflow-hidden shadow-lg group hover:border-purple-500/50 transition-all">
            <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 font-mono mb-4">
              02
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Automated CV Quality Check</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Our 6-parameter OpenCV engine runs in under 30ms, inspecting sharpness, orientation, cropping, fingers, and Moiré patterns.
            </p>
          </div>

          {/* Step 03 */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-7 relative overflow-hidden shadow-lg group hover:border-teal-500/50 transition-all">
            <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400 font-mono mb-4">
              03
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Instant Actionable Feedback</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Receive clear guidance, one-click CLAHE deblurring, and calibrated confidence metrics before committing to OCR.
            </p>
          </div>

        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* CLOSING BANNER: Full-Width Gradient with Primary Action CTA  */}
      {/* ------------------------------------------------------------- */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-24">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-violet-900 via-indigo-900 to-teal-900 border border-violet-500/30 p-10 sm:p-14 text-center shadow-2xl">
          
          {/* Subtle Ambient Radial Lighting */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-teal-400/20 blur-3xl rounded-full pointer-events-none" />

          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Ready to verify your document quality in seconds?
            </h2>
            <p className="text-sm sm:text-base text-violet-100 leading-relaxed">
              Experience zero-hallucination, edge-calibrated document verification with instant audio coaching and enhancement.
            </p>
            <div className="pt-2">
              <button
                onClick={onStartInspect}
                className="px-9 py-4 rounded-2xl font-bold text-slate-950 bg-white hover:bg-slate-100 shadow-xl shadow-black/40 hover:scale-105 active:scale-95 transition-all text-sm sm:text-base cursor-pointer inline-flex items-center gap-2"
              >
                <span>Inspect Your First Document Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
};
