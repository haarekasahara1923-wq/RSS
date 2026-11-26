'use client'
import React, { useEffect, useRef, useState } from 'react'

export interface DateInputProps {
  value?: string
  onChange?: (e: { target: { value: string; name?: string } }) => void
  name?: string
  required?: boolean
  disabled?: boolean
  min?: string
  max?: string
  className?: string
  style?: React.CSSProperties
  placeholder?: string
  id?: string
}

function isoToDisplay(iso?: string): string {
  if (!iso) return ''
  const datePart = String(iso).slice(0, 10)
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart)
  if (!match) return ''
  return `${match[3]}/${match[2]}/${match[1]}`
}

function displayToIso(display: string): string | null {
  const trimmed = display.trim()
  if (!trimmed) return ''
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(trimmed)
  if (!match) return null
  const day = parseInt(match[1], 10)
  const month = parseInt(match[2], 10)
  let year = parseInt(match[3], 10)
  if (match[3].length === 2) {
    year += year >= 50 ? 1900 : 2000
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const dt = new Date(year, month - 1, day)
  if (dt.getFullYear() !== year || dt.getMonth() !== month - 1 || dt.getDate() !== day) {
    return null
  }
  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
}

export default function DateInput({
  value = '',
  onChange,
  name,
  required,
  disabled,
  min,
  max,
  className = 'input',
  style,
  placeholder = 'DD/MM/YYYY',
  id,
}: DateInputProps) {
  const [text, setText] = useState(() => isoToDisplay(value))
  const hiddenPickerRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setText(isoToDisplay(value))
  }, [value])

  const emitChange = (isoValue: string) => {
    onChange?.({ target: { value: isoValue, name } })
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value
    // Allow digits and slashes; auto-insert slashes as user types digits
    const digitsOnly = raw.replace(/\D/g, '')
    if (raw.length > text.length && !raw.includes('/') && digitsOnly.length <= 8) {
      if (digitsOnly.length > 4) {
        raw = `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2, 4)}/${digitsOnly.slice(4, 8)}`
      } else if (digitsOnly.length > 2) {
        raw = `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2, 4)}`
      } else {
        raw = digitsOnly
      }
    } else if (raw.length > text.length) {
      // Auto-add slash after DD or DD/MM
      if (/^\d{2}$/.test(raw)) raw = `${raw}/`
      else if (/^\d{2}\/\d{2}$/.test(raw)) raw = `${raw}/`
    }

    if (raw.length > 10) raw = raw.slice(0, 10)
    setText(raw)

    if (raw.trim() === '') {
      emitChange('')
      return
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
      const iso = displayToIso(raw)
      if (iso) emitChange(iso)
    }
  }

  const handleBlur = () => {
    if (text.trim() === '') {
      emitChange('')
      return
    }
    const iso = displayToIso(text)
    if (iso) {
      setText(isoToDisplay(iso))
      if (iso !== String(value).slice(0, 10)) {
        emitChange(iso)
      }
    } else {
      setText(isoToDisplay(value))
    }
  }

  const openPicker = () => {
    if (disabled) return
    const el = hiddenPickerRef.current
    if (!el) return
    try {
      if (typeof (el as any).showPicker === 'function') {
        ;(el as any).showPicker()
      } else {
        el.focus()
        el.click()
      }
    } catch {
      el.focus()
      el.click()
    }
  }

  const normalizedIso = value ? String(value).slice(0, 10) : ''

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: style?.width || '100%' }}>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        value={text}
        onChange={handleTextChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        pattern="\d{2}/\d{2}/\d{4}"
        title="Enter date in DD/MM/YYYY format"
        className={className}
        style={{
          ...style,
          width: '100%',
          paddingRight: '34px',
        }}
      />
      <button
        type="button"
        onClick={openPicker}
        disabled={disabled}
        tabIndex={-1}
        aria-label="Open calendar"
        title="Pick date from calendar"
        style={{
          position: 'absolute',
          right: '8px',
          background: 'none',
          border: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          padding: '2px',
          fontSize: '14px',
          lineHeight: 1,
          opacity: disabled ? 0.4 : 0.75,
        }}
      >
        📅
      </button>
      <input
        ref={hiddenPickerRef}
        type="date"
        value={normalizedIso}
        min={min}
        max={max}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          const v = e.target.value
          setText(isoToDisplay(v))
          emitChange(v)
        }}
        style={{
          position: 'absolute',
          opacity: 0,
          pointerEvents: 'none',
          width: 0,
          height: 0,
          right: 0,
          bottom: 0,
        }}
      />
    </div>
  )
}
