import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { Trip, ItineraryEntry } from '../types';
import { formatTime } from './date';
import { formatCurrency } from '../data/exchangeRates';
import { getEmergencyInfoForTrip } from '../data/emergencyNumbers';

interface ExportPdfOptions {
  trip: Trip;
  entries: ItineraryEntry[];
  timeFormat?: '12h' | '24h';
}

function escapeHtml(str?: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function generateItineraryHtml({ trip, entries, timeFormat = '12h' }: ExportPdfOptions): string {
  // Sort entries chronologically by date and start time
  const sortedEntries = [...entries].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    const getStartTime = (e: ItineraryEntry) => {
      if (e.flightDetails?.departureTime) return new Date(e.flightDetails.departureTime).getTime();
      if (e.hotelDetails?.checkInTime) return new Date(e.hotelDetails.checkInTime).getTime();
      if (e.attractionDetails?.startTime) return new Date(e.attractionDetails.startTime).getTime();
      if (e.transportDetails?.startTime) return new Date(e.transportDetails.startTime).getTime();
      return new Date(e.date).getTime();
    };
    return getStartTime(a) - getStartTime(b);
  });

  // Group by date
  const groupedByDate: Record<string, ItineraryEntry[]> = {};
  sortedEntries.forEach((entry) => {
    if (!groupedByDate[entry.date]) {
      groupedByDate[entry.date] = [];
    }
    groupedByDate[entry.date].push(entry);
  });

  const dates = Object.keys(groupedByDate).sort();

  // Calculate totals
  const totalCost = entries.reduce((sum, e) => sum + (e.price || 0), 0);
  const emergencyInfo = getEmergencyInfoForTrip(trip.name);

  // Date range display
  const startFormatted = trip.startDate
    ? new Date(trip.startDate + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '';
  const endFormatted = trip.endDate
    ? new Date(trip.endDate + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  const getEntryBadgeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'flight':
        return '#3B82F6';
      case 'hotel':
        return '#8B5CF6';
      case 'attraction':
        return '#EC4899';
      case 'transport':
        return '#F59E0B';
      case 'food':
        return '#10B981';
      default:
        return '#6C63FF';
    }
  };

  const getEntryIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'flight':
        return '✈️';
      case 'hotel':
        return '🏨';
      case 'attraction':
        return '📍';
      case 'transport':
        return '🚆';
      case 'food':
        return '🍽️';
      case 'shopping':
        return '🛍️';
      default:
        return '📌';
    }
  };

  const daysHtml = dates
    .map((dateStr, dayIndex) => {
      const dayDate = new Date(dateStr + 'T00:00:00');
      const dateFormatted = dayDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      const dayEntries = groupedByDate[dateStr];

      const entriesHtml = dayEntries
        .map((entry) => {
          const badgeColor = getEntryBadgeColor(entry.type);
          const icon = getEntryIcon(entry.type);

          let timeLabel = '';
          let detailsHtml = '';

          if (entry.type === 'flight' && entry.flightDetails) {
            const depTime = entry.flightDetails.departureTime
              ? formatTime(entry.flightDetails.departureTime, timeFormat)
              : '';
            const arrTime = entry.flightDetails.arrivalTime
              ? formatTime(entry.flightDetails.arrivalTime, timeFormat)
              : '';
            timeLabel = `${depTime} - ${arrTime}`;

            detailsHtml = `
              <div class="flight-route">
                <strong>${escapeHtml(entry.flightDetails.from)}</strong> &rarr; <strong>${escapeHtml(entry.flightDetails.to)}</strong>
                ${entry.flightDetails.flightName ? `<span class="flight-no">(${escapeHtml(entry.flightDetails.flightName)})</span>` : ''}
              </div>
              ${
                entry.flightDetails.departureTerminal || entry.flightDetails.arrivalTerminal
                  ? `<div class="sub-detail">
                      ${entry.flightDetails.departureTerminal ? `Dep Terminal: ${escapeHtml(entry.flightDetails.departureTerminal)} ` : ''}
                      ${entry.flightDetails.arrivalTerminal ? `• Arr Terminal: ${escapeHtml(entry.flightDetails.arrivalTerminal)}` : ''}
                    </div>`
                  : ''
              }
            `;
          } else if (entry.type === 'hotel' && entry.hotelDetails) {
            const checkIn = entry.hotelDetails.checkInTime ? formatTime(entry.hotelDetails.checkInTime, timeFormat) : '';
            const checkOut = entry.hotelDetails.checkOutTime ? formatTime(entry.hotelDetails.checkOutTime, timeFormat) : '';
            timeLabel = checkIn ? `Check-In: ${checkIn}` : '';
            detailsHtml = `
              <div class="hotel-details">
                <div><strong>${escapeHtml(entry.hotelDetails.name || entry.title)}</strong></div>
                ${entry.hotelDetails.address ? `<div class="address-line">📍 ${escapeHtml(entry.hotelDetails.address)}</div>` : ''}
                ${entry.hotelDetails.localName ? `<div class="local-lang">Local: ${escapeHtml(entry.hotelDetails.localName)}</div>` : ''}
                ${checkOut ? `<div class="sub-detail">Check-Out: ${checkOut}</div>` : ''}
              </div>
            `;
          } else if (entry.type === 'attraction' && entry.attractionDetails) {
            const sTime = entry.attractionDetails.startTime ? formatTime(entry.attractionDetails.startTime, timeFormat) : '';
            const eTime = entry.attractionDetails.endTime ? formatTime(entry.attractionDetails.endTime, timeFormat) : '';
            timeLabel = sTime && eTime ? `${sTime} - ${eTime}` : sTime || '';
            detailsHtml = `
              <div><strong>${escapeHtml(entry.title)}</strong></div>
              ${entry.attractionDetails.link ? `<div class="link-line">🔗 <a href="${escapeHtml(entry.attractionDetails.link)}">${escapeHtml(entry.attractionDetails.link)}</a></div>` : ''}
            `;
          } else if (entry.type === 'transport' && entry.transportDetails) {
            const sTime = entry.transportDetails.startTime ? formatTime(entry.transportDetails.startTime, timeFormat) : '';
            const eTime = entry.transportDetails.endTime ? formatTime(entry.transportDetails.endTime, timeFormat) : '';
            timeLabel = sTime && eTime ? `${sTime} - ${eTime}` : sTime || '';
            detailsHtml = `<div><strong>${escapeHtml(entry.title)}</strong></div>`;
          } else {
            detailsHtml = `<div><strong>${escapeHtml(entry.title)}</strong></div>`;
          }

          if (entry.notes) {
            detailsHtml += `<div class="entry-notes">${escapeHtml(entry.notes)}</div>`;
          }

          const priceHtml =
            entry.price > 0
              ? `<div class="entry-price">${formatCurrency(entry.price, entry.currency || trip.baseCurrency)}</div>`
              : '';

          return `
            <div class="entry-card">
              <div class="entry-left">
                <span class="type-badge" style="background-color: ${badgeColor}15; color: ${badgeColor}; border: 1px solid ${badgeColor}30;">
                  ${icon} ${escapeHtml(entry.type.toUpperCase())}
                </span>
                ${timeLabel ? `<span class="time-label">${escapeHtml(timeLabel)}</span>` : ''}
              </div>
              <div class="entry-content">
                ${detailsHtml}
              </div>
              ${priceHtml ? `<div class="entry-right">${priceHtml}</div>` : ''}
            </div>
          `;
        })
        .join('');

      return `
        <div class="day-section">
          <div class="day-header">
            <span class="day-pill">Day ${dayIndex + 1}</span>
            <span class="day-date">${dateFormatted}</span>
          </div>
          <div class="entries-list">
            ${entriesHtml}
          </div>
        </div>
      `;
    })
    .join('');

  // Trip Documents Summary Html
  const tripDocsHtml =
    trip.documents && trip.documents.length > 0
      ? `
      <div class="vault-summary-box">
        <div class="section-title">📂 Trip Documents Vault (${trip.documents.length})</div>
        <div class="docs-pill-grid">
          ${trip.documents
            .map(
              (doc) => `
            <div class="doc-badge">
              <span class="doc-badge-cat">${escapeHtml(doc.category || 'DOC')}</span>
              <span class="doc-badge-name">${escapeHtml(doc.name)}</span>
            </div>`
            )
            .join('')}
        </div>
      </div>
    `
      : '';

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <title>${escapeHtml(trip.name)} - Travel Itinerary</title>
      <style>
        @page {
          margin: 14mm 12mm;
          size: A4 portrait;
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #1F2937;
          background-color: #FFFFFF;
          font-size: 11pt;
          line-height: 1.45;
        }
        .header-banner {
          background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
          color: #FFFFFF;
          padding: 24px;
          border-radius: 12px;
          margin-bottom: 20px;
        }
        .app-tag {
          font-size: 8.5pt;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          opacity: 0.85;
          margin-bottom: 4px;
          font-weight: 700;
        }
        .trip-title {
          font-size: 22pt;
          font-weight: 800;
          letter-spacing: -0.5px;
          margin-bottom: 8px;
        }
        .trip-dates {
          font-size: 11pt;
          opacity: 0.95;
          margin-bottom: 14px;
        }
        .stats-row {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .stat-pill {
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.3);
          padding: 5px 12px;
          border-radius: 20px;
          font-size: 9pt;
          font-weight: 600;
        }

        .emergency-banner {
          background-color: #FEF2F2;
          border: 1px solid #FCA5A5;
          border-radius: 8px;
          padding: 10px 14px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          font-size: 9.5pt;
        }
        .emergency-label {
          color: #DC2626;
          font-weight: 700;
          white-space: nowrap;
        }
        .emergency-nums {
          display: flex;
          gap: 14px;
          flex-wrap: wrap;
          color: #991B1B;
        }

        .vault-summary-box {
          background-color: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          padding: 12px 14px;
          margin-bottom: 20px;
        }
        .section-title {
          font-size: 10pt;
          font-weight: 700;
          color: #4B5563;
          margin-bottom: 8px;
        }
        .docs-pill-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .doc-badge {
          background-color: #FFFFFF;
          border: 1px solid #CBD5E1;
          border-radius: 6px;
          padding: 4px 8px;
          font-size: 8.5pt;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .doc-badge-cat {
          background-color: #EDE9FE;
          color: #6D28D9;
          font-size: 7.5pt;
          padding: 1px 4px;
          border-radius: 4px;
          font-weight: 700;
        }
        .doc-badge-name {
          font-weight: 600;
          color: #334155;
        }

        .day-section {
          margin-bottom: 22px;
          page-break-inside: avoid;
        }
        .day-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding-bottom: 8px;
          border-bottom: 2px solid #E5E7EB;
          margin-bottom: 10px;
        }
        .day-pill {
          background-color: #4F46E5;
          color: #FFFFFF;
          font-size: 9pt;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 12px;
        }
        .day-date {
          font-size: 12pt;
          font-weight: 700;
          color: #111827;
        }

        .entries-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .entry-card {
          background-color: #FFFFFF;
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          padding: 10px 14px;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          page-break-inside: avoid;
        }
        .entry-left {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 95px;
        }
        .type-badge {
          font-size: 7.5pt;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 6px;
          text-align: center;
          display: inline-block;
        }
        .time-label {
          font-size: 8.5pt;
          color: #6B7280;
          font-weight: 600;
        }
        .entry-content {
          flex: 1;
          font-size: 9.5pt;
        }
        .flight-route {
          font-size: 10.5pt;
          margin-bottom: 2px;
        }
        .flight-no {
          color: #4F46E5;
          font-weight: 600;
          margin-left: 4px;
        }
        .sub-detail {
          font-size: 8.5pt;
          color: #6B7280;
          margin-top: 2px;
        }
        .address-line {
          font-size: 8.5pt;
          color: #4B5563;
          margin-top: 2px;
        }
        .local-lang {
          font-size: 8.5pt;
          color: #8B5CF6;
          margin-top: 2px;
        }
        .link-line {
          font-size: 8pt;
          color: #2563EB;
          margin-top: 4px;
          word-break: break-all;
        }
        .link-line a {
          color: #2563EB;
          text-decoration: underline;
        }
        .entry-notes {
          font-size: 8.5pt;
          color: #4B5563;
          margin-top: 4px;
          background-color: #F9FAFB;
          padding: 4px 8px;
          border-radius: 4px;
          border-left: 2px solid #D1D5DB;
        }
        .entry-right {
          text-align: right;
          min-width: 75px;
        }
        .entry-price {
          font-size: 10pt;
          font-weight: 700;
          color: #111827;
        }

        .footer {
          margin-top: 30px;
          padding-top: 12px;
          border-top: 1px solid #E5E7EB;
          font-size: 8pt;
          color: #9CA3AF;
          display: flex;
          justify-content: space-between;
        }
      </style>
    </head>
    <body>
      <div class="header-banner">
        <div class="app-tag">TripSP Travel Itinerary</div>
        <div class="trip-title">${escapeHtml(trip.name)}</div>
        <div class="trip-dates">${startFormatted} &mdash; ${endFormatted}</div>
        <div class="stats-row">
          <div class="stat-pill">${dates.length} Days Planned</div>
          <div class="stat-pill">${entries.length} Activities & Stops</div>
          <div class="stat-pill">Total Budget: ${formatCurrency(totalCost, trip.baseCurrency)}</div>
          <div class="stat-pill">Status: ${escapeHtml(trip.status || 'Active')}</div>
        </div>
      </div>

      ${
        emergencyInfo
          ? `
        <div class="emergency-banner">
          <div class="emergency-label">🚨 Emergency (${escapeHtml(emergencyInfo.country)}):</div>
          <div class="emergency-nums">
            <span><strong>Police:</strong> ${escapeHtml(emergencyInfo.police)}</span>
            <span><strong>Ambulance:</strong> ${escapeHtml(emergencyInfo.ambulance)}</span>
            <span><strong>Fire:</strong> ${escapeHtml(emergencyInfo.fire)}</span>
            <span><strong>General:</strong> ${escapeHtml(emergencyInfo.general)}</span>
          </div>
        </div>
      `
          : ''
      }

      ${tripDocsHtml}

      <div class="itinerary-content">
        ${daysHtml}
      </div>

      <div class="footer">
        <span>Generated by TripSP Offline Companion</span>
        <span>Exported on ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
      </div>
    </body>
    </html>
  `;
}

export async function exportItineraryPdf(options: ExportPdfOptions): Promise<string> {
  const html = generateItineraryHtml(options);

  // Generate PDF with base64 output to avoid Android temporary spool lock & permission issues
  const { uri, base64 } = await Print.printToFileAsync({ html, base64: true });

  const safeTitle =
    (options.trip.name || 'Trip')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '') || 'Trip';

  const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory || '';
  const targetUri = `${baseDir}${safeTitle}_Itinerary.pdf`;

  // Clean up any stale export file at target location first
  try {
    const existing = await FileSystem.getInfoAsync(targetUri);
    if (existing.exists) {
      await FileSystem.deleteAsync(targetUri, { idempotent: true });
    }
  } catch {
    // Ignore cleanup errors
  }

  // Write file cleanly using base64 or copy fallback
  if (base64) {
    await FileSystem.writeAsStringAsync(targetUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
  } else if (uri) {
    await FileSystem.copyAsync({ from: uri, to: targetUri });
  }

  // Handle sharing / viewing across platforms
  if (Platform.OS === 'android') {
    // 1. Try sharing via ExpoSharing
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(targetUri, {
          mimeType: 'application/pdf',
          dialogTitle: `${options.trip.name} - Itinerary PDF`,
        });
        return targetUri;
      }
    } catch (shareErr) {
      console.warn('Sharing.shareAsync rejected on Android, falling back to IntentLauncher:', shareErr);
    }

    // 2. Fallback to native Android PDF viewer via FileProvider Content URI
    try {
      const contentUri = await FileSystem.getContentUriAsync(targetUri);
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        flags: 1, // Intent.FLAG_GRANT_READ_URI_PERMISSION
        type: 'application/pdf',
      });
      return targetUri;
    } catch (intentErr) {
      console.error('IntentLauncher also failed:', intentErr);
      throw intentErr;
    }
  } else {
    // iOS and web
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(targetUri, {
        UTI: 'com.adobe.pdf',
        mimeType: 'application/pdf',
        dialogTitle: `${options.trip.name} - Itinerary PDF`,
      });
    }
    return targetUri;
  }
}
