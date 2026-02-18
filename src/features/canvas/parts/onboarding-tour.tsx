import { useState, useEffect, useCallback } from 'react'
import { X, ArrowRight, Sparkles } from '@shared/ui/icons'
import { cn } from '@shared/utils'

const TOUR_KEY = 'systyfield_onboarding_done'

interface TourStep {
  title: string
  description: string
  highlight?: string  // CSS selector for the element to highlight
  position: 'center' | 'bottom-left' | 'bottom-center' | 'top-center'
}

const TOUR_STEPS: TourStep[] = [
  {
    title: 'Welcome to systyfield',
    description: 'Design, visualize, and simulate complex system architectures in your browser — no backend needed. Let\'s take a quick tour.',
    position: 'center',
  },
  {
    title: 'Drag nodes from the palette',
    description: 'The left sidebar has all your building blocks: microservices, databases, queues, caches, and 20+ infrastructure components. Drag any of them onto the canvas.',
    position: 'bottom-left',
  },
  {
    title: 'Connect nodes with edges',
    description: 'Hover over a node\'s edge handle (the colored dot on the right) and drag to another node to create a connection. Click the connection to configure its type — HTTP, gRPC, event, SQL, and more.',
    position: 'bottom-center',
  },
  {
    title: 'Configure every node',
    description: 'Click any node to open its config panel on the right. Change replicas, latency targets, instance types, and dozens of other parameters — they all feed directly into the simulation engine.',
    position: 'bottom-center',
  },
  {
    title: 'Run a simulation',
    description: 'Use the toolbar at the top of the canvas to pick a simulation type — Load Test, Cascade Failure, Thundering Herd, and 13 more. Hit Play and watch live metrics appear in the right panel.',
    position: 'top-center',
  },
]

interface OnboardingTourProps {
  onComplete: () => void
}

export function OnboardingTour({ onComplete }: OnboardingTourProps) {
  const [step, setStep] = useState(0)
  const total = TOUR_STEPS.length
  const current = TOUR_STEPS[step]

  const handleNext = useCallback(() => {
    if (step < total - 1) {
      setStep(s => s + 1)
    } else {
      onComplete()
    }
  }, [step, total, onComplete])

  const handleSkip = useCallback(() => {
    onComplete()
  }, [onComplete])

  const positionClasses: Record<TourStep['position'], string> = {
    center: 'inset-0 m-auto h-[280px]',
    'bottom-left': 'bottom-20 left-[200px]',
    'bottom-center': 'bottom-20 left-1/2 -translate-x-1/2',
    'top-center': 'top-20 left-1/2 -translate-x-1/2',
  }

  return (
    <>
      {/* Backdrop */}
      <div className="pointer-events-none absolute inset-0 z-200 bg-black/20 backdrop-blur-[1px]" />

      {/* Tour card */}
      <div
        className={cn(
          'absolute z-[201] w-80 rounded-2xl border border-border bg-card shadow-2xl',
          positionClasses[current.position]
        )}
      >
        {/* Progress dots */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-1.5">
            {TOUR_STEPS.map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i === step ? 'w-5 bg-primary' : i < step ? 'w-1.5 bg-primary/40' : 'w-1.5 bg-muted'
                )}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={handleSkip}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4">
          <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <h3 className="text-sm font-bold text-foreground">{current.title}</h3>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{current.description}</p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <span className="text-[10px] text-muted-foreground">
            {step + 1} of {total}
          </span>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep(s => s - 1)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {step < total - 1 ? (
                <>
                  Next
                  <ArrowRight className="h-3 w-3" />
                </>
              ) : (
                <>
                  Get started
                  <Sparkles className="h-3 w-3" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Hook to manage tour state ─────────────────────────────────────────────────

export function useOnboardingTour() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Show tour only for first-time users (no designs saved yet)
    const done = localStorage.getItem(TOUR_KEY)
    if (!done) {
      // Delay to allow canvas to fully render
      const t = setTimeout(() => setShow(true), 800)
      return () => clearTimeout(t)
    }
  }, [])

  const complete = useCallback(() => {
    localStorage.setItem(TOUR_KEY, 'true')
    setShow(false)
  }, [])

  const resetTour = useCallback(() => {
    localStorage.removeItem(TOUR_KEY)
    setShow(true)
  }, [])

  return { show, complete, resetTour }
}
