import { getBezierPath, type EdgeProps } from '@xyflow/react'

// ─── Edge type color palette ──────────────────────────────────────────────────

const EDGE_TYPE_COLORS: Record<string, string> = {
  http:       '#6366F1',
  grpc:       '#8B5CF6',
  event:      '#F59E0B',
  sql:        '#10B981',
  graphql:    '#EC4899',
  websocket:  '#06B6D4',
  navigation: '#F97316',
  default:    '#6B7280',
}

const DASHED_TYPES = new Set(['event', 'websocket', 'navigation'])

function trafficColor(rps: number): string {
  if (rps > 1000) return '#EF4444'
  if (rps > 400)  return '#F97316'
  if (rps > 100)  return '#10B981'
  return '#6366F1'
}

function fmtRps(rps: number): string {
  if (rps >= 1000) return `${(rps / 1000).toFixed(1)}k`
  return `${Math.round(rps)}`
}

// ─── Animated SimEdge ─────────────────────────────────────────────────────────

export function SimEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  })

  const d = (data ?? {}) as {
    edgeType?: string
    rps?: number
    isSimulating?: boolean
    label?: string
  }

  const edgeType      = d.edgeType ?? 'http'
  const rps           = d.rps ?? 0
  const isSimulating  = d.isSimulating ?? false
  const isDashed      = DASHED_TYPES.has(edgeType)

  const baseColor  = EDGE_TYPE_COLORS[edgeType] ?? '#6B7280'
  const color      = isSimulating && rps > 0 ? trafficColor(rps) : baseColor
  const strokeW    = selected ? 2.5 : isSimulating && rps > 50 ? 2 : 1.5

  const pathId   = `sp-${id}`
  const markerId = `mk-${id}`

  // How many particles to show (0 = none)
  const particleCount = isSimulating && rps > 0
    ? rps > 600 ? 5 : rps > 200 ? 4 : rps > 50 ? 3 : 2
    : 0
  const particleSpeed = rps > 600 ? 0.7 : rps > 200 ? 1.0 : 1.4

  return (
    <>
      <defs>
        {/* Arrow head marker */}
        <marker
          id={markerId}
          markerWidth="9"
          markerHeight="7"
          refX="8"
          refY="3.5"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <polygon points="0 0, 9 3.5, 0 7" fill={color} opacity={0.85} />
        </marker>
        {/* Path ref for animateMotion */}
        {particleCount > 0 && (
          <path id={pathId} d={edgePath} fill="none" />
        )}
      </defs>

      {/* Glow halo when traffic is high */}
      {isSimulating && rps > 150 && (
        <path
          d={edgePath}
          fill="none"
          stroke={color}
          strokeWidth={strokeW + 5}
          opacity={0.08}
          strokeLinecap="round"
        />
      )}

      {/* Main edge path */}
      <path
        d={edgePath}
        fill="none"
        stroke={color}
        strokeWidth={strokeW}
        strokeDasharray={isDashed ? '7 5' : undefined}
        markerEnd={`url(#${markerId})`}
        opacity={selected ? 1 : 0.8}
        className="transition-[stroke,stroke-width] duration-500"
      />

      {/* Flowing traffic particles */}
      {Array.from({ length: particleCount }, (_, i) => (
        <circle key={i} r={2.8} fill={color} opacity={0.9}>
          <animateMotion
            dur={`${particleSpeed}s`}
            begin={`${(i / particleCount) * particleSpeed}s`}
            repeatCount="indefinite"
          >
            {/* eslint-disable-next-line react/no-unknown-property */}
            <mpath href={`#${pathId}`} />
          </animateMotion>
        </circle>
      ))}

      {/* RPS badge floating on edge mid-point */}
      {isSimulating && rps > 0 && (
        <foreignObject
          x={labelX - 20}
          y={labelY - 10}
          width={40}
          height={20}
          style={{ overflow: 'visible', pointerEvents: 'none' }}
        >
          <div
            style={{
              fontSize: 9,
              fontWeight: 800,
              color,
              textAlign: 'center',
              background: 'var(--color-card, #fff)',
              border: `1.5px solid ${color}`,
              borderRadius: 5,
              padding: '1px 4px',
              lineHeight: '16px',
              whiteSpace: 'nowrap',
              boxShadow: `0 0 4px ${color}40`,
              letterSpacing: '0.02em',
            }}
          >
            {fmtRps(rps)}
          </div>
        </foreignObject>
      )}

      {/* Edge label (if static) */}
      {!isSimulating && d.label && (
        <foreignObject
          x={labelX - 30}
          y={labelY - 10}
          width={60}
          height={20}
          style={{ overflow: 'visible', pointerEvents: 'none' }}
        >
          <div
            style={{
              fontSize: 9,
              fontWeight: 600,
              color: baseColor,
              textAlign: 'center',
              background: 'var(--color-card, #fff)',
              border: `1px solid ${baseColor}40`,
              borderRadius: 4,
              padding: '1px 4px',
              lineHeight: '16px',
              whiteSpace: 'nowrap',
              opacity: 0.85,
            }}
          >
            {d.label}
          </div>
        </foreignObject>
      )}
    </>
  )
}
