"use client"

import React, { useState } from "react"
import { useSystemSettings } from "@/lib/settings-context"
import Link from "next/link"

interface AppLogoProps {
  size?: "sm" | "md" | "lg" | "xl"
  showText?: boolean
  className?: string
  textClassName?: string
  clickable?: boolean
  href?: string
}

export function AppLogo({
  size = "md",
  showText = true,
  className = "",
  textClassName = "",
  clickable = true,
  href = "/",
}: AppLogoProps) {
  const { settings } = useSystemSettings()
  const [imageError, setImageError] = useState(false)

  const logoUrl = settings?.appLogoUrl
  const brandText = settings?.appLogoText || "HispaniolaPay"

  const sizeDimensions = {
    sm: { box: "w-7 h-7", icon: "text-xs", text: "text-base font-black" },
    md: { box: "w-9 h-9", icon: "text-sm", text: "text-xl font-black" },
    lg: { box: "w-12 h-12", icon: "text-lg", text: "text-2xl font-black" },
    xl: { box: "w-16 h-16", icon: "text-2xl", text: "text-3xl font-black" },
  }[size]

  const LogoIcon = (
    <div
      className={`relative flex items-center justify-center rounded-xl overflow-hidden shrink-0 transition-transform ${sizeDimensions.box} ${
        logoUrl && !imageError
          ? "bg-white shadow-xs border border-slate-200"
          : "bg-gradient-to-br from-blue-700 via-slate-900 to-red-700 text-white shadow-md shadow-blue-950/20"
      }`}
    >
      {logoUrl && !imageError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt={brandText}
          className="w-full h-full object-contain p-0.5"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="flex items-center justify-center w-full h-full font-black select-none tracking-tight">
          <span className="text-white drop-shadow-xs">H</span>
          <span className="w-1 h-3.5 bg-amber-400 rounded-full mx-0.5"></span>
          <span className="text-red-400 drop-shadow-xs">P</span>
        </div>
      )}
    </div>
  )

  const renderText = () => {
    if (!showText) return null

    // If custom text doesn't contain standard "HispaniolaPay" split, render custom string directly
    if (brandText.toLowerCase() === "hispaniolapay" || brandText.toLowerCase() === "hispaniola pay") {
      return (
        <span className={`tracking-tight ${sizeDimensions.text} ${textClassName || "text-slate-900"}`}>
          Hispaniola<span className="text-red-600">Pay</span>
        </span>
      )
    }

    return (
      <span className={`tracking-tight ${sizeDimensions.text} ${textClassName || "text-slate-900"}`}>
        {brandText}
      </span>
    )
  }

  const content = (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {LogoIcon}
      {renderText()}
    </div>
  )

  if (clickable && href) {
    return (
      <Link href={href} className="inline-flex items-center hover:opacity-90 transition-opacity">
        {content}
      </Link>
    )
  }

  return content
}
