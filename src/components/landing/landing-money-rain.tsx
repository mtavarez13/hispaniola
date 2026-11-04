import Image from "next/image"
import type { CSSProperties } from "react"

type RainParticle = {
  left: string
  delay: string
  duration: string
  size: number
  drift: string
  kind: "hispaniola" | "binance" | "money"
  label?: string
}

const PARTICLES: RainParticle[] = [
  { left: "3%", delay: "-7s", duration: "20s", size: 46, drift: "38px", kind: "hispaniola" },
  { left: "9%", delay: "-15s", duration: "22s", size: 33, drift: "-30px", kind: "money", label: "$" },
  { left: "15%", delay: "-4s", duration: "18s", size: 34, drift: "28px", kind: "binance" },
  { left: "21%", delay: "-12s", duration: "24s", size: 38, drift: "-44px", kind: "money", label: "RD$" },
  { left: "28%", delay: "-20s", duration: "26s", size: 50, drift: "32px", kind: "hispaniola" },
  { left: "35%", delay: "-9s", duration: "21s", size: 32, drift: "-24px", kind: "money", label: "G" },
  { left: "42%", delay: "-18s", duration: "23s", size: 36, drift: "45px", kind: "binance" },
  { left: "49%", delay: "-2s", duration: "19s", size: 31, drift: "-36px", kind: "money", label: "$" },
  { left: "56%", delay: "-14s", duration: "25s", size: 48, drift: "30px", kind: "hispaniola" },
  { left: "63%", delay: "-6s", duration: "20s", size: 37, drift: "-42px", kind: "money", label: "HTG" },
  { left: "70%", delay: "-22s", duration: "27s", size: 35, drift: "34px", kind: "binance" },
  { left: "77%", delay: "-10s", duration: "22s", size: 32, drift: "-28px", kind: "money", label: "$" },
  { left: "84%", delay: "-17s", duration: "24s", size: 46, drift: "40px", kind: "hispaniola" },
  { left: "90%", delay: "-5s", duration: "19s", size: 34, drift: "-32px", kind: "binance" },
  { left: "96%", delay: "-13s", duration: "23s", size: 37, drift: "-38px", kind: "money", label: "RD$" },
]

type ParticleStyle = CSSProperties & { "--landing-rain-drift": string }

function BinanceMark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <path fill="currentColor" d="M50 5 65 20 50 35 35 20 50 5Zm-25 25 15 15-15 15L10 45l15-15Zm50 0 15 15-15 15-15-15 15-15ZM50 40l10 10-10 10-10-10 10-10ZM25 65l15 15-15 15-15-15 15-15Zm50 0 15 15-15 15-15-15 15-15ZM50 65l15 15-15 15-15-15 15-15Z" />
    </svg>
  )
}

export function LandingMoneyRain() {
  return (
    <div className="landing-money-rain" aria-hidden="true">
      {PARTICLES.map((particle, index) => {
        const style: ParticleStyle = {
          left: particle.left,
          width: particle.size,
          height: particle.size,
          animationDelay: particle.delay,
          animationDuration: particle.duration,
          "--landing-rain-drift": particle.drift,
        }

        return (
          <span
            className={`landing-rain-particle landing-rain-${particle.kind}`}
            style={style}
            key={`${particle.kind}-${index}`}
          >
            {particle.kind === "hispaniola" && (
              <Image
                src="/branding/hispaniolapay-mark-transparent.png"
                alt=""
                width={particle.size}
                height={particle.size}
                className="h-full w-full object-contain"
              />
            )}
            {particle.kind === "binance" && <BinanceMark size={Math.round(particle.size * 0.72)} />}
            {particle.kind === "money" && <span>{particle.label}</span>}
          </span>
        )
      })}
    </div>
  )
}
