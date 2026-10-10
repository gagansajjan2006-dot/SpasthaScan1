import React from 'react';
import { 
  RotateCw, 
  BookOpen, 
  Crop, 
  LayoutGrid, 
  ArrowRight, 
  CheckCircle, 
  Sparkles
} from 'lucide-react';

interface HomeProps {
  onStartInspect: () => void;
  onOpenAbout: () => void;
}

export const Home: React.FC<HomeProps> = ({ onStartInspect, onOpenAbout }) => {
  return (
    <div className="space-y-20 pb-16">
      
      {/* Hero Section */}
      <section className="relative pt-12 pb-8 sm:pt-16 sm:pb-12 text-center max-w-4xl mx-auto px-4 sm:px-6">
        
        {/* Subtle top pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-6 shadow-2xs">
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI-Powered Document Quality Intelligence</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
          Make Every Document Image{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600">
            Readable.
          </span>
        </h1>

        {/* Subheading */}
        <p className="mt-5 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed font-normal">
          Upload a document image and instantly evaluate its orientation, readability, cropping, and background quality.
        </p>

        {/* CTA Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
          <button
            onClick={onStartInspect}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-indigo-200 hover:shadow-lg hover:shadow-indigo-300 active:scale-98 transition-all flex items-center justify-center gap-2"
          >
            <span>Inspect a Document</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenAbout}
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/90 shadow-2xs transition-all flex items-center justify-center gap-2"
          >
            <span>See How It Works</span>
          </button>
        </div>

        {/* Trust Badges */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>Strict Schema Output</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>Calibrated CV Metrics</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>No Image Retention</span>
          </div>
        </div>

      </section>

      {/* Four Feature Cards */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Comprehensive Document Diagnostic Checks
          </h2>
          <p className="text-sm text-slate-500 mt-2">
            Every upload runs through a specialized multi-parameter computer vision and OCR pipeline.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          
          {/* Card 1: Orientation Detection */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-indigo-200 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform">
              <RotateCw className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-2">
              1. Orientation Detection
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Detects whether the document is upright or requires 90°, 180°, or 270° clockwise correction using OCR text-lines and directional gradient flow.
            </p>
          </div>

          {/* Card 2: Text Readability */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-indigo-200 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-4 group-hover:scale-110 transition-transform">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-2">
              2. Text Readability
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Calculates Laplacian blur variance, RMS contrast, and OCR confidence to ensure the text can be digitized without errors.
            </p>
          </div>

          {/* Card 3: Cropping Detection */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-indigo-200 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600 mb-4 group-hover:scale-110 transition-transform">
              <Crop className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-2">
              3. Cropping Detection
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Verifies if any document corners or critical text lines intersect the image boundary, flagging cut margins before filing.
            </p>
          </div>

          {/* Card 4: Background Analysis */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-indigo-200 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 mb-4 group-hover:scale-110 transition-transform">
              <LayoutGrid className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-2">
              4. Background Analysis
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Differentiates clean scanner surfaces from busy desks, classifying clutter into none, low, medium, or high without false alarms.
            </p>
          </div>

        </div>
      </section>

      {/* 3-Step Workflow Section */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-8 sm:p-12 text-white shadow-xl">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="text-xs font-semibold tracking-wider uppercase text-indigo-400">
              Simple 3-Step Inspection
            </span>
            <h3 className="text-2xl sm:text-3xl font-bold mt-1 text-white">
              Upload → Analyze → Improve
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 mt-2">
              Get definitive recommendations in seconds with strict calibration and zero fabricated issues.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            
            {/* Step 1 */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/15">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 font-bold text-base mb-4">
                1
              </div>
              <h4 className="font-bold text-base text-white mb-1.5">Upload Image</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Drop your document photo or scan in JPG, PNG, or WEBP format. File size up to 25 MB.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/15">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 font-bold text-base mb-4">
                2
              </div>
              <h4 className="font-bold text-base text-white mb-1.5">Automated Analysis</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Computer vision measures sharpness, contrast, edge bounds, paper boundaries, and text flow.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/15">
              <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-400/30 flex items-center justify-center text-violet-300 font-bold text-base mb-4">
                3
              </div>
              <h4 className="font-bold text-base text-white mb-1.5">Actionable Fix</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Receive one clear, concrete improvement recommendation or confirmation that no changes are needed.
              </p>
            </div>

          </div>

          {/* Bottom Action inside banner */}
          <div className="mt-10 text-center">
            <button
              onClick={onStartInspect}
              className="px-7 py-3 rounded-xl bg-white text-indigo-950 font-bold hover:bg-slate-100 transition-all shadow-md active:scale-98"
            >
              Start Inspection Now
            </button>
          </div>

        </div>
      </section>

    </div>
  );
};
