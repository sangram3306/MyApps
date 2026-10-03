import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../src/context/AppContext';
import { Colors } from '../../src/theme/colors';
import { Typography } from '../../src/theme/typography';
import { EntryType, ENTRY_TYPE_META } from '../../src/types';
import { convertCurrency, formatCurrency } from '../../src/data/exchangeRates';
import CategoryBar from '../../src/components/CategoryBar';

export default function FinancialsScreen() {
  const { state, getActiveTrip, getEntriesForActiveTrip } = useApp();
  const router = useRouter();
  const colors = Colors[state.settings.theme];

  const activeTrip = getActiveTrip();
  const entries = getEntriesForActiveTrip();
  const selectedCurrencies = state.settings.selectedCurrencies;
  const rates = state.exchangeRates.rates;

  if (!activeTrip) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[Typography.h1, { color: colors.text }]}>Financials</Text>
        </View>
        <View style={styles.emptyState}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="wallet-outline" size={48} color={colors.primary} />
          </View>
          <Text style={[Typography.h3, { color: colors.text, marginTop: 16 }]}>No trip selected</Text>
          <Text style={[Typography.body, { color: colors.textSecondary, marginTop: 8, textAlign: 'center' }]}>
            Select a trip to view its financial breakdown
          </Text>
          <TouchableOpacity
            style={[styles.goButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/')}
          >
            <Text style={[Typography.button, { color: '#FFF' }]}>Go to Trips</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Calculate totals per category in base currency
  const baseCurrency = state.settings.selectedCurrencies[0];
  const categoryTotals: Record<EntryType, number> = {
    flight: 0,
    hotel: 0,
    attraction: 0,
    food: 0,
    transport: 0,
    other: 0,
  };

  entries.forEach((entry) => {
    const converted = convertCurrency(entry.price, entry.currency, baseCurrency, rates);
    categoryTotals[entry.type] += converted;
  });

  const grandTotal = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);

  // Convert grand total to all 3 selected currencies
  const totalsInCurrencies = selectedCurrencies.map((cur) => ({
    currency: cur,
    amount: convertCurrency(grandTotal, baseCurrency, cur, rates),
  }));

  // Category breakdown for bars
  const categories = (Object.keys(categoryTotals) as EntryType[])
    .filter((type) => categoryTotals[type] > 0)
    .sort((a, b) => categoryTotals[b] - categoryTotals[a]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[Typography.h1, { color: colors.text }]}>Financials</Text>
            <Text style={[Typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
              {activeTrip.name}
            </Text>
          </View>
        </View>

        {/* Total Spend Card */}
        <View style={[styles.totalCard, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.shadow }]}>
          <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8, textAlign: 'center' }]}>
            TOTAL SPEND
          </Text>

          {totalsInCurrencies.length > 0 && (
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <Text style={[Typography.display, { color: colors.text, fontSize: 36 }]}>
                {formatCurrency(totalsInCurrencies[0].amount, totalsInCurrencies[0].currency)}
              </Text>
              <Text style={[Typography.caption, { color: colors.textMuted, marginTop: 4 }]}>
                {totalsInCurrencies[0].currency}
              </Text>
            </View>
          )}

          {totalsInCurrencies.length > 1 && (
            <View style={[styles.currencyRow, { gap: 8 }]}>
              {totalsInCurrencies.slice(1).map((item) => (
                <View
                  key={item.currency}
                  style={[
                    styles.currencyBlock,
                    {
                      backgroundColor: colors.primary + '15',
                      borderRadius: 12,
                      paddingVertical: 8,
                      paddingHorizontal: 4,
                      borderWidth: 1,
                      borderColor: colors.borderLight,
                    },
                  ]}
                >
                  <Text 
                    style={[Typography.display, { color: colors.text, fontSize: 16 }]} 
                    numberOfLines={1} 
                    adjustsFontSizeToFit
                  >
                    {formatCurrency(item.amount, item.currency)}
                  </Text>
                  <Text style={[Typography.caption, { color: colors.textSecondary, marginTop: 4 }]}>
                    {item.currency}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Category Breakdown */}
        {categories.length > 0 ? (
          <View style={[styles.breakdownCard, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.shadow }]}>
            <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 20 }]}>
              Breakdown by Category
            </Text>

            {categories.map((type) => (
              <CategoryBar
                key={type}
                icon={ENTRY_TYPE_META[type].icon}
                label={ENTRY_TYPE_META[type].label}
                amount={categoryTotals[type]}
                currency={baseCurrency}
                percentage={grandTotal > 0 ? (categoryTotals[type] / grandTotal) * 100 : 0}
                color={ENTRY_TYPE_META[type].color}
                theme={state.settings.theme}
              />
            ))}
          </View>
        ) : (
          <View style={styles.noDataContainer}>
            <Text style={[Typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
              Add entries with prices to see the breakdown
            </Text>
          </View>
        )}

        {/* Entry List */}
        {entries.length > 0 && (
          <View style={[styles.breakdownCard, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.shadow }]}>
            <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 16 }]}>
              All Expenses ({entries.length})
            </Text>

            {entries
              .filter((e) => e.price > 0)
              .sort((a, b) => {
                const aConverted = convertCurrency(a.price, a.currency, baseCurrency, rates);
                const bConverted = convertCurrency(b.price, b.currency, baseCurrency, rates);
                return bConverted - aConverted;
              })
              .map((entry, index) => {
                const meta = ENTRY_TYPE_META[entry.type];
                const converted = convertCurrency(entry.price, entry.currency, baseCurrency, rates);
                return (
                  <View
                    key={entry.id}
                    style={[
                      styles.expenseRow,
                      {
                        borderBottomColor: colors.borderLight,
                        borderBottomWidth: index < entries.length - 1 ? 1 : 0,
                      },
                    ]}
                  >
                    <View style={[styles.expenseIcon, { backgroundColor: meta.color + '20' }]}>
                      <Ionicons name={meta.icon as any} size={16} color={meta.color} />
                    </View>
                    <View style={styles.expenseInfo}>
                      <Text style={[Typography.bodyMedium, { color: colors.text }]} numberOfLines={1}>
                        {entry.title}
                      </Text>
                      <Text style={[Typography.caption, { color: colors.textMuted }]}>
                        {entry.date} · {meta.label}
                      </Text>
                    </View>
                    <Text style={[Typography.bodySemibold, { color: colors.text }]}>
                      {formatCurrency(converted, baseCurrency)}
                    </Text>
                  </View>
                );
              })}
          </View>
        )}

        {/* Rate info */}
        <Text style={[Typography.caption, { color: colors.textMuted, textAlign: 'center', marginTop: 16, paddingHorizontal: 20 }]}>
          Exchange rates as of {state.exchangeRates.date}
          {state.settings.offlineMode ? ' (offline — bundled rates)' : ''}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  totalCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 16,
  },
  currencyRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  currencyBlock: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  breakdownCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 16,
  },
  noDataContainer: {
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  expenseIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  expenseInfo: {
    flex: 1,
    marginRight: 8,
  },
});
