import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ItineraryEntry } from '../../types';
import { Typography } from '../../theme/typography';
import { formatCurrency, convertCurrency } from '../../data/exchangeRates';
import { useApp } from '../../context/AppContext';

interface FlightCardProps {
  entry: ItineraryEntry;
  meta: { label: string; icon: string; color: string };
  colors: any;
  theme: 'light' | 'dark';
  onPress: () => void;
  showPrice: boolean;
}

export default function FlightCard({
  entry,
  meta,
  colors,
  theme,
  onPress,
  showPrice,
}: FlightCardProps) {
  const { state } = useApp();
  const primaryCurrency = state.settings.selectedCurrencies[0];
  const rates = state.exchangeRates.rates;
  const displayPrice = convertCurrency(entry.price, entry.currency, primaryCurrency, rates);

  const [isExpanded, setIsExpanded] = useState(false);

  if (!entry.flightDetails) return null;

  const { from, to, departureTime, arrivalTime, isConnecting, connections, flightName, flightType } = entry.flightDetails;

  const formatDuration = (ms: number) => {
    const mins = Math.floor(ms / 60000);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  const layovers: { place: string; duration: string }[] = [];
  if (isConnecting && connections) {
    for (let i = 0; i < connections.length - 1; i++) {
      const ms = new Date(connections[i + 1].departureTime).getTime() - new Date(connections[i].arrivalTime).getTime();
      layovers.push({ place: connections[i].to, duration: formatDuration(ms) });
    }
  }

  // Flight card gets a solid block for the header, then a contrasting body
  const headerBg = meta.color;
  const bodyBg = theme === 'dark' ? '#1c1c1e' : '#ffffff';

  const defaultTitle = `Flight: ${from.trim()} - ${to.trim()}`;
  const displayTitle = entry.title === defaultTitle ? '' : entry.title;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: bodyBg, borderColor: meta.color + (theme === 'dark' ? '40' : '30') },
      ]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {/* Top Header Block - Solid Color */}
      <View style={[styles.solidHeader, { backgroundColor: headerBg }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 8 }}>
          <Ionicons name="airplane" size={14} color="#FFF" />
          <Text style={[Typography.captionSemibold, { color: '#FFF', marginLeft: 6, letterSpacing: 1.5, fontSize: 10, flexShrink: 1 }]} numberOfLines={1}>
            {flightType === 'international' ? 'INTERNATIONAL FLIGHT' : 'DOMESTIC FLIGHT'}
          </Text>
        </View>
        {showPrice !== false && entry.price > 0 && (
          <Text style={[Typography.captionSemibold, { color: '#FFF', fontSize: 12 }]}>
            {formatCurrency(displayPrice, primaryCurrency)}
          </Text>
        )}
      </View>

      {/* Ticket Body */}
      <View style={styles.body}>
        {/* Main Route row */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <View style={{ alignItems: 'flex-start', flex: 1 }}>
            <Text style={[Typography.h1, { color: colors.text, fontSize: 24, letterSpacing: 1 }]}>
              {from.toUpperCase().substring(0, 3)}
            </Text>
            <Text style={[Typography.captionSemibold, { color: colors.textSecondary, marginTop: 2 }]}>
              {new Date(departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          
          <View style={{ alignItems: 'center', flex: 1, paddingHorizontal: 8 }}>
            <View style={{ height: 1, width: '100%', backgroundColor: meta.color + '40', position: 'absolute', top: 10, borderStyle: 'dashed', borderWidth: 1, borderColor: meta.color + '40' }} />
            <View style={{ backgroundColor: bodyBg, paddingHorizontal: 4 }}>
              <Ionicons name="airplane" size={18} color={meta.color} style={{ transform: [{ rotate: '90deg' }] }} />
            </View>
            <Text style={[Typography.caption, { color: colors.textSecondary, fontSize: 9, marginTop: 4, textAlign: 'center' }]}>
              {formatDuration(new Date(arrivalTime).getTime() - new Date(departureTime).getTime())}
            </Text>
            <Text style={[Typography.caption, { color: meta.color, fontSize: 9, textAlign: 'center', fontWeight: '600' }]}>
              {isConnecting
                ? (layovers.length > 0 ? `${layovers.length} Stop${layovers.length > 1 ? 's' : ''}` : `${connections?.length} Legs`)
                : 'Direct'}
            </Text>
          </View>
          
          <View style={{ alignItems: 'flex-end', flex: 1 }}>
            <Text style={[Typography.h1, { color: colors.text, fontSize: 24, letterSpacing: 1 }]}>
              {to.toUpperCase().substring(0, 3)}
            </Text>
            <Text style={[Typography.captionSemibold, { color: colors.textSecondary, marginTop: 2 }]}>
              {new Date(arrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>

        {/* Separator for extra details */}
        {(!!displayTitle || !!entry.notes || isConnecting) && (
          <View style={[styles.dashedSeparator, { borderColor: colors.border }]} />
        )}

        {(!!displayTitle || !!entry.notes) && (
          <View style={{ marginTop: 10 }}>
            {!!displayTitle && (
              <Text style={[Typography.caption, { color: colors.textMuted, fontSize: 11, paddingRight: 8 }]} numberOfLines={1}>
                {displayTitle}
              </Text>
            )}
            {!!entry.notes && (
               <Text style={[Typography.caption, { color: colors.textMuted, marginTop: displayTitle ? 4 : 0, fontStyle: 'italic' }]} numberOfLines={2}>
                 "{entry.notes}"
               </Text>
            )}
          </View>
        )}

        {/* Expandable Layover Details */}
        {isConnecting && (
          <TouchableOpacity
            style={[styles.expandBtn, { backgroundColor: meta.color + '15' }]}
            onPress={() => setIsExpanded(!isExpanded)}
          >
            <Text style={[Typography.captionSemibold, { color: meta.color, fontSize: 11 }]}>
              {isExpanded ? 'Hide connections' : 'View connections'}
            </Text>
            <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={12} color={meta.color} style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        )}

        {isExpanded && connections && (
          <View style={{ marginTop: 12 }}>
            {connections.map((conn, idx) => {
              const isLast = idx === connections.length - 1;
              return (
                <View key={idx}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 }}>
                    <Text style={[Typography.captionSemibold, { color: colors.text, fontSize: 11 }]}>{conn.from}</Text>
                    <View style={{ flex: 1, height: 1, backgroundColor: colors.border, marginHorizontal: 8, borderStyle: 'dashed', borderWidth: 1 }} />
                    <Text style={[Typography.captionSemibold, { color: colors.text, fontSize: 11 }]}>{conn.to}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={[Typography.caption, { color: colors.textSecondary, fontSize: 10 }]}>
                      {new Date(conn.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    <Text style={[Typography.caption, { color: colors.textSecondary, fontSize: 10 }]}>
                      {new Date(conn.arrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  {!isLast && layovers[idx] && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 6, backgroundColor: meta.color + '10', paddingVertical: 4, borderRadius: 4 }}>
                      <Ionicons name="time-outline" size={10} color={meta.color} style={{ marginRight: 4 }} />
                      <Text style={[Typography.caption, { color: meta.color, fontSize: 10 }]}>
                        {layovers[idx].duration} layover in {layovers[idx].place}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    marginRight: 16,
    marginBottom: 12,
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  solidHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  body: {
    padding: 14,
  },
  dashedSeparator: {
    borderStyle: 'dashed',
    borderWidth: 1,
    height: 1,
    width: '100%',
    opacity: 0.3,
  },
  expandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 10,
  },
});
