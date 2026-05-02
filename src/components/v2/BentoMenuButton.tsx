import { motion } from "framer-motion";

interface BentoMenuButtonProps {
  isOpen: boolean;
  onClick: () => void;
}

// 9 dots in 3x3 grid → animate to X shape
// Grid positions (center-based, spacing 6px):
// (-6,-6) (0,-6) (6,-6)
// (-6, 0) (0, 0) (6, 0)
// (-6, 6) (0, 6) (6, 6)

const gridPositions = [
  { x: -6, y: -6 }, { x: 0, y: -6 }, { x: 6, y: -6 },
  { x: -6, y: 0 },  { x: 0, y: 0 },  { x: 6, y: 0 },
  { x: -6, y: 6 },  { x: 0, y: 6 },  { x: 6, y: 6 },
];

// X shape: 4 corner dots move to form X lines, center stays, others fade
// Diagonal positions for X (scaled up a bit)
const xPositions = [
  { x: -7, y: -7, opacity: 1 },  // top-left → X corner
  { x: 0, y: 0, opacity: 0 },     // top-center → fade
  { x: 7, y: -7, opacity: 1 },    // top-right → X corner
  { x: 0, y: 0, opacity: 0 },     // mid-left → fade
  { x: 0, y: 0, opacity: 1 },     // center → stays
  { x: 0, y: 0, opacity: 0 },     // mid-right → fade
  { x: -7, y: 7, opacity: 1 },    // bottom-left → X corner
  { x: 0, y: 0, opacity: 0 },     // bottom-center → fade
  { x: 7, y: 7, opacity: 1 },     // bottom-right → X corner
];

export const BentoMenuButton = ({ isOpen, onClick }: BentoMenuButtonProps) => {
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 w-9 h-9 flex items-center justify-center"
    >
      <svg width="20" height="20" viewBox="0 0 20 20">
        <g transform="translate(10,10)">
          {gridPositions.map((pos, i) => {
            const target = xPositions[i];
            return (
              <motion.circle
                key={i}
                r={1.8}
                fill="rgba(255,255,255,0.7)"
                initial={false}
                animate={{
                  cx: isOpen ? target.x : pos.x,
                  cy: isOpen ? target.y : pos.y,
                  opacity: isOpen ? target.opacity : 1,
                  r: isOpen && target.opacity === 1 ? 1.6 : 1.8,
                }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 22,
                  delay: i * 0.02,
                }}
              />
            );
          })}
          {/* X lines that fade in when open */}
          <motion.line
            x1={-7} y1={-7} x2={7} y2={7}
            stroke="rgba(255,255,255,0.7)"
            strokeWidth={2}
            strokeLinecap="round"
            initial={false}
            animate={{ opacity: isOpen ? 1 : 0 }}
            transition={{ duration: 0.2, delay: isOpen ? 0.15 : 0 }}
          />
          <motion.line
            x1={7} y1={-7} x2={-7} y2={7}
            stroke="rgba(255,255,255,0.7)"
            strokeWidth={2}
            strokeLinecap="round"
            initial={false}
            animate={{ opacity: isOpen ? 1 : 0 }}
            transition={{ duration: 0.2, delay: isOpen ? 0.15 : 0 }}
          />
        </g>
      </svg>
    </button>
  );
};
