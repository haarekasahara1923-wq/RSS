import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(amount)
}

export function formatDate(date: Date | string): string {
    return new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(new Date(date))
}

export function formatDateTime(date: Date | string): string {
    return new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(date))
}

export function getInitials(name: string): string {
    return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
}

export function generateStudentId(prefix: string = 'STU'): string {
    const timestamp = Date.now().toString(36).toUpperCase()
    const random = Math.random().toString(36).substring(2, 5).toUpperCase()
    return `${prefix}${timestamp}${random}`
}

export function calculatePercentage(obtained: number, total: number): number {
    if (total === 0) return 0
    return Math.round((obtained / total) * 100 * 100) / 100
}

export function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

export function cleanGovtId(val?: string | null): string {
    if (!val) return ''
    return String(val)
        .replace(/[₹$€£]/g, '')
        .replace(/\b(rs\.?|inr)\b/gi, '')
        .trim()
}

export function convertDateToWords(dateInput: Date | string | null | undefined): string {
    if (!dateInput) return ''
    let dateStr = ''
    if (dateInput instanceof Date) {
        if (isNaN(dateInput.getTime())) return ''
        dateStr = dateInput.toISOString().split('T')[0]
    } else {
        const s = String(dateInput).trim()
        if (!s) return ''
        if (s.includes('T')) {
            dateStr = s.split('T')[0]
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
            dateStr = s
        } else if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(s)) {
            const parts = s.split(/[-/]/)
            dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`
        } else {
            const d = new Date(s)
            if (isNaN(d.getTime())) return ''
            dateStr = d.toISOString().split('T')[0]
        }
    }

    const [yearStr, monthStr, dayStr] = dateStr.split('-')
    if (!yearStr || !monthStr || !dayStr) return ''

    const day = parseInt(dayStr, 10)
    const month = parseInt(monthStr, 10)
    const year = parseInt(yearStr, 10)

    if (isNaN(day) || isNaN(month) || isNaN(year)) return ''
    if (day < 1 || day > 31 || month < 1 || month > 12) return ''

    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
    const daysWords = ['', 'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth', 'Eleventh', 'Twelfth', 'Thirteenth', 'Fourteenth', 'Fifteenth', 'Sixteenth', 'Seventeenth', 'Eighteenth', 'Nineteenth', 'Twentieth', 'Twenty First', 'Twenty Second', 'Twenty Third', 'Twenty Fourth', 'Twenty Fifth', 'Twenty Sixth', 'Twenty Seventh', 'Twenty Eighth', 'Twenty Ninth', 'Thirtieth', 'Thirty First']
    const months = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

    const getYearInWords = (y: number) => {
        if (y < 2000) {
            const firstPart = Math.floor(y / 100)
            const secondPart = y % 100
            let res = ''
            if (firstPart < 20) res += ones[firstPart] + ' Hundred'
            else res += (tens[Math.floor(firstPart / 10)] + ' ' + ones[firstPart % 10]).trim() + ' Hundred'
            if (secondPart > 0) {
                if (secondPart < 20) res += ' ' + ones[secondPart]
                else res += ' ' + (tens[Math.floor(secondPart / 10)] + ' ' + ones[secondPart % 10]).trim()
            }
            return res.trim()
        } else {
            const thousands = Math.floor(y / 1000)
            const remainder = y % 1000
            let res = ones[thousands] + ' Thousand'
            if (remainder > 0) {
                if (remainder < 20) res += ' ' + ones[remainder]
                else if (remainder < 100) res += ' ' + (tens[Math.floor(remainder / 10)] + ' ' + ones[remainder % 10]).trim()
                else {
                    const h = Math.floor(remainder / 100)
                    const r = remainder % 100
                    res += ' ' + ones[h] + ' Hundred'
                    if (r > 0) {
                        if (r < 20) res += ' ' + ones[r]
                        else res += ' ' + (tens[Math.floor(r / 10)] + ' ' + ones[r % 10]).trim()
                    }
                }
            }
            return res.trim()
        }
    }

    return `${daysWords[day]} ${months[month]} ${getYearInWords(year)}`
}

